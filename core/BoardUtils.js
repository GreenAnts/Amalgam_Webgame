// core/BoardUtils.js - Coordinate utilities and helper functions
import { GOLDEN_COORDS, GOLDEN_LINES_DICT, GOLDEN_LINES_MOVEMENT, STANDARD_COORDS } from './Constants.js';

export class BoardUtils {
    constructor() {
        this.goldenCoordsSet = new Set(GOLDEN_COORDS);
        // Create a set of all valid board coordinates
        this.allValidCoords = new Set([...GOLDEN_COORDS, ...STANDARD_COORDS]);
    }

    // Convert {x,y} to "x,y" string
    coordToString(x, y) {
        return `${x},${y}`;
    }

    // Convert "x,y" string to {x,y} object
    stringToCoord(coordStr) {
        const [x, y] = coordStr.split(',').map(Number);
        return { x, y };
    }

    // Check if a coordinate string is a valid golden intersection
    isGoldenCoordinate(coordStr) {
        return this.goldenCoordsSet.has(coordStr);
    }

    // Check if two coordinates are adjacent (horizontal, vertical, or diagonal)
    isAdjacent(coord1Str, coord2Str) {
        const coord1 = this.stringToCoord(coord1Str);
        const coord2 = this.stringToCoord(coord2Str);

        const dx = Math.abs(coord1.x - coord2.x);
        const dy = Math.abs(coord1.y - coord2.y);

        return (dx <= 1 && dy <= 1) && !(dx === 0 && dy === 0);
    }

    // Check if a move is valid along golden lines
    isValidMoveAlongGoldenLine(startCoordStr, endCoordStr) {
        const connections = GOLDEN_LINES_MOVEMENT[startCoordStr];  // Use MOVEMENT dict
        if (!connections) {
            return false;
        }
        const endCoord = this.stringToCoord(endCoordStr);
        return connections.some(c => c.x === endCoord.x && c.y === endCoord.y);
    }

    // Check if a coordinate is on the board
    isOnBoard(coordStr) {
        return this.allValidCoords.has(coordStr);
    }
}
