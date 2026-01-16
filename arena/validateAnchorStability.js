// arena/validateAnchorStability.js
// Validates that anchors haven't drifted in strength
//
// Usage: node arena/validateAnchorStability.js <anchor_id>
//
// Validation modes:
// - self_play: Anchor vs itself (expected ~50% win rate)
// - vs_opponent: Anchor vs specific opponent (expected rate from config)

import { AnchorRegistry } from './AnchorRegistry.js';
import { ArenaAIPlayer } from './players/ArenaAIPlayer.js';
import { runArena } from './ArenaRunner.js';

/**
 * Validate that an anchor's strength hasn't drifted
 * @param {string} anchorId - Anchor ID to validate
 * @returns {Promise<boolean>} True if anchor is stable
 */
async function validateAnchor(anchorId) {
    console.error(`\n=== Validating Anchor Stability: ${anchorId} ===\n`);
    
    const registry = new AnchorRegistry();
    const anchor = registry.get(anchorId);
    
    console.error('Anchor Configuration:');
    console.error(`  Status: ${anchor.status}`);
    console.error(`  Competency: ${anchor.competencyLevel}`);
    console.error(`  Validation mode: ${anchor.validationMode || 'self_play'}`);
    console.error(`  Validation games: ${anchor.validationGameCount}`);
    console.error(`  Seed base: ${anchor.validationSeedBase}`);
    
    const validationMode = anchor.validationMode || 'self_play';
    let expectedRate, tolerance;

    if (validationMode === 'self_play') {
        expectedRate = anchor.expectedSelfPlayRate || 0.50;
        tolerance = anchor.driftTolerance || 0.10;
        console.error(`  Expected win rate: ${(expectedRate * 100).toFixed(1)}% (self-play)`);
    } else {
        expectedRate = anchor.expectedVsOpponentRate;  // ← FIXED
        tolerance = anchor.driftTolerance || 0.05;
        console.error(`  Expected win rate: ${(expectedRate * 100).toFixed(1)}% (vs ${anchor.validationOpponent})`);
    }
    
    console.error(`  Tolerance: ±${(tolerance * 100).toFixed(1)}%\n`);
    
    // Create policy instances
    const policyA = registry.createPolicy(anchorId);
    const playerA = new ArenaAIPlayer({ id: anchorId, policy: policyA });
    
    let playerB;
    if (validationMode === 'self_play') {
        const policyB = registry.createPolicy(anchorId);
        playerB = new ArenaAIPlayer({ id: anchorId, policy: policyB });
    } else {
        // For vs_opponent mode, use the opponent specified in config
        const opponentPolicy = registry.createPolicy(anchor.validationOpponent || 'ANCHOR_RANDOM');
        playerB = new ArenaAIPlayer({ id: anchor.validationOpponent || 'ANCHOR_RANDOM', policy: opponentPolicy });
    }
    
    console.error('\n=== DEBUG: Configuration Check ===');
    console.error(`Anchor ID: ${anchorId}`);
    console.error(`Validation mode: ${validationMode}`);
    console.error(`Validation opponent: ${anchor.validationOpponent}`);
    console.error(`PlayerA policy type: ${policyA.constructor.name}`);
    if (playerB && playerB.policy) {
        console.error(`PlayerB policy type: ${playerB.policy.constructor.name}`);
    }
    console.error('===\n');

    console.error('Running validation match...\n');
    
    const results = await runArena({
        playerA,
        playerB,
        baseSeed: anchor.validationSeedBase,
        numberOfGames: anchor.validationGameCount
    });
    
    // Calculate win rate
    const playerAWins = results.results.winsByAI['playerA'] || 0;
    const playerBWins = results.results.winsByAI['playerB'] || 0;
    const totalWins = playerAWins + playerBWins;
    const currentRate = totalWins > 0 ? playerAWins / totalWins : 0.5;
    
    const drift = Math.abs(currentRate - expectedRate);
    
    // Results
    console.error('=== Validation Results ===\n');
    console.error(`Expected win rate: ${(expectedRate * 100).toFixed(1)}%`);
    console.error(`Current win rate:  ${(currentRate * 100).toFixed(1)}%`);
    console.error(`Drift: ${(drift * 100).toFixed(1)}% (tolerance: ±${(tolerance * 100).toFixed(1)}%)`);
    console.error(`Games completed: ${results.results.gamesPlayed}`);
    console.error(`Crashes: ${results.results.crashes}`);
    console.error(`Illegal moves: ${results.results.illegalMoves}\n`);
    
    // Pass/Fail determination
    const passed = drift <= tolerance && 
                   results.results.crashes === 0 && 
                   results.results.illegalMoves === 0;
    
    if (passed) {
        console.error('✅ PASS: Anchor is stable\n');
        console.error('The anchor can be safely used for evaluation.\n');
        return true;
    } else {
        console.error('❌ FAIL: Anchor has drifted or has errors\n');
        
        if (drift > tolerance) {
            console.error('DRIFT DETECTED:');
            console.error('  The anchor\'s strength has changed beyond acceptable tolerance.');
            console.error('  Possible causes:');
            console.error('    - Policy implementation changed (check git diff)');
            console.error('    - GameLogic behavior changed');
            console.error('    - RNG implementation changed');
            console.error('  Action required:');
            console.error('    - Review recent changes to policy and game logic');
            console.error('    - If changes were intentional, retire this anchor and create new one');
            console.error('    - If changes were unintentional, revert them\n');
        }
        
        if (results.results.crashes > 0) {
            console.error('CRASHES DETECTED:');
            console.error('  The anchor is crashing - immediate fix required.\n');
        }
        
        if (results.results.illegalMoves > 0) {
            console.error('ILLEGAL MOVES DETECTED:');
            console.error('  The anchor is producing illegal moves - immediate fix required.\n');
        }
        
        return false;
    }
}

// CLI entry point
if (typeof process !== 'undefined' && process.argv) {
    const anchorId = process.argv[2];
    
    if (!anchorId) {
        console.error('Usage: node arena/validateAnchorStability.js <anchor_id>');
        console.error('');
        console.error('Available anchors:');
        const registry = new AnchorRegistry();
        registry.list().forEach(id => {
            const meta = registry.getMetadata(id);
            console.error(`  ${id} (${meta.status})`);
        });
        process.exit(1);
    }
    
    validateAnchor(anchorId)
        .then(passed => {
            process.exit(passed ? 0 : 1);
        })
        .catch(error => {
            console.error('\n❌ ERROR:', error.message);
            console.error(error.stack);
            process.exit(1);
        });
}

export { validateAnchor };