# Amalgam Arena System

**Purpose:** Deterministic evaluation framework for measuring AI policy strength  
**Authority:** CLI execution only (browser is for debugging)  
**Last Updated:** January 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Determinism](#determinism)
5. [Seed Stratification](#seed-stratification)
6. [Running Tests](#running-tests)
7. [Baseline Workflow](#baseline-workflow)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Arena measures AI strength through deterministic matches. 

**Core Principle:** Same code + same seed → same result. Always.

**Use Cases:**
- **Baseline Establishment:** Self-play to validate new AI policy
- **Candidate Evaluation:** Test new policy against frozen baseline
- **Regression Detection:** Ensure new versions don't lose capabilities

---

## Quick Start

### List Available Options
```bash
# List policies
node arena/ArenaCLI.js --list-policies

# Get help
node arena/ArenaCLI.js --help
```

### Self-Play (Baseline Establishment)
```bash
node arena/ArenaCLI.js --range BASELINE_S01 --policy VOID_OBJECTIVE
```

### Candidate vs Baseline (Evaluation)
```bash
node arena/ArenaCLI.js \
  --range BASELINE_S02 \
  --policy VOID_OBJECTIVE \
  --baseline AI_v0.0_RANDOM
```

---

## Architecture

```
/arena
  ├── ArenaCLI.js              # Entry point - arg parsing, orchestration
  ├── ArenaRunner.js           # Thin wrapper - player ID extraction
  ├── MatchRunner.js           # N-game loop, statistics aggregation
  ├── GameRunner.js            # Single game execution, winnerId mapping
  ├── GameLogicAdapter.js      # Stateless game logic interface
  ├── SeedManager.js           # Deterministic RNG, seed ranges
  ├── ResultSchemas.js         # Pure data contracts
  ├── PolicyFactory.js         # Candidate policy creation
  ├── BaselineRegistry.js      # Frozen baseline policies
  └── /results                 # Authoritative JSON outputs
```

**Separation of Concerns:**
- `game_logic/` → Game rules, state management
- `ai_system/` → Decision policies
- `arena/` → Measurement & evaluation

**Critical Rule:** Arena never imports from `ai_system` except via policy injection.

---

## Determinism

**Definition:** Identical inputs produce identical outputs.

**Requirements:**
1. All randomness seeded via `SeedManager.createRNG()`
2. No `Math.random()`, `Date.now()`, or time-based logic
3. Byte-identical results on re-run

**Validation:**
Every baseline includes determinism check (automatic re-run with same seed).

**Player ID Flow:**
```
Game Engine: 'Player 1' / 'Player 2 (AI)'
    ↓
GameLogicAdapter: 'player1' / 'player2'
    ↓
GameRunner: Maps to Arena player IDs
    ↓
Arena: Uses ArenaAIPlayer.getId() (e.g., 'candidate', 'AI_v0.0_RANDOM')
```

**Why Mapping Matters:**
- Game engine doesn't know about Arena player identities
- Wins must be recorded under Arena IDs for correct aggregation
- Fixed in GameRunner.js lines 93-99

---

## Seed Stratification

Seeds are divided into **non-overlapping ranges** to prevent contamination.

### Seed Ranges (from SeedManager.js)

```javascript
DEV:           -10 to -5     (5 games)    - Fast iteration, reusable
SANITY:         0 to 14      (15 games)   - Pre-baseline check, reusable
BASELINE_S01:   200 to 499   (300 games)  - One-time use
BASELINE_S02:   500 to 799   (300 games)  - One-time use
BASELINE_S03:   800 to 1099  (300 games)  - One-time use
...
```

### Usage Rules

**DEV/SANITY seeds:** Reusable during development
- Use freely for debugging
- Test correctness
- Iterate on heuristics

**BASELINE_SXX seeds:** One-time use per AI version
- Each range used exactly once
- If baseline test **fails** → burn those seeds, use next range
- If Arena has **bug** → reusing seeds is acceptable (bug ≠ heuristic change)

**Example:**
```bash
# Develop on DEV seeds (infinite reruns OK)
node arena/ArenaCLI.js --range DEV --policy NEW_POLICY

# Sanity check
node arena/ArenaCLI.js --range SANITY --policy NEW_POLICY

# Official baseline (ONE-TIME USE)
node arena/ArenaCLI.js --range BASELINE_S01 --policy NEW_POLICY

# If fails → use BASELINE_S02 for next attempt (S01 is burned)
```

---

## Running Tests

### Development Testing (DEV seeds)

**Purpose:** Fast iteration, unlimited reruns

```bash
# Self-play
node arena/ArenaCLI.js --range DEV --policy VOID_OBJECTIVE

# Vs baseline
node arena/ArenaCLI.js --range DEV --policy VOID_OBJECTIVE --baseline AI_v0.0_RANDOM
```

**Expected:** 5 games, instant feedback

---

### Sanity Check (SANITY seeds)

**Purpose:** Pre-baseline validation

```bash
node arena/ArenaCLI.js --range SANITY --policy VOID_OBJECTIVE
```

**Requirements:**
- ✓ Zero crashes
- ✓ Zero illegal moves
- ✓ Deterministic

**If fails:** Fix bugs, iterate on DEV, retry

---

### Baseline Establishment (BASELINE seeds)

**Purpose:** Official self-play validation

```bash
node arena/ArenaCLI.js \
  --range BASELINE_S01 \
  --policy VOID_OBJECTIVE \
  > arena/results/baseline_AI_v0.1_VOID_OBJECTIVE.json
```

**Acceptance Criteria:**
- Win rate: 45-55% (self-play should be balanced)
- Crashes: 0
- Illegal moves: 0
- Deterministic: YES
- Games: ≥300

---

### Candidate Evaluation (BASELINE seeds)

**Purpose:** Test candidate against frozen baseline

```bash
node arena/ArenaCLI.js \
  --range BASELINE_S02 \
  --policy VOID_OBJECTIVE \
  --baseline AI_v0.0_RANDOM \
  --candidate-version AI_v0.1_VOID_OBJECTIVE \
  --baseline-version AI_v0.0_RANDOM \
  > arena/results/candidate_v0.1_vs_v0.0.json
```

**Promotion Criteria:**
- Candidate win rate: ≥65%
- Crashes: 0
- Illegal moves: 0
- Deterministic: YES
- Games: ≥300

---

## Baseline Workflow

### Step 1: Development (DEV seeds)
```bash
node arena/ArenaCLI.js --range DEV --policy NEW_POLICY
```
- Iterate freely
- Test correctness
- No formal results

---

### Step 2: Sanity Check (SANITY seeds)
```bash
node arena/ArenaCLI.js --range SANITY --policy NEW_POLICY
```
- Verify stability
- Confirm no crashes/illegal moves
- Determinism check

---

### Step 3: Self-Play Baseline (Fresh BASELINE seeds)
```bash
node arena/ArenaCLI.js \
  --range BASELINE_S01 \
  --policy NEW_POLICY \
  > arena/results/baseline_NEW.json
```
- Full statistical evaluation
- One-time seed use
- Archive JSON output
``!STEP 3 is not implemented correctly, skip to step 4 (step 3 will produce thE SAME results as 4)!``
---

### Step 4: Candidate Evaluation (Fresh BASELINE seeds)
```bash
node arena/ArenaCLI.js \
  --range BASELINE_S02 \
  --policy NEW_POLICY \
  --baseline AI_v0.0_RANDOM \
  > arena/results/candidate_NEW_vs_v0.0.json
```
- Test against frozen baseline
- Different seed range than self-play
- One-time seed use

---

### Step 5: Freeze & Tag (If Promotion Criteria Met)

```bash
# Commit and tag
git add .
git commit -m "AI_vX.Y_NEW baseline"
git tag AI_vX.Y_NEW
git push origin main
git push origin AI_vX.Y_NEW
```

---

### Step 6: Update Documentation

**File:** `arena/BASELINE.md`

```markdown
## AI_vX.Y_NEW

- **Git tag:** AI_vX.Y_NEW
- **Date:** 2026-01-XX
- **Self-Play:** arena/results/baseline_NEW.json (BASELINE_S01)
- **Vs v0.0:** arena/results/candidate_NEW_vs_v0.0.json (BASELINE_S02)

### Description
Brief description of the policy's strategy.

### Results
- Self-play win rate: ~50%
- Vs AI_v0.0_RANDOM: 72.3%
- Average turns: 847
```

**File:** `arena/BaselineRegistry.js`

```javascript
import { NewPolicy } from '../ai_system/decision/NewPolicy.js';

// Inside _initializeBaselines():
this.register({
    id: 'AI_vX.Y_NEW',
    gitTag: 'AI_vX.Y_NEW',
    date: '2026-01-XX',
    description: 'Brief description',
    createPolicy: () => new NewPolicy()
});
```

---

## Troubleshooting

### Issue: 0 vs 0 Wins Recorded

**Symptom:** Games complete but both players show 0 wins

**Cause:** winnerId mapping failure (FIXED in GameRunner.js)

**Verify Fix:**
```bash
node arena/ArenaCLI.js --range DEV --policy VOID_OBJECTIVE --baseline AI_v0.0_RANDOM
# Should show: playerA wins = 5, playerB wins = 0
```

---

### Issue: Determinism Failure

**Symptom:** Re-run produces different results

**Causes:**
1. `Math.random()` used somewhere
2. Time-based logic
3. Non-seeded randomness

**Debug:**
1. Check all RNG calls use `context.rng.nextInt()` or `context.rng.nextFloat()`
2. Verify no `Math.random()` in codebase
3. Ensure game state restoration is byte-perfect

---

### Issue: Unexpected Win Rates

**Symptom:** Results don't match expectations

**Checklist:**
1. Are correct policies being used? (`--list-policies` to verify)
2. Is determinism passing?
3. Are seeds fresh (not contaminated)?
4. Check player IDs in JSON output

**Debug:**
```bash
# Verify policies are different
node arena/ArenaCLI.js --range DEV --policy A --baseline B

# Check JSON output
cat arena/results/test.json | jq '.results.wins'
```

---

### Issue: Games Never Terminate

**Symptom:** Hits 5000-turn limit frequently

**Expected Behavior:**
- RANDOM vs RANDOM: ~11% draws with extremely high turn count (documented in baseline)
- VOID_OBJECTIVE vs RANDOM: <1% draws
- VOID_OBJECTIVE vs VOID_OBJECTIVE: ~0.3% draws

**If excessive draws:**
1. Policy has no goal awareness
2. Defensive policy with no progress metric
3. Stalemate scenario

---

### Issue: Baseline Seed Confusion

**Symptom:** Not sure which seed range to use

**Decision Tree:**
```
Are you developing/debugging?
  → Use DEV (-10 to -5)

Is this a pre-baseline sanity check?
  → Use SANITY (0 to 14)

Is this an official baseline establishment?
  → Use next available BASELINE_SXX (check BASELINE.md for last used)

Did the previous baseline test FAIL?
  → Burn that seed range, use next BASELINE_SXX

Did the Arena have a BUG (crash, illegal move)?
  → You can reuse the same seed range after fixing the bug
```

---

## Output Format

### Canonical JSON Schema

```json
{
  "match_type": "CANDIDATE_VS_BASELINE" | "CANDIDATE_VS_LATEST" | "BASELINE_SELF_PLAY",
  "candidate_policy": "VOID_OBJECTIVE",
  "baseline_id": "AI_v0.0_RANDOM" | null,
  "timestamp": "2026-01-15T03:45:14.977Z",
  "seed": {
    "base": 200,
    "range": [200, 499]
  },
  "games": {
    "requested": 300,
    "completed": 300,
    "crashes": 0,
    "illegal_moves": 0,
    "draws": 1
  },
  "results": {
    "wins": {
      "playerA": 285,
      "playerB": 15
    },
    "win_rate": {
      "playerA": 0.950,
      "playerB": 0.050
    },
    "average_turns": 160.86
  },
  "determinism_check": {
    "rerun_match": true,
    "byte_identical": true
  },
  "duration_seconds": 10.2
}
```

**Key Fields:**
- `match_type`: Identifies test type
- `wins.playerA`: Candidate wins
- `wins.playerB`: Baseline wins (or opponent in self-play)
- `win_rate`: Calculated from wins excluding draws
- `determinism_check.byte_identical`: Must be `true`

---

## Best Practices

1. **Always use CLI** for official results (never browser)
2. **Never reuse baseline seeds** after heuristic changes
3. **Always run determinism check** for baselines (automatic)
4. **Archive JSON outputs** immediately after generation
5. **Tag git commits** for all baselines
6. **Update BASELINE.md** for every promotion
7. **Use DEV seeds freely** during development
8. **Burn failed baseline seeds** (document which ranges are used)
9. **Test on DEV/SANITY** before burning baseline seeds

---

## References

- **Baseline Archive:** `arena/BASELINE.md`
- **Results Directory:** `arena/results/`
- **Policy Registry:** `ai_system/decision/PolicyRegistry.js`
- **Baseline Registry:** `arena/BaselineRegistry.js`
- **Seed Ranges:** `arena/SeedManager.js`
- **Issue Log:** `arena/ISSUE_LOG.json`

---

**Last Reviewed:** January 15, 2026