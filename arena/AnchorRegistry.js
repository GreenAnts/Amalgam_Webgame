// arena/AnchorRegistry.js
// Registry for active anchor policies (maintained references)
//
// CRITICAL DISTINCTION:
// - Anchors (this file): Maintained, runnable reference policies
// - Historical Baselines (ArenaConfig): Frozen git tags, archive only
//
// Anchors can evolve:
// - ✅ Bugfixes (must validate no strength change)
// - ✅ API updates (must validate no strength change)
// - ❌ Heuristic changes (forbidden)
// - ❌ Search depth changes (forbidden)
//
// Validation: Run validateAnchorStability.js after any change

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createPolicy } from '../ai_system/decision/PolicyRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load ArenaConfig.json
const ArenaConfig = JSON.parse(
    readFileSync(join(__dirname, 'ArenaConfig.json'), 'utf8')
);

/**
 * Anchor Registry - manages maintained reference policies
 * 
 * NOTE: This is NOT a historical baseline archive.
 * See ArenaConfig.json -> historical_archive for frozen snapshots.
 */
export class AnchorRegistry {
    constructor() {
        this.anchors = new Map();
        this._loadFromConfig();
    }

    /**
     * Load active anchors from ArenaConfig.json
     * @private
     */
    _loadFromConfig() {
        for (const anchor of ArenaConfig.active_anchors) {
            this.anchors.set(anchor.id, {
                id: anchor.id,
                policyName: anchor.policy_name,
                status: anchor.status,
                dateEstablished: anchor.date_established,
                description: anchor.description,
                competencyLevel: anchor.competency_level,
                validationMode: anchor.validation_mode,
                expectedSelfPlayRate: anchor.expected_self_play_rate,
                expectedVsOpponentRate: anchor.expected_vs_opponent_rate,
                driftTolerance: anchor.drift_tolerance,
                validationSeedBase: anchor.validation_seed_base,
                validationGameCount: anchor.validation_game_count,
                validationOpponent: anchor.validation_opponent,
                promotionCriteria: anchor.promotion_criteria,
                note: anchor.note
            });
        }
    }

    /**
     * Get anchor metadata by ID
     * @param {string} id - Anchor ID
     * @returns {Object} Anchor metadata
     */
    get(id) {
        const anchor = this.anchors.get(id);
        if (!anchor) {
            throw new Error(`Unknown anchor: ${id}. Available: ${this.list().join(', ')}`);
        }
        return anchor;
    }

    /**
     * Create a policy instance for an anchor
     * @param {string} id - Anchor ID
     * @returns {Object} Policy instance
     */
    createPolicy(id) {
        const anchor = this.get(id);
        return createPolicy(anchor.policyName);
    }

    /**
     * Get the primary evaluation anchor ID
     * @returns {string} Primary anchor ID
     */
    getPrimaryAnchor() {
        for (const [id, anchor] of this.anchors) {
            if (anchor.status === 'primary_anchor') {
                return id;
            }
        }
        throw new Error('No primary anchor configured in ArenaConfig.json');
    }

    /**
     * List all anchor IDs
     * @returns {Array<string>} List of anchor IDs
     */
    list() {
        return Array.from(this.anchors.keys());
    }

    /**
     * Get anchor metadata (alias for get)
     * @param {string} id - Anchor ID
     * @returns {Object} Anchor metadata
     */
    getMetadata(id) {
        return this.get(id);
    }

    /**
     * Get validation parameters for anchor
     * Used by validateAnchorStability.js
     * @param {string} id - Anchor ID
     * @returns {Object} Validation parameters
     */
    getValidationParams(id) {
        const anchor = this.get(id);
        return {
            seedBase: anchor.validationSeedBase,
            gameCount: anchor.validationGameCount,
            expectedRate: anchor.expectedVsRandomRate || anchor.expectedSelfPlayRate,
            tolerance: anchor.driftTolerance
        };
    }
}