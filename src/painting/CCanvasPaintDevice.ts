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

    /** Returns the logical canvas width in CSS pixels. */
    width(): number {
        return this.#m_width;
    }

    /** Returns the logical canvas height in CSS pixels. */
    height(): number {
        return this.#m_height;
    }

    /** Synchronizes the backing bitmap without changing the CSS size. */
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

    /** Returns the underlying HTML canvas element. */
    canvas(): HTMLCanvasElement {
        return this.#m_canvas;
    }

    /** Returns the canvas paint engine used by this device. */
    paintEngine(): CCanvasPaintEngine {
        return this.#m_paintEngine;
    }
}