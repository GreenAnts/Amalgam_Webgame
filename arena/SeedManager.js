// SeedManager.js
// Deterministic RNG and seed range management

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
 * Get seed range by name
 * @param {string} rangeName - Seed range name (e.g., 'DEV', 'BASELINE_S01')
 * @returns {Object} {start: number, count: number}
 */
export function getSeedRange(rangeName) {
    const range = ArenaConfig.seed_ranges[rangeName];
    if (!range) {
        const available = Object.keys(ArenaConfig.seed_ranges).join(', ');
        throw new Error(`Unknown seed range: ${rangeName}. Available: ${available}`);
    }
    return { start: range.start, count: range.count };
}

/**
 * List all available seed ranges
 * @returns {Array<string>} Seed range names
 */
export function listSeedRanges() {
    return Object.keys(ArenaConfig.seed_ranges);
}

/**
 * Generate a deterministic game seed from base seed and game index
 * @param {number} baseSeed - Base seed value
 * @param {number} gameIndex - Game index (0-based)
 * @returns {number} Deterministic game seed
 */
export function getGameSeed(baseSeed, gameIndex) {
    return baseSeed + gameIndex;
}

/**
 * Create a deterministic RNG instance using mulberry32 algorithm
 * @param {number} seed - Seed value
 * @returns {Object} RNG instance with nextFloat() and nextInt() methods
 */
export function createRNG(seed) {
    let state = seed >>> 0; // Ensure unsigned 32-bit
    
    return {
        /**
         * Generate next random float in [0, 1)
         * @returns {number} Random float
         */
        nextFloat() {
            state = (state + 0x6D2B79F5) >>> 0;
            let t = Math.imul(state ^ (state >>> 15), state | 1);
            t = t ^ (t + Math.imul(t ^ (t >>> 7), state | 61));
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        },
        
        /**
         * Generate next random integer in [0, max)
         * @param {number} max - Maximum value (exclusive)
         * @returns {number} Random integer
         */
        nextInt(max) {
            return Math.floor(this.nextFloat() * max);
        }
    };
}