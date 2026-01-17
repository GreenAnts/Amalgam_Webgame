# Simulation Infrastructure Notes

## Status
**FOUNDATION ONLY — NOT ACTIVE**

This directory contains **simulation-only infrastructure** intended for future search algorithms.
Nothing here is wired into live gameplay, Arena, or policies.

If you are reading this while implementing search: **stop and read this file first.**

---

## What Exists (This Session)

### ✅ SimulatedGameState
- Immutable snapshot of a game position
- Captures board + minimal player data
- Safe for hypothetical reasoning
- **Not used anywhere**

This class is a **photograph**, not a simulator.

---

## What Is Intentionally NOT Implemented

The absence of these features is **by design**.

### ✅ Action application (Implemented in Session 4)
`applyAction()` creates immutable child states with simulation lineage.

> Implementation: Returns frozen child state with incremented depth, parent reference, and action metadata. Does not mutate parent state.

> Note: This was implemented in Session 4. Earlier versions of this document marked it as "not implemented" but that constraint was lifted after Session 3 completion.

---

### ❌ Undo / redo
No mutation, no rollback logic.

> Why: This class is immutable. Future search will create new states instead.

---

### ❌ Search integration
`AlphaBetaSearch` does **not** use this class.

> Why: Live gameplay must remain untouched until simulation is complete and validated.

---

### ❌ Evaluator integration
Evaluators are not connected to simulation states.

> Why: Evaluation depends on stable state semantics that do not yet exist.

---

### ❌ Arena wiring
Arena does not import or reference simulation code.

> Why: Arena determinism is trusted and must not change.

---

## Hard Constraints (Do Not Violate)

### 🚫 DO NOT
- Import simulation code into Arena
- Activate alpha-beta or minimax
- Replace RandomSelector
- Infer legality or outcomes from simulation state
- Mutate simulation objects
- Add “temporary” wiring into production paths

### ✅ DO
- Treat simulation state as read-only
- Add features only in isolated future sessions
- Preserve Arena determinism at all costs
- Keep simulation code fully inert until explicitly activated

---

## Why AlphaBetaSearch Is Inactive

AlphaBetaSearch **must remain inactive** because:

1. It currently operates on live GameLogic
2. Simulation cannot yet apply actions
3. No evaluation contract exists
4. Determinism would be violated if activated early

This is **intentional**.

---

## Future Activation Plan (High-Level)

This file defines boundaries, not deadlines.

1. **Session 4** – Immutable `applyAction(action)`
2. **Session 5** – Evaluator support for simulation states
3. **Session 6** – Search activation (minimax / alpha-beta)
4. **Session 7** – Optimizations (TT, move ordering)

Each step must preserve:
- Determinism
- Arena stability
- Baseline integrity

---

## Design Principles

- **Photograph, not simulator**
- **Immutable by default**
- **No side effects**
- **Explicitly inactive**
- **AI-safe by construction**

If you feel tempted to “just wire it in”:
→ That means the foundation is working correctly.

---

## Final Warning

This code exists so that future search can be added **without rewriting the Arena**.

Premature activation will:
- Break determinism
- Invalidate baselines
- Corrupt evaluation results

Respect the boundary.

---
