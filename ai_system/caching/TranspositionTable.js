// caching/TranspositionTable.js
// Caches position evaluations to avoid re-computation

import { Logger } from '../utils/Logger.js';

export class TranspositionTable {
    constructor(maxEntries = 1000000) {
        this.logger = new Logger('TranspositionTable');
        this.table = new Map();
        this.maxEntries = maxEntries;
        this.hits = 0;
        this.misses = 0;
    }

    /**
     * Store position evaluation
     * @param {string} positionHash - Unique position identifier
     * @param {Object} entry - { score, depth, flag, bestMove }
     */
    store(positionHash, entry) {
        // Evict old entries if table is full
        if (this.table.size >= this.maxEntries) {
            const firstKey = this.table.keys().next().value;
            this.table.delete(firstKey);
        }
        
        this.table.set(positionHash, {
            score: entry.score,
            depth: entry.depth,
            flag: entry.flag, // 'exact', 'lowerbound', 'upperbound'
            bestMove: entry.bestMove,
            timestamp: Date.now()
        });
    }

    /**
     * Lookup position evaluation
     * @param {string} positionHash - Unique position identifier
     * @param {number} depth - Required search depth
     * @returns {Object|null} Cached entry or null
     */
    lookup(positionHash, depth) {
        const entry = this.table.get(positionHash);
        
        if (!entry) {
            this.misses++;
            return null;
        }
        
        // Only use entry if it was searched to sufficient depth
        if (entry.depth >= depth) {
            this.hits++;
            return entry;
        }
        
        this.misses++;
        return null;
    }

    /**
     * Get cached best move for move ordering
     */
    getBestMove(positionHash) {
        const entry = this.table.get(positionHash);
        return entry ? entry.bestMove : null;
    }

    /**
     * Check if position has cached best move
     */
    hasBestMove(positionHash) {
        return this.table.has(positionHash);
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const hitRate = this.hits + this.misses > 0 
            ? (this.hits / (this.hits + this.misses) * 100).toFixed(2)
            : 0;
            
        return {
            entries: this.table.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: hitRate + '%'
        };
    }

    /**
     * Clear the table
     */
    clear() {
        this.table.clear();
        this.hits = 0;
        this.misses = 0;
        this.logger.info('Transposition table cleared');
    }
}
