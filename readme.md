# ♟️ Strategic Chess - Realtime Multiplayer Web App 
A high-performance, real-time multiplayer chess web application. Built using **Node.js**, **Express**, **Socket.IO**, **Chess.js**, and **Tailwind CSS**.

![Strategic Chess Banner](https://img.shields.io/badge/Node.js-18%2B-green?style=flat-square&logo=node.js)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-black?style=flat-square&logo=socketdotio)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Render-brightgreen?style=flat-square&logo=render)](https://chess-multiplayer-ncnz.onrender.com)

🔗 **Live Demo**: [https://chess-multiplayer-ncnz.onrender.com](https://chess-multiplayer-ncnz.onrender.com)

---

## ✨ Features

- ⚡ **Realtime Multiplayer Messaging**: Seamless WebSocket synchronization powered by Socket.IO.
- ♔ **Role & Perspective Assignment**:
  - 1st Player $\rightarrow$ **White** (`♔`)
  - 2nd Player $\rightarrow$ **Black** (`♚`)
  - 3rd+ Players $\rightarrow$ **Spectator** (`👀`)
  - Automatically flips the board 180° for the Black player.
- 🎨 **Monochrome High-Contrast Theme**: Elegant black & white editorial design with **Bebas Neue** typography and high-visibility piece contrast.
- 🔊 **Authentic Chess Sound Effects**: Integrated Chess.com sound effects for:
  - Standard Moves
  - Piece Captures
  - Check Warnings
  - Illegal Move Alerts
  - Castling & Pawn Promotions
  - Victory / Game Over Fanfare
- ⚠️ **Turn & Illegal Move Protection**: Drag-and-drop validation with red toast notifications and board shake animations for invalid moves.
- 🏆 **Game Over & Draw Modals**: Automatic detection for Checkmate, Stalemate, Threefold Repetition, Insufficient Material, and Player Disconnection forfeits.
- 📜 **Live Move History**: Side panel recording standard algebraic notation (`1. e4 e5`) in real time.
- 🔄 **One-Click Game Restart**: Instant board reset for both players using the "Play Again" button.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js, Socket.IO, Chess.js
- **Frontend**: Vanilla JavaScript (ES6+), EJS Templates, Tailwind CSS (v4)
- **Icons & Fonts**: FontAwesome 6, Google Fonts (Bebas Neue & Inter)
- **Audio**: HTML5 Audio API with Chess.com sound assets

---

## 📁 Project Structure

```
chess_com/
├── app.js                          # Express server & Socket.IO game manager
├── package.json                    # Dependencies & scripts
├── public/
│   ├── javascripts/
│   │   └── chessgame.js            # Client-side renderer, socket listeners & audio player
│   └── sounds/                     # Official Chess.com MP3 sound files
│       ├── capture.mp3
│       ├── castle.mp3
│       ├── check.mp3
│       ├── game-end.mp3
│       ├── illegal.mp3
│       ├── move.mp3
│       └── promote.mp3
└── views/
    └── index.ejs                   # Main HTML/EJS layout template
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (v16+) installed.

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Rajat2774/Chess_com.git
   cd Chess_com
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the application**:
   ```bash
   # Development mode with nodemon
   npx nodemon app.js

   # Standard node execution
   node app.js
   ```

4. **Play the game**:
   - Open [http://localhost:3000](http://localhost:3000) in **Browser Window 1** (White player).
   - Open [http://localhost:3000](http://localhost:3000) in **Browser Window 2** (Black player).

