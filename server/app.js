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

let users = {};

const getCentralEmptyPosition = () => {
  let center = new Vec(Math.floor(TILES / 2), Math.floor(TILES / 2));
  let position = center;
  const checkPosition = (position) =>
    position.x >= 0 &&
    position.y >= 0 &&
    position.x < TILES &&
    position.y < TILES &&
    Object.values(users)
      .filter((user) => user.snake)
      .map((user) => user.snake.cells)
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

const hsvToRgb = (h, s, v) => {
  const M = 255 * v;
  const m = M * (1 - s);
  const z = (M - m) * (1 - Math.abs(((h / 60) % 2) - 1));

  if (h >= 0 && h < 60) {
    return [M, z + m, m];
  }

  if (h >= 60 && h < 120) {
    return [z + m, M, m];
  }

  if (h >= 120 && h < 180) {
    return [m, M, z + m];
  }

  if (h >= 180 && h < 240) {
    return [m, z + m, M];
  }

  if (h >= 240 && h < 300) {
    return [z + m, m, M];
  }

  return [M, m, z + m];
};

const randomBrightColor = () =>
  "#" +
  hsvToRgb(Math.random() * 360, 1, 1)
    .map(Math.floor)
    .map((color) =>
      [Math.floor(color / 16), color % 16]
        .map((digit) =>
          digit < 10
            ? digit
            : String.fromCharCode("a".charCodeAt() + digit - 10)
        )
        .join("")
    )
    .join("");

const createSnake = (ownerId) => {
  let snakePosition = getCentralEmptyPosition();

  return new Snake(new Vec(snakePosition.x, snakePosition.y), () => {
    console.log("dead");
    io.to(ownerId).emit("dead");
    users[ownerId].snake = undefined;
  });
};

//let snake = createSnake();
const positionApple = (snakes) => {
  const emptyCells = [];

  for (let rowIndex = 0; rowIndex < TILES; rowIndex++) {
    for (let columnIndex = 0; columnIndex < TILES; columnIndex++) {
      emptyCells.push(new Vec(rowIndex, columnIndex));
    }
  }

  for (let snake of snakes) {
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

let applePosition = positionApple(
  Object.values(users).map((user) => user.snake)
);
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
  if (
    Object.values(users)
      .map((user) => user.snake)
      .filter((snake) => snake?.alive).length > 0
  ) {
    updateGame();
  }
}, (1 / FPS) * 1000);

/*const pauseGame = () => {
  clearInterval(gameLoopId);
  gameLoopId = null;
};*/

const emitGameToAll = (io) => {
  if (Object.values(users).filter((user) => user.snake)) {
    for (let client of Object.keys(users)) {
      emitGame(io.to(client), client);
    }
  }
};
const emitGame = (socket, socketId) => {
  if (users[socketId].snake) {
    let snakes = Object.values(users)
      .filter((user) => user.snake)
      .map((user) => ({ ...user.snake.json, color: user.color }));
    socket.emit("game", {
      snakes,
      score: users[socketId]?.snake?.length,
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

  for (let id of Object.keys(users).filter((id) => users[id].snake)) {
    for (let bodyCell of users[id].snake.body) {
      collisionBoard[bodyCell.x][bodyCell.y].body.push(id);
    }

    collisionBoard[users[id].snake.head.x][users[id].snake.head.y].head.push(
      id
    );
  }

  for (let i in collisionBoard) {
    for (let j in collisionBoard[i]) {
      if (collisionBoard[i][j].head.length > 1) {
        for (let id of collisionBoard[i][j].head) {
          users[id].snake.kill();
        }
      } else if (
        collisionBoard[i][j].head.length === 1 &&
        collisionBoard[i][j].body.length > 0
      ) {
        users[collisionBoard[i][j].head[0]].snake.kill();
      }
    }
  }
};

const updateGame = () => {
  for (let snake of Object.values(users).map((user) => user.snake)) {
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
      applePosition = positionApple(
        Object.values(users).map((user) => user.snake)
      );
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
  users[socketId].snake = createSnake(socketId);
  //applePosition = positionApple(snake);
  emitGameToAll(io);
  // TODO: save highscores
};

io.on("connection", (socket) => {
  console.log("new user has connected");
  users[socket.id] = { color: randomBrightColor() };

  socket.on("start", () => {
    users[socket.id].snake = createSnake(socket.id);
    emitGame(socket, socket.id);
  });

  socket.on("changeColor", (color) => {
    users[socket.id].color = color;
  });

  socket.on("input", (input) => {
    console.log(`input ${input}`);
    if (users[socket.id]?.snake?.alive) {
      try {
        switch (input) {
          case "up":
            users[socket.id].snake.changeDirection(Snake.UP_DIRECTION);
            //startGame();
            break;
          case "down":
            users[socket.id].snake.changeDirection(Snake.DOWN_DIRECTION);
            //startGame();
            break;
          case "left":
            users[socket.id].snake.changeDirection(Snake.LEFT_DIRECTION);
            //startGame();
            break;
          case "right":
            users[socket.id].snake.changeDirection(Snake.RIGHT_DIRECTION);
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

    users = Object.keys(users)
      .filter((key) => key !== socket.id)
      .reduce((obj, key) => {
        obj[key] = users[key];
        return obj;
      }, {});
  });
});

module.exports = app;
