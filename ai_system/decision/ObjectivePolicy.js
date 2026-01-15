// ai_system/decision/ObjectivePolicy.js
// Objective-aware policy: Void moves toward goal

import { RandomSelector } from './RandomSelector.js';

/**
 * Objective-aware policy
 * - Void pieces move toward opponent's Amalgam start position
 * - Other pieces move randomly
 */
export class ObjectivePolicy {
    constructor() {
        this.randomSelector = new RandomSelector();
    }

    /**
     * Select move with objective awareness
     * @param {Object} gameState - Game state snapshot
     * @param {Object} context - Context {rng, gameLogic, playerManager}
     * @returns {Object} Move object
     */
    async selectMove(gameState, context) {
        const { rng, gameLogic, playerManager } = context;
        
        // Generate all legal actions
        const allActions = this.randomSelector.generator.generateAllActions(
            gameLogic,
            playerManager,
            null, // movedPieceCoord
            new Set() // usedAbilities
        );
        
        if (allActions.length === 0) {
            return { type: 'PASS' };
        }
        
        // Separate Void moves from other moves
        const voidMoves = [];
        const otherMoves = [];
        
        for (const action of allActions) {
            if (action.type === 'MOVE') {
                const piece = gameState.pieces[action.from];
                if (piece && piece.type.toLowerCase().includes('void')) {
                    voidMoves.push(action);
                } else {
                    otherMoves.push(action);
                }
            } else {
                // Abilities and PASS
                otherMoves.push(action);
            }
        }
        
        // If Void can move, prioritize moves toward goal
        if (voidMoves.length > 0) {
            const bestVoidMove = this.selectBestVoidMove(voidMoves, gameState, playerManager);
            if (bestVoidMove) {
                return this.randomSelector.actionToMove(bestVoidMove);
            }
        }
        
        // Otherwise, random move from all available
        const selected = allActions[rng.nextInt(allActions.length)];
        return this.randomSelector.actionToMove(selected);
    }
    
    /**
     * Select Void move that minimizes distance to goal
     * @private
     */
    selectBestVoidMove(voidMoves, gameState, playerManager) {
        const currentPlayer = playerManager.getCurrentPlayer().name;
        
        // Determine goal position based on current player
        // Player 1 (squares) has voidSquare, goal is (0,6) - circle's amalgam start
        // Player 2 (circles) has voidCircle, goal is (0,-6) - square's amalgam start
        const goalPosition = currentPlayer === 'Player 1' 
            ? { x: 0, y: 6 }   // VoidSquare → (0,6)
            : { x: 0, y: -6 }; // VoidCircle → (0,-6)
        
        // Evaluate each Void move by distance to goal
        let bestMove = null;
        let bestDistance = Infinity;
        
        for (const move of voidMoves) {
            const toCoord = this.parseCoord(move.to);
            const distance = this.manhattanDistance(toCoord, goalPosition);
            
            if (distance < bestDistance) {
                bestDistance = distance;
                bestMove = move;
            }
        }
        
        return bestMove;
    }
    
    /**
     * Parse coordinate string to {x, y}
     * @private
     */
    parseCoord(coordStr) {
        const [x, y] = coordStr.split(',').map(Number);
        return { x, y };
    }
    
    /**
     * Calculate Manhattan distance between two coordinates
     * @private
     */
    manhattanDistance(coord1, coord2) {
        return Math.abs(coord1.x - coord2.x) + Math.abs(coord1.y - coord2.y);
    }
}