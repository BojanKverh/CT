import { CPaintDevice } from "./CPaintDevice.js";
import { CCanvasPaintEngine } from "./CCanvasPaintEngine.js";

export class CCanvasPaintDevice extends CPaintDevice {
    #m_canvas: HTMLCanvasElement;
    #m_paintEngine: CCanvasPaintEngine;

    constructor(canvas: HTMLCanvasElement) {
        super();

        const context = canvas.getContext("2d");

        if (context === null)
            throw new Error("Unable to create 2D canvas rendering context.");

        this.#m_canvas = canvas;
        this.#m_paintEngine = new CCanvasPaintEngine(context);
    }

    width(): number {
        return this.#m_canvas.width;
    }

    height(): number {
        return this.#m_canvas.height;
    }

    canvas(): HTMLCanvasElement {
        return this.#m_canvas;
    }

    paintEngine(): CCanvasPaintEngine {
        return this.#m_paintEngine;
    }
}