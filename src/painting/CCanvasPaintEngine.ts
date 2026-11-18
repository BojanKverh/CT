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

    /** Pushes the current drawing state so it can be restored after temporary changes. */
    save(): void {
        this.#m_context.save();
    }

    /** Restores the most recently saved drawing state. */
    restore(): void {
        this.#m_context.restore();
    }

    /**
     * Reads the 2D context's drawing transparency setting.
     * @returns Current global alpha between zero and one.
     */
    override opacity(): number { return this.#m_context.globalAlpha; }

    /**
     * Changes global alpha for subsequent drawing. Nonfinite input leaves it unchanged.
     * @param opacity Requested opacity, clamped to zero through one.
     */
    override setOpacity(opacity: number): void {
        if (Number.isFinite(opacity)) this.#m_context.globalAlpha = Math.max(0, Math.min(1, opacity));
    }

    /**
     * Moves the origin of subsequent drawing operations relative to the current transform.
     * @param x Horizontal translation offset.
     * @param y Vertical translation offset.
     */
    translate(x: number, y: number): void {
        this.#m_context.translate(x, y);
    }

    /**
     * Fills a rectangle with the current fill style.
     * @param x Left edge in the current drawing coordinate system.
     * @param y Top edge in the current drawing coordinate system.
     * @param width Rectangle width in drawing units.
     * @param height Rectangle height in drawing units.
     */
    fillRect(
        x: number,
        y: number,
        width: number,
        height: number
    ): void {
        this.#m_context.fillRect(x, y, width, height);
    }

    /**
     * Strokes a rectangle with the current stroke style and line width.
     * @param x Left edge in the current drawing coordinate system.
     * @param y Top edge in the current drawing coordinate system.
     * @param width Rectangle width in drawing units.
     * @param height Rectangle height in drawing units.
     */
    strokeRect(
        x: number,
        y: number,
        width: number,
        height: number
    ): void {
        this.#m_context.strokeRect(x, y, width, height);
    }

    /**
     * Clears the pixels in the specified rectangle.
     * @param x Left edge in the current drawing coordinate system.
     * @param y Top edge in the current drawing coordinate system.
     * @param width Rectangle width in drawing units.
     * @param height Rectangle height in drawing units.
     */
    clearRect(
        x: number,
        y: number,
        width: number,
        height: number
    ): void {
        this.#m_context.clearRect(x, y, width, height);
    }

    /**
     * Changes the color used for subsequent filled shapes.
     * @param style Fill color string accepted by the drawing backend.
     */
    setFillStyle(style: string): void {
        this.#m_context.fillStyle = style;
    }

    /**
     * Changes the color used for subsequent outlines and lines.
     * @param style Stroke color string accepted by the drawing backend.
     */
    setStrokeStyle(style: string): void {
        this.#m_context.strokeStyle = style;
    }

    /**
     * Changes the stroke thickness used for subsequent outlines.
     * @param width Positive line width in drawing units.
     */
    setLineWidth(width: number): void {
        this.#m_context.lineWidth = width;
    }

    /**
     * Measures a string with the current font without painting it.
     * @param text Text to measure.
     * @returns Measured advance width in drawing units.
     */
    override textWidth(text: string): number {
	    return this.#m_context.measureText(text).width;
    }

    /**
     * Intersects the current clipping region with a rectangle for subsequent drawing.
     * @param x Left edge in the current drawing coordinate system.
     * @param y Top edge in the current drawing coordinate system.
     * @param width Rectangle width in drawing units.
     * @param height Rectangle height in drawing units.
     */
    clipRect(x: number, y: number, width: number, height: number): void {
		this.#m_context.beginPath();
		this.#m_context.rect(x, y, width, height);
		this.#m_context.clip();
	}

    /**
     * Reads the current backend font setting.
     * @returns The font specification as a string.
     */
    font() : string {
        return this.#m_context.font;
    }

    /**
     * Changes the font used for subsequent text drawing and measurement.
     * @param font Font specification accepted by the backend, such as a CSS font shorthand for Canvas.
     */
    setFont(font: string): void {
		this.#m_context.font = font;
	}

	/**
	 * Reads the horizontal alignment used for drawn text.
	 * @returns The alignment of text relative to its x coordinate.
	 */
	textAlign() : CanvasTextAlign {
        return this.#m_context.textAlign;
    }

	/**
	 * Sets the horizontal alignment for subsequent text.
	 * @param align Alignment of text relative to its x coordinate, such as `left` or `center`.
	 */
	setTextAlign(align: CanvasTextAlign): void {
		this.#m_context.textAlign = align;
	}

    /**
     * Sets the vertical reference for subsequent text.
     * @param baseline Baseline corresponding to the supplied y coordinate, such as `alphabetic` or `middle`.
     */
    setTextBaseline(baseline: CanvasTextBaseline): void {
		this.#m_context.textBaseline = baseline;
	}

    /**
     * Reads the baseline used for drawn text.
     * @returns The vertical reference used for the text y coordinate.
     */
    textBaseline() : CanvasTextBaseline {
        return this.#m_context.textBaseline;
    }

    /**
     * Strokes a line segment with the current stroke style and width.
     * @param x1 Horizontal start coordinate.
     * @param y1 Vertical start coordinate.
     * @param x2 Horizontal end coordinate.
     * @param y2 Vertical end coordinate.
     */
    drawLine(x1: number, y1: number, x2: number, y2: number): void {
        this.#m_context.beginPath();
	    this.#m_context.moveTo(x1, y1);
	    this.#m_context.lineTo(x2, y2);
	    this.#m_context.stroke();
    }
    
	/**
	 * Draws text with the current font and text positioning settings, temporarily using the stroke color as the text fill.
	 * @param text Text to draw.
	 * @param x Horizontal text anchor.
	 * @param y Vertical baseline position.
	 */
	drawText(text: string, x: number, y: number): void {
		const old = this.#m_context.fillStyle;
        this.#m_context.fillStyle = this.#m_context.strokeStyle;
		this.#m_context.fillText(text, x, y);
        this.#m_context.fillStyle = old;
	}

    /**
     * Draws a pixmap scaled to the requested destination rectangle.
     * @param pixmap Source pixmap to draw.
     * @param x Left edge of the destination.
     * @param y Top edge of the destination.
     * @param w Destination width.
     * @param h Destination height.
     */
    drawPixmap(pixmap: CPixmap, x: number, y: number, w: number, h: number): void {
        if (pixmap !== null) {
            this.#m_context.drawImage(
                pixmap.image(), 0, 0, pixmap.width(), pixmap.height(), x, y, w, h);
        }
    }

    /**
     * Strokes the outline of an ellipse with the current stroke style.
     * @param x Horizontal center coordinate.
     * @param y Vertical center coordinate.
     * @param w Nonnegative horizontal radius.
     * @param h Nonnegative vertical radius.
     */
    drawEllipse(x: number, y: number, w: number, h: number): void
    {
        this.#m_context.beginPath();
        this.#m_context.ellipse(x, y, w, h, 0, 0, 2 * Math.PI);
        this.#m_context.stroke();
    }

    /**
     * Fills an ellipse with the current fill style.
     * @param x Horizontal center coordinate.
     * @param y Vertical center coordinate.
     * @param w Nonnegative horizontal radius.
     * @param h Nonnegative vertical radius.
     */
    fillEllipse(x: number, y: number, w: number, h: number): void
    {
        this.#m_context.beginPath();
        this.#m_context.ellipse(x, y, w, h, 0, 0, 2 * Math.PI);
        this.#m_context.fill();
    }

    /**
     * Draws a rectangle using the current fill and stroke styles.
     * @param x Left edge in the current drawing coordinate system.
     * @param y Top edge in the current drawing coordinate system.
     * @param w Rectangle width in drawing units.
     * @param h Rectangle height in drawing units.
     */
    drawRect(x: number, y: number, w: number, h: number): void 
    {
        this.#m_context.fillRect(x, y, w, h);
        this.#m_context.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }

    /**
     * Strokes and fills a rounded rectangle inset one drawing unit from its supplied bounds.
     * @param x Left edge in the current drawing coordinate system.
     * @param y Top edge in the current drawing coordinate system.
     * @param w Rectangle width in drawing units.
     * @param h Rectangle height in drawing units.
     * @param r A nonnegative radius or one to four corner radii in Canvas round-rectangle order.
     */
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
