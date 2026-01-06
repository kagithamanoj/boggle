# Boggle Solver & Game

A web-based Boggle game with a powerful built-in solver.

## 🎮 [Play the Game Here](https://kagithamanoj.github.io/boggle/)

*(Note: If the link doesn't work, ensure GitHub Pages is enabled in Settings -> Pages, with Source set to **main branch** / **root** folder).*

## Features
- **Interactive Game**: Play 4x4 or 5x5 Boggle in your browser.
- **Instant Solver**: Find all possible words and scores.
- **Random Board**: Generate new boards instantly.

## Project Structure
- **Game**: `game/` (Web application files).
- **Solver**: `solver/` (Python command-line tool).

## Running Locally
1. Clone the repo.
2. Open `game/index.html` in your browser.

## Running the Python Solver
```bash
python3 solver/solver.py <grid_string>
```

## Deployment Note
Since the game is now in the `game/` folder, your GitHub Pages URL might need to include `/game`, e.g., `https://kagithamanoj.github.io/boggle/game/`.
Alternatively, change your GitHub Pages source settings to point to the `game` folder if possible, or use a root `index.html` redirect.
