import { CPaintEngine } from "./CPaintEngine.js";

export class CCanvasPaintEngine extends CPaintEngine {
    #m_context: CanvasRenderingContext2D;

    constructor(context: CanvasRenderingContext2D) {
        super();

        this.#m_context = context;
    }

    save(): void {
        this.#m_context.save();
    }

    restore(): void {
        this.#m_context.restore();
    }

    translate(x: number, y: number): void {
        this.#m_context.translate(x, y);
    }

    fillRect(
        x: number,
        y: number,
        width: number,
        height: number
    ): void {
        this.#m_context.fillRect(x, y, width, height);
    }

    strokeRect(
        x: number,
        y: number,
        width: number,
        height: number
    ): void {
        this.#m_context.strokeRect(x, y, width, height);
    }

    clearRect(
        x: number,
        y: number,
        width: number,
        height: number
    ): void {
        this.#m_context.clearRect(x, y, width, height);
    }

    setFillStyle(style: string): void {
        this.#m_context.fillStyle = style;
    }

    setStrokeStyle(style: string): void {
        this.#m_context.strokeStyle = style;
    }

    setLineWidth(width: number): void {
        this.#m_context.lineWidth = width;
    }

    clipRect(x: number, y: number, width: number, height: number): void {
		this.#m_context.beginPath();
		this.#m_context.rect(x, y, width, height);
		this.#m_context.clip();
	}
}