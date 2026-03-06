// ========================================
// ACCESSALL - MAIN JAVASCRIPT
// Assistive Technology Platform
// ========================================

// ========================================
// 1. GLOBAL STATE & INITIALIZATION
// ========================================

const AppState = {
    // Speech Recognition (Hear Panel)
    recognition: null,
    isListening: false,
    transcript: '',
    
    // Text-to-Speech (Speak Panel)
    synthesis: window.speechSynthesis,
    voices: [],
    isSpeaking: false,
    
    // Smart Stick (See Panel)
    stickConnected: false,
    sensorInterval: null,
    sensorData: {
        distance: 0,
        obstacle: false,
        surface: 'normal'
    },
    
    // SOS System
    sosActive: false,
    sosAlarm: null,
    
    // Settings
    settings: {
        highContrast: false,
        largeFont: false,
        voiceCommands: false
    }
};

// ========================================
// 2. INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('AccessAll Platform Initializing...');
    
    // Initialize all modules
    initSettings();
    initSpeechRecognition();
    initTextToSpeech();
    initSmartStick();
    initSOSSystem();
    initAccessibilityFeatures();
    initVoiceCommands();
    initKeyboardNavigation();
    
    // Load saved settings
    loadSettings();
    
    console.log('AccessAll Platform Ready!');
    
    // Announce ready state for screen readers
    announceToScreenReader('AccessAll Platform is ready. Press Tab to navigate.');
});

// ========================================
// 3. SETTINGS MANAGEMENT
// ========================================

function initSettings() {
    const contrastToggle = document.getElementById('contrastToggle');
    const fontSizeToggle = document.getElementById('fontSizeToggle');
    
    contrastToggle.addEventListener('click', toggleHighContrast);
    fontSizeToggle.addEventListener('click', toggleFontSize);
}

function toggleHighContrast() {
    AppState.settings.highContrast = !AppState.settings.highContrast;
    document.body.classList.toggle('high-contrast', AppState.settings.highContrast);
    saveSettings();
    announceToScreenReader(`High contrast mode ${AppState.settings.highContrast ? 'enabled' : 'disabled'}`);
    vibrateDevice(50);
}

function toggleFontSize() {
    AppState.settings.largeFont = !AppState.settings.largeFont;
    document.body.classList.toggle('large-font', AppState.settings.largeFont);
    saveSettings();
    announceToScreenReader(`Large font mode ${AppState.settings.largeFont ? 'enabled' : 'disabled'}`);
    vibrateDevice(50);
}

function saveSettings() {
    localStorage.setItem('accessall_settings', JSON.stringify(AppState.settings));
}

function loadSettings() {
    const saved = localStorage.getItem('accessall_settings');
    if (saved) {
        AppState.settings = JSON.parse(saved);
        document.body.classList.toggle('high-contrast', AppState.settings.highContrast);
        document.body.classList.toggle('large-font', AppState.settings.largeFont);
    }
}

// ========================================
// 4. SPEECH RECOGNITION (HEAR PANEL)
// ========================================

function initSpeechRecognition() {
    const startBtn = document.getElementById('startHearing');
    const stopBtn = document.getElementById('stopHearing');
    const copyBtn = document.getElementById('copyTranscript');
    const clearBtn = document.getElementById('clearTranscript');
    const transcriptDisplay = document.getElementById('transcriptDisplay');
    
    // Check browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showError('Speech Recognition not supported in this browser');
        startBtn.disabled = true;
        return;
    }
    
    // Initialize Speech Recognition API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    AppState.recognition = new SpeechRecognition();
    
    // Configuration
    AppState.recognition.continuous = true;
    AppState.recognition.interimResults = true;
    AppState.recognition.lang = 'en-US';
    
    // Event Listeners
    AppState.recognition.onstart = () => {
        AppState.isListening = true;
        startBtn.style.display = 'none';
        stopBtn.style.display = 'flex';
        transcriptDisplay.classList.add('active');
        updateStatusDot('hearStatus', true);
        announceToScreenReader('Speech recognition started');
        vibrateDevice([100, 50, 100]);
    };
    
    AppState.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }
        
        if (finalTranscript) {
            AppState.transcript += finalTranscript;
        }
        
        displayTranscript(AppState.transcript, interimTranscript);
    };
    
    AppState.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        showError(`Speech Recognition Error: ${event.error}`);
        stopListening();
    };
    
    AppState.recognition.onend = () => {
        if (AppState.isListening) {
            // Restart if it was not manually stopped
            try {
                AppState.recognition.start();
            } catch (e) {
                console.error('Error restarting recognition:', e);
                stopListening();
            }
        }
    };
    
    // Button Event Listeners
    startBtn.addEventListener('click', startListening);
    stopBtn.addEventListener('click', stopListening);
    copyBtn.addEventListener('click', copyTranscript);
    clearBtn.addEventListener('click', clearTranscript);
}

function startListening() {
    try {
        AppState.recognition.start();
    } catch (e) {
        console.error('Error starting recognition:', e);
        showError('Failed to start speech recognition');
    }
}

function stopListening() {
    AppState.isListening = false;
    if (AppState.recognition) {
        AppState.recognition.stop();
    }
    
    const startBtn = document.getElementById('startHearing');
    const stopBtn = document.getElementById('stopHearing');
    const transcriptDisplay = document.getElementById('transcriptDisplay');
    
    startBtn.style.display = 'flex';
    stopBtn.style.display = 'none';
    transcriptDisplay.classList.remove('active');
    updateStatusDot('hearStatus', false);
    announceToScreenReader('Speech recognition stopped');
    vibrateDevice(100);
}

function displayTranscript(finalText, interimText) {
    const transcriptDisplay = document.getElementById('transcriptDisplay');
    
    if (!finalText && !interimText) {
        transcriptDisplay.innerHTML = `
            <div class="placeholder-text">
                <i class="fas fa-microphone-slash"></i>
                <p>Click "START LISTENING" to begin speech recognition</p>
            </div>
        `;
        return;
    }
    
    transcriptDisplay.innerHTML = `
        <div style="color: #ffffff;">${finalText}</div>
        <div style="color: #6b7394; font-style: italic;">${interimText}</div>
    `;
    
    // Auto-scroll to bottom
    transcriptDisplay.scrollTop = transcriptDisplay.scrollHeight;
}

function copyTranscript() {
    if (!AppState.transcript) {
        showError('No text to copy');
        return;
    }
    
    navigator.clipboard.writeText(AppState.transcript).then(() => {
        showSuccess('Text copied to clipboard!');
        vibrateDevice(50);
    }).catch(err => {
        console.error('Copy failed:', err);
        showError('Failed to copy text');
    });
}

function clearTranscript() {
    AppState.transcript = '';
    displayTranscript('', '');
    announceToScreenReader('Transcript cleared');
    vibrateDevice(50);
}

// ========================================
// 5. TEXT-TO-SPEECH (SPEAK PANEL)
// ========================================

function initTextToSpeech() {
    const textInput = document.getElementById('textToSpeak');
    const speakBtn = document.getElementById('speakBtn');
    const stopSpeakBtn = document.getElementById('stopSpeakBtn');
    const voiceSelect = document.getElementById('voiceSelect');
    const rateControl = document.getElementById('rateControl');
    const pitchControl = document.getElementById('pitchControl');
    const rateValue = document.getElementById('rateValue');
    const pitchValue = document.getElementById('pitchValue');
    
    // Load voices
    loadVoices();
    
    // Voice selection may load asynchronously
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    // Event Listeners
    speakBtn.addEventListener('click', speakText);
    stopSpeakBtn.addEventListener('click', stopSpeaking);
    
    rateControl.addEventListener('input', (e) => {
        rateValue.textContent = parseFloat(e.target.value).toFixed(1);
    });
    
    pitchControl.addEventListener('input', (e) => {
        pitchValue.textContent = parseFloat(e.target.value).toFixed(1);
    });
    
    // Allow Enter key to speak (with Ctrl/Cmd)
    textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            speakText();
        }
    });
}

function loadVoices() {
    AppState.voices = speechSynthesis.getVoices();
    const voiceSelect = document.getElementById('voiceSelect');
    
    if (AppState.voices.length === 0) {
        voiceSelect.innerHTML = '<option>Loading voices...</option>';
        return;
    }
    
    voiceSelect.innerHTML = '';
    
    AppState.voices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${voice.name} (${voice.lang})`;
        
        // Select default English voice
        if (voice.default || voice.lang.startsWith('en')) {
            option.selected = true;
        }
        
        voiceSelect.appendChild(option);
    });
}

function speakText() {
    const textInput = document.getElementById('textToSpeak');
    const text = textInput.value.trim();
    
    if (!text) {
        showError('Please enter text to speak');
        textInput.focus();
        return;
    }
    
    // Stop any ongoing speech
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Get settings
    const voiceSelect = document.getElementById('voiceSelect');
    const rateControl = document.getElementById('rateControl');
    const pitchControl = document.getElementById('pitchControl');
    
    if (AppState.voices[voiceSelect.value]) {
        utterance.voice = AppState.voices[voiceSelect.value];
    }
    
    utterance.rate = parseFloat(rateControl.value);
    utterance.pitch = parseFloat(pitchControl.value);
    utterance.volume = 1.0;
    
    // Event handlers
    utterance.onstart = () => {
        AppState.isSpeaking = true;
        updateStatusDot('speakStatus', true);
        announceToScreenReader('Speaking text');
        vibrateDevice([50, 50, 50]);
    };
    
    utterance.onend = () => {
        AppState.isSpeaking = false;
        updateStatusDot('speakStatus', false);
        announceToScreenReader('Finished speaking');
    };
    
    utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        AppState.isSpeaking = false;
        updateStatusDot('speakStatus', false);
        showError(`Speech Error: ${event.error}`);
    };
    
    // Speak
    speechSynthesis.speak(utterance);
}

function stopSpeaking() {
    speechSynthesis.cancel();
    AppState.isSpeaking = false;
    updateStatusDot('speakStatus', false);
    announceToScreenReader('Stopped speaking');
    vibrateDevice(100);
}

// ========================================
// 6. SMART STICK SENSOR INTERFACE
// ========================================

function initSmartStick() {
    const connectBtn = document.getElementById('connectStick');
    const disconnectBtn = document.getElementById('disconnectStick');
    
    connectBtn.addEventListener('click', connectStick);
    disconnectBtn.addEventListener('click', disconnectStick);
}

function connectStick() {
    if (AppState.stickConnected) return;
    
    AppState.stickConnected = true;
    
    const connectBtn = document.getElementById('connectStick');
    const disconnectBtn = document.getElementById('disconnectStick');
    
    connectBtn.style.display = 'none';
    disconnectBtn.style.display = 'inline-flex';
    
    updateStatusDot('stickStatus', true);
    announceToScreenReader('Smart stick connected');
    vibrateDevice([100, 50, 100, 50, 100]);
    
    // Start simulated sensor data stream
    startSensorSimulation();
    
    showSuccess('Smart Stick Connected!');
}

function disconnectStick() {
    if (!AppState.stickConnected) return;
    
    AppState.stickConnected = false;
    
    const connectBtn = document.getElementById('connectStick');
    const disconnectBtn = document.getElementById('disconnectStick');
    
    connectBtn.style.display = 'flex';
    disconnectBtn.style.display = 'none';
    
    updateStatusDot('stickStatus', false);
    announceToScreenReader('Smart stick disconnected');
    vibrateDevice(200);
    
    // Stop sensor simulation
    stopSensorSimulation();
    
    // Reset display
    document.getElementById('distanceValue').textContent = '--';
    document.getElementById('obstacleValue').textContent = 'CLEAR';
    document.getElementById('surfaceValue').textContent = 'NORMAL';
    document.getElementById('distanceBar').style.width = '0%';
}

function startSensorSimulation() {
    // Simulate sensor readings every 500ms
    AppState.sensorInterval = setInterval(() => {
        updateSensorData();
    }, 500);
}

function stopSensorSimulation() {
    if (AppState.sensorInterval) {
        clearInterval(AppState.sensorInterval);
        AppState.sensorInterval = null;
    }
}

function updateSensorData() {
    // Simulate realistic sensor data
    const distance = Math.floor(Math.random() * 200) + 10; // 10-210 cm
    const surfaces = ['normal', 'stairs', 'slope', 'wet', 'gravel'];
    const surface = surfaces[Math.floor(Math.random() * surfaces.length)];
    
    AppState.sensorData.distance = distance;
    AppState.sensorData.surface = surface;
    AppState.sensorData.obstacle = distance < 50;
    
    // Update display
    const distanceValue = document.getElementById('distanceValue');
    const obstacleValue = document.getElementById('obstacleValue');
    const surfaceValue = document.getElementById('surfaceValue');
    const distanceBar = document.getElementById('distanceBar');
    
    distanceValue.textContent = `${distance} cm`;
    surfaceValue.textContent = surface.toUpperCase();
    
    // Update distance bar (inverted - closer = more full)
    const barWidth = Math.max(0, 100 - (distance / 2));
    distanceBar.style.width = `${barWidth}%`;
    
    // Obstacle detection
    if (AppState.sensorData.obstacle) {
        obstacleValue.textContent = '⚠️ OBSTACLE DETECTED!';
        obstacleValue.style.color = '#ff3366';
        
        // Audio alert
        playObstacleAlert(distance);
        
        // Log alert
        logAlert('danger', `Obstacle at ${distance}cm!`);
        
        // Vibrate
        vibrateDevice([200, 100, 200]);
        
        // Voice alert (throttled)
        if (Math.random() < 0.3) { // 30% chance to avoid spam
            speakAlert(`Warning! Obstacle detected at ${distance} centimeters!`);
        }
    } else {
        obstacleValue.textContent = 'CLEAR';
        obstacleValue.style.color = '#00ff88';
    }
    
    // Surface warnings
    if (surface === 'stairs' || surface === 'slope') {
        logAlert('warning', `${surface.toUpperCase()} detected ahead`);
        if (Math.random() < 0.2) {
            speakAlert(`Caution! ${surface} ahead.`);
        }
    }
    
    // Random SOS trigger (very rare - 0.5% chance)
    if (Math.random() < 0.005) {
        triggerSOS();
    }
}

function playObstacleAlert(distance) {
    // Create audio context for beeping alert
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Frequency increases as distance decreases
    const frequency = 200 + (200 - distance) * 5;
    oscillator.frequency.value = Math.max(200, Math.min(2000, frequency));
    
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
}

function speakAlert(message) {
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1.2;
    utterance.pitch = 1.2;
    utterance.volume = 1.0;
    speechSynthesis.speak(utterance);
}

function logAlert(type, message) {
    const alertLog = document.getElementById('alertLog');
    const timestamp = new Date().toLocaleTimeString();
    
    const alertItem = document.createElement('div');
    alertItem.className = `alert-item ${type}`;
    alertItem.innerHTML = `
        <i class="fas fa-triangle-exclamation"></i>
        <span><strong>${timestamp}</strong> - ${message}</span>
    `;
    
    alertLog.prepend(alertItem);
    
    // Keep only last 10 alerts
    while (alertLog.children.length > 10) {
        alertLog.removeChild(alertLog.lastChild);
    }
}

// ========================================
// 7. SOS EMERGENCY ALERT SYSTEM
// ========================================

function initSOSSystem() {
    const testSOSBtn = document.getElementById('testSOS');
    const closeSOSBtn = document.getElementById('closeSOS');
    const shareLocationBtn = document.getElementById('shareLocation');
    
    testSOSBtn.addEventListener('click', triggerSOS);
    closeSOSBtn.addEventListener('click', dismissSOS);
    shareLocationBtn.addEventListener('click', shareLocation);
    
    // Initialize audio alarm
    AppState.sosAlarm = document.getElementById('sosAlarm');
}

function triggerSOS() {
    if (AppState.sosActive) return;
    
    AppState.sosActive = true;
    
    const overlay = document.getElementById('sosOverlay');
    overlay.style.display = 'flex';
    
    // Play alarm sound
    if (AppState.sosAlarm) {
        AppState.sosAlarm.play().catch(err => {
            console.error('Failed to play alarm:', err);
        });
    }
    
    // Create loud beeping alarm
    startSOSAlarm();
    
    // Continuous vibration
    startSOSVibration();
    
    // Voice alert
    speakEmergencyAlert();
    
    // Get location
    getEmergencyLocation();
    
    // Announce to screen reader
    announceToScreenReader('EMERGENCY SOS ACTIVATED! Help is being requested!');
    
    console.log('🚨 EMERGENCY SOS ACTIVATED');
}

function dismissSOS() {
    AppState.sosActive = false;
    
    const overlay = document.getElementById('sosOverlay');
    overlay.style.display = 'none';
    
    // Stop alarm
    if (AppState.sosAlarm) {
        AppState.sosAlarm.pause();
        AppState.sosAlarm.currentTime = 0;
    }
    
    stopSOSAlarm();
    stopSOSVibration();
    
    speechSynthesis.cancel();
    
    announceToScreenReader('SOS alert dismissed. You are safe.');
    vibrateDevice([100, 50, 100]);
    
    showSuccess('SOS Alert Dismissed');
}

function startSOSAlarm() {
    // Create loud beeping sound
    if (!window.sosAlarmInterval) {
        window.sosAlarmInterval = setInterval(() => {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 1000;
            oscillator.type = 'square';
            gainNode.gain.value = 0.5;
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);
        }, 600);
    }
}

function stopSOSAlarm() {
    if (window.sosAlarmInterval) {
        clearInterval(window.sosAlarmInterval);
        window.sosAlarmInterval = null;
    }
}

function startSOSVibration() {
    if ('vibrate' in navigator && !window.sosVibrationInterval) {
        window.sosVibrationInterval = setInterval(() => {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }, 1000);
    }
}

function stopSOSVibration() {
    if (window.sosVibrationInterval) {
        clearInterval(window.sosVibrationInterval);
        window.sosVibrationInterval = null;
    }
    if ('vibrate' in navigator) {
        navigator.vibrate(0);
    }
}

function speakEmergencyAlert() {
    const message = 'Emergency! Emergency! S O S activated! Help is being requested!';
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 0.9;
    utterance.pitch = 1.5;
    utterance.volume = 1.0;
    
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
    
    // Repeat every 10 seconds
    setTimeout(() => {
        if (AppState.sosActive) {
            speakEmergencyAlert();
        }
    }, 10000);
}

function getEmergencyLocation() {
    const locationDisplay = document.getElementById('sosLocation');
    
    if (!('geolocation' in navigator)) {
        locationDisplay.innerHTML = `
            <i class="fas fa-times-circle"></i>
            Geolocation not supported in this browser
        `;
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude.toFixed(6);
            const lon = position.coords.longitude.toFixed(6);
            const accuracy = position.coords.accuracy.toFixed(0);
            
            locationDisplay.innerHTML = `
                <strong>Latitude:</strong> ${lat}<br>
                <strong>Longitude:</strong> ${lon}<br>
                <strong>Accuracy:</strong> ±${accuracy} meters<br>
                <a href="https://www.google.com/maps?q=${lat},${lon}" target="_blank" style="color: #00d4ff; text-decoration: underline;">
                    <i class="fas fa-map-marker-alt"></i> Open in Maps
                </a>
            `;
            
            // Save location for sharing
            window.emergencyLocation = { lat, lon, accuracy };
        },
        (error) => {
            console.error('Geolocation error:', error);
            locationDisplay.innerHTML = `
                <i class="fas fa-exclamation-circle"></i>
                Unable to get location: ${error.message}
            `;
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

function shareLocation() {
    if (!window.emergencyLocation) {
        showError('Location not available yet');
        return;
    }
    
    const { lat, lon } = window.emergencyLocation;
    const message = `EMERGENCY! I need help! My location: https://www.google.com/maps?q=${lat},${lon}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Emergency Location',
            text: message
        }).then(() => {
            showSuccess('Location shared!');
        }).catch(err => {
            console.error('Share failed:', err);
            copyToClipboard(message);
        });
    } else {
        copyToClipboard(message);
    }
}

// ========================================
// 8. ACCESSIBILITY FEATURES
// ========================================

function initAccessibilityFeatures() {
    // Already initialized in initSettings
    // Additional accessibility features can be added here
}

function vibrateDevice(pattern) {
    if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
}

function announceToScreenReader(message) {
    // Create or get announcement element
    let announcer = document.getElementById('screenReaderAnnouncer');
    if (!announcer) {
        announcer = document.createElement('div');
        announcer.id = 'screenReaderAnnouncer';
        announcer.setAttribute('role', 'status');
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.style.position = 'absolute';
        announcer.style.left = '-10000px';
        announcer.style.width = '1px';
        announcer.style.height = '1px';
        announcer.style.overflow = 'hidden';
        document.body.appendChild(announcer);
    }
    
    // Clear and set new message
    announcer.textContent = '';
    setTimeout(() => {
        announcer.textContent = message;
    }, 100);
}

function updateStatusDot(id, active) {
    const dot = document.getElementById(id);
    if (dot) {
        dot.classList.toggle('active', active);
        dot.classList.toggle('inactive', !active);
        
        const label = dot.getAttribute('aria-label').split(':')[0];
        dot.setAttribute('aria-label', `${label}: ${active ? 'Active' : 'Inactive'}`);
    }
}

// ========================================
// 9. VOICE COMMANDS
// ========================================

function initVoiceCommands() {
    const voiceCommandBtn = document.getElementById('voiceCommandBtn');
    const modal = document.getElementById('voiceCommandModal');
    const closeModal = modal.querySelector('.close-modal');
    const startVoiceCommand = document.getElementById('startVoiceCommand');
    
    voiceCommandBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
    });
    
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    startVoiceCommand.addEventListener('click', () => {
        modal.style.display = 'none';
        startVoiceCommandListening();
    });
}

function startVoiceCommandListening() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showError('Voice commands not supported in this browser');
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
        announceToScreenReader('Voice command listening started. Say a command.');
        vibrateDevice([50, 50, 50]);
    };
    
    recognition.onresult = (event) => {
        const command = event.results[0][0].transcript.toLowerCase();
        console.log('Voice command:', command);
        executeVoiceCommand(command);
    };
    
    recognition.onerror = (event) => {
        console.error('Voice command error:', event.error);
        showError(`Voice command error: ${event.error}`);
    };
    
    recognition.start();
}

function executeVoiceCommand(command) {
    vibrateDevice(100);
    
    if (command.includes('hear') || command.includes('listen')) {
        startListening();
        announceToScreenReader('Starting speech recognition');
    } else if (command.includes('speak') || command.includes('talk')) {
        document.getElementById('textToSpeak').focus();
        announceToScreenReader('Text to speech input focused');
    } else if (command.includes('stick') || command.includes('connect')) {
        connectStick();
        announceToScreenReader('Connecting smart stick');
    } else if (command.includes('help') || command.includes('emergency') || command.includes('sos')) {
        triggerSOS();
    } else if (command.includes('contrast')) {
        toggleHighContrast();
    } else if (command.includes('stop')) {
        stopListening();
        stopSpeaking();
        announceToScreenReader('Stopped all actions');
    } else {
        announceToScreenReader('Command not recognized. Try again.');
        showError('Command not recognized');
    }
}

// ========================================
// 10. KEYBOARD NAVIGATION
// ========================================

function initKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        // Global shortcuts
        if (e.altKey) {
            switch(e.key) {
                case 'h':
                    e.preventDefault();
                    startListening();
                    break;
                case 's':
                    e.preventDefault();
                    document.getElementById('textToSpeak').focus();
                    break;
                case 'c':
                    e.preventDefault();
                    connectStick();
                    break;
                case 'e':
                    e.preventDefault();
                    triggerSOS();
                    break;
            }
        }
        
        // Escape key
        if (e.key === 'Escape') {
            stopListening();
            stopSpeaking();
            dismissSOS();
            document.getElementById('voiceCommandModal').style.display = 'none';
        }
    });
}

// ========================================
// 11. UTILITY FUNCTIONS
// ========================================

function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? '#00ff88' : type === 'error' ? '#ff3366' : '#00d4ff'};
        color: #0a0e27;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        font-weight: 600;
        font-size: 18px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        z-index: 9998;
        animation: slideIn 0.3s ease;
        max-width: 400px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
    
    // Add CSS animations if not exists
    if (!document.getElementById('notificationStyles')) {
        const style = document.createElement('style');
        style.id = 'notificationStyles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showSuccess('Copied to clipboard!');
    }).catch(err => {
        console.error('Copy failed:', err);
        
        // Fallback method
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            showSuccess('Copied to clipboard!');
        } catch (err) {
            showError('Failed to copy');
        }
        
        document.body.removeChild(textArea);
    });
}

// ========================================
// 12. ERROR HANDLING & LOGGING
// ========================================

window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
}); 
navigator.geolocation.getCurrentPosition((pos) => {
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;

  const map = L.map("map").setView([lat, lng], 15);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  // User marker
  L.marker([lat, lng]).addTo(map).bindPopup("You are here");

  const hour = new Date().getHours();

  places.forEach(place => {
    const crowd = getCrowdLevel(place.type, hour);
    const color = crowdColor(crowd);

    L.circle([place.lat, place.lng], {
      radius: 150,
      color: color,
      fillColor: color,
      fillOpacity: 0.4
    })
    .addTo(map)
    .bindPopup(`
      <b>${place.name}</b><br>
      Crowd Level: <b style="color:${color}">${crowd.toUpperCase()}</b>
    `);
  });
});


const places = [
  { name: "Main Bus Stand", type: "bus", lat: 26.2183, lng: 78.1828 },
  { name: "City Hospital", type: "hospital", lat: 26.2201, lng: 78.1805 },
  { name: "Local Market", type: "market", lat: 26.2169, lng: 78.1852 }
];

function getCrowdLevel(type, hour) {
  if (type === "bus" && (hour >= 8 && hour <= 10 || hour >= 17 && hour <= 20))
    return "high";

  if (type === "market" && hour >= 18 && hour <= 21)
    return "high";

  if (type === "hospital" && hour >= 9 && hour <= 13)
    return "medium";

  return "low";
}

function crowdColor(level) {
  if (level === "high") return "red";
  if (level === "medium") return "orange";
  return "green";
}

const hour = new Date().getHours();

places.forEach(place => {
  const crowd = getCrowdLevel(place.type, hour);
  const color = crowdColor(crowd);

  L.circle([place.lat, place.lng], {
    radius: 200,
    color: color,
    fillColor: color,
    fillOpacity: 0.4
  })
  .addTo(map)
  .bindPopup(`
    <b>${place.name}</b><br>
    Type: ${place.type}<br>
    Crowd: <b style="color:${color}">${crowd.toUpperCase()}</b>
  `);
});
// ========================================
// END OF ACCESSALL MAIN JAVASCRIPT
// ========================================
