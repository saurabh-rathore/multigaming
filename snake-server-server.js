const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const db = require('./snake-server-db.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const config = JSON.parse(fs.readFileSync('snake-config.json', 'utf8'));

app.use(express.static('.'));

const players = {};
const food = { x: 15, y: 15 };
const gridSize = 20;

io.on('connection', (socket) => {
    console.log('A user connected');
    players[socket.id] = {
        snake: [{ x: 10, y: 10 }],
        direction: 'right',
        score: 0
    };

    socket.on('change-direction', (direction) => {
        players[socket.id].direction = direction;
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
        if (players[socket.id]) {
            db.run("INSERT INTO scores (player, score) VALUES (?, ?)", [socket.id, players[socket.id].score]);
            delete players[socket.id];
        }
    });
});

function gameLoop() {
    for (const id in players) {
        const player = players[id];
        const head = { x: player.snake[0].x, y: player.snake[0].y };

        switch (player.direction) {
            case 'up':
                head.y--;
                break;
            case 'down':
                head.y++;
                break;
            case 'left':
                head.x--;
                break;
            case 'right':
                head.x++;
                break;
        }

        player.snake.unshift(head);

        if (head.x === food.x && head.y === food.y) {
            player.score++;
            food.x = Math.floor(Math.random() * (400 / gridSize));
            food.y = Math.floor(Math.random() * (400 / gridSize));
        } else {
            player.snake.pop();
        }
    }

    io.emit('game-state', { players, food });
}

setInterval(gameLoop, 100);

const PORT = process.env.PORT || config.api.port;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
