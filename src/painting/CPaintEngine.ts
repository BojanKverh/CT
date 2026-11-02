import { CPixmap } from "./CPixmap.js";

/**
 * Abstract low-level rendering interface used by {@link CPainter}.
 *
 * Concrete engines translate these operations to a particular drawing backend.
 */
export abstract class CPaintEngine {
    /** Saves the current rendering state. */
    abstract save(): void;
    /** Restores the most recently saved rendering state. */
    abstract restore(): void;

    /** Returns opacity. Backends without transparency retain full opacity. */
    opacity(): number { return 1; }

    /** Backends supporting transparency override this method. */
    setOpacity(opacity: number): void {
        if (opacity !== 1) throw new Error("This paint engine does not support opacity.");
    }

    /** Translates the current coordinate system. */
    abstract translate(x: number, y: number): void;

    /** Fills a rectangular area using the current fill style. */
    abstract fillRect(
        x: number,
        y: number,
        width: number,
        height: number
    ): void;

    /** Strokes a rectangular area using the current stroke style. */
    abstract strokeRect(
        x: number,
        y: number,
        width: number,
        height: number
    ): void;

    /** Clears a rectangular area. */
    abstract clearRect(
        x: number,
        y: number,
        width: number,
        height: number
    ): void;

    /** Sets the current fill style. */
    abstract setFillStyle(style: string): void;
    /** Sets the current stroke style. */
    abstract setStrokeStyle(style: string): void;
    /** Sets the current line width. */
    abstract setLineWidth(width: number): void;
    /** Returns the rendered width of text using the current font. */
    abstract textWidth(text: string): number;

    /** Intersects the current clipping region with a rectangle. */
    abstract clipRect(x: number, y: number, width: number,
		height: number): void;

    /** Returns the current font specification. */
    abstract font() : string;
    /** Sets the current font specification. */
    abstract setFont(font: string): void;
    /** Returns the current text alignment. */
    abstract textAlign() : CanvasTextAlign;
    /** Sets the current text alignment. */
    abstract setTextAlign(align: CanvasTextAlign) : void;
    /** Sets the current text baseline. */
    abstract setTextBaseline(baseline: CanvasTextBaseline): void;
    /** Returns the current text baseline. */
    abstract textBaseline() : CanvasTextBaseline;
    /** Draws a line segment. */
    abstract drawLine(x1: number, y1: number, x2: number, y2: number): void;
    /** Draws text at the specified position. */
    abstract drawText(text: string, x: number, y: number): void;
    /** Draws a pixmap into the specified destination rectangle. */
    abstract drawPixmap(pixmap: CPixmap, x: number, y: number, w: number, h: number): void;
    /** Draws the outline of an ellipse. */
    abstract drawEllipse(x: number, y: number, w: number, h: number): void;
    /** Fills an ellipse. */
    abstract fillEllipse(x: number, y: number, w: number, h: number): void;
    /** Draws a rectangle using the current fill and stroke styles. */
    abstract drawRect(x: number, y: number, w: number, h: number): void;
    /** Draws a rounded rectangle with the specified corner radius or radii. */
    abstract drawRoundedRect(x: number, y: number, w: number, h: number, r: number | number[] ): void;
}