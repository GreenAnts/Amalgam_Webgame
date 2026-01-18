# Alpha-Beta Search Implementation Notes

## Status
**ACTIVE — Search algorithm implemented via policy**

Alpha-beta search is now functional and accessible via Arena's policy system.

---

## Architecture: Adapter Pattern

This implementation uses the **adapter pattern**:

- **AlphaBetaSearch.alphaBeta()** contains the canonical search algorithm
- **AlphaBetaPolicy** is a thin adapter (~50 lines) exposing it via Arena
- **No duplication** of search logic

### Why This Design?

- Single source of truth for search algorithm
- Policy provides Arena integration without modifying core search
- Future: Enable in trace mode by activating `search.search()`
- Follows industry patterns (Stockfish UCI, KataGo GTP)

---

## Usage
```bash
# Test via Arena (5 games, DEV range)
node arena/ArenaCLI.js --policy ALPHA_BETA --range DEV

# Compare to baseline
node arena/ArenaCLI.js --policy RANDOM --range DEV

# Determinism check
node arena/ArenaCLI.js --policy ALPHA_BETA --seed 12345 --games 1
```

---

## Current Implementation

- **Depth**: 3 (hardcoded)
- **Evaluation**: Constant 0 (no heuristics)
- **Move Ordering**: Natural order from ActionGenerator
- **Pruning**: Alpha-beta only (no transposition table)
- **Win Detection**: Not implemented (depth limit only)

---

## Performance

**Expected**:
- Slower than RANDOM (~10-30 seconds for 5 games)
- Explores ~200-500 nodes per move at depth 3
- All moves should be legal
- Deterministic (same seed → same moves)

---

## Limitations

1. **No Evaluation**: All positions scored equally (0)
   - Search explores tree but can't distinguish good/bad positions
   - May not play better than random yet

2. **Horizon Effect**: No quiescence search
   - May miss tactical sequences just beyond depth limit

3. **No Optimization**: 
   - No move ordering (explores in natural order)
   - No transposition table (re-evaluates identical positions)
   - No iterative deepening (fixed depth 3)

---

## Future Evolution

### Session 8: Evaluation & Win Detection
- Add material evaluation
- Add win condition detection in terminal nodes
- Expected improvement: Beats random consistently

### Session 9: Optimization
- Add transposition table
- Add move ordering (prioritize captures, abilities)
- Expected improvement: 2-5× faster

### Session 10: Trace Mode Integration
- Enable `AlphaBetaSearch.search()` to call `alphaBeta()`
- Remove AlphaBetaPolicy adapter (or keep for testing)
- Search becomes default AI mode

---

## Rollback

To disable:
1. Remove `'ALPHA_BETA': AlphaBetaPolicy` from `PolicyRegistry.js`
2. Delete `AlphaBetaPolicy.js`
3. Verify: `node arena/ArenaCLI.js --list-policies` (ALPHA_BETA gone)

---

## Troubleshooting

**Issue**: Crashes or illegal moves  
**Fix**: Check ActionGenerator produces legal moves from simulation state

**Issue**: Non-deterministic behavior  
**Fix**: Ensure RNG is threaded through all randomness

**Issue**: Very slow (>60 seconds for 5 games)  
**Fix**: Expected at depth 3 with no optimization; reduce depth to 2 if needed

---

**Last Updated**: January 2026  
**Session**: 7 (Alpha-Beta Implementation)  
**Next**: Session 8 (Evaluation & Win Detection)