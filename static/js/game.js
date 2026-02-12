/**
 * Lucky New Year! - Lobby Page JavaScript
 * Handles room creation, joining, and navigation
 */

// Socket.IO connection
const socket = io();

// DOM Elements
const playerNameInput = document.getElementById('playerName');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const joinRoomSection = document.getElementById('joinRoomSection');
const roomCodeInput = document.getElementById('roomCode');
const confirmJoinBtn = document.getElementById('confirmJoinBtn');
const cancelJoinBtn = document.getElementById('cancelJoinBtn');
const toastContainer = document.getElementById('toastContainer');

// Card definitions for display
const CARDS = {
    dumpling: { name: 'Dumpling', icon: '🥟', effect: '+1 Luck Point' },
    panda: { name: 'Panda', icon: '🐼', effect: 'Peek at hand' },
    red_envelope: { name: 'Red Envelope', icon: '🧧', effect: 'Draw 2 cards' },
    great_wall: { name: 'Great Wall', icon: '🏯', effect: 'Block effect' },
    dragon_dance: { name: 'Dragon Dance', icon: '🐉', effect: 'Quiz for all' },
    lantern: { name: 'Lantern', icon: '🏮', effect: 'Check progress' },
    chopsticks: { name: 'Chopsticks', icon: '🥢', effect: 'Swap hands' },
    culture_quiz: { name: 'Culture Quiz', icon: '❓', effect: 'Answer & win' }
};

// Initialize
function init() {
    // Load saved player name
    const savedName = localStorage.getItem('playerName');
    if (savedName) {
        playerNameInput.value = savedName;
    }

    // Event listeners
    createRoomBtn.addEventListener('click', handleCreateRoom);
    joinRoomBtn.addEventListener('click', showJoinSection);
    confirmJoinBtn.addEventListener('click', handleJoinRoom);
    cancelJoinBtn.addEventListener('click', hideJoinSection);
    
    // Enter key support
    playerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleCreateRoom();
    });
    roomCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleJoinRoom();
    });

    // Socket event listeners
    socket.on('connect', () => {
        console.log('Connected to server');
    });

    socket.on('room_created', (data) => {
        console.log('Room created:', data);
        localStorage.setItem('playerName', playerNameInput.value.trim());
        localStorage.setItem('playerSid', data.player.sid);
        console.log('Redirecting to room:', data.room_code);
        soundManager.init();
        soundManager.playRoomCreated();
        window.location.href = `/room/${data.room_code}`;
    });

    socket.on('room_joined', (data) => {
        localStorage.setItem('playerName', playerNameInput.value.trim());
        localStorage.setItem('playerSid', data.player.sid);
        soundManager.init();
        soundManager.playRoomCreated();
        window.location.href = `/room/${data.room_code}`;
    });

    socket.on('error', (data) => {
        showToast(data.message, 'error');
    });
}

// Create Room
function handleCreateRoom() {
    const playerName = playerNameInput.value.trim();
    
    if (!playerName) {
        showToast('Please enter your name', 'error');
        playerNameInput.focus();
        return;
    }
    
    if (playerName.length > 20) {
        showToast('Name must be 20 characters or less', 'error');
        return;
    }

    createRoomBtn.disabled = true;
    createRoomBtn.innerHTML = '<span class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></span> Creating...';
    
    socket.emit('create_room', { player_name: playerName });
}

// Show Join Section
function showJoinSection() {
    const playerName = playerNameInput.value.trim();
    
    if (!playerName) {
        showToast('Please enter your name first', 'error');
        playerNameInput.focus();
        return;
    }

    joinRoomSection.style.display = 'block';
    joinRoomBtn.style.display = 'none';
    createRoomBtn.style.display = 'none';
    roomCodeInput.focus();
}

// Hide Join Section
function hideJoinSection() {
    joinRoomSection.style.display = 'none';
    joinRoomBtn.style.display = 'inline-flex';
    createRoomBtn.style.display = 'inline-flex';
    roomCodeInput.value = '';
}

// Join Room
function handleJoinRoom() {
    const playerName = playerNameInput.value.trim();
    const roomCode = roomCodeInput.value.trim().toUpperCase();
    
    if (!roomCode) {
        showToast('Please enter a room code', 'error');
        roomCodeInput.focus();
        return;
    }
    
    if (roomCode.length !== 5) {
        showToast('Room code must be 5 characters', 'error');
        return;
    }

    confirmJoinBtn.disabled = true;
    confirmJoinBtn.innerHTML = '<span class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></span> Joining...';
    
    socket.emit('player_join_room', { 
        player_name: playerName,
        room_code: roomCode 
    });
}

// Show Toast Notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    if (type === 'error') {
        toast.style.background = 'var(--error)';
    } else if (type === 'success') {
        toast.style.background = 'var(--success)';
    }
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
