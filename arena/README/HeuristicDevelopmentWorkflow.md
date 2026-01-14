# Development Workflow (Single-Stage Baseline)

## Statistical Model

Each match is a Bernoulli trial (win/loss).

Observed win rate:
p̂ = wins / games

95% confidence interval:
p̂ ± 1.96 * sqrt(p̂(1 − p̂) / N)

---

## Step 1: Develop heuristic (DEV seeds)

Used for debugging and iteration only.  
Results are not used for evaluation.

```bash
node arena/ArenaCLI.js --range DEV --version AI_vX.Y_TEST
```

---

## Step 2: Sanity check (regression guard)

Ensures basic correctness before evaluation.

```bash
node arena/ArenaCLI.js --range SANITY --version AI_vX.Y_TEST
```

**Fail immediately if:**
- Crash
- Illegal move
- Deterministic regression

---

## Step 3: Baseline Evaluation

Runs a full, statistically meaningful evaluation.

```bash
node arena/ArenaCLI.js --range BASELINE_SXX --version AI_vX.Y > arena/results/baseline_SXX.json 2>&1
```

**Games:** 300 (fresh seeds)

### Pass Condition
p̂ − 1.96 * sqrt(p̂(1 − p̂) / 300) ≥ 0.50  
(≈ p̂ ≥ 0.56)

### Fail Condition
Confidence lower bound < 0.50

---

## On FAIL

- Baseline seed batch is **burned**
- AI version is **not tagged**
- Results are discarded
- Fix heuristic
- Restart from **Step 1**
- Use the **next baseline seed batch** : Do *NOT* reuse the same baseline for future tests.

---

## On PASS

- Tag AI version (e.g. `AI_v0.2_OBJECTIVE`)
- Lock baseline seed batch forever
- Promote baseline
