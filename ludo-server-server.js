const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const db = require('./ludo-server-db.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const config = JSON.parse(fs.readFileSync('ludo-config.json', 'utf8'));

app.use(express.static('.'));

let players = {};
let currentPlayer = 'red';
const piecePositions = {
    red: [0, 0, 0, 0],
    green: [0, 0, 0, 0],
    yellow: [0, 0, 0, 0],
    blue: [0, 0, 0, 0]
};

io.on('connection', (socket) => {
    console.log('A user connected');

    // Assign player
    if (!players.red) {
        players.red = socket.id;
        socket.emit('player-assignment', 'red');
    } else if (!players.green) {
        players.green = socket.id;
        socket.emit('player-assignment', 'green');
    } else if (!players.yellow) {
        players.yellow = socket.id;
        socket.emit('player-assignment', 'yellow');
    } else if (!players.blue) {
        players.blue = socket.id;
        socket.emit('player-assignment', 'blue');
    } else {
        socket.emit('spectator');
    }

    socket.on('roll-dice', () => {
        const playerColor = Object.keys(players).find(key => players[key] === socket.id);
        if (playerColor === currentPlayer) {
            const roll = Math.floor(Math.random() * 6) + 1;
            io.emit('dice-rolled', { player: currentPlayer, roll: roll });

            // Simplified game logic: move the first piece
            piecePositions[currentPlayer][0] += roll;
            if (piecePositions[currentPlayer][0] >= 56) {
                const winner = currentPlayer;
                const losers = Object.keys(players).filter(p => p !== winner);
                updateScores(winner, losers);
                io.emit('game-over', `${winner} wins!`);
            } else {
                switchPlayer();
                io.emit('next-player', currentPlayer);
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

function switchPlayer() {
    switch (currentPlayer) {
        case 'red':
            currentPlayer = 'green';
            break;
        case 'green':
            currentPlayer = 'yellow';
            break;
        case 'yellow':
            currentPlayer = 'blue';
            break;
        case 'blue':
            currentPlayer = 'red';
            break;
    }
}

function updateScores(winner, losers) {
    db.run("UPDATE scores SET wins = wins + 1 WHERE player = ?", [winner]);
    for (const loser of losers) {
        db.run("UPDATE scores SET losses = losses + 1 WHERE player = ?", [loser]);
    }
}

// Initialize scores
db.run("INSERT OR IGNORE INTO scores (player, wins, losses, draws) VALUES ('red', 0, 0, 0)");
db.run("INSERT OR IGNORE INTO scores (player, wins, losses, draws) VALUES ('green', 0, 0, 0)");
db.run("INSERT OR IGNORE INTO scores (player, wins, losses, draws) VALUES ('yellow', 0, 0, 0)");
db.run("INSERT OR IGNORE INTO scores (player, wins, losses, draws) VALUES ('blue', 0, 0, 0)");


const PORT = process.env.PORT || config.api.port;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
