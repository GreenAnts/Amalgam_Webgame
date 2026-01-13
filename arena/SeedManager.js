// SeedManager.js
// Sole source of randomness

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
