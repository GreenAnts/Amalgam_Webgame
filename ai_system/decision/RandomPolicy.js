// ai_system/decision/RandomPolicy.js
// Random move policy for Arena
// Works with GameLogicAdapter's snapshot interface

import { RandomSelector } from './RandomSelector.js';

/**
 * Random move policy
 * Adapts RandomSelector to work with Arena's snapshot-based interface
 */
export class RandomPolicy {
    constructor() {
        this.selector = new RandomSelector();
    }

    /**
     * Select random move from game state snapshot
     * @param {Object} gameState - Game state snapshot
     * @param {Object} context - Context {rng, gameLogic, playerManager}
     * @returns {Object} Move object {from: "x,y", to: "x,y"}
     */
    async selectMove(gameState, context) {
        const { rng, gameLogic, playerManager } = context;
        
        // Use RandomSelector with context (gameLogic/playerManager already have correct state)
        return this.selector.selectRandomMove(gameLogic, playerManager, rng);
    }
}