// arena/ArenaCLI.js
// CLI entrypoint - baseline vs candidate testing

import { ArenaAIPlayer } from './players/ArenaAIPlayer.js';
import { runArena } from './ArenaRunner.js';
import { getSeedRange, listSeedRanges } from './SeedManager.js';
import { BaselineRegistry } from './BaselineRegistry.js';
import { createPolicy, getAvailablePolicies } from '../ai_system/decision/PolicyRegistry.js';

/**
 * Parse command line arguments
 */
function parseArgs(args) {
    const config = {
        baseSeed: 12345,
        numberOfGames: 500,
        candidateVersionId: null,
        baselineVersionId: null,
        determinismCheck: true,
        seedRange: null,
        candidatePolicy: null,
        baselinePolicy: null,
        mode: null  // 'self-play' or 'evaluation'
    };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--seed' && args[i + 1]) {
            config.baseSeed = parseInt(args[i + 1]);
            i++;
        } else if (args[i] === '--games' && args[i + 1]) {
            config.numberOfGames = parseInt(args[i + 1]);
            i++;
        } else if (args[i] === '--range' && args[i + 1]) {
            config.seedRange = args[i + 1];
            i++;
        } else if (args[i] === '--policy' && args[i + 1]) {
            config.candidatePolicy = args[i + 1];
            i++;
        } else if (args[i] === '--baseline' && args[i + 1]) {
            config.baselinePolicy = args[i + 1];
            config.mode = 'evaluation';
            i++;
        } else if (args[i] === '--self-play') {
            config.mode = 'self-play';
        } else if (args[i] === '--candidate-version' && args[i + 1]) {
            config.candidateVersionId = args[i + 1];
            i++;
        } else if (args[i] === '--baseline-version' && args[i + 1]) {
            config.baselineVersionId = args[i + 1];
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
            const available = getAvailablePolicies();
            console.error('Available policies:');
            available.forEach(name => {
                console.error(`  ${name}`);
            });
            process.exit(0);
        } else if (args[i] === '--list-seed-ranges') {
            const ranges = listSeedRanges();
            console.error('Available seed ranges:');
            ranges.forEach(name => {
                console.error(`  ${name}`);
            });
            process.exit(0);
        } else if (args[i] === '--help' || args[i] === '-h') {
            const availablePolicies = getAvailablePolicies();
            console.error('Usage: node arena/ArenaCLI.js [options]');
            console.error('');
            console.error('Modes:');
            console.error('  1. Self-Play Mode (baseline establishment):');
            console.error('     --policy <name> --self-play');
            console.error('');
            console.error('  2. Evaluation Mode (candidate vs baseline):');
            console.error('     --policy <name> --baseline <baseline_id>');
            console.error('');
            console.error('Common Options:');
            console.error('  --seed <number>              Base seed (default: 12345)');
            console.error('  --games <number>             Number of games (default: 500)');
            console.error('  --range <name>               Named seed range (DEV, SANITY, BASELINE_SXX)');
            console.error(`  Available policies: ${availablePolicies.join(', ')}`);
            console.error('  --candidate-version <id>     Candidate AI version ID');
            console.error('  --baseline-version <id>      Baseline AI version ID');
            console.error('  --no-determinism-check       Skip determinism verification');
            console.error('  --list-baselines             List all frozen baselines');
            console.error('  --list-policies              List all available policies');
            console.error('  --list-seed-ranges           List all seed ranges');
            console.error('  --help, -h                   Show this help');
            console.error('');
            console.error('Examples:');
            console.error('  # Self-play baseline establishment');
            console.error('  node arena/ArenaCLI.js --range BASELINE_S01 --policy VOID_OBJECTIVE --self-play');
            console.error('');
            console.error('  # Candidate evaluation vs frozen baseline');
            console.error('  node arena/ArenaCLI.js --range BASELINE_S02 --policy VOID_OBJECTIVE --baseline AI_v0.0_RANDOM');
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

    // Validate configuration
    if (!config.candidatePolicy) {
        console.error('ERROR: --policy required');
        process.exit(1);
    }

    // Determine mode if not explicitly set
    if (!config.mode) {
        if (config.baselinePolicy) {
            config.mode = 'evaluation';
        } else {
            console.error('ERROR: Must specify either --self-play or --baseline <baseline_id>');
            console.error('For self-play: --policy VOID_OBJECTIVE --self-play');
            console.error('For evaluation: --policy VOID_OBJECTIVE --baseline AI_v0.0_RANDOM');
            process.exit(1);
        }
    }

    // Set default version IDs if not provided
    if (!config.candidateVersionId) {
        config.candidateVersionId = config.mode === 'self-play' 
            ? `AI_SELFPLAY_${config.candidatePolicy}`
            : `AI_CANDIDATE_${config.candidatePolicy}`;
    }
    
    if (config.mode === 'evaluation' && !config.baselineVersionId) {
        config.baselineVersionId = config.baselinePolicy;
    }

    return config;
}

/**
 * Run Arena match (self-play or evaluation)
 */
async function runMatch(config) {
    const startTime = Date.now();
    
    // Create candidate policy
    const candidatePolicyInstance = createPolicy(config.candidatePolicy);
    
    // Create baseline policy (or duplicate candidate for self-play)
    let baselinePolicyInstance;
    if (config.mode === 'self-play') {
        baselinePolicyInstance = createPolicy(config.candidatePolicy);
    } else {
        const registry = new BaselineRegistry();
        baselinePolicyInstance = registry.createPolicy(config.baselinePolicy);
    }
    
    const playerA = new ArenaAIPlayer({
        id: 'playerA',
        policy: candidatePolicyInstance
    });
    
    const playerB = new ArenaAIPlayer({
        id: 'playerB',
        policy: baselinePolicyInstance
    });
    
    // Log match configuration
    if (config.mode === 'self-play') {
        console.error(`Running SELF-PLAY: ${config.candidatePolicy} vs ${config.candidatePolicy}`);
        console.error(`Version: ${config.candidateVersionId}`);
    } else {
        console.error(`Running EVALUATION: ${config.candidatePolicy} (candidate) vs ${config.baselinePolicy} (baseline)`);
        console.error(`Candidate: ${config.candidateVersionId}`);
        console.error(`Baseline: ${config.baselineVersionId}`);
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
    
    // Calculate win rates
    const playerAWins = results.results.winsByAI['playerA'] || 0;
    const playerBWins = results.results.winsByAI['playerB'] || 0;
    const totalWins = playerAWins + playerBWins;
    const playerAWinRate = totalWins > 0 ? playerAWins / totalWins : 0;
    const playerBWinRate = totalWins > 0 ? playerBWins / totalWins : 0;
    
    // Determinism check
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
            results.results.winsByAI['playerA'] === results2.results.winsByAI['playerA'] &&
            results.results.winsByAI['playerB'] === results2.results.winsByAI['playerB'] &&
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
    
    // Build canonical result
    const canonicalResult = {
        match_type: config.mode,
        candidate: {
            version_id: config.candidateVersionId,
            policy: config.candidatePolicy,
            wins: playerAWins,
            win_rate: Math.round(playerAWinRate * 1000) / 1000
        },
        baseline: config.mode === 'evaluation' ? {
            version_id: config.baselineVersionId,
            policy: config.baselinePolicy,
            wins: playerBWins,
            win_rate: Math.round(playerBWinRate * 1000) / 1000
        } : {
            version_id: config.candidateVersionId,
            policy: config.candidatePolicy,
            wins: playerBWins,
            win_rate: Math.round(playerBWinRate * 1000) / 1000
        },
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
        statistics: {
            average_turns: results.results.averageTurns
        },
        determinism_check: determinismResult,
        duration_seconds: parseFloat(duration)
    };
    
    // Console summary
    console.error('=== Summary ===');
    console.error(`Mode: ${config.mode.toUpperCase()}`);
    console.error(`Duration: ${duration}s`);
    console.error(`Games: ${canonicalResult.games.completed}`);
    
    if (config.mode === 'self-play') {
        console.error(`Win rate: ${(canonicalResult.candidate.win_rate * 100).toFixed(1)}% / ${(canonicalResult.baseline.win_rate * 100).toFixed(1)}%`);
    } else {
        console.error(`Candidate win rate: ${(canonicalResult.candidate.win_rate * 100).toFixed(1)}%`);
        console.error(`Baseline win rate: ${(canonicalResult.baseline.win_rate * 100).toFixed(1)}%`);
    }
    
    console.error(`Crashes: ${canonicalResult.games.crashes}`);
    console.error(`Illegal moves: ${canonicalResult.games.illegal_moves}`);
    console.error(`Average turns: ${canonicalResult.statistics.average_turns.toFixed(1)}`);
    
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