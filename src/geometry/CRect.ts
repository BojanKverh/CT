import { CPoint } from "./CPoint.js";

export class CRect {
    #m_x: number;
    #m_y: number;
    #m_width: number;
    #m_height: number;

    constructor(x = 0, y = 0, width = 0, height = 0) {
        this.#m_x = x;
        this.#m_y = y;
        this.#m_width = width;
        this.#m_height = height;
    }

    x(): number {
        return this.#m_x;
    }

    y(): number {
        return this.#m_y;
    }

    width(): number {
        return this.#m_width;
    }

    height(): number {
        return this.#m_height;
    }

    right(): number {
        return this.#m_x + this.#m_width;
    }

    bottom(): number {
        return this.#m_y + this.#m_height;
    }

    setGeometry(
        x: number,
        y: number,
        width: number,
        height: number
    ): void {
        this.#m_x = x;
        this.#m_y = y;
        this.#m_width = width;
        this.#m_height = height;
    }

    contains(point: CPoint): boolean {
        return point.x() >= this.x()
            && point.x() < this.right()
            && point.y() >= this.y()
            && point.y() < this.bottom();
    }

    intersects(other: CRect): boolean {
        return this.#m_x < other.right()
            && this.right() > other.x()
            && this.#m_y < other.bottom()
            && this.bottom() > other.y();
    }

    intersection(other: CRect): CRect {
        const left = Math.max(this.#m_x, other.x());
        const top = Math.max(this.#m_y, other.y());
        const right = Math.min(this.right(), other.right());
        const bottom = Math.min(this.bottom(), other.bottom());

        if (right <= left || bottom <= top)
            return new CRect();

        return new CRect(
            left,
            top,
            right - left,
            bottom - top
        );
    }
}