/**
 * Lucky New Year! - Room Page JavaScript
 * Handles game room interactions, card playing, and real-time updates
 */

// Socket.IO connection
const socket = io();

// Game State
let currentRoom = null;
let currentPlayer = null;
let selectedCard = null;
let isMyTurn = false;
let gameStatus = 'waiting';
let turnTimer = null;
let timeLeft = 30;

// Card definitions
const CARDS = {
    dumpling: { name: 'Dumpling', icon: '🥟', effect: 'luck+1', desc: 'Gain 1 Luck Point' },
    panda: { name: 'Panda', icon: '🐼', effect: 'peek', desc: 'Peek at hand' },
    red_envelope: { name: 'Red Envelope', icon: '🧧', effect: 'draw2', desc: 'Draw 2 cards' },
    great_wall: { name: 'Great Wall', icon: '🏯', effect: 'shield', desc: 'Block effect' },
    dragon_dance: { name: 'Dragon Dance', icon: '🐉', effect: 'quiz_all', desc: 'Quiz for all' },
    lantern: { name: 'Lantern', icon: '🏮', effect: 'progress', desc: 'Check progress' },
    chopsticks: { name: 'Chopsticks', icon: '🥢', effect: 'swap', desc: 'Swap hands' },
    culture_quiz: { name: 'Culture Quiz', icon: '❓', effect: 'quiz', desc: 'Answer & win' }
};

// DOM Elements
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const gameStatusBadge = document.getElementById('gameStatus');
const startGameBtn = document.getElementById('startGameBtn');
const playersList = document.getElementById('playersList');
const turnInfo = document.getElementById('turnInfo');
const currentTurnName = document.getElementById('currentTurnName');
const turnTimerDisplay = document.getElementById('turnTimer');
const gameLog = document.getElementById('gameLog');
const handSection = document.getElementById('handSection');
const handCards = document.getElementById('handCards');
const handCount = document.getElementById('handCount');
const selectTargetMsg = document.getElementById('selectTargetMsg');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const toastContainer = document.getElementById('toastContainer');

// Modal Elements
const quizModal = document.getElementById('quizModal');
const quizQuestion = document.getElementById('quizQuestion');
const quizOptions = document.getElementById('quizOptions');
const quizResult = document.getElementById('quizResult');
const quizResultText = document.getElementById('quizResultText');
const quizExplanation = document.getElementById('quizExplanation');
const peekModal = document.getElementById('peekModal');
const peekTargetName = document.getElementById('peekTargetName');
const peekCards = document.getElementById('peekCards');
const closePeekBtn = document.getElementById('closePeekBtn');
const gameOverModal = document.getElementById('gameOverModal');
const winnerText = document.getElementById('winnerText');
const finalScores = document.getElementById('finalScores');
const playAgainBtn = document.getElementById('playAgainBtn');

// Initialize
function init() {
    console.log('Room page initialized, ROOM_CODE:', ROOM_CODE);
    console.log('LocalStorage playerName:', localStorage.getItem('playerName'));
    console.log('LocalStorage playerSid:', localStorage.getItem('playerSid'));
    // Socket event listeners
    socket.on('connect', () => {
        console.log('Connected to server, socket.id =', socket.id);
        // 延迟发送，确保连接完全建立
        setTimeout(tryJoinRoom, 500);
    });

    socket.on('room_reconnected', (data) => {
        console.log('Reconnected to room', data);
        localStorage.setItem('playerSid', socket.id);
        handleRoomUpdate(data.room);
        if (data.is_host) {
            showToast('Reconnected as host', 'success');
        } else {
            showToast('Reconnected to room', 'success');
        }
    });

    socket.on('room_joined', (data) => {
        console.log('Joined room', data);
        localStorage.setItem('playerSid', data.player.sid);
        handleRoomUpdate(data.room);
        showToast('Joined room successfully', 'success');
    });

    socket.on('room_update', handleRoomUpdate);
    socket.on('game_started', handleGameStarted);
    socket.on('card_played', handleCardPlayed);
    socket.on('turn_changed', handleTurnChanged);
    socket.on('quiz_triggered', handleQuizTriggered);
    socket.on('quiz_result', handleQuizResult);
    socket.on('peek_result', handlePeekResult);
    socket.on('game_ended', handleGameEnded);
    socket.on('chat_message', handleChatMessage);
    socket.on('error', handleError);

    // Button event listeners
    startGameBtn.addEventListener('click', () => {
        socket.emit('start_game');
    });

    sendChatBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });

    closePeekBtn.addEventListener('click', () => {
        peekModal.style.display = 'none';
    });

    playAgainBtn.addEventListener('click', () => {
        window.location.reload();
    });

    // Check if player data exists
    const playerName = localStorage.getItem('playerName');
    if (!playerName || !ROOM_CODE) {
        window.location.href = '/';
    }

    // Try to join room if socket is already connected
    if (socket.connected) {
        console.log('Socket already connected, trying to join room');
        setTimeout(tryJoinRoom, 500);
    }
}

// Try to join room
function tryJoinRoom() {
    const playerName = localStorage.getItem('playerName');
    const previousSid = localStorage.getItem('playerSid');
    console.log('Trying to join/reconnect to room:', ROOM_CODE, 'as', playerName);
    console.log('Socket connected:', socket.connected);
    console.log('Socket id:', socket.id);

    if (ROOM_CODE && playerName) {
        console.log('Emitting reconnect_room event...');
        socket.emit('reconnect_room', {
            room_code: ROOM_CODE,
            player_name: playerName,
            previous_sid: previousSid
        });
        console.log('reconnect_room event emitted');
    } else {
        console.log('Missing ROOM_CODE or playerName');
    }
}

// Handle Room Update
function handleRoomUpdate(room) {
    currentRoom = room;
    
    // Find current player
    const mySid = socket.id;
    currentPlayer = room.players.find(p => p.sid === mySid);
    
    // Update game status
    gameStatus = room.status;
    updateGameStatus();
    
    // Update players list
    renderPlayers();
    
    // Update hand if playing
    if (gameStatus === 'playing' && currentPlayer) {
        renderHand();
    }
    
    // Show/hide start button for host
    if (currentPlayer && room.host === mySid && room.status === 'waiting') {
        startGameBtn.style.display = 'inline-flex';
        startGameBtn.disabled = room.players.length < 2;
    } else {
        startGameBtn.style.display = 'none';
    }
}

// Update Game Status Badge
function updateGameStatus() {
    const statusMap = {
        'waiting': { text: '⏳ Waiting...', color: 'var(--warning)' },
        'playing': { text: '🎮 Playing', color: 'var(--success)' },
        'ended': { text: '🏁 Ended', color: 'var(--text-secondary)' }
    };
    
    const status = statusMap[gameStatus] || statusMap['waiting'];
    gameStatusBadge.innerHTML = `<span>${status.text}</span>`;
    gameStatusBadge.style.background = status.color;
}

// Render Players List
function renderPlayers() {
    if (!currentRoom) return;
    
    playersList.innerHTML = '';
    
    currentRoom.players.forEach((player, index) => {
        const isCurrentTurn = gameStatus === 'playing' && index === currentRoom.current_player;
        const isHost = player.sid === currentRoom.host;
        const isMe = player.sid === socket.id;
        
        const badge = document.createElement('div');
        badge.className = `player-badge ${isCurrentTurn ? 'active' : ''}`;
        badge.dataset.sid = player.sid;
        
        badge.innerHTML = `
            <div class="avatar" style="background: ${isMe ? 'linear-gradient(135deg, var(--chinese-red) 0%, var(--chinese-red-dark) 100%)' : 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)'};">
                ${player.name.charAt(0).toUpperCase()}
            </div>
            <div class="info">
                <span class="name">${player.name} ${isHost ? '👑' : ''} ${isMe ? '(You)' : ''}</span>
                <span class="luck">✨ ${player.luck || 0} Luck</span>
            </div>
        `;
        
        // Add click handler for target selection
        if (selectedCard && (selectedCard === 'panda' || selectedCard === 'chopsticks') && !isMe) {
            badge.style.cursor = 'pointer';
            badge.style.border = '2px solid var(--chinese-red)';
            badge.addEventListener('click', () => playCardWithTarget(player.sid));
        }
        
        playersList.appendChild(badge);
    });
}

// Handle Game Started
function handleGameStarted(room) {
    console.log('Game started:', room);
    currentRoom = room;
    gameStatus = 'playing';
    
    // Update current player
    const mySid = socket.id;
    currentPlayer = room.players.find(p => p.sid === mySid);
    console.log('Current player after game start:', currentPlayer);
    
    updateGameStatus();
    turnInfo.style.display = 'block';
    handSection.style.display = 'block';
    startGameBtn.style.display = 'none';
    
    renderPlayers();
    updateTurnInfo(); // Update turn info to set isMyTurn correctly
    renderHand();
    
    addLogEntry('🎮 Game started! Good luck!');
    showToast('Game started!', 'success');
}

// Render Hand Cards
function renderHand() {
    console.log('Rendering hand...');
    console.log('Current player:', currentPlayer);
    console.log('Is my turn:', isMyTurn);
    
    if (!currentPlayer) {
        console.log('No current player, returning');
        return;
    }
    
    handCards.innerHTML = '';
    handCount.textContent = currentPlayer.hand.length;
    console.log('Hand length:', currentPlayer.hand.length);
    console.log('Hand:', currentPlayer.hand);
    
    currentPlayer.hand.forEach((cardType, index) => {
        const card = CARDS[cardType];
        if (!card) {
            console.log('No card found for type:', cardType);
            return;
        }
        
        const cardEl = document.createElement('div');
        cardEl.className = 'game-card';
        cardEl.dataset.cardType = cardType;
        cardEl.dataset.index = index;
        
        cardEl.innerHTML = `
            <span class="card-icon">${card.icon}</span>
            <span class="card-name">${card.name}</span>
            <span class="card-effect">${card.desc}</span>
        `;
        
        if (isMyTurn) {
            cardEl.addEventListener('click', () => selectCard(cardType, cardEl));
        } else {
            cardEl.style.opacity = '0.6';
            cardEl.style.cursor = 'not-allowed';
        }
        
        handCards.appendChild(cardEl);
    });
}

// Select Card
function selectCard(cardType, cardEl) {
    // Deselect previous
    document.querySelectorAll('.game-card').forEach(c => c.classList.remove('selected'));
    
    if (selectedCard === cardType) {
        selectedCard = null;
        selectTargetMsg.style.display = 'none';
        renderPlayers(); // Remove target selection UI
        return;
    }
    
    selectedCard = cardType;
    cardEl.classList.add('selected');
    
    // Check if needs target
    if (cardType === 'panda' || cardType === 'chopsticks') {
        selectTargetMsg.style.display = 'block';
        renderPlayers(); // Show target selection UI
    } else {
        selectTargetMsg.style.display = 'none';
        playCard();
    }
}

// Play Card
function playCard(targetSid = null) {
    if (!selectedCard || !isMyTurn) return;
    
    socket.emit('play_card', {
        card_type: selectedCard,
        target_sid: targetSid
    });
    
    selectedCard = null;
    selectTargetMsg.style.display = 'none';
    document.querySelectorAll('.game-card').forEach(c => c.classList.remove('selected'));
}

// Play Card With Target
function playCardWithTarget(targetSid) {
    playCard(targetSid);
}

// Handle Card Played
function handleCardPlayed(data) {
    const { player, card_type, result, next_player } = data;
    const card = CARDS[card_type];
    
    addLogEntry(`${player.name} played ${card.icon} ${card.name}: ${result.message}`);
    
    // Update turn
    currentRoom.current_player = next_player;
    updateTurnInfo();
    renderPlayers();
}

// Handle Turn Changed
function handleTurnChanged(data) {
    currentRoom.current_player = data.current_player;
    updateTurnInfo();
    renderPlayers();
    renderHand();
}

// Update Turn Info
function updateTurnInfo() {
    if (!currentRoom || gameStatus !== 'playing') return;
    
    const currentPlayerObj = currentRoom.players[currentRoom.current_player];
    if (currentPlayerObj) {
        currentTurnName.textContent = currentPlayerObj.name;
        isMyTurn = currentPlayerObj.sid === socket.id;
        
        if (isMyTurn) {
            currentTurnName.style.color = 'var(--success)';
            showToast('Your turn!', 'success');
            startTurnTimer();
        } else {
            currentTurnName.style.color = 'var(--chinese-red)';
            stopTurnTimer();
        }
        
        renderHand();
    }
}

// Turn Timer
function startTurnTimer() {
    stopTurnTimer();
    timeLeft = 30;
    turnTimerDisplay.textContent = timeLeft;
    
    turnTimer = setInterval(() => {
        timeLeft--;
        turnTimerDisplay.textContent = timeLeft;
        
        if (timeLeft <= 10) {
            turnTimerDisplay.style.background = 'var(--error)';
        } else {
            turnTimerDisplay.style.background = 'linear-gradient(135deg, var(--chinese-red) 0%, var(--chinese-red-dark) 100%)';
        }
        
        if (timeLeft <= 0) {
            stopTurnTimer();
            // Auto-play a random card if time runs out
            if (isMyTurn && currentPlayer && currentPlayer.hand.length > 0) {
                const randomCard = currentPlayer.hand[0];
                socket.emit('play_card', { card_type: randomCard });
            }
        }
    }, 1000);
}

function stopTurnTimer() {
    if (turnTimer) {
        clearInterval(turnTimer);
        turnTimer = null;
    }
}

// Handle Quiz Triggered
function handleQuizTriggered(data) {
    const { type, question, target_sid, asker } = data;
    
    if (type === 'all' || (type === 'single' && target_sid === socket.id)) {
        showQuizModal(question);
    }
    
    if (type === 'all' && asker) {
        addLogEntry(`🐉 ${asker} triggered a quiz for everyone!`);
    }
}

// Show Quiz Modal
function showQuizModal(question) {
    quizQuestion.textContent = question.q;
    quizOptions.innerHTML = '';
    quizResult.style.display = 'none';
    
    question.a.forEach((option, index) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.textContent = option;
        btn.addEventListener('click', () => answerQuiz(index, question));
        quizOptions.appendChild(btn);
    });
    
    quizModal.style.display = 'flex';
}

// Answer Quiz
function answerQuiz(answer, question) {
    // Disable all options
    document.querySelectorAll('.quiz-option').forEach(btn => {
        btn.disabled = true;
    });
    
    socket.emit('answer_quiz', {
        answer: answer,
        question: question
    });
}

// Handle Quiz Result
function handleQuizResult(data) {
    console.log('Handling quiz result:', data);
    const { player_sid, player_name, correct, message, explanation } = data;
    
    // Show result in modal if it's my quiz
    if (player_sid === socket.id) {
        quizResult.style.display = 'block';
        quizResultText.textContent = correct ? '✅ Correct!' : '❌ Wrong!';
        quizResultText.style.color = correct ? 'var(--success)' : 'var(--error)';
        quizExplanation.textContent = explanation;
        
        try {
            // Highlight correct answer
            document.querySelectorAll('.quiz-option').forEach((btn, index) => {
                if (data.question && index === data.question.ans) {
                    btn.classList.add('correct');
                } else if (index === data.player_answer && !correct) {
                    btn.classList.add('wrong');
                }
            });
        } catch (error) {
            console.error('Error highlighting correct answer:', error);
        }
        
        // Close modal after delay
        setTimeout(() => {
            console.log('Closing quiz modal');
            quizModal.style.display = 'none';
        }, 3000);
    }
    
    addLogEntry(message);
}

// Handle Peek Result
function handlePeekResult(data) {
    peekTargetName.textContent = `${data.target_name}'s Hand:`;
    peekCards.innerHTML = '';
    
    data.target_hand.forEach(cardType => {
        const card = CARDS[cardType];
        if (card) {
            const cardEl = document.createElement('div');
            cardEl.className = 'game-card';
            cardEl.style.cursor = 'default';
            cardEl.innerHTML = `
                <span class="card-icon">${card.icon}</span>
                <span class="card-name">${card.name}</span>
            `;
            peekCards.appendChild(cardEl);
        }
    });
    
    peekModal.style.display = 'flex';
}

// Handle Game Ended
function handleGameEnded(data) {
    gameStatus = 'ended';
    stopTurnTimer();
    
    const { winner, players } = data;
    
    winnerText.innerHTML = `🏆 <span style="color: var(--gold-dark);">${winner.name}</span> wins with ${winner.luck} Luck Points!`;
    
    // Sort players by luck
    const sortedPlayers = [...players].sort((a, b) => b.luck - a.luck);
    
    finalScores.innerHTML = sortedPlayers.map((p, i) => `
        <div style="display: flex; justify-content: space-between; padding: var(--spacing-sm); background: ${i === 0 ? 'var(--gold-light)' : '#f5f5f5'}; border-radius: var(--radius-md); margin-bottom: var(--spacing-sm);">
            <span>${i + 1}. ${p.name} ${p.sid === winner.sid ? '👑' : ''}</span>
            <span style="font-weight: 700; color: var(--gold-dark);">${p.luck} ✨</span>
        </div>
    `).join('');
    
    gameOverModal.style.display = 'flex';
    
    // Fireworks effect
    createFireworks();
}

// Create Fireworks
function createFireworks() {
    const colors = ['#FFD700', '#D32F2F', '#FF6B6B', '#FFA000', '#FFECB3'];
    
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const firework = document.createElement('div');
            firework.className = 'firework';
            firework.style.left = Math.random() * 100 + 'vw';
            firework.style.top = Math.random() * 100 + 'vh';
            firework.style.background = colors[Math.floor(Math.random() * colors.length)];
            firework.style.setProperty('--x', (Math.random() - 0.5) * 200 + 'px');
            firework.style.setProperty('--y', (Math.random() - 0.5) * 200 + 'px');
            document.body.appendChild(firework);
            
            setTimeout(() => firework.remove(), 1000);
        }, i * 100);
    }
}

// Handle Chat Message
function handleChatMessage(data) {
    const msgEl = document.createElement('div');
    msgEl.className = `chat-message ${data.type}`;
    
    if (data.type === 'system') {
        msgEl.textContent = data.message;
    } else {
        msgEl.innerHTML = `
            <span class="sender">${data.player_name}</span>
            <div class="text">${escapeHtml(data.message)}</div>
        `;
    }
    
    chatMessages.appendChild(msgEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Send Chat Message
function sendChatMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
    
    socket.emit('send_message', { message });
    chatInput.value = '';
}

// Handle Error
function handleError(data) {
    showToast(data.message, 'error');

    // If room not found or player not found, redirect to lobby
    if (data.message === 'Room not found' || data.message === 'Player not found in room') {
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
    }
}

// Add Log Entry
function addLogEntry(message) {
    const entry = document.createElement('div');
    entry.style.marginBottom = '8px';
    entry.style.padding = '8px';
    entry.style.background = '#f5f5f5';
    entry.style.borderRadius = '4px';
    entry.innerHTML = `<span style="color: #999; font-size: 12px;">${new Date().toLocaleTimeString()}</span> ${message}`;
    
    gameLog.appendChild(entry);
    gameLog.scrollTop = gameLog.scrollHeight;
}

// Show Toast
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

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
