const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const socket = io();

const gridSize = 20;

socket.on('game-state', (gameState) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const id in gameState.players) {
        const player = gameState.players[id];
        ctx.fillStyle = id === socket.id ? 'green' : 'blue';
        for (const segment of player.snake) {
            ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize, gridSize);
        }
    }

    ctx.fillStyle = 'red';
    ctx.fillRect(gameState.food.x * gridSize, gameState.food.y * gridSize, gridSize, gridSize);
});

document.addEventListener('keydown', (event) => {
    let direction;
    switch (event.key) {
        case 'ArrowUp':
            direction = 'up';
            break;
        case 'ArrowDown':
            direction = 'down';
            break;
        case 'ArrowLeft':
            direction = 'left';
            break;
        case 'ArrowRight':
            direction = 'right';
            break;
    }
    if (direction) {
        socket.emit('change-direction', direction);
    }
});
