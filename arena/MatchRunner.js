// MatchRunner.js
// Runs N games and aggregates results

import { playGame } from "./GameRunner.js";
import { createMatchStats, getAverageTurns } from "./ResultSchemas.js";
import { getGameSeed } from "./SeedManager.js";

/**
 * Run a match (N games) between two AI players
 * @param {Object} params - Match parameters
 * @param {Object} params.playerA - First player (AIPlayer instance)
 * @param {Object} params.playerB - Second player (AIPlayer instance)
 * @param {number} params.baseSeed - Base seed for match
 * @param {number} params.numberOfGames - Number of games to play
 * @returns {Object} Match statistics
 */
export async function runMatch({
    playerA,
    playerB,
    baseSeed,
    numberOfGames
}) {
    const stats = createMatchStats();

    for (let i = 0; i < numberOfGames; i++) {
        const seed = getGameSeed(baseSeed, i);

        // Alternate starting player for fairness
        const isEven = i % 2 === 0;
        const first = isEven ? playerA : playerB;
        const second = isEven ? playerB : playerA;

        const result = await playGame({
            playerA: first,
            playerB: second,
            seed
        });

        stats.gamesPlayed++;
        stats.totalTurns += result.turnCount;

        if (result.crashed) stats.crashes++;
        if (result.illegalMove) stats.illegalMoves++;

        if (result.winnerId === null) {
            stats.draws++;
        } else {
            stats.winsByAI[result.winnerId] =
                (stats.winsByAI[result.winnerId] || 0) + 1;
            
            const loserId = result.winnerId === first.getId() ? second.getId() : first.getId();
            stats.lossesByAI[loserId] =
                (stats.lossesByAI[loserId] || 0) + 1;
        }
    }

    stats.averageTurns = getAverageTurns(stats);

    return stats;
}