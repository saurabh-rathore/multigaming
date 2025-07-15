const gameBoard = document.getElementById('game-board');
const pieces = [];
const startingPositions = {
    red: [[1, 1], [1, 2], [2, 1], [2, 2]],
    green: [[1, 10], [1, 11], [2, 10], [2, 11]],
    yellow: [[10, 10], [10, 11], [11, 10], [11, 11]],
    blue: [[10, 1], [10, 2], [11, 1], [11, 2]]
};
let playerColor;
let currentPlayer;
const socket = io();
const dice = document.createElement('button');
dice.textContent = 'Roll Dice';
dice.addEventListener('click', () => {
    if (playerColor === currentPlayer) {
        socket.emit('roll-dice');
    }
});
document.body.appendChild(dice);


socket.on('player-assignment', (color) => {
    playerColor = color;
    document.querySelector('h1').textContent = `You are player ${playerColor}`;
});

socket.on('dice-rolled', (data) => {
    alert(`${data.player} rolled a ${data.roll}`);
    // For simplicity, we will just move the first piece of the current player
    const pieceToMove = document.querySelector(`.piece.${data.player}`);
    if (pieceToMove) {
        const currentLeft = parseInt(pieceToMove.style.left);
        pieceToMove.style.left = `${currentLeft + data.roll * 50}px`;
    }
});

socket.on('next-player', (nextPlayer) => {
    currentPlayer = nextPlayer;
    document.querySelector('h1').textContent = `You are player ${playerColor}. It is ${currentPlayer}'s turn.`;
});

socket.on('game-over', (message) => {
    alert(message);
});


for (const color in startingPositions) {
    for (const pos of startingPositions[color]) {
        const piece = document.createElement('div');
        piece.classList.add('piece', color);
        piece.style.top = `${pos[0] * 50}px`;
        piece.style.left = `${pos[1] * 50}px`;
        gameBoard.appendChild(piece);
        pieces.push(piece);
    }
}
