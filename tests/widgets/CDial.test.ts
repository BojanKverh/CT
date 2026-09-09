import { beforeEach, afterEach, describe, expect, test } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CDial } from "../../src/widgets/CDial.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";


describe("CDial", () => {

	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});


	test("has default range and value", () => {
		const dial = new CDial();

		expect(dial.minimum()).toBe(0);
		expect(dial.maximum()).toBe(100);
		expect(dial.value()).toBe(0);
	});


	test("has default step values", () => {
		const dial = new CDial();

		expect(dial.singleStep()).toBe(1);
		expect(dial.pageStep()).toBe(10);
	});


	test("setValue changes value", () => {
		const dial = new CDial();

		dial.setValue(42);

		expect(dial.value()).toBe(42);
	});


	test("setValue clamps to minimum", () => {
		const dial = new CDial();

		dial.setRange(10, 100);
		dial.setValue(-50);

		expect(dial.value()).toBe(10);
	});


	test("setValue clamps to maximum", () => {
		const dial = new CDial();

		dial.setRange(0, 100);
		dial.setValue(150);

		expect(dial.value()).toBe(100);
	});


	test("setRange changes minimum and maximum", () => {
		const dial = new CDial();

		dial.setRange(-50, 200);

		expect(dial.minimum()).toBe(-50);
		expect(dial.maximum()).toBe(200);
	});


	test("setRange clamps current value", () => {
		const dial = new CDial();

		dial.setValue(80);
		dial.setRange(0, 50);

		expect(dial.value()).toBe(50);
	});


	test("setRange makes maximum equal minimum when minimum is greater", () => {
		const dial = new CDial();

		dial.setRange(100, 20);

		expect(dial.minimum()).toBe(100);
		expect(dial.maximum()).toBe(100);
		expect(dial.value()).toBe(100);
	});


	test("setMinimum changes minimum", () => {
		const dial = new CDial();

		dial.setMinimum(20);

		expect(dial.minimum()).toBe(20);
	});


	test("setMaximum changes maximum", () => {
		const dial = new CDial();

		dial.setMaximum(200);

		expect(dial.maximum()).toBe(200);
	});


	test("valueChanged is emitted when value changes", () => {
		const dial = new CDial();

		let emittedValue: number | null = null;

		dial.valueChanged.connect(value => {
			emittedValue = value;
		});

		dial.setValue(37);

		expect(emittedValue).toBe(37);
	});


	test("valueChanged is not emitted when value does not change", () => {
		const dial = new CDial();

		let count = 0;

		dial.valueChanged.connect(() => {
			++count;
		});

		dial.setValue(20);
		dial.setValue(20);

		expect(count).toBe(1);
	});


	test("setSingleStep changes single step", () => {
		const dial = new CDial();

		dial.setSingleStep(5);

		expect(dial.singleStep()).toBe(5);
	});


	test("negative single step is clamped to zero", () => {
		const dial = new CDial();

		dial.setSingleStep(-5);

		expect(dial.singleStep()).toBe(0);
	});


	test("setPageStep changes page step", () => {
		const dial = new CDial();

		dial.setPageStep(25);

		expect(dial.pageStep()).toBe(25);
	});


	test("negative page step is clamped to zero", () => {
		const dial = new CDial();

		dial.setPageStep(-10);

		expect(dial.pageStep()).toBe(0);
	});


	test("ArrowRight increases value by singleStep", () => {
		const dial = new CDial();

		dial.setValue(50);
		dial.setSingleStep(5);

		dial.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowRight"
		));

		expect(dial.value()).toBe(55);
	});


	test("ArrowUp increases value by singleStep", () => {
		const dial = new CDial();

		dial.setValue(50);
		dial.setSingleStep(5);

		dial.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowUp"
		));

		expect(dial.value()).toBe(55);
	});


	test("ArrowLeft decreases value by singleStep", () => {
		const dial = new CDial();

		dial.setValue(50);
		dial.setSingleStep(5);

		dial.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowLeft"
		));

		expect(dial.value()).toBe(45);
	});


	test("ArrowDown decreases value by singleStep", () => {
		const dial = new CDial();

		dial.setValue(50);
		dial.setSingleStep(5);

		dial.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowDown"
		));

		expect(dial.value()).toBe(45);
	});


	test("PageUp increases value by pageStep", () => {
		const dial = new CDial();

		dial.setValue(50);
		dial.setPageStep(20);

		dial.event(new CKeyEvent(
			CEventType.KeyPress,
			"PageUp"
		));

		expect(dial.value()).toBe(70);
	});


	test("PageDown decreases value by pageStep", () => {
		const dial = new CDial();

		dial.setValue(50);
		dial.setPageStep(20);

		dial.event(new CKeyEvent(
			CEventType.KeyPress,
			"PageDown"
		));

		expect(dial.value()).toBe(30);
	});


	test("Home sets minimum value", () => {
		const dial = new CDial();

		dial.setRange(10, 200);
		dial.setValue(100);

		dial.event(new CKeyEvent(
			CEventType.KeyPress,
			"Home"
		));

		expect(dial.value()).toBe(10);
	});


	test("End sets maximum value", () => {
		const dial = new CDial();

		dial.setRange(10, 200);
		dial.setValue(100);

		dial.event(new CKeyEvent(
			CEventType.KeyPress,
			"End"
		));

		expect(dial.value()).toBe(200);
	});


	test("mouse press at start angle sets minimum", () => {
		const dial = new CDial();

		dial.setGeometry(0, 0, 100, 100);
		dial.setRange(0, 100);
		dial.setValue(50);

		const radius = 40;
		const angle = 135 * Math.PI / 180;

		const x = 50 + Math.cos(angle) * radius;
		const y = 50 + Math.sin(angle) * radius;

		dial.event(new CMouseEvent(
			CEventType.MousePress,
			x,
			y,
			CMouseButton.LeftButton
		));

		expect(dial.value()).toBe(0);
	});


	test("mouse press at middle angle sets middle value", () => {
		const dial = new CDial();

		dial.setGeometry(0, 0, 100, 100);
		dial.setRange(0, 100);

		// 135° + 270° / 2 = 270°.
		const radius = 40;
		const angle = 270 * Math.PI / 180;

		const x = 50 + Math.cos(angle) * radius;
		const y = 50 + Math.sin(angle) * radius;

		dial.event(new CMouseEvent(
			CEventType.MousePress,
			x,
			y,
			CMouseButton.LeftButton
		));

		expect(dial.value()).toBe(50);
	});


	test("mouse press at end angle sets maximum", () => {
		const dial = new CDial();

		dial.setGeometry(0, 0, 100, 100);
		dial.setRange(0, 100);

		// 135° + 270° = 405° = 45°.
		const radius = 40;
		const angle = 45 * Math.PI / 180;

		const x = 50 + Math.cos(angle) * radius;
		const y = 50 + Math.sin(angle) * radius;

		dial.event(new CMouseEvent(
			CEventType.MousePress,
			x,
			y,
			CMouseButton.LeftButton
		));

		expect(dial.value()).toBe(100);
	});


	test("mouse drag changes value", () => {
		const dial = new CDial();

		dial.setGeometry(0, 0, 100, 100);
		dial.setRange(0, 100);

		dial.event(new CMouseEvent(
			CEventType.MousePress,
			50,
			90,
			CMouseButton.LeftButton
		));

		// Top of dial = middle of active 270 degree range.
		dial.event(new CMouseEvent(
			CEventType.MouseMove,
			50,
			10,
			CMouseButton.LeftButton
		));

		expect(dial.value()).toBe(50);
	});


	test("mouse move without press does not change value", () => {
		const dial = new CDial();

		dial.setGeometry(0, 0, 100, 100);
		dial.setValue(25);

		dial.event(new CMouseEvent(
			CEventType.MouseMove,
			50,
			10,
			CMouseButton.LeftButton
		));

		expect(dial.value()).toBe(25);
	});


	test("clicking center keeps current value", () => {
		const dial = new CDial();

		dial.setGeometry(0, 0, 100, 100);
		dial.setValue(42);

		dial.event(new CMouseEvent(
			CEventType.MousePress,
			50,
			50,
			CMouseButton.LeftButton
		));

		expect(dial.value()).toBe(42);
	});


	test("zero range remains at minimum", () => {
		const dial = new CDial();

		dial.setGeometry(0, 0, 100, 100);
		dial.setRange(50, 50);

		dial.event(new CMouseEvent(
			CEventType.MousePress,
			50,
			10,
			CMouseButton.LeftButton
		));

		expect(dial.value()).toBe(50);
	});
});