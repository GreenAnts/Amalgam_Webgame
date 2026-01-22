// ai_system/utils/SetupBookHandler.js // Loads and manages opening book for deterministic setup phase

export class SetupBookHandler { constructor() { this.book = null; }

    async loadBook() {
        if (this.book) return this.book;

        const configPath = new URL('../config/OpeningSetups.json', import.meta.url);

        try {
            if (typeof process !== 'undefined' && process.versions && process.versions.node) {
                const fs = await import('fs/promises');
                const { fileURLToPath } = await import('url');
                const path = fileURLToPath(configPath);
                const content = await fs.readFile(path, 'utf8');
                this.book = JSON.parse(content);
            } else {
                const response = await fetch(configPath);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                this.book = await response.json();
            }
            return this.book;
        } catch (error) {
            console.error('SetupBookHandler: Failed to load opening book', error);
            this.book = this.getDefaultBook();
            return this.book;
        }
    }

    selectSetup(side, seed) {
        if (!this.book) {
            throw new Error('Book not loaded - call loadBook() first');
        }

        const setups = this.book[side];
        if (!setups) {
            throw new Error(`Invalid side: ${side}`);
        }

        const setupKeys = Object.keys(setups);
        if (setupKeys.length === 0) {
            throw new Error(`No setups found for ${side}`);
        }

        const index = Math.abs(seed) % setupKeys.length;
        const setupKey = setupKeys[index];
        
        return setups[setupKey];
    }

    /**
     * Get next gem placement based on board state
     * @param {Object} setup - Setup object from book
     * @param {Object} gameState - Current game state
     * @param {string} side - 'square' or 'circle' (or plural)
     * @returns {Object|null} {gem: 'ruby', position: '4,-8'} or null if complete
     */
    getNextPlacement(setup, gameState, side) {
        // Normalize side to singular (remove 's' if present: circles->circle)
        const targetSide = side.endsWith('s') ? side.slice(0, -1) : side;
        
        console.log(`[getNextPlacement] Called with side: ${side} (normalized: ${targetSide})`);
        
        // Count gems already placed for this player
        const gemCounts = { ruby: 0, pearl: 0, amber: 0, jade: 0 };
        
        for (const [coord, piece] of Object.entries(gameState.pieces)) {
            const pieceType = piece.type.toLowerCase();
            const pieceSide = pieceType.includes('square') ? 'square' : 'circle';
            
            // Only count our pieces
            if (pieceSide !== targetSide) continue;
            
            // Count each gem type
            for (const gemType of ['ruby', 'pearl', 'amber', 'jade']) {
                if (pieceType.includes(gemType)) {
                    gemCounts[gemType]++;
                }
            }
        }
        
        console.log('[getNextPlacement] Current counts for', targetSide, ':', gemCounts);
        
        // Total gems placed by this player
        const totalPlaced = Object.values(gemCounts).reduce((a, b) => a + b, 0);
        
        // Setup complete for this player
        if (totalPlaced >= 8) {
            console.log('[getNextPlacement] Setup complete (8 gems placed)');
            return null;
        }
        
        // Get next gem type from order
        const nextGemType = setup.order[totalPlaced];
        const positions = setup[nextGemType];
        
        // Which specific gem of this type are we placing? (0 or 1)
        const gemCount = gemCounts[nextGemType];
        
        // Safety check
        if (!positions || gemCount >= positions.length) {
            console.error(`[getNextPlacement] Error: Invalid position index for ${nextGemType}`);
            return null;
        }
        
        const result = {
            gem: nextGemType,
            position: positions[gemCount]
        };
        
        // Verify position is not already occupied
        if (gameState.pieces[result.position]) {
            console.error('[getNextPlacement] ERROR: Position already occupied!', result.position);
            // Try next position as fallback (recovery mode)
            const nextPosition = positions[gemCount + 1];
            if (nextPosition && !gameState.pieces[nextPosition]) {
                console.log('[getNextPlacement] Recovering with next position:', nextPosition);
                return { gem: nextGemType, position: nextPosition };
            }
            return null;
        }
        
        return result;
    }

    /**
     * Convert setup object to ordered placement sequence
     * Used by Arena for batch placement
     * @param {Object} setup - Setup object from book
     * @returns {Array} [{gem: 'ruby', coord: '4,-8'}, ...]
     */
    getPlacementSequence(setup) {
        const placements = [];
        const gemCounts = { ruby: 0, pearl: 0, amber: 0, jade: 0 };

        for (const gemType of setup.order) {
            const positions = setup[gemType];
            const count = gemCounts[gemType];

            if (count >= positions.length) {
                throw new Error(`Setup order requires more ${gemType} gems than defined`);
            }

            placements.push({
                gem: gemType,
                coord: positions[count]
            });

            gemCounts[gemType]++;
        }

        return placements;
    }

    getDefaultBook() {
        return {
            "circles": {
                "SETUP-001": {
                    "ruby": ["-4,8", "-4,9"],
                    "pearl": ["-1,8", "-3,8"],
                    "amber": ["-2,7", "-2,9"],
                    "jade": ["-5,7", "-5,8"],
                    "order": ["amber", "pearl", "pearl", "amber", "jade", "jade", "ruby", "ruby"]
                }
            },
            "squares": {
                "SETUP-001": {
                    "ruby": ["4,-8", "4,-9"],
                    "pearl": ["1,-8", "3,-8"],
                    "amber": ["2,-7", "2,-9"],
                    "jade": ["5,-7", "5,-8"],
                    "order": ["amber", "pearl", "pearl", "amber", "jade", "jade", "ruby", "ruby"]
                }
            }
        };
    }

}