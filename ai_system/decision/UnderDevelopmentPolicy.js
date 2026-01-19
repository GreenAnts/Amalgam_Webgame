// ai_system/decision/UnderDevelopmentPolicy.js
// Under development policy - experimental tactics for future AI
//
// IMPORTANT: This policy uses HARD-CODED priority logic unsuitable for
// full trace search implementations. It serves as a guideline for
// potential strategy but is NOT viable for optimized AI players.
//
// Architecture: Simple priority-based selection through ActionGenerator
// No search, no evaluation, no complex state analysis.

import { ActionGenerator } from '../utils/ActionGenerator.js';
import { RandomSelector } from './RandomSelector.js';
import { BoardUtils } from '../../core/BoardUtils.js';

/**
 * UnderDevelopmentPolicy - Experimental tactics for future AI development
 *
 * Priority Order (hard-coded for testing):
 * 1. Abilities (fireball, tidal wave) - ALWAYS use when available
 * 2. Captures (eliminate enemy pieces) - Aggressive play
 * 3. Void advancement (move closer to goal) - Goal progress
 * 4. Nexus teleportation (rapid movement) - Strategic positioning
 * 5. Any legal move (fallback) - Guarantees progress
 *
 * NOT FOR PRODUCTION: Experimental policy for browser testing only
 */
export class UnderDevelopmentPolicy {
    constructor() {
        this.actionGenerator = new ActionGenerator();
        this.randomSelector = new RandomSelector();
        this.boardUtils = new BoardUtils();
    }

    /**
     * Select move using hard-coded priority logic
     * @param {Object} gameState - Game state snapshot
     * @param {Object} context - {rng, gameLogic, playerManager}
     * @returns {Object} Selected move
     */
    async selectMove(gameState, context) {
        const { gameLogic, playerManager, rng } = context;

        try {
            // Generate all legal actions through safe interface
            const allActions = this.actionGenerator.generateAllActions(
                gameLogic, playerManager, null, new Set()
            );

            if (allActions.length === 0) return null;

            // Hard-coded priority selection (NOT optimized)
            const selectedAction = this.selectBestAction(allActions, gameState, gameLogic, playerManager, rng);

            // Convert action to move format using safe interface
            return this.randomSelector.actionToMove(selectedAction);

        } catch (error) {
            // Safe fallback on any error - maintain stability
            console.warn('UnderDevelopmentPolicy error, falling back to random:', error.message);
            const fallbackActions = this.actionGenerator.generateAllActions(
                gameLogic, playerManager, null, new Set()
            );
            const randomAction = fallbackActions[rng.nextInt(fallbackActions.length)];
            return this.randomSelector.actionToMove(randomAction);
        }
    }

    /**
     * Hard-coded priority-based action selection
     * NOT suitable for search implementations
     *
     * @private
     */
    selectBestAction(actions, gameState, gameLogic, playerManager, rng) {
        const currentPlayer = playerManager.getCurrentPlayer();
        const opponentHasVoid = this.opponentHasVoid(gameState, playerManager);

        // PRIORITY 1: Ability execution (fireball, tidal wave) - ALWAYS use if available
        const abilityAction = this.findAbilityAction(actions);
        if (abilityAction) return abilityAction;

        // PRIORITY 2: Capturing moves (eliminate enemy pieces)
        const captureAction = this.findCaptureAction(actions, gameState, playerManager);
        if (captureAction) return captureAction;

        // PRIORITY 3: Endgame aggression (when opponent has no Void, be very aggressive)
        if (!opponentHasVoid) {
            const endgameAction = this.findEndgameAction(actions, gameState, playerManager);
            if (endgameAction) return endgameAction;
        }

        // PRIORITY 4: Void advancement (move closer to goal)
        const goalAction = this.findGoalAction(actions, gameState, playerManager);
        if (goalAction) return goalAction;

        // PRIORITY 5: Nexus teleportation (rapid movement)
        const nexusAction = this.findNexusTeleportAction(actions, gameState, playerManager);
        if (nexusAction) return nexusAction;

        // PRIORITY 6: Any legal move (fallback)
        return actions[rng.nextInt(actions.length)];
    }

    /**
     * PRIORITY 3: Void advancement (move closer to goal)
     * Hard-coded: Always try to move Void toward goal
     *
     * @private
     */
    findGoalAction(actions, gameState, playerManager) {
        const currentPlayer = playerManager.getCurrentPlayer();
        const goalY = currentPlayer.name === 'Player 1' ? 6 : -6;
        const voidType = currentPlayer.name === 'Player 1' ? 'voidSquare' : 'voidCircle';

        let bestVoidMove = null;
        let bestDistance = Infinity;

        // Find all Void moves
        for (const action of actions) {
            if (action.type === 'MOVE') {
                const piece = gameState.pieces[action.from];
                if (piece && piece.type === voidType) {
                    // Calculate distance to goal for this move
                    const [toX, toY] = action.to.split(',').map(Number);
                    const distanceToGoal = Math.abs(toY - goalY) + Math.abs(toX - 0);

                    // Keep track of best (closest) move
                    if (distanceToGoal < bestDistance) {
                        bestDistance = distanceToGoal;
                        bestVoidMove = action;
                    }
                }
            }
        }

        // Return best Void advancement move (if any Void moves exist)
        return bestVoidMove;
    }

    /**
     * PRIORITY 1: Find ability actions (fireball, tidal wave)
     * Hard-coded: ALWAYS use abilities when available
     *
     * @private
     */
    findAbilityAction(actions) {
        // Prioritize tidal wave over fireball (arbitrary choice)
        for (const action of actions) {
            if (action.type === 'ABILITY_TIDALWAVE' || action.type === 'ABILITY_FIREBALL') {
                return action; // Use any available ability
            }
        }
        return null;
    }

    /**
     * PRIORITY 2: Find moves that capture enemy pieces
     * Hard-coded: Check if moving to a square will eliminate enemy pieces
     *
     * @private
     */
    findCaptureAction(actions, gameState, playerManager) {
        const currentPlayer = playerManager.getCurrentPlayer();

        for (const action of actions) {
            if (action.type === 'MOVE') {
                const fromPiece = gameState.pieces[action.from];
                if (fromPiece && currentPlayer.pieceType.includes(fromPiece.type)) {
                    // Check if this move will capture enemy pieces
                    if (this.wouldCaptureEnemies(action.to, fromPiece, gameState, playerManager)) {
                        return action;
                    }
                }
            }
        }

        return null;
    }

    /**
     * PRIORITY 3: Endgame aggression (when opponent has no Void)
     * Hard-coded: Move ANY piece toward goal aggressively
     *
     * @private
     */
    findEndgameAction(actions, gameState, playerManager) {
        const currentPlayer = playerManager.getCurrentPlayer();
        const goalY = currentPlayer.name === 'Player 1' ? 6 : -6;

        // In endgame, move ANY piece closer to goal (ignore safety)
        for (const action of actions) {
            if (action.type === 'MOVE') {
                const piece = gameState.pieces[action.from];
                if (piece && currentPlayer.pieceType.includes(piece.type)) {
                    const [toX, toY] = action.to.split(',').map(Number);
                    const [fromX, fromY] = action.from.split(',').map(Number);

                    // Check if this move gets any piece closer to goal
                    const currentDistance = Math.abs(fromY - goalY) + Math.abs(fromX - 0);
                    const newDistance = Math.abs(toY - goalY) + Math.abs(toX - 0);

                    if (newDistance < currentDistance) {
                        return action; // Move any piece closer to goal
                    }
                }
            }
        }

        return null;
    }

    /**
     * Check if opponent still has Void piece
     * Hard-coded: Affects endgame strategy
     *
     * @private
     */
    opponentHasVoid(gameState, playerManager) {
        const currentPlayer = playerManager.getCurrentPlayer();
        const opponentVoidType = currentPlayer.name === 'Player 1' ? 'voidCircle' : 'voidSquare';

        for (const piece of Object.values(gameState.pieces)) {
            if (piece.type === opponentVoidType) {
                return true;
            }
        }
        return false;
    }





    /**
     * Check if moving a piece to targetCoord would capture enemy pieces
     * Hard-coded: Simplified attack calculation
     *
     * @private
     */
    wouldCaptureEnemies(targetCoord, movingPiece, gameState, playerManager) {
        const [targetX, targetY] = targetCoord.split(',').map(Number);
        const currentPlayer = playerManager.getCurrentPlayer();

        // Check adjacent squares for enemy pieces that would be captured
        for (const [coord, piece] of Object.entries(gameState.pieces)) {
            // Only check enemy pieces
            if (!currentPlayer.pieceType.includes(piece.type)) {
                const [pieceX, pieceY] = coord.split(',').map(Number);
                const dx = Math.abs(targetX - pieceX);
                const dy = Math.abs(targetY - pieceY);

                // Adjacent enemy pieces can be captured by most pieces
                if (dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0)) {
                    // Void captures all adjacent enemies
                    if (movingPiece.type === 'voidCircle' || movingPiece.type === 'voidSquare') {
                        return true;
                    }
                    // Portal captures adjacent portals
                    if ((movingPiece.type === 'portalCircle' || movingPiece.type === 'portalSquare') &&
                        (piece.type === 'portalCircle' || piece.type === 'portalSquare')) {
                        return true;
                    }
                    // Non-portal captures adjacent non-portals
                    if ((movingPiece.type !== 'portalCircle' && movingPiece.type !== 'portalSquare') &&
                        (piece.type !== 'portalCircle' && piece.type !== 'portalSquare')) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /**
     * PRIORITY 4: Find moves using nexus teleportation
     * Hard-coded: Moves farther than adjacent distance
     *
     * @private
     */
    findNexusTeleportAction(actions, gameState, playerManager) {
        const currentPlayer = playerManager.getCurrentPlayer();

        for (const action of actions) {
            if (action.type === 'MOVE') {
                // Check if this move is a nexus teleport (not adjacent)
                if (!this.boardUtils.isAdjacent(action.from, action.to)) {
                    // Verify it's a legal move for current player
                    const piece = gameState.pieces[action.from];
                    if (piece && currentPlayer.pieceType.includes(piece.type)) {
                        return action; // Use nexus teleportation
                    }
                }
            }
        }

        return null;
    }
}
