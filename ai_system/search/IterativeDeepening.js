// search/IterativeDeepening.js
// Iterative deepening with time control

import { SearchStrategy } from './SearchStrategy.js';
import { Logger } from '../utils/Logger.js';

export class IterativeDeepeningSearch extends SearchStrategy {
    constructor(baseSearch, timeManager) {
        super();
        this.logger = new Logger('IterativeDeepeningSearch');
        this.baseSearch = baseSearch; // Usually AlphaBetaSearch
        this.timeManager = timeManager;
    }

    /**
     * Execute iterative deepening
     */
    search(gameLogic, playerManager, maxDepth, constraints = {}) {
        this.logger.info('Starting iterative deepening search');
        this.resetStats();
        
        const startTime = Date.now();
        const timeLimit = constraints.timeLimit || 5000; // 5 seconds default
        
        let bestMove = null;
        let bestScore = -Infinity;
        let completedDepth = 0;
        
        // Search progressively deeper until time runs out
        for (let depth = 1; depth <= maxDepth; depth++) {
            const elapsed = Date.now() - startTime;
            
            if (elapsed >= timeLimit) {
                this.logger.info(`Time limit reached at depth ${depth}`);
                break;
            }
            
            // TODO: Execute search at current depth
            // For now, just log
            this.logger.debug(`Searching depth ${depth}...`);
            
            // TODO: Get result from baseSearch
            // bestMove = result.move;
            // bestScore = result.score;
            
            completedDepth = depth;
        }
        
        this.logger.info('Iterative deepening complete', {
            completedDepth: completedDepth,
            timeUsed: Date.now() - startTime
        });
        
        return {
            move: bestMove,
            score: bestScore,
            stats: { completedDepth: completedDepth, ...this.getStats() }
        };
    }
}
