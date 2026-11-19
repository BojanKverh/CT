/** @module GUI/CFontMetrics */
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
    * Copies the font and obtains a measurement context from the application canvas document. Requires an existing CApplication.
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
    * Returns the font used by these metrics.
    *
    */
    font(): CFont {
		return new CFont(this.#m_font);
	}

    /**
    * Returns the rendered width of the specified text.
    *
    * @param text Text.
    *
    */
    textWidth(text: string): number {
		this.#m_context.save();
		this.#m_context.font = this.#m_font.toCss();

		const width = this.#m_context.measureText(text).width;

		this.#m_context.restore();

		return width;
	}

    /**
    * Returns the line height of the configured font.
    *
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
