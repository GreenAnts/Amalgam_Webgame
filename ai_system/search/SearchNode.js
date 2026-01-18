/**
 * SearchNode.js
 * 
 * Minimal node structure for search tree exploration.
 * 
 * This class represents a single position in search space without
 * executing any search algorithms, move generation, or evaluation.
 * 
 * Session: 6 — Search Tree Skeleton (No Search Activation)
 * 
 * @author Search Infrastructure
 * @version 0.1
 */

class SearchNode {
    /**
     * Create a search node representing a game position.
     * 
     * @param {SimulatedGameState} simulationState - Snapshot of game state
     * @param {SearchNode|null} parent - Parent node (null for root)
     * @param {Object|null} move - Action that created this node
     * @param {number} depth - Distance from root (0 = root)
     */
    constructor(simulationState, parent, move, depth) {
        this.simulationState = simulationState;
        this.parent = parent;
        this.children = [];
        this.move = move;
        this.depth = depth;
    }

    /**
     * Add a child node to this node.
     * 
     * This is the ONLY way to build the tree. It automatically
     * sets parent reference and increments depth.
     * 
     * @param {SimulatedGameState} childState - Child position
     * @param {Object} move - Action that created child
     * @returns {SearchNode} The newly created child node
     */
    addChild(childState, move) {
        const child = new SearchNode(
            childState,
            this,           // parent
            move,
            this.depth + 1  // auto-increment depth
        );
        this.children.push(child);
        return child;
    }
}

export { SearchNode };