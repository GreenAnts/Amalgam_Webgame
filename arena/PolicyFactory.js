// arena/PolicyFactory.js
// Factory for creating candidate policies

import { RandomPolicy } from '../ai_system/decision/RandomPolicy.js';
import { ObjectivePolicy } from '../ai_system/decision/ObjectivePolicy.js';

/**
 * Policy Factory - creates candidate policy instances
 * 
 * Unlike BaselineRegistry (frozen, immutable), this factory
 * creates NEW policies that are under development.
 */
export class PolicyFactory {
    constructor() {
        this.policies = new Map();
        this._initializePolicies();
    }

    /**
     * Initialize available policies
     * @private
     */
    _initializePolicies() {
        // Random policy (baseline)
        this.register('RANDOM', {
            name: 'Random Legal Play',
            createPolicy: () => new RandomPolicy()
        });

        // Void Objective policy (candidate)
        this.register('VOID_OBJECTIVE', {
            name: 'Void Objective-Aware',
            createPolicy: () => new ObjectivePolicy()
        });

        // Future policies added here
    }

    /**
     * Register a policy
     * @param {string} id - Policy ID (e.g., 'VOID_OBJECTIVE')
     * @param {Object} config - Policy configuration
     */
    register(id, config) {
        this.policies.set(id, config);
    }

    /**
     * Create policy instance
     * @param {string} id - Policy ID
     * @returns {Object} Policy instance
     */
    create(id) {
        const config = this.policies.get(id);
        if (!config) {
            throw new Error(`Unknown policy: ${id}. Available: ${this.list().join(', ')}`);
        }
        return config.createPolicy();
    }

    /**
     * List all policy IDs
     * @returns {Array<string>} List of policy IDs
     */
    list() {
        return Array.from(this.policies.keys());
    }
}