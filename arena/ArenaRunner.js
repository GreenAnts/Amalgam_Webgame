// ArenaRunner.js
// Thin orchestration layer - pure, reusable, no AI-specific logic

import { runMatch } from "./MatchRunner.js";

/**
 * Run an Arena match between two AI players
 * @param {Object} params - Arena parameters
 * @param {GameLogic} params.gameLogic - Game logic instance
 * @param {Object} params.playerA - First player (implements getId() and selectMove())
 * @param {Object} params.playerB - Second player (implements getId() and selectMove())
 * @param {number} params.baseSeed - Base seed for match
 * @param {number} params.numberOfGames - Number of games to play
 * @returns {Object} Arena results with player IDs and match statistics
 */
export async function runArena({
    playerA,
    playerB,
    baseSeed,
    numberOfGames
}) {
	const results = await runMatch({
		gameLogic,
		playerA,
		playerB,
		baseSeed,
		numberOfGames
	});

	return {
		playerA: playerA.getId(),
		playerB: playerB.getId(),
		results
	};
}
