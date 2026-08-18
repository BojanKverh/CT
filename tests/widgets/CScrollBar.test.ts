import {
	afterEach,
	beforeEach,
	describe,
	expect,
	test,
	vi
} from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CScrollBar } from "../../src/widgets/CScrollBar.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { COrientation } from "../../src/gui/COrientation.js";

describe("CScrollBar", () => {
	beforeEach(() => {
		Object.defineProperty(globalThis, "window", {
			value: createTestWindow(),
			writable: true,
			configurable: true
		});

		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has default minimum", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);

		expect(scrollBar.minimum()).toBe(0);
	});

	test("has default maximum", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);

		expect(scrollBar.maximum()).toBe(100);
	});

	test("has default value", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);

		expect(scrollBar.value()).toBe(0);
	});

	test("has default single step", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);

		expect(scrollBar.singleStep()).toBe(1);
	});

	test("has default page step", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);

		expect(scrollBar.pageStep()).toBe(10);
	});

	test("sets value", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);

		scrollBar.setValue(42);

		expect(scrollBar.value()).toBe(42);
	});

	test("clamps value to minimum", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);

		scrollBar.setValue(-10);

		expect(scrollBar.value()).toBe(0);
	});

	test("clamps value to maximum", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);

		scrollBar.setValue(150);

		expect(scrollBar.value()).toBe(100);
	});

	test("emits valueChanged when value changes", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		const slot = vi.fn();

		scrollBar.valueChanged.connect(slot);
		scrollBar.setValue(42);

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith(42);
	});

	test("does not emit valueChanged when value is unchanged", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.setValue(42);

		const slot = vi.fn();
		scrollBar.valueChanged.connect(slot);

		scrollBar.setValue(42);

		expect(slot).not.toHaveBeenCalled();
	});

	test("sets range", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);

		scrollBar.setRange(10, 80);

		expect(scrollBar.minimum()).toBe(10);
		expect(scrollBar.maximum()).toBe(80);
	});

	test("clamps value when minimum increases above current value", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.setValue(20);

		scrollBar.setRange(30, 100);

		expect(scrollBar.value()).toBe(30);
	});

	test("clamps value when maximum decreases below current value", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.setValue(80);

		scrollBar.setRange(0, 50);

		expect(scrollBar.value()).toBe(50);
	});

	test("keeps value when new range contains current value", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.setValue(40);

		scrollBar.setRange(20, 80);

		expect(scrollBar.value()).toBe(40);
	});

	test("sets maximum to minimum when minimum is greater than maximum", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);

		scrollBar.setRange(80, 20);

		expect(scrollBar.minimum()).toBe(80);
		expect(scrollBar.maximum()).toBe(80);
		expect(scrollBar.value()).toBe(80);
	});

	test("sets minimum", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);

		scrollBar.setMinimum(20);

		expect(scrollBar.minimum()).toBe(20);
		expect(scrollBar.maximum()).toBe(100);
	});

	test("sets maximum", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);

		scrollBar.setMaximum(50);

		expect(scrollBar.minimum()).toBe(0);
		expect(scrollBar.maximum()).toBe(50);
	});

	test("sets single step", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);

		scrollBar.setSingleStep(5);

		expect(scrollBar.singleStep()).toBe(5);
	});

	test("clamps negative single step to zero", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);

		scrollBar.setSingleStep(-5);

		expect(scrollBar.singleStep()).toBe(0);
	});

	test("sets page step", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);

		scrollBar.setPageStep(25);

		expect(scrollBar.pageStep()).toBe(25);
	});

	test("clamps negative page step to zero", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);

		scrollBar.setPageStep(-10);

		expect(scrollBar.pageStep()).toBe(0);
	});

	test("steps backward by single step", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.setValue(20);
		scrollBar.setSingleStep(5);

		scrollBar.stepBackward();

		expect(scrollBar.value()).toBe(15);
	});

	test("steps forward by single step", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.setValue(20);
		scrollBar.setSingleStep(5);

		scrollBar.stepForward();

		expect(scrollBar.value()).toBe(25);
	});

	test("step backward clamps to minimum", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.setValue(2);
		scrollBar.setSingleStep(5);

		scrollBar.stepBackward();

		expect(scrollBar.value()).toBe(0);
	});

	test("step forward clamps to maximum", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.setValue(98);
		scrollBar.setSingleStep(5);

		scrollBar.stepForward();

		expect(scrollBar.value()).toBe(100);
	});

	test("pages backward by page step", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.setValue(50);
		scrollBar.setPageStep(20);

		scrollBar.pageBackward();

		expect(scrollBar.value()).toBe(30);
	});

	test("pages forward by page step", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.setValue(50);
		scrollBar.setPageStep(20);

		scrollBar.pageForward();

		expect(scrollBar.value()).toBe(70);
	});

	test("page backward clamps to minimum", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.setValue(10);
		scrollBar.setPageStep(20);

		scrollBar.pageBackward();

		expect(scrollBar.value()).toBe(0);
	});

	test("page forward clamps to maximum", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.setValue(90);
		scrollBar.setPageStep(20);

		scrollBar.pageForward();

		expect(scrollBar.value()).toBe(100);
	});

	test("stores parent from constructor", () => {
		const parent = new CWidget();
		const scrollBar = new CScrollBar(COrientation.Horizontal, parent);

		expect(scrollBar.parent()).toBe(parent);
	});

	test("left arrow decreases value by single step", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.setValue(50);
		scrollBar.setSingleStep(5);

		const event = new CKeyEvent(CEventType.KeyPress, "ArrowLeft");
		scrollBar.event(event);

		expect(scrollBar.value()).toBe(45);
		expect(event.isAccepted()).toBe(true);
	});

	test("right arrow increases value by single step", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.setValue(50);
		scrollBar.setSingleStep(5);

		const event = new CKeyEvent(CEventType.KeyPress, "ArrowRight");
		scrollBar.event(event);

		expect(scrollBar.value()).toBe(55);
		expect(event.isAccepted()).toBe(true);
	});

	test("page up decreases value by page step", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.setValue(50);
		scrollBar.setPageStep(20);

		const event = new CKeyEvent(CEventType.KeyPress, "PageUp");
		scrollBar.event(event);

		expect(scrollBar.value()).toBe(30);
		expect(event.isAccepted()).toBe(true);
	});

	test("page down increases value by page step", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.setValue(50);
		scrollBar.setPageStep(20);

		const event = new CKeyEvent(CEventType.KeyPress, "PageDown");
		scrollBar.event(event);

		expect(scrollBar.value()).toBe(70);
		expect(event.isAccepted()).toBe(true);
	});

	test("home moves value to minimum", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.setRange(20, 80);
		scrollBar.setValue(50);

		const event = new CKeyEvent(CEventType.KeyPress, "Home");
		scrollBar.event(event);

		expect(scrollBar.value()).toBe(20);
		expect(event.isAccepted()).toBe(true);
	});

	test("end moves value to maximum", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.setRange(20, 80);
		scrollBar.setValue(50);

		const event = new CKeyEvent(CEventType.KeyPress, "End");
		scrollBar.event(event);

		expect(scrollBar.value()).toBe(80);
		expect(event.isAccepted()).toBe(true);
	});

	test("ignores unsupported key", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.setValue(50);

		const event = new CKeyEvent(CEventType.KeyPress, "Enter");
		scrollBar.event(event);

		expect(scrollBar.value()).toBe(50);
		expect(event.isAccepted()).toBe(false);
	});

	test("clicking track before thumb pages backward", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.resize(300, 20);
		scrollBar.setValue(50);
		scrollBar.setPageStep(10);

		const x = scrollBar.thumbStart() - 5;

		scrollBar.event(new CMouseEvent(CEventType.MousePress, x, 10, CMouseButton.LeftButton));
		expect(scrollBar.value()).toBe(40);
	});

	test("clicking track after thumb pages forward", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.resize(300, 20);
		scrollBar.setValue(50);
		scrollBar.setPageStep(10);

		const x = scrollBar.thumbStart() + scrollBar.thumbLength() + 5;

		scrollBar.event(new CMouseEvent(CEventType.MousePress, x, 10, CMouseButton.LeftButton));
		expect(scrollBar.value()).toBe(60);
	});

	test("pressing thumb does not immediately change value", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.resize(300, 20);
		scrollBar.setValue(50);

		const x = scrollBar.thumbStart() + scrollBar.thumbLength() / 2;
		scrollBar.event(new CMouseEvent(CEventType.MousePress, x, 10, CMouseButton.LeftButton));
		expect(scrollBar.value()).toBe(50);
	});

	test("dragging thumb changes value", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.resize(300, 20);
		scrollBar.setValue(0);

		const pressX = scrollBar.thumbStart() + scrollBar.thumbLength() / 2;
		scrollBar.event(new CMouseEvent(CEventType.MousePress, pressX, 10, CMouseButton.LeftButton));

		const travel = scrollBar.trackLength() - scrollBar.thumbLength();
		scrollBar.event(new CMouseEvent(CEventType.MouseMove, pressX + travel / 2, 10, CMouseButton.NoButton));
		expect(scrollBar.value()).toBeCloseTo(50, 0);
	});

	test("dragging thumb past left edge clamps to minimum", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.resize(300, 20);
		scrollBar.setValue(50);

		const pressX = scrollBar.thumbStart() + scrollBar.thumbLength() / 2;

		scrollBar.event(new CMouseEvent(CEventType.MousePress, pressX, 10, CMouseButton.LeftButton));

		scrollBar.event(new CMouseEvent(CEventType.MouseMove, -100, 10, CMouseButton.NoButton));
		expect(scrollBar.value()).toBe(scrollBar.minimum());
	});

	test("dragging thumb past right edge clamps to maximum", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.resize(300, 20);
		scrollBar.setValue(50);

		const pressX = scrollBar.thumbStart() + scrollBar.thumbLength() / 2;
		scrollBar.event(new CMouseEvent(CEventType.MousePress, pressX, 10, CMouseButton.LeftButton));
		scrollBar.event(new CMouseEvent(CEventType.MouseMove, 500, 10, CMouseButton.NoButton));
		expect(scrollBar.value()).toBe(scrollBar.maximum());
	});

	test("mouse release finishes thumb dragging", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.resize(300, 20);
		scrollBar.setValue(0);

		const pressX = scrollBar.thumbStart() + scrollBar.thumbLength() / 2;
		scrollBar.event(new CMouseEvent(CEventType.MousePress, pressX, 10, CMouseButton.LeftButton));
		const release = new CMouseEvent(CEventType.MouseRelease, 200, 10, CMouseButton.LeftButton);

		scrollBar.event(release);

		const valueAfterRelease = scrollBar.value();

		scrollBar.event(new CMouseEvent(
			CEventType.MouseMove,
			250,
			10,
			CMouseButton.NoButton
		));

		expect(scrollBar.value()).toBe(valueAfterRelease);
		expect(release.isAccepted()).toBe(true);
	});

	test("mouse move without thumb press does not change value", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.resize(300, 20);
		scrollBar.setValue(50);

		const event = new CMouseEvent(CEventType.MouseMove, 200, 10, CMouseButton.NoButton);
		scrollBar.event(event);
		expect(scrollBar.value()).toBe(50);
		expect(event.isAccepted()).toBe(false);
	});

	test("ignores non-left mouse press", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.resize(300, 20);
		scrollBar.setValue(50);

		const event = new CMouseEvent(CEventType.MousePress, 10, 10, CMouseButton.RightButton);
		scrollBar.event(event);

		expect(scrollBar.value()).toBe(50);
		expect(event.isAccepted()).toBe(false);
	});

	test("valueChanged is emitted while dragging thumb", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.resize(300, 20);

		const slot = vi.fn();
		scrollBar.valueChanged.connect(slot);

		const pressX = scrollBar.thumbStart() + scrollBar.thumbLength() / 2;
		scrollBar.event(new CMouseEvent(CEventType.MousePress, pressX, 10, CMouseButton.LeftButton));
		scrollBar.event(new CMouseEvent(CEventType.MouseMove, 200, 10, CMouseButton.NoButton));
        
		expect(slot).toHaveBeenCalled();
	});

	test("vertical scrollbar uses vertical track geometry", () => {
		const scrollBar = new CScrollBar(COrientation.Vertical);
		scrollBar.setGeometry(0, 0, 20, 200);

		expect(scrollBar.buttonSize()).toBe(20);
		expect(scrollBar.trackStart()).toBe(20);
		expect(scrollBar.trackLength()).toBe(160);
	});

	test("vertical scrollbar thumb moves according to value", () => {
		const scrollBar = new CScrollBar(COrientation.Vertical);
		scrollBar.setGeometry(0, 0, 20, 200);
		scrollBar.setRange(0, 100);
		scrollBar.setValue(50);

		const travel = scrollBar.trackLength() - scrollBar.thumbLength();
		expect(scrollBar.thumbStart()).toBeCloseTo(
			scrollBar.trackStart() + travel / 2
		);
	});

	test("dragging vertical thumb changes value", () => {
		const scrollBar = new CScrollBar(COrientation.Vertical);
		scrollBar.setGeometry(0, 0, 20, 200);
		scrollBar.setRange(0, 100);
		scrollBar.setValue(0);

		const pressY = scrollBar.thumbStart() + scrollBar.thumbLength() / 2;
		scrollBar.event(new CMouseEvent(CEventType.MousePress, 10, pressY, CMouseButton.LeftButton));
		const travel = scrollBar.trackLength() - scrollBar.thumbLength();
		scrollBar.event(new CMouseEvent(CEventType.MouseMove, 10, pressY + travel / 2,
			CMouseButton.NoButton
		));

		expect(scrollBar.value()).toBeCloseTo(50, 0);
	});

	test("up and down keys control vertical scrollbar", () => {
		const scrollBar = new CScrollBar(COrientation.Vertical);
		scrollBar.setValue(50);
		scrollBar.setSingleStep(5);

		scrollBar.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowUp"
		));

		expect(scrollBar.value()).toBe(45);

		scrollBar.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowDown"
		));

		expect(scrollBar.value()).toBe(50);
	});
});