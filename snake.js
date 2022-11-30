class Snake {
    static DOWN_DIRECTION = 0;
    static RIGHT_DIRECTION = 1;
    static UP_DIRECTION = 2;
    static LEFT_DIRECTION = 3;

    static DIRECTIONS = [
        new Vec(0, 1),
        new Vec(1, 0),
        new Vec(0, -1),
        new Vec(-1, 0),
    ];

    constructor(startingPos, deathListener) {
        this._cells = [startingPos];
        this._facing = 0;
        this._lastDirection= 0;
        this._deathListener = deathListener;
        this._alive = true;
    }
    
    moveSnake = function* () {
        if (!this._alive) {
            return;
        }

        const direction = Snake.DIRECTIONS[this._facing];
        this._lastDirection = this._facing;
        this._cells = [this.head.add(direction)].concat(this._cells);

        if (yield) {
            this._cells.pop();
        }

        this._checkHeadRoom();
    }

    get length() {
        return this._cells.length;
    }

    _checkHeadRoom() {
        if (this._cells.filter(cell => cell.equals(this.head)).length > 1) {
            this._alive = false;
            this._deathListener();
        }
    }

    kill() {
        this._alive = false;
        this._deathListener();
    }

    get alive() {
        return this._alive;
    }

    get cells() {
        return this._cells;
    }

    get head() {
        return this._cells[0];
    }

    get tail() {
    return this._cells[this.length-1];
    }

    changeDirection(newDirection) {
        if (newDirection >= 0 && newDirection <= 3 && newDirection !== (this._lastDirection+2)%4) {
            this._facing = newDirection;
        } else {
            throw Error('illigal direction');
        }
    }
}