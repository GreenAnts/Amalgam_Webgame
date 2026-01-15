// arena/ArenaCLI.js
// CLI entrypoint - baseline vs candidate testing

import { ArenaAIPlayer } from './players/ArenaAIPlayer.js';
import { runArena } from './ArenaRunner.js';
import { getSeedRange } from './SeedManager.js';
import { BaselineRegistry } from './BaselineRegistry.js';
import { PolicyFactory } from './PolicyFactory.js';

/**
 * Parse command line arguments
 */
function parseArgs(args) {
    const config = {
        baseSeed: 12345,
        numberOfGames: 500,
        candidatePolicy: null,      // NEW: candidate policy to test
        baselineId: null,           // NEW: baseline to test against
        seedRange: null,
        determinismCheck: true
    };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--seed' && args[i + 1]) {
            config.baseSeed = parseInt(args[i + 1]);
            i++;
        } else if (args[i] === '--games' && args[i + 1]) {
            config.numberOfGames = parseInt(args[i + 1]);
            i++;
        } else if (args[i] === '--policy' && args[i + 1]) {
            // NEW: Candidate policy
            config.candidatePolicy = args[i + 1];
            i++;
        } else if (args[i] === '--baseline' && args[i + 1]) {
            // NEW: Baseline opponent
            config.baselineId = args[i + 1];
            i++;
        } else if (args[i] === '--range' && args[i + 1]) {
            config.seedRange = args[i + 1];
            i++;
        } else if (args[i] === '--no-determinism-check') {
            config.determinismCheck = false;
        } else if (args[i] === '--list-baselines') {
            const registry = new BaselineRegistry();
            console.error('Available baselines:');
            registry.list().forEach(id => {
                const meta = registry.getMetadata(id);
                console.error(`  ${id} (${meta.date}): ${meta.description}`);
            });
            process.exit(0);
        } else if (args[i] === '--list-policies') {
            const factory = new PolicyFactory();
            console.error('Available policies:');
            factory.list().forEach(id => {
                console.error(`  ${id}`);
            });
            process.exit(0);
        } else if (args[i] === '--help' || args[i] === '-h') {
            console.error('Usage: node arena/ArenaCLI.js [options]');
            console.error('');
            console.error('Testing Modes:');
            console.error('  1. Baseline self-play:');
            console.error('     node arena/ArenaCLI.js --range BASELINE_S01');
            console.error('');
            console.error('  2. Candidate vs Baseline (RECOMMENDED):');
            console.error('     node arena/ArenaCLI.js --policy VOID_OBJECTIVE --baseline AI_v0.0_RANDOM --range BASELINE_S01');
            console.error('');
            console.error('  3. Candidate vs Latest Baseline (auto):');
            console.error('     node arena/ArenaCLI.js --policy VOID_OBJECTIVE --range BASELINE_S01');
            console.error('');
            console.error('Options:');
            console.error('  --policy <name>              Candidate policy to test (e.g., VOID_OBJECTIVE)');
            console.error('  --baseline <id>              Baseline opponent (e.g., AI_v0.0_RANDOM)');
            console.error('                               If omitted with --policy, uses latest baseline');
            console.error('  --seed <number>              Base seed (default: 12345)');
            console.error('  --games <number>             Number of games (default: 500)');
            console.error('  --range <name>               Named seed range (DEV, SANITY, BASELINE_S01, etc.)');
            console.error('  --no-determinism-check       Skip determinism verification');
            console.error('  --list-baselines             List all available baselines');
            console.error('  --list-policies              List all available policies');
            console.error('  --help, -h                   Show this help');
            console.error('');
            console.error('Output:');
            console.error('  stdout: Canonical JSON schema');
            console.error('  stderr: Human-readable logs');
            process.exit(0);
        }
    }
    
    // Apply named range if specified
    if (config.seedRange) {
        const range = getSeedRange(config.seedRange);
        config.baseSeed = range.start;
        config.numberOfGames = range.count;
        console.error(`Using seed range: ${config.seedRange} (seeds ${range.start}-${range.start + range.count - 1})`);
    }

    return config;
}

/**
 * Run Arena match
 */
async function runMatch(config) {
    const startTime = Date.now();
    
    const registry = new BaselineRegistry();
    const factory = new PolicyFactory();
    
    let playerA, playerB;
    let matchType;
    
    // Determine match configuration
    if (config.candidatePolicy && config.baselineId) {
        // Mode 1: Explicit candidate vs explicit baseline
        matchType = 'CANDIDATE_VS_BASELINE';
        const candidatePolicy = factory.create(config.candidatePolicy);
        const baselinePolicy = registry.createPolicy(config.baselineId);
        
        playerA = new ArenaAIPlayer({ id: 'candidate', policy: candidatePolicy });
        playerB = new ArenaAIPlayer({ id: config.baselineId, policy: baselinePolicy });
        
        console.error(`Match type: Candidate vs Baseline`);
        console.error(`  Candidate: ${config.candidatePolicy}`);
        console.error(`  Baseline: ${config.baselineId}`);
        
    } else if (config.candidatePolicy && !config.baselineId) {
        // Mode 2: Candidate vs latest baseline (auto)
        matchType = 'CANDIDATE_VS_LATEST';
        const latestBaseline = registry.getLatest();
        const candidatePolicy = factory.create(config.candidatePolicy);
        const baselinePolicy = registry.createPolicy(latestBaseline);
        
        playerA = new ArenaAIPlayer({ id: 'candidate', policy: candidatePolicy });
        playerB = new ArenaAIPlayer({ id: latestBaseline, policy: baselinePolicy });
        
        console.error(`Match type: Candidate vs Latest Baseline`);
        console.error(`  Candidate: ${config.candidatePolicy}`);
        console.error(`  Baseline: ${latestBaseline} (latest)`);
        
    } else {
        // Mode 3: Baseline self-play (original behavior)
        matchType = 'BASELINE_SELF_PLAY';
        const baselineId = config.baselineId || registry.getLatest();
        const policyA = registry.createPolicy(baselineId);
        const policyB = registry.createPolicy(baselineId);
        
        playerA = new ArenaAIPlayer({ id: baselineId, policy: policyA });
        playerB = new ArenaAIPlayer({ id: baselineId, policy: policyB });
        
        console.error(`Match type: Baseline Self-Play`);
        console.error(`  Baseline: ${baselineId}`);
    }
    
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
        match_type: matchType,
        candidate_policy: config.candidatePolicy || null,
        baseline_id: config.baselineId || (matchType === 'CANDIDATE_VS_LATEST' ? playerB.getId() : null),
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
    
    runMatch(config).catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
}

export { runMatch, parseArgs };
