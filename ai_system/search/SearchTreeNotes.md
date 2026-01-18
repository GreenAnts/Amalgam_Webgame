# Search Node Infrastructure Notes

## Status
**STRUCTURE ONLY — NO SEARCH ACTIVE**

This file introduces `SearchNode` as a minimal data structure for future search algorithms.
Nothing here executes search, generates moves, or changes gameplay behavior.

---

## What is SearchNode?

`SearchNode` represents a single position in the search space. It stores:
- A snapshot of the game state (via `SimulatedGameState`)
- Parent/child relationships for tree traversal
- The move that created this position
- Depth from the search root

It does **NOT**:
- Execute search algorithms (minimax, alpha-beta, MCTS)
- Generate legal moves
- Evaluate positions
- Determine terminal states
- Affect live gameplay or Arena behavior

---

## Why Search is Still Inactive

`SearchNode` is **infrastructure**, not intelligence. It provides the structure for Session 7 to activate search without redesigning data representations.

Currently:
- `AlphaBetaSearch.search()` still returns random moves
- No code imports or uses `SearchNode`
- Arena behavior is unchanged
- Determinism is preserved

---

## Session 7 Activation Plan

Session 7 will activate search by:
- Building search trees via `addChild()` during alpha-beta recursion
- Populating `simulationState` at each node via `applyAction()`
- Evaluating leaf nodes via `SimulationEvaluator`
- Backpropagating scores to select best move
- Adding score/terminal fields to `SearchNode` as needed

---

## Hard Constraints

### ❌ DO NOT
- Import `SearchNode` outside `ai_system/search/`
- Activate search algorithms
- Wire nodes into Arena or policies
- Generate moves or evaluate positions
- Add speculative fields (score, isTerminal) until Session 7

### ✅ DO
- Keep nodes minimal (5 fields, 2 methods)
- Use direct property access (no getters)
- Build trees explicitly via `addChild()`
- Preserve Arena determinism
- Document intended future use

---

## Design Rationale

**Why not freeze nodes?**
- `children` array must be mutable for tree building
- Other fields are implicitly immutable (not reassigned)

**Why no score field?**
- Scores are computed and returned, not stored
- Adding unused fields is premature

**Why no helper methods?**
- `node.parent === null` is clearer than `node.isRoot()`
- Direct property access is idiomatic JavaScript

**Why separate from SimulatedGameState?**
- States are board snapshots, nodes are tree structure
- Conflating them violates separation of concerns

---

**Last Updated**: January 2026  
**Next Session**: Search Activation (Session 7)