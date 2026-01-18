/**
 * HandHeroExercises.js
 * ============================================
 * Complete exercise library for HandHero
 * 
 * Each exercise defines:
 * - id: Unique identifier
 * - name: Display name
 * - icon: Emoji for visual representation
 * - category: Grouping for UI
 * - desc: User-facing description
 * - difficulty: 1-4 scale
 * - type: 'isolation' | 'pinch' | 'spread' | 'fist' | 'flat'
 * - targetFingers: Array of finger indices (0-4) for isolation exercises
 * - pinchPair: [node1, node2] for pinch exercises
 * 
 * FINGER INDEX MAPPING:
 * 0 = Thumb, 1 = Index, 2 = Middle, 3 = Ring, 4 = Pinky
 * 
 * TIP NODE MAPPING:
 * 4 = Thumb tip, 8 = Index tip, 12 = Middle tip, 16 = Ring tip, 20 = Pinky tip
 */

const HandHeroExercises = (function() {
    'use strict';

    // =========================================
    // EXERCISE DEFINITIONS
    // =========================================
    
    const EXERCISES = {
        // =========================================
        // SINGLE FINGER ISOLATION
        // =========================================
        
        thumbs_up: {
            id: 'thumbs_up',
            name: 'Thumbs Up',
            icon: '👍',
            category: 'Isolation',
            desc: 'Extend only your thumb',
            difficulty: 2,
            type: 'isolation',
            targetFingers: [0]
        },
        
        pointer: {
            id: 'pointer',
            name: 'Pointer Finger',
            icon: '☝️',
            category: 'Isolation',
            desc: 'Extend only your index finger',
            difficulty: 2,
            type: 'isolation',
            targetFingers: [1]
        },
        
        middle_finger_lift: {
            id: 'middle_finger_lift',
            name: 'Middle Finger Lift',
            icon: '🖕',
            category: 'Isolation',
            desc: 'Extend only your middle finger',
            difficulty: 3,
            type: 'isolation',
            targetFingers: [2]
        },
        
        ring_finger_lift: {
            id: 'ring_finger_lift',
            name: 'Ring Finger Lift',
            icon: '💍',
            category: 'Advanced',
            desc: 'Extend only your ring finger',
            difficulty: 4,
            type: 'isolation',
            targetFingers: [3]
        },
        
        pinky_out: {
            id: 'pinky_out',
            name: 'Pinky Extension',
            icon: '🤙',
            category: 'Isolation',
            desc: 'Extend only your pinky finger',
            difficulty: 3,
            type: 'isolation',
            targetFingers: [4]
        },
        
        // =========================================
        // TWO FINGER ISOLATION
        // =========================================
        
        peace: {
            id: 'peace',
            name: 'Peace Sign',
            icon: '✌️',
            category: 'Coordination',
            desc: 'Extend index and middle fingers',
            difficulty: 2,
            type: 'isolation',
            targetFingers: [1, 2]
        },
        
        rock_on: {
            id: 'rock_on',
            name: 'Rock On',
            icon: '🤘',
            category: 'Advanced',
            desc: 'Extend index and pinky only',
            difficulty: 4,
            type: 'isolation',
            targetFingers: [1, 4]
        },
        
        hang_loose: {
            id: 'hang_loose',
            name: 'Hang Loose',
            icon: '🤙',
            category: 'Coordination',
            desc: 'Extend thumb and pinky only',
            difficulty: 3,
            type: 'isolation',
            targetFingers: [0, 4]
        },
        
        bunny_ears: {
            id: 'bunny_ears',
            name: 'Bunny Ears',
            icon: '🐰',
            category: 'Coordination',
            desc: 'Extend index and middle fingers',
            difficulty: 2,
            type: 'isolation',
            targetFingers: [1, 2]
        },
        
        // =========================================
        // THREE+ FINGER ISOLATION
        // =========================================
        
        three_fingers: {
            id: 'three_fingers',
            name: 'Scout Salute',
            icon: '🖖',
            category: 'Coordination',
            desc: 'Extend index, middle, and ring',
            difficulty: 3,
            type: 'isolation',
            targetFingers: [1, 2, 3]
        },
        
        four_fingers: {
            id: 'four_fingers',
            name: 'Four Up',
            icon: '🖐️',
            category: 'Coordination',
            desc: 'Extend all fingers except thumb',
            difficulty: 2,
            type: 'isolation',
            targetFingers: [1, 2, 3, 4]
        },
        
        // =========================================
        // PINCH EXERCISES (Thumb to Fingertip)
        // =========================================
        
        ok_sign: {
            id: 'ok_sign',
            name: 'OK Sign',
            icon: '👌',
            category: 'Precision',
            desc: 'Touch thumb to index tip',
            difficulty: 2,
            type: 'pinch',
            pinchPair: [4, 8]  // Thumb tip to Index tip
        },
        
        thumb_to_middle: {
            id: 'thumb_to_middle',
            name: 'Thumb to Middle',
            icon: '🤌',
            category: 'Precision',
            desc: 'Touch thumb to middle fingertip',
            difficulty: 2,
            type: 'pinch',
            pinchPair: [4, 12]  // Thumb tip to Middle tip
        },
        
        thumb_to_ring: {
            id: 'thumb_to_ring',
            name: 'Thumb to Ring',
            icon: '🤏',
            category: 'Precision',
            desc: 'Touch thumb to ring fingertip',
            difficulty: 3,
            type: 'pinch',
            pinchPair: [4, 16]  // Thumb tip to Ring tip
        },
        
        thumb_to_pinky: {
            id: 'thumb_to_pinky',
            name: 'Thumb to Pinky',
            icon: '🤙',
            category: 'Precision',
            desc: 'Touch thumb to pinky tip',
            difficulty: 3,
            type: 'pinch',
            pinchPair: [4, 20]  // Thumb tip to Pinky tip
        },
        
        // =========================================
        // FULL HAND EXERCISES
        // =========================================
        
        starfish: {
            id: 'starfish',
            name: 'Starfish Spread',
            icon: '🖐️',
            category: 'Stretch',
            desc: 'Spread all fingers wide',
            difficulty: 1,
            type: 'spread'
        },
        
        flat_hand: {
            id: 'flat_hand',
            name: 'Flat Hand',
            icon: '🤚',
            category: 'Stretch',
            desc: 'Fingers together, fully extended',
            difficulty: 1,
            type: 'flat'
        },
        
        fist: {
            id: 'fist',
            name: 'Gentle Fist',
            icon: '✊',
            category: 'Strength',
            desc: 'Curl all fingers into a fist',
            difficulty: 1,
            type: 'fist'
        }
    };

    // =========================================
    // CATEGORIES
    // =========================================
    
    const CATEGORIES = {
        'Isolation': {
            name: 'Isolation',
            description: 'Single finger control exercises',
            color: '#68c896'
        },
        'Coordination': {
            name: 'Coordination',
            description: 'Multi-finger coordination exercises',
            color: '#64b4e6'
        },
        'Precision': {
            name: 'Precision',
            description: 'Fine motor control exercises',
            color: '#f0c864'
        },
        'Stretch': {
            name: 'Stretch',
            description: 'Flexibility exercises',
            color: '#a8c99b'
        },
        'Strength': {
            name: 'Strength',
            description: 'Grip and strength exercises',
            color: '#e8998d'
        },
        'Advanced': {
            name: 'Advanced',
            description: 'Challenging exercises',
            color: '#c9a8d9'
        }
    };

    // =========================================
    // SESSION BUILDERS
    // =========================================
    
    /**
     * Get all exercises as an array
     */
    function getAllExercises() {
        return Object.values(EXERCISES);
    }
    
    /**
     * Get exercise by ID
     */
    function getExercise(id) {
        return EXERCISES[id] || null;
    }
    
    /**
     * Get exercises by category
     */
    function getByCategory(category) {
        return getAllExercises().filter(e => e.category === category);
    }
    
    /**
     * Get exercises by difficulty
     */
    function getByDifficulty(difficulty) {
        return getAllExercises().filter(e => e.difficulty === difficulty);
    }
    
    /**
     * Get exercises by type
     */
    function getByType(type) {
        return getAllExercises().filter(e => e.type === type);
    }
    
    /**
     * Shuffle array (Fisher-Yates)
     */
    function shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
    
    /**
     * Build a balanced session
     * @param {number} count - Number of exercises (default 8)
     * @returns {Array} Array of exercise objects
     */
    function buildSession(count = 8) {
        const byDiff = (d) => getAllExercises().filter(e => e.difficulty === d);
        
        // Balanced selection: mix of difficulties
        let selected = [];
        
        if (count >= 8) {
            // Standard session: 2 easy, 3 medium, 2 hard, 1 advanced
            selected = [
                ...shuffle(byDiff(1)).slice(0, 2),
                ...shuffle(byDiff(2)).slice(0, 3),
                ...shuffle(byDiff(3)).slice(0, 2),
                ...shuffle(byDiff(4)).slice(0, 1)
            ];
        } else if (count >= 5) {
            // Short session: 1 easy, 2 medium, 2 hard
            selected = [
                ...shuffle(byDiff(1)).slice(0, 1),
                ...shuffle(byDiff(2)).slice(0, 2),
                ...shuffle(byDiff(3)).slice(0, 2)
            ];
        } else {
            // Mini session: just grab a variety
            selected = shuffle(getAllExercises()).slice(0, count);
        }
        
        return shuffle(selected).slice(0, count);
    }
    
    /**
     * Build a session focused on specific category
     */
    function buildCategorySession(category, count = 6) {
        const categoryExercises = getByCategory(category);
        if (categoryExercises.length === 0) {
            return buildSession(count);
        }
        return shuffle(categoryExercises).slice(0, count);
    }
    
    /**
     * Build a session focused on specific type
     */
    function buildTypeSession(type, count = 6) {
        const typeExercises = getByType(type);
        if (typeExercises.length === 0) {
            return buildSession(count);
        }
        return shuffle(typeExercises).slice(0, count);
    }
    
    /**
     * Build a progressive session (easy to hard)
     */
    function buildProgressiveSession(count = 8) {
        const exercises = [];
        const difficultyOrder = [1, 1, 2, 2, 2, 3, 3, 4];
        
        for (let i = 0; i < Math.min(count, difficultyOrder.length); i++) {
            const diff = difficultyOrder[i];
            const available = getByDifficulty(diff).filter(
                e => !exercises.find(ex => ex.id === e.id)
            );
            if (available.length > 0) {
                exercises.push(available[Math.floor(Math.random() * available.length)]);
            }
        }
        
        return exercises;
    }
    
    /**
     * Build a session from specific exercise IDs
     */
    function buildCustomSession(exerciseIds) {
        return exerciseIds
            .map(id => getExercise(id))
            .filter(e => e !== null);
    }

    // =========================================
    // PUBLIC API
    // =========================================
    
    return {
        // Data
        EXERCISES,
        CATEGORIES,
        
        // Getters
        getAllExercises,
        getExercise,
        getByCategory,
        getByDifficulty,
        getByType,
        
        // Session builders
        buildSession,
        buildCategorySession,
        buildTypeSession,
        buildProgressiveSession,
        buildCustomSession,
        
        // Utility
        shuffle,
        
        // Convenience - get exercise count
        get count() {
            return Object.keys(EXERCISES).length;
        }
    };
})();

// Module exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HandHeroExercises;
}
if (typeof window !== 'undefined') {
    window.HandHeroExercises = HandHeroExercises;
}