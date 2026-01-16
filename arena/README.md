# Amalgam Arena System

**Version**: 1.0.0 (Finalized)  
**Status**: FROZEN - modifications require exceptional justification  
**Last Updated**: January 2026

---

## Quick Reference

### List Available Resources
```bash
# List active anchors (runnable references)
node arena/ArenaCLI.js --list-anchors

# List available policies
node arena/ArenaCLI.js --list-policies

# List seed ranges
node arena/SeedManager.js --list
```

### Validate Anchor Before Use
```bash
# REQUIRED before using anchor for evaluation
node arena/validateAnchorStability.js ANCHOR_VOID_OBJECTIVE
```

### Run Tests
```bash
# Development iteration (reusable seeds)
node arena/ArenaCLI.js --policy YOUR_POLICY --range DEV

# Candidate vs Primary Anchor (auto-selects ANCHOR_VOID_OBJECTIVE)
node arena/ArenaCLI.js --policy YOUR_POLICY --range BASELINE_S02 > results.json

# Candidate vs Specific Anchor
node arena/ArenaCLI.js --policy YOUR_POLICY --baseline ANCHOR_VOID_OBJECTIVE --range BASELINE_S02 > results.json
```

---

## Core Concepts

### What is Arena?

Arena is a **deterministic evaluation framework** for measuring AI policy strength through controlled matches.

**Key Properties:**
- ✅ Deterministic (same seed → same result)
- ✅ Statistically valid (independent seed ranges)
- ✅ Forward compatible (versioned result schema)
- ✅ Strength validated (anchor drift detection)

**Arena is a TOOL, not a development target.**

---

### Historical Baselines vs Anchors

**This is the most critical distinction to understand.**

#### Historical Baselines (Archive Only)

**Definition**: Frozen snapshot = Git tag + seed range + archived results

**Purpose**: Historical ground truth at a specific moment in time

**Location**: 
- Metadata: `ArenaConfig.json` → `historical_archive`
- Results: `arena/results/*.json`
- Code: Git tags (e.g., `git checkout AI_v0.1_VOID_OBJECTIVE`)

**Runnable**: ❌ NO - code evolves, dependencies change, historical baselines decay

**Example**:
```json
{
  "id": "AI_v0.1_VOID_OBJECTIVE",
  "git_tag": "AI_v0.1_VOID_OBJECTIVE",
  "date": "2026-01-15",
  "results_file": "arena/results/v0.1_baseline_VOID_OBJECTIVE_vs_RANDOM.json"
}
```

**Valid Use**: "On 2026-01-15, AI_v0.1 beat AI_v0.0 at 97.7% (see results file)"

**Invalid Use**: "Let's run AI_v0.1 code today" ← Code may not work anymore

---

#### Anchors (Maintained References)

**Definition**: Maintained policy implementation with frozen strength

**Purpose**: Directional comparison signal for current development

**Location**: 
- Registry: `arena/AnchorRegistry.js`
- Config: `ArenaConfig.json` → `active_anchors`
- Code: Lives in `ai_system/decision/` (maintained)

**Runnable**: ✅ YES - continuously maintained and validated

**Evolution Rules**:
- ✅ Bugfixes (must pass drift validation)
- ✅ API updates (must pass drift validation)
- ❌ Heuristic changes (forbidden)
- ❌ Search depth changes (forbidden)

**Example**:
```json
{
  "id": "ANCHOR_VOID_OBJECTIVE",
  "policy_name": "VOID_OBJECTIVE",
  "status": "primary_anchor",
  "validation_mode": "self_play",
  "expected_self_play_rate": 0.50
}
```

**Valid Use**: "Candidate XYZ beats current ANCHOR_VOID_OBJECTIVE at 73%"

**Validation Required**: Run `validateAnchorStability.js` before each evaluation campaign

---

#### Comparison Strategy

**Historical Baseline** (what happened):
- "On 2026-01-15, v0.1 achieved 97.7% vs v0.0"
- "v0.3 improved on v0.2's historical result by 12%"

**Anchor** (current strength):
- "Today, candidate XYZ beats ANCHOR_VOID_OBJECTIVE at 73%"
- "XYZ is stronger than current anchor"

**Combined Insight**:
- "XYZ beats current anchor (73%) but is weaker than what v0.1 was at promotion (97.7% vs random)"
- This is VALID because anchor strength may have drifted slightly or evaluation conditions changed

---

## Workflow

### Step 1: Development (DEV Seeds)

**Purpose**: Fast iteration, unlimited reruns
```bash
node arena/ArenaCLI.js --policy YOUR_POLICY --range DEV
```

**Seed Range**: DEV (-10 to -5, 5 games)  
**Reusable**: ✅ Yes, unlimited  
**Authority**: ❌ Non-authoritative, debugging only

**What to check**:
- No crashes
- No illegal moves
- Behavior looks reasonable

---

### Step 2: Sanity Check (SANITY Seeds)

**Purpose**: Pre-baseline validation
```bash
node arena/ArenaCLI.js --policy YOUR_POLICY --range SANITY
```

**Seed Range**: SANITY (0-14, 15 games)  
**Reusable**: ✅ Yes, for pre-checks  
**Authority**: ⚠️ Semi-authoritative

**Pass Criteria**:
- ✅ Zero crashes
- ✅ Zero illegal moves
- ✅ Deterministic (rerun gives identical results)

**If FAIL**: Fix bugs, return to Step 1

---

### Step 3: Validate Anchor (REQUIRED)

**Purpose**: Ensure anchor hasn't drifted before using it for evaluation
```bash
node arena/validateAnchorStability.js ANCHOR_VOID_OBJECTIVE
```

**Why This Matters**:
- Anchor implementations can evolve (bugfixes, API changes)
- Must verify strength hasn't changed
- Drift detection is REQUIRED before each evaluation campaign

**Pass Criteria**:
- ✅ Win rate within tolerance (±10% for self-play)
- ✅ Zero crashes
- ✅ Zero illegal moves

**If FAIL**:
- Check git diff on anchor policy
- Check recent GameLogic changes
- If drift is intentional: Retire anchor, create new one
- If drift is accidental: Revert changes

---

### Step 4: Baseline Evaluation (ONE-TIME SEEDS)

**Purpose**: Official evaluation for promotion/comparison
```bash
# Auto-select primary anchor
node arena/ArenaCLI.js --policy YOUR_POLICY --range BASELINE_S02 > arena/results/candidate_v0.2.json

# Or specify anchor explicitly
node arena/ArenaCLI.js --policy YOUR_POLICY --baseline ANCHOR_VOID_OBJECTIVE --range BASELINE_S02 > arena/results/candidate_v0.2.json
```

**Seed Range**: BASELINE_SXX (300 games each, ONE-TIME USE)  
**Reusable**: ❌ NO - use once per version  
**Authority**: ✅ Fully authoritative

**Pass Criteria for Promotion**:
- ✅ Win rate ≥ 65% vs anchor (or ≥60% over 1000 games)
- ✅ Zero crashes
- ✅ Zero illegal moves
- ✅ Deterministic (rerun gives identical results)
- ✅ Average turn count reasonable (not exploding)

**If FAIL**:
- Seed range is BURNED (never reuse)
- Fix policy, return to Step 1
- Use NEXT seed range (BASELINE_S03, etc.)

**CRITICAL**: Arena bugs allow reusing seeds, policy changes do NOT

---

### Step 5: Promote to Historical Baseline (If Passed)

**Git Tag**:
```bash
git add .
git commit -m "AI_v0.2_STRATEGY_NAME baseline"
git tag AI_v0.2_STRATEGY_NAME
git push origin main
git push origin AI_v0.2_STRATEGY_NAME
```

**Update ArenaConfig.json**:
```json
// Add to historical_archive array (APPEND-ONLY)
{
  "id": "AI_v0.2_STRATEGY_NAME",
  "git_tag": "AI_v0.2_STRATEGY_NAME",
  "date": "2026-01-XX",
  "description": "Brief description of strategy",
  "seed_range": "BASELINE_S02",
  "results_file": "arena/results/candidate_v0.2.json",
  "note": "Historical snapshot - see git tag for code"
}
```

**Update BASELINE.md**:
```markdown
## AI_v0.2_STRATEGY_NAME

- **Git tag**: AI_v0.2_STRATEGY_NAME
- **Date**: 2026-01-XX
- **Results**: arena/results/candidate_v0.2.json
- **Win rate vs ANCHOR_VOID_OBJECTIVE**: 73.2%
- **Description**: Brief description of what this AI does
```

**Lock Seed Range in ArenaConfig.json**:
```json
"BASELINE_S02": {
  "start": 500,
  "count": 300,
  "locked": true,  // ← CHANGE TO TRUE
  "description": "LOCKED - AI_v0.2_STRATEGY_NAME baseline (DO NOT REUSE)"
}
```

**Done** - Historical baseline is now archived

---

### Step 6: Update Anchor (If Applicable)

**When to update anchor**:
- After 5-10 promotions using same anchor
- When anchor becomes too weak (candidates easily beating it at 90%+)
- When entering new development regime (e.g., from heuristics to search)

**How to update anchor**:

1. **Implement new anchor policy** in `ai_system/decision/`
2. **Register in PolicyRegistry** (`ai_system/decision/PolicyRegistry.js`)
3. **Self-play validation** (should be ~50% win rate):
```bash
   node arena/ArenaCLI.js --policy NEW_ANCHOR --range SANITY
```
4. **Vs primary anchor** (should beat by ≥15%):
```bash
   node arena/ArenaCLI.js --policy NEW_ANCHOR --baseline ANCHOR_VOID_OBJECTIVE --range BASELINE_SXX
```
5. **Add to ArenaConfig.json** `active_anchors`:
```json
   {
     "id": "ANCHOR_NEW_NAME",
     "policy_name": "NEW_POLICY",
     "status": "primary_anchor",
     "validation_mode": "self_play",
     "expected_self_play_rate": 0.50,
     "drift_tolerance": 0.10,
     "validation_seed_base": <use validation run seed>,
     "validation_game_count": 50
   }
```
6. **Run validation** to establish baseline:
```bash
   node arena/validateAnchorStability.js ANCHOR_NEW_NAME
```
7. **Retire old anchor** (change status to `"retired"`, keep in registry):
```json
   {
     "id": "ANCHOR_VOID_OBJECTIVE",
     "status": "retired",  // ← CHANGE
     // ... keep all other fields ...
   }
```

---

## Configuration (ArenaConfig.json)

All Arena settings are centralized in `arena/ArenaConfig.json`:

### Game Settings
```json
"game_settings": {
  "max_turns": 5000,  // DO NOT CHANGE (breaks historical comparisons)
  "default_starting_player_alternation": true
}
```

### Seed Ranges
```json
"seed_ranges": {
  "DEV": { "start": -10, "count": 5, "locked": false },
  "SANITY": { "start": 0, "count": 15, "locked": false },
  "BASELINE_S02": { "start": 500, "count": 300, "locked": false }
}
```

**When to lock**: After using for official baseline evaluation

### Historical Archive (Append-Only)
```json
"historical_archive": [
  {
    "id": "AI_v0.1_VOID_OBJECTIVE",
    "git_tag": "AI_v0.1_VOID_OBJECTIVE",
    "date": "2026-01-15",
    "results_file": "arena/results/v0.1_baseline.json"
  }
]
```

**Never delete entries** - archive is append-only

### Active Anchors (Mutable)
```json
"active_anchors": [
  {
    "id": "ANCHOR_VOID_OBJECTIVE",
    "policy_name": "VOID_OBJECTIVE",
    "status": "primary_anchor",
    "validation_mode": "self_play",
    "expected_self_play_rate": 0.50,
    "drift_tolerance": 0.10
  }
]
```

**Can update**: Status (active→retired), validation params (after re-validation)  
**Cannot update**: Policy name (would change strength)

---

## Architecture
```
Arena (Measurement Tool - FROZEN)
  ├── ArenaConfig.json          ← Single source of truth
  ├── ArenaCLI.js               ← Command-line interface
  ├── AnchorRegistry.js         ← Manages runnable anchors
  ├── HistoricalRegistry.js     ← Read-only historical archive
  ├── validateAnchorStability.js ← Drift detection (REQUIRED)
  ├── ArenaRunner.js            ← Match orchestration
  ├── MatchRunner.js            ← Multi-game aggregation
  ├── GameRunner.js             ← Single game execution
  ├── GameLogicAdapter.js       ← Game interface
  ├── SeedManager.js            ← Deterministic RNG
  ├── ResultSchemas.js          ← Result data contracts
  └── BASELINE.md               ← Historical archive documentation

AI System (Active Development)
  └── ai_system/
      ├── decision/
      │   ├── PolicyRegistry.js  ← Register new policies here
      │   ├── RandomPolicy.js
      │   ├── ObjectivePolicy.js
      │   └── YourNewPolicy.js   ← Add new policies here
      └── ...
```

**Separation**: Arena imports from ai_system via PolicyRegistry only  
**Coupling**: Acceptable if PolicyRegistry.createPolicy() remains stable

---

## Determinism

**Rule**: Same code + same seed → same result. Always.

**Enforced by**:
- All RNG through SeedManager
- No Math.random(), Date.now(), or time-based logic
- Starting player alternates deterministically
- Automatic determinism check in CLI

**If determinism breaks**:
1. Check for Math.random() or Date.now() usage
2. Check for any async/await race conditions
3. Check for external state (filesystem, network)
4. Run: `node arena/validateAnchorStability.js <anchor>` to detect

---

## Result Schema

**Version**: 1.0.0 (versioned for forward compatibility)

### Game Result
```json
{
  "schema_version": "1.0.0",
  "winnerId": "playerA",
  "winConditionType": "VOID_REACHED_GOAL",
  "turnCount": 247,
  "crashed": false,
  "illegalMove": false,
  "seed": 200,
  "aiVersionIds": {
    "playerA": "AI_v0.2",
    "playerB": "ANCHOR_VOID_OBJECTIVE"
  }
}
```

### Match Stats
```json
{
  "schema_version": "1.0.0",
  "gamesPlayed": 300,
  "winsByAI": {
    "playerA": 219,
    "playerB": 81
  },
  "draws": 0,
  "crashes": 0,
  "illegalMoves": 0,
  "averageTurns": 247.3
}
```

**Adding fields**: Allowed if optional and version bumped  
**Changing fields**: Forbidden (breaks old result parsing)

---

## Troubleshooting

### "Seed range is LOCKED"
**Cause**: Trying to reuse a seed range marked as locked  
**Solution**: Use next unlocked range (check ArenaConfig.json)

### "Anchor has drifted"
**Cause**: Anchor strength changed beyond tolerance  
**Diagnosis**: Run `git diff` on anchor policy, check recent GameLogic changes  
**Solution**: If intentional, retire anchor and create new one; if accidental, revert

### "Determinism check FAILED"
**Cause**: Results differ between runs with same seed  
**Diagnosis**: Check for Math.random(), Date.now(), race conditions  
**Solution**: Fix non-deterministic code, re-validate

### "Win rate seems too low/high"
**Check**: Are you comparing to the right anchor?  
**Check**: Did anchor drift? Run validation  
**Check**: Is policy implementation correct?

---

## Post-Finalization Policy

**Status**: FROZEN  

**Allowed changes**:
- Critical security fixes (RNG vulnerability, data leakage)
- Platform breakage fixes (Node.js incompatibility)

**Forbidden changes**:
- Changing seed ranges or locking status
- Modifying result schema (except adding optional fields with version bump)
- Changing turn limit
- Altering player alternation logic
- Adding AI knowledge to Arena
- Modifying anchors without validation

**Change process**:
1. Document justification in FINALIZATION_LOG.json
2. Validate all anchors pass drift detection
3. Archive old results
4. Run full validation suite
5. Update schema version if applicable

---

## Best Practices

1. **Always validate anchors** before evaluation campaigns
2. **Never reuse locked seed ranges** (except DEV/SANITY)
3. **Archive results immediately** after official runs
4. **Git tag all historical baselines** with clear names
5. **Update ArenaConfig.json** when locking ranges or promoting baselines
6. **Document in BASELINE.md** for historical record
7. **Check determinism** on every official run

---

## Additional Resources

- **Promotion procedure**: See `arena/README/02_BASELINE_PROMOTION.md`
- **Running tests**: See `arena/README/01_RUNNING_TESTS.md`
- **Finalization log**: See `arena/FINALIZATION_LOG.json`
- **Historical archive**: See `arena/BASELINE.md`

---

**Arena is finalized. Focus on AI development.** 🔒