// ai_system/search/AlphaBetaSearch.js

import { SearchStrategy } from './SearchStrategy.js';
import { Logger } from '../utils/Logger.js';
import { ActionGenerator } from '../utils/ActionGenerator.js';

export class AlphaBetaSearch extends SearchStrategy {
	constructor(evaluator) {
		super();
		this.logger = new Logger('AlphaBetaSearch');
		this.evaluator = evaluator;
		this.actionGenerator = new ActionGenerator();
		this.bestMove = null;
	}

	alphaBeta(node, depth, alpha, beta, maximizingPlayer, context) {
		this.nodesSearched++;

		if (depth === 0) {
			return this.evaluator.evaluate(node.simulationState);
		}

		const { gameLogic, turnContext } = context;
		const simState = node.simulationState;
		const simPieces = simState.getPieces();

		/* ---- REQUIRED getState() ---- */
		const tempGameLogic = {
			getState: () => ({ pieces: simPieces }),

			boardUtils: gameLogic.boardUtils,

			movementSystem: {
				getValidMoves: (coord) => {
					const original = gameLogic.gameState;
					gameLogic.gameState = { pieces: simPieces };
					try {
						return gameLogic.movementSystem.getValidMoves(coord);
					} finally {
						gameLogic.gameState = original;
					}
				}
			}
		};

		/* ---- TURN OWNER FLIP (FIX BUG 1) ---- */
		const nextPlayer =
			simState.currentPlayer === 'Player 1'
				? 'Player 2 (AI)'
				: 'Player 1';

		const tempPlayerManager = {
			getCurrentPlayer: () => ({
				name: maximizingPlayer ? simState.currentPlayer : nextPlayer
			}),
			canMovePiece: () => true
		};

		const actions = this.actionGenerator.generateAllActions(
			tempGameLogic,
			tempPlayerManager,
			turnContext.movedPieceCoord,
			turnContext.usedAbilities
		);

		let bestScore = maximizingPlayer ? -Infinity : Infinity;

		for (const action of actions) {
			const childState = simState.applyAction(action);
			const childNode = node.addChild(childState, action);

			const score = this.alphaBeta(
				childNode,
				depth - 1,
				alpha,
				beta,
				!maximizingPlayer,
				context
			);

			if (maximizingPlayer) {
				bestScore = Math.max(bestScore, score);
				alpha = Math.max(alpha, score);
			} else {
				bestScore = Math.min(bestScore, score);
				beta = Math.min(beta, score);
			}

			if (beta <= alpha) break;
		}

		return bestScore;
	}
}
