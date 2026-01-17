/**
 * HandHero Boundary-Based Detection Engine
 * =========================================
 * Philosophy: Human logic measures human accuracy.
 * We don't calculate precise angles - we check if fingers are within acceptable zones.
 * 
 * Node Reference:
 *   Thumb:  1 (base), 2, 3, 4 (tip)
 *   Index:  5 (base), 6, 7, 8 (tip)
 *   Middle: 9 (base), 10, 11, 12 (tip)
 *   Ring:   13 (base), 14, 15, 16 (tip)
 *   Pinky:  17 (base), 18, 19, 20 (tip)
 *   Wrist:  0
 */

const BoundaryEngine = {
    
    // Finger node mappings
    FINGERS: {
        THUMB:  { base: 1, mid: 2, dip: 3, tip: 4, name: 'Thumb' },
        INDEX:  { base: 5, mid: 6, dip: 7, tip: 8, name: 'Index' },
        MIDDLE: { base: 9, mid: 10, dip: 11, tip: 12, name: 'Middle' },
        RING:   { base: 13, mid: 14, dip: 15, tip: 16, name: 'Ring' },
        PINKY:  { base: 17, mid: 18, dip: 19, tip: 20, name: 'Pinky' }
    },
    
    FINGER_ORDER: ['THUMB', 'INDEX', 'MIDDLE', 'RING', 'PINKY'],
    TIPS: [4, 8, 12, 16, 20],
    BASES: [1, 5, 9, 13, 17],
    
    // Zone thresholds (as percentage of hand height)
    ZONES: {
        GREEN_THRESHOLD: 0.15,   // Tips must be this far below base = green zone
        YELLOW_THRESHOLD: 0.05, // Tips this far below base = yellow zone
        RED_THRESHOLD: 0.0,     // Tips at or above base = red zone (failing)
    },
    
    // Thumb lateral boundary (percentage of hand width from index base)
    THUMB_BOUNDARY: 0.1, // Thumb tip must stay within 10% of hand width from index side
    
    /**
     * Calculate hand reference frame
     * All boundaries are relative to THIS hand's dimensions
     */
    getHandFrame(landmarks) {
        const wrist = landmarks[0];
        const middleBase = landmarks[9];
        const middleTip = landmarks[12];
        const indexBase = landmarks[5];
        const pinkyBase = landmarks[17];
        
        // Hand height = wrist to middle fingertip (when extended)
        const handHeight = Math.sqrt(
            Math.pow(middleTip.x - wrist.x, 2) + 
            Math.pow(middleTip.y - wrist.y, 2) +
            Math.pow(middleTip.z - wrist.z, 2)
        );
        
        // Hand width = index base to pinky base
        const handWidth = Math.sqrt(
            Math.pow(pinkyBase.x - indexBase.x, 2) + 
            Math.pow(pinkyBase.y - indexBase.y, 2)
        );
        
        // Palm center (average of bases)
        const palmCenter = {
            x: (landmarks[0].x + landmarks[5].x + landmarks[9].x + landmarks[13].x + landmarks[17].x) / 5,
            y: (landmarks[0].y + landmarks[5].y + landmarks[9].y + landmarks[13].y + landmarks[17].y) / 5,
            z: (landmarks[0].z + landmarks[5].z + landmarks[9].z + landmarks[13].z + landmarks[17].z) / 5
        };
        
        // Base line Y position (average Y of finger bases, excluding thumb)
        const baseLineY = (landmarks[5].y + landmarks[9].y + landmarks[13].y + landmarks[17].y) / 4;
        
        return {
            handHeight,
            handWidth,
            palmCenter,
            baseLineY,
            wrist,
            landmarks
        };
    },
    
    /**
     * Check if a non-target finger is properly relaxed (below boundary)
     * Returns: { inZone: 'GREEN'|'YELLOW'|'RED', score: 0-1 }
     */
    checkNonTargetFinger(fingerIndex, landmarks, handFrame) {
        const finger = this.FINGERS[this.FINGER_ORDER[fingerIndex]];
        const tip = landmarks[finger.tip];
        const base = landmarks[finger.base];
        
        // Calculate how far the tip is below the base (positive = below, negative = above)
        // In screen coordinates, Y increases downward, so tip.y > base.y means tip is below
        const tipBelowBase = tip.y - base.y;
        
        // Normalize by hand height
        const normalizedDistance = tipBelowBase / handFrame.handHeight;
        
        // Determine zone
        if (normalizedDistance >= this.ZONES.GREEN_THRESHOLD) {
            // Tip is well below base = excellent (finger is curled)
            return { zone: 'GREEN', score: 1.0 };
        } else if (normalizedDistance >= this.ZONES.YELLOW_THRESHOLD) {
            // Tip is somewhat below base = acceptable
            const progress = (normalizedDistance - this.ZONES.YELLOW_THRESHOLD) / 
                           (this.ZONES.GREEN_THRESHOLD - this.ZONES.YELLOW_THRESHOLD);
            return { zone: 'YELLOW', score: 0.65 + (progress * 0.20) }; // 65-85%
        } else if (normalizedDistance >= this.ZONES.RED_THRESHOLD) {
            // Tip is barely below or at base = warning
            const progress = (normalizedDistance - this.ZONES.RED_THRESHOLD) / 
                           (this.ZONES.YELLOW_THRESHOLD - this.ZONES.RED_THRESHOLD);
            return { zone: 'ORANGE', score: 0.40 + (progress * 0.25) }; // 40-65%
        } else {
            // Tip is above base = failing (finger is extended when it shouldn't be)
            return { zone: 'RED', score: Math.max(0, 0.40 + normalizedDistance) };
        }
    },
    
    /**
     * Check if a target finger is properly extended
     * Returns: { inZone: 'GREEN'|'YELLOW'|'RED', score: 0-1 }
     */
    checkTargetFinger(fingerIndex, landmarks, handFrame) {
        const finger = this.FINGERS[this.FINGER_ORDER[fingerIndex]];
        const tip = landmarks[finger.tip];
        const base = landmarks[finger.base];
        const wrist = landmarks[0];
        
        // For target finger: tip should be ABOVE base (extended)
        // Calculate extension as tip being above base toward wrist direction
        const tipAboveBase = base.y - tip.y; // Positive = tip is above base
        
        // Normalize by hand height
        const normalizedExtension = tipAboveBase / handFrame.handHeight;
        
        // Also check that finger is relatively straight (tip far from wrist)
        const tipToWrist = Math.sqrt(
            Math.pow(tip.x - wrist.x, 2) + 
            Math.pow(tip.y - wrist.y, 2)
        );
        const baseToWrist = Math.sqrt(
            Math.pow(base.x - wrist.x, 2) + 
            Math.pow(base.y - wrist.y, 2)
        );
        const extensionRatio = tipToWrist / baseToWrist;
        
        // Combine both metrics
        if (normalizedExtension > 0.10 && extensionRatio > 1.3) {
            return { zone: 'GREEN', score: 1.0 };
        } else if (normalizedExtension > 0.05 && extensionRatio > 1.15) {
            return { zone: 'BLUE', score: 0.85 };
        } else if (normalizedExtension > 0 && extensionRatio > 1.0) {
            return { zone: 'YELLOW', score: 0.65 };
        } else {
            // Finger not extended enough
            const score = Math.max(0.20, 0.40 + normalizedExtension);
            return { zone: 'RED', score };
        }
    },
    
    /**
     * Check thumb boundary (lateral constraint)
     * Thumb must stay behind/beside the hand, not crossing in front of other fingers
     */
    checkThumbBoundary(landmarks, handFrame) {
        const thumbTip = landmarks[4];
        const indexBase = landmarks[5];
        const pinkyBase = landmarks[17];
        
        // Calculate hand's lateral axis (index to pinky direction)
        const handAxisX = pinkyBase.x - indexBase.x;
        
        // Thumb tip X position relative to index base
        const thumbRelativeX = thumbTip.x - indexBase.x;
        
        // If hand axis is positive (pinky right of index), thumb should be left (negative relative X)
        // If hand axis is negative (pinky left of index), thumb should be right (positive relative X)
        const thumbOnCorrectSide = (handAxisX > 0) ? (thumbRelativeX < this.THUMB_BOUNDARY * handFrame.handWidth) :
                                                     (thumbRelativeX > -this.THUMB_BOUNDARY * handFrame.handWidth);
        
        if (thumbOnCorrectSide) {
            return { zone: 'GREEN', score: 1.0 };
        } else {
            // Thumb is crossing over - calculate how much
            const violation = Math.abs(thumbRelativeX) / handFrame.handWidth;
            return { zone: 'RED', score: Math.max(0.3, 1.0 - violation) };
        }
    },
    
    /**
     * Main evaluation function for isolation exercises
     * @param landmarks - MediaPipe hand landmarks
     * @param targetFingers - Array of finger indices that should be extended [0=thumb, 1=index, etc.]
     * @returns { accuracy: 0-1, zone: string, fingerResults: array, passed: boolean }
     */
    evaluateIsolation(landmarks, targetFingers) {
        const handFrame = this.getHandFrame(landmarks);
        const fingerResults = [];
        let totalScore = 0;
        let fingerCount = 0;
        let worstZone = 'GREEN';
        const zoneRank = { 'GREEN': 4, 'BLUE': 3, 'YELLOW': 2, 'ORANGE': 1, 'RED': 0 };
        
        // Evaluate each finger
        for (let i = 0; i < 5; i++) {
            const isTarget = targetFingers.includes(i);
            let result;
            
            if (i === 0) {
                // Thumb special handling
                if (isTarget) {
                    result = this.checkTargetFinger(i, landmarks, handFrame);
                } else {
                    result = this.checkThumbBoundary(landmarks, handFrame);
                }
            } else if (isTarget) {
                result = this.checkTargetFinger(i, landmarks, handFrame);
            } else {
                result = this.checkNonTargetFinger(i, landmarks, handFrame);
            }
            
            result.isTarget = isTarget;
            result.fingerName = this.FINGER_ORDER[i];
            fingerResults.push(result);
            
            totalScore += result.score;
            fingerCount++;
            
            if (zoneRank[result.zone] < zoneRank[worstZone]) {
                worstZone = result.zone;
            }
        }
        
        const accuracy = totalScore / fingerCount;
        
        // Determine overall zone based on accuracy
        let overallZone;
        if (accuracy >= 0.85) overallZone = 'GREEN';
        else if (accuracy >= 0.65) overallZone = 'BLUE';
        else if (accuracy >= 0.40) overallZone = 'YELLOW';
        else overallZone = 'RED';
        
        // Passed if accuracy >= 65% (blue zone or better)
        const passed = accuracy >= 0.65;
        
        return {
            accuracy,
            overallZone,
            worstZone,
            fingerResults,
            passed,
            handFrame
        };
    },
    
    /**
     * Evaluate pinch exercises (thumb to finger)
     * @param landmarks - MediaPipe hand landmarks  
     * @param pinchTarget - Finger index to pinch with thumb (1=index, 2=middle, etc.)
     */
    evaluatePinch(landmarks, pinchTarget) {
        const handFrame = this.getHandFrame(landmarks);
        const thumbTip = landmarks[4];
        const targetTip = landmarks[this.TIPS[pinchTarget]];
        
        // Distance between thumb and target finger tips
        const distance = Math.sqrt(
            Math.pow(thumbTip.x - targetTip.x, 2) +
            Math.pow(thumbTip.y - targetTip.y, 2) +
            Math.pow(thumbTip.z - targetTip.z, 2)
        );
        
        // Normalize by hand width
        const normalizedDistance = distance / handFrame.handWidth;
        
        // Check that other fingers are relaxed
        const otherFingers = [1, 2, 3, 4].filter(f => f !== pinchTarget);
        let nonTargetScore = 0;
        
        for (const finger of otherFingers) {
            const result = this.checkNonTargetFinger(finger, landmarks, handFrame);
            nonTargetScore += result.score;
        }
        nonTargetScore /= otherFingers.length;
        
        // Pinch accuracy based on distance
        let pinchScore;
        if (normalizedDistance < 0.15) {
            pinchScore = 1.0; // Touching or very close
        } else if (normalizedDistance < 0.25) {
            pinchScore = 0.85; // Close
        } else if (normalizedDistance < 0.40) {
            pinchScore = 0.65; // Getting there
        } else {
            pinchScore = Math.max(0.2, 0.65 - (normalizedDistance - 0.40));
        }
        
        // Combined accuracy (60% pinch, 40% other fingers relaxed)
        const accuracy = (pinchScore * 0.6) + (nonTargetScore * 0.4);
        
        let overallZone;
        if (accuracy >= 0.85) overallZone = 'GREEN';
        else if (accuracy >= 0.65) overallZone = 'BLUE';
        else if (accuracy >= 0.40) overallZone = 'YELLOW';
        else overallZone = 'RED';
        
        return {
            accuracy,
            overallZone,
            pinchDistance: normalizedDistance,
            pinchScore,
            nonTargetScore,
            passed: accuracy >= 0.65,
            handFrame
        };
    },
    
    /**
     * Evaluate spread exercises (all fingers extended and spread apart)
     */
    evaluateSpread(landmarks) {
        const handFrame = this.getHandFrame(landmarks);
        const tips = this.TIPS.map(i => landmarks[i]);
        
        // Check that all fingers are extended
        let extensionScore = 0;
        for (let i = 0; i < 5; i++) {
            const result = this.checkTargetFinger(i, landmarks, handFrame);
            extensionScore += result.score;
        }
        extensionScore /= 5;
        
        // Check gaps between adjacent fingers
        let gapScore = 0;
        for (let i = 0; i < tips.length - 1; i++) {
            const gap = Math.sqrt(
                Math.pow(tips[i + 1].x - tips[i].x, 2) +
                Math.pow(tips[i + 1].y - tips[i].y, 2)
            );
            const normalizedGap = gap / handFrame.handWidth;
            
            // Good gap is > 20% of hand width between fingers
            if (normalizedGap > 0.20) gapScore += 1.0;
            else if (normalizedGap > 0.12) gapScore += 0.75;
            else if (normalizedGap > 0.06) gapScore += 0.50;
            else gapScore += 0.25;
        }
        gapScore /= 4;
        
        // Combined accuracy (50% extension, 50% spread)
        const accuracy = (extensionScore * 0.5) + (gapScore * 0.5);
        
        let overallZone;
        if (accuracy >= 0.85) overallZone = 'GREEN';
        else if (accuracy >= 0.65) overallZone = 'BLUE';
        else if (accuracy >= 0.40) overallZone = 'YELLOW';
        else overallZone = 'RED';
        
        return {
            accuracy,
            overallZone,
            extensionScore,
            gapScore,
            passed: accuracy >= 0.65,
            handFrame
        };
    },
    
    /**
     * Get boundary line positions for rendering (optional visual debugging)
     * Returns screen-space coordinates for drawing boundary lines
     */
    getBoundaryLines(landmarks, handFrame, canvasWidth, canvasHeight) {
        const lines = [];
        
        // For each non-thumb finger, calculate the green and yellow boundary lines
        for (let i = 1; i < 5; i++) {
            const finger = this.FINGERS[this.FINGER_ORDER[i]];
            const base = landmarks[finger.base];
            const tip = landmarks[finger.tip];
            
            // Convert to screen coordinates
            const baseScreen = {
                x: base.x * canvasWidth,
                y: base.y * canvasHeight
            };
            
            // Green line: below base by GREEN_THRESHOLD * handHeight
            const greenY = baseScreen.y + (this.ZONES.GREEN_THRESHOLD * handFrame.handHeight * canvasHeight);
            
            // Yellow line: below base by YELLOW_THRESHOLD * handHeight  
            const yellowY = baseScreen.y + (this.ZONES.YELLOW_THRESHOLD * handFrame.handHeight * canvasHeight);
            
            lines.push({
                finger: this.FINGER_ORDER[i],
                baseX: baseScreen.x,
                greenY,
                yellowY
            });
        }
        
        // Thumb lateral boundary
        const indexBase = landmarks[5];
        const thumbBoundaryX = (indexBase.x - this.THUMB_BOUNDARY) * canvasWidth;
        lines.push({
            finger: 'THUMB_BOUNDARY',
            x: thumbBoundaryX,
            isVertical: true
        });
        
        return lines;
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BoundaryEngine;
}