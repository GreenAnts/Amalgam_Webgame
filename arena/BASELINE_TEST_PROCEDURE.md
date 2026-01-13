# Baseline Evaluation & Promotion Procedure

This document defines the official process for establishing, validating, and freezing an AI baseline using the Arena framework.

A baseline is a frozen, reproducible reference opponent used to measure all future AI improvements.

---

## 1. Purpose of the Baseline

The baseline exists to:

- Validate Arena determinism and orchestration
- Provide a statistical control opponent
- Prevent performance regression
- Anchor future improvements to a known reference

**⚠️ A baseline is not replaced.**  
New baselines are promoted, not overwritten.

---

## 2. Definitions (Important)

### Determinism

Given:
- identical code
- identical configuration
- identical seeds

→ results must be bitwise identical.

### Statistical Validity

Given:
- sufficient sample size
- proper alternation of starting player

→ observed win rate must fall within expected confidence bounds.

### Reproducibility (NOT redundant)

Reproducibility means another developer or agent can reproduce the exact same results later.

This requires:
- frozen code (git tag)
- recorded config
- recorded seed policy

---

## 3. Prerequisites

Before running baseline evaluation:

- ✅ Arena framework (Phase 1) is complete
- ✅ All randomness flows through SeedManager
- ✅ No use of `Math.random()`, `Date.now()`, or wall-clock logic
- ✅ Starting player alternates deterministically
- ✅ Match termination is guaranteed

---

## 4. Step 1 — Sanity Validation (Smoke Test)

**Goal:** Verify the system works at all.

### Parameters

- **Games:** 100**
- **Opponent:** Self-play (Random vs Random)
- **Seeds:** Fixed base seed
- **Environment:** Browser or Node.js

### Expected Outcomes

- ✅ No crashes
- ✅ No illegal moves
- ✅ All games terminate
- ✅ Win rate roughly centered (~50% ±15%)
- ✅ Re-running produces identical results

**⚠️ Failure here is architectural, not statistical.**

### Execution

**⚠️ IMPORTANT:** Use CLI for authoritative results. Browser tools are for debugging only.

**Option A: CLI (Authoritative - Required)**

```bash
# Quick validation (100 games)
node arena/ArenaCLI.js --games 100

# Full baseline (500 games) - save canonical output
mkdir -p arena/results
node arena/ArenaCLI.js --games 500 > arena/results/AI_v0.0_RANDOM_$(date +%Y-%m-%d).json

# Custom seed
node arena/ArenaCLI.js --seed 12345 --games 500
```

**Output:**
- **stdout:** Canonical JSON schema (machine-readable, authoritative)
- **stderr:** Human-readable summary (informational)

**Option B: Browser (Non-Authoritative - Debugging Only)**

1. Open `arena/testBaseline.html` in your browser
2. Click "Run Quick Test (100 games)"
3. Review results (informational only - not for baseline promotion)

---

## 5. Step 2 — Full Baseline Evaluation

**Goal:** Establish statistically meaningful reference metrics.

### Standard Parameters (Industry-Reasonable)

| Parameter | Requirement |
|-----------|-------------|
| **Games** | ≥ 300 (minimum)<br>Recommended: 500–1000 |
| **Opponent** | Self-play |
| **Starting Player** | Alternated |
| **Seeds** | Sequential range |
| **Execution** | Headless Arena |
| **Time** | No wall-clock logic |

- 300 games ≈ minimum for rough confidence
- 500–1000 games ≈ stable descriptive statistics

### Execution

**⚠️ CLI is the authoritative method. Browser tools are for debugging only.**

**Option A: CLI (Authoritative - Required for Baseline Promotion)**

```bash
# Standard baseline (500 games)
mkdir -p arena/results
node arena/ArenaCLI.js --games 500 > arena/results/AI_v0.0_RANDOM_$(date +%Y-%m-%d).json

# With custom seed
node arena/ArenaCLI.js --seed 12345 --games 500 > arena/results/AI_v0.0_RANDOM_$(date +%Y-%m-%d).json

# Skip determinism check (faster, but not recommended)
node arena/ArenaCLI.js --games 500 --no-determinism-check
```

**Output:**
- **stdout:** Canonical JSON schema (machine-readable, authoritative)
- **stderr:** Human-readable summary (informational)

**Option B: Browser (Non-Authoritative - Debugging Only)**

1. Open `arena/testBaseline.html`
2. Set number of games to 500
3. Click "Run Full Baseline (500 games)"
4. Results are informational only - do not use for baseline promotion

---

## 6. Step 3 — Acceptance Criteria (Promotion Gate)

The candidate baseline must satisfy **ALL**:

### 6.1 Determinism

- Same seed → identical outcomes
- Identical move histories
- Identical aggregate metrics

### 6.2 Statistical Expectations

For Random vs Random self-play:

| Games | Acceptable Win Rate |
|-------|---------------------|
| 300   | 45% – 55%           |
| 500   | 46% – 54%           |
| 1000  | 47% – 53%           |

Deviation outside this range indicates:
- starting player bias
- rules asymmetry
- hidden non-determinism

### 6.3 Stability

- ✅ 0 crashes
- ✅ 0 illegal moves
- ✅ 0 infinite games

---

## 7. Step 4 — Baseline Archival (MANDATORY)

Once accepted, the baseline is frozen.

### 7.1 Git Tag (Authoritative Freeze)

```bash
git add .
git commit -m "AI_v0.0_RANDOM baseline (random legal policy)"
git tag AI_v0.0_RANDOM
```

**The tag is the actual baseline.**  
Documentation references it — not vice versa.

### 7.2 Archive Results

Save the canonical JSON output:

```bash
# Create results directory
mkdir -p arena/results

# Run baseline and save output
node arena/runBaseline.js --games 500 > arena/results/AI_v0.0_RANDOM_2026-01-11.json
```

The JSON file is the **authoritative record**. BASELINES.md references it.

### 7.3 BASELINES.md Entry

`arena/BASELINES.md` is append-only.

Each baseline is a single self-contained block.

**Template:**

```markdown
## AI_v0.0_RANDOM

- **Git tag:** AI_v0.0_RANDOM
- **Date:** YYYY-MM-DD
- **Theme:** Uniform random legal play

### Description
Lowest-skill reference AI.
Selects uniformly random legal actions.
No heuristics, no search, no objectives.

### Configuration Snapshot
- Policy: random_legal
- Heuristics: none
- Search depth: none
- RNG: seeded

### Validation Results

**Authoritative Record:** `arena/results/AI_v0.0_RANDOM_YYYY-MM-DD.json`

Summary:
- Opponent: Self-play
- Games: 500
- Win rate: ~50%
- Seed range: 12345–12844
- Starting player alternation: Yes
- Crashes: 0
- Illegal moves: 0
- Avg turns: XX.X
- Deterministic: YES

### Known Weaknesses
- No planning
- No tactics
- No objective awareness

### Regression Notes
None  
(Initial baseline.)

### Promotion Rationale
Promoted as the foundational statistical control.
Validates Arena determinism and evaluation integrity.
```

---

## 8. Step 5 — Baseline Freeze Verification

Verify the baseline is truly immutable.

```bash
git checkout AI_v0.0_RANDOM
# run a short arena match (10-20 games)
# verify results match exactly
git checkout main
```

**Results must match exactly.**

If they don't → the baseline is invalid.

---

## 9. Regression & Historical Comparison Policy

- All baselines remain accessible via git tags
- Historical baselines are never deleted
- New candidates must be tested against:
  - the most recent baseline
  - at least one older baseline periodically

This prevents:
- silent regression
- overfitting to a single opponent
- architectural decay

---

## 10. Common Failure Modes (Observed in Research & Practice)

### Starting Player Bias

- Extremely common in turn-based games
- **Mitigation:** enforced alternation

### Hidden Non-Determinism

- `Math.random()`, timestamps, object iteration order
- **Mitigation:** centralized RNG + seed logging

### False Improvement

- Win-rate increase caused by rule exploitation or bugs
- **Mitigation:** regression testing against older baselines

### Underpowered Baselines

- Baselines promoted too early
- **Mitigation:** minimum game counts and strict gates

---

## 11. Next Phase

Once the baseline is frozen:

→ **Phase 3: Incremental Intelligence**

**Rules:**
- One meaningful change per iteration
- Must beat the latest baseline statistically
- Must not regress against earlier baselines
- Must be reproducible and archived

---

## Final Note (Important)

This process is intentionally conservative.

Baselines are expensive to create but cheap to reuse.

That asymmetry is what gives your AI development:
- credibility
- stability
- long-term velocity