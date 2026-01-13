// caching/ThreatMapCache.js
// Caches threat/attack maps to avoid re-computation

import { Logger } from '../utils/Logger.js';

export class ThreatMapCache {
    constructor() {
        this.logger = new Logger('ThreatMapCache');
        this.cache = new Map();
    }

    /**
     * Get or compute threat map for position
     * @param {string} positionHash - Unique position identifier
     * @param {Function} computeFunction - Function to compute if not cached
     * @returns {Object} Threat map
     */
    get(positionHash, computeFunction) {
        if (this.cache.has(positionHash)) {
            this.logger.debug('Threat map cache hit');
            return this.cache.get(positionHash);
        }
        
        this.logger.debug('Threat map cache miss - computing');
        const threatMap = computeFunction();
        this.cache.set(positionHash, threatMap);
        
        return threatMap;
    }

    /**
     * Manually store threat map
     */
    store(positionHash, threatMap) {
        this.cache.set(positionHash, threatMap);
    }

    /**
     * Clear the cache
     */
    clear() {
        this.cache.clear();
        this.logger.info('Threat map cache cleared');
    }

    /**
     * Get cache size
     */
    size() {
        return this.cache.size;
    }
}
