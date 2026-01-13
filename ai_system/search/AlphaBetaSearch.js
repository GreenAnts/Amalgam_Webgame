// search/AlphaBetaSearch.js
// Alpha-beta pruning search with move ordering

import { SearchStrategy } from './SearchStrategy.js';
import { Logger } from '../utils/Logger.js';

export class AlphaBetaSearch extends SearchStrategy {
    constructor(evaluator, moveOrdering, transpositionTable) {
        super();
        this.logger = new Logger('AlphaBetaSearch');
        this.evaluator = evaluator;
        this.moveOrdering = moveOrdering;
        this.tt = transpositionTable;
        this.bestMove = null;
    }

    /**
     * Execute alpha-beta search
     */
    async search(gameLogic, playerManager, depth, constraints = {}) {
        this.logger.info(`Starting alpha-beta search to depth ${depth}`);
        this.resetStats();
        
        try {
            const { RandomSelector } = await import('../decision/RandomSelector.js');
            const selector = new RandomSelector();
    
            // Extract RNG and Context from constraints
            const rng = constraints.rng;
            const context = constraints.context || {};
    
            const action = selector.selectRandomMove(
                gameLogic, 
                playerManager, 
                rng, 
                context
            );
    
            // CONVERT BEFORE RETURNING
            const finalMove = this._actionToArenaMove(action);
    
            return {
                move: finalMove,
                score: 0.0,
                stats: this.getStats()
            };
        } catch (e) { /* ... */ }
    }
    
    /**
     * Convert internal action format to Arena move format
     * @private
     */
    _actionToArenaMove(action) {
        if (!action) return null;
    
        // 1. Standard Moves
        if (action.type === 'MOVE') {
            return { type: 'MOVE', from: action.from, to: action.to };
        }
        
        // 2. Pass
        if (action.type === 'PASS') {
            return { type: 'PASS' };
        }
    
        // 3. Abilities (The Fix)
        // ActionGenerator produces types like 'ABILITY_FIREBALL'
        // Arena/Main.js expects { type: 'ABILITY', abilityType: 'FIREBALL', ... }
        if (action.type.startsWith('ABILITY_')) {
            const abilityType = action.type.replace('ABILITY_', ''); // e.g., "FIREBALL"
            
            return {
                type: 'ABILITY',
                abilityType: abilityType, 
                target: action.target,
                // Specific fields required by different abilities
                pieceCoord: action.pieceCoord, // For Launch
                portalCoord: action.portalCoord // For Swap
            };
        }
    
        return null;
    }

    /**
     * Recursive alpha-beta function
     * @private
     */
    alphaBeta(position, depth, alpha, beta, maximizingPlayer) {
        this.nodesSearched++;
        this.maxDepth = Math.max(this.maxDepth, depth);
        
        // TODO: Implement alpha-beta recursion
        // 1. Check transposition table
        // 2. Check terminal conditions (depth == 0, game over)
        // 3. Generate and order moves
        // 4. Search each move with pruning
        // 5. Update transposition table
        
        return 0.0; // Placeholder
    }

    /**
     * Quiescence search for tactical stability
     * @private
     */
    quiescence(position, alpha, beta) {
        this.nodesSearched++;
        
        // TODO: Search only tactical moves (captures, abilities)
        // until position is "quiet"
        
        return 0.0; // Placeholder
    }
}
