import { CApplication } from "../core/CApplication.js";
import { CFont } from "./CFont.js";

/**
 * Provides measurements for text rendered with a specific font.
 */
export class CFontMetrics {
	#m_font: CFont;
	#m_context: CanvasRenderingContext2D;

		/**
	 * Creates a new CFontMetrics instance.
	 *
	 * @param font Font.
	 */
constructor(font: CFont) {
		this.#m_font = new CFont(font);

		const context = CApplication.instance().canvas().getContext("2d");

		if (context === null)
			throw new Error("Canvas 2D context is not available.");

		this.#m_context = context;
	}

		/**
	 * Returns the font used by these metrics.
	 *
	 * @returns The resulting value.
	 */
font(): CFont {
		return new CFont(this.#m_font);
	}

		/**
	 * Returns the rendered width of the specified text.
	 *
	 * @param text Text.
	 *
	 * @returns The resulting value.
	 */
textWidth(text: string): number {

		if (this.#m_context === null)
			throw new Error("Canvas 2D context is not available.");

		this.#m_context.save();
		this.#m_context.font = this.#m_font.toCss();

		const width = this.#m_context.measureText(text).width;

		this.#m_context.restore();

		return width;
	}

		/**
	 * Returns the line height of the configured font.
	 *
	 * @returns The resulting value.
	 */
height(): number {
		if (this.#m_context === null)
			throw new Error("Canvas 2D context is not available.");

		this.#m_context.save();
		this.#m_context.font = this.#m_font.toCss();

		const metrics = this.#m_context.measureText("Mg");
		const height = metrics.actualBoundingBoxAscent +
			metrics.actualBoundingBoxDescent;

		this.#m_context.restore();

		return height;
	}
}
