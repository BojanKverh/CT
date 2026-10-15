import type { CPaintDevice } from "./CPaintDevice.js";
import type { CPaintEngine } from "./CPaintEngine.js";
import { CRect } from "../geometry/CRect.js";
import { CPixmap } from "../painting/CPixmap.js";
import { CFont } from "../gui/CFont.js";

/**
 * High-level painting interface that forwards drawing operations to a paint device.
 */
export class CPainter {
    #m_device: CPaintDevice;
    #m_engine: CPaintEngine;

    /** Creates a painter for the specified paint device. */
    constructor(device: CPaintDevice) {
        this.#m_device = device;
        this.#m_engine = device.paintEngine();
    }

    /** Returns the paint device used by this painter. */
    device(): CPaintDevice {
        return this.#m_device;
    }

    /** Saves the current painting state. */
    save(): void {
        this.#m_engine.save();
    }

    /** Restores the most recently saved painting state. */
    restore(): void {
        this.#m_engine.restore();
    }

    /** Translates the current coordinate system. */
    translate(x: number, y: number): void {
        this.#m_engine.translate(x, y);
    }

    /** Clears the specified rectangle. */
    clearRect(rect: CRect): void {
        this.#m_engine.clearRect(
            rect.x(),
            rect.y(),
            rect.width(),
            rect.height()
        );
    }

    /** Fills the specified rectangle. */
    fillRect(rect: CRect): void {
        this.#m_engine.fillRect(
            rect.x(),
            rect.y(),
            rect.width(),
            rect.height()
        );
    }

    /** Strokes the specified rectangle. */
    strokeRect(rect: CRect): void {
        this.#m_engine.strokeRect(
            rect.x(),
            rect.y(),
            rect.width(),
            rect.height()
        );
    }

    /** Sets the current fill style. */
    setFillStyle(style: string): void {
        this.#m_engine.setFillStyle(style);
    }

    /** Sets the current stroke style. */
    setStrokeStyle(style: string): void {
        this.#m_engine.setStrokeStyle(style);
    }

    /** Sets the current line width. */
    setLineWidth(width: number): void {
        this.#m_engine.setLineWidth(width);
    }

	/** Intersects the clipping region with the specified rectangle. */
	clipRect(rect: CRect): void {
		this.#m_engine.clipRect(
			rect.x(), rect.y(), rect.width(), rect.height()
		);
	}

    /** Returns the rendered width of text using the current font. */
    textWidth(text: string): number {
	    return this.#m_engine.textWidth(text);
    }

    /** Returns the current font specification. */
    font() : CFont {
        return CFont.fromCss(this.#m_engine.font());
    }

	/** Sets the current font specification. */
	setFont(font: CFont): void {
		this.#m_engine.setFont(font.toCss());
	}

    /** Returns the current text alignment. */
    textAlign() : CanvasTextAlign {
        return this.#m_engine.textAlign();
    }

	/** Sets the current text alignment. */
	setTextAlign(align: CanvasTextAlign): void {
		this.#m_engine.setTextAlign(align);
	}

	/** Sets the current text baseline. */
	setTextBaseline(baseline: CanvasTextBaseline): void {
		this.#m_engine.setTextBaseline(baseline);
	}

    /** Returns the current text baseline. */
    textBaseline() : CanvasTextBaseline {
        return this.#m_engine.textBaseline();
    }

    /** Draws a line segment. */
    drawLine(x1: number, y1: number, x2: number, y2: number) : void {
        this.#m_engine.drawLine(x1, y1, x2, y2);
    }

	/** Draws text at the specified position. */
	drawText(text: string, x: number, y: number): void {
		this.#m_engine.drawText(text, x, y);
	}

    /** Draws a pixmap, using its dimensions by default. */
    drawPixmap(pixmap: CPixmap, x: number,  y: number, 
        w: number = pixmap !== null? pixmap.width() : 0,
        h: number = pixmap !== null? pixmap.height() : 0
    ): void {
        if (pixmap !== null)
            this.#m_engine.drawPixmap(pixmap, x, y, w, h);
    }

    /** Draws the outline of an ellipse. */
    drawEllipse(x: number, y: number, w: number, h: number): void {
        this.#m_engine.drawEllipse(x, y, w, h);
    }

    /** Fills an ellipse. */
    fillEllipse(x: number, y: number, w: number, h: number): void {
        this.#m_engine.fillEllipse(x, y, w, h);
    }

    /** Sets the brush used for filling shapes. */
    setBrush(brush: string): void {
        this.#m_engine.setFillStyle(brush);
    }

    /** Sets the pen used for stroking shapes. */
    setPen(pen: string): void {
        this.#m_engine.setStrokeStyle(pen);
    }

    /** Draws a rectangle. */
    drawRect(x: number, y: number, w: number, h: number): void {
        this.#m_engine.drawRect(x, y, w, h);
    }

    /** Draws a rounded rectangle. */
    drawRoundedRect(x: number, y: number, w: number, h: number, r: number | number[] ): void {
        this.#m_engine.drawRoundedRect(x, y, w, h, r);
    }
}
