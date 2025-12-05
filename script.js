class CountdownTimer {
    constructor() {
        this.initializeElements();
        this.initializeState();
        this.setupEventListeners();
        this.checkNotificationPermission();
        this.createAudioElement();
        this.setupServiceWorker();
    }

    initializeElements() {
        this.timeInput = document.getElementById('timeInput');
        this.minutesDisplay = document.getElementById('minutes');
        this.secondsDisplay = document.getElementById('seconds');
        this.timeLabel = document.getElementById('timeLabel');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.decreaseBtn = document.getElementById('decreaseBtn');
        this.increaseBtn = document.getElementById('increaseBtn');
        this.enableNotification = document.getElementById('enableNotification');
        this.enableSound = document.getElementById('enableSound');
        this.testNotification = document.getElementById('testNotification');
        this.testSound = document.getElementById('testSound');
        this.soundToggle = document.getElementById('soundToggle');
        this.notifyToggle = document.getElementById('notifyToggle');
        this.permissionStatus = document.querySelector('.status-text');
        this.progressRing = document.querySelector('.progress-ring-fill');
        this.quickTimeButtons = document.querySelectorAll('.quick-time');
    }

    initializeState() {
        this.totalSeconds = 90;
        this.remainingSeconds = 90;
        this.isRunning = false;
        this.timerInterval = null;
        this.circumference = 879.2;
        this.notificationPermission = 'default';
        this.audioContext = null;
        this.notificationSupported = 'Notification' in window;
        this.hasNotificationSupport = false;
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.toggleTimer());
        this.pauseBtn.addEventListener('click', () => this.pauseTimer());
        this.resetBtn.addEventListener('click', () => this.resetTimer());
        
        this.decreaseBtn.addEventListener('click', () => this.adjustTime(-10));
        this.increaseBtn.addEventListener('click', () => this.adjustTime(10));
        
        this.timeInput.addEventListener('change', (e) => this.updateTimeFromInput(e.target.value));
        this.timeInput.addEventListener('input', (e) => this.previewTime(e.target.value));
        
        this.testNotification.addEventListener('click', () => this.sendTestNotification());
        this.testSound.addEventListener('click', () => this.playTestSound());
        
        this.soundToggle.addEventListener('click', () => this.toggleSound());
        this.notifyToggle.addEventListener('click', () => this.toggleNotifications());
        
        this.quickTimeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const seconds = parseInt(e.target.dataset.seconds);
                this.setQuickTime(seconds);
            });
        });
        
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        this.enableNotification.addEventListener('change', (e) => {
            if (e.target.checked && this.notificationPermission === 'default') {
                this.requestNotificationPermission();
            }
        });
    }

    setupServiceWorker() {
        // Only register service worker if on HTTPS or localhost
        if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    console.log('ServiceWorker registered:', registration);
                    this.hasNotificationSupport = true;
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed:', err);
                    this.hasNotificationSupport = false;
                });
        } else {
            this.hasNotificationSupport = true; // Can still use basic notifications
        }
    }

    createAudioElement() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not fully supported');
        }
    }

    createBeepSound(frequency = 800, duration = 0.5) {
        if (!this.audioContext) return;
        
        try {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (error) {
            console.log('Audio error:', error);
        }
    }

    checkNotificationPermission() {
        if (!this.notificationSupported) {
            this.permissionStatus.textContent = 'Not Supported';
            this.permissionStatus.style.color = '#f72585';
            this.enableNotification.disabled = true;
            this.testNotification.disabled = true;
            this.enableNotification.checked = false;
            return;
        }

        this.notificationPermission = Notification.permission;
        this.updatePermissionStatus();
        
        if (this.notificationPermission === 'granted') {
            this.enableNotification.checked = true;
            this.notifyToggle.style.background = 'var(--primary)';
            this.notifyToggle.style.color = 'white';
        } else if (this.notificationPermission === 'denied') {
            this.enableNotification.checked = false;
            this.enableNotification.disabled = true;
            this.testNotification.disabled = true;
        }
    }

    updatePermissionStatus() {
        let statusText, statusColor;
        
        switch(this.notificationPermission) {
            case 'granted':
                statusText = 'Allowed ✓';
                statusColor = '#4cc9f0';
                this.testNotification.disabled = false;
                this.enableNotification.disabled = false;
                break;
            case 'denied':
                statusText = 'Blocked ✗';
                statusColor = '#f72585';
                this.testNotification.disabled = true;
                this.enableNotification.disabled = true;
                break;
            case 'default':
                statusText = 'Click to Enable';
                statusColor = '#f8961e';
                this.testNotification.disabled = false;
                this.enableNotification.disabled = false;
                break;
            default:
                statusText = 'Unknown';
                statusColor = '#6c757d';
        }
        
        this.permissionStatus.textContent = statusText;
        this.permissionStatus.style.color = statusColor;
        this.permissionStatus.style.fontWeight = 'bold';
    }

    async requestNotificationPermission() {
        if (!this.notificationSupported) {
            alert('❌ Notifications are not supported in your browser.');
            return false;
        }

        if (this.notificationPermission === 'denied') {
            alert('🔕 Notifications are blocked.\nPlease enable them in your browser settings.');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            this.notificationPermission = permission;
            this.updatePermissionStatus();
            
            if (permission === 'granted') {
                this.enableNotification.checked = true;
                this.notifyToggle.style.background = 'var(--primary)';
                this.notifyToggle.style.color = 'white';
                this.showPermissionGrantedMessage();
                return true;
            } else {
                this.enableNotification.checked = false;
                return false;
            }
        } catch (error) {
            console.log('Notification permission error:', error);
            return false;
        }
    }

    showPermissionGrantedMessage() {
        const message = document.createElement('div');
        message.className = 'notification-message success';
        message.innerHTML = '<i class="fas fa-check-circle"></i> Notifications enabled!';
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.classList.add('hide');
            setTimeout(() => message.remove(), 300);
        }, 3000);
    }

    showNotificationError(message) {
        const errorMsg = document.createElement('div');
        errorMsg.className = 'notification-message error';
        errorMsg.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
        document.body.appendChild(errorMsg);
        
        setTimeout(() => {
            errorMsg.classList.add('hide');
            setTimeout(() => errorMsg.remove(), 300);
        }, 5000);
    }

    adjustTime(seconds) {
        let newTime = parseInt(this.timeInput.value) + seconds;
        newTime = Math.max(1, Math.min(3600, newTime));
        this.timeInput.value = newTime;
        this.updateTimeFromInput(newTime);
        this.createBeepSound(300, 0.1);
    }

    updateTimeFromInput(value) {
        const seconds = parseInt(value) || 90;
        this.totalSeconds = Math.max(1, Math.min(3600, seconds));
        this.remainingSeconds = this.totalSeconds;
        this.updateDisplay();
        this.updateProgressRing();
        this.timeLabel.textContent = 'READY';
        this.timeLabel.style.color = '#6c757d';
    }

    previewTime(value) {
        const seconds = parseInt(value) || 90;
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        this.minutesDisplay.textContent = minutes.toString().padStart(2, '0');
        this.secondsDisplay.textContent = secs.toString().padStart(2, '0');
    }

    setQuickTime(seconds) {
        this.timeInput.value = seconds;
        this.updateTimeFromInput(seconds);
        this.createBeepSound(500, 0.1);
        
        const button = event.currentTarget;
        button.classList.add('quick-time-active');
        setTimeout(() => {
            button.classList.remove('quick-time-active');
        }, 300);
    }

    toggleTimer() {
        if (this.isRunning) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    }

    startTimer() {
        if (this.remainingSeconds <= 0) {
            this.resetTimer();
            return;
        }

        this.isRunning = true;
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.timeInput.disabled = true;
        this.timeLabel.textContent = 'RUNNING';
        this.timeLabel.style.color = '#4361ee';
        this.createBeepSound(600, 0.1);

        this.timerInterval = setInterval(() => {
            this.remainingSeconds--;
            this.updateDisplay();
            this.updateProgressRing();

            if (this.remainingSeconds <= 0) {
                this.timerComplete();
            }
            
            if (this.remainingSeconds <= 5 && this.remainingSeconds > 0) {
                this.createBeepSound(1200, 0.1);
            }
        }, 1000);
    }

    pauseTimer() {
        this.isRunning = false;
        clearInterval(this.timerInterval);
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.timeLabel.textContent = 'PAUSED';
        this.timeLabel.style.color = '#f8961e';
        this.createBeepSound(400, 0.1);
    }

    resetTimer() {
        this.isRunning = false;
        clearInterval(this.timerInterval);
        this.remainingSeconds = this.totalSeconds;
        this.updateDisplay();
        this.updateProgressRing();
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.timeInput.disabled = false;
        this.timeLabel.textContent = 'READY';
        this.timeLabel.style.color = '#6c757d';
        this.createBeepSound(200, 0.1);
    }

    updateDisplay() {
        const minutes = Math.floor(this.remainingSeconds / 60);
        const seconds = this.remainingSeconds % 60;
        this.minutesDisplay.textContent = minutes.toString().padStart(2, '0');
        this.secondsDisplay.textContent = seconds.toString().padStart(2, '0');
    }

    updateProgressRing() {
        const progress = this.circumference - (this.remainingSeconds / this.totalSeconds) * this.circumference;
        this.progressRing.style.strokeDashoffset = progress;
        
        let color;
        if (this.remainingSeconds > this.totalSeconds * 0.5) {
            color = '#4cc9f0';
        } else if (this.remainingSeconds > this.totalSeconds * 0.25) {
            color = '#f8961e';
        } else {
            color = '#f72585';
        }
        this.progressRing.style.stroke = color;
    }

    timerComplete() {
        clearInterval(this.timerInterval);
        this.isRunning = false;
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.timeInput.disabled = false;
        this.timeLabel.textContent = 'TIME\'S UP!';
        this.timeLabel.style.color = '#f72585';
        
        document.body.classList.add('flash');
        setTimeout(() => {
            document.body.classList.remove('flash');
        }, 2000);

        if (this.enableSound.checked) {
            this.playCompletionSound();
        }

        if (this.enableNotification.checked) {
            this.sendCompletionNotification();
        }
    }

    sendCompletionNotification() {
        if (!this.notificationSupported) {
            console.log('Notifications not supported');
            this.showNotificationError('Notifications not supported in your browser');
            return;
        }

        if (this.notificationPermission !== 'granted') {
            console.log('Notification permission not granted');
            this.showNotificationError('Please enable notifications first');
            return;
        }

        const options = {
            body: `Timer for ${this.formatTime(this.totalSeconds)} has finished!`,
            icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDZ2Nmw0IDJtNi0yYTkgOSAwIDExLTE4IDAgOSA5IDAgMDExOCAweiI+PC9wYXRoPjwvc3ZnPg==',
            badge: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDZ2Nmw0IDJtNi0yYTkgOSAwIDExLTE4IDAgOSA5IDAgMDExOCAweiI+PC9wYXRoPjwvc3ZnPg==',
            tag: 'timer-complete',
            requireInteraction: true,
            silent: false
        };

        try {
            const notification = new Notification('⏱️ Timer Complete!', options);
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
            
            notification.onerror = (error) => {
                console.error('Notification error:', error);
                this.showNotificationError('Failed to show notification');
            };
            
            setTimeout(() => {
                try {
                    notification.close();
                } catch (e) {
                    // Ignore close errors
                }
            }, 10000);
            
            console.log('Timer completion notification sent successfully');
            
        } catch (error) {
            console.error('Notification creation error:', error);
            this.showNotificationError('Could not create notification');
        }
    }

    async sendTestNotification() {
        if (!this.notificationSupported) {
            alert('❌ Notifications are not supported in your browser.');
            return;
        }

        if (this.notificationPermission === 'denied') {
            alert('🔕 Notifications are blocked.\nPlease enable them in your browser settings.');
            return;
        }

        if (this.notificationPermission === 'default') {
            const granted = await this.requestNotificationPermission();
            if (!granted) {
                return;
            }
        }

        const options = {
            body: 'This is a test notification from QuickTimer!',
            icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTkgMTJsMiAyIDQtNCI+PC9wYXRoPjwvc3ZnPg==',
            badge: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTkgMTJsMiAyIDQtNCI+PC9wYXRoPjwvc3ZnPg==',
            tag: 'test-notification',
            requireInteraction: false,
            silent: false
        };

        try {
            const notification = new Notification('🔔 Test Notification', options);
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
            
            this.testNotification.classList.add('pulse');
            setTimeout(() => {
                this.testNotification.classList.remove('pulse');
            }, 500);
            
            setTimeout(() => {
                try {
                    notification.close();
                } catch (e) {
                    // Ignore close errors
                }
            }, 5000);
            
            console.log('Test notification sent successfully');
            
        } catch (error) {
            console.error('Test notification error:', error);
            this.showNotificationError('Failed to send test notification');
        }
    }

    playCompletionSound() {
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.createBeepSound(800 + (i * 100), 0.3);
            }, i * 500);
        }
    }

    playTestSound() {
        this.createBeepSound(600, 0.5);
        this.testSound.classList.add('pulse');
        setTimeout(() => {
            this.testSound.classList.remove('pulse');
        }, 500);
    }

    toggleSound() {
        this.enableSound.checked = !this.enableSound.checked;
        const icon = this.soundToggle.querySelector('i');
        if (this.enableSound.checked) {
            icon.className = 'fas fa-volume-up';
            this.soundToggle.style.background = 'var(--primary)';
            this.soundToggle.style.color = 'white';
        } else {
            icon.className = 'fas fa-volume-mute';
            this.soundToggle.style.background = 'var(--light)';
            this.soundToggle.style.color = 'var(--primary)';
        }
        this.createBeepSound(500, 0.1);
    }

    toggleNotifications() {
        if (this.notificationPermission === 'default') {
            this.requestNotificationPermission();
        } else if (this.notificationPermission === 'granted') {
            this.enableNotification.checked = !this.enableNotification.checked;
            this.updateToggleButton();
        }
        this.createBeepSound(400, 0.1);
    }

    updateToggleButton() {
        const icon = this.notifyToggle.querySelector('i');
        if (this.enableNotification.checked && this.notificationPermission === 'granted') {
            icon.className = 'fas fa-bell';
            this.notifyToggle.style.background = 'var(--primary)';
            this.notifyToggle.style.color = 'white';
        } else {
            icon.className = 'fas fa-bell-slash';
            this.notifyToggle.style.background = 'var(--light)';
            this.notifyToggle.style.color = 'var(--primary)';
        }
    }

    formatTime(seconds) {
        if (seconds < 60) {
            return `${seconds} second${seconds !== 1 ? 's' : ''}`;
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        if (remainingSeconds === 0) {
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        }
        return `${minutes} min ${remainingSeconds} sec`;
    }

    handleKeyboardShortcuts(e) {
        if (e.target === this.timeInput) return;

        switch(e.key) {
            case ' ':
            case 'Spacebar':
                e.preventDefault();
                this.toggleTimer();
                break;
            case 'r':
            case 'R':
                if (e.ctrlKey || e.metaKey) return;
                e.preventDefault();
                this.resetTimer();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.adjustTime(10);
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.adjustTime(-10);
                break;
            case 't':
            case 'T':
                if (e.ctrlKey) return;
                e.preventDefault();
                this.sendTestNotification();
                break;
            case 's':
            case 'S':
                if (e.ctrlKey) return;
                e.preventDefault();
                this.playTestSound();
                break;
            case 'n':
            case 'N':
                if (e.ctrlKey) return;
                e.preventDefault();
                this.toggleNotifications();
                break;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const timer = new CountdownTimer();
    
    console.log('QuickTimer loaded');
    console.log('Notification support:', 'Notification' in window);
    console.log('Notification permission:', Notification.permission);
    console.log('Protocol:', location.protocol);
    console.log('Hostname:', location.hostname);
});