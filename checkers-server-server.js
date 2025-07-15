const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const db = require('./checkers-server-db.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const config = JSON.parse(fs.readFileSync('checkers-config.json', 'utf8'));

app.use(express.static('.'));

const players = {};
let currentPlayer = 'red';
const board = [
    ['', 'red', '', 'red', '', 'red', '', 'red'],
    ['red', '', 'red', '', 'red', '', 'red', ''],
    ['', 'red', '', 'red', '', 'red', '', 'red'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['black', '', 'black', '', 'black', '', 'black', ''],
    ['', 'black', '', 'black', '', 'black', '', 'black'],
    ['black', '', 'black', '', 'black', '', 'black', '']
];

io.on('connection', (socket) => {
    console.log('A user connected');
    let playerColor;
    if (!players.red) {
        players.red = socket.id;
        playerColor = 'red';
    } else if (!players.black) {
        players.black = socket.id;
        playerColor = 'black';
    } else {
        socket.emit('spectator');
    }
    socket.emit('player-assignment', playerColor);
    socket.emit('board-state', board);

    socket.on('move', (move) => {
        const { from, to } = move;
        if (players[currentPlayer] === socket.id) {
            const piece = board[from.row][from.col];
            board[from.row][from.col] = '';
            board[to.row][to.col] = piece;
            io.emit('board-state', board);
            currentPlayer = currentPlayer === 'red' ? 'black' : 'red';
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

// Initialize scores
db.run("INSERT OR IGNORE INTO scores (player, wins, losses, draws) VALUES ('red', 0, 0, 0)");
db.run("INSERT OR IGNORE INTO scores (player, wins, losses, draws) VALUES ('black', 0, 0, 0)");

const PORT = process.env.PORT || config.api.port;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
