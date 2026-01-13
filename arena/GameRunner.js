// GameRunner.js
// Executes exactly one game
import { createGameResult } from "./ResultSchemas.js";
import { createRNG } from "./SeedManager.js";
import { GameLogicAdapter } from "./GameLogicAdapter.js";

export async function playGame({ playerA, playerB, seed }) {
    const rng = createRNG(seed);
    const adapter = new GameLogicAdapter();
    
    let gameState = adapter.initialize(seed);
    let turnCount = 0;
    const maxTurns = 1000;

    while (!adapter.isTerminal(gameState) && turnCount < maxTurns) {
        // TRUST THE STATE: Determine active player from the snapshot
        // This fixes the synchronization issues
        const currentPlayerName = gameState.currentPlayer;
        let activePlayer, inactivePlayer;
        
        if (currentPlayerName === 'Player 1') {
            activePlayer = playerA;
            inactivePlayer = playerB;
        } else {
            activePlayer = playerB;
            inactivePlayer = playerA;
        }
        
        let move;
        try {
            const context = {
                rng,
                gameLogic: adapter.gameLogic,
                playerManager: adapter.playerManager
            };
            move = await activePlayer.selectMove(gameState, context);
        } catch (error) {
            console.error("AI Crash:", error); // Helpful for debugging
            return createGameResult({
                winnerId: inactivePlayer.getId(),
                winConditionType: "CRASH",
                turnCount,
                crashed: true,
                illegalMove: false,
                seed,
                aiVersionIds: { playerA: playerA.getId(), playerB: playerB.getId() }
            });
        }

        if (!move) {
            return createGameResult({
                winnerId: inactivePlayer.getId(),
                winConditionType: "CRASH",
                turnCount,
                crashed: true,
                illegalMove: false,
                seed,
                aiVersionIds: { playerA: playerA.getId(), playerB: playerB.getId() }
            });
        }

        if (!adapter.isLegalMove(gameState, move)) {
            return createGameResult({
                winnerId: inactivePlayer.getId(),
                winConditionType: "ILLEGAL_MOVE",
                turnCount,
                crashed: false,
                illegalMove: true,
                seed,
                aiVersionIds: { playerA: playerA.getId(), playerB: playerB.getId() }
            });
        }

        gameState = adapter.applyMove(gameState, move);
        turnCount++;
        // NO MANUAL SWAP HERE - The loop calculates activePlayer at the top
    }

    if (turnCount >= maxTurns) {
        return createGameResult({
            winnerId: null,
            winConditionType: "TURN_LIMIT",
            turnCount,
            crashed: false,
            illegalMove: false,
            seed,
            aiVersionIds: { playerA: playerA.getId(), playerB: playerB.getId() }
        });
    }

    const terminalInfo = adapter.getTerminalResult(gameState);
    return createGameResult({
        winnerId: terminalInfo.winnerId,
        winConditionType: terminalInfo.winConditionType,
        turnCount,
        crashed: false,
        illegalMove: false,
        seed,
        aiVersionIds: { playerA: playerA.getId(), playerB: playerB.getId() }
    });
}