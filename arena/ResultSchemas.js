// ResultSchemas.js
// Pure data contracts. No logic.

// Schema version for forward compatibility
// Increment when adding/changing result fields
export const SCHEMA_VERSION = '1.0.0';

/**
 * Create a game result object
 * @param {Object} params - Game result parameters
 * @param {string|null} params.winnerId - Winner ID (playerA/playerB) or null for draw
 * @param {string|null} params.winConditionType - Win condition type
 * @param {number} params.turnCount - Number of turns played
 * @param {boolean} params.crashed - Whether AI crashed
 * @param {boolean} params.illegalMove - Whether illegal move occurred
 * @param {number} params.seed - Game seed
 * @param {Object} params.aiVersionIds - AI version identifiers
 * @returns {Object} Game result schema v1.0.0
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
        schema_version: SCHEMA_VERSION,
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
 * @returns {Object} Match statistics schema v1.0.0
 */
export function createMatchStats() {
    return {
        schema_version: SCHEMA_VERSION,
        gamesPlayed: 0,
        winsByAI: {},        // { aiId: count }
        lossesByAI: {},      // { aiId: count }
        draws: 0,
        crashes: 0,
        illegalMoves: 0,
        totalTurns: 0,
        averageTurns: 0
    };
}

/**
 * Calculate average turns from match stats
 * @param {Object} stats - Match statistics
 * @returns {number} Average turns per game
 */
export function getAverageTurns(stats) {
    if (stats.gamesPlayed === 0) return 0;
    return Math.round((stats.totalTurns / stats.gamesPlayed) * 100) / 100;
}