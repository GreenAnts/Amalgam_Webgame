# Arena Overview

## What is Arena?

Arena is a **deterministic evaluation framework** for measuring AI strength.

**Key Principle:** Same code + same seed → same result. Always.

## Quick Start

Test candidate vs baseline:
```bash
node arena/ArenaCLI.js --policy VOID_OBJECTIVE --range BASELINE_S01
```

## Core Concepts

1. **Baseline** = Frozen, immutable reference AI
2. **Candidate** = New policy under test
3. **Seed Range** = Isolated test data (DEV, SANITY, BASELINE_SXX)
4. **Determinism** = Same inputs → same outputs

## File Structure
```
/arena
├── ArenaCLI.js           - Command-line interface
├── BaselineRegistry.js   - Frozen baselines
├── PolicyFactory.js      - Candidate policies
├── GameRunner.js         - Single game executor
├── MatchRunner.js        - Multi-game aggregator
└── SeedManager.js        - Deterministic RNG
```

## Next Steps

- **Running tests:** Read `01_RUNNING_TESTS.md`
- **Promoting baselines:** Read `02_BASELINE_PROMOTION.md`