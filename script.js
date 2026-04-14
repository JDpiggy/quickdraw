class QuickdrawGame {
    constructor() {
        this.screen = document.getElementById('gameScreen');
        this.startButton = document.getElementById('startButton');
        this.timer = document.getElementById('timer');
        this.result = document.getElementById('result');
        this.highScoreDisplay = document.getElementById('highScore');
        this.soundIndicator = document.getElementById('soundIndicator');
        this.startTime = null;
        this.timerInterval = null;
        this.gameActive = false;
        this.highScore = localStorage.getItem('quickdrawHighScore') || null;
        
        // Audio properties
        this.audioContext = null;
        this.microphone = null;
        this.analyser = null;
        this.soundThreshold = 0.05; // Lowered threshold for sound detection
        this.listeningForSound = false;
        
        // Sound effects
        this.boopSound = null;
        this.goSound = null;
        
        this.init();
    }

    init() {
        this.startButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.startGame();
        });
        
        // Add touch support for mobile
        this.startButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.startGame();
        });
        
        // Add spacebar listener
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.gameActive) {
                e.preventDefault();
                this.startGame();
            }
        });
        
        this.updateHighScoreDisplay();
        this.setupAudio();
    }
    
    async setupAudio() {
        try {
            console.log('Setting up audio...');
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Load sound effects
            await this.loadSoundEffects();
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });
            
            console.log('Microphone access granted');
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;
            
            this.microphone.connect(this.analyser);
            console.log('Audio setup complete');
            
            // Test the analyser with time-domain data
            const testBuffer = new Uint8Array(this.analyser.frequencyBinCount);
            this.analyser.getByteTimeDomainData(testBuffer);
            let sum = 0;
            for (let i = 0; i < testBuffer.length; i++) {
                const normalized = (testBuffer[i] - 128) / 128;
                sum += normalized * normalized;
            }
            const rms = Math.sqrt(sum / testBuffer.length);
            console.log('Test audio level (RMS):', rms);
            console.log('Audio context state:', this.audioContext.state);
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Microphone access denied. Please allow microphone access to use sound detection.');
        }
    }
    
    async loadSoundEffects() {
        try {
            // Load boop sound
            const boopResponse = await fetch('boop.mp3');
            const boopArrayBuffer = await boopResponse.arrayBuffer();
            this.boopSound = await this.audioContext.decodeAudioData(boopArrayBuffer);
            console.log('Boop sound loaded');
            
            // Load go sound
            const goResponse = await fetch('go1.mp3');
            const goArrayBuffer = await goResponse.arrayBuffer();
            this.goSound = await this.audioContext.decodeAudioData(goArrayBuffer);
            console.log('Go sound loaded');
        } catch (error) {
            console.error('Error loading sound effects:', error);
        }
    }
    
    playSound(soundBuffer, volume = 1.0) {
        if (!soundBuffer || !this.audioContext) return;
        
        const source = this.audioContext.createBufferSource();
        source.buffer = soundBuffer;
        
        // Add gain control for volume adjustment
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = volume;
        
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        source.start(0);
    }
    
    startListeningForSound() {
        if (!this.analyser) return;
        
        // Resume audio context if suspended
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        this.listeningForSound = true;
        this.soundIndicator.style.display = 'block';
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const checkSound = () => {
            if (!this.listeningForSound) return;
            
            try {
                // Use time-domain data instead of frequency data
                this.analyser.getByteTimeDomainData(dataArray);
                
                // Calculate RMS (Root Mean Square) for volume
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    const normalized = (dataArray[i] - 128) / 128; // Convert to -1 to 1
                    sum += normalized * normalized;
                }
                const rms = Math.sqrt(sum / bufferLength);
                
                // Debug: update indicator with current volume
                this.soundIndicator.textContent = `Listening... Volume: ${rms.toFixed(3)}`;
                
                if (rms > this.soundThreshold) {
                    console.log('Sound detected! Volume:', rms);
                    this.handleSoundTrigger();
                    return;
                }
            } catch (error) {
                console.error('Error checking sound:', error);
                this.soundIndicator.textContent = 'Audio error - check console';
            }
            
            requestAnimationFrame(checkSound);
        };
        
        checkSound();
    }
    
    stopListeningForSound() {
        this.listeningForSound = false;
        this.soundIndicator.style.display = 'none';
    }
    
    handleSoundTrigger() {
        if (!this.gameActive || !this.startTime) return;
        
        if (this.screen.className === 'green') {
            // Capture reaction time immediately
            const reactionTime = (Date.now() - this.startTime) / 1000;
            
            // Stop timer and update display with final time
            clearInterval(this.timerInterval);
            this.timer.textContent = reactionTime.toFixed(4);
            
            this.result.textContent = `Reaction time: ${reactionTime.toFixed(4)} seconds`;
            this.result.style.display = 'block';
            
            // Update high score
            if (!this.highScore || reactionTime < parseFloat(this.highScore)) {
                this.highScore = reactionTime.toFixed(4);
                localStorage.setItem('quickdrawHighScore', this.highScore);
                this.result.textContent += ' NEW HIGH SCORE!';
            }
            
            this.gameActive = false;
            this.startTime = null;
            this.stopListeningForSound();
            
            // Reset after 3 seconds
            setTimeout(() => {
                this.reset();
            }, 3000);
        }
    }

    startGame() {
        // Resume audio context if suspended
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        this.gameActive = true;
        this.startButton.style.display = 'none';
        this.result.style.display = 'none';
        this.timer.textContent = '';
        this.highScoreDisplay.style.display = 'none';
        
        // Red screen phase
        this.screen.className = 'red';
        
        // Wait 2 seconds, then show white dots for 3 seconds
        setTimeout(() => {
            this.showWhiteDots();
        }, 2000);
    }

    showWhiteDots() {
        // Keep screen red and show white dots
        
        // Show white dots for 3 seconds (one per second)
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.createWhiteDot(i);
            }, i * 1000);
        }
        
        // After 3 seconds of white dots, wait random 3-6 seconds then go green
        setTimeout(() => {
            const randomDelay = Math.random() * 3000 + 3000; // 3-6 seconds
            setTimeout(() => {
                this.goGreen();
            }, randomDelay);
        }, 3000);
    }

    createWhiteDot(index) {
        const dot = document.createElement('div');
        dot.className = 'white-dot';
        
        // Responsive dot positioning for mobile
        let dotSpacing = 180;
        if (window.innerWidth <= 768) dotSpacing = 140;
        if (window.innerWidth <= 480) dotSpacing = 100;
        
        const totalWidth = (2 * dotSpacing);
        const startX = (window.innerWidth - totalWidth) / 2;
        const centerY = window.innerHeight / 2;
        
        dot.style.left = (startX + index * dotSpacing) + 'px';
        dot.style.top = centerY + 'px';
        
        this.screen.appendChild(dot);
        
        // Play boop sound when dot appears
        this.playSound(this.boopSound);
        
        // Dots now accumulate - no removal
    }

    goGreen() {
        this.screen.className = 'green';
        this.startTime = Date.now();
        
        // Clear all accumulated dots
        const dots = document.querySelectorAll('.white-dot');
        dots.forEach(dot => dot.remove());
        
        // Play go sound when screen turns green at 300% volume
        this.playSound(this.goSound, 3.0);
        
        // Start timer with more digits
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            this.timer.textContent = (elapsed / 1000).toFixed(4);
        }, 10);
        
        // Start listening for loud sound
        this.startListeningForSound();
    }

    
    reset() {
        this.stopListeningForSound();
        this.screen.className = 'start';
        this.startButton.style.display = 'block';
        this.timer.textContent = '';
        this.result.style.display = 'none';
        this.gameActive = false;
        this.startTime = null;
        
        // Clear any remaining white dots
        const dots = document.querySelectorAll('.white-dot');
        dots.forEach(dot => dot.remove());
        
        // Show high score
        this.updateHighScoreDisplay();
    }
    
    updateHighScoreDisplay() {
        if (this.highScore) {
            this.highScoreDisplay.textContent = `High Score: ${this.highScore} seconds`;
            this.highScoreDisplay.style.display = 'block';
        } else {
            this.highScoreDisplay.style.display = 'none';
        }
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new QuickdrawGame();
});
