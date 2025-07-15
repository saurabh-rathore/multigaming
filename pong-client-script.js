const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const socket = io();

const paddleWidth = 10;
const paddleHeight = 100;
const ballSize = 10;

socket.on('game-state', (gameState) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    if (gameState.players.player1) {
        ctx.fillRect(0, gameState.players.player1.y, paddleWidth, paddleHeight);
    }
    if (gameState.players.player2) {
        ctx.fillRect(canvas.width - paddleWidth, gameState.players.player2.y, paddleWidth, paddleHeight);
    }

    ctx.beginPath();
    ctx.arc(gameState.ball.x, gameState.ball.y, ballSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '20px sans-serif';
    ctx.fillText(gameState.scores.player1, 100, 50);
    ctx.fillText(gameState.scores.player2, canvas.width - 100, 50);
});

document.addEventListener('mousemove', (event) => {
    const y = event.clientY - canvas.offsetTop - paddleHeight / 2;
    socket.emit('paddle-move', y);
});
