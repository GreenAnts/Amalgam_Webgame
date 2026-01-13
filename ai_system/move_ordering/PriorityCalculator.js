// move_ordering/PriorityCalculator.js
// Calculates move priority for ordering

import { Logger } from '../utils/Logger.js';

export class PriorityCalculator {
    constructor(config) {
        this.logger = new Logger('PriorityCalculator');
        this.weights = config.weights || {
            ttMove: 100000,      // Transposition table hint
            ability: 10000,      // Ability execution
            capture: 5000,       // Capture enemy piece
            abilitySetup: 2000,  // Enables ability next turn
            goalProgress: 100,   // Progress toward goal
            mobility: 10         // Increased mobility
        };
    }

    /**
     * Calculate priority score for a move
     * @param {Object} move - Move object
     * @param {Object} position - Current position
     * @param {Object} metadata - Additional move metadata
     * @returns {number} Priority score (higher = better)
     */
    calculatePriority(move, position, metadata = {}) {
        let score = 0;
        
        // TODO: Implement priority calculation
        // if (metadata.isTTMove) score += this.weights.ttMove;
        // if (metadata.isAbility) score += this.weights.ability;
        // if (metadata.captures) score += this.weights.capture;
        // if (metadata.enablesAbility) score += this.weights.abilitySetup;
        // score += metadata.goalProgress * this.weights.goalProgress;
        
        return score;
    }

    /**
     * Detect if move enables ability on next turn
     * @private
     */
    detectAbilitySetup(move, position) {
        // TODO: Check if move creates formation for ability
        return false;
    }

    /**
     * Calculate goal progress
     * @private
     */
    calculateGoalProgress(move, position) {
        // TODO: Distance improvement toward goal
        return 0;
    }
}
