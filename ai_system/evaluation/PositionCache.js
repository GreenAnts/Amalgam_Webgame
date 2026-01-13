// evaluation/PositionCache.js
// Caches full position evaluations

import { Logger } from '../utils/Logger.js';

export class PositionCache {
    constructor(maxSize = 10000) {
        this.logger = new Logger('PositionCache');
        this.cache = new Map();
        this.maxSize = maxSize;
        this.hits = 0;
        this.misses = 0;
    }

    /**
     * Get cached evaluation or compute
     * @param {string} positionHash - Unique position identifier
     * @param {Function} evaluateFunction - Function to compute if not cached
     * @returns {number} Evaluation score
     */
    get(positionHash, evaluateFunction) {
        if (this.cache.has(positionHash)) {
            this.hits++;
            this.logger.debug('Position cache hit');
            return this.cache.get(positionHash);
        }
        
        this.misses++;
        this.logger.debug('Position cache miss');
        
        const evaluation = evaluateFunction();
        this.set(positionHash, evaluation);
        
        return evaluation;
    }

    /**
     * Store evaluation
     */
    set(positionHash, evaluation) {
        // Simple LRU: remove oldest if full
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(positionHash, evaluation);
    }

    /**
     * Get statistics
     */
    getStats() {
        const total = this.hits + this.misses;
        const hitRate = total > 0 ? (this.hits / total * 100).toFixed(2) : 0;
        
        return {
            size: this.cache.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: hitRate + '%'
        };
    }

    /**
     * Clear cache
     */
    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }
}
