import { CPaintDevice } from "./CPaintDevice.js";
import { CCanvasPaintEngine } from "./CCanvasPaintEngine.js";

/** Paint device backed by an HTML canvas element. */
export class CCanvasPaintDevice extends CPaintDevice {
    #m_canvas: HTMLCanvasElement;
    #m_width: number;
    #m_height: number;
    #m_paintEngine: CCanvasPaintEngine;

    /** Creates a paint device for the specified canvas. */
    constructor(canvas: HTMLCanvasElement) {
        super();

        const context = canvas.getContext("2d");

        if (context === null)
            throw new Error("Unable to create 2D canvas rendering context.");

        this.#m_canvas = canvas;
        this.#m_width = canvas.width;
        this.#m_height = canvas.height;
        this.#m_paintEngine = new CCanvasPaintEngine(context);
    }

    /**
     * Reads the canvas width exposed to painters.
     * @returns Logical width, before the device pixel ratio is applied.
     */
    width(): number {
        return this.#m_width;
    }

    /**
     * Reads the canvas height exposed to painters.
     * @returns Logical height, before the device pixel ratio is applied.
     */
    height(): number {
        return this.#m_height;
    }

    /**
     * Updates the logical size and canvas bitmap, then sets the context scale to preserve logical drawing coordinates. Throws `RangeError` for invalid or oversized dimensions.
     * @param width Positive finite logical width.
     * @param height Positive finite logical height.
     * @param pixelRatio Positive finite bitmap pixels per logical pixel. Defaults to one.
     * @returns `true` if the logical or bitmap dimensions changed.
     */
    resize(width: number, height: number, pixelRatio = 1): boolean {
        if (![width, height, pixelRatio].every(Number.isFinite) ||
            width <= 0 || height <= 0 || pixelRatio <= 0)
            throw new RangeError("Canvas dimensions and pixel ratio must be positive and finite.");
        const bitmapWidth = Math.max(1, Math.round(width * pixelRatio));
        const bitmapHeight = Math.max(1, Math.round(height * pixelRatio));
        if (!Number.isSafeInteger(bitmapWidth) || !Number.isSafeInteger(bitmapHeight))
            throw new RangeError("Canvas bitmap dimensions are too large.");
        const changed = this.#m_width !== width || this.#m_height !== height ||
            this.#m_canvas.width !== bitmapWidth || this.#m_canvas.height !== bitmapHeight;
        if (!changed) return false;
        this.#m_width = width;
        this.#m_height = height;
        if (this.#m_canvas.width !== bitmapWidth) this.#m_canvas.width = bitmapWidth;
        if (this.#m_canvas.height !== bitmapHeight) this.#m_canvas.height = bitmapHeight;
        const context = this.#m_canvas.getContext("2d")!;
        context.setTransform(bitmapWidth / width, 0, 0, bitmapHeight / height, 0, 0);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        return true;
    }

    /**
     * Exposes the DOM element that receives the drawing output.
     * @returns The backing `HTMLCanvasElement`.
     */
    canvas(): HTMLCanvasElement {
        return this.#m_canvas;
    }

    /**
     * Looks up the renderer bound to the canvas context.
     * @returns The device's canvas paint engine.
     */
    paintEngine(): CCanvasPaintEngine {
        return this.#m_paintEngine;
    }
}