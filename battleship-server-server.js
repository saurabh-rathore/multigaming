const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const db = require('./battleship-server-db.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const config = JSON.parse(fs.readFileSync('battleship-config.json', 'utf8'));

app.use(express.static('.'));

const players = {};
const boards = {};

io.on('connection', (socket) => {
    console.log('A user connected');
    let player;
    if (!players.player1) {
        players.player1 = socket.id;
        player = 'player1';
        boards.player1 = Array(10).fill(null).map(() => Array(10).fill(null));
    } else if (!players.player2) {
        players.player2 = socket.id;
        player = 'player2';
        boards.player2 = Array(10).fill(null).map(() => Array(10).fill(null));
    } else {
        socket.emit('spectator');
    }

    socket.on('place-ships', (shipPlacements) => {
        boards[player] = shipPlacements;
    });

    socket.on('fire', (coords) => {
        const opponent = player === 'player1' ? 'player2' : 'player1';
        if (boards[opponent]) {
            const hit = boards[opponent][coords.row][coords.col] === 'ship';
            socket.emit('shot-result', { ...coords, hit });
            if (hit) {
                boards[opponent][coords.row][coords.col] = 'hit';
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
        if (players[player]) {
            delete players[player];
            delete boards[player];
        }
    });
});

// Initialize scores
db.run("INSERT OR IGNORE INTO scores (player, wins, losses, draws) VALUES ('player1', 0, 0, 0)");
db.run("INSERT OR IGNORE INTO scores (player, wins, losses, draws) VALUES ('player2', 0, 0, 0)");


const PORT = process.env.PORT || config.api.port;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
