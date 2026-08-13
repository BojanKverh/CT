export class CPoint {
    #m_x: number;
    #m_y: number;

    constructor(x = 0, y = 0) {
        this.#m_x = x;
        this.#m_y = y;
    }

    x(): number {
        return this.#m_x;
    }

    y(): number {
        return this.#m_y;
    }

    move(x: number, y: number): void {
        this.#m_x = x;
        this.#m_y = y;
    }

    moveBy(x: number, y: number): void {
        this.#m_x += x;
        this.#m_y += y;
    }
}