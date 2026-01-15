// arena/BaselineRegistry.js
// Registry for frozen baseline policies - reads from ArenaConfig.json

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
 * Baseline Registry - manages frozen baseline policies
 * 
 * Baselines are loaded from ArenaConfig.json and reference policies by name.
 * This decouples Arena from AI implementation details.
 */
export class BaselineRegistry {
    constructor() {
        this.baselines = new Map();
        this._loadFromConfig();
    }

    /**
     * Load baselines from ArenaConfig.json
     * @private
     */
    _loadFromConfig() {
        for (const baseline of ArenaConfig.frozen_baselines) {
            this.baselines.set(baseline.id, {
                id: baseline.id,
                policyName: baseline.policy_name,
                gitTag: baseline.git_tag,
                date: baseline.date,
                description: baseline.description,
                seedRange: baseline.seed_range
            });
        }
    }

    /**
     * Get baseline by ID
     * @param {string} id - Baseline ID
     * @returns {Object} Baseline metadata
     */
    get(id) {
        const baseline = this.baselines.get(id);
        if (!baseline) {
            throw new Error(`Unknown baseline: ${id}. Available: ${this.list().join(', ')}`);
        }
        return baseline;
    }

    /**
     * Create a policy instance for a baseline
     * @param {string} id - Baseline ID
     * @returns {Object} Policy instance
     */
    createPolicy(id) {
        const baseline = this.get(id);
        return createPolicy(baseline.policyName);
    }

    /**
     * Get the most recent baseline ID
     * @returns {string} Most recent baseline ID
     */
    getLatest() {
        const baselines = ArenaConfig.frozen_baselines;
        return baselines[baselines.length - 1].id;
    }

    /**
     * List all baseline IDs
     * @returns {Array<string>} List of baseline IDs
     */
    list() {
        return Array.from(this.baselines.keys());
    }

    /**
     * Get baseline metadata
     * @param {string} id - Baseline ID
     * @returns {Object} Baseline metadata
     */
    getMetadata(id) {
        return this.get(id);
    }
}