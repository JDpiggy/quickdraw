class QuickdrawGame {
    constructor() {
        this.screen = document.getElementById('gameScreen');
        this.startButton = document.getElementById('startButton');
        this.timer = document.getElementById('timer');
        this.result = document.getElementById('result');
        this.highScoreDisplay = document.getElementById('highScore');
        this.soundIndicator = document.getElementById('soundIndicator');
        this.volumeDisplay = document.getElementById('volumeDisplay');
        this.micSelect = document.getElementById('micSelect');
        this.speakerSelect = document.getElementById('speakerSelect');
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
        this.currentMicDeviceId = null;
        this.currentSpeakerDeviceId = null;
        
        // Sound effects
        this.boopSound = null;
        this.goSound = null;
        
        // Volume monitoring
        this.volumeMonitorInterval = null;
        
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
        
        // Add device selection listeners
        this.micSelect.addEventListener('change', (e) => {
            this.currentMicDeviceId = e.target.value;
            this.setupMicrophone();
        });
        
        this.speakerSelect.addEventListener('change', (e) => {
            this.currentSpeakerDeviceId = e.target.value;
            this.setupAudioContext();
        });
        
        this.updateHighScoreDisplay();
        this.setupAudio();
    }
    
    async setupAudio() {
        try {
            console.log('Setting up audio...');
            await this.setupAudioContext();
            await this.enumerateDevices();
            await this.setupMicrophone();
            await this.loadSoundEffects();
            this.startVolumeMonitoring();
        } catch (error) {
            console.error('Error setting up audio:', error);
            alert('Audio setup failed. Please check microphone permissions.');
        }
    }
    
    async setupAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext());
        }
        
        // Set sink ID for speaker selection if supported
        if (this.currentSpeakerDeviceId && this.audioContext.setSinkId) {
            try {
                await this.audioContext.setSinkId(this.currentSpeakerDeviceId);
                console.log('Speaker set to:', this.currentSpeakerDeviceId);
            } catch (error) {
                console.log('Speaker selection not supported or failed:', error);
            }
        }
    }
    
    async enumerateDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            
            // Clear existing options
            this.micSelect.innerHTML = '<option value="">Default</option>';
            this.speakerSelect.innerHTML = '<option value="">Default</option>';
            
            devices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `${device.kind} ${device.deviceId.substr(0, 5)}...`;
                
                if (device.kind === 'audioinput') {
                    this.micSelect.appendChild(option);
                } else if (device.kind === 'audiooutput') {
                    this.speakerSelect.appendChild(option);
                }
            });
            
            console.log('Devices enumerated');
        } catch (error) {
            console.error('Error enumerating devices:', error);
        }
    }
    
    async setupMicrophone() {
        try {
            const constraints = {
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    deviceId: this.currentMicDeviceId ? { exact: this.currentMicDeviceId } : undefined
                }
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('Microphone access granted');
            
            // Stop old microphone if exists
            if (this.microphone) {
                this.microphone.disconnect();
            }
            
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;
            
            this.microphone.connect(this.analyser);
            console.log('Microphone setup complete');
        } catch (error) {
            console.error('Error setting up microphone:', error);
            throw error;
        }
    }
    
    startVolumeMonitoring() {
        if (!this.analyser) return;
        
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const updateVolume = () => {
            if (this.analyser) {
                this.analyser.getByteTimeDomainData(dataArray);
                
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    const normalized = (dataArray[i] - 128) / 128;
                    sum += normalized * normalized;
                }
                const rms = Math.sqrt(sum / bufferLength);
                
                this.volumeDisplay.textContent = `Volume: ${rms.toFixed(3)}`;
            }
            
            this.volumeMonitorInterval = requestAnimationFrame(updateVolume);
        };
        
        updateVolume();
    }
    
    stopVolumeMonitoring() {
        if (this.volumeMonitorInterval) {
            cancelAnimationFrame(this.volumeMonitorInterval);
            this.volumeMonitorInterval = null;
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
    
    // Cleanup on page unload
    cleanup() {
        this.stopVolumeMonitoring();
        this.stopListeningForSound();
        if (this.microphone) {
            this.microphone.disconnect();
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
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
