# Running Arena Tests

## Quick Commands

### List Resources
```bash
# List anchors (runnable references)
node arena/ArenaCLI.js --list-anchors

# List policies
node arena/ArenaCLI.js --list-policies
```

---

## 1. Development Testing (DEV Seeds)

**Purpose**: Fast iteration during policy development
```bash
node arena/ArenaCLI.js --policy YOUR_POLICY --range DEV
```

**Characteristics**:
- 5 games (seeds -10 to -5)
- Reusable unlimited times
- Non-authoritative (debugging only)

**What to check**:
- No crashes
- No illegal moves
- Behavior looks correct

---

## 2. Sanity Check (SANITY Seeds)

**Purpose**: Pre-baseline validation
```bash
node arena/ArenaCLI.js --policy YOUR_POLICY --range SANITY
```

**Characteristics**:
- 15 games (seeds 0-14)
- Reusable for pre-checks
- Semi-authoritative

**Pass criteria**:
- ✅ Zero crashes
- ✅ Zero illegal moves
- ✅ Deterministic (rerun gives same results)

**If FAIL**: Fix bugs, return to development

---

## 3. Anchor Validation (REQUIRED BEFORE EVALUATION)

**Purpose**: Verify anchor hasn't drifted
```bash
node arena/validateAnchorStability.js ANCHOR_VOID_OBJECTIVE
```

**When to run**:
- Before each baseline evaluation campaign
- After any changes to anchor policy code
- After any changes to GameLogic
- After any Arena infrastructure changes

**Pass criteria**:
- ✅ Win rate within tolerance
- ✅ Zero crashes
- ✅ Zero illegal moves

**If FAIL**: Investigate drift, potentially retire anchor

---

## 4. Baseline Evaluation (ONE-TIME USE)

**Purpose**: Official evaluation for promotion
```bash
# Auto-select primary anchor
node arena/ArenaCLI.js --policy YOUR_POLICY --range BASELINE_S02 > arena/results/candidate_v0.2.json

# Specify anchor explicitly
node arena/ArenaCLI.js --policy YOUR_POLICY --baseline ANCHOR_VOID_OBJECTIVE --range BASELINE_S02 > arena/results/candidate_v0.2.json
```

**Characteristics**:
- 300 games per range
- ONE-TIME USE (seeds burned after use)
- Fully authoritative

**Pass criteria for promotion**:
- ✅ Win rate ≥ 65% vs anchor
- ✅ Zero crashes
- ✅ Zero illegal moves
- ✅ Deterministic
- ✅ Reasonable average turn count

**If FAIL**:
- Seed range is BURNED
- Use next unlocked range
- Fix policy, restart from development

**IMPORTANT**: Arena bugs allow seed reuse, policy changes do NOT

---

## 5. Reading Results

Results output to stdout as JSON:
```json
{
  "match_type": "evaluation",
  "candidate": {
    "version_id": "AI_CANDIDATE_YOUR_POLICY",
    "policy": "YOUR_POLICY",
    "wins": 219,
    "win_rate": 0.73
  },
  "baseline": {
    "version_id": "ANCHOR_VOID_OBJECTIVE",
    "policy": "VOID_OBJECTIVE",
    "wins": 81,
    "win_rate": 0.27
  },
  "games": {
    "completed": 300,
    "crashes": 0,
    "illegal_moves": 0
  },
  "determinism_check": {
    "byte_identical": true
  }
}
```

**Key fields**:
- `candidate.win_rate`: Must be ≥0.65 for promotion
- `games.crashes`: Must be 0
- `games.illegal_moves`: Must be 0
- `determinism_check.byte_identical`: Must be true

---

## Common Patterns
```bash
# Fast dev iteration
node arena/ArenaCLI.js --policy NEW_HEURISTIC --range DEV

# Pre-promotion sanity check
node arena/ArenaCLI.js --policy NEW_HEURISTIC --range SANITY

# Validate anchor before official run
node arena/validateAnchorStability.js ANCHOR_VOID_OBJECTIVE

# Official evaluation
node arena/ArenaCLI.js --policy NEW_HEURISTIC --range BASELINE_S02 > results.json
```

---

## Seed Range Management

### Unlocked Ranges (Available)
- DEV: Unlimited reuse
- SANITY: Unlimited reuse
- BASELINE_S02, S03, S04, ...: One-time use each

### Locked Ranges (Used)
- BASELINE_v0_0: AI_v0.0_RANDOM
- BASELINE_S01: AI_v0.1_VOID_OBJECTIVE

**Rule**: Once locked, NEVER reuse (except for Arena bug fixes)

Check available ranges:
```bash
# View ArenaConfig.json seed_ranges section
# Look for "locked": false
```