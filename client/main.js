const TILES = 11; // TODO: fetch from server
const FPS = 7; // TODO: fetch from server
const GRID_COLOR = "#4d4d4d";
const APPLE_COLOR = "white";
const SNAKE_COLOR = "white";
const HEIGHT_PERCENT = 70;
const WIDTH_PERCENT = 80;
const DEFAULT_SCORE = 1;

let socket = window.io.connect("http://localhost:3000");
socket.on("connect", () => {
  console.log("connected to server");
});

socket.on("game", (game) => {
  snakes = game.snakes.map((snake) => new Snake(snake));
  applePosition = new Vec(game.apple.x, game.apple.y);
  updateCanvas();
  updateScore(game.score);
});

let snakes = [];
let applePosition;

window.onload = () => {
  const width = Math.floor(
    Math.min(
      (HEIGHT_PERCENT / 100) * window.innerHeight,
      (WIDTH_PERCENT / 100) * window.innerWidth
    )
  );
  document.getElementById("canvas").width = width;
  document.getElementById("canvas").height = width;

  window.addEventListener("keydown", (event) => {
    if (/*snake.alive*/ true) {
      try {
        switch (event.code) {
          case "ArrowUp":
          case "KeyW":
            socket.emit("input", "up");
            break;
          case "ArrowDown":
          case "KeyS":
            socket.emit("input", "down");
            break;
          case "ArrowLeft":
          case "KeyA":
            socket.emit("input", "left");
            break;
          case "ArrowRight":
          case "KeyD":
            socket.emit("input", "right");
            break;
        }
      } catch (error) {
        console.log(error.message);
      }
    }
  });

  window.addEventListener("touchstart", handleTouchStart);
  window.addEventListener("touchend", handleTouchEnd);

  document.getElementById("reset").onclick = reset;

  updateCanvas();
};

let touches = [];

const handleTouchStart = (e) => {
  for (let touch of e.changedTouches) {
    touches.push({ id: touch.identifier, x: touch.screenX, y: touch.screenY });
  }
};

const handleTouchEnd = (e) => {
  for (let i = 0; i < e.changedTouches.length; i++) {
    let removedTouchIndex = touches.findIndex(
      (element) => element.id === e.changedTouches[i].identifier
    );
    let difference = new Vec(
      e.changedTouches[i].screenX - touches[removedTouchIndex].x,
      e.changedTouches[i].screenY - touches[removedTouchIndex].y
    );
    touches = [
      ...touches.slice(0, removedTouchIndex),
      ...touches.slice(removedTouchIndex + 1),
    ];
    try {
      if (Math.abs(difference.x) > Math.abs(difference.y)) {
        if (difference.x > 0) {
          socket.emit("input", "right");
        } else {
          socket.emit("input", "left");
        }
      } else {
        if (difference.y > 0) {
          socket.emit("input", "down");
        } else {
          socket.emit("input", "up");
        }
      }
    } catch (error) {
      console.log(error.message);
    }
  }
};

/*const startGame = () => {
  if (!gameLoopId) {
    gameLoopId = setInterval(() => {
      if (snake.alive) {
        updateGame();
        updateScore();
      }
      if (snake.alive) {
        updateCanvas();
      }
    }, (1 / FPS) * 1000);
  }
};*/

/*const pauseGame = () => {
  console.log("pause");
  clearInterval(gameLoopId);
  gameLoopId = null;
};*/

const updateScore = (score) => {
  //let score = snake?.length || DEFAULT_SCORE;

  for (element of document.getElementsByTagName("score")) {
    element.textContent = score;
  }

  if (score > localStorage.getItem("highscore")) {
    localStorage.setItem("highscore", score);
  }

  for (element of document.getElementsByTagName("highscore")) {
    element.textContent = localStorage.getItem("highscore");
  }
};

/*const updateGame = () => {
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
};*/

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
  if (snakes.length > 0) {
    context.strokeStyle = SNAKE_COLOR;
    context.fillStyle = APPLE_COLOR;

    for (let snake of snakes) {
      if (snake?.length === 1) {
        context.strokeRect(
          snake.head.x * tileSize,
          snake.head.y * tileSize,
          tileSize,
          tileSize
        );
      } else {
        const headDirection = snake.head.subtract(snake.cells[1]);
        drawThreeQuarterSquare(context, tileSize, headDirection, snake.head);

        const tailDirection = snake.tail.subtract(
          snake.cells[snake.length - 2]
        );
        drawThreeQuarterSquare(context, tileSize, tailDirection, snake.tail);

        for (
          let cellIndex = 1;
          cellIndex < snake.cells.length - 1;
          cellIndex++
        ) {
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
    }
  }
  if (applePosition) {
    context.beginPath();
    context.arc(
      (applePosition.x + 0.5) * tileSize,
      (applePosition.y + 0.5) * tileSize,
      tileSize / 8,
      0,
      360
    );
    context.fill();
  }
};

const endScreen = () => {
  document.getElementById("end-screen").removeAttribute("closed");
};
socket.on("dead", endScreen);

const reset = () => {
  document.getElementById("end-screen").setAttribute("closed", "true");
  socket.emit("reset");
  /*snake = createSnake();
  applePosition = positionApple(snake);
  updateCanvas();
  updateScore();*/
  // TODO: save highscores
};
