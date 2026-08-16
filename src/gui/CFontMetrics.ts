import { CApplication } from "../core/CApplication.js";

export class CFontMetrics {
	#m_font: string;

	constructor(font: string) {
		this.#m_font = font;
	}

	font(): string {
		return this.#m_font;
	}

	textWidth(text: string): number {
		const context = CApplication.instance()
			.canvas()
			.getContext("2d");

		if (context === null)
			throw new Error("Canvas 2D context is not available.");

		context.save();
		context.font = this.#m_font;

		const width = context.measureText(text).width;

		context.restore();

		return width;
	}
}