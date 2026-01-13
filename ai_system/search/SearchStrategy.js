// search/SearchStrategy.js
// Base interface for all search algorithms

import { Logger } from '../utils/Logger.js';

export class SearchStrategy {
    constructor() {
        this.logger = new Logger('SearchStrategy');
        this.nodesSearched = 0;
        this.maxDepth = 0;
    }

    /**
     * Execute search algorithm
     * @param {Object} gameLogic - Game logic instance
     * @param {Object} playerManager - Player manager instance
     * @param {number} depth - Search depth
     * @param {Object} constraints - { timeLimit, nodeLimit }
     * @returns {Object} { move, score, stats }
     */
    search(gameLogic, playerManager, depth, constraints = {}) {
        throw new Error('SearchStrategy.search() must be implemented by subclass');
    }

    /**
     * Get search statistics
     */
    getStats() {
        return {
            nodesSearched: this.nodesSearched,
            maxDepth: this.maxDepth
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.nodesSearched = 0;
        this.maxDepth = 0;
    }
}
