import { CApplication } from "../core/CApplication.js";

export class CFontMetrics {
	#m_font: string;
	#m_context: CanvasRenderingContext2D;

	constructor(font: string) {
		this.#m_font = font;

		const context = CApplication.instance().canvas().getContext("2d");

		if (context === null)
			throw new Error("Canvas 2D context is not available.");

		this.#m_context = context;
	}

	font(): string {
		return this.#m_font;
	}

	textWidth(text: string): number {

		if (this.#m_context === null)
			throw new Error("Canvas 2D context is not available.");

		this.#m_context.save();
		this.#m_context.font = this.#m_font;

		const width = this.#m_context.measureText(text).width;

		this.#m_context.restore();

		return width;
	}

	height(): number {
		if (this.#m_context === null)
			throw new Error("Canvas 2D context is not available.");

		this.#m_context.save();
		this.#m_context.font = this.#m_font;

		const metrics = this.#m_context.measureText("Mg");
		const height = metrics.actualBoundingBoxAscent +
			metrics.actualBoundingBoxDescent;

		this.#m_context.restore();

		return height;
	}
}