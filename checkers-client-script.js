const gameBoard = document.getElementById('game-board');
const socket = io();
const squares = [];
let selectedPiece = null;
let playerColor;

for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
        const square = document.createElement('div');
        square.classList.add('square');
        square.dataset.row = i;
        square.dataset.col = j;
        if ((i + j) % 2 === 0) {
            square.classList.add('white');
        } else {
            square.classList.add('black');
        }
        square.addEventListener('click', handleSquareClick);
        squares.push(square);
        gameBoard.appendChild(square);
    }
}

socket.on('player-assignment', (color) => {
    playerColor = color;
    document.querySelector('h1').textContent = `You are player ${playerColor}`;
});

socket.on('board-state', (board) => {
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const square = squares[i * 8 + j];
            const piece = square.querySelector('.piece');
            if (piece) {
                piece.remove();
            }
            if (board[i][j]) {
                const newPiece = document.createElement('div');
                newPiece.classList.add('piece', board[i][j] === 'red' ? 'red' : 'black-piece');
                square.appendChild(newPiece);
            }
        }
    }
});

function handleSquareClick(event) {
    const clickedSquare = event.currentTarget;
    if (selectedPiece) {
        const from = {
            row: parseInt(selectedPiece.parentNode.dataset.row),
            col: parseInt(selectedPiece.parentNode.dataset.col)
        };
        const to = {
            row: parseInt(clickedSquare.dataset.row),
            col: parseInt(clickedSquare.dataset.col)
        };
        socket.emit('move', { from, to });
        selectedPiece.parentNode.classList.remove('selected');
        selectedPiece = null;
    } else if (clickedSquare.querySelector('.piece')) {
        const pieceColor = clickedSquare.querySelector('.piece').classList.contains('red') ? 'red' : 'black';
        if (pieceColor === playerColor) {
            selectedPiece = clickedSquare.querySelector('.piece');
            clickedSquare.classList.add('selected');
        }
    }
}
