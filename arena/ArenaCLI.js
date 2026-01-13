// arena/ArenaCLI.js
// CLI entrypoint - parses args, constructs Arena, emits JSON schema

import { ArenaAIPlayer } from './players/ArenaAIPlayer.js';
import { RandomPolicy } from '../ai_system/decision/RandomPolicy.js';
import { runArena } from './ArenaRunner.js';

/**
 * Parse command line arguments
 */
function parseArgs(args) {
    const config = {
        baseSeed: 12345,
        numberOfGames: 500,
        aiVersionId: 'AI_v0.0_RANDOM',
        determinismCheck: true
    };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--seed' && args[i + 1]) {
            config.baseSeed = parseInt(args[i + 1]);
            i++;
        } else if (args[i] === '--games' && args[i + 1]) {
            config.numberOfGames = parseInt(args[i + 1]);
            i++;
        } else if (args[i] === '--version' && args[i + 1]) {
            config.aiVersionId = args[i + 1];
            i++;
        } else if (args[i] === '--no-determinism-check') {
            config.determinismCheck = false;
        } else if (args[i] === '--help' || args[i] === '-h') {
            console.error('Usage: node arena/ArenaCLI.js [options]');
            console.error('');
            console.error('Options:');
            console.error('  --seed <number>              Base seed (default: 12345)');
            console.error('  --games <number>             Number of games (default: 500)');
            console.error('  --version <string>           AI version ID (default: AI_v0.0_RANDOM)');
            console.error('  --no-determinism-check       Skip determinism verification');
            console.error('  --help, -h                   Show this help');
            console.error('');
            console.error('Output:');
            console.error('  stdout: Canonical JSON schema');
            console.error('  stderr: Human-readable logs');
            process.exit(0);
        }
    }

    return config;
}

/**
 * Run baseline evaluation
 */
async function runBaseline(config) {
    const startTime = Date.now();
    
    const randomPolicy = new RandomPolicy();
    
    const playerA = new ArenaAIPlayer({
        id: 'player1',  // Fixed ID for player slot
        aiVersionId: config.aiVersionId,  // Version for tracking
        policy: randomPolicy
    });
    const playerB = new ArenaAIPlayer({
        id: 'player2',  // Fixed ID for player slot
        aiVersionId: config.aiVersionId,  // Version for tracking
        policy: randomPolicy
    });
    
    console.error(`Running baseline: ${config.aiVersionId}`);
    console.error(`Games: ${config.numberOfGames}, Seed: ${config.baseSeed}`);
    console.error('Starting match...\n');
    
    const results = await runArena({
        playerA,
        playerB,
        baseSeed: config.baseSeed,
        numberOfGames: config.numberOfGames
    });
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    const playerAWins = results.results.winsByAI[results.playerA] || 0;
    const playerBWins = results.results.winsByAI[results.playerB] || 0;
    const totalWins = playerAWins + playerBWins;
    const playerAWinRate = totalWins > 0 ? playerAWins / totalWins : 0;
    const playerBWinRate = totalWins > 0 ? playerBWins / totalWins : 0;
    
    let determinismResult = null;
    if (config.determinismCheck) {
        console.error('Running determinism check...');
        const results2 = await runArena({
            playerA,
            playerB,
            baseSeed: config.baseSeed,
            numberOfGames: config.numberOfGames
        });
        
        const byteIdentical = 
            results.results.gamesPlayed === results2.results.gamesPlayed &&
            results.results.winsByAI[results.playerA] === results2.results.winsByAI[results.playerA] &&
            results.results.winsByAI[results.playerB] === results2.results.winsByAI[results.playerB] &&
            results.results.draws === results2.results.draws &&
            results.results.crashes === results2.results.crashes &&
            results.results.illegalMoves === results2.results.illegalMoves &&
            results.results.totalTurns === results2.results.totalTurns;
        
        determinismResult = {
            rerun_match: true,
            byte_identical: byteIdentical
        };
        
        if (byteIdentical) {
            console.error('✓ Determinism check passed\n');
        } else {
            console.error('✗ Determinism check FAILED\n');
        }
    }
    
    const canonicalResult = {
        baseline_id: config.aiVersionId,
        timestamp: new Date().toISOString(),
        seed: {
            base: config.baseSeed,
            range: [config.baseSeed, config.baseSeed + config.numberOfGames - 1]
        },
        games: {
            requested: config.numberOfGames,
            completed: results.results.gamesPlayed,
            crashes: results.results.crashes,
            illegal_moves: results.results.illegalMoves,
            draws: results.results.draws
        },
        results: {
            wins: {
                playerA: playerAWins,
                playerB: playerBWins
            },
            win_rate: {
                playerA: Math.round(playerAWinRate * 1000) / 1000,
                playerB: Math.round(playerBWinRate * 1000) / 1000
            },
            average_turns: results.results.averageTurns
        },
        determinism_check: determinismResult,
        duration_seconds: parseFloat(duration)
    };
    
    console.error('=== Summary ===');
    console.error(`Duration: ${duration}s`);
    console.error(`Games: ${canonicalResult.games.completed}`);
    console.error(`Win rate: ${(canonicalResult.results.win_rate.playerA * 100).toFixed(1)}% / ${(canonicalResult.results.win_rate.playerB * 100).toFixed(1)}%`);
    console.error(`Crashes: ${canonicalResult.games.crashes}`);
    console.error(`Illegal moves: ${canonicalResult.games.illegal_moves}`);
    console.error(`Average turns: ${canonicalResult.results.average_turns.toFixed(1)}`);
    if (determinismResult) {
        console.error(`Deterministic: ${determinismResult.byte_identical ? 'YES' : 'NO'}`);
    }
    console.error('\n=== Canonical Schema (stdout) ===\n');
    
    console.log(JSON.stringify(canonicalResult, null, 2));
    
    return canonicalResult;
}

// CLI entry point
if (typeof process !== 'undefined' && process.argv) {
    const args = process.argv.slice(2);
    const config = parseArgs(args);
    
    runBaseline(config).catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
}

export { runBaseline, parseArgs };