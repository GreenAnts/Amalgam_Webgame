// GameRunner.js
// Executes exactly one game
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createGameResult } from "./ResultSchemas.js";
import { createRNG } from "./SeedManager.js";
import { GameLogicAdapter } from "./GameLogicAdapter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load ArenaConfig.json
const ArenaConfig = JSON.parse(
    readFileSync(join(__dirname, 'ArenaConfig.json'), 'utf8')
);

export async function playGame({ playerA, playerB, seed }) {
    const rng = createRNG(seed);
    const adapter = new GameLogicAdapter();
    
    let gameState = adapter.initialize(seed);
    let turnCount = 0;
    const maxTurns = ArenaConfig.game_settings.max_turns;

    while (!adapter.isTerminal(gameState) && turnCount < maxTurns) {
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
            adapter._restoreFromSnapshot(gameState);
            
            const context = {
                rng,
                gameLogic: adapter.gameLogic,
                playerManager: adapter.playerManager
            };
            move = await activePlayer.selectMove(gameState, context);
        } catch (error) {
            console.error("AI Crash:", error);
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
    
    // Map game's internal player names to Arena player IDs
    let arenaWinnerId = null;
    if (terminalInfo.winnerId === 'player1') {
        arenaWinnerId = playerA.getId();
    } else if (terminalInfo.winnerId === 'player2') {
        arenaWinnerId = playerB.getId();
    }
    
    return createGameResult({
        winnerId: arenaWinnerId,
        winConditionType: terminalInfo.winConditionType,
        turnCount,
        crashed: false,
        illegalMove: false,
        seed,
        aiVersionIds: { playerA: playerA.getId(), playerB: playerB.getId() }
    });
}