const TILES = 11; // TODO: make TILES changable
const FPS = 7; // TODO: make fps changable
const GRID_COLOR = "#4d4d4d";
const APPLE_COLOR = "white";
const SNAKE_COLOR = "white";
const HEIGHT_PERCENT = 70;

let snake = new Snake(
  new Vec(Math.floor(TILES / 2), Math.floor(TILES / 2)),
  () => {
    endScreen(snake.length);
  }
);

const positionApple = (snake) => {
  const emptyCells = [];

  for (let rowIndex = 0; rowIndex < TILES; rowIndex++) {
    for (let columnIndex = 0; columnIndex < TILES; columnIndex++) {
      emptyCells.push(new Vec(rowIndex, columnIndex));
    }
  }

  for (let cell of snake.cells) {
    const index = emptyCells
      .map((element) => cell.equals(element))
      .indexOf(true);
    if (index > -1) {
      emptyCells.splice(index, 1);
    }
  }

  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
};

let applePosition = positionApple(snake);

window.onload = () => {
  document.getElementById("canvas").width = Math.floor(
    (HEIGHT_PERCENT / 100) * window.innerHeight
  );
  document.getElementById("canvas").height = Math.floor(
    (HEIGHT_PERCENT / 100) * window.innerHeight
  );

  window.addEventListener("keydown", (event) => {
    try {
      switch (event.code) {
        case "ArrowUp":
          snake.changeDirection(Snake.UP_DIRECTION);
          break;
        case "ArrowDown":
          snake.changeDirection(Snake.DOWN_DIRECTION);
          break;
        case "ArrowLeft":
          snake.changeDirection(Snake.LEFT_DIRECTION);
          break;
        case "ArrowRight":
          snake.changeDirection(Snake.RIGHT_DIRECTION);
          break;
      }
    } catch (error) {
      console.log(error.message);
    }
  });

  document.getElementById("reset").onclick = reset;

  updateCanvas();
  setInterval(() => {
    if (snake.alive) {
      updateGame();
    }
    if (snake.alive) {
      updateCanvas();
    }
  }, (1 / FPS) * 1000);
};

const updateGame = () => {
  const generatorObj = snake.moveSnake();
  generatorObj.next();

  if (
    snake.head.x < 0 ||
    snake.head.x >= TILES ||
    snake.head.y < 0 ||
    snake.head.y >= TILES
  ) {
    generatorObj.next(true);
    snake.kill();
  }

  if (snake.head.equals(applePosition)) {
    generatorObj.next(false);
    applePosition = positionApple(snake);
  } else {
    generatorObj.next(true);
  }
};

const drawLine = ([
  context,
  tileSize,
  basePosition,
  addedX = 0,
  addedY = 0,
  dx = 0,
  dy = 0,
]) => {
  context.beginPath();
  context.moveTo(
    (basePosition.x + addedX) * tileSize,
    (basePosition.y + addedY) * tileSize
  );
  context.lineTo(
    (basePosition.x + addedX + dx) * tileSize,
    (basePosition.y + addedY + dy) * tileSize
  );
  context.stroke();
};

const drawParallelLines = (data, isHorizontal) => {
  if (isHorizontal) {
    drawLine([...data, 0, 0, 1, 0]);
    drawLine([...data, 0, 1, 1, 0]);
  } else {
    drawLine([...data, 0, 0, 0, 1]);
    drawLine([...data, 1, 0, 0, 1]);
  }
};

const drawThreeQuarterSquare = (context, tileSize, difference, cell) => {
  const data = [context, tileSize, cell];

  if (difference.x === 0) {
    drawParallelLines(data, false);
    if (difference.y === 1) {
      drawLine([...data, 0, 1, 1, 0]);
    } else {
      drawLine([...data, 0, 0, 1, 0]);
    }
  } else {
    drawParallelLines(data, true);
    if (difference.x === 1) {
      drawLine([...data, 1, 0, 0, 1]);
    } else {
      drawLine([...data, 0, 0, 0, 1]);
    }
  }
};

const updateCanvas = () => {
  // TODO: animate snake
  const context = document.getElementById("canvas").getContext("2d");
  const canvasWidth = document.getElementById("canvas").width;
  context.clearRect(0, 0, canvasWidth, canvasWidth);
  const tileSize = canvasWidth / TILES;
  context.strokeStyle = GRID_COLOR;

  for (let rowIndex = 0; rowIndex < TILES; rowIndex++) {
    for (let columnIndex = 0; columnIndex < TILES; columnIndex++) {
      context.strokeRect(
        columnIndex * tileSize,
        rowIndex * tileSize,
        tileSize,
        tileSize
      );
    }
  }

  context.strokeStyle = SNAKE_COLOR;
  context.fillStyle = APPLE_COLOR;

  if (snake.length === 1) {
    context.strokeRect(
      snake.head.x * tileSize,
      snake.head.y * tileSize,
      tileSize,
      tileSize
    );
  } else {
    const headDirection = snake.head.subtract(snake.cells[1]);
    drawThreeQuarterSquare(context, tileSize, headDirection, snake.head);

    const tailDirection = snake.tail.subtract(snake.cells[snake.length - 2]);
    drawThreeQuarterSquare(context, tileSize, tailDirection, snake.tail);

    for (let cellIndex = 1; cellIndex < snake.cells.length - 1; cellIndex++) {
      const firstDifference = snake.cells[cellIndex - 1].subtract(
        snake.cells[cellIndex]
      );
      const secondDifference = snake.cells[cellIndex].subtract(
        snake.cells[cellIndex + 1]
      );

      if (firstDifference.equals(secondDifference)) {
        drawParallelLines(
          [context, tileSize, snake.cells[cellIndex]],
          firstDifference.x !== 0
        );
      } else {
        const turnType = firstDifference.subtract(secondDifference);

        drawLine([
          context,
          tileSize,
          snake.cells[cellIndex],
          (turnType.x - 1) / -2,
          0,
          0,
          1,
        ]);
        drawLine([
          context,
          tileSize,
          snake.cells[cellIndex],
          0,
          (turnType.y - 1) / -2,
          1,
          0,
        ]);
      }
    }
  }

  context.beginPath();
  context.arc(
    (applePosition.x + 0.5) * tileSize,
    (applePosition.y + 0.5) * tileSize,
    tileSize / 8,
    0,
    360
  );
  context.fill();
};

const endScreen = (score) => {
  document.getElementById("end-screen").removeAttribute("closed");
  document.getElementById("score").textContent = score;
};

const reset = () => {
  document.getElementById("end-screen").setAttribute("closed", "true");
  snake = new Snake(
    new Vec(Math.floor(TILES / 2), Math.floor(TILES / 2)),
    () => {
      endScreen(snake.length);
    }
  );
  applePosition = positionApple(snake);
  updateCanvas();
  // TODO: save highscores
};
