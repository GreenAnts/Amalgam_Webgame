# Amalgam Arena System

**Purpose:** Stable measurement tool for AI evaluation  
**Philosophy:** Arena is a TOOL, not a development target  
**Last Updated:** January 2026

---

## Quick Reference

### Self-Play (Baseline Establishment)
```bash
node arena/ArenaCLI.js --range BASELINE_S03 --policy NEW_POLICY --self-play
```

### Candidate vs Baseline
```bash
node arena/ArenaCLI.js --range BASELINE_S04 --policy NEW_POLICY --baseline AI_v0.1_VOID_OBJECTIVE
```

### Development Testing
```bash
node arena/ArenaCLI.js --range DEV --policy NEW_POLICY --self-play
```

---

## Philosophy

**Arena is a stable tool that measures AI strength.**

- ✅ Arena provides: deterministic evaluation, baseline archival, result logging
- ❌ Arena does NOT: implement AI logic, tune heuristics, manage policies

**All AI development happens in `ai_system/`**

When you add a new policy:
1. Create policy file in `ai_system/decision/`
2. Register it in `ai_system/decision/PolicyRegistry.js`
3. Done - Arena automatically sees it

When you promote a baseline:
1. Run evaluation, get good results
2. Git tag the commit
3. Update `arena/ArenaConfig.json` (add to frozen_baselines array)
4. Update `arena/BASELINE.md` (documentation)
5. Done

**You should rarely edit Arena files.**

---

## Configuration

All Arena settings are in `arena/ArenaConfig.json`:

- Game settings (max turns, etc.)
- Seed ranges
- Frozen baselines

**To change max turns:** Edit `ArenaConfig.json` → `game_settings.max_turns`  
**To add seed ranges:** Edit `ArenaConfig.json` → `seed_ranges`  
**To promote baseline:** Edit `ArenaConfig.json` → `frozen_baselines` (append new entry)

---

## Baseline Workflow

### Step 1: Development (DEV seeds)
```bash
node arena/ArenaCLI.js --range DEV --policy NEW_POLICY --self-play
```
- Iterate freely
- Test correctness
- Reusable seeds

### Step 2: Sanity Check (SANITY seeds)
```bash
node arena/ArenaCLI.js --range SANITY --policy NEW_POLICY --self-play
```
- Pre-baseline validation
- Verify no crashes/illegal moves
- Determinism check

### Step 3: Self-Play Baseline (Fresh BASELINE seeds)
```bash
node arena/ArenaCLI.js --range BASELINE_S03 --policy NEW_POLICY --self-play > arena/results/baseline_NEW.json
```
- Full statistical evaluation
- Win rate should be ~50% (balanced)
- One-time seed use

### Step 4: Candidate Evaluation (Fresh BASELINE seeds)
```bash
node arena/ArenaCLI.js --range BASELINE_S04 --policy NEW_POLICY --baseline AI_v0.1_VOID_OBJECTIVE > arena/results/candidate_NEW_vs_v0.1.json
```
- Test against frozen baseline
- Win rate ≥65% for promotion
- Different seed range than self-play

### Step 5: Promote Baseline (If Criteria Met)

**Git tag:**
```bash
git add .
git commit -m "AI_vX.Y_NEW baseline"
git tag AI_vX.Y_NEW
git push origin main
git push origin AI_vX.Y_NEW
```

**Update ArenaConfig.json:**
```json
{
  "frozen_baselines": [
    // ... existing baselines ...
    {
      "id": "AI_vX.Y_NEW",
      "policy_name": "NEW_POLICY",
      "git_tag": "AI_vX.Y_NEW",
      "date": "2026-01-XX",
      "description": "Brief description",
      "seed_range": "BASELINE_S03"
    }
  ]
}
```

**Update BASELINE.md:**
```markdown
## AI_vX.Y_NEW
- Git tag: AI_vX.Y_NEW
- Results: arena/results/baseline_NEW.json, candidate_NEW_vs_v0.1.json
- Win rate vs AI_v0.1: 72.3%
```

Done. Arena now knows about the new baseline.

---

## Architecture
```
Arena (Stable Tool)
  ├── ArenaConfig.json       ← Edit only for: baselines, seeds, game settings
  ├── ArenaCLI.js           ← Never edit (unless Arena has bugs)
  ├── ArenaRunner.js        ← Never edit
  ├── MatchRunner.js        ← Never edit
  ├── GameRunner.js         ← Never edit
  ├── GameLogicAdapter.js   ← Never edit
  ├── SeedManager.js        ← Never edit
  ├── ResultSchemas.js      ← Never edit
  ├── BaselineRegistry.js   ← Never edit (reads from ArenaConfig.json)
  └── BASELINE.md           ← Edit for documentation

AI System (Active Development)
  └── ai_system/
      ├── decision/
      │   ├── PolicyRegistry.js  ← Edit when adding policies
      │   ├── RandomPolicy.js
      │   ├── ObjectivePolicy.js
      │   └── NewPolicy.js       ← Add new policies here
      ├── evaluation/
      ├── search/
      └── ...
```

**Arena only imports from ai_system via PolicyRegistry.**

---

## Seed Ranges

Defined in `ArenaConfig.json`:

- **DEV** (-10 to -5): 5 games, reusable, fast iteration
- **SANITY** (0 to 14): 15 games, reusable, pre-baseline check
- **BASELINE_SXX** (200+): 300 games each, one-time use

**Rules:**
- Dev/Sanity: reuse freely
- Baseline: one-time use per version
- Failed baseline: burn seeds, use next range
- Arena bug: reusing seeds OK (bug ≠ heuristic change)

---

## Determinism

Same code + same seed → same result. Always.

**Enforced by:**
- Seeded RNG (SeedManager)
- No Math.random(), Date.now(), or time-based logic
- Automatic determinism check in CLI

**Player ID flow:**
```
Game: 'Player 1'/'Player 2 (AI)'
  → GameLogicAdapter: 'player1'/'player2'
  → GameRunner: Maps to Arena IDs
  → Results: 'playerA'/'playerB'
```

---

## Troubleshooting

### Wrong Win Rates
1. Check policies: `node arena/ArenaCLI.js --list-policies`
2. Verify determinism passed
3. Check JSON output for playerA/playerB wins

### Determinism Failure
1. Trace all randomness through SeedManager
2. Check for Math.random() usage
3. Verify game state restoration

### Games Too Long
- Edit `ArenaConfig.json` → `game_settings.max_turns`
- Default: 5000 turns

---

## Future-Proofing

**When you add advanced AI (alpha-beta, MCTS, neural nets):**
- Create policy in `ai_system/decision/`
- Register in `PolicyRegistry.js`
- Arena automatically supports it

**Arena doesn't care about AI complexity.**

It just calls `policy.selectMove()` and measures results.

---

## Best Practices

1. **Never edit Arena code** unless fixing Arena bugs
2. **All AI work happens in ai_system/**
3. **ArenaConfig.json is your only touchpoint** for Arena changes
4. **Always use --self-play for baseline establishment**
5. **Use fresh seed ranges for each baseline**
6. **Archive results immediately**
7. **Git tag all baselines**

---

**Arena is done. Focus on AI development.**