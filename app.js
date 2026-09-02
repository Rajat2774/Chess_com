const express = require('express');
const socket = require('socket.io');
const http = require('http');
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socket(server);

let chess = new Chess();
let players = {};

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('index', { title: "Chess.com Clone" });
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
    if (isStalemate) {
        return { isOver: true, winner: null, reason: 'stalemate' };
    }
    if (isThreefold) {
        return { isOver: true, winner: null, reason: 'threefold_repetition' };
    }
    if (isInsufficient) {
        return { isOver: true, winner: null, reason: 'insufficient_material' };
    }
    if (isDraw) {
        return { isOver: true, winner: null, reason: 'draw' };
    }
    return { isOver: false };
};

const getInCheck = () => {
    return typeof chess.isCheck === 'function' ? chess.isCheck() : (typeof chess.in_check === 'function' ? chess.in_check() : false);
};

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Assign player roles
    if (!players.white) {
        players.white = socket.id;
        socket.emit("playerRole", "w");
    } else if (!players.black) {
        players.black = socket.id;
        socket.emit("playerRole", "b");
    } else {
        socket.emit("spectatorRole");
    }

    // Send initial game state to connected client
    socket.emit("boardState", chess.fen());
    socket.emit("turnChange", chess.turn());
    io.emit("playersState", {
        whiteConnected: !!players.white,
        blackConnected: !!players.black
    });

    if (getInCheck()) {
        socket.emit("checkStatus", { inCheck: true, turn: chess.turn() });
    }

    // Check if game is already over when joining
    const initialGameOver = getGameOverStatus();
    if (initialGameOver.isOver) {
        socket.emit("gameOver", initialGameOver);
    }

    // Handle Moves
    socket.on("move", (move) => {
        try {
            // Check if player is assigned a role
            if (socket.id !== players.white && socket.id !== players.black) {
                return socket.emit("invalidMove", { message: "Spectators cannot move pieces." });
            }

            // Check turn authorization
            if (chess.turn() === 'w' && socket.id !== players.white) {
                return socket.emit("invalidMove", { message: "It is White's turn!" });
            }
            if (chess.turn() === 'b' && socket.id !== players.black) {
                return socket.emit("invalidMove", { message: "It is Black's turn!" });
            }

            // Execute move
            const result = chess.move(move);

            if (result) {
                io.emit("move", result);
                io.emit("boardState", chess.fen());
                io.emit("turnChange", chess.turn());

                const inCheck = getInCheck();
                io.emit("checkStatus", { inCheck, turn: chess.turn() });

                const gameOverStatus = getGameOverStatus();
                if (gameOverStatus.isOver) {
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

    // Handle Restart Game
    socket.on("restartGame", () => {
        chess = new Chess();
        io.emit("gameReset");
        io.emit("boardState", chess.fen());
        io.emit("turnChange", chess.turn());
        io.emit("checkStatus", { inCheck: false, turn: chess.turn() });
    });

    // Handle Disconnect
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        if (socket.id === players.white) {
            delete players.white;
            io.emit("playerLeft", { role: "w" });
            io.emit("playersState", { whiteConnected: false, blackConnected: !!players.black });
            if (players.black) {
                io.emit("gameOver", { winner: "b", reason: "opponent_disconnected" });
            }
        } else if (socket.id === players.black) {
            delete players.black;
            io.emit("playerLeft", { role: "b" });
            io.emit("playersState", { whiteConnected: !!players.white, blackConnected: false });
            if (players.white) {
                io.emit("gameOver", { winner: "w", reason: "opponent_disconnected" });
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
