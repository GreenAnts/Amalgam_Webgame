// arena/HistoricalRegistry.js
// Read-only registry for historical baseline archive
//
// PURPOSE: Metadata access for frozen baselines (git tags)
// NOT RUNNABLE: Historical baselines are archived snapshots, not live code
//
// Use cases:
// - Citing historical results in reports
// - Comparing current results to historical benchmarks
// - Documenting lineage of AI development

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load ArenaConfig.json
const ArenaConfig = JSON.parse(
    readFileSync(join(__dirname, 'ArenaConfig.json'), 'utf8')
);

/**
 * Historical Registry - read-only access to baseline archive
 * 
 * CRITICAL: Historical baselines are NOT runnable.
 * They exist as git tags + archived results only.
 */
export class HistoricalRegistry {
    constructor() {
        this.archive = new Map();
        this._loadFromConfig();
    }

    /**
     * Load historical archive from ArenaConfig.json
     * @private
     */
    _loadFromConfig() {
        for (const historical of ArenaConfig.historical_archive) {
            this.archive.set(historical.id, {
                id: historical.id,
                gitTag: historical.git_tag,
                date: historical.date,
                description: historical.description,
                seedRange: historical.seed_range,
                resultsFile: historical.results_file,
                note: historical.note
            });
        }
    }

    /**
     * Get historical baseline metadata
     * @param {string} id - Historical baseline ID
     * @returns {Object} Metadata
     */
    get(id) {
        const historical = this.archive.get(id);
        if (!historical) {
            throw new Error(`Unknown historical baseline: ${id}. Available: ${this.list().join(', ')}`);
        }
        return historical;
    }

    /**
     * List all historical baseline IDs
     * @returns {Array<string>} List of IDs
     */
    list() {
        return Array.from(this.archive.keys());
    }

    /**
     * Load archived results for historical baseline
     * @param {string} id - Historical baseline ID
     * @returns {Object} Parsed JSON results
     */
    loadResults(id) {
        const historical = this.get(id);
        try {
            const resultsPath = join(__dirname, '..', historical.resultsFile);
            return JSON.parse(readFileSync(resultsPath, 'utf8'));
        } catch (error) {
            throw new Error(`Failed to load results for ${id}: ${error.message}`);
        }
    }

    /**
     * Get git checkout command for historical baseline
     * @param {string} id - Historical baseline ID
     * @returns {string} Git command
     */
    getCheckoutCommand(id) {
        const historical = this.get(id);
        return `git checkout ${historical.gitTag}`;
    }

    /**
     * Check if a baseline is historical (archived)
     * @param {string} id - Baseline ID to check
     * @returns {boolean} True if in historical archive
     */
    isHistorical(id) {
        return this.archive.has(id);
    }
}