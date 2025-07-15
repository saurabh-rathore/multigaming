const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const matter = require('matter-js');
const db = require('./pool-server-db.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const config = JSON.parse(fs.readFileSync('pool-config.json', 'utf8'));

app.use(express.static('.'));

const { Engine, World, Bodies, Body, Events } = matter;
const engine = Engine.create();
engine.world.gravity.y = 0;

const balls = [];
const ballColors = [
    'white', 'yellow', 'blue', 'red', 'purple', 'orange', 'green', 'brown',
    'black', 'yellow', 'blue', 'red', 'purple', 'orange', 'green', 'brown'
];
for (let i = 0; i < 16; i++) {
    const isCueBall = i === 0;
    const x = isCueBall ? 200 : 600 + (i % 4) * 25;
    const y = isCueBall ? 200 : 150 + Math.floor(i / 4) * 25;
    const ball = Bodies.circle(x, y, 10, {
        restitution: 0.8,
        friction: 0.1
    });
    balls.push(ball);
}
World.add(engine.world, balls);

const players = {};

io.on('connection', (socket) => {
    console.log('A user connected');
    let player;
    if (!players.player1) {
        players.player1 = socket.id;
        player = 'player1';
    } else if (!players.player2) {
        players.player2 = socket.id;
        player = 'player2';
    }


    socket.on('shoot', (data) => {
        const { ballIndex, force } = data;
        Body.applyForce(balls[ballIndex], balls[ballIndex].position, force);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
        if (players[player]) {
            // No scoring logic yet
            delete players[player];
        }
    });
});

function gameLoop() {
    Engine.update(engine, 1000 / 60);
    const ballPositions = balls.map(ball => ({ x: ball.position.x, y: ball.position.y }));
    io.emit('game-state', ballPositions);
}

setInterval(gameLoop, 1000 / 60);

const PORT = process.env.PORT || config.api.port;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
