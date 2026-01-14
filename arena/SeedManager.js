// SeedManager.js
// Sole source of randomness

/**
 * SEED STRATIFICATION POLICY
 * 
 * Seeds are divided into non-overlapping ranges to prevent data contamination:
 * 
 * DEV_SEEDS:     1-3        (3 games)   - Fast iteration, reusable
 * SANITY_SEEDS:  10-19      (10 games)  - Pre-baseline check, reusable
 * BASELINE_SETS: 100+       (100+ games each) - One-time use per version
 * 
 * BASELINE SEED ALLOCATION:
 * - v0.0: 100-199   (100 games)
 * - v0.1: 200-299   (100 games)
 * - v0.2: 300-399   (100 games)
 * - v0.3: 400-499   (100 games)
 * ... and so on
 * 
 * CRITICAL RULES:
 * 1. Dev seeds (1-3): Reuse freely during heuristic development
 * 2. Sanity seeds (10-19): Reuse freely for pre-baseline validation
 * 3. Baseline seeds: ONE-TIME USE per AI version
 * 4. If a baseline test FAILS (low win rate), BURN those seeds - use next range
 * 5. If Arena has a BUG (crash, illegal move), reusing seeds is acceptable
 * 
 * FAILED BASELINE EXAMPLE:
 * - Develop v0.1, test on dev seeds (1-3) ✓
 * - Run sanity check on seeds 10-19 ✓
 * - Run baseline on seeds 200-299 → FAIL (only 45% win rate)
 * - Fix heuristic, test on dev (1-3) again ✓
 * - Run sanity check (10-19) again ✓
 * - Run baseline on seeds 300-399 (NOT 200-299) ← Burn contaminated seeds
 */

// Seed range constants
export const SEED_RANGES = {
    DEV: { start: -10, count: 5 },
    SANITY: { start: 0, count: 15 },
    BASELINE_v0_0: { start: 100, count: 100 }, // Locked RANDOM

	// Baseline seed batches (300 games each)
	BASELINE_S01: { start: 200,  count: 300 }, // 200–499
	BASELINE_S02: { start: 500,  count: 300 }, // 500–799
	BASELINE_S03: { start: 800,  count: 300 }, // 800–1099
	BASELINE_S04: { start: 1100, count: 300 }, // 1100–1399
	BASELINE_S05: { start: 1400, count: 300 }, // 1400–1699
	BASELINE_S06: { start: 1700, count: 300 }, // 1700–1999
	BASELINE_S07: { start: 2000, count: 300 }, // 2000–2299
	BASELINE_S08: { start: 2300, count: 300 }, // 2300–2599
	BASELINE_S09: { start: 2600, count: 300 }, // 2600–2899
	BASELINE_S10: { start: 2900, count: 300 }, // 2900–3199
};

/**
 * Get seed range by name
 * @param {string} rangeName - One of: 'DEV', 'SANITY', 'BASELINE_v0_1', etc.
 * @returns {Object} {start: number, count: number}
 */
export function getSeedRange(rangeName) {
    const range = SEED_RANGES[rangeName];
    if (!range) {
        throw new Error(`Unknown seed range: ${rangeName}. Available: ${Object.keys(SEED_RANGES).join(', ')}`);
    }
    return range;
}

/**
 * Generate a deterministic game seed from base seed and game index
 * @param {number} baseSeed - Base seed value
 * @param {number} gameIndex - Game index (0-based)
 * @returns {number} Deterministic game seed
 */
export function getGameSeed(baseSeed, gameIndex) {
	// Deterministic seed derivation: simple addition ensures reproducibility
	return baseSeed + gameIndex;
}

/**
 * Create a deterministic RNG instance using mulberry32 algorithm
 * @param {number} seed - Seed value
 * @returns {Object} RNG instance with nextFloat() and nextInt() methods
 */
export function createRNG(seed) {
	// Mulberry32: fast, simple, good quality PRNG
	let state = seed >>> 0; // Ensure unsigned 32-bit
	
	return {
		/**
		 * Generate next random float in [0, 1)
		 * @returns {number} Random float
		 */
		nextFloat() {
			state = (state + 0x6D2B9F) >>> 0;
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
