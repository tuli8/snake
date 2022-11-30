const SIZE = 11;// TODO: make size changable
const FPS = 2;// TODO: make fps changable
let snake = new Snake(new Vec(Math.floor(SIZE/2), Math.floor(SIZE/2)), () => {
    endScreen(snake.length);
});

const applePosition = (snake) => {
    const emptySpaces = [];

    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE; j++) {
            emptySpaces.push(new Vec(i, j));
        }
    }

    for (let cell of snake.cells) {
        const index = emptySpaces.map(element => cell.equals(element)).indexOf(true);
        if (index > -1) {
            emptySpaces.splice(index, 1);
        }
    }

    return emptySpaces[Math.floor(Math.random() * emptySpaces.length)]
}

let apple = applePosition(snake);

window.onload = () => {
    window.addEventListener('keydown', (event) => {
        try {
            switch (event.code) {
                case 'ArrowUp':
                    snake.changeDirection(Snake.UP_DIRECTION);
                    break;
                case 'ArrowDown':
                    snake.changeDirection(Snake.DOWN_DIRECTION);
                    break;
                case 'ArrowLeft':
                    snake.changeDirection(Snake.LEFT_DIRECTION);
                    break;
                case 'ArrowRight':
                    snake.changeDirection(Snake.RIGHT_DIRECTION);
                    break;
            }
        } catch (error) {
            console.log(error.message);
        }
    });

    document.getElementById('reset').onclick = reset;

    updateCanvas();
    setInterval(() => {
        updateGame(); 
        if (snake.alive) {
            updateCanvas();
        }
    }, 1/FPS * 1000)
}

const updateGame = () => {
    if (snake.alive) {
        const generatorObj = snake.moveSnake(); 
        generatorObj.next();
    
        if (snake.head.x < 0 || snake.head.x >= SIZE || snake.head.y < 0 || snake.head.y >= SIZE) {
            generatorObj.next(true);
            snake.kill();
        }
    
        if (snake.head.equals(apple)) {
            generatorObj.next(false);
            apple = applePosition(snake);
        } else {
            generatorObj.next(true);
        }
    }
}

const drawLine = ([ctx, tileSize, baseVec, addedX=0, addedY=0, dx=0, dy=0]) => {
    ctx.beginPath();
    ctx.moveTo((baseVec.x + addedX) * tileSize, (baseVec.y + addedY) * tileSize);
    ctx.lineTo((baseVec.x + addedX + dx) * tileSize , (baseVec.y + addedY + dy)* tileSize)
    ctx.stroke();
}

const drawSides = (data, isHorizontal) =>{
    if (isHorizontal) {
        drawLine([...data,0,0,1,0]);
        drawLine([...data,0,1,1,0]);
    } else {
        drawLine([...data,0,0,0,1]);
        drawLine([...data,1,0,0,1]);
    }
}

const drawThreeQuarterSquare = (ctx, tileSize, difference, cell) => {
    const data = [ctx, tileSize, cell]

    if (difference.x === 0) {
        drawSides(data, false);
        if (difference.y === 1) {
            drawLine([...data,0,1,1,0]);
        } else {
            drawLine([...data,0,0,1,0]);
        }
    } else {
        drawSides(data, true); 
        if (difference.x === 1) {
            drawLine([...data,1,0,0,1]);
        } else {
            drawLine([...data,0,0,0,1]);
        }
    }
}

const updateCanvas = () => {// TODO: animate snake
    const ctx = document.getElementById('canvas').getContext('2d');
    const width = document.getElementById('canvas').width;
    ctx.clearRect(0, 0, width, width);
    const tileSize = width / SIZE;
    ctx.strokeStyle = '#4d4d4d'
    
    for (let i = 0; i <SIZE; i++) {
        for (let j = 0 ; j < SIZE; j++) {
            ctx.strokeRect(j*tileSize, i* tileSize, tileSize, tileSize);
        }
    }

    ctx.strokeStyle = 'white';
    ctx.fillStyle = 'white';


    if (snake.length === 1) {
        ctx.strokeRect(snake.head.x*tileSize, snake.head.y* tileSize, tileSize, tileSize);
    } else {
        const headDirection = snake.head.subtract(snake.cells[1]);
        drawThreeQuarterSquare(ctx, tileSize, headDirection, snake.head);

        const tailDirection = snake.tail.subtract(snake.cells[snake.length-2]);
        drawThreeQuarterSquare(ctx, tileSize, tailDirection, snake.tail);


        for (let i = 1; i < snake.cells.length - 1; i++) {
            const firstDifference = snake.cells[i-1].subtract(snake.cells[i]);
            const secondDifference = snake.cells[i].subtract(snake.cells[i+1]);

            if (firstDifference.equals(secondDifference)) {
                drawSides([ctx, tileSize, snake.cells[i]], firstDifference.x !== 0);
            } else {
                const turn = firstDifference.subtract(secondDifference);
                
                drawLine([ctx, tileSize, snake.cells[i], (turn.x-1)/-2, 0, 0, 1]);
                drawLine([ctx, tileSize, snake.cells[i], 0, (turn.y-1)/-2, 1, 0]);
            }
        }
    }
    
    ctx.beginPath();
    ctx.arc((apple.x + 0.5) * tileSize, (apple.y + 0.5) * tileSize, tileSize / 8, 0, 360)
    ctx.fill();
}

const endScreen = (score) => {
    document.getElementById('end-screen').removeAttribute('closed');
    document.getElementById('score').textContent = score;
}

const reset = () => {
    document.getElementById('end-screen').setAttribute('closed', 'true');
    snake = new Snake(new Vec(Math.floor(SIZE/2), Math.floor(SIZE/2)), () => {
        endScreen(snake.length);
    }); 
    apple = applePosition(snake);
    updateCanvas();
    // TODO: save highscores
}