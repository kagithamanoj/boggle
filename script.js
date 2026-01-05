class TrieNode {
    constructor() {
        this.children = {};
        this.isEndOfWord = false;
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode();
    }

    insert(word) {
        let node = this.root;
        for (let char of word) {
            if (!node.children[char]) {
                node.children[char] = new TrieNode();
            }
            node = node.children[char];
        }
        this.isEndOfWord = true;
    }
}

class BoggleSolver {
    constructor() {
        this.root = new TrieNode();
        this.isLoaded = false;
    }

    async loadDictionary() {
        try {
            const response = await fetch('https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt');
            const text = await response.text();
            const words = text.split('\n');
            
            for (let word of words) {
                word = word.trim().toLowerCase();
                if (word.length >= 3) {
                    this.insertWord(word);
                }
            }
            this.isLoaded = true;
            console.log("Dictionary loaded");
        } catch (error) {
            console.error("Failed to load dictionary", error);
            alert("Error loading dictionary. Check console.");
        }
    }

    insertWord(word) {
        let node = this.root;
        for (let char of word) {
            if (!node.children[char]) {
                node.children[char] = new TrieNode();
            }
            node = node.children[char];
        }
        node.isEndOfWord = true;
    }

    getScore(word) {
        const len = word.length;
        if (len < 3) return 0;
        if (len <= 4) return 1;
        if (len === 5) return 2;
        if (len === 6) return 3;
        if (len === 7) return 5;
        return 11;
    }

    solve(grid) {
        if (!this.isLoaded) return [];
        
        const size = Math.sqrt(grid.length);
        const foundWords = new Set();
        const visited = Array(size).fill().map(() => Array(size).fill(false));

        // Create 2D grid
        const board = [];
        for (let i = 0; i < size; i++) {
            board.push(grid.slice(i * size, (i + 1) * size));
        }

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                this._dfs(r, c, board, visited, "", this.root, foundWords, size);
            }
        }

        // Convert to array and score
        const results = Array.from(foundWords).map(word => ({
            word: word,
            score: this.getScore(word)
        }));

        // Sort: Score desc, Length desc, Alpha asc
        return results.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (b.word.length !== a.word.length) return b.word.length - a.word.length;
            return a.word.localeCompare(b.word);
        });
    }

    _dfs(r, c, grid, visited, currentWord, currentNode, foundWords, size) {
        if (visited[r][c]) return;

        const char = grid[r][c];
        if (!currentNode.children[char]) return;

        const nextNode = currentNode.children[char];
        const newWord = currentWord + char;

        if (nextNode.isEndOfWord) {
            foundWords.add(newWord);
        }

        visited[r][c] = true;

        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (let [dr, dc] of directions) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                this._dfs(nr, nc, grid, visited, newWord, nextNode, foundWords, size);
            }
        }

        visited[r][c] = false;
    }
}

// UI Logic
const solver = new BoggleSolver();
let currentSize = 4;

const gridContainer = document.getElementById('grid-container');
const btn4 = document.getElementById('size-4');
const btn5 = document.getElementById('size-5');
const randomBtn = document.getElementById('random-btn');
const solveBtn = document.getElementById('solve-btn');
const clearBtn = document.getElementById('clear-btn');
const resultsArea = document.getElementById('results-area');
const resultsList = document.getElementById('results-list');
const wordCount = document.getElementById('word-count');
const loadingOverlay = document.getElementById('loading-overlay');

// Initialize
(async function init() {
    loadingOverlay.classList.remove('hidden');
    await solver.loadDictionary();
    loadingOverlay.classList.add('hidden');
    generateGrid(4);
})();

function generateGrid(size) {
    currentSize = size;
    gridContainer.innerHTML = '';
    gridContainer.className = `grid-${size}`;
    
    // Toggle buttons
    if (size === 4) {
        btn4.classList.add('active');
        btn5.classList.remove('active');
    } else {
        btn5.classList.add('active');
        btn4.classList.remove('active');
    }

    for (let i = 0; i < size * size; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 1;
        input.className = 'cell';
        input.dataset.index = i;
        
        // Auto-move focus
        input.addEventListener('input', (e) => {
            if (e.target.value.match(/[^a-zA-Z]/)) {
                e.target.value = '';
                return;
            }
            if (e.target.value) {
                const next = document.querySelector(`.cell[data-index="${i + 1}"]`);
                if (next) next.focus();
            }
        });

        // Backspace move back
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value) {
                const prev = document.querySelector(`.cell[data-index="${i - 1}"]`);
                if (prev) {
                    prev.focus();
                    // prev.value = ''; // Optional: clear prev on backspace? Standard is usually just focus.
                }
            }
        });

        gridContainer.appendChild(input);
    }
}

function getGridValues() {
    const inputs = document.querySelectorAll('.cell');
    let grid = [];
    for (let input of inputs) {
        if (!input.value) return null; // Incomplete
        grid.push(input.value.toLowerCase());
    }
    return grid;
}

function fillRandom() {
    // Dice distribution for classic Boggle (roughly)
    const dice = "AAEEGNELTTYMAOOTTWABBJOOEHRTVCIMOTUDISTTYEIOSSTDELRVRYTERWHVTOWN"; // Just a mashup of common letters
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    const inputs = document.querySelectorAll('.cell');
    
    inputs.forEach(input => {
        // Weighted random is better, but simple random char for now
        // Or using common letter frequency
        const common = "eeeeeeeeaaaaaaaiiiooooooonnnnnrrrrrrtttttllllssssuuuuddddggg";
        const char = common.charAt(Math.floor(Math.random() * common.length));
        input.value = char.toUpperCase();
    });
}

btn4.addEventListener('click', () => generateGrid(4));
btn5.addEventListener('click', () => generateGrid(5));
randomBtn.addEventListener('click', fillRandom);
clearBtn.addEventListener('click', () => {
    document.querySelectorAll('.cell').forEach(i => i.value = '');
    resultsArea.classList.add('hidden');
});

solveBtn.addEventListener('click', () => {
    const grid = getGridValues();
    if (!grid) {
        alert("Please fill all cells.");
        return;
    }
    
    const results = solver.solve(grid);
    displayResults(results);
});

function displayResults(results) {
    resultsArea.classList.remove('hidden');
    wordCount.textContent = `(${results.length})`;
    resultsList.innerHTML = '';
    
    if (results.length === 0) {
        resultsList.innerHTML = '<li style="padding:1rem; text-align:center;">No words found.</li>';
        return;
    }

    results.forEach(({word, score}) => {
        const li = document.createElement('li');
        li.className = 'result-item';
        li.innerHTML = `<span>${word}</span><span class="result-score">${score}</span>`;
        resultsList.appendChild(li);
    });
}
