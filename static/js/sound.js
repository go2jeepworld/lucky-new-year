/**
 * Lucky New Year! - Sound Manager
 * Handles all game sound effects using Web Audio API
 */

class SoundManager {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.initialized = false;
    }

    /**
     * Initialize the audio context (must be called after user interaction)
     */
    init() {
        if (this.initialized) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            this.initialized = true;
            console.log('Sound Manager initialized');
        } catch (e) {
            console.error('Web Audio API not supported:', e);
            this.enabled = false;
        }
    }

    /**
     * Ensure audio context is running (browsers suspend it by default)
     */
    async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    /**
     * Play a tone with specified frequency and duration
     */
    playTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    /**
     * Play a chord (multiple tones)
     */
    playChord(frequencies, duration, type = 'sine', volume = 0.2) {
        if (!this.enabled || !this.audioContext) return;

        frequencies.forEach(freq => {
            this.playTone(freq, duration, type, volume / frequencies.length);
        });
    }

    /**
     * Sound 1: Room created/joined - Welcome sound
     * A pleasant ascending chord
     */
    playRoomCreated() {
        if (!this.enabled) return;
        this.resume();
        const chord = [523.25, 659.25, 783.99]; // C5, E5, G5 (C major)
        this.playChord(chord, 0.5, 'sine', 0.3);
        setTimeout(() => {
            this.playChord([659.25, 783.99, 987.77], 0.6, 'sine', 0.25); // E5, G5, B5
        }, 100);
    }

    /**
     * Sound 2: Player joined room - Notification sound
     * A gentle ping sound
     */
    playPlayerJoined() {
        if (!this.enabled) return;
        this.resume();
        this.playTone(880, 0.1, 'sine', 0.2); // A5
        setTimeout(() => {
            this.playTone(1108.73, 0.15, 'sine', 0.15); // C#6
        }, 50);
    }

    /**
     * Sound 3: Gained luck point - Success sound
     * A cheerful ascending melody
     */
    playGainedLuck() {
        if (!this.enabled) return;
        this.resume();
        const melody = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        melody.forEach((freq, index) => {
            setTimeout(() => {
                this.playTone(freq, 0.15, 'sine', 0.25);
            }, index * 80);
        });
    }

    /**
     * Sound 4: Wrong quiz answer - Error sound
     * A descending tone
     */
    playWrongAnswer() {
        if (!this.enabled) return;
        this.resume();
        this.playTone(392, 0.2, 'sawtooth', 0.15); // G4
        setTimeout(() => {
            this.playTone(329.63, 0.25, 'sawtooth', 0.12); // E4
        }, 100);
        setTimeout(() => {
            this.playTone(261.63, 0.3, 'sawtooth', 0.1); // C4
        }, 200);
    }

    /**
     * Sound 5: Your Turn - Attention sound
     * A distinctive notification sound
     */
    playYourTurn() {
        if (!this.enabled) return;
        this.resume();
        this.playTone(880, 0.15, 'sine', 0.25); // A5
        setTimeout(() => {
            this.playTone(1108.73, 0.15, 'sine', 0.25); // C#6
        }, 100);
        setTimeout(() => {
            this.playTone(1318.51, 0.2, 'sine', 0.3); // E6
        }, 200);
    }

    /**
     * Sound 6: Winner/Victory - Celebration sound
     * A fanfare-like melody
     */
    playVictory() {
        if (!this.enabled) return;
        this.resume();
        
        const fanfare = [
            [523.25, 0.15], [659.25, 0.15], [783.99, 0.15], [1046.50, 0.2], // C5, E5, G5, C6
            [783.99, 0.15], [1046.50, 0.15], [1318.51, 0.15], [1567.98, 0.3], // G5, C6, E6, G6
            [1046.50, 0.15], [1318.51, 0.15], [1567.98, 0.15], [2093.00, 0.5]  // C6, E6, G6, C7
        ];

        let delay = 0;
        fanfare.forEach(([freq, duration]) => {
            setTimeout(() => {
                this.playTone(freq, duration, 'sine', 0.3);
            }, delay);
            delay += duration * 1000 - 20;
        });

        // Add some sparkle effects
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const sparkleFreq = 2000 + Math.random() * 2000;
                this.playTone(sparkleFreq, 0.1, 'sine', 0.1);
            }, 1000 + i * 200);
        }
    }

    /**
     * Toggle sound on/off
     */
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    /**
     * Check if sound is enabled
     */
    isEnabled() {
        return this.enabled;
    }
}

// Create global instance
const soundManager = new SoundManager();
