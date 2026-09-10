import { CPaintDevice } from "./CPaintDevice.js";
import { CCanvasPaintEngine } from "./CCanvasPaintEngine.js";

/** Paint device backed by an HTML canvas element. */
export class CCanvasPaintDevice extends CPaintDevice {
    #m_canvas: HTMLCanvasElement;
    #m_paintEngine: CCanvasPaintEngine;

    /** Creates a paint device for the specified canvas. */
    constructor(canvas: HTMLCanvasElement) {
        super();

        const context = canvas.getContext("2d");

        if (context === null)
            throw new Error("Unable to create 2D canvas rendering context.");

        this.#m_canvas = canvas;
        this.#m_paintEngine = new CCanvasPaintEngine(context);
    }

    /** Returns the canvas width in pixels. */
    width(): number {
        return this.#m_canvas.width;
    }

    /** Returns the canvas height in pixels. */
    height(): number {
        return this.#m_canvas.height;
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