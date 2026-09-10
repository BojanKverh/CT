/**
 * Represents a two-dimensional point using Cartesian coordinates.
 */
export class CPoint {
    #m_x: number;
    #m_y: number;

    /**
     * Creates a point with the specified coordinates.
     *
     * @param x Initial horizontal coordinate.
     * @param y Initial vertical coordinate.
     */
    constructor(x = 0, y = 0) {
        this.#m_x = x;
        this.#m_y = y;
    }

    /**
     * Returns the horizontal coordinate.
     *
     * @returns The x-coordinate.
     */
    x(): number {
        return this.#m_x;
    }

    /**
     * Returns the vertical coordinate.
     *
     * @returns The y-coordinate.
     */
    y(): number {
        return this.#m_y;
    }

    /**
     * Moves the point to the specified coordinates.
     *
     * @param x New horizontal coordinate.
     * @param y New vertical coordinate.
     */
    move(x: number, y: number): void {
        this.#m_x = x;
        this.#m_y = y;
    }

    /**
     * Translates the point by the specified offsets.
     *
     * @param x Horizontal offset.
     * @param y Vertical offset.
     */
    moveBy(x: number, y: number): void {
        this.#m_x += x;
        this.#m_y += y;
    }
}
