class Vec {
    constructor(x, y) {
        this._x = x;
        this._y = y;
    }

    get x() {
        return this._x;
    }

    get y() {
        return this._y;
    }

    set x(newX) {
        this._x = newX;
    }

    set y(newY) {
        this._y = newY;
    }

    equals(otherVec) {
        return this.x === otherVec?.x && this.y === otherVec?.y;
    }

    add(otherVec) {
        return new Vec(this.x + otherVec.x, this.y + otherVec.y);
    }

    subtract(otherVec) {
        return new Vec(this.x - otherVec.x, this.y - otherVec.y);
    }
}