/**
 * InvisibleBoundaryEngine.js v2
 * ============================================
 * Dynamic boundary-based detection for HandHero exercises.
 * 
 * CORE PHILOSOPHY:
 * - Human logic to measure human accuracy (not AI precision)
 * - Boundary lines are DYNAMIC - set based on TARGET fingers
 * - Non-target fingers are in "safe zone" - NOT measured unless they violate
 * - Thumb always treated with maximum leniency
 * - NO visual feedback - all scoring is invisible to user
 * 
 * DYNAMIC BOUNDARY SYSTEM:
 * For each TARGET finger, boundaries are created at:
 * - GREEN boundary: At the PIP (proximal) joint level of target finger
 * - ACCEPTABLE boundary: At the DIP (distal) joint level of target finger
 * 
 * NODE REFERENCE (MediaPipe Hand Landmarks):
 * 0 = Wrist
 * 
 * THUMB:  1=CMC, 2=MCP, 3=IP, 4=TIP
 * INDEX:  5=MCP, 6=PIP, 7=DIP, 8=TIP
 * MIDDLE: 9=MCP, 10=PIP, 11=DIP, 12=TIP
 * RING:   13=MCP, 14=PIP, 15=DIP, 16=TIP
 * PINKY:  17=MCP, 18=PIP, 19=DIP, 20=TIP
 * 
 * FINGER INDEX MAPPING:
 * 0 = Thumb, 1 = Index, 2 = Middle, 3 = Ring, 4 = Pinky
 */

const InvisibleBoundaryEngine = (function() {
    'use strict';

    // =========================================
    // NODE MAPPINGS
    // =========================================
    
    // Finger index to node indices
    const FINGER_NODES = {
        0: { name: 'thumb',  mcp: 1,  pip: 2,  dip: 3,  tip: 4  },
        1: { name: 'index',  mcp: 5,  pip: 6,  dip: 7,  tip: 8  },
        2: { name: 'middle', mcp: 9,  pip: 10, dip: 11, tip: 12 },
        3: { name: 'ring',   mcp: 13, pip: 14, dip: 15, tip: 16 },
        4: { name: 'pinky',  mcp: 17, pip: 18, dip: 19, tip: 20 }
    };
    
    const FINGER_NAMES = ['thumb', 'index', 'middle', 'ring', 'pinky'];
    
    // Quick lookups
    const ALL_TIPS = [4, 8, 12, 16, 20];
    const ALL_DIPS = [3, 7, 11, 15, 19];
    const ALL_PIPS = [2, 6, 10, 14, 18];
    const ALL_MCPS = [1, 5, 9, 13, 17];
    
    // Zone constants
    const ZONE = {
        GREEN: 'GREEN',
        BLUE: 'BLUE',
        YELLOW: 'YELLOW',
        RED: 'RED'
    };

    // =========================================
    // UTILITY FUNCTIONS
    // =========================================
    
    function distance(p1, p2) {
        return Math.hypot(
            p1.x - p2.x,
            p1.y - p2.y,
            (p1.z || 0) - (p2.z || 0)
        );
    }
    
    function distance2D(p1, p2) {
        return Math.hypot(p1.x - p2.x, p1.y - p2.y);
    }
    
    /**
     * Get hand reference frame for normalization
     */
    function getHandFrame(landmarks) {
        const wrist = landmarks[0];
        const middleTip = landmarks[12];
        const indexMcp = landmarks[5];
        const pinkyMcp = landmarks[17];
        
        return {
            wrist,
            handLength: distance(wrist, middleTip),
            handWidth: distance(indexMcp, pinkyMcp),
            palmCenter: {
                x: (landmarks[0].x + landmarks[5].x + landmarks[9].x + landmarks[13].x + landmarks[17].x) / 5,
                y: (landmarks[0].y + landmarks[5].y + landmarks[9].y + landmarks[13].y + landmarks[17].y) / 5
            }
        };
    }
    
    /**
     * Get Y-position on a line at a given X
     */
    function getYOnLine(x, lineStart, lineEnd) {
        if (Math.abs(lineEnd.x - lineStart.x) < 0.0001) {
            return (lineStart.y + lineEnd.y) / 2;
        }
        const slope = (lineEnd.y - lineStart.y) / (lineEnd.x - lineStart.x);
        return lineStart.y + slope * (x - lineStart.x);
    }
    
    /**
     * Check if point is above line (lower Y = above in screen coords)
     */
    function isAboveLine(point, lineStart, lineEnd) {
        const yOnLine = getYOnLine(point.x, lineStart, lineEnd);
        return point.y < yOnLine;
    }
    
    /**
     * Get perpendicular distance from point to line (normalized)
     */
    function distanceToLine(point, lineStart, lineEnd, handLength) {
        const A = point.x - lineStart.x;
        const B = point.y - lineStart.y;
        const C = lineEnd.x - lineStart.x;
        const D = lineEnd.y - lineStart.y;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) return distance2D(point, lineStart) / handLength;
        
        const param = Math.max(0, Math.min(1, dot / lenSq));
        const nearest = {
            x: lineStart.x + param * C,
            y: lineStart.y + param * D
        };
        
        return distance2D(point, nearest) / handLength;
    }

    // =========================================
    // DYNAMIC BOUNDARY CREATION
    // =========================================
    
    /**
     * Create boundary lines for a specific target finger
     * Returns GREEN (PIP level) and ACCEPTABLE (DIP level) boundaries
     */
    function createBoundaryForFinger(fingerIdx, landmarks, frame) {
        const nodes = FINGER_NODES[fingerIdx];
        
        // Get the target finger's joints
        const pip = landmarks[nodes.pip];
        const dip = landmarks[nodes.dip];
        const mcp = landmarks[nodes.mcp];
        
        // Create horizontal-ish boundary lines at PIP and DIP levels
        // Extend the line across the hand width for proper checking
        const lineExtent = frame.handWidth * 1.5;
        
        // GREEN boundary at PIP level
        const greenBoundary = {
            start: { x: pip.x - lineExtent, y: pip.y },
            end: { x: pip.x + lineExtent, y: pip.y },
            level: 'GREEN',
            referenceNode: nodes.pip
        };
        
        // ACCEPTABLE boundary at DIP level  
        const acceptableBoundary = {
            start: { x: dip.x - lineExtent, y: dip.y },
            end: { x: dip.x + lineExtent, y: dip.y },
            level: 'ACCEPTABLE',
            referenceNode: nodes.dip
        };
        
        // LOW ACCURACY boundary at MCP level
        const lowBoundary = {
            start: { x: mcp.x - lineExtent, y: mcp.y },
            end: { x: mcp.x + lineExtent, y: mcp.y },
            level: 'LOW',
            referenceNode: nodes.mcp
        };
        
        return { greenBoundary, acceptableBoundary, lowBoundary };
    }
    
    /**
     * Create boundaries for multiple target fingers
     * Uses the average position of all target fingers' joints
     */
    function createBoundariesForTargets(targetFingers, landmarks, frame) {
        if (targetFingers.length === 0) {
            // Fallback: use middle finger as reference
            return createBoundaryForFinger(2, landmarks, frame);
        }
        
        if (targetFingers.length === 1) {
            return createBoundaryForFinger(targetFingers[0], landmarks, frame);
        }
        
        // Multiple targets: create boundary that spans between them
        // Use the outermost targets to define the line
        const sortedTargets = [...targetFingers].sort((a, b) => a - b);
        const leftFinger = sortedTargets[0];
        const rightFinger = sortedTargets[sortedTargets.length - 1];
        
        const leftNodes = FINGER_NODES[leftFinger];
        const rightNodes = FINGER_NODES[rightFinger];
        
        // GREEN boundary: line from left PIP to right PIP
        const greenBoundary = {
            start: landmarks[leftNodes.pip],
            end: landmarks[rightNodes.pip],
            level: 'GREEN'
        };
        
        // ACCEPTABLE boundary: line from left DIP to right DIP
        const acceptableBoundary = {
            start: landmarks[leftNodes.dip],
            end: landmarks[rightNodes.dip],
            level: 'ACCEPTABLE'
        };
        
        // LOW boundary: line from left MCP to right MCP
        const lowBoundary = {
            start: landmarks[leftNodes.mcp],
            end: landmarks[rightNodes.mcp],
            level: 'LOW'
        };
        
        return { greenBoundary, acceptableBoundary, lowBoundary };
    }

    // =========================================
    // FINGER EVALUATION
    // =========================================
    
    /**
     * Check if a TARGET finger is properly extended
     * Uses dynamic boundaries based on that finger's position
     */
    function evaluateTargetFinger(fingerIdx, landmarks, frame) {
        const nodes = FINGER_NODES[fingerIdx];
        const tip = landmarks[nodes.tip];
        const dip = landmarks[nodes.dip];
        const pip = landmarks[nodes.pip];
        const mcp = landmarks[nodes.mcp];
        
        // For extension: tip should be above (lower Y than) the other joints
        // We measure relative to the finger's own structure
        
        const tipAboveDip = dip.y - tip.y;
        const tipAbovePip = pip.y - tip.y;
        const tipAboveMcp = mcp.y - tip.y;
        
        // Normalize by hand length
        const normalizedExtension = tipAboveMcp / frame.handLength;
        
        // Also check the "straightness" - tip should be far from wrist
        const tipToWrist = distance(tip, landmarks[0]);
        const mcpToWrist = distance(mcp, landmarks[0]);
        const extensionRatio = tipToWrist / mcpToWrist;
        
        // Determine zone
        if (normalizedExtension > 0.15 && extensionRatio > 1.3) {
            // Tip well above MCP, finger extended - GREEN
            return {
                zone: ZONE.GREEN,
                score: Math.min(1.0, 0.85 + normalizedExtension),
                extended: true,
                detail: 'fully extended'
            };
        } else if (normalizedExtension > 0.08 && extensionRatio > 1.15) {
            // Good extension - BLUE
            return {
                zone: ZONE.BLUE,
                score: 0.75,
                extended: true,
                detail: 'well extended'
            };
        } else if (normalizedExtension > 0.02 && extensionRatio > 1.0) {
            // Partial extension - YELLOW
            return {
                zone: ZONE.YELLOW,
                score: 0.55,
                extended: true,
                detail: 'partially extended'
            };
        } else if (normalizedExtension > -0.05) {
            // Minimal extension - still acceptable
            return {
                zone: ZONE.YELLOW,
                score: 0.40,
                extended: false,
                detail: 'minimal extension'
            };
        } else {
            // Not extended - RED
            return {
                zone: ZONE.RED,
                score: 0.20,
                extended: false,
                detail: 'not extended'
            };
        }
    }
    
    /**
     * Check if a NON-TARGET finger is in the safe zone
     * Only flags violations - does NOT precisely measure
     */
    function evaluateNonTargetFinger(fingerIdx, landmarks, boundaries, frame) {
        const nodes = FINGER_NODES[fingerIdx];
        const tip = landmarks[nodes.tip];
        
        // Check if tip is above the GREEN boundary (violation)
        const aboveGreen = isAboveLine(tip, boundaries.greenBoundary.start, boundaries.greenBoundary.end);
        
        // Check if tip is above the ACCEPTABLE boundary (minor issue)
        const aboveAcceptable = isAboveLine(tip, boundaries.acceptableBoundary.start, boundaries.acceptableBoundary.end);
        
        if (aboveGreen) {
            // Major violation - finger is in the target zone
            return {
                zone: ZONE.RED,
                score: 0.3,
                inSafeZone: false,
                violation: true,
                severity: 'major',
                detail: 'finger extended into target zone'
            };
        } else if (aboveAcceptable) {
            // Minor issue - finger partially raised but acceptable
            // YELLOW is OK per the requirements
            return {
                zone: ZONE.YELLOW,
                score: 0.7,
                inSafeZone: true, // Yellow is acceptable!
                violation: false,
                severity: 'none',
                detail: 'finger slightly raised but acceptable'
            };
        } else {
            // In safe zone - don't measure, just accept
            return {
                zone: ZONE.GREEN,
                score: 1.0,
                inSafeZone: true,
                violation: false,
                severity: 'none',
                detail: 'in safe zone'
            };
        }
    }
    
    /**
     * Special handling for THUMB
     * Maximum leniency - only fail on extreme violations
     */
    function evaluateThumb(landmarks, frame, isTarget) {
        const thumbTip = landmarks[4];
        const thumbIp = landmarks[3];
        const thumbMcp = landmarks[2];
        const indexMcp = landmarks[5];
        const wrist = landmarks[0];
        
        if (isTarget) {
            // Thumb IS the target - measure extension
            const tipToWrist = distance(thumbTip, wrist);
            const mcpToWrist = distance(thumbMcp, wrist);
            const extensionRatio = tipToWrist / mcpToWrist;
            
            // Thumb extended away from palm?
            const thumbAwayFromPalm = distance(thumbTip, frame.palmCenter) / frame.handWidth;
            
            if (extensionRatio > 1.4 && thumbAwayFromPalm > 0.4) {
                return { zone: ZONE.GREEN, score: 1.0, pass: true, detail: 'thumb fully extended' };
            } else if (extensionRatio > 1.2 && thumbAwayFromPalm > 0.3) {
                return { zone: ZONE.BLUE, score: 0.75, pass: true, detail: 'thumb well extended' };
            } else if (extensionRatio > 1.0) {
                return { zone: ZONE.YELLOW, score: 0.50, pass: true, detail: 'thumb partially extended' };
            } else {
                return { zone: ZONE.RED, score: 0.25, pass: false, detail: 'thumb not extended' };
            }
        } else {
            // Thumb is NOT target - MAXIMUM LENIENCY
            // Only fail if thumb is wildly extended AND clearly interfering
            // In practice, almost always passes
            
            // Check if thumb tip is way out past index finger
            const thumbPastIndex = thumbTip.x < indexMcp.x - frame.handWidth * 0.3;
            const thumbVeryExtended = distance(thumbTip, wrist) > frame.handLength * 0.6;
            
            if (thumbPastIndex && thumbVeryExtended) {
                // Even this is a minor issue at worst
                return {
                    zone: ZONE.YELLOW,
                    score: 0.8,
                    inSafeZone: true, // Still acceptable!
                    violation: false,
                    detail: 'thumb extended but acceptable'
                };
            }
            
            // Default: thumb is fine, don't care
            return {
                zone: ZONE.GREEN,
                score: 1.0,
                inSafeZone: true,
                violation: false,
                ignored: true,
                detail: 'thumb in safe zone (lenient)'
            };
        }
    }

    // =========================================
    // MAIN EVALUATION FUNCTIONS
    // =========================================
    
    /**
     * Evaluate ISOLATION exercise
     * Only target fingers are measured for extension
     * Non-target fingers only checked for boundary violations
     */
    function evaluateIsolation(landmarks, targetFingers) {
        const frame = getHandFrame(landmarks);
        const boundaries = createBoundariesForTargets(
            targetFingers.filter(f => f !== 0), // Exclude thumb from boundary creation
            landmarks, 
            frame
        );
        
        const results = {
            targets: [],
            nonTargets: [],
            thumb: null,
            violations: [],
            overallZone: ZONE.RED,
            overallScore: 0,
            passed: false
        };
        
        let targetScoreSum = 0;
        let targetCount = 0;
        let allTargetsOk = true;
        let hasMajorViolation = false;
        
        // Evaluate each finger
        for (let i = 0; i < 5; i++) {
            const isTarget = targetFingers.includes(i);
            const fingerName = FINGER_NAMES[i];
            
            if (i === 0) {
                // Thumb - special handling
                const thumbResult = evaluateThumb(landmarks, frame, isTarget);
                thumbResult.finger = fingerName;
                thumbResult.fingerIndex = i;
                thumbResult.isTarget = isTarget;
                results.thumb = thumbResult;
                
                if (isTarget) {
                    targetScoreSum += thumbResult.score;
                    targetCount++;
                    if (!thumbResult.pass) allTargetsOk = false;
                }
            } else if (isTarget) {
                // Target finger - measure extension
                const result = evaluateTargetFinger(i, landmarks, frame);
                result.finger = fingerName;
                result.fingerIndex = i;
                result.isTarget = true;
                results.targets.push(result);
                
                targetScoreSum += result.score;
                targetCount++;
                if (result.zone === ZONE.RED) allTargetsOk = false;
            } else {
                // Non-target finger - only check for violations
                const result = evaluateNonTargetFinger(i, landmarks, boundaries, frame);
                result.finger = fingerName;
                result.fingerIndex = i;
                result.isTarget = false;
                results.nonTargets.push(result);
                
                if (result.violation) {
                    results.violations.push({
                        finger: fingerName,
                        fingerIndex: i,
                        severity: result.severity
                    });
                    if (result.severity === 'major') {
                        hasMajorViolation = true;
                    }
                }
            }
        }
        
        // Calculate final score
        let avgScore = targetCount > 0 ? targetScoreSum / targetCount : 0;
        
        // Apply violation penalty
        if (hasMajorViolation) {
            avgScore *= 0.5;
        } else if (results.violations.length > 0) {
            avgScore *= 0.85;
        }
        
        results.overallScore = avgScore;
        
        // Determine zone
        if (avgScore >= 0.85) results.overallZone = ZONE.GREEN;
        else if (avgScore >= 0.65) results.overallZone = ZONE.BLUE;
        else if (avgScore >= 0.40) results.overallZone = ZONE.YELLOW;
        else results.overallZone = ZONE.RED;
        
        // Pass/fail
        results.passed = allTargetsOk && !hasMajorViolation && avgScore >= 0.65;
        
        return results;
    }
    
    /**
     * Evaluate PINCH exercise
     * Measures distance between thumb tip and target fingertip
     * Non-involved fingers in safe zone (not measured)
     */
    function evaluatePinch(landmarks, pinchPair) {
        const frame = getHandFrame(landmarks);
        const [tip1Idx, tip2Idx] = pinchPair;
        
        const tip1 = landmarks[tip1Idx];
        const tip2 = landmarks[tip2Idx];
        
        // Calculate distance
        const dist = distance(tip1, tip2);
        const normalizedDist = dist / frame.handWidth;
        
        // Determine zone based on distance
        let zone, score;
        if (normalizedDist < 0.05) {
            zone = ZONE.GREEN; score = 1.0;
        } else if (normalizedDist < 0.08) {
            zone = ZONE.GREEN; score = 0.90;
        } else if (normalizedDist < 0.12) {
            zone = ZONE.BLUE; score = 0.75;
        } else if (normalizedDist < 0.18) {
            zone = ZONE.YELLOW; score = 0.55;
        } else if (normalizedDist < 0.28) {
            zone = ZONE.YELLOW; score = 0.40;
        } else {
            zone = ZONE.RED; score = 0.20;
        }
        
        // Determine involved fingers
        const involvedTips = [tip1Idx, tip2Idx];
        const involvedFingers = involvedTips.map(tipIdx => {
            return ALL_TIPS.indexOf(tipIdx);
        });
        
        // Create boundaries based on involved fingers (excluding thumb)
        const nonThumbInvolved = involvedFingers.filter(f => f !== 0);
        const boundaries = nonThumbInvolved.length > 0 
            ? createBoundariesForTargets(nonThumbInvolved, landmarks, frame)
            : createBoundaryForFinger(2, landmarks, frame); // Fallback to middle
        
        // Check non-involved fingers for major violations only
        const violations = [];
        for (let i = 1; i < 5; i++) { // Skip thumb
            if (involvedFingers.includes(i)) continue;
            
            const result = evaluateNonTargetFinger(i, landmarks, boundaries, frame);
            if (result.violation && result.severity === 'major') {
                violations.push({ finger: FINGER_NAMES[i], severity: 'major' });
            }
            // Ignore minor violations for pinch
        }
        
        // Apply penalty for violations
        let finalScore = score;
        if (violations.length > 0) {
            finalScore *= 0.7;
            if (zone === ZONE.GREEN) zone = ZONE.BLUE;
        }
        
        return {
            distance: normalizedDist,
            zone,
            score: finalScore,
            passed: finalScore >= 0.65,
            violations,
            involvedFingers,
            thumbHandling: 'lenient'
        };
    }
    
    /**
     * Evaluate SPREAD exercise (starfish)
     * All fingers should be extended and spread apart
     */
    function evaluateSpread(landmarks) {
        const frame = getHandFrame(landmarks);
        
        const results = [];
        let totalScore = 0;
        
        // Check each finger for extension
        for (let i = 0; i < 5; i++) {
            let result;
            if (i === 0) {
                result = evaluateThumb(landmarks, frame, true);
            } else {
                result = evaluateTargetFinger(i, landmarks, frame);
            }
            result.finger = FINGER_NAMES[i];
            result.fingerIndex = i;
            results.push(result);
            totalScore += result.score;
        }
        
        const extensionScore = totalScore / 5;
        
        // Check gaps between adjacent fingertips
        let gapScore = 0;
        const gaps = [];
        for (let i = 0; i < 4; i++) {
            const gap = distance(landmarks[ALL_TIPS[i]], landmarks[ALL_TIPS[i + 1]]);
            const normalizedGap = gap / frame.handWidth;
            gaps.push(normalizedGap);
            
            if (normalizedGap > 0.30) gapScore += 1.0;
            else if (normalizedGap > 0.20) gapScore += 0.80;
            else if (normalizedGap > 0.12) gapScore += 0.60;
            else if (normalizedGap > 0.06) gapScore += 0.40;
            else gapScore += 0.20;
        }
        gapScore /= 4;
        
        // Combine scores
        const finalScore = (extensionScore * 0.5) + (gapScore * 0.5);
        
        let zone;
        if (finalScore >= 0.85) zone = ZONE.GREEN;
        else if (finalScore >= 0.65) zone = ZONE.BLUE;
        else if (finalScore >= 0.45) zone = ZONE.YELLOW;
        else zone = ZONE.RED;
        
        return {
            fingerResults: results,
            extensionScore,
            gapScore,
            gaps,
            zone,
            score: finalScore,
            passed: finalScore >= 0.65
        };
    }
    
    /**
     * Evaluate FIST exercise
     * All fingers should be curled
     */
    function evaluateFist(landmarks) {
        const frame = getHandFrame(landmarks);
        
        const results = [];
        let totalScore = 0;
        
        for (let i = 0; i < 5; i++) {
            const nodes = FINGER_NODES[i];
            const tip = landmarks[nodes.tip];
            const mcp = landmarks[nodes.mcp];
            const wrist = landmarks[0];
            
            // For fist: tip should be close to palm, below MCP
            const tipBelowMcp = tip.y - mcp.y;
            const normalizedCurl = tipBelowMcp / frame.handLength;
            
            // Also check tip is close to wrist (curled in)
            const tipToWrist = distance(tip, wrist);
            const mcpToWrist = distance(mcp, wrist);
            const curlRatio = tipToWrist / mcpToWrist;
            
            let zone, score, curled;
            if (normalizedCurl > 0.08 && curlRatio < 0.9) {
                zone = ZONE.GREEN; score = 1.0; curled = true;
            } else if (normalizedCurl > 0.02 && curlRatio < 1.0) {
                zone = ZONE.BLUE; score = 0.75; curled = true;
            } else if (normalizedCurl > -0.05 && curlRatio < 1.1) {
                zone = ZONE.YELLOW; score = 0.50; curled = true;
            } else {
                zone = ZONE.RED; score = 0.25; curled = false;
            }
            
            results.push({
                finger: FINGER_NAMES[i],
                fingerIndex: i,
                zone, score, curled
            });
            
            totalScore += score;
        }
        
        const finalScore = totalScore / 5;
        
        let zone;
        if (finalScore >= 0.80) zone = ZONE.GREEN;
        else if (finalScore >= 0.60) zone = ZONE.BLUE;
        else if (finalScore >= 0.45) zone = ZONE.YELLOW;
        else zone = ZONE.RED;
        
        return {
            fingerResults: results,
            zone,
            score: finalScore,
            passed: finalScore >= 0.55
        };
    }
    
    /**
     * Evaluate FLAT hand
     * All fingers extended but close together
     */
    function evaluateFlat(landmarks) {
        const frame = getHandFrame(landmarks);
        
        // Check extension
        let extensionScore = 0;
        const results = [];
        
        for (let i = 0; i < 5; i++) {
            let result;
            if (i === 0) {
                result = evaluateThumb(landmarks, frame, true);
            } else {
                result = evaluateTargetFinger(i, landmarks, frame);
            }
            result.finger = FINGER_NAMES[i];
            results.push(result);
            extensionScore += result.score;
        }
        extensionScore /= 5;
        
        // Check that fingers are TOGETHER (opposite of spread)
        let togetherScore = 0;
        for (let i = 0; i < 4; i++) {
            const gap = distance(landmarks[ALL_TIPS[i]], landmarks[ALL_TIPS[i + 1]]);
            const normalizedGap = gap / frame.handWidth;
            
            // Smaller gap = better for flat
            if (normalizedGap < 0.06) togetherScore += 1.0;
            else if (normalizedGap < 0.10) togetherScore += 0.80;
            else if (normalizedGap < 0.15) togetherScore += 0.60;
            else if (normalizedGap < 0.22) togetherScore += 0.40;
            else togetherScore += 0.20;
        }
        togetherScore /= 4;
        
        const finalScore = (extensionScore * 0.6) + (togetherScore * 0.4);
        
        let zone;
        if (finalScore >= 0.85) zone = ZONE.GREEN;
        else if (finalScore >= 0.65) zone = ZONE.BLUE;
        else if (finalScore >= 0.45) zone = ZONE.YELLOW;
        else zone = ZONE.RED;
        
        return {
            fingerResults: results,
            extensionScore,
            togetherScore,
            zone,
            score: finalScore,
            passed: finalScore >= 0.65
        };
    }

    // =========================================
    // PUBLIC API
    // =========================================
    
    return {
        // Constants
        ZONE,
        FINGER_NAMES,
        FINGER_NODES,
        ALL_TIPS,
        ALL_DIPS,
        ALL_PIPS,
        ALL_MCPS,
        
        // Main evaluation functions
        evaluateIsolation,
        evaluatePinch,
        evaluateSpread,
        evaluateFist,
        evaluateFlat,
        
        // Utility
        getHandFrame,
        createBoundariesForTargets,
        
        /**
         * Universal evaluate function - handles any exercise type
         */
        evaluate(landmarks, exercise) {
            if (!landmarks || landmarks.length < 21) {
                return { 
                    error: 'Invalid landmarks', 
                    passed: false, 
                    score: 0,
                    zone: ZONE.RED 
                };
            }
            
            switch (exercise.type) {
                case 'isolation':
                    return this.evaluateIsolation(landmarks, exercise.targetFingers || []);
                case 'pinch':
                    return this.evaluatePinch(landmarks, exercise.pinchPair || [4, 8]);
                case 'spread':
                    return this.evaluateSpread(landmarks);
                case 'fist':
                    return this.evaluateFist(landmarks);
                case 'flat':
                    return this.evaluateFlat(landmarks);
                default:
                    console.warn('Unknown exercise type:', exercise.type);
                    return { 
                        error: 'Unknown type', 
                        passed: false, 
                        score: 0,
                        zone: ZONE.RED 
                    };
            }
        },
        
        /**
         * Quick fist check for reset phase
         */
        isValidFist(landmarks) {
            if (!landmarks || landmarks.length < 21) return false;
            return this.evaluateFist(landmarks).passed;
        },
        
        /**
         * Get zone from numeric score
         */
        getZoneFromScore(score) {
            if (score >= 0.85) return ZONE.GREEN;
            if (score >= 0.65) return ZONE.BLUE;
            if (score >= 0.40) return ZONE.YELLOW;
            return ZONE.RED;
        },
        
        /**
         * Get node index for a finger's tip
         */
        getTipNode(fingerIndex) {
            return FINGER_NODES[fingerIndex]?.tip || 8;
        },
        
        /**
         * Debug: Get current boundaries for visualization (only use when DEBUG=true)
         */
        _debugGetBoundaries(landmarks, targetFingers) {
            const frame = this.getHandFrame(landmarks);
            return this.createBoundariesForTargets(targetFingers, landmarks, frame);
        }
    };
})();

// Module exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InvisibleBoundaryEngine;
}
if (typeof window !== 'undefined') {
    window.InvisibleBoundaryEngine = InvisibleBoundaryEngine;
}