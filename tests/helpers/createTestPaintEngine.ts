import { vi } from "vitest";

import { CPaintDevice } from "../../src/painting/CPaintDevice.js";
import { CPaintEngine } from "../../src/painting/CPaintEngine.js";

export class TestPaintEngine extends CPaintEngine {
	save = vi.fn();
	restore = vi.fn();
	translate = vi.fn();

	fillRect = vi.fn();
	strokeRect = vi.fn();
	clearRect = vi.fn();
	clipRect = vi.fn();

	setFillStyle = vi.fn();
	setStrokeStyle = vi.fn();
	setLineWidth = vi.fn();
    drawLine = vi.fn();
    textWidth = vi.fn();
	drawText = vi.fn();
	drawEllipse = vi.fn();
	fillEllipse = vi.fn();

	font = vi.fn(() => "");
	setFont = vi.fn();

	textAlign = vi.fn(() => "start" as CanvasTextAlign);
	setTextAlign = vi.fn();

	textBaseline = vi.fn(
		() => "alphabetic" as CanvasTextBaseline
	);
	setTextBaseline = vi.fn();

	fillText = vi.fn();
	drawPixmap = vi.fn();
}

export class TestPaintDevice extends CPaintDevice {
	readonly engine = new TestPaintEngine();

	width(): number {
		return 800;
	}

	height(): number {
		return 600;
	}

	paintEngine(): CPaintEngine {
		return this.engine;
	}
}