const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const db = require('./connect-four-server-db.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const config = JSON.parse(fs.readFileSync('connect-four-config.json', 'utf8'));

app.use(express.static('.'));

let players = {};
let currentPlayer = 'red';
const board = Array(6).fill(null).map(() => Array(7).fill(null));

io.on('connection', (socket) => {
    console.log('A user connected');
    let playerColor;
    if (!players.red) {
        players.red = socket.id;
        playerColor = 'red';
    } else if (!players.yellow) {
        players.yellow = socket.id;
        playerColor = 'yellow';
    } else {
        socket.emit('spectator');
    }
    socket.emit('player-assignment', playerColor);

    socket.on('drop-disc', (column) => {
        if (players[currentPlayer] === socket.id) {
            for (let i = 0; i < 6; i++) {
                if (!board[i][column]) {
                    board[i][column] = currentPlayer;
                    io.emit('board-state', board);
                    if (checkWin(currentPlayer)) {
                        const winner = currentPlayer;
                        const loser = winner === 'red' ? 'yellow' : 'red';
                        updateScores(winner, loser);
                        io.emit('game-over', `${winner} wins!`);
                    } else {
                        currentPlayer = currentPlayer === 'red' ? 'yellow' : 'red';
                    }
                    break;
                }
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
        const player = Object.keys(players).find(key => players[key] === socket.id);
        if (player) {
            delete players[player];
        }
    });
});

function checkWin(player) {
    // Check horizontal
    for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 4; col++) {
            if (board[row][col] === player && board[row][col + 1] === player && board[row][col + 2] === player && board[row][col + 3] === player) {
                return true;
            }
        }
    }
    // Check vertical
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 7; col++) {
            if (board[row][col] === player && board[row + 1][col] === player && board[row + 2][col] === player && board[row + 3][col] === player) {
                return true;
            }
        }
    }
    // Check diagonal (down-right)
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
            if (board[row][col] === player && board[row + 1][col + 1] === player && board[row + 2][col + 2] === player && board[row + 3][col + 3] === player) {
                return true;
            }
        }
    }
    // Check diagonal (up-right)
    for (let row = 3; row < 6; row++) {
        for (let col = 0; col < 4; col++) {
            if (board[row][col] === player && board[row - 1][col + 1] === player && board[row - 2][col + 2] === player && board[row - 3][col + 3] === player) {
                return true;
            }
        }
    }
    return false;
}

function updateScores(winner, loser) {
    db.run("UPDATE scores SET wins = wins + 1 WHERE player = ?", [winner]);
    db.run("UPDATE scores SET losses = losses + 1 WHERE player = ?", [loser]);
}

// Initialize scores
db.run("INSERT OR IGNORE INTO scores (player, wins, losses, draws) VALUES ('red', 0, 0, 0)");
db.run("INSERT OR IGNORE INTO scores (player, wins, losses, draws) VALUES ('yellow', 0, 0, 0)");


const PORT = process.env.PORT || config.api.port;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
