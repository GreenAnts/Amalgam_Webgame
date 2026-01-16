# Arena Overview

## What is Arena?

Arena is a **deterministic evaluation framework** for measuring AI strength through controlled self-play matches.

**Core Purpose**: Provide stable, reproducible measurements as AI policies evolve and merge strategies.

---

## Key Principles

1. **Determinism**: Same code + same seed → same result. Always.
2. **Statistical Validity**: Independent seed ranges for each evaluation
3. **Strength Validation**: Anchors must pass drift detection before use
4. **Forward Compatibility**: Versioned result schemas
5. **Historical Integrity**: Baselines frozen as git tags, never modified

**Arena is a measurement tool, not a development target.**

---

## Quick Start

### Validate anchor before evaluation
```bash
node arena/validateAnchorStability.js ANCHOR_VOID_OBJECTIVE
```

### Test candidate policy
```bash
# Development
node arena/ArenaCLI.js --policy YOUR_POLICY --range DEV

# Official evaluation
node arena/ArenaCLI.js --policy YOUR_POLICY --range BASELINE_S02 > results.json
```

---

## Core Concepts

### Historical Baselines
- **What**: Frozen snapshot (git tag + results + seed range)
- **Purpose**: Historical ground truth
- **Runnable**: ❌ NO (code evolves)
- **Location**: Git tags, ArenaConfig.json historical_archive

### Anchors
- **What**: Maintained policy with frozen strength
- **Purpose**: Current evaluation reference
- **Runnable**: ✅ YES (continuously maintained)
- **Location**: AnchorRegistry, active_anchors in config

### Key Difference
- **Historical**: "What v0.1 was on 2026-01-15" (unchangeable)
- **Anchor**: "What we compare against today" (maintained, validated)

---

## File Structure
```
/arena
├── ArenaConfig.json              - Single source of truth
├── ArenaCLI.js                   - Command-line interface
├── AnchorRegistry.js             - Runnable anchor management
├── HistoricalRegistry.js         - Historical archive (read-only)
├── validateAnchorStability.js    - Drift detection (REQUIRED)
├── ArenaRunner.js                - Match orchestration
├── MatchRunner.js                - Multi-game aggregation
├── GameRunner.js                 - Single game execution
├── GameLogicAdapter.js           - Game interface
├── SeedManager.js                - Deterministic RNG
├── ResultSchemas.js              - Result data contracts
├── BASELINE.md                   - Historical documentation
└── FINALIZATION_LOG.json         - Complete change log
```

---

## Typical Workflow

1. **Develop policy** → DEV seeds (fast iteration)
2. **Sanity check** → SANITY seeds (pre-validation)
3. **Validate anchor** → `validateAnchorStability.js`
4. **Official evaluation** → BASELINE_SXX seeds (one-time use)
5. **Promote** → Git tag + update config + update docs

---

## Next Steps

- **Running tests**: Read `01_RUNNING_TESTS.md`
- **Promoting baselines**: Read `02_BASELINE_PROMOTION.md`
- **Complete reference**: Read `../README.md`

---

**Arena is finalized and frozen. Focus on AI development.** 🔒