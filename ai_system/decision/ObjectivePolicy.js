// ai_system/decision/ObjectivePolicy.js
// Void objective-aware policy (first intelligent baseline candidate)

import { RandomSelector } from './RandomSelector.js';
import { ActionGenerator } from '../utils/ActionGenerator.js';

/**
 * Objective Policy - prioritizes moving Void toward opponent's goal
 * 
 * Strategy:
 * 1. If Void can move closer to goal, strongly prefer that move
 * 2. Otherwise, random legal move
 * 
 * This is the minimal heuristic to beat random play.
 */
export class ObjectivePolicy {
    constructor() {
        this.generator = new ActionGenerator();
        this.randomSelector = new RandomSelector();
    }

    /**
     * Select move with objective awareness
     * @param {Object} gameState - Game state snapshot
     * @param {Object} context - {rng, gameLogic, playerManager}
     * @returns {Object} Selected move
     */
    async selectMove(gameState, context) {
        const { rng, gameLogic, playerManager } = context;
        const turnContext = { movedPieceCoord: null, usedAbilities: new Set() };
        
        const allActions = this.generator.generateAllActions(
            gameLogic,
            playerManager,
            turnContext.movedPieceCoord,
            turnContext.usedAbilities
        );

        if (allActions.length === 0) return null;

        // Filter for Void moves
        const voidMoves = this._findVoidMoves(allActions, gameState, playerManager);

        // If Void can move, find best objective-aware move
        if (voidMoves.length > 0) {
            const bestMove = this._selectBestVoidMove(voidMoves, gameState, playerManager, rng);
            if (bestMove) {
                return this.randomSelector.actionToMove(bestMove);
            }
        }

        // Fallback: random move
        const selected = allActions[rng.nextInt(allActions.length)];
        return this.randomSelector.actionToMove(selected);
    }

    /**
     * Find all moves involving Void piece
     * @private
     */
    _findVoidMoves(actions, gameState, playerManager) {
        const voidMoves = [];
        const currentPlayer = playerManager.getCurrentPlayer();
        const voidType = currentPlayer.name === 'Player 1' ? 'voidSquare' : 'voidCircle';

        for (const action of actions) {
            if (action.type !== 'MOVE') continue;
            
            const piece = gameState.pieces[action.from];
            if (piece && piece.type === voidType) {
                voidMoves.push(action);
            }
        }

        return voidMoves;
    }

    /**
     * Select Void move that makes most progress toward goal
     * @private
     */
    _selectBestVoidMove(voidMoves, gameState, playerManager, rng) {
        const currentPlayer = playerManager.getCurrentPlayer();
        const goalY = currentPlayer.name === 'Player 1' ? 6 : -6; // Player 1 → (0,6), Player 2 → (0,-6)

        let bestMoves = [];
        let bestScore = -Infinity;

        for (const move of voidMoves) {
            const [toX, toY] = move.to.split(',').map(Number);
            
            // Score: negative distance to goal (closer = higher score)
            const distanceToGoal = Math.abs(toY - goalY) + Math.abs(toX - 0);
            const score = -distanceToGoal;

            if (score > bestScore) {
                bestScore = score;
                bestMoves = [move];
            } else if (score === bestScore) {
                bestMoves.push(move);
            }
        }

        // If multiple moves tie, pick randomly
        return bestMoves.length > 0 ? bestMoves[rng.nextInt(bestMoves.length)] : null;
    }
}