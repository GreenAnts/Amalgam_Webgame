# Amalgam AI Development Roadmap (Arena‑First)

> **Purpose:** This document is a procedural contract for building a competitive AI system using an Arena‑First methodology. It is written to be followed by AI coding agents with read‑only access and copy‑paste integration.
>
> **Primary Rule:** Intelligence is meaningless without measurement. The Arena must exist, be correct, and be trusted before any AI sophistication is added.

---

## Core Architectural Principle

**Separation of Concerns is non-negotiable**

- `game_logic` → rules, legality, state transitions
- `ai_system` → how an AI chooses a move
- `arena` → how we measure which AI is better

The Arena **lives alongside** `ai_system`, never inside it.

```
/game
	/game_logic
	/ui
	/ai_system
	/arena
		ArenaRunner.js
		GameRunner.js
		MatchRunner.js
		ResultSchemas.js
		SeedManager.js
		BASELINES.md
		README.md
```

**Onboarding Rule:**
If you are a new AI agent reading this document for the first time:
1. You are not expected to infer intent from code
2. This document overrides intuition
3. If behavior is ambiguous, prefer *minimal, literal interpretation*

The Arena must never be imported by `ai_system`.

---

## Determinism (Read This Before Coding Anything)

**Definition:**
> Same code + same inputs + same seed → same outcome. Always.

**Why this matters:**
- Without determinism, win‑rates are noise
- Self‑play becomes meaningless
- Regressions cannot be detected

**Rules:**
- All randomness must be seedable
- No `Math.random()`, `Date.now()`, or time‑based logic affecting gameplay
- Seeds must be generated and logged centrally

The Arena is responsible for enforcing determinism.

---

## Phase Structure Overview

**This document is designed for one-pass comprehension.**

An AI agent should be able to:
- Start at Phase 1.1
- Implement each file in order
- Never need additional clarification

If clarification is required, the phase definition is incomplete.

**Phases:**
- **Phase 0:** Baseline Confirmation (already complete)
- **Phase 1:** Arena Infrastructure (no intelligence)
- **Phase 2:** Baseline Evaluation (Random AI)
- **Phase 3:** Incremental Intelligence (measured)

Agents must not skip phases or reorder them.

---

# Phase 0 — Baseline Confirmation (Complete)

Acceptance criteria:
- Game runs to completion without human input
- Random AI produces legal moves
- Win conditions resolve correctly

If Phase 0 is not true, stop.

---

# Phase 1 — Arena Infrastructure (NO INTELLIGENCE)

> **Implementation Note (Critical):**
> Phase 1 Arena files are provided and maintained as **architecture-complete pseudocode skeletons**.
> These skeletons define final file boundaries, control flow, determinism rules, and ownership.
>
> Agents must:
> - Preserve all file names, module boundaries, and call order
> - Replace only pseudocode sections (e.g., RNG internals, game_logic calls)
> - Treat the pseudocode structure as authoritative
>
> Agents must NOT:
> - Re-architect Arena components
> - Merge or split modules
> - Introduce new abstractions, metrics, or intelligence
>
> Phase 1 success is measured by *faithful realization*, not creative interpretation.

> **Goal:** Build a trusted measurement system.

## Arena File Layout (Required)

```
/arena
	ArenaRunner.js
	GameRunner.js
	MatchRunner.js
	ResultSchemas.js
	SeedManager.js
	README.md
```

No additional files or folders are allowed during Phase 1.

---

## Phase 1.1 — ResultSchemas.js

**Purpose (What this file IS):**
- A pure data contract
- A shared language between Arena components
- A stability anchor for all future measurements

**Purpose (What this file is NOT):**
- Not a logger
- Not a calculator
- Not a place for derived or interpretive metrics

**Design Guidance:**
- Schemas must be small, explicit, and boring
- Fields should represent *facts*, not opinions
- If a value could reasonably change definition later, it does not belong here yet

**Conceptual Shape (Pseudocode):**
```
GameResult = {
	winnerId,
	winConditionType,
	turnCount,
	crashed,
	illegalMove,
	seed,
	aiVersionIds
}

MatchStats = {
	gamesPlayed,
	winsByAI,
	lossesByAI,
	draws,
	crashes,
	illegalMoves,
	averageTurns
}
```

**Instructions to Agent:**
- Implement this file only
- Output full file contents
- No imports except basic language utilities
- Do not add speculative fields

**Acceptance Criteria:**
- All Arena components can rely on these schemas without interpretation
- Schemas do not reference internal AI state

---

## Phase 1.2 — SeedManager.js

**Purpose (What this file IS):**
- The single source of randomness
- The enforcer of determinism

**Purpose (What this file is NOT):**
- Not a game rule engine
- Not a statistics tool

**Design Guidance:**
- All randomness must flow through this module
- Seeds should be reproducible and predictable
- Game index + base seed should fully determine outcomes

**Conceptual Shape (Pseudocode):**
```
getGameSeed(baseSeed, gameIndex) → gameSeed

createRNG(gameSeed) → rngInstance
```

**Instructions to Agent:**
- Implement this file only
- Do not use Math.random() directly elsewhere
- Provide simple, auditable logic

**Acceptance Criteria:**
- Two runs with same inputs yield identical seeds
- Arena can replay any game exactly

---

## Phase 1.3 — GameRunner.js

**Purpose (What this file IS):**
- The referee of a single game
- The authority on turn order and termination

**Purpose (What this file is NOT):**
- Not an evaluator of move quality
- Not a statistics aggregator

**Design Guidance:**
- Treat AIs as black boxes
- Fail fast on illegal moves
- Prefer clarity over cleverness

**Conceptual Flow (Pseudocode):**
```
initializeGameState(seed)
while not terminal:
	currentAI = activePlayer
	move = currentAI.selectMove(gameState)
	if illegal(move): record error, terminate
	apply move
	swap player
return GameResult
```

**Instructions to Agent:**
- Implement this file only
- Use game_logic exclusively for validation
- Do not cache state across games

**Acceptance Criteria:**
- One game always terminates
- Errors are captured, not hidden

---

## Phase 1.4 — MatchRunner.js

**Purpose (What this file IS):**
- A tournament loop
- A statistics aggregator

**Purpose (What this file is NOT):**
- Not a game executor
- Not an AI designer

**Design Guidance:**
- Fairness is mandatory (alternate starting player)
- Aggregation must match ResultSchemas exactly

**Conceptual Flow (Pseudocode):**
```
for gameIndex in N:
	seed = SeedManager.getGameSeed(baseSeed, gameIndex)
	result = GameRunner.playGame(...)
	accumulate stats
return MatchStats
```

**Instructions to Agent:**
- Implement this file only
- No game logic duplication

**Acceptance Criteria:**
- Aggregated stats are deterministic

---

## Phase 1.5 — ArenaRunner.js

**Purpose (What this file IS):**
- A thin orchestration layer
- The Arena entry point

**Purpose (What this file is NOT):**
- Not a computation engine
- Not a decision maker

**Design Guidance:**
- Minimal logic
- Explicit wiring

**Conceptual Flow (Pseudocode):**
```
configure match
invoke MatchRunner
output results
```

**Instructions to Agent:**
- Implement this file only
- No intelligence logic

**Acceptance Criteria:**
- One command can run a full match

---

# Phase 2 — Baseline Evaluation

> **Goal:** Establish a permanent reference opponent.

**Important Concept — Baselines Are Never Deleted.**

- A baseline is a *frozen AI version*
- New baselines do not replace old ones
- Strength is measured relative to *all prior baselines*

**Actions:**
- Run Random AI vs Random AI
- Record baseline statistics
- Tag as `AI_v0.0_RANDOM`
- Record the baseline in `arena/BASELINES.md`

**Archival Rule:**
- Each baseline must have:
	- A version ID (Git tag)
	- A frozen configuration snapshot
	- A reproducible seed range
	- A human-readable entry in `BASELINES.md`

`BASELINES.md` is append-only and serves as the Arena’s historical record.

---

# Phase 3 — Incremental Intelligence

> **Goal:** Improve AI strength through measured, repeatable iterations.
> This phase is where *intelligence is added*, but only under strict evaluation control.

---

## Phase 3.0 — Iteration Loop (Read Before Implementing Anything)

Every intelligence change **must** follow this loop exactly:

1. **Change ONE thing**
   - One heuristic
   - One rule
   - One search parameter

2. **Run Arena evaluation** against the *current strongest baseline*

3. **Evaluate promotion criteria** (see below)

4. **Either:**
   - Promote to new baseline (archive old)
   - OR revert the change completely

No exceptions. No intuition-based merges.

---

## Phase 3.1 — Evaluation Requirements

**Minimum match size:**
- 300 games (absolute minimum)
- 500–1000 games preferred when time allows

**Starting player fairness:**
- Starting player must alternate evenly

**Determinism requirement:**
- Same seed range must be reusable
- Results must be reproducible

---

## Phase 3.2 — Baseline Promotion Criteria

A candidate AI version qualifies as a **new baseline** if ALL conditions are met:

### Required Conditions

1. **Win Rate Threshold**
   - ≥65% win rate vs current baseline over ≥300 games
   - OR ≥60% over ≥1000 games

2. **Stability**
   - No increase in crashes
   - No increase in illegal moves

3. **Termination Health**
   - Average turn count does not explode unexpectedly

4. **Reproducibility**
   - Re-running the same match produces statistically similar results

If any condition fails, the version is rejected.

---

## Phase 3.3 — Baseline Archival (Git-Based, Safe Workflow)

**Rule:** Baselines are never modified after promotion.

### Recommended Archival Method (Git)

When a new baseline is promoted:

1. Commit the AI code
2. Tag the commit

**Example:**
```
git commit -am "AI_v0.2_OBJECTIVE_AWARE baseline"
git tag AI_v0.2_OBJECTIVE_AWARE
```

3. Record:
- Tag name
- Config values (if any)
- Seed range used for validation

This information should be logged in a simple text file or changelog.

---

## Phase 3.4 — Retrieving and Retesting Old Baselines (Safe Mode)

To test an old baseline WITHOUT disrupting current work:

### Option A — Detached HEAD (Safe for Testing)

```
git checkout AI_v0.1_CAPTURE_PREFERENCE
```

- You are now in *detached HEAD*
- You can run Arena tests safely
- DO NOT commit here

To return:
```
git checkout main
```

### Option B — Temporary Branch (If Modifications Are Needed)

```
git checkout -b test-old-baseline AI_v0.1_CAPTURE_PREFERENCE
```

Delete branch after testing:
```
git branch -D test-old-baseline
```

---

## Phase 3.5 — Baseline Chain Policy

- All baselines remain valid comparison targets
- New AIs should occasionally be tested against *older* baselines
- Regression vs older baselines is a warning sign, not an automatic failure

---

## Phase 3.6 — Regression Handling Policy

> **Problem:** A newer AI loses to an older baseline (e.g., 5 versions back).

This situation is expected in long-running AI development and must be handled deliberately.

### Key Principle

> **Baselines represent historical capabilities, not cumulative feature sets.**

A loss to an older baseline does NOT automatically invalidate the current AI.

---

### Step 1 — Classify the Regression

Determine which category applies:

1. **Benign Regression**
   - New AI still beats the *current strongest baseline*
   - Loss occurs only vs much older baselines
   - Likely indicates strategic tradeoffs

2. **Concerning Regression**
   - Win rate vs older baseline < 50%
   - Loss is consistent and reproducible
   - Suggests loss of a core capability

---

### Step 2 — Required Actions

- Record the regression in `BASELINES.md` under the newer AI entry
- Do NOT delete or modify baselines
- Do NOT immediately revert unless core capability is lost

---

### Step 3 — Investigation (If Needed)

If regression is concerning:

- Identify which capability the older baseline exploits
- Add a *new* heuristic or rule to address it
- Treat the fix as a new Phase 3 iteration

**Important:**
- Do NOT reintroduce old code blindly
- Do NOT merge baselines

---

### Step 4 — Promotion Decision

- If the AI still beats the current strongest baseline, promotion may proceed
- Regression details must be documented

This mirrors real-world engine development practices (e.g., chess engines periodically reintroducing defensive heuristics).

---

## Phase 3.7 — Common Failure Modes (Research-Backed)

These are well-documented pitfalls in game AI and self-play systems:

### 1. Overfitting to Current Opponent
- Symptom: Beats latest baseline, loses to older ones
- Seen in: Self-play RL systems
- Reference: Silver et al., *Mastering Chess and Shogi by Self-Play*, Nature 2018

### 2. Non-Deterministic Evaluation
- Symptom: Win rates fluctuate wildly
- Cause: Hidden randomness
- Reference: Tesauro, *TD-Gammon*, 1995

### 3. Metric Leakage
- Symptom: AI optimizes secondary metrics instead of winning
- Cause: Too many early metrics
- Reference: Goodhart’s Law

### 4. Premature Optimization
- Symptom: Complex AI that is weaker than simpler versions
- Reference: Knuth, *Premature Optimization*, 1974

---


## Guidance for Copy‑Paste Based AI Agents

- Implement one file per task
- Always output full file contents
- Never assume partial edits
- Never modify Arena and AI in the same step

---

## Final Warning

The Arena exists to **judge**, not to assist.

If intelligence logic appears inside the Arena, results are invalid.

If results are not reproducible, results are invalid.

> **If the Arena is correct, intelligence can grow safely.**
> **If the Arena is wrong, nothing else matters.**

