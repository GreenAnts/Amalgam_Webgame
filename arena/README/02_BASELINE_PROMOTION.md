# Baseline Promotion Procedure

## Overview

This procedure promotes a candidate policy to a **historical baseline** (archived snapshot).

**Important**: This does NOT update anchors. See "Anchor Update Procedure" below for that.

---

## Prerequisites

1. ✅ Policy implemented in `ai_system/decision/`
2. ✅ Policy registered in `ai_system/decision/PolicyRegistry.js`
3. ✅ Passed DEV testing
4. ✅ Passed SANITY testing
5. ✅ Anchor validation passed (`validateAnchorStability.js`)

---

## Step 1: Baseline Evaluation

Run official evaluation on fresh seed batch:
```bash
# Validate anchor first (REQUIRED)
node arena/validateAnchorStability.js ANCHOR_VOID_OBJECTIVE

# Run evaluation
node arena/ArenaCLI.js --policy YOUR_POLICY --baseline ANCHOR_VOID_OBJECTIVE --range BASELINE_S02 > arena/results/candidate_v0.2.json 2>&1
```

**Pass Criteria**:
- ✅ Candidate win rate ≥ 65%
- ✅ Zero crashes
- ✅ Zero illegal moves
- ✅ Deterministic (byte-identical on rerun)

**If FAIL**:
- BURN seed batch BASELINE_S02 (mark as locked, never reuse)
- Fix policy
- Return to development
- Use BASELINE_S03 for next attempt

**CRITICAL**: Only Arena bugs allow seed reuse. Policy changes consume seeds.

---

## Step 2: Git Tag
```bash
git add .
git commit -m "AI_v0.2_STRATEGY_NAME baseline promotion"
git tag AI_v0.2_STRATEGY_NAME
git push origin main
git push origin AI_v0.2_STRATEGY_NAME
```

**Tag naming**: `AI_v{major}.{minor}_{STRATEGY_NAME}`

---

## Step 3: Update ArenaConfig.json

### 3a: Add to historical_archive (APPEND-ONLY)
```json
{
  "historical_archive": [
    // ... existing entries ...
    {
      "id": "AI_v0.2_STRATEGY_NAME",
      "git_tag": "AI_v0.2_STRATEGY_NAME",
      "date": "2026-01-XX",
      "description": "Brief description of strategy",
      "seed_range": "BASELINE_S02",
      "results_file": "arena/results/candidate_v0.2.json",
      "note": "Historical snapshot - see git tag for code"
    }
  ]
}
```

### 3b: Lock seed range
```json
{
  "seed_ranges": {
    "BASELINE_S02": {
      "start": 500,
      "count": 300,
      "locked": true,  // ← CHANGE TO TRUE
      "description": "LOCKED - AI_v0.2_STRATEGY_NAME baseline (DO NOT REUSE)"
    }
  }
}
```

---

## Step 4: Update BASELINE.md

Append entry to `arena/BASELINE.md`:
```markdown
## AI_v0.2_STRATEGY_NAME

- **Git tag**: AI_v0.2_STRATEGY_NAME
- **Date**: 2026-01-XX
- **Validation**: arena/results/candidate_v0.2.json

### Description
Brief description of what this policy does.

### Results
- **Win rate vs ANCHOR_VOID_OBJECTIVE**: 73.2%
- **Average turns**: 247.3
- **Crashes**: 0
- **Illegal moves**: 0
- **Deterministic**: YES

### Strategy
Explanation of heuristics, search, or approach used.

### Notes
Any relevant observations or comparisons to previous baselines.
```

---

## Step 5: Verify

Checkout tag and confirm reproducibility:
```bash
git checkout AI_v0.2_STRATEGY_NAME
node arena/ArenaCLI.js --policy YOUR_POLICY --range BASELINE_S02

# Results must match original run
# (Note: This only works immediately after promotion, before code evolves)

git checkout main
```

**Expected**: Identical results (determinism verified)

---

## Anchor Update Procedure (Separate from Baseline Promotion)

**When to update anchor**:
- After 5-10 baseline promotions using same anchor
- When anchor becomes too weak (candidates easily at 90%+)
- When entering new development regime

**How to update anchor**:

### 1. Create new anchor policy
- Implement in `ai_system/decision/`
- Register in `PolicyRegistry.js`

### 2. Validate new anchor
```bash
# Self-play should be ~50%
node arena/ArenaCLI.js --policy NEW_ANCHOR --range SANITY

# Should beat current anchor by ≥15%
node arena/ArenaCLI.js --policy NEW_ANCHOR --baseline ANCHOR_VOID_OBJECTIVE --range BASELINE_SXX
```

### 3. Add to ArenaConfig.json active_anchors
```json
{
  "id": "ANCHOR_NEW_NAME",
  "policy_name": "NEW_POLICY",
  "status": "primary_anchor",
  "date_established": "2026-01-XX",
  "description": "Description of anchor",
  "competency_level": "competent",
  "validation_mode": "self_play",
  "expected_self_play_rate": 0.50,
  "drift_tolerance": 0.10,
  "validation_seed_base": <seed from validation run>,
  "validation_game_count": 50,
  "promotion_criteria": "Candidate must beat by ≥15%"
}
```

### 4. Establish validation baseline
```bash
node arena/validateAnchorStability.js ANCHOR_NEW_NAME
```

### 5. Retire old anchor

Change old anchor status to "retired":
```json
{
  "id": "ANCHOR_VOID_OBJECTIVE",
  "status": "retired",  // ← CHANGE FROM "primary_anchor"
  // ... keep all other fields ...
}
```

**Do NOT delete retired anchors** - they remain in registry for reference

---

## Notes

- **Historical baselines** are append-only archives (git tags + results)
- **Anchors** are maintained references (runnable, validated)
- Baseline promotion ≠ Anchor update
- Most promotions do NOT require anchor updates
- Anchors change every ~5-10 promotions when needed

---

## Troubleshooting

### Evaluation fails after anchor validation passes
- Check that you're using the same seed range
- Check that determinism check still passes
- Review any changes made between validation and evaluation

### Want to reuse seed range after failure
- NOT ALLOWED unless failure was due to Arena bug
- Policy changes consume seeds (intentional cost)
- Use next unlocked range

### Confused about historical vs anchor
- **Historical**: What the AI was at a specific time (git tag)
- **Anchor**: What we compare against now (maintained code)
- Example: "v0.1 historically beat v0.0 at 97.7%; today's candidate beats current v0.1 anchor at 73%"