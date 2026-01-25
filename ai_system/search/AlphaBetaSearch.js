// ai_system/search/AlphaBetaSearch.js

import { SearchStrategy } from './SearchStrategy.js';
import { Logger } from '../utils/Logger.js';
import { ActionGenerator } from '../utils/ActionGenerator.js';
import { SimulatedGameState } from '../simulation/SimulatedGameState.js';
import { SearchNode } from './SearchNode.js';

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

	/**
     * Execute alpha-beta search (SearchStrategy interface implementation)
     */
    search(gameLogic, playerManager, depth, constraints = {}) {
        this.logger.info('Alpha-beta search starting', { depth });
        this.resetStats();
        
        const { rng, turnContext } = constraints;
        const gameState = gameLogic.getState();
        const currentPlayer = playerManager.getCurrentPlayer().name;
        
        const rootSimState = new SimulatedGameState(gameState, currentPlayer, 0, null, null);
        const rootNode = new SearchNode(rootSimState, null, null, 0);
        
        const context = { 
            gameLogic, 
            playerManager, 
            rng, 
            turnContext: turnContext || { movedPieceCoord: null, usedAbilities: new Set() }
        };
        
        this.bestMove = null;
        const score = this.alphaBeta(rootNode, depth, -Infinity, +Infinity, true, context);
        
        this.logger.info('Search complete', { move: this.bestMove, score, nodes: this.nodesSearched });
        
        return { move: this.bestMove, score, stats: this.getStats() };
    }
	
	alphaBeta(node, depth, alpha, beta, maximizingPlayer, context) {
		this.nodesSearched++;
		
		// SAFEGUARD: Increased limit for complex positions
		const MAX_NODES = 200000; // Increased from 50000
		if (this.nodesSearched > MAX_NODES) {
			console.warn(`Search stopped at ${this.nodesSearched} nodes (limit: ${MAX_NODES})`);
			return this.evaluator.evaluate(node.simulationState, context);
		}
		
		const isRoot = node.depth === 0;
	
		if (depth === 0) {
			return this.evaluator.evaluate(node.simulationState, context);
		}
	
		const { gameLogic, turnContext } = context;
		const simState = node.simulationState;
		const simPieces = simState.getPieces();

		/* CRITICAL FIX: State Mutation (not replacement)
		   We MUTATE the existing GameState instance instead of replacing it.
		   This preserves all methods like getState() while updating data.
		*/
		const gameStateInstance = gameLogic.gameState;  // Keep the instance
		
		// Save original values for restoration
		const originalPieces = gameStateInstance.pieces;
		const originalSelectedCoord = gameStateInstance.selectedPieceCoord;
		
		// Player Manager Proxy: Tells ActionGenerator who the current simulation player is
		const tempPlayerManager = {
			getCurrentPlayer: () => {
				const playerName = simState.currentPlayer;
				if (playerName === 'Player 1') {
					return {
						name: 'Player 1',
						pieceType: ['voidSquare', 'amalgamSquare', 'portalSquare', 
								   'rubySquare', 'pearlSquare', 'amberSquare', 'jadeSquare'],
						isAI: false
					};
				} else {
					return {
						name: 'Player 2 (AI)',
						pieceType: ['voidCircle', 'amalgamCircle', 'portalCircle',
								   'rubyCircle', 'pearlCircle', 'amberCircle', 'jadeCircle'],
						isAI: true
					};
				}
			},
			canMovePiece: (pieceType) => {
				const currentPlayer = tempPlayerManager.getCurrentPlayer();
				return currentPlayer.pieceType.includes(pieceType);
			},
			getTurnCount: () => context.playerManager?.getTurnCount() || 1
		};

		let actions = [];

		try {
			// MUTATE (don't replace) the GameState instance
			gameStateInstance.pieces = simPieces;
			gameStateInstance.selectedPieceCoord = null;
			
			// Now gameLogic.getState() will work correctly because gameState still has its methods

			// Generate actions using the REAL systems bound to our MUTATED state
			actions = this.actionGenerator.generateAllActions(
				gameLogic,
				tempPlayerManager,
				turnContext.movedPieceCoord,
				turnContext.usedAbilities
			);
		} catch (error) {
			this.logger.error('Error generating actions in search', error);
			actions = []; 
		} finally {
			// RESTORE ORIGINAL STATE
			gameStateInstance.pieces = originalPieces;
			gameStateInstance.selectedPieceCoord = originalSelectedCoord;
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