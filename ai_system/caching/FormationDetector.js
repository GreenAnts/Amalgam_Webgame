// extraction/FormationDetector.js
// Detects ability formations (adjacent gems, aligned pieces)

import { Logger } from '../utils/Logger.js';

export class FormationDetector {
    constructor() {
        this.logger = new Logger('FormationDetector');
    }

    /**
     * Detect all ability formations in current position
     * @param {Object} gameState - Current game state
     * @param {Object} playerManager - Player manager instance
     * @returns {Object} Detected formations
     */
    detectFormations(gameState, playerManager) {
        this.logger.debug('Detecting ability formations');
        
        const formations = {
            rubyPairs: [],      // Adjacent ruby/amalgam pairs
            pearlPairs: [],     // Adjacent pearl/amalgam pairs
            amberLines: [],     // Aligned amber/amalgam pieces
            jadePairs: [],      // Adjacent jade/amalgam pairs
            nexusFormations: [] // Pearl/Amber/Amalgam combinations
        };
        
        // TODO: Implement formation detection
        // 1. Find adjacent gem pairs
        // 2. Find aligned gems (for amber sap)
        // 3. Find nexus combinations
        // 4. Cache results for evaluation
        
        this.logger.debug('Formations detected', {
            rubyPairs: formations.rubyPairs.length,
            pearlPairs: formations.pearlPairs.length,
            amberLines: formations.amberLines.length,
            jadePairs: formations.jadePairs.length
        });
        
        return formations;
    }

    /**
     * Check if two positions are adjacent
     * @private
     */
    isAdjacent(coord1Str, coord2Str) {
        const [x1, y1] = coord1Str.split(',').map(Number);
        const [x2, y2] = coord2Str.split(',').map(Number);
        
        return Math.abs(x1 - x2) <= 1 && Math.abs(y1 - y2) <= 1 && 
               (x1 !== x2 || y1 !== y2);
    }

    /**
     * Check if positions are aligned (horizontal, vertical, diagonal)
     * @private
     */
    isAligned(coord1Str, coord2Str) {
        const [x1, y1] = coord1Str.split(',').map(Number);
        const [x2, y2] = coord2Str.split(',').map(Number);
        
        return x1 === x2 || y1 === y2 || 
               Math.abs(x1 - x2) === Math.abs(y1 - y2);
    }
}