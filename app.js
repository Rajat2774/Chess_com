const express = require('express');
const socket = require('socket.io');
const http = require('http');
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socket(server);

let chess = new Chess();
let players = {}; // { white: socketId, black: socketId }
let gameActive = false;

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('index', { title: "Strategic Chess" });
});

const getGameOverStatus = () => {
    const isCheckmate = typeof chess.isCheckmate === 'function' ? chess.isCheckmate() : (typeof chess.in_checkmate === 'function' ? chess.in_checkmate() : false);
    const isStalemate = typeof chess.isStalemate === 'function' ? chess.isStalemate() : (typeof chess.in_stalemate === 'function' ? chess.in_stalemate() : false);
    const isDraw = typeof chess.isDraw === 'function' ? chess.isDraw() : (typeof chess.in_draw === 'function' ? chess.in_draw() : false);
    const isThreefold = typeof chess.isThreefoldRepetition === 'function' ? chess.isThreefoldRepetition() : (typeof chess.in_threefold_repetition === 'function' ? chess.in_threefold_repetition() : false);
    const isInsufficient = typeof chess.isInsufficientMaterial === 'function' ? chess.isInsufficientMaterial() : (typeof chess.insufficient_material === 'function' ? chess.insufficient_material() : false);

    if (isCheckmate) {
        const winner = chess.turn() === 'w' ? 'b' : 'w';
        return { isOver: true, winner, reason: 'checkmate' };
    }
    if (isStalemate) return { isOver: true, winner: null, reason: 'stalemate' };
    if (isThreefold) return { isOver: true, winner: null, reason: 'threefold_repetition' };
    if (isInsufficient) return { isOver: true, winner: null, reason: 'insufficient_material' };
    if (isDraw) return { isOver: true, winner: null, reason: 'draw' };
    return { isOver: false };
};

const getInCheck = () => {
    return typeof chess.isCheck === 'function' ? chess.isCheck() : (typeof chess.in_check === 'function' ? chess.in_check() : false);
};

const resetBoardState = () => {
    chess = new Chess();
    gameActive = false;
};

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Assign Role
    if (!players.white) {
        players.white = socket.id;
        socket.emit("playerRole", "w");
        resetBoardState();
    } else if (!players.black) {
        players.black = socket.id;
        socket.emit("playerRole", "b");

        // Both players present — start fresh match
        chess = new Chess();
        gameActive = true;

        io.emit("gameStarted");
        io.emit("boardState", chess.fen());
        io.emit("turnChange", chess.turn());
        io.emit("checkStatus", { inCheck: false, turn: chess.turn() });
    } else {
        socket.emit("spectatorRole");
        socket.emit("boardState", chess.fen());
        socket.emit("turnChange", chess.turn());
    }

    // Broadcast active player presence to all clients
    io.emit("playersState", {
        whiteConnected: !!players.white,
        blackConnected: !!players.black
    });

    if (getInCheck()) {
        socket.emit("checkStatus", { inCheck: true, turn: chess.turn() });
    }

    // Handle Moves
    socket.on("move", (move) => {
        try {
            if (!gameActive || !players.white || !players.black) {
                return socket.emit("invalidMove", { message: "Waiting for opponent to join!" });
            }

            if (socket.id !== players.white && socket.id !== players.black) {
                return socket.emit("invalidMove", { message: "Spectators cannot move pieces." });
            }

            if (chess.turn() === 'w' && socket.id !== players.white) {
                return socket.emit("invalidMove", { message: "It is White's turn!" });
            }
            if (chess.turn() === 'b' && socket.id !== players.black) {
                return socket.emit("invalidMove", { message: "It is Black's turn!" });
            }

            const result = chess.move(move);

            if (result) {
                io.emit("move", result);
                io.emit("boardState", chess.fen());
                io.emit("turnChange", chess.turn());
                io.emit("checkStatus", { inCheck: getInCheck(), turn: chess.turn() });

                const gameOverStatus = getGameOverStatus();
                if (gameOverStatus.isOver) {
                    gameActive = false;
                    io.emit("gameOver", gameOverStatus);
                }
            } else {
                socket.emit("invalidMove", { message: "Illegal move attempted." });
            }
        } catch (err) {
            console.log("Move error:", err.message);
            socket.emit("invalidMove", { message: "Illegal move: " + err.message });
        }
    });

    // Handle Restart Game (Play Again)
    socket.on("restartGame", () => {
        if (socket.id !== players.white && socket.id !== players.black) return;

        chess = new Chess();
        if (players.white && players.black) {
            gameActive = true;
            io.emit("gameStarted");
        } else {
            gameActive = false;
            io.emit("gameReset");
        }
        io.emit("boardState", chess.fen());
        io.emit("turnChange", chess.turn());
        io.emit("checkStatus", { inCheck: false, turn: chess.turn() });
    });

    // Handle Disconnect
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);

        const wasWhite = socket.id === players.white;
        const wasBlack = socket.id === players.black;

        if (!wasWhite && !wasBlack) return; // Spectator left

        if (wasWhite) delete players.white;
        if (wasBlack) delete players.black;

        const hadActiveGame = gameActive;
        resetBoardState();

        if (hadActiveGame) {
            const winner = wasWhite ? 'b' : 'w';
            io.emit("gameOver", { winner, reason: "opponent_disconnected" });
        } else {
            io.emit("gameReset");
        }

        // If the remaining player was Black, reassign them to White so they wait as White for the next opponent
        if (players.black && !players.white) {
            const remainingId = players.black;
            delete players.black;
            players.white = remainingId;

            const remainingSocket = io.sockets.sockets.get(remainingId);
            if (remainingSocket) {
                remainingSocket.emit("playerRole", "w");
            }
        }

        io.emit("playersState", {
            whiteConnected: !!players.white,
            blackConnected: !!players.black
        });
        io.emit("boardState", chess.fen());
        io.emit("turnChange", chess.turn());
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
