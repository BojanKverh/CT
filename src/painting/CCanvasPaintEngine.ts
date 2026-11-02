import { CPaintEngine } from "./CPaintEngine.js";
import { CPixmap } from "./CPixmap.js"

/**
 * Paint engine that maps Canvas Toolkit drawing operations to a 2D canvas context.
 */
export class CCanvasPaintEngine extends CPaintEngine {
    #m_context: CanvasRenderingContext2D;

    /** Creates an engine for the specified 2D rendering context. */
    constructor(context: CanvasRenderingContext2D) {
        super();

        this.#m_context = context;
        this.#m_context.imageSmoothingEnabled = true;
        this.#m_context.imageSmoothingQuality = "high";
    }

    /** Saves the canvas rendering state. */
    save(): void {
        this.#m_context.save();
    }

    /** Restores the most recently saved canvas rendering state. */
    restore(): void {
        this.#m_context.restore();
    }

    override opacity(): number { return this.#m_context.globalAlpha; }

    override setOpacity(opacity: number): void {
        if (Number.isFinite(opacity)) this.#m_context.globalAlpha = Math.max(0, Math.min(1, opacity));
    }

    /** Translates the canvas coordinate system. */
    translate(x: number, y: number): void {
        this.#m_context.translate(x, y);
    }

    /** Fills a rectangle using the current fill style. */
    fillRect(
        x: number,
        y: number,
        width: number,
        height: number
    ): void {
        this.#m_context.fillRect(x, y, width, height);
    }

    /** Strokes a rectangle using the current stroke style. */
    strokeRect(
        x: number,
        y: number,
        width: number,
        height: number
    ): void {
        this.#m_context.strokeRect(x, y, width, height);
    }

    /** Clears a rectangular area. */
    clearRect(
        x: number,
        y: number,
        width: number,
        height: number
    ): void {
        this.#m_context.clearRect(x, y, width, height);
    }

    /** Sets the canvas fill style. */
    setFillStyle(style: string): void {
        this.#m_context.fillStyle = style;
    }

    /** Sets the canvas stroke style. */
    setStrokeStyle(style: string): void {
        this.#m_context.strokeStyle = style;
    }

    /** Sets the canvas line width. */
    setLineWidth(width: number): void {
        this.#m_context.lineWidth = width;
    }

    /** Returns the measured width of text using the current font. */
    override textWidth(text: string): number {
	    return this.#m_context.measureText(text).width;
    }

    /** Intersects the clipping region with a rectangle. */
    clipRect(x: number, y: number, width: number, height: number): void {
		this.#m_context.beginPath();
		this.#m_context.rect(x, y, width, height);
		this.#m_context.clip();
	}

    /** Returns the current canvas font specification. */
    font() : string {
        return this.#m_context.font;
    }

    /** Sets the current canvas font specification. */
    setFont(font: string): void {
		this.#m_context.font = font;
	}

	/** Returns the current text alignment. */
	textAlign() : CanvasTextAlign {
        return this.#m_context.textAlign;
    }

	/** Sets the current text alignment. */
	setTextAlign(align: CanvasTextAlign): void {
		this.#m_context.textAlign = align;
	}

    /** Sets the current text baseline. */
    setTextBaseline(baseline: CanvasTextBaseline): void {
		this.#m_context.textBaseline = baseline;
	}

    /** Returns the current text baseline. */
    textBaseline() : CanvasTextBaseline {
        return this.#m_context.textBaseline;
    }

    /** Draws a line segment. */
    drawLine(x1: number, y1: number, x2: number, y2: number): void {
        this.#m_context.beginPath();
	    this.#m_context.moveTo(x1, y1);
	    this.#m_context.lineTo(x2, y2);
	    this.#m_context.stroke();
    }
    
	/** Draws text at the specified position. */
	drawText(text: string, x: number, y: number): void {
		const old = this.#m_context.fillStyle;
        this.#m_context.fillStyle = this.#m_context.strokeStyle;
		this.#m_context.fillText(text, x, y);
        this.#m_context.fillStyle = old;
	}

    /** Draws a pixmap into the specified destination rectangle. */
    drawPixmap(pixmap: CPixmap, x: number, y: number, w: number, h: number): void {
        if (pixmap !== null) {
            this.#m_context.drawImage(
                pixmap.image(), 0, 0, pixmap.width(), pixmap.height(), x, y, w, h);
        }
    }

    /** Draws the outline of an ellipse. */
    drawEllipse(x: number, y: number, w: number, h: number): void
    {
        this.#m_context.beginPath();
        this.#m_context.ellipse(x, y, w, h, 0, 0, 2 * Math.PI);
        this.#m_context.stroke();
    }

    /** Fills an ellipse. */
    fillEllipse(x: number, y: number, w: number, h: number): void
    {
        this.#m_context.beginPath();
        this.#m_context.ellipse(x, y, w, h, 0, 0, 2 * Math.PI);
        this.#m_context.fill();
    }

    /** Draws a filled and stroked rectangle. */
    drawRect(x: number, y: number, w: number, h: number): void 
    {
        this.#m_context.fillRect(x, y, w, h);
        this.#m_context.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }

    /** Draws a filled and stroked rounded rectangle. */
    drawRoundedRect(x: number, y: number, w: number, h: number, r: number | number[] ): void
    {
        this.#m_context.beginPath();
        this.#m_context.roundRect(x + 1, y + 1, w - 2, h - 2, r);
        this.#m_context.stroke();
        this.#m_context.beginPath();
        this.#m_context.roundRect(x + 1, y + 1, w - 2, h - 2, r);
        this.#m_context.fill();
    }
}
