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

    /**
     * Identifies the target used by this painter.
     * @returns The paint device supplied at construction.
     */
    device(): CPaintDevice {
        return this.#m_device;
    }

    /** Pushes the current drawing state so it can be restored after temporary changes. */
    save(): void {
        this.#m_engine.save();
    }

    /** Restores the most recently saved drawing state. */
    restore(): void {
        this.#m_engine.restore();
    }

    /**
     * Reads the opacity from the device's paint engine.
     * @returns Current drawing opacity as a fraction between zero and one.
     */
    opacity(): number { return this.#m_engine.opacity(); }

    /**
     * Changes the paint engine's opacity for subsequent drawing.
     * @param opacity Requested opacity as a fraction between zero and one.
     */
    setOpacity(opacity: number): void {
        if (Number.isFinite(opacity)) this.#m_engine.setOpacity(Math.max(0, Math.min(1, opacity)));
    }

    /**
     * Moves the origin of subsequent drawing operations relative to the current transform.
     * @param x Horizontal translation offset.
     * @param y Vertical translation offset.
     */
    translate(x: number, y: number): void {
        this.#m_engine.translate(x, y);
    }

    /**
     * Clears the pixels within a rectangle.
     * @param rect Rectangle in the current drawing coordinate system.
     */
    clearRect(rect: CRect): void {
        this.#m_engine.clearRect(
            rect.x(),
            rect.y(),
            rect.width(),
            rect.height()
        );
    }

    /**
     * Fills a rectangle with the current brush.
     * @param rect Rectangle in the current drawing coordinate system.
     */
    fillRect(rect: CRect): void {
        this.#m_engine.fillRect(
            rect.x(),
            rect.y(),
            rect.width(),
            rect.height()
        );
    }

    /**
     * Outlines a rectangle with the current pen and line width.
     * @param rect Rectangle in the current drawing coordinate system.
     */
    strokeRect(rect: CRect): void {
        this.#m_engine.strokeRect(
            rect.x(),
            rect.y(),
            rect.width(),
            rect.height()
        );
    }

    /**
     * Changes the color used for subsequent filled shapes.
     * @param style Fill color string accepted by the drawing backend.
     */
    setFillStyle(style: string): void {
        this.#m_engine.setFillStyle(style);
    }

    /**
     * Changes the color used for subsequent outlines and lines.
     * @param style Stroke color string accepted by the drawing backend.
     */
    setStrokeStyle(style: string): void {
        this.#m_engine.setStrokeStyle(style);
    }

    /**
     * Changes the stroke thickness used for subsequent outlines.
     * @param width Positive line width in drawing units.
     */
    setLineWidth(width: number): void {
        this.#m_engine.setLineWidth(width);
    }

	/**
	 * Restricts subsequent drawing to the intersection with the current clip.
	 * @param rect Rectangle in the current drawing coordinate system.
	 */
	clipRect(rect: CRect): void {
		this.#m_engine.clipRect(
			rect.x(), rect.y(), rect.width(), rect.height()
		);
	}

    /**
     * Measures a string with the current font without painting it.
     * @param text Text to measure.
     * @returns Measured advance width in drawing units.
     */
    textWidth(text: string): number {
	    return this.#m_engine.textWidth(text);
    }

    /**
     * Reads and parses the engine's current font specification.
     * @returns A new `CFont` parsed from the engine's font string.
     */
    font() : CFont {
        return CFont.fromCss(this.#m_engine.font());
    }

	/**
	 * Serializes the font into the engine's text drawing state.
	 * @param font Font to apply to subsequent drawing and measurements.
	 */
	setFont(font: CFont): void {
		this.#m_engine.setFont(font.toCss());
	}

    /**
     * Reads the horizontal alignment used for drawn text.
     * @returns The alignment of text relative to its x coordinate.
     */
    textAlign() : CanvasTextAlign {
        return this.#m_engine.textAlign();
    }

	/**
	 * Sets the horizontal alignment for subsequent text.
	 * @param align Alignment of text relative to its x coordinate, such as `left` or `center`.
	 */
	setTextAlign(align: CanvasTextAlign): void {
		this.#m_engine.setTextAlign(align);
	}

	/**
	 * Sets the vertical reference for subsequent text.
	 * @param baseline Baseline corresponding to the supplied y coordinate, such as `alphabetic` or `middle`.
	 */
	setTextBaseline(baseline: CanvasTextBaseline): void {
		this.#m_engine.setTextBaseline(baseline);
	}

    /**
     * Reads the baseline used for drawn text.
     * @returns The vertical reference used for the text y coordinate.
     */
    textBaseline() : CanvasTextBaseline {
        return this.#m_engine.textBaseline();
    }

    /**
     * Strokes a line segment with the current stroke style and width.
     * @param x1 Horizontal start coordinate.
     * @param y1 Vertical start coordinate.
     * @param x2 Horizontal end coordinate.
     * @param y2 Vertical end coordinate.
     */
    drawLine(x1: number, y1: number, x2: number, y2: number) : void {
        this.#m_engine.drawLine(x1, y1, x2, y2);
    }

	/**
	 * Draws text using the current font, alignment and baseline.
	 * @param text Text to draw.
	 * @param x Horizontal anchor in the current drawing coordinate system.
	 * @param y Vertical baseline position in the current drawing coordinate system.
	 */
	drawText(text: string, x: number, y: number): void {
		this.#m_engine.drawText(text, x, y);
	}

    /**
     * Draws a pixmap into a destination rectangle, using the source dimensions if no destination size is supplied.
     * @param pixmap Source pixmap to draw.
     * @param x Left edge of the destination.
     * @param y Top edge of the destination.
     * @param w Destination width, defaulting to the pixmap width.
     * @param h Destination height, defaulting to the pixmap height.
     */
    drawPixmap(pixmap: CPixmap, x: number,  y: number, 
        w: number = pixmap !== null? pixmap.width() : 0,
        h: number = pixmap !== null? pixmap.height() : 0
    ): void {
        if (pixmap !== null)
            this.#m_engine.drawPixmap(pixmap, x, y, w, h);
    }

    /**
     * Strokes the outline of an ellipse with the current stroke style.
     * @param x Horizontal center coordinate.
     * @param y Vertical center coordinate.
     * @param w Nonnegative horizontal radius.
     * @param h Nonnegative vertical radius.
     */
    drawEllipse(x: number, y: number, w: number, h: number): void {
        this.#m_engine.drawEllipse(x, y, w, h);
    }

    /**
     * Fills an ellipse with the current fill style.
     * @param x Horizontal center coordinate.
     * @param y Vertical center coordinate.
     * @param w Nonnegative horizontal radius.
     * @param h Nonnegative vertical radius.
     */
    fillEllipse(x: number, y: number, w: number, h: number): void {
        this.#m_engine.fillEllipse(x, y, w, h);
    }

    /**
     * Changes the fill color used by subsequent drawing operations.
     * @param brush Fill color accepted by the engine.
     */
    setBrush(brush: string): void {
        this.#m_engine.setFillStyle(brush);
    }

    /**
     * Changes the stroke color used by subsequent drawing operations.
     * @param pen Stroke color accepted by the engine.
     */
    setPen(pen: string): void {
        this.#m_engine.setStrokeStyle(pen);
    }

    /**
     * Draws a rectangle using the current fill and stroke styles.
     * @param x Left edge in the current drawing coordinate system.
     * @param y Top edge in the current drawing coordinate system.
     * @param w Rectangle width in drawing units.
     * @param h Rectangle height in drawing units.
     */
    drawRect(x: number, y: number, w: number, h: number): void {
        this.#m_engine.drawRect(x, y, w, h);
    }

    /**
     * Fills and outlines a rectangle with rounded corners.
     * @param x Left edge in the current drawing coordinate system.
     * @param y Top edge in the current drawing coordinate system.
     * @param w Rectangle width in drawing units.
     * @param h Rectangle height in drawing units.
     * @param r A nonnegative corner radius or an array of one to four radii in Canvas round-rectangle order.
     */
    drawRoundedRect(x: number, y: number, w: number, h: number, r: number | number[] ): void {
        this.#m_engine.drawRoundedRect(x, y, w, h, r);
    }
}
