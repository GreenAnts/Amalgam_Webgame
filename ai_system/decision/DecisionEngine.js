// decision/DecisionEngine.js
// Orchestrates search strategies

import { Logger } from '../utils/Logger.js';
import { RandomSelector } from './RandomSelector.js';

export class DecisionEngine {
    constructor(config = {}) {
        this.logger = new Logger('DecisionEngine');
        this.config = config;
        this.searchStrategy = null; // Will be set based on config
    }

    /**
     * Set search strategy
     * @param {SearchStrategy} strategy - Search algorithm to use
     */
    setSearchStrategy(strategy) {
        this.searchStrategy = strategy;
        this.logger.info(`Search strategy set to: ${strategy.constructor.name}`);
    }

    /**
     * Select best move using configured strategy
     * @param {GameLogic} gameLogic
     * @param {PlayerManager} playerManager
     * @returns {Object} Selected move
     */
    selectMove(gameLogic, playerManager, context = {}) {
        // If no search strategy configured, use random
        if (!this.searchStrategy) {
            this.logger.debug('No search strategy - using RandomSelector');
            const selector = new RandomSelector();
            
            const move = selector.selectRandomMove(
                gameLogic, 
                playerManager,
                context.rng || null,
                context.turnContext || { movedPieceCoord: null, usedAbilities: new Set() }
            );
            
            this.logger.info('Random move selected (no strategy)', { move });
            return move;
        }
        
        // Execute configured search
        const depth = this.config.searchDepth || 3;
        const constraints = {
            timeLimit: this.config.timeLimit || 5000,
            nodeLimit: this.config.nodeLimit || 100000,
            rng: context.rng || null,
            turnContext: context.turnContext || { movedPieceCoord: null, usedAbilities: new Set() }
        };
        
        this.logger.info(`Executing search with ${this.searchStrategy.constructor.name}`, {
            depth,
            constraints
        });
        
        const result = this.searchStrategy.search(
            gameLogic,
            playerManager,
            depth,
            constraints
        );
        
        this.logger.info('Search complete', {
            move: result.move,
            score: result.score,
            stats: result.stats
        });
        
        // CRITICAL: Ensure we're returning the move object, not the result wrapper
        if (!result || !result.move) {
            this.logger.error('Search returned invalid result', { result });
            // Fallback to random
            const selector = new RandomSelector();
            return selector.selectRandomMove(gameLogic, playerManager);
        }
        
        return result.move;
    }
}
