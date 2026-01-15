// arena/BaselineRegistry.js
// Registry for frozen baseline policies

import { RandomPolicy } from '../ai_system/decision/RandomPolicy.js';

/**
 * Baseline Registry - manages frozen baseline policies
 * 
 * Baselines are immutable references. Once frozen, they never change.
 * New baselines are added, old ones remain accessible.
 */
export class BaselineRegistry {
    constructor() {
        this.baselines = new Map();
        this._initializeBaselines();
    }

    /**
     * Initialize all known baselines
     * @private
     */
    _initializeBaselines() {
        // Baseline v0.0: Random legal play
        this.register({
            id: 'AI_v0.0_RANDOM',
            gitTag: 'AI_v0.0_RANDOM',
            date: '2026-01-14',
            description: 'Uniform random legal policy',
            createPolicy: () => new RandomPolicy()
        });

        // Future baselines will be added here as they are promoted
    }

    /**
     * Register a baseline
     * @param {Object} config - Baseline configuration
     */
    register(config) {
        if (this.baselines.has(config.id)) {
            throw new Error(`Baseline ${config.id} already registered`);
        }
        
        this.baselines.set(config.id, {
            id: config.id,
            gitTag: config.gitTag,
            date: config.date,
            description: config.description,
            createPolicy: config.createPolicy
        });
    }

    /**
     * Get baseline by ID
     * @param {string} id - Baseline ID
     * @returns {Object} Baseline configuration
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
        return baseline.createPolicy();
    }

    /**
     * Get the most recent baseline ID
     * @returns {string} Most recent baseline ID
     */
    getLatest() {
        // Baselines are registered in chronological order
        const ids = Array.from(this.baselines.keys());
        return ids[ids.length - 1];
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
     * @returns {Object} Baseline metadata (without createPolicy function)
     */
    getMetadata(id) {
        const baseline = this.get(id);
        return {
            id: baseline.id,
            gitTag: baseline.gitTag,
            date: baseline.date,
            description: baseline.description
        };
    }
}