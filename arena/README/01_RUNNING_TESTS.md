# Running Arena Tests

## 1. List Available Options
```bash
# List all baselines
node arena/ArenaCLI.js --list-baselines

# List all policies
node arena/ArenaCLI.js --list-policies
```

---

## 2. Development Testing (Reusable Seeds)

Quick iteration during heuristic development:
```bash
# Test on DEV seeds (3 games, seeds -10 to -8)
node arena/ArenaCLI.js --policy VOID_OBJECTIVE --range DEV
```

**Purpose:** Fast feedback, infinite reruns allowed.

---

## 3. Sanity Check (Pre-Baseline)

Validate before burning baseline seeds:
```bash
# Test on SANITY seeds (15 games, seeds 0-14)
node arena/ArenaCLI.js --policy VOID_OBJECTIVE --range SANITY
```

**Requirements:**
- Zero crashes
- Zero illegal moves
- Deterministic (rerun produces identical results)

---

## 4. Baseline Evaluation (ONE-TIME USE)

Official evaluation for promotion:
```bash
# Test candidate vs latest baseline
node arena/ArenaCLI.js --policy VOID_OBJECTIVE --baseline AI_v0.0_RANDOM --range BASELINE_S01 > arena/results/candidate_v0.1.json

# OR auto-select latest baseline
node arena/ArenaCLI.js --policy VOID_OBJECTIVE --range BASELINE_S01 > arena/results/candidate_v0.1.json
```

**Critical Rules:**
- Each BASELINE_SXX range used **exactly once**
- If test FAILS → burn those seeds, use next range
- If Arena has BUG → reusing seeds is acceptable

---

## 5. Reading Results

Results output to stdout as JSON.

**Key fields:**
```json
{
  "match_type": "CANDIDATE_VS_BASELINE",
  "results": {
    "win_rate": {
      "playerA": 0.673,  // Candidate win rate
      "playerB": 0.327   // Baseline win rate
    }
  },
  "determinism_check": {
    "byte_identical": true
  }
}
```

**Promotion Criteria:**
- Candidate win rate ≥ 0.65 (65%)
- Zero crashes
- Zero illegal moves
- Deterministic

---

## 6. Common Patterns
```bash
# Fast dev iteration
node arena/ArenaCLI.js --policy NEW_HEURISTIC --range DEV

# Pre-promotion check
node arena/ArenaCLI.js --policy NEW_HEURISTIC --range SANITY

# Official eval
node arena/ArenaCLI.js --policy NEW_HEURISTIC --range BASELINE_S01 > results.json
```