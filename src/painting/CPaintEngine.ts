import { CPixmap } from "./CPixmap.js";

/**
 * Abstract low-level rendering interface used by {@link CPainter}.
 *
 * Concrete engines translate these operations to a particular drawing backend.
 */
export abstract class CPaintEngine {
    /** Pushes the current drawing state so it can be restored after temporary changes. */
    abstract save(): void;
    /** Restores the most recently saved drawing state. */
    abstract restore(): void;

    /**
     * Reports the current drawing opacity. The default engine assumes full opacity.
     * @returns Opacity as a fraction. The base implementation returns `1`.
     */
    opacity(): number { return 1; }

    /**
     * Sets opacity on a supporting backend. The base implementation throws for values other than one.
     * @param opacity Requested opacity as a fraction between zero and one.
     */
    setOpacity(opacity: number): void {
        if (opacity !== 1) throw new Error("This paint engine does not support opacity.");
    }

    /**
     * Moves the origin of subsequent drawing operations relative to the current transform.
     * @param x Horizontal translation offset.
     * @param y Vertical translation offset.
     */
    abstract translate(x: number, y: number): void;

    /**
     * Fills a rectangle with the current fill style.
     * @param x Left edge in the current drawing coordinate system.
     * @param y Top edge in the current drawing coordinate system.
     * @param width Rectangle width in drawing units.
     * @param height Rectangle height in drawing units.
     */
    abstract fillRect(
        x: number,
        y: number,
        width: number,
        height: number
    ): void;

    /**
     * Strokes a rectangle with the current stroke style and line width.
     * @param x Left edge in the current drawing coordinate system.
     * @param y Top edge in the current drawing coordinate system.
     * @param width Rectangle width in drawing units.
     * @param height Rectangle height in drawing units.
     */
    abstract strokeRect(
        x: number,
        y: number,
        width: number,
        height: number
    ): void;

    /**
     * Clears the pixels in the specified rectangle.
     * @param x Left edge in the current drawing coordinate system.
     * @param y Top edge in the current drawing coordinate system.
     * @param width Rectangle width in drawing units.
     * @param height Rectangle height in drawing units.
     */
    abstract clearRect(
        x: number,
        y: number,
        width: number,
        height: number
    ): void;

    /**
     * Changes the color used for subsequent filled shapes.
     * @param style Fill color string accepted by the drawing backend.
     */
    abstract setFillStyle(style: string): void;
    /**
     * Changes the color used for subsequent outlines and lines.
     * @param style Stroke color string accepted by the drawing backend.
     */
    abstract setStrokeStyle(style: string): void;
    /**
     * Changes the stroke thickness used for subsequent outlines.
     * @param width Positive line width in drawing units.
     */
    abstract setLineWidth(width: number): void;
    /**
     * Measures a string with the current font without painting it.
     * @param text Text to measure.
     * @returns Measured advance width in drawing units.
     */
    abstract textWidth(text: string): number;

    /**
     * Intersects the current clipping region with a rectangle for subsequent drawing.
     * @param x Left edge in the current drawing coordinate system.
     * @param y Top edge in the current drawing coordinate system.
     * @param width Rectangle width in drawing units.
     * @param height Rectangle height in drawing units.
     */
    abstract clipRect(x: number, y: number, width: number,
		height: number): void;

    /**
     * Reads the current backend font setting.
     * @returns The font specification as a string.
     */
    abstract font() : string;
    /**
     * Changes the font used for subsequent text drawing and measurement.
     * @param font Font specification accepted by the backend, such as a CSS font shorthand for Canvas.
     */
    abstract setFont(font: string): void;
    /**
     * Reads the horizontal alignment used for drawn text.
     * @returns The alignment of text relative to its x coordinate.
     */
    abstract textAlign() : CanvasTextAlign;
    /**
     * Sets the horizontal alignment for subsequent text.
     * @param align Alignment of text relative to its x coordinate, such as `left` or `center`.
     */
    abstract setTextAlign(align: CanvasTextAlign) : void;
    /**
     * Sets the vertical reference for subsequent text.
     * @param baseline Baseline corresponding to the supplied y coordinate, such as `alphabetic` or `middle`.
     */
    abstract setTextBaseline(baseline: CanvasTextBaseline): void;
    /**
     * Reads the baseline used for drawn text.
     * @returns The vertical reference used for the text y coordinate.
     */
    abstract textBaseline() : CanvasTextBaseline;
    /**
     * Strokes a line segment with the current stroke style and width.
     * @param x1 Horizontal start coordinate.
     * @param y1 Vertical start coordinate.
     * @param x2 Horizontal end coordinate.
     * @param y2 Vertical end coordinate.
     */
    abstract drawLine(x1: number, y1: number, x2: number, y2: number): void;
    /**
     * Draws text using the current font, alignment and baseline.
     * @param text Text to draw.
     * @param x Horizontal anchor in the current drawing coordinate system.
     * @param y Vertical baseline position in the current drawing coordinate system.
     */
    abstract drawText(text: string, x: number, y: number): void;
    /**
     * Draws a pixmap scaled to the requested destination rectangle.
     * @param pixmap Source pixmap to draw.
     * @param x Left edge of the destination.
     * @param y Top edge of the destination.
     * @param w Destination width.
     * @param h Destination height.
     */
    abstract drawPixmap(pixmap: CPixmap, x: number, y: number, w: number, h: number): void;
    /**
     * Strokes the outline of an ellipse with the current stroke style.
     * @param x Horizontal center coordinate.
     * @param y Vertical center coordinate.
     * @param w Nonnegative horizontal radius.
     * @param h Nonnegative vertical radius.
     */
    abstract drawEllipse(x: number, y: number, w: number, h: number): void;
    /**
     * Fills an ellipse with the current fill style.
     * @param x Horizontal center coordinate.
     * @param y Vertical center coordinate.
     * @param w Nonnegative horizontal radius.
     * @param h Nonnegative vertical radius.
     */
    abstract fillEllipse(x: number, y: number, w: number, h: number): void;
    /**
     * Draws a rectangle using the current fill and stroke styles.
     * @param x Left edge in the current drawing coordinate system.
     * @param y Top edge in the current drawing coordinate system.
     * @param w Rectangle width in drawing units.
     * @param h Rectangle height in drawing units.
     */
    abstract drawRect(x: number, y: number, w: number, h: number): void;
    /**
     * Fills and outlines a rectangle with rounded corners.
     * @param x Left edge in the current drawing coordinate system.
     * @param y Top edge in the current drawing coordinate system.
     * @param w Rectangle width in drawing units.
     * @param h Rectangle height in drawing units.
     * @param r A nonnegative corner radius or an array of one to four radii in Canvas round-rectangle order.
     */
    abstract drawRoundedRect(x: number, y: number, w: number, h: number, r: number | number[] ): void;
}