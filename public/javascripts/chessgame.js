const socket = io();
const chess = new Chess();

const boardElement = document.querySelector("#chessboard");
const turnBanner = document.querySelector("#turnBanner");
const turnDot = document.querySelector("#turnDot");
const turnText = document.querySelector("#turnText");
const roleBadge = document.querySelector("#roleBadge");
const roleText = document.querySelector("#roleText");

const topPlayerName = document.querySelector("#topPlayerName");
const topOnlineDot = document.querySelector("#topOnlineDot");
const topRoleText = document.querySelector("#topRoleText");
const topCaptured = document.querySelector("#topCaptured");

const bottomPlayerName = document.querySelector("#bottomPlayerName");
const bottomOnlineDot = document.querySelector("#bottomOnlineDot");
const bottomRoleText = document.querySelector("#bottomRoleText");
const bottomCaptured = document.querySelector("#bottomCaptured");

const moveHistoryList = document.querySelector("#moveHistoryList");
const moveCount = document.querySelector("#moveCount");
const restartBtn = document.querySelector("#restartBtn");

const toast = document.querySelector("#toast");
const toastMsg = document.querySelector("#toastMsg");

const gameOverModal = document.querySelector("#gameOverModal");
const modalTitle = document.querySelector("#modalTitle");
const modalReason = document.querySelector("#modalReason");
const modalPlayAgainBtn = document.querySelector("#modalPlayAgainBtn");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null; // 'w', 'b', or 's'
let currentTurn = 'w';
let moveHistory = [];
let toastTimeout = null;
let gameActive = false;

// Authentic Chess.com Sound Effects
const chessSounds = {
    move: new Audio('/sounds/move.mp3'),
    capture: new Audio('/sounds/capture.mp3'),
    check: new Audio('/sounds/check.mp3'),
    illegal: new Audio('/sounds/illegal.mp3'),
    gameEnd: new Audio('/sounds/game-end.mp3'),
    castle: new Audio('/sounds/castle.mp3'),
    promote: new Audio('/sounds/promote.mp3')
};

const playSound = (soundKey) => {
    try {
        const audio = chessSounds[soundKey];
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(err => console.log("Audio play prevented:", err));
        }
    } catch (e) {
        console.log("Audio play error:", e);
    }
};

const showToast = (message) => {
    playSound('illegal');
    toastMsg.innerText = message.toUpperCase();
    toast.classList.remove("translate-y-[-100px]", "opacity-0", "pointer-events-none");
    toast.classList.add("translate-y-0", "opacity-100");

    boardElement.classList.add("shake");
    setTimeout(() => boardElement.classList.remove("shake"), 400);

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.add("translate-y-[-100px]", "opacity-0", "pointer-events-none");
        toast.classList.remove("translate-y-0", "opacity-100");
    }, 3000);
};

const getPieceUnicode = (piece) => {
    const symbolKey = piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase();
    const unicodePieces = {
        K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
        k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟"
    };
    return unicodePieces[symbolKey] || "";
};

const updateUI = () => {
    // Update player role badges
    if (playerRole === 'w') {
        roleText.innerText = "WHITE ♔";
        bottomRoleText.innerText = "WHITE (YOU)";
        topRoleText.innerText = "BLACK (OPPONENT)";
    } else if (playerRole === 'b') {
        roleText.innerText = "BLACK ♚";
        bottomRoleText.innerText = "BLACK (YOU)";
        topRoleText.innerText = "WHITE (OPPONENT)";
    } else {
        roleText.innerText = "SPECTATOR";
        bottomRoleText.innerText = "WHITE";
        topRoleText.innerText = "BLACK";
    }

    // Update Turn Indicator
    if (currentTurn === 'w') {
        turnText.innerText = "WHITE TO MOVE";
        turnDot.className = "w-3 h-3 rounded-full bg-white animate-pulse";
    } else {
        turnText.innerText = "BLACK TO MOVE";
        turnDot.className = "w-3 h-3 rounded-full bg-gray-400 border-2 border-white animate-pulse";
    }

    // Check if in check
    const inCheck = typeof chess.isCheck === 'function' ? chess.isCheck() : (typeof chess.in_check === 'function' ? chess.in_check() : false);
    if (inCheck) {
        turnText.innerText += " — CHECK!";
        turnDot.className = "w-3 h-3 rounded-full bg-red-600 animate-ping";
    }
};

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = "";

    const inCheck = typeof chess.isCheck === 'function' ? chess.isCheck() : (typeof chess.in_check === 'function' ? chess.in_check() : false);
    const checkTurn = chess.turn();

    board.forEach((row, rowindex) => {
        row.forEach((square, squareindex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add(
                "square",
                (rowindex + squareindex) % 2 === 0 ? "light" : "dark"
            );
            squareElement.dataset.row = rowindex;
            squareElement.dataset.col = squareindex;

            // Highlight checked king square
            if (square && square.type === 'k' && square.color === checkTurn && inCheck) {
                squareElement.classList.add("in-check");
            }

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add("piece", square.color === "w" ? "white" : "black");
                pieceElement.innerText = getPieceUnicode(square);

                // Draggable condition: game active, playerRole matches piece color & it is current player's turn
                pieceElement.draggable = gameActive && (playerRole === square.color) && (playerRole === currentTurn);
                if (pieceElement.draggable) {
                    pieceElement.classList.add("draggable");
                }

                pieceElement.addEventListener("dragstart", (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowindex, col: squareindex };
                        squareElement.classList.add("selected");
                        e.dataTransfer.setData("text/plain", "");
                    } else {
                        e.preventDefault();
                    }
                });

                pieceElement.addEventListener("dragend", () => {
                    draggedPiece = null;
                    sourceSquare = null;
                    document.querySelectorAll(".square.selected").forEach(el => el.classList.remove("selected"));
                });

                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener("dragover", (e) => {
                e.preventDefault();
            });

            squareElement.addEventListener("drop", (e) => {
                e.preventDefault();
                if (draggedPiece && sourceSquare) {
                    const targetSquare = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col)
                    };
                    handleMove(sourceSquare, targetSquare);
                }
            });

            boardElement.appendChild(squareElement);
        });
    });

    // Flip board if playing as Black
    if (playerRole === 'b') {
        boardElement.classList.add("flipped");
    } else {
        boardElement.classList.remove("flipped");
    }

    updateUI();
};

const handleMove = (source, target) => {
    if (!gameActive) {
        showToast("Waiting for opponent to join!");
        return;
    }
    if (playerRole !== currentTurn) {
        showToast("It is not your turn!");
        return;
    }

    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: 'q'
    };

    socket.emit("move", move);
};

const renderMoveHistory = () => {
    moveHistoryList.innerHTML = "";
    if (moveHistory.length === 0) {
        moveHistoryList.innerHTML = `<p class="font-mono-sub text-xs text-[#8c8069] text-center py-10 tracking-wider">Moves will appear here as you play...</p>`;
        moveCount.innerText = "0 MOVES";
        return;
    }

    moveCount.innerText = `${moveHistory.length} MOVES`;

    for (let i = 0; i < moveHistory.length; i += 2) {
        const moveRow = document.createElement("div");
        moveRow.className = "flex items-center px-3 py-2 border-b border-[#e2d8c0] hover:bg-[#eae2cf] text-xs font-mono-sub tracking-wider";

        const moveNum = Math.floor(i / 2) + 1;
        const whiteMove = moveHistory[i] ? (moveHistory[i].san || `${moveHistory[i].from}-${moveHistory[i].to}`) : "";
        const blackMove = moveHistory[i + 1] ? (moveHistory[i + 1].san || `${moveHistory[i + 1].from}-${moveHistory[i + 1].to}`) : "";

        moveRow.innerHTML = `
            <span class="w-8 text-[#a39478] font-bold">${moveNum}.</span>
            <span class="flex-1 text-[#1c1a17] font-bold">${whiteMove}</span>
            <span class="flex-1 text-[#70644e] font-bold">${blackMove}</span>
        `;
        moveHistoryList.appendChild(moveRow);
    }
    moveHistoryList.scrollTop = moveHistoryList.scrollHeight;
};

// Socket Listeners
socket.on("playerRole", (role) => {
    playerRole = role;
    moveHistory = [];
    renderMoveHistory();
    renderBoard();
});

socket.on("spectatorRole", () => {
    playerRole = "s";
    renderBoard();
});

socket.on("gameStarted", () => {
    gameActive = true;
    chess.reset();
    moveHistory = [];
    renderMoveHistory();
    gameOverModal.classList.add("hidden");
    renderBoard();
    showToast(playerRole === 'w' ? "GAME STARTED! YOUR MOVE" : "GAME STARTED! WHITE'S MOVE");
});

socket.on("playersState", (state) => {
    if (playerRole === 'w') {
        topOnlineDot.className = state.blackConnected ? "w-2 h-2 rounded-full bg-green-600 animate-pulse" : "w-2 h-2 rounded-full bg-gray-500";
        topPlayerName.childNodes[0].nodeValue = state.blackConnected ? "Opponent " : "Waiting... ";
    } else if (playerRole === 'b') {
        topOnlineDot.className = state.whiteConnected ? "w-2 h-2 rounded-full bg-green-600 animate-pulse" : "w-2 h-2 rounded-full bg-gray-500";
        topPlayerName.childNodes[0].nodeValue = state.whiteConnected ? "Opponent " : "Waiting... ";
    } else {
        topOnlineDot.className = state.blackConnected ? "w-2 h-2 rounded-full bg-green-600" : "w-2 h-2 rounded-full bg-gray-500";
        bottomOnlineDot.className = state.whiteConnected ? "w-2 h-2 rounded-full bg-green-600" : "w-2 h-2 rounded-full bg-gray-500";
    }
});

socket.on("boardState", (fen) => {
    chess.load(fen);
    renderBoard();
});

socket.on("turnChange", (turn) => {
    currentTurn = turn;
    updateUI();
    renderBoard();
});

socket.on("move", (move) => {
    const result = chess.move(move);
    moveHistory.push(move);
    renderMoveHistory();
    renderBoard();

    const inCheck = typeof chess.isCheck === 'function' ? chess.isCheck() : (typeof chess.in_check === 'function' ? chess.in_check() : false);

    if (inCheck) {
        playSound('check');
    } else if (result && result.captured) {
        playSound('capture');
    } else if (result && result.flags && (result.flags.includes('k') || result.flags.includes('q'))) {
        playSound('castle');
    } else if (result && result.promotion) {
        playSound('promote');
    } else {
        playSound('move');
    }
});

socket.on("invalidMove", (data) => {
    showToast(data.message || "Illegal move!");
});

socket.on("gameOver", (data) => {
    gameActive = false;
    gameOverModal.classList.remove("hidden");
    playSound('gameEnd');

    let winnerText = "DRAW";
    let reasonText = "THE GAME ENDED IN A DRAW.";

    if (data.winner === 'w') {
        winnerText = "WHITE WINS ♔";
    } else if (data.winner === 'b') {
        winnerText = "BLACK WINS ♚";
    }

    if (data.reason === 'checkmate') {
        reasonText = "VICTORY BY CHECKMATE";
    } else if (data.reason === 'opponent_disconnected') {
        reasonText = "OPPONENT DISCONNECTED";
    } else if (data.reason === 'stalemate') {
        reasonText = "DRAW BY STALEMATE";
    } else if (data.reason === 'threefold_repetition') {
        reasonText = "DRAW BY THREEFOLD REPETITION";
    } else if (data.reason === 'insufficient_material') {
        reasonText = "DRAW BY INSUFFICIENT MATERIAL";
    }

    modalTitle.innerText = winnerText;
    modalReason.innerText = reasonText;
    renderBoard();
});

socket.on("gameReset", () => {
    chess.reset();
    moveHistory = [];
    gameActive = !!(playerRole === 'w' || playerRole === 'b');
    renderMoveHistory();
    gameOverModal.classList.add("hidden");
    renderBoard();
});

restartBtn.addEventListener("click", () => {
    socket.emit("restartGame");
});

modalPlayAgainBtn.addEventListener("click", () => {
    socket.emit("restartGame");
});

renderBoard();