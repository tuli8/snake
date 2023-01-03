var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

const socketIO = require("socket.io");
const http = require("http");
const port = 3000;

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");

var app = express();

let server = http.createServer(app);
let io = socketIO(server, {
  cors: {
    origin: "*",
  },
});

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

server.listen(port);

const TILES = 11; // TODO: make TILES changable
const FPS = 1; //7; // TODO: make fps changable
const { Snake } = require("./snake.js");
const { Vec } = require("./vector.js");

const getCentralEmptyPosition = () => {
  let center = new Vec(Math.floor(TILES / 2), Math.floor(TILES / 2));
  let position = center;
  const checkPosition = (position) =>
    position.x >= 0 &&
    position.y >= 0 &&
    position.x < TILES &&
    position.y < TILES &&
    Object.values(snakes)
      .map((snake) => snake.cells)
      .reduce((arr, cells) => {
        arr.push(...cells);
        return arr;
      }, [])
      .filter((cell) => cell.equals(position)).length === 0;

  if (checkPosition(position)) {
    return position;
  }

  while (position.y >= -0.5 * TILES) {
    position = position.add(new Vec(0, -1));
    if (checkPosition(position)) {
      return position;
    }
    while (position.y < center.y) {
      position = position.add(new Vec(1, 1));
      if (checkPosition(position)) {
        return position;
      }
    }
    while (position.x > center.x) {
      position = position.add(new Vec(-1, 1));
      if (checkPosition(position)) {
        return position;
      }
    }
    while (position.y > center.y) {
      position = position.add(new Vec(-1, -1));
      if (checkPosition(position)) {
        return position;
      }
    }
    while (position.x < center.x) {
      position = position.add(new Vec(1, -1));
      if (checkPosition(position)) {
        return position;
      }
    }
  }

  throw new Error("no empty position");
};

const createSnake = (ownerId) => {
  let snakePosition = getCentralEmptyPosition();

  return new Snake(new Vec(snakePosition.x, snakePosition.y), () => {
    console.log("dead");
    io.to(ownerId).emit("dead");
    snakes = Object.keys(snakes)
      .filter((key) => key !== ownerId)
      .reduce((obj, key) => {
        obj[key] = snakes[key];
        return obj;
      }, {});
  });
};

//let snake = createSnake();
let snakes = {};

const positionApple = (snakes) => {
  const emptyCells = [];

  for (let rowIndex = 0; rowIndex < TILES; rowIndex++) {
    for (let columnIndex = 0; columnIndex < TILES; columnIndex++) {
      emptyCells.push(new Vec(rowIndex, columnIndex));
    }
  }

  for (let snake of Object.values(snakes)) {
    for (let cell of snake.cells) {
      const index = emptyCells
        .map((element) => cell.equals(element))
        .indexOf(true);
      if (index > -1) {
        emptyCells.splice(index, 1);
      }
    }
  }

  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
};

let applePosition = positionApple(snakes);
//let gameLoopId;

/*const startGame = () => {
  if (!gameLoopId) {
    gameLoopId = setInterval(() => {
      if (Object.values(snakes).filter(snake => snake.alive).length > 0) {
        updateGame();
      }
    }, (1 / FPS) * 1000);
  }
};*/

setInterval(() => {
  if (Object.values(snakes).filter((snake) => snake.alive).length > 0) {
    updateGame();
  }
}, (1 / FPS) * 1000);

/*const pauseGame = () => {
  clearInterval(gameLoopId);
  gameLoopId = null;
};*/

const emitGameToAll = (io) => {
  if (Object.values(snakes).filter((snake) => snake.alive).length > 0) {
    for (let client of users) {
      emitGame(io.to(client), client);
    }
  }
};
const emitGame = (socket, socketId) => {
  if (Object.values(snakes).filter((snake) => snake.alive).length > 0) {
    socket.emit("game", {
      snakes: Object.values(snakes).map((snake) => snake.json),
      score: snakes[socketId]?.length,
      apple: applePosition.json,
    });
  }
};

const checkSnakeCollisions = () => {
  let collisionBoard = [];

  for (let i in Array.apply(null, Array(TILES))) {
    collisionBoard[i] = [];
    for (let j in Array.apply(null, Array(TILES))) {
      collisionBoard[i][j] = { body: [], head: [] };
    }
  }

  for (let id in snakes) {
    for (let bodyCell of snakes[id].body) {
      collisionBoard[bodyCell.x][bodyCell.y].body.push(id);
    }

    collisionBoard[snakes[id].head.x][snakes[id].head.y].head.push(id);
  }

  for (let i in collisionBoard) {
    for (let j in collisionBoard[i]) {
      if (collisionBoard[i][j].head.length > 1) {
        for (let id of collisionBoard[i][j].head) {
          snakes[id].kill();
        }
      } else if (
        collisionBoard[i][j].head.length === 1 &&
        collisionBoard[i][j].body.length > 0
      ) {
        snakes[collisionBoard[i][j].head[0]].kill();
      }
    }
  }
};

const updateGame = () => {
  for (let snake of Object.values(snakes)) {
    // TODO: take care of two snakes killing each other
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
    } else if (snake.head.equals(applePosition)) {
      generatorObj.next(false);
      applePosition = positionApple(snakes);
    } else {
      generatorObj.next(true);
    }
  }

  checkSnakeCollisions();

  emitGameToAll(io);
};

const reset = (socketId) => {
  //TODO: create reset
  //snakes.push(createSnake());
  snakes[socketId] = createSnake(socketId);
  //applePosition = positionApple(snake);
  emitGameToAll(io);
  // TODO: save highscores
};

let users = [];

io.on("connection", (socket) => {
  console.log("new user has connected");
  snakes[socket.id] = createSnake(socket.id);
  emitGame(socket, socket.id);
  users.push(socket.id);
  socket.on("input", (input) => {
    console.log(`input ${input}`);
    if (snakes[socket.id]?.alive) {
      try {
        switch (input) {
          case "up":
            snakes[socket.id].changeDirection(Snake.UP_DIRECTION);
            //startGame();
            break;
          case "down":
            snakes[socket.id].changeDirection(Snake.DOWN_DIRECTION);
            //startGame();
            break;
          case "left":
            snakes[socket.id].changeDirection(Snake.LEFT_DIRECTION);
            //startGame();
            break;
          case "right":
            snakes[socket.id].changeDirection(Snake.RIGHT_DIRECTION);
            //startGame();
            break;
        }
      } catch (error) {
        console.log(error.message);
      }
    }
  });

  socket.on("reset", () => reset(socket.id));

  socket.on("disconnect", () => {
    console.log("disconnected from user");
    users = users.filter((user) => user !== socket.id);
  });
});

module.exports = app;
