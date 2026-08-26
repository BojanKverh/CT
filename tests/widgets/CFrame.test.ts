import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import {
	CFrame,
	CFrameShadow,
	CFrameShape
} from "../../src/widgets/CFrame.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { CVBoxLayout } from "../../src/layouts/CVBoxLayout.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CFrame", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("uses NoFrame shape by default", () => {
		const frame = new CFrame();

		expect(frame.frameShape()).toBe(CFrameShape.NoFrame);
	});

	test("uses Plain shadow by default", () => {
		const frame = new CFrame();

		expect(frame.frameShadow()).toBe(CFrameShadow.Plain);
	});

	test("uses line width 1 by default", () => {
		const frame = new CFrame();

		expect(frame.lineWidth()).toBe(1);
	});

	test("uses mid line width 0 by default", () => {
		const frame = new CFrame();

		expect(frame.midLineWidth()).toBe(0);
	});

	test("NoFrame has frame width 0", () => {
		const frame = new CFrame();

		expect(frame.frameWidth()).toBe(0);
	});

	test("sets frame shape", () => {
		const frame = new CFrame();

		frame.setFrameShape(CFrameShape.Box);

		expect(frame.frameShape()).toBe(CFrameShape.Box);
	});

	test("sets frame shadow", () => {
		const frame = new CFrame();

		frame.setFrameShadow(CFrameShadow.Sunken);

		expect(frame.frameShadow()).toBe(CFrameShadow.Sunken);
	});

	test("sets line width", () => {
		const frame = new CFrame();

		frame.setLineWidth(4);

		expect(frame.lineWidth()).toBe(4);
	});

	test("sets mid line width", () => {
		const frame = new CFrame();

		frame.setMidLineWidth(3);

		expect(frame.midLineWidth()).toBe(3);
	});

	test("line width cannot be negative", () => {
		const frame = new CFrame();

		frame.setLineWidth(-10);

		expect(frame.lineWidth()).toBe(0);
	});

	test("mid line width cannot be negative", () => {
		const frame = new CFrame();

		frame.setMidLineWidth(-10);

		expect(frame.midLineWidth()).toBe(0);
	});

	test("Plain Box frame width equals line width", () => {
		const frame = new CFrame();

		frame.setFrameShape(CFrameShape.Box);
		frame.setFrameShadow(CFrameShadow.Plain);
		frame.setLineWidth(3);
		frame.setMidLineWidth(4);

		expect(frame.frameWidth()).toBe(3);
	});

	test("Raised Box includes two lines and mid line", () => {
		const frame = new CFrame();

		frame.setFrameShape(CFrameShape.Box);
		frame.setFrameShadow(CFrameShadow.Raised);
		frame.setLineWidth(2);
		frame.setMidLineWidth(3);

		expect(frame.frameWidth()).toBe(7);
	});

	test("Sunken Box includes two lines and mid line", () => {
		const frame = new CFrame();

		frame.setFrameShape(CFrameShape.Box);
		frame.setFrameShadow(CFrameShadow.Sunken);
		frame.setLineWidth(2);
		frame.setMidLineWidth(3);

		expect(frame.frameWidth()).toBe(7);
	});

	test("Raised Box without mid line has two line widths", () => {
		const frame = new CFrame();

		frame.setFrameShape(CFrameShape.Box);
		frame.setFrameShadow(CFrameShadow.Raised);
		frame.setLineWidth(2);

		expect(frame.frameWidth()).toBe(4);
	});

	test("Panel frame width equals line width", () => {
		const frame = new CFrame();

		frame.setFrameShape(CFrameShape.Panel);
		frame.setFrameShadow(CFrameShadow.Sunken);
		frame.setLineWidth(3);
		frame.setMidLineWidth(10);

		expect(frame.frameWidth()).toBe(3);
	});

	test("Panel ignores mid line width for frame width", () => {
		const frame = new CFrame();

		frame.setFrameShape(CFrameShape.Panel);
		frame.setFrameShadow(CFrameShadow.Raised);
		frame.setLineWidth(1);
		frame.setMidLineWidth(20);

		expect(frame.frameWidth()).toBe(1);
	});

	test("Plain HLine frame width equals line width", () => {
		const frame = new CFrame();

		frame.setFrameShape(CFrameShape.HLine);
		frame.setFrameShadow(CFrameShadow.Plain);
		frame.setLineWidth(3);
		frame.setMidLineWidth(4);

		expect(frame.frameWidth()).toBe(3);
	});

	test("Sunken HLine includes two lines and mid line", () => {
		const frame = new CFrame();

		frame.setFrameShape(CFrameShape.HLine);
		frame.setFrameShadow(CFrameShadow.Sunken);
		frame.setLineWidth(2);
		frame.setMidLineWidth(3);

		expect(frame.frameWidth()).toBe(7);
	});

	test("Plain VLine frame width equals line width", () => {
		const frame = new CFrame();

		frame.setFrameShape(CFrameShape.VLine);
		frame.setFrameShadow(CFrameShadow.Plain);
		frame.setLineWidth(3);
		frame.setMidLineWidth(4);

		expect(frame.frameWidth()).toBe(3);
	});

	test("Raised VLine includes two lines and mid line", () => {
		const frame = new CFrame();

		frame.setFrameShape(CFrameShape.VLine);
		frame.setFrameShadow(CFrameShadow.Raised);
		frame.setLineWidth(2);
		frame.setMidLineWidth(3);

		expect(frame.frameWidth()).toBe(7);
	});

	test("frameRect equals widget rect", () => {
		const frame = new CFrame();

		frame.setGeometry(20, 30, 200, 100);

		expect(frame.frameRect()).toEqual(frame.rect());
	});


	test("NoFrame contents rect equals widget rect", () => {
		const frame = new CFrame();
		frame.setGeometry(20, 30, 200, 100);

		expect(frame.contentsRect()).toEqual(frame.rect());
	});

	test("Plain Box contents rect excludes frame", () => {
		const frame = new CFrame();
		frame.resize(200, 100);
		frame.setFrameShape(CFrameShape.Box);
		frame.setFrameShadow(CFrameShadow.Plain);
		frame.setLineWidth(3);

		const rect = frame.contentsRect();

		expect(rect.x()).toBe(3);
		expect(rect.y()).toBe(3);
		expect(rect.width()).toBe(194);
		expect(rect.height()).toBe(94);
	});

	test("Raised Box contents rect excludes complete frame width", () => {
		const frame = new CFrame();
		frame.resize(200, 100);
		frame.setFrameShape(CFrameShape.Box);
		frame.setFrameShadow(CFrameShadow.Raised);
		frame.setLineWidth(2);
		frame.setMidLineWidth(3);

		const rect = frame.contentsRect();

		expect(frame.frameWidth()).toBe(7);
		expect(rect.x()).toBe(7);
		expect(rect.y()).toBe(7);
		expect(rect.width()).toBe(186);
		expect(rect.height()).toBe(86);
	});

	test("Panel contents rect excludes line width", () => {
		const frame = new CFrame();
		frame.resize(200, 100);
		frame.setFrameShape(CFrameShape.Panel);
		frame.setFrameShadow(CFrameShadow.Raised);
		frame.setLineWidth(3);
		frame.setMidLineWidth(10);

		const rect = frame.contentsRect();

		expect(frame.frameWidth()).toBe(3);
		expect(rect.x()).toBe(3);
		expect(rect.y()).toBe(3);
		expect(rect.width()).toBe(194);
		expect(rect.height()).toBe(94);
	});

	test("contents rect never has negative size", () => {
		const frame = new CFrame();
		frame.resize(6, 4);
		frame.setFrameShape(CFrameShape.Box);
		frame.setFrameShadow(CFrameShadow.Raised);
		frame.setLineWidth(4);

		const rect = frame.contentsRect();

		expect(rect.width()).toBe(0);
		expect(rect.height()).toBe(0);
	});

	test("layout uses contents rect inside frame", () => {
		const frame = new CFrame();
		frame.resize(200, 100);
		frame.setFrameShape(CFrameShape.Box);
		frame.setFrameShadow(CFrameShadow.Plain);
		frame.setLineWidth(2);

		const layout = new CVBoxLayout();
		frame.setLayout(layout);

		const child = new CWidget();
		layout.addWidget(child);

		const margins = layout.contentsMargins();

		expect(child.x()).toBe(2 + margins.left);
		expect(child.y()).toBe(2 + margins.top);
		expect(child.width()).toBe(196 - margins.left - margins.right);
		expect(child.height()).toBe(96 - margins.top - margins.bottom);
	});

	test("manual child geometry still uses frame coordinates", () => {
		const frame = new CFrame();
		frame.resize(200, 100);
		frame.setFrameShape(CFrameShape.Box);
		frame.setLineWidth(2);

		const child = new CWidget(frame);
		child.setGeometry(0, 0, 200, 30);

		expect(child.x()).toBe(0);
		expect(child.y()).toBe(0);
		expect(child.width()).toBe(200);
		expect(child.height()).toBe(30);
	});

	test("changing frame shape calls frameChanged", () => {
		class TestFrame extends CFrame {
			readonly changed = vi.fn();

			protected override frameChanged(): void {
				this.changed();
			}
		}

		const frame = new TestFrame();

		frame.setFrameShape(CFrameShape.Box);

		expect(frame.changed).toHaveBeenCalledOnce();
	});

	test("setting same frame shape does not call frameChanged", () => {
		class TestFrame extends CFrame {
			readonly changed = vi.fn();

			protected override frameChanged(): void {
				this.changed();
			}
		}

		const frame = new TestFrame();

		frame.setFrameShape(CFrameShape.NoFrame);

		expect(frame.changed).not.toHaveBeenCalled();
	});

	test("changing frame shadow calls frameChanged", () => {
		class TestFrame extends CFrame {
			readonly changed = vi.fn();

			protected override frameChanged(): void {
				this.changed();
			}
		}

		const frame = new TestFrame();

		frame.setFrameShadow(CFrameShadow.Sunken);

		expect(frame.changed).toHaveBeenCalledOnce();
	});

	test("changing line width calls frameChanged", () => {
		class TestFrame extends CFrame {
			readonly changed = vi.fn();

			protected override frameChanged(): void {
				this.changed();
			}
		}

		const frame = new TestFrame();

		frame.setLineWidth(2);

		expect(frame.changed).toHaveBeenCalledOnce();
	});

	test("changing mid line width calls frameChanged", () => {
		class TestFrame extends CFrame {
			readonly changed = vi.fn();

			protected override frameChanged(): void {
				this.changed();
			}
		}

		const frame = new TestFrame();

		frame.setMidLineWidth(2);

		expect(frame.changed).toHaveBeenCalledOnce();
	});

	test("unchanged line width does not call frameChanged", () => {
		class TestFrame extends CFrame {
			readonly changed = vi.fn();

			protected override frameChanged(): void {
				this.changed();
			}
		}

		const frame = new TestFrame();

		frame.setLineWidth(1);

		expect(frame.changed).not.toHaveBeenCalled();
	});

	test("unchanged mid line width does not call frameChanged", () => {
		class TestFrame extends CFrame {
			readonly changed = vi.fn();

			protected override frameChanged(): void {
				this.changed();
			}
		}

		const frame = new TestFrame();

		frame.setMidLineWidth(0);

		expect(frame.changed).not.toHaveBeenCalled();
	});
});