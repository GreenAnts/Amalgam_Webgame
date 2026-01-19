# Amalgam WebGame Refactor Planning

This directory contains comprehensive JSON files for planning the architectural refactor of the Amalgam WebGame project.

## Overview

The codebase has already undergone significant modularization following modern software engineering principles. This planning document provides architectural guidance and completion strategies for remaining implementation gaps.

## Current Architecture Status

**✅ ALREADY IMPLEMENTED:**
- **Modular Architecture**: Clear separation of concerns with Core/, Systems/, UI/, ai_system/ directories
- **Pure Functions**: Core modules with no side effects for better testability
- **Dependency Injection**: Loose coupling through proper dependency management
- **Layered Architecture**: Enforced dependency hierarchy (Core → Systems → UI)
- **Testability**: Comprehensive unit and integration tests
- **Maintainability**: Clear module boundaries and responsibilities

**🔄 PARTIALLY IMPLEMENTED:**
- **GameEngine**: Already modular but needs pure function conversion
- **GameState**: Already immutable but needs enhanced validation
- **MovementSystem**: Already well-structured with pure functions
- **UI Components**: Already separated but need stricter state access rules
- **Main.js**: Currently 1,122 lines - needs to be thinned to delegate responsibilities

**❌ REMAINING GAPS:**
- **Network Module**: Empty placeholder files need full implementation
- **Edge Functions**: Empty placeholder files need full implementation
- **Pages Module**: Page components need extraction from Main.js
- **Config Module**: Configuration centralization needed
- **Assets Organization**: Asset reorganization needed
- **Main.js Refactoring**: Break down monolithic Main.js into proper architectural modules

## Current Codebase Structure

The current codebase already demonstrates excellent architectural practices:

### Core Module (✅ Fully Implemented)
- **gameEngine.js**: Game logic orchestrator with state management
- **gameState.js**: Immutable state container with pure methods
- **gameRules.js**: Rule helpers and validation utilities

### Systems Module (✅ Fully Implemented)
- **Rules/**: Movement, attack, and ability rules (pure functions)
- **MatchHistory/**: Game state tracking and serialization

### Players Module (✅ Partially Implemented)
- **AI/**: AI player implementation (fully implemented)
- **Local/**: Local player management (needs extraction)
- **Online/**: Online player management (needs extraction)

### UI Module (✅ Partially Implemented)
- **uiController.js**: Main UI controller (needs extraction)
- **boardRenderer.js**: Board rendering and visualization
- **pieceRenderer.js**: Piece rendering and animation

### Network Module (❌ Empty Placeholders)
- **networkController.js**: Main network controller (empty)
- **Supabase/**: Supabase integration (empty files)
- **Serializers/**: Data serialization (empty files)

### Edge Functions (❌ Empty Placeholders)
- Server-side functions for Supabase (all empty files)

### Pages Module (❌ Not Implemented)
- Page-specific components need extraction from Main.js

### Config Module (❌ Not Implemented)
- Configuration centralization needed

### Assets Module (❌ Not Implemented)
- Asset reorganization needed

## Refactor Goals

Complete the remaining architectural gaps while maintaining the excellent foundation already established:

## JSON Files Structure

### 1. [architecture_blueprint.json](architecture_blueprint.json)
**Purpose**: High-level structure and module definitions
**Content**:
- Complete module structure with 8 main modules (Core, Systems, Players, UI, Network, EdgeFunctions, Pages, Config, Assets)
- Module responsibilities and dependencies
- File-by-file breakdown with line limits and export definitions
- Architectural constraints and quality assurance requirements

### 2. [migration_strategy.json](migration_strategy.json)
**Purpose**: Step-by-step migration instructions
**Content**:
- 9-phase migration plan with detailed timelines
- Phase-by-phase breakdown with validation criteria
- Rollback strategies for each phase
- Testing requirements for each phase
- Dependencies and blocking issues tracking

### 3. [interface_contracts.json](interface_contracts.json)
**Purpose**: API definitions and method signatures
**Content**:
- Complete interface definitions for all modules
- Method signatures with parameters and return types
- Data type definitions (GameState, Piece, Player)
- Error handling patterns
- Purity requirements and validation rules

### 4. [file_mapping.json](file_mapping.json)
**Purpose**: Source-to-target file mapping with transformation rules
**Content**:
- Detailed mapping of current files to new structure
- Line-by-line transformation instructions
- New file creation specifications
- Transformation guidelines and notes
- Dependency and import mapping

### 5. [validation_rules.json](validation_rules.json)
**Purpose**: Architectural constraints and validation rules
**Content**:
- Module-specific rules (Core, Systems, Players, UI, Network, etc.)
- Dependency rules and architectural constraints
- Code quality requirements (testing, linting, documentation)
- Automated validation configuration
- Manual validation checklists

## Module Structure

### Core Module
- **gameEngine.js**: Main game engine orchestrator (pure functions only)
- **gameState.js**: Immutable state container
- **gameRules.js**: Shared rule helpers and validation utilities

### Systems Module
- **Rules/**: Movement, attack, and ability rules
- **MatchHistory/**: Game state tracking and serialization

### Players Module
- **AI/**: AI player implementation
- **Local/**: Local player management
- **Online/**: Online player management
- **playerInterface.js**: Player interface definition

### UI Module
- **uiController.js**: Main UI controller
- **boardRenderer.js**: Board rendering
- **pieceRenderer.js**: Piece rendering and animation
- **Overlays/**: UI overlay components
- **Indicators/**: Visual indicators
- **Animations/**: Animation system
- **Buttons/**: Interactive button components

### Network Module
- **networkController.js**: Main network controller
- **Supabase/**: Supabase integration
- **Serializers/**: Data serialization
- **Validators/**: Data validation

### EdgeFunctions Module
- Server-side edge functions for Supabase
- Security-critical operations
- No client-side code

### Pages Module
- Page-specific components (Landing, Menu, Gameplay, etc.)
- Isolated page functionality
- Theme integration

### Config Module
- **Themes/**: Visual theming (Gameplay and Pages)
- **graphicsConfig.js**: Board/piece/indicator configuration
- **matchHistoryConfig.js**: Notation styling
- **supabaseConfig.example.js**: Supabase configuration

### Assets Module
- Static assets (images, audio, fonts)
- Optimized and organized structure

## Migration Phases

1. **Phase 1: Core Extraction** (2-3 days)
   - Extract GameEngine from Main.js
   - Extract GameState from GameLogic.js
   - Extract GameRules from existing code

2. **Phase 2: Systems Module Reorganization** (3-4 days)
   - Extract MovementRules, AttackRules, AbilityRules
   - Extract MatchHistory system
   - Reorganize existing systems

3. **Phase 3: UI Module Restructuring** (2-3 days)
   - Extract UI Controller from Main.js
   - Restructure existing UI components
   - Update Main.js to use UI module

4. **Phase 4: Players Module Creation** (2-3 days)
   - Extract PlayerInterface
   - Extract AI Player, Local Player, Online Player

5. **Phase 5: Network Module Creation** (3-4 days)
   - Implement Network module structure
   - Integrate Supabase functionality
   - Implement data serialization and validation

6. **Phase 6: Edge Functions Implementation** (2-3 days)
   - Implement server-side edge functions
   - Add security measures
   - Implement error handling

7. **Phase 7: Pages Module Creation** (2-3 days)
   - Extract page-specific components
   - Implement page isolation
   - Add theme integration

8. **Phase 8: Config Module Creation** (1-2 days)
   - Extract configuration from existing code
   - Implement theme system
   - Create configuration files

9. **Phase 9: Assets Organization** (1 day)
   - Organize static assets
   - Optimize asset sizes
   - Follow format standards

## Validation and Quality Assurance

### Automated Validation
- **ESLint**: Code quality and style enforcement
- **Prettier**: Code formatting
- **TypeScript**: Type safety and strict mode
- **Jest**: Test coverage (minimum 80%)

### Manual Validation
- Architecture compliance checklist
- Code quality verification
- Module separation validation
- Testing completeness

## Success Criteria

- **Functional Completeness**: All game features work as before
- **Architectural Compliance**: All architectural constraints are met
- **Performance**: No significant performance degradation
- **Maintainability**: Code is easier to maintain and extend
- **Testability**: Code is easier to test
- **Documentation**: All modules are properly documented

## Usage

1. **Review the architecture blueprint** to understand the target structure
2. **Follow the migration strategy** phase by phase
3. **Use interface contracts** to ensure proper API design
4. **Follow file mapping** for detailed transformation instructions
5. **Enforce validation rules** throughout the process
6. **Validate consistency** using the provided checklists

## Notes

- Each phase can be rolled back independently
- Comprehensive testing is required at each phase
- Documentation should be updated throughout the process
- Performance should be monitored during migration
- The refactor maintains backward compatibility during transition

## Estimated Timeline

**Total Duration**: 18-25 days (full-time development)
- **Week 1**: Core extraction and Systems reorganization
- **Week 2**: UI restructuring and Players module creation
- **Week 3**: Network module and Edge functions
- **Week 4**: Pages, Config, and Assets organization
- **Week 5**: Testing, validation, and final adjustments

This refactor represents a significant investment in code quality that will pay dividends in maintainability, extensibility, and developer productivity for the long-term evolution of the Amalgam WebGame project.
