# Baseline Evaluation & Promotion Procedure

This document defines the **official, authoritative process** for establishing, validating, and freezing AI baselines using the Arena framework.

A **baseline** is a *frozen, reproducible reference policy* used to measure all future AI improvements under identical conditions.

Baselines are **never overwritten**.
New baselines are **promoted**, not replaced.

---

## 1. Purpose of a Baseline

Baselines exist to:

* Validate Arena determinism and orchestration
* Provide a stable statistical control
* Detect regressions over time
* Anchor progress to reproducible reference points

A baseline is **not**:

* a training target
* a continuously updated opponent
* a best-so-far leaderboard entry

It is a **measurement instrument**.

---

## 2. Core Concepts (Read Carefully)

### Determinism

Given:

* identical code
* identical configuration
* identical seed sequence

→ **the entire match history and aggregate results must be identical**

This includes:

* move sequences
* termination points
* summary statistics

---

### Reproducibility

Reproducibility means:

> Another developer or agent can independently re-run the baseline and obtain *bit-identical results*.

This requires:

* a frozen git tag
* a recorded seed policy
* a recorded execution method (CLI)

---

### Statistical Validity

Statistical validity requires:

* sufficient number of games
* enforced alternation of starting player
* seed diversity

A single seed proves **correctness**.
A seed range establishes **performance characteristics**.

---

## 3. Arena Authority Model (Critical)

| Tool          | Role                                | Authority           |
| ------------- | ----------------------------------- | ------------------- |
| Browser Arena | Debugging, visualization, intuition | ❌ Non-authoritative |
| CLI Arena     | Evaluation, baselines, archival     | ✅ Authoritative     |
| JSON Output   | Canonical record                    | ✅ Authoritative     |
| Git Tag       | Frozen baseline definition          | ✅ Authoritative     |

**Only the CLI + JSON output may be used for baseline promotion.**

---

## 4. Seed Stratification Policy

Seeds are divided into **non-overlapping sets**, each with a specific role.

### 4.1 Development Seeds (Unrestricted)

Used during heuristic iteration and debugging.

* Small fixed set
* Reused freely
* Never referenced in BASELINES.md

Example:

```
DEV_SEEDS = [1, 2, 3]
```

These may be run:

* individually
* together
* repeatedly

---

### 4.2 Sanity Seeds (Architecture Check)

Used to confirm system stability before formal evaluation.

* Small range
* Deterministic
* Confirms no crashes or illegal moves

Example:

```
SANITY_SEEDS = 10–19
```

---

### 4.3 Baseline Evaluation Seeds (One-Time Use)

Used **exactly once** to evaluate a candidate baseline.

* Never reused for another baseline
* Never reused after heuristic changes
* Results are archived and frozen

Example:

```
BASELINE_V1_SEEDS = 300–799   (500 games)
BASELINE_V2_SEEDS = 800–1299
```

This is analogous to an **exam**:

* You may practice freely
* You may debug freely
* You only submit once

---

## 5. Step 1 — Development & Sanity Validation

**Goal:** Verify correctness before statistical evaluation.

### Parameters

* **Games:** 10–100
* **Seeds:** DEV or SANITY seeds
* **Opponent:** Self-play
* **Environment:** Browser or CLI

### Expected Outcomes

* No crashes
* No illegal moves
* All games terminate
* Results repeat exactly under same seed

Failures here indicate **architecture bugs**, not AI weakness.

---

## 6. Step 2 — Full Baseline Evaluation (Authoritative)

**Goal:** Measure performance characteristics under controlled conditions.

### Required Parameters

| Parameter       | Requirement               |
| --------------- | ------------------------- |
| Games           | ≥ 300 (minimum)           |
| Recommended     | 500–1000                  |
| Seeds           | Sequential, unused range  |
| Starting Player | Deterministic alternation |
| Execution       | CLI only                  |
| Time            | No wall-clock logic       |

---

### Execution (CLI — REQUIRED)

```bash
mkdir -p arena/results

node arena/ArenaCLI.js \
	--games 500 \
	--seed-start 300 \
	--seed-count 500 \
	> arena/results/AI_v0.0_RANDOM_2026-01-11.json
```

**stdout**

* Canonical JSON schema
* Machine-readable
* Authoritative record

**stderr**

* Human-readable summary
* Informational only

Browser runs **may not** be used for baseline promotion.

---

## 7. Step 3 — Acceptance Criteria (Promotion Gate)

A baseline candidate **must satisfy all conditions**:

### 7.1 Determinism

* Identical seeds → identical results
* Re-run yields bit-identical JSON

---

### 7.2 Statistical Expectations (Random vs Random)

| Games | Acceptable Win Rate |
| ----- | ------------------- |
| 300   | 45% – 55%           |
| 500   | 46% – 54%           |
| 1000  | 47% – 53%           |

Out-of-range results indicate:

* starting-player bias
* rules asymmetry
* hidden non-determinism

---

### 7.3 Stability

* Crashes: **0**
* Illegal moves: **0**
* Infinite games: **0**

---

## 8. Step 4 — Baseline Freeze (MANDATORY)

Once accepted, the baseline becomes immutable.

---

### 8.1 Git Tag (Source of Truth)

```bash
git add .
git commit -m "AI_v0.0_RANDOM baseline (random legal policy)"
git tag AI_v0.0_RANDOM
```

**The git tag *is* the baseline.**

---

### 8.2 Archive Results

The JSON output is the **authoritative artifact**.

```bash
arena/results/AI_v0.0_RANDOM_2026-01-11.json
```

---

### 8.3 BASELINES.md Entry (Append-Only)

```markdown
## AI_v0.0_RANDOM

- Git tag: AI_v0.0_RANDOM
- Date: 2026-01-11
- Seed range: 300–799
- Games: 500

### Description
Uniform random legal policy.
No heuristics, no search, no objectives.

### Validation Record
arena/results/AI_v0.0_RANDOM_2026-01-11.json

### Summary
- Win rate: ~50%
- Crashes: 0
- Illegal moves: 0
- Avg turns: XX.X
- Deterministic: YES

### Promotion Rationale
Foundational statistical control.
Validates Arena determinism and evaluation integrity.
```

---

## 9. Step 5 — Freeze Verification

```bash
git checkout AI_v0.0_RANDOM
node arena/ArenaCLI.js --games 20 --seed-start 300
git checkout main
```

Results must match **exactly**.

Mismatch = invalid baseline.

---

## 10. Regression Policy

* Baselines are never deleted
* New candidates must beat:

  * the most recent baseline
  * at least one older baseline periodically
* Results are always recorded, never overwritten

This prevents:

* silent regressions
* overfitting
* architectural decay

---

## 11. Development Rules (Non-Negotiable)

* Adjust heuristics **only on DEV seeds**
* Never re-run a baseline seed range after changes
* Never promote from browser output
* Never overwrite a baseline record

---

## Final Principle

> **Baselines are expensive to create and cheap to reuse.**

That asymmetry is intentional.

It is what gives your AI development:

* scientific credibility
* long-term stability
* clear progress tracking

