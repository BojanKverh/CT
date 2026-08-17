import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CSpinBox } from "../../src/widgets/CSpinBox.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CFocusEvent } from "../../src/events/CFocusEvent.js";
import { CLineEdit } from "../../src/index.js";

describe("CProgressBar", () => {
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
		const spinBox = new CSpinBox();

		expect(spinBox.minimum()).toBe(0);
	});

	test("has default maximum", () => {
		const spinBox = new CSpinBox();

		expect(spinBox.maximum()).toBe(100);
	});

	test("has default value", () => {
		const spinBox = new CSpinBox();

		expect(spinBox.value()).toBe(0);
	});

	test("has default single step", () => {
		const spinBox = new CSpinBox();

		expect(spinBox.singleStep()).toBe(1);
	});

	test("sets value", () => {
		const spinBox = new CSpinBox();

		spinBox.setValue(42);

		expect(spinBox.value()).toBe(42);
	});

	test("clamps value to minimum", () => {
		const spinBox = new CSpinBox();

		spinBox.setValue(-10);

		expect(spinBox.value()).toBe(0);
	});

	test("clamps value to maximum", () => {
		const spinBox = new CSpinBox();

		spinBox.setValue(150);

		expect(spinBox.value()).toBe(100);
	});

	test("sets range", () => {
		const spinBox = new CSpinBox();

		spinBox.setRange(-20, 50);

		expect(spinBox.minimum()).toBe(-20);
		expect(spinBox.maximum()).toBe(50);
	});

	test("clamps value when minimum increases above current value", () => {
		const spinBox = new CSpinBox();
		spinBox.setValue(10);

		spinBox.setRange(20, 100);

		expect(spinBox.value()).toBe(20);
	});

	test("clamps value when maximum decreases below current value", () => {
		const spinBox = new CSpinBox();
		spinBox.setValue(80);

		spinBox.setRange(0, 50);

		expect(spinBox.value()).toBe(50);
	});

	test("keeps value when new range contains current value", () => {
		const spinBox = new CSpinBox();
		spinBox.setValue(40);

		spinBox.setRange(20, 80);

		expect(spinBox.value()).toBe(40);
	});

	test("sets maximum to minimum when minimum is greater than maximum", () => {
		const spinBox = new CSpinBox();

		spinBox.setRange(80, 20);

		expect(spinBox.minimum()).toBe(80);
		expect(spinBox.maximum()).toBe(80);
		expect(spinBox.value()).toBe(80);
	});

	test("sets minimum", () => {
		const spinBox = new CSpinBox();

		spinBox.setMinimum(20);

		expect(spinBox.minimum()).toBe(20);
		expect(spinBox.maximum()).toBe(100);
	});

	test("sets maximum", () => {
		const spinBox = new CSpinBox();

		spinBox.setMaximum(50);

		expect(spinBox.minimum()).toBe(0);
		expect(spinBox.maximum()).toBe(50);
	});

	test("sets single step", () => {
		const spinBox = new CSpinBox();

		spinBox.setSingleStep(5);

		expect(spinBox.singleStep()).toBe(5);
	});

	test("clamps negative single step to zero", () => {
		const spinBox = new CSpinBox();

		spinBox.setSingleStep(-5);

		expect(spinBox.singleStep()).toBe(0);
	});

	test("steps up by single step", () => {
		const spinBox = new CSpinBox();
		spinBox.setValue(20);
		spinBox.setSingleStep(5);

		spinBox.stepUp();

		expect(spinBox.value()).toBe(25);
	});

	test("steps down by single step", () => {
		const spinBox = new CSpinBox();
		spinBox.setValue(20);
		spinBox.setSingleStep(5);

		spinBox.stepDown();

		expect(spinBox.value()).toBe(15);
	});

	test("step up clamps to maximum", () => {
		const spinBox = new CSpinBox();
		spinBox.setValue(97);
		spinBox.setSingleStep(5);

		spinBox.stepUp();

		expect(spinBox.value()).toBe(100);
	});

	test("step down clamps to minimum", () => {
		const spinBox = new CSpinBox();
		spinBox.setValue(2);
		spinBox.setSingleStep(5);

		spinBox.stepDown();

		expect(spinBox.value()).toBe(0);
	});

	test("emits valueChanged when value changes", () => {
		const spinBox = new CSpinBox();
		const slot = vi.fn();

		spinBox.valueChanged.connect(slot);

		spinBox.setValue(42);

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith(42);
	});

	test("does not emit valueChanged when value is unchanged", () => {
		const spinBox = new CSpinBox();
		spinBox.setValue(42);

		const slot = vi.fn();
		spinBox.valueChanged.connect(slot);

		spinBox.setValue(42);

		expect(slot).not.toHaveBeenCalled();
	});

	test("emits clamped value when setting value above maximum", () => {
		const spinBox = new CSpinBox();
		const slot = vi.fn();

		spinBox.valueChanged.connect(slot);

		spinBox.setValue(500);

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith(100);
	});

	test("stores parent from constructor", () => {
		const parent = new CWidget();
		const spinBox = new CSpinBox(parent);

		expect(spinBox.parent()).toBe(parent);
	});

	test("arrow up increases value by single step", () => {
		const spinBox = new CSpinBox();
		spinBox.setValue(20);
		spinBox.setSingleStep(5);
		spinBox.event(new CKeyEvent(CEventType.KeyPress, "ArrowUp"));
		expect(spinBox.value()).toBe(25);
	});

	test("arrow down decreases value by single step", () => {
		const spinBox = new CSpinBox();
		spinBox.setValue(20);
		spinBox.setSingleStep(5);
		spinBox.event(new CKeyEvent(CEventType.KeyPress, "ArrowDown"));
		expect(spinBox.value()).toBe(15);
	});

	test("arrow up clamps to maximum", () => {
		const spinBox = new CSpinBox();
		spinBox.setValue(98);
		spinBox.setSingleStep(5);
		spinBox.event(new CKeyEvent(CEventType.KeyPress, "ArrowUp"));
		expect(spinBox.value()).toBe(100);
	});

	test("arrow down clamps to minimum", () => {
		const spinBox = new CSpinBox();
		spinBox.setValue(2);
		spinBox.setSingleStep(5);
		spinBox.event(new CKeyEvent(CEventType.KeyPress, "ArrowDown"));
		expect(spinBox.value()).toBe(0);
	});

	test("accepts arrow up key", () => {
		const spinBox = new CSpinBox();
		const event = new CKeyEvent(CEventType.KeyPress, "ArrowUp");
		spinBox.event(event);
		expect(event.isAccepted()).toBe(true);
	});

	test("accepts arrow down key", () => {
		const spinBox = new CSpinBox();
		const event = new CKeyEvent(CEventType.KeyPress, "ArrowDown");
		spinBox.event(event);
		expect(event.isAccepted()).toBe(true);
	});

	test("ignores unsupported key", () => {
		const spinBox = new CSpinBox();
		spinBox.setValue(20);
		const event = new CKeyEvent(CEventType.KeyPress, "Escape");

		spinBox.event(event);

		expect(spinBox.value()).toBe(20);
		expect(event.isAccepted()).toBe(false);
	});

	test("editing text does not change value until committed", () => {
		const spinBox = new CSpinBox();
		spinBox.setValue(30);

		spinBox.lineEdit().setText("57");

		expect(spinBox.value()).toBe(30);
	});

	test("enter commits editor value", () => {
		const spinBox = new CSpinBox();
		spinBox.setValue(30);
		spinBox.lineEdit().setText("57");
		spinBox.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
		expect(spinBox.value()).toBe(57);
		expect(spinBox.lineEdit().text()).toBe("57");
	});

	test("enter clamps editor value to maximum", () => {
		const spinBox = new CSpinBox();
		spinBox.setRange(0, 100);
		spinBox.setValue(30);
		spinBox.lineEdit().setText("999");
		spinBox.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
		expect(spinBox.value()).toBe(100);
		expect(spinBox.lineEdit().text()).toBe("100");
	});

	test("enter clamps editor value to minimum", () => {
		const spinBox = new CSpinBox();
		spinBox.setRange(20, 100);
		spinBox.setValue(50);
		spinBox.lineEdit().setText("5");
		spinBox.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
		expect(spinBox.value()).toBe(20);
		expect(spinBox.lineEdit().text()).toBe("20");
	});

	test("invalid editor text restores current value on enter", () => {
		const spinBox = new CSpinBox();
		spinBox.setValue(42);
		spinBox.lineEdit().setText("abc");
		spinBox.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
		expect(spinBox.value()).toBe(42);
		expect(spinBox.lineEdit().text()).toBe("42");
	});

	test("enter emits valueChanged once when value changes", () => {
		const spinBox = new CSpinBox();
		spinBox.setValue(30);
		spinBox.lineEdit().setText("57");
		const slot = vi.fn();
		spinBox.valueChanged.connect(slot);
		spinBox.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith(57);
	});

	test("resizing spin box updates child geometry", () => {
		const spinBox = new CSpinBox();
		spinBox.setGeometry(10, 20, 140, 30);
		const editor = spinBox.lineEdit();

		expect(editor.x()).toBe(0);
		expect(editor.y()).toBe(0);
		expect(editor.width()).toBe(120);
		expect(editor.height()).toBe(30);
	});

	test("focus out commits editor value", () => {
		const spinBox = new CSpinBox();
		spinBox.setValue(30);
		spinBox.lineEdit().setText("57");

		spinBox.lineEdit().event(
			new CFocusEvent(CEventType.FocusOut)
		);

		expect(spinBox.value()).toBe(57);
		expect(spinBox.lineEdit().text()).toBe("57");
	});

	test("focus out clamps editor value", () => {
		const spinBox = new CSpinBox();
		spinBox.setRange(0, 100);
		spinBox.setValue(30);
		spinBox.lineEdit().setText("999");

		spinBox.lineEdit().event(
			new CFocusEvent(CEventType.FocusOut)
		);

		expect(spinBox.value()).toBe(100);
		expect(spinBox.lineEdit().text()).toBe("100");
	});

	test("focus out restores current value for invalid text", () => {
		const spinBox = new CSpinBox();
		spinBox.setValue(42);
		spinBox.lineEdit().setText("abc");

		spinBox.lineEdit().event(
			new CFocusEvent(CEventType.FocusOut)
		);

		expect(spinBox.value()).toBe(42);
		expect(spinBox.lineEdit().text()).toBe("42");
	});

	test("validator can allow negative integer input", () => {
		const edit = new CLineEdit();

		edit.setValidator(text => /^-?\d*$/.test(text));

		edit.insert("-");
		edit.insert("42");

		expect(edit.text()).toBe("-42");
	});

	test("validator rejects letters in numeric input", () => {
		const edit = new CLineEdit();

		edit.setValidator(text => /^-?\d*$/.test(text));

		edit.insert("12");
		edit.insert("a");

		expect(edit.text()).toBe("12");
	});
});
