// ui/AnimationManager.js - Animation orchestration and playback system
// Manages animation queue, playback sequencing, and render integration
// Designed to be portable between current and future architectures

import { MoveAnimation, SwapAnimation, LaunchAnimation } from './Animations/PieceAnimations.js';
import { AttackAnimation, FireballAnimation, TidalwaveAnimation, SapAnimation } from './Animations/EffectAnimations.js';

/**
 * AnimationManager - Orchestrates all game animations
 * 
 * Responsibilities:
 * - Queue management (sequential animation playback)
 * - Hidden piece tracking (during animations)
 * - Render loop integration
 * - Speed control (for AI/debug)
 * 
 * @example
 * const manager = new AnimationManager(canvas, ctx, boardRenderer, pieceRenderer);
 * 
 * // Queue animations
 * manager.queueAnimation({ type: 'MOVE', from: '0,0', to: '3,4', pieceType: 'rubySquare' });
 * manager.queueAnimation({ type: 'ATTACK', attackerCoord: '3,4', eliminated: [...] });
 * 
 * // Play all queued
 * await manager.playAll();
 */
export class AnimationManager {
    /**
     * @param {HTMLCanvasElement} canvas - Game canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} boardRenderer - BoardRenderer instance (for coordinate conversion)
     * @param {Object} pieceRenderer - PieceRenderer instance (for piece rendering)
     */
    constructor(canvas, ctx, boardRenderer, pieceRenderer) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.boardRenderer = boardRenderer;
        this.pieceRenderer = pieceRenderer;
        
        // Animation queue (FIFO)
        this.queue = [];
        
        // Currently playing animation
        this.currentAnimation = null;
        
        // Hidden pieces during animation (Set of coordStr)
        // These pieces exist in gameState but shouldn't be rendered (animation renders them)
        this.hiddenPieces = new Set();
        
        // Animated piece positions (for rendering pieces in transit)
        // Map: coordStr → { x: gridX, y: gridY, piece: pieceObject }
        this.animatedPositions = new Map();
        
        // Playback state
        this.isPlayingFlag = false;
        this.lastTimestamp = 0;
        
        // Speed multiplier (1.0 = normal, 0.5 = slow, 2.0 = fast)
        this.speedMultiplier = 1.0;
        
        // Skip next animation (for instant AI moves)
        this.skipNext = false;
    }
    
    /**
     * Queue a single animation
     * @param {Object} animationData - Animation descriptor
     * @param {string} animationData.type - Animation type (MOVE, ATTACK, etc.)
     */
    queueAnimation(animationData) {
        if (!animationData || !animationData.type) {
            console.error('[AnimationManager] Invalid animation data:', animationData);
            return;
        }
        
        this.queue.push(animationData);
    }
    
    /**
     * Queue multiple animations to play in sequence
     * @param {Array<Object>} animationDataArray - Array of animation descriptors
     */
    queueSequence(animationDataArray) {
        if (!Array.isArray(animationDataArray)) {
            console.error('[AnimationManager] queueSequence requires array');
            return;
        }
        
        animationDataArray.forEach(data => this.queueAnimation(data));
    }
    
    /**
     * Clear all queued animations
     */
    clear() {
        this.queue = [];
        this.currentAnimation = null;
        this.hiddenPieces.clear();
        this.animatedPositions.clear();
        this.isPlayingFlag = false;
    }
    
    /**
     * Play next animation in queue
     * @returns {Promise<boolean>} True if animation played, false if queue empty
     */
    async playNext() {
        if (this.queue.length === 0) {
            this.isPlayingFlag = false;
            return false;
        }
        
        // Check if we should skip this animation
        if (this.skipNext) {
            this.skipNext = false;
            this.queue.shift(); // Remove from queue without playing
            return this.playNext(); // Recurse to next
        }
        
        const animData = this.queue.shift();
        this.isPlayingFlag = true;
        
        // Create animation instance
        const context = {
            canvas: this.canvas,
            ctx: this.ctx,
            boardRenderer: this.boardRenderer,
            pieceRenderer: this.pieceRenderer,
            animationManager: this // For hidden piece registration
        };
        
        this.currentAnimation = this.createAnimation(animData, context);
        
        if (!this.currentAnimation) {
            console.error('[AnimationManager] Unknown animation type:', animData.type);
            this.isPlayingFlag = false;
            return this.playNext(); // Skip to next
        }
        
        // Start animation
        this.currentAnimation.start();
        
        // Animation loop
        this.lastTimestamp = performance.now();
        
        return new Promise((resolve) => {
            const animationFrame = (timestamp) => {
                const deltaTime = (timestamp - this.lastTimestamp) * this.speedMultiplier;
                this.lastTimestamp = timestamp;
                
                // Update animation
                this.currentAnimation.update(deltaTime);
                
                // Render animation (CRITICAL FIX)
                this.currentAnimation.render();
                
                // Check if complete
                if (this.currentAnimation.isComplete()) {
                    this.currentAnimation.cleanup();
                    this.currentAnimation = null;
                    this.isPlayingFlag = false;
                    resolve(true);
                } else {
                    requestAnimationFrame(animationFrame);
                }
            };
            
            requestAnimationFrame(animationFrame);
        });
    }
    
    /**
     * Play all queued animations in sequence
     * @returns {Promise<void>}
     */
    async playAll() {
        while (this.queue.length > 0) {
            await this.playNext();
        }
        
        // Clear state after all animations complete
        this.hiddenPieces.clear();
        this.animatedPositions.clear();
        this.skipNext = false; // ✅ ADD THIS LINE
    }
    
    /**
     * Queue and immediately play a sequence
     * @param {Array<Object>} animationDataArray - Array of animation descriptors
     * @returns {Promise<void>}
     */
    async playSequence(animationDataArray) {
        this.queueSequence(animationDataArray);
        await this.playAll();
    }
    
    /**
     * Create animation instance from data
     * @private
     */
    createAnimation(data, context) {
        switch (data.type) {
            case 'MOVE':
                return new MoveAnimation(data, context);
            case 'SWAP':
                return new SwapAnimation(data, context);
            case 'LAUNCH':
                return new LaunchAnimation(data, context);
            case 'ATTACK':
                return new AttackAnimation(data, context);
            case 'FIREBALL':
                return new FireballAnimation(data, context);
            case 'TIDALWAVE':
                return new TidalwaveAnimation(data, context);
            case 'SAP':
                return new SapAnimation(data, context);
            default:
                return null;
        }
    }
    
    /**
     * Check if currently playing an animation
     * @returns {boolean}
     */
    isPlaying() {
        return this.isPlayingFlag || this.queue.length > 0;
    }
    
    /**
     * Check if a piece should be hidden during rendering
     * (Piece exists in gameState but is being animated)
     * @param {string} coordStr - Coordinate string (e.g., "3,4")
     * @returns {boolean}
     */
    isHidden(coordStr) {
        return this.hiddenPieces.has(coordStr);
    }
    
    /**
     * Register a piece as hidden during animation
     * Called by animations to prevent duplicate rendering
     * @param {string} coordStr - Coordinate string
     */
    hidePiece(coordStr) {
        this.hiddenPieces.add(coordStr);
    }
    
    /**
     * Unregister a piece from hidden state
     * @param {string} coordStr - Coordinate string
     */
    showPiece(coordStr) {
        this.hiddenPieces.delete(coordStr);
        this.animatedPositions.delete(coordStr);
    }
    
    /**
     * Set animated position for a piece in transit
     * Called by animations to provide current visual position
     * @param {string} coordStr - Original coordinate (for lookup)
     * @param {number} x - Current grid X
     * @param {number} y - Current grid Y
     * @param {Object} piece - Piece object
     */
    setAnimatedPosition(coordStr, x, y, piece) {
        this.animatedPositions.set(coordStr, { x, y, piece });
    }
    
    /**
     * Get animated position of a piece
     * @param {string} coordStr - Coordinate string
     * @returns {Object|null} { x, y, piece } or null if not animated
     */
    getAnimatedPosition(coordStr) {
        return this.animatedPositions.get(coordStr) || null;
    }
    
    /**
     * Render all active animations
     * Should be called by drawBoard() after rendering static pieces
     */
    render() {
        if (this.currentAnimation) {
            this.currentAnimation.render();
        }
        
        // Note: Piece animations handle their own rendering
        // Effect animations render particles/effects here
    }
    
    /**
     * Set playback speed multiplier
     * @param {number} multiplier - Speed multiplier (0.5 = slow, 2.0 = fast)
     */
    setSpeed(multiplier) {
        this.speedMultiplier = Math.max(0.1, Math.min(10.0, multiplier));
    }
    
    /**
     * Reset to initial state
     */
    reset() {
        this.clear();
        this.speedMultiplier = 1.0;
        this.skipNext = false;
    }
}