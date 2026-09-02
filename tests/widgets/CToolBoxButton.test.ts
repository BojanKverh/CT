import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { CToolBoxButton } from "../../src/widgets/CToolBoxButton.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { CPaletteColorRole } from "../../src/gui/CPalette.js";
import { CColor } from "../../src/gui/CColor.js";
import { CPainter } from "../../src/painting/CPainter.js";
import { CDefaultStyle } from "../../src/gui/CDefaultStyle.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CToolBoxButton", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has height of 28 pixels", () => {
		const parent = new CWidget();
		const button = new CToolBoxButton(parent);

		expect(button.sizeHint().height()).toBe(28);
	});

	test("sizeHint width depends on text", () => {
		const parent = new CWidget();
		const button = new CToolBoxButton(parent);

		button.setText("A");
		const shortWidth = button.sizeHint().width();

		button.setText("A much longer toolbox item");

		expect(button.sizeHint().width()).toBeGreaterThan(shortWidth);
	});

	test("is not current by default", () => {
		const parent = new CWidget();
		const button = new CToolBoxButton(parent);

		expect(button.isCurrent()).toBe(false);
	});

	test("setCurrent changes current state", () => {
		const parent = new CWidget();
		const button = new CToolBoxButton(parent);

		button.setCurrent(true);
		expect(button.isCurrent()).toBe(true);

		button.setCurrent(false);
		expect(button.isCurrent()).toBe(false);
	});

	test("left mouse press sets down state", () => {
		const parent = new CWidget();
		const button = new CToolBoxButton(parent);

		button.event(new CMouseEvent(
			CEventType.MousePress, 5, 5, CMouseButton.LeftButton
		));

		expect(button.isDown()).toBe(true);
	});

	test("right mouse press does not set down state", () => {
		const parent = new CWidget();
		const button = new CToolBoxButton(parent);

		button.event(new CMouseEvent(
			CEventType.MousePress, 5, 5, CMouseButton.RightButton
		));

		expect(button.isDown()).toBe(false);
	});

	test("disabled button does not enter down state", () => {
		const parent = new CWidget();
		const button = new CToolBoxButton(parent);

		button.setEnabled(false);
		button.event(new CMouseEvent(
			CEventType.MousePress, 5, 5, CMouseButton.LeftButton
		));

		expect(button.isDown()).toBe(false);
	});

	test("mouse release clears down state", () => {
		const parent = new CWidget();
		const button = new CToolBoxButton(parent);

		button.event(new CMouseEvent(
			CEventType.MousePress, 5, 5, CMouseButton.LeftButton
		));
		button.event(new CMouseEvent(
			CEventType.MouseRelease, 5, 5, CMouseButton.LeftButton
		));

		expect(button.isDown()).toBe(false);
	});

	test("left mouse click emits clicked", () => {
		const parent = new CWidget();
		const button = new CToolBoxButton(parent);
		let clicked = 0;

		button.clicked.connect(() => ++clicked);

		button.event(new CMouseEvent(
			CEventType.MousePress, 5, 5, CMouseButton.LeftButton
		));
		button.event(new CMouseEvent(
			CEventType.MouseRelease, 5, 5, CMouseButton.LeftButton
		));

		expect(clicked).toBe(1);
	});

	test("mouse release without press does not emit clicked", () => {
		const parent = new CWidget();
		const button = new CToolBoxButton(parent);
		let clicked = 0;

		button.clicked.connect(() => ++clicked);

		button.event(new CMouseEvent(
			CEventType.MouseRelease, 5, 5, CMouseButton.LeftButton
		));

		expect(clicked).toBe(0);
	});

	test("mouse move sets hovered state", () => {
		const parent = new CWidget();
		const button = new CToolBoxButton(parent);

		button.event(new CMouseEvent(
			CEventType.MouseMove, 5, 5, CMouseButton.NoButton
		));

		expect(button.isHovered()).toBe(true);
	});

	test("mouse leave clears hovered state", () => {
		const parent = new CWidget();
		const button = new CToolBoxButton(parent);

		button.event(new CMouseEvent(
			CEventType.MouseMove, 5, 5, CMouseButton.NoButton
		));
		button.event(new CMouseEvent(
			CEventType.MouseLeave, 5, 5, CMouseButton.NoButton
		));

		expect(button.isHovered()).toBe(false);
	});

	test("mouse leave clears down state", () => {
		const parent = new CWidget();
		const button = new CToolBoxButton(parent);

		button.event(new CMouseEvent(
			CEventType.MousePress, 5, 5, CMouseButton.LeftButton
		));
		button.event(new CMouseEvent(
			CEventType.MouseLeave, 5, 5, CMouseButton.NoButton
		));

		expect(button.isDown()).toBe(false);
	});

	test("enabled non-current button uses normal text color", () => {
		const button = new CToolBoxButton();
		button.setText("Network");
		button.resize(200, 28);

		const palette = button.palette();

		palette.setColor(
			CPaletteColorRole.Text,
			new CColor(1, 2, 3)
		);
		palette.setColor(
			CPaletteColorRole.DisabledText,
			new CColor(101, 102, 103)
		);

		button.setPalette(palette);

		const painter = {
			setFillStyle: vi.fn(),
			fillRect: vi.fn(),
			setStrokeStyle: vi.fn(),
			drawLine: vi.fn(),
			setFont: vi.fn(),
			setTextAlign: vi.fn(),
			setTextBaseline: vi.fn(),
			drawText: vi.fn(),
            setPen: vi.fn()
		} as unknown as CPainter;

		new CDefaultStyle().drawToolBoxButton(painter, button);

		expect(painter.setPen).toHaveBeenLastCalledWith(
			palette.color(CPaletteColorRole.Text).toCss()
		);
	});
});