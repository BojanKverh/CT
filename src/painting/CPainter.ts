import type { CPaintDevice } from "./CPaintDevice.js";
import type { CPaintEngine } from "./CPaintEngine.js";
import { CRect } from "../geometry/CRect.js";

export class CPainter {
    #m_device: CPaintDevice;
    #m_engine: CPaintEngine;

    constructor(device: CPaintDevice) {
        this.#m_device = device;
        this.#m_engine = device.paintEngine();
    }

    device(): CPaintDevice {
        return this.#m_device;
    }

    save(): void {
        this.#m_engine.save();
    }

    restore(): void {
        this.#m_engine.restore();
    }

    translate(x: number, y: number): void {
        this.#m_engine.translate(x, y);
    }

    clearRect(rect: CRect): void {
        this.#m_engine.clearRect(
            rect.x(),
            rect.y(),
            rect.width(),
            rect.height()
        );
    }

    fillRect(rect: CRect): void {
        this.#m_engine.fillRect(
            rect.x(),
            rect.y(),
            rect.width(),
            rect.height()
        );
    }

    strokeRect(rect: CRect): void {
        this.#m_engine.strokeRect(
            rect.x(),
            rect.y(),
            rect.width(),
            rect.height()
        );
    }

    setFillStyle(style: string): void {
        this.#m_engine.setFillStyle(style);
    }

    setStrokeStyle(style: string): void {
        this.#m_engine.setStrokeStyle(style);
    }

    setLineWidth(width: number): void {
        this.#m_engine.setLineWidth(width);
    }
}