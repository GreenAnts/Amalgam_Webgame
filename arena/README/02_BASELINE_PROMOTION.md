# Baseline Promotion Procedure

## Step 1: Develop Heuristic

Iterate freely on DEV seeds:
```bash
node arena/ArenaCLI.js --policy YOUR_POLICY --range DEV
```

Adjust heuristic until behavior looks correct.

---

## Step 2: Sanity Check

Validate on SANITY seeds:
```bash
node arena/ArenaCLI.js --policy YOUR_POLICY --range SANITY
```

**Pass Criteria:**
- ✓ Zero crashes
- ✓ Zero illegal moves
- ✓ Deterministic

**If FAIL:** Fix bugs, repeat Step 1.

---

## Step 3: Baseline Evaluation

Run official test on fresh seed batch:
```bash
node arena/ArenaCLI.js --policy YOUR_POLICY --baseline AI_v0.0_RANDOM --range BASELINE_S01 > arena/results/candidate_v0.1.json 2>&1
```

**Pass Criteria:**
- ✓ Candidate win rate ≥ 65%
- ✓ Zero crashes
- ✓ Zero illegal moves
- ✓ Deterministic

**If FAIL:**
- BURN seed batch BASELINE_S01 (never reuse)
- Fix heuristic
- Return to Step 1
- Use BASELINE_S02 for next attempt

---

## Step 4: Freeze Baseline

### 4.1 Git Tag
```bash
git add .
git commit -m "AI_v0.1_VOID_OBJECTIVE baseline"
git tag AI_v0.1_VOID_OBJECTIVE
git push origin main
git push origin AI_v0.1_VOID_OBJECTIVE
```

---

### 4.2 Update BaselineRegistry.js

Add entry to `arena/BaselineRegistry.js`:
```javascript
// Import the policy
import { ObjectivePolicy } from '../ai_system/decision/ObjectivePolicy.js';

// Inside _initializeBaselines():
this.register({
    id: 'AI_v0.1_VOID_OBJECTIVE',
    gitTag: 'AI_v0.1_VOID_OBJECTIVE',
    date: '2026-01-15',
    description: 'Void objective-aware policy',
    createPolicy: () => new ObjectivePolicy()
});
```

---

### 4.3 Update BASELINE.md

Append entry to `arena/BASELINE.md`:
```markdown
## AI_v0.1_VOID_OBJECTIVE

- **Git tag:** AI_v0.1_VOID_OBJECTIVE
- **Date:** 2026-01-15
- **Validation:** arena/results/candidate_v0.1.json

### Description
First intelligent baseline. Moves Void toward opponent's goal.

### Results
- Win rate vs AI_v0.0_RANDOM: 67.3%
- Average turns: 847.2
- Crashes: 0
- Illegal moves: 0
```

---

## Step 5: Verify

Checkout tag and confirm reproducibility:
```bash
git checkout AI_v0.1_VOID_OBJECTIVE
node arena/ArenaCLI.js --range BASELINE_S01
# Results must match original run
git checkout main
```

---

## Notes

- Baselines are **append-only**
- Never modify frozen baselines
- Failed tests burn seed batches (intentional cost)