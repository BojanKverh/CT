export class CSize {
    #m_width: number;
    #m_height: number;

    constructor(width = 0, height = 0) {
        this.#m_width = width;
        this.#m_height = height;
    }

    width(): number {
        return this.#m_width;
    }

    height(): number {
        return this.#m_height;
    }
    
    resize(width: number, height: number): void {
        this.#m_width = width;
        this.#m_height = height;
    }
}