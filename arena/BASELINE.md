# <font color="turquoise"> Baseline Archive </font>

This document records all promoted AI baselines in chronological order.
Baselines are **append-only** and **never modified** after promotion.
---
## <font color="green">AI_v0.1_VOID_OBJECTIVE</font>

- **Git tag:** `AI_v0.VOID_OBJECTIVE`
- **Date:** 2026-01-15
- **Theme:** Void rushes goal via standard movement, otherwise uniform random legal play

## Description

Void will utilize standard movement towards the goal, otherwise random movement same as previous baseline.

### Validation Results

- **Opponent:** AI_v0.0_RANDOM
- **Games:** 300
- **Seed range:** 200–499 (base seed 200)
- **Starting player alternation:** Yes (enforced by MatchRunner)
- **Validation record:** `arena/results/v0.1_baseline_VOID_OBJECTIVE_vs_RANDOM.json`

**Statistics:**
- Win rate: 97.7% / 2.3% (playerA / playerB)
- Draws: 0% (games hitting 5000-turn limit)
- Crashes: 0
- Illegal moves: 0
- Average turns: 159.36
- Deterministic: YES (byte-identical on re-run)

NOTE: I changed turn count from 5000 to 1000 (I think I did this after I tagged the repo - but if I am mistaken and you are trying to reevaluate against this tag, double check the turn count to be sure.) - [Sorry, I obviously don't know what the fuck I am doing]

---
---

---
---

---
---

## <font color="green"> AI_v0.0_RANDOM </font>

- **Git tag:** `AI_v0.0_RANDOM`
- **Date:** 2026-01-14
- **Theme:** Uniform random legal play

### Description

This baseline represents the lowest-skill reference AI.
It selects uniformly random legal actions with no heuristics, no search, and no objective awareness.

This baseline exists purely as a control opponent and to validate Arena determinism and evaluation infrastructure.

---

### Validation Results

- **Opponent:** AI_v0.0_RANDOM (self-play)
- **Games:** 100
- **Seed range:** 100–199 (base seed 100)
- **Starting player alternation:** Yes (enforced by MatchRunner)
- **Validation record:** `arena/results/baseline_AI_v0.0_RANDOM.json`

**Statistics:**
- Win rate: 55.1% / 44.9% (playerA / playerB)
- Draws: 11% (games hitting 5000-turn limit)
- Crashes: 0
- Illegal moves: 0
- Average turns: 3546.8
- Deterministic: YES (byte-identical on re-run)

---

### Game Characteristics

**Typical Game Flow:**
- Early game: Random movement across board (turns 1-1000)
- Mid game: Gradual piece elimination (turns 1000-2500)
- Late game: Minimal pieces remaining, slow convergence (turns 2500-4000)
- ~11% of games reach 5000-turn limit (documented as draws)

**End State Patterns:**
- Most games finish with 4-6 pieces remaining
- Portals often survive (only eliminable by Void, which is rare with random movement)
- Wins primarily occur via piece elimination, rarely via Void reaching goal
- Random movement has no concept of:
  - Advancing Void toward goal positions (0,6 or 0,-6)
  - Protecting valuable pieces (Amalgam, Void)
  - Forcing eliminations efficiently

---

### Known Strengths

- Fully deterministic under seeded execution
- Explores full legal move space uniformly
- Serves as stable statistical control
- Validates Arena infrastructure correctness

---

### Known Weaknesses

- No strategic planning
- No objective awareness (goal positions, piece value)
- No tactical reasoning (captures, threats)
- Extremely exploitable by any informed policy
- Very long average game length (3500+ turns)

---

### Regression Notes

None (initial baseline - cannot regress)

---

### Promotion Rationale

Promoted as the foundational control baseline.

**This baseline validates:**
- Deterministic execution across runs
- Arena orchestration correctness
- Result reproducibility
- Baseline archival process

**Expectations for future baselines:**
- Win rate ≥65% against AI_v0.0_RANDOM over 300+ games
- Average game length <1000 turns (demonstrate objective awareness)
- Zero crashes, zero illegal moves

All future AI versions must demonstrate measurable improvement against this baseline to justify advancement.

---