import { CApplication } from "../core/CApplication.js";
import { CFont } from "./CFont.js";

/**
 * Provides measurements for text rendered with a specific font.
 */
export class CFontMetrics {
    static #contexts = new WeakMap<Document, CanvasRenderingContext2D>();

	#m_font: CFont;
	#m_context: CanvasRenderingContext2D;

		/**
	 * Creates a new CFontMetrics instance.
	 *
	 * @param font Font.
	 */
constructor(font: CFont) {
		this.#m_font = new CFont(font);

		const document = CApplication.instance().canvas().ownerDocument;
		let context = CFontMetrics.#contexts.get(document);
		if (context === undefined) {
			const canvas = document.createElement("canvas");
			canvas.width = canvas.height = 1;
			const measurementContext = canvas.getContext("2d");
			if (measurementContext === null)
				throw new Error("Canvas 2D text measurement context is not available.");

			context = measurementContext;
			CFontMetrics.#contexts.set(document, context);
		}

		this.#m_context = context;
	}

		/**
 * Reads the font used to measure text.
 * @returns An independent copy of the configured font.
 */
font(): CFont {
		return new CFont(this.#m_font);
	}

		/**
 * Measures the text advance with the configured font and restores the Canvas drawing state.
 * @param text Text to measure.
 * @returns Measured width in logical pixels.
 */
textWidth(text: string): number {
		this.#m_context.save();
		this.#m_context.font = this.#m_font.toCss();

		const width = this.#m_context.measureText(text).width;

		this.#m_context.restore();

		return width;
	}

		/**
 * Measures the actual ascent and descent of the sample text `Mg` with the configured font.
 * @returns Sum of the sample's ascent and descent in logical pixels.
 */
height(): number {
		this.#m_context.save();
		this.#m_context.font = this.#m_font.toCss();

		const metrics = this.#m_context.measureText("Mg");
		const height = metrics.actualBoundingBoxAscent +
			metrics.actualBoundingBoxDescent;

		this.#m_context.restore();

		return height;
	}
}
