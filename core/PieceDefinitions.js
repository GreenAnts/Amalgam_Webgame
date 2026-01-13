// core/PieceDefinitions.js - Initial piece setup and properties
import { GRID_SIZE, AMALGAM_COLORS, VOID_OUTER_COLOR, VOID_INNER_COLOR, PORTAL_OUTER_COLOR, PORTAL_INNER_COLOR } from './Constants.js';

export function initializePieces() {
    const normalPieceSize = GRID_SIZE * 0.38;
    const portalPieceSize = GRID_SIZE * 0.25;

    return {
        // Circle pieces (Player 2 / AI) - Only Amalgam, Void, and 2 Portals
        '0,6': { 
            name: 'Amalgam-Circle', 
            type: 'amalgamCircle', 
            colors: AMALGAM_COLORS, 
            size: normalPieceSize, 
            rotation: Math.PI 
        },
        '0,12': { 
            name: 'Void-Circle', 
            type: 'voidCircle', 
            outerColor: VOID_OUTER_COLOR, 
            innerColor: VOID_INNER_COLOR, 
            size: normalPieceSize 
        },
        '6,6': { 
            name: 'Portal-C1', 
            type: 'portalCircle', 
            outerColor: PORTAL_OUTER_COLOR, 
            innerColor: PORTAL_INNER_COLOR, 
            size: portalPieceSize 
        },
        '-6,6': { 
            name: 'Portal-C2', 
            type: 'portalCircle', 
            outerColor: PORTAL_OUTER_COLOR, 
            innerColor: PORTAL_INNER_COLOR, 
            size: portalPieceSize 
        },

        // Square pieces (Player 1) - Only Amalgam, Void, and 2 Portals
        '0,-6': { 
            name: 'Amalgam-Square', 
            type: 'amalgamSquare', 
            colors: AMALGAM_COLORS, 
            size: normalPieceSize, 
            rotation: Math.PI / 2 
        },
        '0,-12': { 
            name: 'Void-Square', 
            type: 'voidSquare', 
            outerColor: VOID_OUTER_COLOR, 
            innerColor: VOID_INNER_COLOR, 
            size: normalPieceSize 
        },
        '6,-6': { 
            name: 'Portal-S1', 
            type: 'portalSquare', 
            outerColor: PORTAL_OUTER_COLOR, 
            innerColor: PORTAL_INNER_COLOR, 
            size: portalPieceSize 
        },
        '-6,-6': { 
            name: 'Portal-S2', 
            type: 'portalSquare', 
            outerColor: PORTAL_OUTER_COLOR, 
            innerColor: PORTAL_INNER_COLOR, 
            size: portalPieceSize 
        }
    };
}
