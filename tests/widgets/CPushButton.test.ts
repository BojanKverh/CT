import { beforeEach, describe, expect, test, vi } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import {
	CMouseButton,
	CMouseEvent
} from "../../src/events/CMouseEvent.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CPushButton } from "../../src/widgets/CPushButton.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { CPainter } from "../../src/painting/CPainter";
import { TestPaintDevice } from "../helpers/createTestPaintEngine";

class TestPushButton extends CPushButton {
	mousePress(event: CMouseEvent): void {
		this.mousePressEvent(event);
	}

	mouseRelease(event: CMouseEvent): void {
		this.mouseReleaseEvent(event);
	}

	paint(painter: CPainter): void {
		this.paintEvent(painter);
	}
}

describe("CPushButton", () => {
	beforeEach(() => {
        if (CApplication.exists())
		    CApplication.instance().destroy();
		new CApplication(createTestCanvas());
	});

	test("is not down by default", () => {
		const button = new CPushButton();

		expect(button.isDown()).toBe(false);
	});

	test("goes down on left mouse press", () => {
		const button = new TestPushButton();

		const event = new CMouseEvent(
			CEventType.MousePress, 10, 10, CMouseButton.LeftButton
		);

		button.mousePress(event);

		expect(button.isDown()).toBe(true);
		expect(event.isAccepted()).toBe(true);
	});

	test("ignores non-left mouse press", () => {
		const button = new TestPushButton();

		const event = new CMouseEvent(
			CEventType.MousePress, 10, 10, CMouseButton.RightButton
		);

		button.mousePress(event);

		expect(button.isDown()).toBe(false);
		expect(event.isAccepted()).toBe(false);
	});

	test("emits clicked on release inside the button", () => {
		const button = new TestPushButton();
		button.resize(100, 50);

		const clicked = vi.fn();
		button.clicked.connect(clicked);

		button.mousePress(new CMouseEvent(
			CEventType.MousePress, 10, 10, CMouseButton.LeftButton
		));

		button.mouseRelease(new CMouseEvent(
			CEventType.MouseRelease, 20, 20, CMouseButton.LeftButton
		));

		expect(button.isDown()).toBe(false);
		expect(clicked).toHaveBeenCalledOnce();
	});

	test("does not emit clicked on release outside the button", () => {
		const button = new TestPushButton();
		button.resize(100, 50);

		const clicked = vi.fn();
		button.clicked.connect(clicked);

		button.mousePress(new CMouseEvent(
			CEventType.MousePress, 10, 10, CMouseButton.LeftButton
		));

		button.mouseRelease(new CMouseEvent(
			CEventType.MouseRelease, 150, 20, CMouseButton.LeftButton
		));

		expect(button.isDown()).toBe(false);
		expect(clicked).not.toHaveBeenCalled();
	});

    test("releases outside after press without emitting clicked", () => {
		const app = CApplication.instance();
		const canvas = app.canvas();

		const button = new CPushButton();
		button.setGeometry(100, 100, 120, 50);

		const clicked = vi.fn();
		button.clicked.connect(clicked);

		canvas.dispatchEvent({
			type: "pointerdown",
			clientX: 120,
			clientY: 120,
			button: 0
		} as PointerEvent);

		expect(button.isDown()).toBe(true);
		expect(app.mouseGrabber()).toBe(button);

		canvas.dispatchEvent({
			type: "pointerup",
			clientX: 400,
			clientY: 300,
			button: 0
		} as PointerEvent);

		expect(button.isDown()).toBe(false);
		expect(clicked).not.toHaveBeenCalled();
		expect(app.mouseGrabber()).toBeNull();
	});

	test("has empty text by default", () => {
		const button = new CPushButton();

		expect(button.text()).toBe("");
	});

	test("sets button text", () => {
		const button = new CPushButton();

		button.setText("Hello");

		expect(button.text()).toBe("Hello");
	});

	test("draws button text centered in the button", () => {
		const button = new TestPushButton();
		button.resize(120, 50);
		button.setText("Click me");

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		button.paint(painter);

		expect(device.engine.setFont).toHaveBeenCalledWith(
			"14px sans-serif"
		);
		expect(device.engine.setTextAlign).toHaveBeenCalledWith(
			"center"
		);
		expect(device.engine.setTextBaseline).toHaveBeenCalledWith(
			"middle"
		);
		expect(device.engine.fillText).toHaveBeenCalledWith(
			"Click me", 60, 25
		);
	});
    
});