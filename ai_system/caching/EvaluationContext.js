// caching/EvaluationContext.js
// Lazy evaluation cache - computes expensive operations only when needed

import { Logger } from '../utils/Logger.js';
import { ThreatMapGenerator } from './ThreatMapGenerator.js';
import { FormationDetector } from './FormationDetector.js';

export class EvaluationContext {
    constructor(gameState, playerManager) {
        this.gameState = gameState;
        this.playerManager = playerManager;
        this.logger = new Logger('EvaluationContext');
        
        // Lazy-computed caches (null until first access)
        this._threatMap = null;
        this._formations = null;
    }

    /**
     * Get threat map (computes on first access, then caches)
     */
    get threatMap() {
        if (!this._threatMap) {
            this.logger.debug('Computing threat map (first access)');
            const generator = new ThreatMapGenerator();
            this._threatMap = generator.generate(this.gameState, this.playerManager);
        }
        return this._threatMap;
    }

    /**
     * Get formations (computes on first access, then caches)
     */
    get formations() {
        if (!this._formations) {
            this.logger.debug('Computing formations (first access)');
            const detector = new FormationDetector();
            this._formations = detector.detectFormations(this.gameState, this.playerManager);
        }
        return this._formations;
    }

    /**
     * Clear all cached computations
     */
    clear() {
        this._threatMap = null;
        this._formations = null;
    }
}