## AI_v0.0_RANDOM

- **Git tag:** AI_v0.0_RANDOM
- **Date:** <2026-01-11>
- **Theme:** Uniform random legal play

### Description

This baseline represents the lowest-skill reference AI.
It selects uniformly random legal actions with no heuristics,
no search, and no objective awareness.

This baseline exists purely as a control opponent and
to validate Arena determinism and evaluation infrastructure.

---

### Configuration Snapshot

None

---

### Validation Results

- **Opponent:** AI_v0.0_RANDOM (self-play)
- **Games:** 500
- **Win rate:** ~50%
- **Seed range:** <START_SEED>–<END_SEED>
- **Starting player alternation:** Yes

---

### Known Strengths

- Fully deterministic under seeded execution
- Covers full legal move space
- Serves as a stable statistical control

---

### Known Weaknesses

- No strategic planning
- No objective awareness
- No tactical reasoning
- Extremely exploitable by any informed policy

---

### Regression Notes

None  
(This is the initial baseline and cannot regress.)

---

### Promotion Rationale

Promoted as the foundational control baseline.
All future AI versions must demonstrate measurable improvement
against this baseline to justify advancement.

This baseline validates:
- Deterministic execution
- Arena orchestration correctness
- Result reproducibility
- Baseline archival process

---