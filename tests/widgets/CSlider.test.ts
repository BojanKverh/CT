import {afterEach, beforeEach, describe, expect, test, vi} from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { CSlider } from "../../src/widgets/CSlider.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";
import { CMouseEvent, CMouseButton } from "../../src/events/CMouseEvent.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";

describe("CSlider", () => {
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
		const slider = new CSlider();

		expect(slider.minimum()).toBe(0);
	});

	test("has default maximum", () => {
		const slider = new CSlider();

		expect(slider.maximum()).toBe(100);
	});

	test("has default value", () => {
		const slider = new CSlider();

		expect(slider.value()).toBe(0);
	});

	test("sets value", () => {
		const slider = new CSlider();

		slider.setValue(42);

		expect(slider.value()).toBe(42);
	});

	test("clamps value to minimum", () => {
		const slider = new CSlider();

		slider.setValue(-10);

		expect(slider.value()).toBe(0);
	});

	test("clamps value to maximum", () => {
		const slider = new CSlider();

		slider.setValue(150);

		expect(slider.value()).toBe(100);
	});

	test("emits valueChanged when value changes", () => {
		const slider = new CSlider();
		const slot = vi.fn();

		slider.valueChanged.connect(slot);
		slider.setValue(42);

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith(42);
	});

	test("does not emit valueChanged when value is unchanged", () => {
		const slider = new CSlider();
		const slot = vi.fn();

		slider.setValue(42);
		slider.valueChanged.connect(slot);

		slider.setValue(42);

		expect(slot).not.toHaveBeenCalled();
	});

	test("sets range", () => {
		const slider = new CSlider();

		slider.setRange(10, 80);

		expect(slider.minimum()).toBe(10);
		expect(slider.maximum()).toBe(80);
	});

	test("clamps value when minimum increases above current value", () => {
		const slider = new CSlider();
		slider.setValue(20);

		slider.setRange(30, 100);

		expect(slider.value()).toBe(30);
	});

	test("clamps value when maximum decreases below current value", () => {
		const slider = new CSlider();
		slider.setValue(80);

		slider.setRange(0, 50);

		expect(slider.value()).toBe(50);
	});

	test("emits valueChanged when range clamps current value", () => {
		const slider = new CSlider();
		slider.setValue(20);

		const slot = vi.fn();
		slider.valueChanged.connect(slot);

		slider.setRange(30, 100);

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith(30);
	});

	test("does not emit valueChanged when range keeps current value valid", () => {
		const slider = new CSlider();
		slider.setValue(50);

		const slot = vi.fn();
		slider.valueChanged.connect(slot);

		slider.setRange(10, 90);

		expect(slot).not.toHaveBeenCalled();
		expect(slider.value()).toBe(50);
	});

	test("sets maximum to minimum when minimum is greater than maximum", () => {
		const slider = new CSlider();

		slider.setRange(80, 20);

		expect(slider.minimum()).toBe(80);
		expect(slider.maximum()).toBe(80);
		expect(slider.value()).toBe(80);
	});

	test("sets minimum", () => {
		const slider = new CSlider();

		slider.setMinimum(25);

		expect(slider.minimum()).toBe(25);
		expect(slider.maximum()).toBe(100);
	});

	test("sets maximum", () => {
		const slider = new CSlider();

		slider.setMaximum(75);

		expect(slider.minimum()).toBe(0);
		expect(slider.maximum()).toBe(75);
	});

	test("setting minimum clamps value", () => {
		const slider = new CSlider();
		slider.setValue(10);

		slider.setMinimum(20);

		expect(slider.value()).toBe(20);
	});

	test("setting maximum clamps value", () => {
		const slider = new CSlider();
		slider.setValue(90);

		slider.setMaximum(60);

		expect(slider.value()).toBe(60);
	});

	test("has default single step", () => {
		const slider = new CSlider();

		expect(slider.singleStep()).toBe(1);
	});

	test("sets single step", () => {
		const slider = new CSlider();

		slider.setSingleStep(5);

		expect(slider.singleStep()).toBe(5);
	});

	test("clamps negative single step to zero", () => {
		const slider = new CSlider();

		slider.setSingleStep(-5);

		expect(slider.singleStep()).toBe(0);
	});

	test("has default page step", () => {
		const slider = new CSlider();

		expect(slider.pageStep()).toBe(10);
	});

	test("sets page step", () => {
		const slider = new CSlider();

		slider.setPageStep(25);

		expect(slider.pageStep()).toBe(25);
	});

	test("clamps negative page step to zero", () => {
		const slider = new CSlider();

		slider.setPageStep(-10);

		expect(slider.pageStep()).toBe(0);
	});

	test("left arrow decreases value by single step", () => {
		const slider = new CSlider();
		slider.setValue(50);
		slider.setSingleStep(5);

		const event = new CKeyEvent(
			CEventType.KeyPress,
			"ArrowLeft"
		);

		slider.event(event);

		expect(slider.value()).toBe(45);
		expect(event.isAccepted()).toBe(true);
	});

	test("right arrow increases value by single step", () => {
		const slider = new CSlider();
		slider.setValue(50);
		slider.setSingleStep(5);

		const event = new CKeyEvent(
			CEventType.KeyPress,
			"ArrowRight"
		);

		slider.event(event);

		expect(slider.value()).toBe(55);
		expect(event.isAccepted()).toBe(true);
	});

	test("left arrow clamps to minimum", () => {
		const slider = new CSlider();
		slider.setRange(10, 100);
		slider.setValue(12);
		slider.setSingleStep(5);

		slider.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowLeft"
		));

		expect(slider.value()).toBe(10);
	});

	test("right arrow clamps to maximum", () => {
		const slider = new CSlider();
		slider.setRange(0, 90);
		slider.setValue(88);
		slider.setSingleStep(5);

		slider.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowRight"
		));

		expect(slider.value()).toBe(90);
	});

	test("page down increases value by page step", () => {
		const slider = new CSlider();
		slider.setValue(50);
		slider.setPageStep(20);

		const event = new CKeyEvent(
			CEventType.KeyPress,
			"PageDown"
		);

		slider.event(event);

		expect(slider.value()).toBe(70);
		expect(event.isAccepted()).toBe(true);
	});

	test("page up decreases value by page step", () => {
		const slider = new CSlider();
		slider.setValue(50);
		slider.setPageStep(20);

		const event = new CKeyEvent(
			CEventType.KeyPress,
			"PageUp"
		);

		slider.event(event);

		expect(slider.value()).toBe(30);
		expect(event.isAccepted()).toBe(true);
	});

	test("home moves value to minimum", () => {
		const slider = new CSlider();
		slider.setRange(20, 80);
		slider.setValue(50);

		const event = new CKeyEvent(
			CEventType.KeyPress,
			"Home"
		);

		slider.event(event);

		expect(slider.value()).toBe(20);
		expect(event.isAccepted()).toBe(true);
	});

	test("end moves value to maximum", () => {
		const slider = new CSlider();
		slider.setRange(20, 80);
		slider.setValue(50);

		const event = new CKeyEvent(
			CEventType.KeyPress,
			"End"
		);

		slider.event(event);

		expect(slider.value()).toBe(80);
		expect(event.isAccepted()).toBe(true);
	});

	test("ignores unsupported key", () => {
		const slider = new CSlider();
		slider.setValue(50);

		const event = new CKeyEvent(
			CEventType.KeyPress,
			"Enter"
		);

		slider.event(event);

		expect(slider.value()).toBe(50);
		expect(event.isAccepted()).toBe(false);
	});

	test("left mouse press changes value", () => {
		const slider = new CSlider();
		slider.resize(216, 30);

		const event = new CMouseEvent(
			CEventType.MousePress,
			108,
			15,
			CMouseButton.LeftButton
		);

		slider.event(event);

		expect(slider.value()).toBe(50);
		expect(event.isAccepted()).toBe(true);
	});

	test("mouse press near left edge sets minimum", () => {
		const slider = new CSlider();
		slider.resize(216, 30);
		slider.setValue(50);

		slider.event(new CMouseEvent(
			CEventType.MousePress,
			0,
			15,
			CMouseButton.LeftButton
		));

		expect(slider.value()).toBe(0);
	});

	test("mouse press near right edge sets maximum", () => {
		const slider = new CSlider();
		slider.resize(216, 30);

		slider.event(new CMouseEvent(
			CEventType.MousePress,
			216,
			15,
			CMouseButton.LeftButton
		));

		expect(slider.value()).toBe(100);
	});

	test("ignores non-left mouse press", () => {
		const slider = new CSlider();
		slider.resize(216, 30);
		slider.setValue(50);

		const event = new CMouseEvent(
			CEventType.MousePress,
			108,
			15,
			CMouseButton.RightButton
		);

		slider.event(event);

		expect(slider.value()).toBe(50);
		expect(event.isAccepted()).toBe(false);
	});

	test("dragging mouse changes value", () => {
		const slider = new CSlider();
		slider.resize(216, 30);

		slider.event(new CMouseEvent(
			CEventType.MousePress,
			8,
			15,
			CMouseButton.LeftButton
		));

		slider.event(new CMouseEvent(
			CEventType.MouseMove,
			108,
			15,
			CMouseButton.NoButton
		));

		expect(slider.value()).toBe(50);
	});

	test("dragging past left edge clamps to minimum", () => {
		const slider = new CSlider();
		slider.resize(216, 30);
		slider.setValue(50);

		slider.event(new CMouseEvent(
			CEventType.MousePress,
			108,
			15,
			CMouseButton.LeftButton
		));

		slider.event(new CMouseEvent(
			CEventType.MouseMove,
			-100,
			15,
			CMouseButton.NoButton
		));

		expect(slider.value()).toBe(0);
	});

	test("dragging past right edge clamps to maximum", () => {
		const slider = new CSlider();
		slider.resize(216, 30);

		slider.event(new CMouseEvent(
			CEventType.MousePress,
			108,
			15,
			CMouseButton.LeftButton
		));

		slider.event(new CMouseEvent(
			CEventType.MouseMove,
			500,
			15,
			CMouseButton.NoButton
		));

		expect(slider.value()).toBe(100);
	});

	test("mouse move without press does not change value", () => {
		const slider = new CSlider();
		slider.resize(216, 30);
		slider.setValue(25);

		const event = new CMouseEvent(
			CEventType.MouseMove,
			180,
			15,
			CMouseButton.NoButton
		);

		slider.event(event);

		expect(slider.value()).toBe(25);
		expect(event.isAccepted()).toBe(false);
	});

	test("left mouse release finishes dragging", () => {
		const slider = new CSlider();
		slider.resize(216, 30);

		slider.event(new CMouseEvent(
			CEventType.MousePress,
			8,
			15,
			CMouseButton.LeftButton
		));

		const release = new CMouseEvent(
			CEventType.MouseRelease,
			108,
			15,
			CMouseButton.LeftButton
		);

		slider.event(release);

		expect(slider.value()).toBe(50);
		expect(release.isAccepted()).toBe(true);

		slider.event(new CMouseEvent(
			CEventType.MouseMove,
			200,
			15,
			CMouseButton.NoButton
		));

		expect(slider.value()).toBe(50);
	});

	test("valueChanged is emitted while dragging", () => {
		const slider = new CSlider();
		slider.resize(216, 30);

		const slot = vi.fn();
		slider.valueChanged.connect(slot);

		slider.event(new CMouseEvent(
			CEventType.MousePress,
			8,
			15,
			CMouseButton.LeftButton
		));

		slider.event(new CMouseEvent(
			CEventType.MouseMove,
			108,
			15,
			CMouseButton.NoButton
		));

		expect(slot).toHaveBeenCalledWith(50);
	});
});