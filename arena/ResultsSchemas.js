// ResultSchemas.js
// Pure data contracts. No logic.

/**
 * Create a game result object
 * @param {Object} params - Game result parameters
 * @returns {Object} Game result
 */
export function createGameResult({
	winnerId,
	winConditionType,
	turnCount,
	crashed,
	illegalMove,
	seed,
	aiVersionIds
}) {
	return {
		winnerId,          // string | null
		winConditionType,  // string | null
		turnCount,         // number
		crashed,           // boolean
		illegalMove,       // boolean
		seed,              // number
		aiVersionIds       // { playerA: string, playerB: string }
	};
}

/**
 * Create an empty match stats object
 * @returns {Object} Match statistics
 */
export function createMatchStats() {
	return {
		gamesPlayed: 0,
		winsByAI: {},        // { aiId: count }
		lossesByAI: {},      // { aiId: count }
		draws: 0,
		crashes: 0,
		illegalMoves: 0,
		totalTurns: 0
	};
}

/**
 * Calculate average turns from match stats
 * @param {Object} stats - Match statistics
 * @returns {number} Average turns per game
 */
export function getAverageTurns(stats) {
	if (stats.gamesPlayed === 0) return 0;
	return Math.round((stats.totalTurns / stats.gamesPlayed) * 100) / 100; // Round to 2 decimal places
}
