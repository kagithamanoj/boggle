
// --- CONFIGURATION ---
const PEER_CONFIG = {
    // You can use a public PeerJS server or your own. Public is fine for demo.
    // user-specific ID logic can be opaque
};

// Standard Boggle Dice (New Version)
const DICE = [
    "AAEEGN", "ABBJOO", "ACHOPS", "AFFKPS",
    "AOOTTW", "CIMOTU", "DEILRX", "DELRVY",
    "DISTTY", "EEGHNW", "EEINSU", "EHRTVW",
    "EIOSST", "ELRTTY", "HIMNQU", "HLNNRZ"
];

// --- STATE MANAGEMENT ---
let isHost = false;
let peer = null;
let conn = null; // For client: connection to host
let connections = []; // For host: list of client connections
let players = {}; // Map of conn.peer -> { name, score, foundWords(Set) }
let gameTimer = null;
let timeLeft = 180; // 3 minutes
let gameActive = false;
let boardGrid = [];
let validWords = new Set(); // Dictionary
let dictTrie = {}; // Optional optimization, using Set for now for simplicity & speed

// --- DOM ELEMENTS ---
const viewSplash = document.getElementById('view-splash');
const viewHostLobby = document.getElementById('view-host-lobby');
const viewHostGame = document.getElementById('view-host-game');
const viewHostResults = document.getElementById('view-host-results');
const viewClientJoin = document.getElementById('view-client-join');
const viewClientWaiting = document.getElementById('view-client-waiting');
const viewClientGame = document.getElementById('view-client-game');
const viewClientGameOver = document.getElementById('view-client-gameover');

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', async () => {
    // Check URL Params to decide Host vs Client
    const urlParams = new URLSearchParams(window.location.search);
    const hostId = urlParams.get('host');

    if (hostId) {
        initClient(hostId);
    } else {
        await  loadDictionary();
        initHost();
    }
});

async function loadDictionary() {
    document.getElementById('splash-status').innerText = "Loading Dictionary...";
    try {
        const response = await fetch('assets/dictionary.txt');
        const text = await response.text();
        const words = text.split('\n');
        words.forEach(w => {
            const clean = w.trim().toUpperCase();
            if (clean.length >= 3) validWords.add(clean);
        });
        console.log(`Dictionary loaded: ${validWords.size} words`);
    } catch (e) {
        console.error("Failed to load dictionary", e);
        alert("Dictionary failed to load!");
    }
}

// --- HOST LOGIC ---
function initHost() {
    isHost = true;
    document.getElementById('splash-status').innerText = "Starting Server...";

    peer = new Peer(null, PEER_CONFIG);

    peer.on('open', (id) => {
        console.log('Host ID:', id);
        showView(viewHostLobby);
        generateQRCode(id);
        
        // Setup Start Button
        document.getElementById('btn-start-game').onclick = startGame;
        document.getElementById('btn-start-game').disabled = false;
    });

    peer.on('connection', (c) => {
        setupHostConnection(c);
    });
}

function generateQRCode(hostId) {
    const url = `${window.location.origin}${window.location.pathname}?host=${hostId}`;
    console.log("Join URL:", url);
    new QRCode(document.getElementById("qrcode"), {
        text: url,
        width: 180,
        height: 180,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
    document.getElementById('display-room-code').innerText = hostId;
}

function setupHostConnection(c) {
    c.on('open', () => {
        console.log("New Client Connected:", c.peer);
        connections.push(c);
    });

    c.on('data', (data) => {
        handleHostData(c, data);
    });

    c.on('close', () => {
        // Handle disconnect if needed
        console.log("Client disconnected:", c.peer);
    });
}

function handleHostData(c, data) {
    switch (data.type) {
        case 'JOIN':
            players[c.peer] = {
                id: c.peer,
                name: data.name || "Unknown",
                score: 0,
                foundWords: []
            };
            updateLobbyUI();
            c.send({ type: 'JOIN_ACK' });
            break;
        
        case 'SUBMIT_WORD':
            if (!gameActive) return;
            validateWord(c, data.word);
            break;
    }
}

function updateLobbyUI() {
    const list = document.getElementById('player-list');
    list.innerHTML = '';
    const playerIds = Object.keys(players);
    document.getElementById('player-count').innerText = playerIds.length;
    
    playerIds.forEach(pid => {
        const p = players[pid];
        const card = document.createElement('div');
        card.className = 'player-card';
        card.innerHTML = `<h3>${p.name}</h3>`;
        list.appendChild(card);
    });
}

function startGame() {
    if (Object.keys(players).length === 0) {
        // For Dev testing allow solo start
        // alert("Need at least one player!");
        // return;
    }

    gameActive = true;
    generateBoard();
    showView(viewHostGame);
    timeLeft = 180; // 3 mins, todo make variable
    updateTimerUI();

    // Broadcast Game Start
    broadcast({
        type: 'GAME_START', 
        duration: timeLeft
    });

    // Start Clock
    gameTimer = setInterval(() => {
        timeLeft--;
        updateTimerUI();
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function endGame() {
    clearInterval(gameTimer);
    gameActive = false;
    showView(viewHostResults);
    
    // Create Leaderboard
    const sortedPlayers = Object.values(players).sort((a,b) => b.score - a.score);
    const lb = document.getElementById('final-leaderboard');
    lb.innerHTML = '';
    
    sortedPlayers.forEach((p, index) => {
        const row = document.createElement('div');
        row.className = 'leaderboard-row';
        row.style.cssText = `
            display: flex; justify-content: space-between; 
            padding: 1rem; background: rgba(255,255,255,0.1); 
            margin-bottom: 0.5rem; border-radius: 8px; font-size: 1.5rem;
        `;
        row.innerHTML = `
            <span>#${index+1} ${p.name}</span>
            <span>${p.score} pts</span>
        `;
        lb.appendChild(row);
    });

    broadcast({ type: 'GAME_OVER', scores: sortedPlayers });
    
    document.getElementById('btn-return-lobby').onclick = () => {
        showView(viewHostLobby);
        // Reset scores
        Object.keys(players).forEach(k => {
            players[k].score = 0;
            players[k].foundWords = [];
        });
        // Note: In a real app we'd clear board etc.
    };
}

function updateTimerUI() {
    const min = Math.floor(timeLeft / 60);
    const sec = timeLeft % 60;
    const txt = `${min}:${sec.toString().padStart(2, '0')}`;
    
    document.getElementById('game-timer').innerText = txt;
    if (timeLeft <= 10) {
        document.getElementById('game-timer').parentElement.classList.add('low-time');
    } else {
        document.getElementById('game-timer').parentElement.classList.remove('low-time');
    }
}

// --- GAME LOGIC ---

function generateBoard() {
    // 1. Roll Dice
    const board = [];
    let dicePool = [...DICE];
    
    // Shuffle dice positions
    for (let i = dicePool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [dicePool[i], dicePool[j]] = [dicePool[j], dicePool[i]];
    }

    // Roll each die
    dicePool.forEach(dieFaces => {
        let char = dieFaces[Math.floor(Math.random() * dieFaces.length)];
        if (char === 'Q') char = 'Qu'; // Classic Boggle rule
        board.push(char);
    });

    boardGrid = board;
    renderBoard(board);
}

function renderBoard(board) {
    const grid = document.getElementById('boggle-grid');
    grid.innerHTML = '';
    board.forEach((char, i) => {
        const d = document.createElement('div');
        d.className = 'dice new-game-anim';
        d.innerText = char;
        // Stagger animation
        d.style.animationDelay = `${i * 0.05}s`;
        grid.appendChild(d);
    });
}

function validateWord(c, rawWord) {
    const word = rawWord.toUpperCase();
    
    // 1. Basic Checks
    if (word.length < 3) {
        c.send({ type: 'SUBMIT_RESULT', status: 'INVALID', word: rawWord, reason: 'Too Short' });
        return;
    }
    
    // 2. Dictionary Check
    if (!validWords.has(word)) {
        c.send({ type: 'SUBMIT_RESULT', status: 'INVALID', word: rawWord, reason: 'Not in Dictionary' });
        return;
    }

    const player = players[c.peer];
    // 3. Duplicate Check
    if (player.foundWords.includes(word)) {
        c.send({ type: 'SUBMIT_RESULT', status: 'DUPLICATE', word: rawWord });
        return;
    }

    // 4. Board Adjacency Check
    if (!isOnBoard(word)) {
        c.send({ type: 'SUBMIT_RESULT', status: 'INVALID', word: rawWord, reason: 'Not on Board' });
        return;
    }

    // Valid!
    const points = getPoints(word);
    player.score += points;
    player.foundWords.push(word);
    
    c.send({ type: 'SUBMIT_RESULT', status: 'VALID', word: rawWord, points: points, totalScore: player.score });
    
    // Update Host UI Live Feed
    const feed = document.getElementById('live-feed');
    const item = document.createElement('div');
    item.innerText = `${player.name} found ${word} (+${points})`;
    item.style.color = '#46d369';
    item.style.marginBottom = '5px';
    feed.prepend(item);
}


// Recursive Board Search
function isOnBoard(word) {
    // Convert 'Qu' logic handling if needed. For now assume dictionary has 'QU' as two letters? 
    // Actually standard dictionary has 'QUEEN'. The board has 'Qu'.
    // If board has 'Qu', it takes one slot.
    // If input is Q-U-E-E-N, and board has [Qu], we match Q then U effectively.
    // Simplifying assumption: Word list is standard. Board 'Qu' counts as 'QU' string.
    
    // Normalize word to match board tokens?
    // Let's keep it simple: Treat 'Qu' as 'Q' 'U' is tricky. 
    // Standard Boggle: 'Qu' stays together.
    
    // Hacky fix for Qu: replace 'QU' with 'q' in word?
    // Or just search specifically.
    
    // Let's implement a graph search.
    
    const w = word.replace(/QU/g, 'q'); // Internal token for Qu
    // We also need to map board 'Qu' to 'q'
    
    const grid = boardGrid.map(x => x === 'Qu' ? 'q' : x);
    
    const rows = 4;
    const cols = 4;
    
    for (let i = 0; i < 16; i++) {
        if (dfs(i, 0, new Set())) return true;
    }
    
    function dfs(idx, charIdx, visited) {
        const charToMatch = w[charIdx];
        if (grid[idx] !== charToMatch) return false;
        
        // Match found
        if (charIdx === w.length - 1) return true;
        
        visited.add(idx);
        
        const neighbors = getNeighbors(idx);
        for (let n of neighbors) {
            if (!visited.has(n)) {
                if (dfs(n, charIdx + 1, new Set(visited))) return true;
            }
        }
        
        return false;
    }
    
    function getNeighbors(i) {
        const r = Math.floor(i / 4);
        const c = i % 4;
        const res = [];
        
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4) {
                    res.push(nr * 4 + nc);
                }
            }
        }
        return res;
    }
    
    return false;
}

function getPoints(word) {
    const l = word.length;
    if (l <= 4) return 1;
    if (l === 5) return 2;
    if (l === 6) return 3;
    if (l === 7) return 5;
    return 11;
}

function broadcast(msg) {
    connections.forEach(c => c.send(msg));
}

// --- CLIENT LOGIC ---
function initClient(hostId) {
    isHost = false;
    document.getElementById('splash-status').innerText = "Connecting to Game...";
    
    peer = new Peer(null, PEER_CONFIG);
    
    peer.on('open', (id) => {
        showView(viewClientJoin);
        setupClientUI(hostId);
    });
}

function setupClientUI(hostId) {
    const btnJoin = document.getElementById('btn-join-game');
    const inpName = document.getElementById('inp-player-name');
    
    btnJoin.onclick = () => {
        const name = inpName.value.trim();
        if (!name) return;
        
        document.getElementById('splash-status').innerText = "Joining Room...";
        showView(viewSplash);
        
        conn = peer.connect(hostId);
        
        conn.on('open', () => {
            console.log("Connected to Host");
            conn.send({ type: 'JOIN', name: name });
        });
        
        conn.on('data', (data) => {
            handleClientData(data);
        });
        
        conn.on('close', () => alert("Disconnected from host"));
    };
    
    // Game Inputs
    const btnSubmit = document.getElementById('btn-submit-word');
    const inpWord = document.getElementById('inp-word');
    
    btnSubmit.onclick = () => {
        const w = inpWord.value.trim();
        if (w) {
            conn.send({ type: 'SUBMIT_WORD', word: w });
            inpWord.value = '';
            inpWord.focus();
        }
    };
}

function handleClientData(data) {
    switch (data.type) {
        case 'JOIN_ACK':
            showView(viewClientWaiting);
            break;
            
        case 'GAME_START':
            showView(viewClientGame);
            startClientTimer(data.duration);
            break;
            
        case 'SUBMIT_RESULT':
            handleSubmitResult(data);
            break;
            
        case 'GAME_OVER':
            showView(viewClientGameOver);
            // Could show my rank here
            const myScore = document.getElementById('client-score').innerText;
            document.getElementById('client-final-score').innerText = myScore;
            break;
    }
}

function handleSubmitResult(data) {
    const list = document.getElementById('client-word-list');
    
    if (data.status === 'VALID') {
        const li = document.createElement('li');
        li.className = 'valid';
        li.innerHTML = `<span>${data.word}</span> <span class="points">+${data.points}</span>`;
        list.prepend(li); // Show newest first
        
        // Update Score
        document.getElementById('client-score').innerText = data.totalScore;
        
        // Haptic Feedback (if supported)
        if (navigator.vibrate) navigator.vibrate(50);
        
    } else {
        // Show invalid feedback briefly?
        // Or just shake the input?
        const inp = document.getElementById('inp-word');
        inp.style.border = "2px solid red";
        setTimeout(() => inp.style.border = "none", 500);
        
        // Optional: Add to list as invalid
        const li = document.createElement('li');
        li.className = 'invalid';
        li.innerText = data.word; // + " (" + data.reason + ")";
        list.prepend(li);
        
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    }
}

function startClientTimer(duration) {
    let t = duration;
    const el = document.getElementById('client-timer');
    const interval = setInterval(() => {
        t--;
        const min = Math.floor(t / 60);
        const sec = t % 60;
        el.innerText = `${min}:${sec.toString().padStart(2, '0')}`;
        if (t <= 0) clearInterval(interval);
    }, 1000);
}


// --- UTILS ---
function showView(viewElement) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    viewElement.classList.add('active');
}
