/**
 * BoundaryVisualizer.js
 * ============================================
 * DEBUG VISUALIZATION for InvisibleBoundaryEngine
 * 
 * When enabled, renders:
 * - Numbered finger nodes (0-20)
 * - Shaded zones (Green, Acceptable, Low Accuracy, Safe)
 * - Boundary lines (First: 18→6, Second: 19→7)
 * - Red line for thumb accuracy
 * - Target finger highlighting
 * 
 * Toggle with: BoundaryVisualizer.enabled = true/false
 * 
 * REQUIRES: Must be called AFTER hand landmarks are available
 */

const BoundaryVisualizer = (function() {
    'use strict';

    // =========================================
    // CONFIGURATION
    // =========================================
    
    const CONFIG = {
        enabled: false,
        
        // Node styling
        nodeRadius: 8,
        nodeFont: 'bold 10px Arial',
        nodeTextColor: '#FFFFFF',
        
        // Zone colors (with transparency)
        zones: {
            green: 'rgba(76, 175, 80, 0.35)',      // Green zone - best accuracy
            acceptable: 'rgba(33, 150, 243, 0.30)', // Blue/Acceptable zone
            low: 'rgba(255, 193, 7, 0.25)',        // Yellow/Low accuracy zone
            safe: 'rgba(100, 100, 100, 0.15)'      // Gray/Safe area (not measured)
        },
        
        // Line colors
        lines: {
            firstBoundary: '#00FF00',   // Green - First boundary (18→6)
            secondBoundary: '#00BFFF',  // Cyan - Second boundary (19→7)
            redLine: '#FF4444',         // Red - Thumb boundary
            skeleton: '#40E0D0'         // Turquoise - Normal skeleton
        },
        
        // Node colors by type
        nodes: {
            target: '#FF6B35',          // Orange - Target finger nodes
            nonTarget: '#40E0D0',       // Turquoise - Non-target nodes
            thumb: '#FFD700',           // Gold - Thumb nodes
            wrist: '#FFFFFF',           // White - Wrist
            measured: '#00FF00',        // Green - Currently being measured
            violation: '#FF0000'        // Red - Violation detected
        },
        
        // Line widths
        lineWidth: {
            boundary: 3,
            redLine: 4,
            skeleton: 2
        }
    };

    // Finger node mappings
    const NODES = {
        WRIST: 0,
        THUMB: [1, 2, 3, 4],
        INDEX: [5, 6, 7, 8],
        MIDDLE: [9, 10, 11, 12],
        RING: [13, 14, 15, 16],
        PINKY: [17, 18, 19, 20]
    };
    
    const FINGER_NAMES = ['THUMB', 'INDEX', 'MIDDLE', 'RING', 'PINKY'];
    
    // Connections for skeleton
    const CONNECTIONS = [
        // Thumb
        [0, 1], [1, 2], [2, 3], [3, 4],
        // Index
        [0, 5], [5, 6], [6, 7], [7, 8],
        // Middle
        [0, 9], [9, 10], [10, 11], [11, 12],
        // Ring
        [0, 13], [13, 14], [14, 15], [15, 16],
        // Pinky
        [0, 17], [17, 18], [18, 19], [19, 20],
        // Palm
        [5, 9], [9, 13], [13, 17]
    ];

    // =========================================
    // UTILITY FUNCTIONS
    // =========================================
    
    /**
     * Convert normalized coords to canvas coords
     */
    function toCanvas(point, canvas) {
        return {
            x: point.x * canvas.width,
            y: point.y * canvas.height
        };
    }
    
    /**
     * Get hand frame for calculations
     */
    function getHandFrame(landmarks, canvas) {
        const wrist = toCanvas(landmarks[0], canvas);
        const middleTip = toCanvas(landmarks[12], canvas);
        const indexMcp = toCanvas(landmarks[5], canvas);
        const pinkyMcp = toCanvas(landmarks[17], canvas);
        
        const handLength = Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y);
        const handWidth = Math.hypot(pinkyMcp.x - indexMcp.x, pinkyMcp.y - indexMcp.y);
        
        return { wrist, handLength, handWidth };
    }

    // =========================================
    // ZONE RENDERING
    // =========================================
    
    /**
     * Draw the shaded zones based on boundary lines
     */
    function drawZones(ctx, landmarks, canvas, targetFingers) {
        const points = landmarks.map(p => toCanvas(p, canvas));
        const frame = getHandFrame(landmarks, canvas);
        
        // Get boundary line points
        // First boundary: nodes 18 (pinky PIP) to 6 (index PIP)
        // Second boundary: nodes 19 (pinky DIP) to 7 (index DIP)
        const firstStart = points[18];
        const firstEnd = points[6];
        const secondStart = points[19];
        const secondEnd = points[7];
        
        // Extend lines beyond finger positions
        const extend = frame.handWidth * 0.5;
        
        // Calculate extended line endpoints
        const firstAngle = Math.atan2(firstEnd.y - firstStart.y, firstEnd.x - firstStart.x);
        const secondAngle = Math.atan2(secondEnd.y - secondStart.y, secondEnd.x - secondStart.x);
        
        const first = {
            start: {
                x: firstStart.x - Math.cos(firstAngle) * extend,
                y: firstStart.y - Math.sin(firstAngle) * extend
            },
            end: {
                x: firstEnd.x + Math.cos(firstAngle) * extend,
                y: firstEnd.y + Math.sin(firstAngle) * extend
            }
        };
        
        const second = {
            start: {
                x: secondStart.x - Math.cos(secondAngle) * extend,
                y: secondStart.y - Math.sin(secondAngle) * extend
            },
            end: {
                x: secondEnd.x + Math.cos(secondAngle) * extend,
                y: secondEnd.y + Math.sin(secondAngle) * extend
            }
        };
        
        // Get MCP line for low accuracy boundary
        const mcpStart = points[17]; // Pinky MCP
        const mcpEnd = points[5];    // Index MCP
        const mcpAngle = Math.atan2(mcpEnd.y - mcpStart.y, mcpEnd.x - mcpStart.x);
        
        const mcp = {
            start: {
                x: mcpStart.x - Math.cos(mcpAngle) * extend,
                y: mcpStart.y - Math.sin(mcpAngle) * extend
            },
            end: {
                x: mcpEnd.x + Math.cos(mcpAngle) * extend,
                y: mcpEnd.y + Math.sin(mcpAngle) * extend
            }
        };
        
        // Draw GREEN zone (above first boundary)
        ctx.fillStyle = CONFIG.zones.green;
        ctx.beginPath();
        ctx.moveTo(first.start.x, first.start.y);
        ctx.lineTo(first.end.x, first.end.y);
        ctx.lineTo(first.end.x, 0);
        ctx.lineTo(first.start.x, 0);
        ctx.closePath();
        ctx.fill();
        
        // Draw "0%" label in green zone
        const greenCenter = {
            x: (first.start.x + first.end.x) / 2,
            y: Math.min(first.start.y, first.end.y) - 30
        };
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('0%', greenCenter.x, Math.max(greenCenter.y, 40));
        
        // Draw ACCEPTABLE zone (between first and second boundary)
        ctx.fillStyle = CONFIG.zones.acceptable;
        ctx.beginPath();
        ctx.moveTo(first.start.x, first.start.y);
        ctx.lineTo(first.end.x, first.end.y);
        ctx.lineTo(second.end.x, second.end.y);
        ctx.lineTo(second.start.x, second.start.y);
        ctx.closePath();
        ctx.fill();
        
        // Label for acceptable zone
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('Acceptable Zone', (first.start.x + first.end.x) / 2, (first.start.y + second.start.y) / 2);
        
        // Draw LOW ACCURACY zone (between second boundary and MCP)
        ctx.fillStyle = CONFIG.zones.low;
        ctx.beginPath();
        ctx.moveTo(second.start.x, second.start.y);
        ctx.lineTo(second.end.x, second.end.y);
        ctx.lineTo(mcp.end.x, mcp.end.y);
        ctx.lineTo(mcp.start.x, mcp.start.y);
        ctx.closePath();
        ctx.fill();
        
        // Label for low accuracy zone
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 11px Arial';
        ctx.fillText('Low Accuracy Zone', (second.start.x + second.end.x) / 2, (second.start.y + mcp.start.y) / 2);
        
        // Draw SAFE zone (below MCP line)
        ctx.fillStyle = CONFIG.zones.safe;
        ctx.beginPath();
        ctx.moveTo(mcp.start.x, mcp.start.y);
        ctx.lineTo(mcp.end.x, mcp.end.y);
        ctx.lineTo(mcp.end.x, canvas.height);
        ctx.lineTo(mcp.start.x, canvas.height);
        ctx.closePath();
        ctx.fill();
        
        // Draw boundary lines
        // First boundary (GREEN threshold)
        ctx.strokeStyle = CONFIG.lines.firstBoundary;
        ctx.lineWidth = CONFIG.lineWidth.boundary;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(first.start.x, first.start.y);
        ctx.lineTo(first.end.x, first.end.y);
        ctx.stroke();
        
        // Second boundary (ACCEPTABLE threshold)
        ctx.strokeStyle = CONFIG.lines.secondBoundary;
        ctx.beginPath();
        ctx.moveTo(second.start.x, second.start.y);
        ctx.lineTo(second.end.x, second.end.y);
        ctx.stroke();
        
        ctx.setLineDash([]);
        
        return { first, second, mcp };
    }
    
    /**
     * Draw the RED LINE for thumb accuracy
     */
    function drawRedLine(ctx, landmarks, canvas) {
        const points = landmarks.map(p => toCanvas(p, canvas));
        const frame = getHandFrame(landmarks, canvas);
        
        // Red line runs vertically near the index finger
        const indexMcp = points[5];
        const wrist = points[0];
        
        // Offset the red line to the left of index
        const offset = frame.handWidth * 0.15;
        
        ctx.strokeStyle = CONFIG.lines.redLine;
        ctx.lineWidth = CONFIG.lineWidth.redLine;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(indexMcp.x - offset, wrist.y + frame.handLength * 0.1);
        ctx.lineTo(indexMcp.x - offset, indexMcp.y - frame.handLength * 0.4);
        ctx.stroke();
        
        // Label
        ctx.fillStyle = CONFIG.lines.redLine;
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('RED LINE', indexMcp.x - offset - 50, indexMcp.y - frame.handLength * 0.3);
    }

    // =========================================
    // SKELETON & NODE RENDERING
    // =========================================
    
    /**
     * Draw skeleton connections
     */
    function drawSkeleton(ctx, landmarks, canvas, targetFingers) {
        const points = landmarks.map(p => toCanvas(p, canvas));
        
        ctx.lineWidth = CONFIG.lineWidth.skeleton;
        ctx.setLineDash([]);
        
        for (const [start, end] of CONNECTIONS) {
            // Determine if this connection is part of a target finger
            const startFinger = getFingerForNode(start);
            const endFinger = getFingerForNode(end);
            const isTarget = targetFingers.includes(startFinger) || targetFingers.includes(endFinger);
            
            ctx.strokeStyle = isTarget ? CONFIG.nodes.target : CONFIG.lines.skeleton;
            ctx.beginPath();
            ctx.moveTo(points[start].x, points[start].y);
            ctx.lineTo(points[end].x, points[end].y);
            ctx.stroke();
        }
    }
    
    /**
     * Get finger index (0-4) for a node number (0-20)
     */
    function getFingerForNode(node) {
        if (node === 0) return -1; // Wrist
        if (node <= 4) return 0;   // Thumb
        if (node <= 8) return 1;   // Index
        if (node <= 12) return 2;  // Middle
        if (node <= 16) return 3;  // Ring
        return 4;                   // Pinky
    }
    
    /**
     * Draw numbered nodes with color coding
     */
    function drawNodes(ctx, landmarks, canvas, targetFingers, evaluationResult) {
        const points = landmarks.map(p => toCanvas(p, canvas));
        
        for (let i = 0; i < 21; i++) {
            const point = points[i];
            const finger = getFingerForNode(i);
            const isTarget = targetFingers.includes(finger);
            const isThumb = finger === 0;
            const isWrist = i === 0;
            
            // Determine node color
            let fillColor = CONFIG.nodes.nonTarget;
            let strokeColor = '#FFFFFF';
            let radius = CONFIG.nodeRadius;
            
            if (isWrist) {
                fillColor = CONFIG.nodes.wrist;
                radius = CONFIG.nodeRadius + 4;
            } else if (isThumb) {
                fillColor = CONFIG.nodes.thumb;
            } else if (isTarget) {
                fillColor = CONFIG.nodes.target;
                radius = CONFIG.nodeRadius + 2;
                
                // Check if this target is being measured as extended
                if (evaluationResult?.targets) {
                    const targetResult = evaluationResult.targets.find(t => t.fingerIndex === finger);
                    if (targetResult?.extended) {
                        fillColor = CONFIG.nodes.measured;
                    }
                }
            }
            
            // Check for violations
            if (evaluationResult?.violations) {
                const violation = evaluationResult.violations.find(v => v.fingerIndex === finger);
                if (violation) {
                    strokeColor = CONFIG.nodes.violation;
                    ctx.lineWidth = 3;
                }
            }
            
            // Draw node circle
            ctx.fillStyle = fillColor;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Draw node number
            ctx.fillStyle = CONFIG.nodeTextColor;
            ctx.font = CONFIG.nodeFont;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(i), point.x, point.y);
        }
    }
    
    /**
     * Draw target finger highlighting (circles around fingertips)
     */
    function drawTargetHighlights(ctx, landmarks, canvas, targetFingers, evaluationResult) {
        const points = landmarks.map(p => toCanvas(p, canvas));
        const tips = [4, 8, 12, 16, 20];
        
        for (const fingerIdx of targetFingers) {
            const tipNode = tips[fingerIdx];
            const tip = points[tipNode];
            
            // Determine color based on evaluation
            let color = CONFIG.nodes.target;
            if (evaluationResult?.targets) {
                const result = evaluationResult.targets.find(t => t.fingerIndex === fingerIdx);
                if (result?.zone === 'GREEN') color = '#00FF00';
                else if (result?.zone === 'BLUE') color = '#00BFFF';
                else if (result?.zone === 'YELLOW') color = '#FFD700';
                else if (result?.zone === 'RED') color = '#FF4444';
            }
            
            // Draw outer ring
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(tip.x, tip.y, 20, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw pulsing effect (optional animation)
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(tip.x, tip.y, 28, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
    }

    // =========================================
    // LEGEND
    // =========================================
    
    function drawLegend(ctx, canvas) {
        const legendX = 10;
        let legendY = canvas.height - 150;
        const lineHeight = 18;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(legendX - 5, legendY - 15, 180, 140);
        
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'left';
        
        // Zone legend
        const items = [
            { color: CONFIG.zones.green, label: 'Green Zone (Best)' },
            { color: CONFIG.zones.acceptable, label: 'Acceptable Zone' },
            { color: CONFIG.zones.low, label: 'Low Accuracy Zone' },
            { color: CONFIG.zones.safe, label: 'Safe Zone (Ignored)' },
            { color: CONFIG.lines.redLine, label: 'Red Line (Thumb)' },
            { color: CONFIG.nodes.target, label: 'Target Finger' },
            { color: CONFIG.nodes.nonTarget, label: 'Non-Target' }
        ];
        
        for (const item of items) {
            ctx.fillStyle = item.color;
            ctx.fillRect(legendX, legendY, 14, 14);
            ctx.strokeStyle = '#FFFFFF';
            ctx.strokeRect(legendX, legendY, 14, 14);
            
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(item.label, legendX + 20, legendY + 11);
            
            legendY += lineHeight;
        }
    }

    // =========================================
    // MAIN RENDER FUNCTION
    // =========================================
    
    /**
     * Main render function - call this in your animation loop
     * 
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {Array} landmarks - MediaPipe hand landmarks (21 points)
     * @param {Array} targetFingers - Array of target finger indices (0-4)
     * @param {Object} evaluationResult - Optional result from InvisibleBoundaryEngine.evaluate()
     */
    function render(ctx, canvas, landmarks, targetFingers = [], evaluationResult = null) {
        if (!CONFIG.enabled || !landmarks || landmarks.length < 21) {
            return;
        }
        
        // Save context state
        ctx.save();
        
        // 1. Draw shaded zones and boundary lines
        drawZones(ctx, landmarks, canvas, targetFingers);
        
        // 2. Draw red line for thumb
        drawRedLine(ctx, landmarks, canvas);
        
        // 3. Draw skeleton connections
        drawSkeleton(ctx, landmarks, canvas, targetFingers);
        
        // 4. Draw target finger highlights
        drawTargetHighlights(ctx, landmarks, canvas, targetFingers, evaluationResult);
        
        // 5. Draw numbered nodes
        drawNodes(ctx, landmarks, canvas, targetFingers, evaluationResult);
        
        // 6. Draw legend
        drawLegend(ctx, canvas);
        
        // Restore context state
        ctx.restore();
    }

    // =========================================
    // PUBLIC API
    // =========================================
    
    return {
        // Enable/disable
        get enabled() { return CONFIG.enabled; },
        set enabled(val) { CONFIG.enabled = !!val; },
        
        // Toggle
        toggle() {
            CONFIG.enabled = !CONFIG.enabled;
            console.log('BoundaryVisualizer:', CONFIG.enabled ? 'ON' : 'OFF');
            return CONFIG.enabled;
        },
        
        // Main render function
        render,
        
        // Individual draw functions (for custom use)
        drawZones,
        drawRedLine,
        drawSkeleton,
        drawNodes,
        drawTargetHighlights,
        drawLegend,
        
        // Configuration access
        CONFIG,
        
        // Utility
        getFingerForNode,
        toCanvas
    };
})();

// Module exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BoundaryVisualizer;
}
if (typeof window !== 'undefined') {
    window.BoundaryVisualizer = BoundaryVisualizer;
}