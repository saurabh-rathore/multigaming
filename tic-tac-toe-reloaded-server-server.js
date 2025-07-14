const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const config = JSON.parse(fs.readFileSync('tic-tac-toe-reloaded-config.json', 'utf8'));

app.use(express.static('.'));

let players = {};
let currentPlayer = 'X';
let boardState = ['', '', '', '', '', '', '', '', ''];

io.on('connection', (socket) => {
    console.log('A user connected');

    // Assign player
    if (!players.X) {
        players.X = socket.id;
        socket.emit('player-assignment', 'X');
    } else if (!players.O) {
        players.O = socket.id;
        socket.emit('player-assignment', 'O');
    } else {
        socket.emit('spectator');
    }

    socket.on('move', (data) => {
        if (socket.id === players[currentPlayer]) {
            boardState[data.index] = currentPlayer;
            io.emit('board-state', boardState);

            if (checkWin(currentPlayer)) {
                updateScores(currentPlayer, getOpponent(currentPlayer));
                io.emit('game-over', `${currentPlayer} wins!`);
                resetGame();
            } else if (boardState.every(cell => cell !== '')) {
                updateScores(null, null, true);
                io.emit('game-over', 'Draw!');
                resetGame();
            } else {
                currentPlayer = getOpponent(currentPlayer);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
        const player = Object.keys(players).find(key => players[key] === socket.id);
        if (player) {
            delete players[player];
            resetGame();
        }
    });
});

function checkWin(player) {
    const winningConditions = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6]             // Diagonals
    ];
    return winningConditions.some(condition => {
        return condition.every(index => boardState[index] === player);
    });
}

function getOpponent(player) {
    return player === 'X' ? 'O' : 'X';
}

function resetGame() {
    boardState = ['', '', '', '', '', '', '', '', ''];
    currentPlayer = 'X';
    io.emit('board-state', boardState);
}

function updateScores(winner, loser, isDraw = false) {
    if (isDraw) {
        db.run("UPDATE scores SET draws = draws + 1 WHERE player IN ('X', 'O')");
    } else {
        db.run("UPDATE scores SET wins = wins + 1 WHERE player = ?", [winner]);
        db.run("UPDATE scores SET losses = losses + 1 WHERE player = ?", [loser]);
    }
}

// Initialize scores
db.run("INSERT OR IGNORE INTO scores (player, wins, losses, draws) VALUES ('X', 0, 0, 0)");
db.run("INSERT OR IGNORE INTO scores (player, wins, losses, draws) VALUES ('O', 0, 0, 0)");


const PORT = process.env.PORT || config.api.port;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
