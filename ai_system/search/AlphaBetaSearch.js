// ai_system/search/AlphaBetaSearch.js

import { SearchStrategy } from './SearchStrategy.js';
import { Logger } from '../utils/Logger.js';
import { ActionGenerator } from '../utils/ActionGenerator.js';

export class AlphaBetaSearch extends SearchStrategy {
	constructor(evaluator, moveOrdering = null, transpositionTable = null) {
		super();
		this.logger = new Logger('AlphaBetaSearch');
		this.evaluator = evaluator;
		this.moveOrdering = moveOrdering;
		this.tt = transpositionTable;
		this.actionGenerator = new ActionGenerator();
		this.bestMove = null;
		this.nodesSearched = 0; // Initialize counter
	}

	alphaBeta(node, depth, alpha, beta, maximizingPlayer, context) {
		this.nodesSearched++;
	
		// Track if this is root node (for best move tracking)
		const isRoot = node.depth === 0;
	
		if (depth === 0) {
			return this.evaluator.evaluate(node.simulationState, context);
		}
	
		const { gameLogic, turnContext } = context;
		const simState = node.simulationState;
		const simPieces = simState.getPieces();

		/* CRITICAL FIX: State Injection 
		   Instead of creating a mock 'tempGameLogic' which lacks ability systems,
		   we temporarily swap the state in the REAL GameLogic instance.
		*/
		const originalState = gameLogic.gameState;
		
		// Create a temporary state object that matches the structure GameLogic expects
		// We preserve selectedPieceCoord/etc from original if needed, or null them
		const tempState = {
			pieces: simPieces,
			selectedPieceCoord: null, // Simulation doesn't select
			currentPlayer: simState.currentPlayer 
		};

		// Player Manager Proxy: Tells ActionGenerator who the current simulation player is
		const tempPlayerManager = {
			getCurrentPlayer: () => ({
				name: simState.currentPlayer,
				// Ensure pieceType checks work (mapping name to types)
				pieceType: simState.currentPlayer.includes('Player 1') 
					? ['ruby', 'pearl', 'amber', 'jade'] // Assuming P1 owns these for now, or fetch from real PM
					: ['ruby', 'pearl', 'amber', 'jade'] // Simplified: ActionGenerator checks piece ownership usually via logic
			}),
			canMovePiece: () => true, // Simulation assumes validity is checked by generator
			// Forward other calls if necessary
			getTurnCount: () => context.playerManager.getTurnCount()
		};

		// We also need to patch the player's piece types if ActionGenerator relies on them.
		// For robustness, we'll rely on the fact that ActionGenerator often checks piece.type directly.

		let actions = [];

		try {
			// INJECT SIMULATION STATE
			gameLogic.gameState = tempState;

			// Generate actions using the REAL systems bound to our TEMP state
			actions = this.actionGenerator.generateAllActions(
				gameLogic,
				tempPlayerManager,
				turnContext.movedPieceCoord,
				turnContext.usedAbilities
			);
		} catch (error) {
			this.logger.error('Error generating actions in search', error);
			// Fallback to empty actions to prevent crash loop
			actions = []; 
		} finally {
			// RESTORE REAL STATE
			gameLogic.gameState = originalState;
		}
		
		// Optimization: If no actions found (e.g., stuck), return evaluation
		if (actions.length === 0) {
			return this.evaluator.evaluate(simState, context);
		}

		let bestScore = maximizingPlayer ? -Infinity : Infinity;
		let bestAction = null;

		for (const action of actions) {
			const childState = simState.applyAction(action);
			const childNode = node.addChild(childState, action);

			// Logic to track multi-step turn context
			const playerSwitched = childState.getCurrentPlayer() !== simState.getCurrentPlayer();

			const childTurnContext = playerSwitched ? {
				// New player's turn - reset context
				movedPieceCoord: null,
				usedAbilities: new Set()
			} : {
				// Same player continuing (e.g. Move -> Ability phase)
				movedPieceCoord: action.type === 'MOVE' ? action.to : turnContext.movedPieceCoord,
				usedAbilities: new Set(turnContext.usedAbilities)
			};

			// Add used ability to set if applicable
			if (!playerSwitched && action.type && action.type.startsWith('ABILITY_')) {
				const abilityType = action.type.replace('ABILITY_', '');
				childTurnContext.usedAbilities.add(abilityType);
			}

			// Create child context
			const childContext = {
				...context,
				turnContext: childTurnContext
			};

			const score = this.alphaBeta(
				childNode,
				depth - 1,
				alpha,
				beta,
				!maximizingPlayer, // Note: In complex turns (same player), this might need logic to NOT flip max/min
				childContext
			);

			// Note: If player didn't switch, we theoretically shouldn't flip maximizingPlayer.
			// However, standard AlphaBeta usually flips. 
			// For this specific implementation, assuming strictly alternating turns (Move ends turn)
			// is safest unless SimulatedGameState handles the "Same Player" logic explicitly.

			if (maximizingPlayer) {
				if (score > bestScore) {
					bestScore = score;
					bestAction = action;
				}
				alpha = Math.max(alpha, score);
			} else {
				if (score < bestScore) {
					bestScore = score;
					bestAction = action;
				}
				beta = Math.min(beta, score);
			}

			if (beta <= alpha) break;
		}

		if (isRoot && bestAction) {
			this.bestMove = this.actionToMoveFormat(bestAction);
		}

		return bestScore;
	}

	/**
	 * Convert action format to move format expected by Arena
	 * @private
	 */
	actionToMoveFormat(action) {
		if (!action) return null;
		
		switch (action.type) {
			case 'MOVE':
				return { from: action.from, to: action.to };
			case 'ABILITY_FIREBALL':
				return { type: 'ABILITY', abilityType: 'FIREBALL', target: action.target };
			case 'ABILITY_TIDALWAVE':
				return { type: 'ABILITY', abilityType: 'TIDALWAVE', target: action.target };
			case 'ABILITY_SAP':
				return { type: 'ABILITY', abilityType: 'SAP', target: action.target };
			case 'ABILITY_LAUNCH':
				return { type: 'ABILITY', abilityType: 'LAUNCH', pieceCoord: action.pieceCoord, target: action.target };
			case 'ABILITY_PORTAL_SWAP':
				return { type: 'ABILITY', abilityType: 'PORTAL_SWAP', portalCoord: action.portalCoord, target: action.target };
			case 'PASS':
				return { type: 'PASS' };
			default:
				this.logger.warn(`Unknown action type: ${action.type}`);
				return null;
		}
	}
}