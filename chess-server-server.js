const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const { Chess } = require('chess.js');
const db = require('./chess-server-db.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const config = JSON.parse(fs.readFileSync('chess-config.json', 'utf8'));

app.use(express.static('.'));

const chess = new Chess();
let players = {};

io.on('connection', (socket) => {
    console.log('A user connected');

    // Assign player
    if (!players.white) {
        players.white = socket.id;
        socket.emit('player-assignment', 'w');
    } else if (!players.black) {
        players.black = socket.id;
        socket.emit('player-assignment', 'b');
    } else {
        socket.emit('spectator');
    }

    socket.on('move', (move) => {
        const playerColor = Object.keys(players).find(key => players[key] === socket.id);
        if (playerColor && chess.turn() === playerColor[0]) {
            const result = chess.move(move);
            if (result) {
                io.emit('board-state', chess.fen());
                if (chess.isGameOver()) {
                    let message = 'Game over';
                    if (chess.isCheckmate()) {
                        const winner = playerColor;
                        const loser = winner === 'white' ? 'black' : 'white';
                        updateScores(winner, loser);
                        message = `Checkmate! ${winner} wins!`;
                    } else if (chess.isDraw()) {
                        updateScores(null, null, true);
                        message = 'Draw!';
                    }
                    io.emit('game-over', message);
                }
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
        const playerColor = Object.keys(players).find(key => players[key] === socket.id);
        if (playerColor) {
            delete players[playerColor];
        }
    });
});

function updateScores(winner, loser, isDraw = false) {
    if (isDraw) {
        db.run("UPDATE scores SET draws = draws + 1 WHERE player IN ('white', 'black')");
    } else {
        db.run("UPDATE scores SET wins = wins + 1 WHERE player = ?", [winner]);
        db.run("UPDATE scores SET losses = losses + 1 WHERE player = ?", [loser]);
    }
}

// Initialize scores
db.run("INSERT OR IGNORE INTO scores (player, wins, losses, draws) VALUES ('white', 0, 0, 0)");
db.run("INSERT OR IGNORE INTO scores (player, wins, losses, draws) VALUES ('black', 0, 0, 0)");

const PORT = process.env.PORT || config.api.port;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
