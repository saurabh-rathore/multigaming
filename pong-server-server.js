const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const db = require('./pong-server-db.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const config = JSON.parse(fs.readFileSync('pong-config.json', 'utf8'));

app.use(express.static('.'));

const players = {};
const ball = {
    x: 300,
    y: 200,
    dx: 5,
    dy: 5
};
const paddleHeight = 100;
const scores = { player1: 0, player2: 0 };

io.on('connection', (socket) => {
    console.log('A user connected');
    let player;
    if (!players.player1) {
        players.player1 = { id: socket.id, y: 200 };
        player = 'player1';
    } else if (!players.player2) {
        players.player2 = { id: socket.id, y: 200 };
        player = 'player2';
    }

    socket.on('paddle-move', (y) => {
        if (players[player]) {
            players[player].y = y;
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
        if (players[player]) {
            db.run("INSERT INTO scores (player, score) VALUES (?, ?)", [players[player].id, scores[player]]);
            delete players[player];
        }
    });
});

function gameLoop() {
    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.y < 0 || ball.y > 400) {
        ball.dy = -ball.dy;
    }

    // Collision with paddles
    if (players.player1 && ball.x < 10 && ball.y > players.player1.y && ball.y < players.player1.y + paddleHeight) {
        ball.dx = -ball.dx;
    }
    if (players.player2 && ball.x > 590 && ball.y > players.player2.y && ball.y < players.player2.y + paddleHeight) {
        ball.dx = -ball.dx;
    }

    // Score
    if (ball.x < 0) {
        scores.player2++;
        resetBall();
    } else if (ball.x > 600) {
        scores.player1++;
        resetBall();
    }


    io.emit('game-state', { players, ball, scores });
}

function resetBall() {
    ball.x = 300;
    ball.y = 200;
    ball.dx = -ball.dx;
}

setInterval(gameLoop, 1000 / 60);

const PORT = process.env.PORT || config.api.port;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
