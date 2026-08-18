import type { CPaintDevice } from "./CPaintDevice.js";
import type { CPaintEngine } from "./CPaintEngine.js";
import { CRect } from "../geometry/CRect.js";
import { CPixmap } from "../painting/CPixmap.js";

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

	clipRect(rect: CRect): void {
		this.#m_engine.clipRect(
			rect.x(), rect.y(), rect.width(), rect.height()
		);
	}

    textWidth(text: string): number {
	    return this.#m_engine.textWidth(text);
    }

    font() : string {
        return this.#m_engine.font();
    }

	setFont(font: string): void {
		this.#m_engine.setFont(font);
	}

    textAlign() : CanvasTextAlign {
        return this.#m_engine.textAlign();
    }

	setTextAlign(align: CanvasTextAlign): void {
		this.#m_engine.setTextAlign(align);
	}

	setTextBaseline(baseline: CanvasTextBaseline): void {
		this.#m_engine.setTextBaseline(baseline);
	}

    textBaseline() : CanvasTextBaseline {
        return this.#m_engine.textBaseline();
    }

    drawLine(x1: number, y1: number, x2: number, y2: number) : void {
        this.#m_engine.drawLine(x1, y1, x2, y2);
    }

	drawText(text: string, x: number, y: number): void {
		this.#m_engine.fillText(text, x, y);
	}

    drawPixmap(
        pixmap: CPixmap, 
        x: number, 
        y: number, 
        w: number = pixmap !== null? pixmap.width() : 0,
        h: number = pixmap !== null? pixmap.height() : 0
    ): void {
        if (pixmap !== null)
            this.#m_engine.drawPixmap(pixmap, x, y, w, h);
    }
}