/**
 * Represents a two-dimensional size defined by width and height.
 */
export class CSize {
    #m_width: number;
    #m_height: number;

    /**
     * Creates a size with the specified dimensions.
     *
     * @param width Initial width.
     * @param height Initial height.
     */
    constructor(width = 0, height = 0) {
        this.#m_width = width;
        this.#m_height = height;
    }

    /**
     * Returns the width.
     *
     * @returns The current width.
     */
    width(): number {
        return this.#m_width;
    }

    /**
     * Returns the height.
     *
     * @returns The current height.
     */
    height(): number {
        return this.#m_height;
    }

    /**
     * Changes the size to the specified dimensions.
     *
     * @param width New width.
     * @param height New height.
     */
    resize(width: number, height: number): void {
        this.#m_width = width;
        this.#m_height = height;
    }
}
