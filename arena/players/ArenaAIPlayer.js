// arena/players/ArenaAIPlayer.js
// Minimal adapter: Arena interface → AI system interface
// Does NOT mutate game state - passes snapshots to AI policies

/**
 * Arena AI Player adapter
 * Adapts Arena's selectMove interface to AI system's interface
 * 
 * Rules:
 * - Does NOT mutate game state
 * - Does NOT know about AI internals
 * - Only adapts interface
 */
export class ArenaAIPlayer {
    constructor({ id, policy }) {
        this.id = id;
        this.policy = policy; // Injected decision policy
    }

    /**
     * Get AI version ID
     * @returns {string} AI version identifier
     */
    getId() {
        return this.id;
    }

    /**
     * Select a move (Arena interface)
     * @param {Object} gameState - Game state snapshot
     * @param {Object} context - Context object (contains rng, gameLogic, playerManager)
     * @returns {Object} Move object {from: "x,y", to: "x,y"}
     */
    async selectMove(gameState, context) {
        // Policy receives snapshot and context
        // Policy is responsible for any state restoration through GameLogic interface
        return await this.policy.selectMove(gameState, context);
    }
}
