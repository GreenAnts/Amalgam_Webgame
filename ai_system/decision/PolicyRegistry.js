// ai_system/decision/PolicyRegistry.js
// Central registry for all AI policies

import { RandomPolicy } from './RandomPolicy.js';
import { ObjectivePolicy } from './ObjectivePolicy.js';
import { AlphaBetaPolicy } from './AlphaBetaPolicy.js';
import { UnderDevelopmentPolicy } from './UnderDevelopmentPolicy.js';

/**
 * Policy Registry
 * Maps policy names to their constructors
 */
const POLICY_REGISTRY = {
    'RANDOM': RandomPolicy,
    'VOID_OBJECTIVE': ObjectivePolicy,
    'ALPHA_BETA': AlphaBetaPolicy,
    'UNDER_DEVELOPMENT': UnderDevelopmentPolicy
};

/**
 * Create a policy instance by name
 * @param {string} policyName - Policy name (e.g., 'RANDOM', 'VOID_OBJECTIVE')
 * @returns {Object} Policy instance
 */
export function createPolicy(policyName) {
    const PolicyClass = POLICY_REGISTRY[policyName];
    
    if (!PolicyClass) {
        const available = Object.keys(POLICY_REGISTRY).join(', ');
        throw new Error(`Unknown policy: ${policyName}. Available: ${available}`);
    }
    
    return new PolicyClass();
}

/**
 * Get list of available policy names
 * @returns {Array<string>} Available policy names
 */
export function getAvailablePolicies() {
    return Object.keys(POLICY_REGISTRY);
}

/**
 * Check if a policy exists
 * @param {string} policyName - Policy name to check
 * @returns {boolean} True if policy exists
 */
export function hasPolicy(policyName) {
    return policyName in POLICY_REGISTRY;
}
