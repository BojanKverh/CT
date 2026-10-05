import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CFocusEvent } from "../../src/events/CFocusEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CWheelEvent } from "../../src/events/CWheelEvent.js";
import { CDoubleSpinBox } from "../../src/widgets/CDoubleSpinBox.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";

describe("CDoubleSpinBox", () => {
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

	test("has expected defaults", () => {
		const spinBox = new CDoubleSpinBox();

		expect(spinBox.minimum()).toBe(0);
		expect(spinBox.maximum()).toBe(99.99);
		expect(spinBox.value()).toBe(0);
		expect(spinBox.singleStep()).toBe(1);
		expect(spinBox.decimals()).toBe(2);
		expect(spinBox.lineEdit().text()).toBe("0.00");
	});

	test("stores parent from constructor", () => {
		const parent = new CWidget();
		const spinBox = new CDoubleSpinBox(parent);

		expect(spinBox.parent()).toBe(parent);
	});

	test("sets and formats value", () => {
		const spinBox = new CDoubleSpinBox();

		spinBox.setValue(12.5);

		expect(spinBox.value()).toBe(12.5);
		expect(spinBox.lineEdit().text()).toBe("12.50");
	});

	test("rounds value to configured decimals", () => {
		const spinBox = new CDoubleSpinBox();

		spinBox.setValue(12.345);

		expect(spinBox.value()).toBe(12.35);
		expect(spinBox.lineEdit().text()).toBe("12.35");
	});

	test("clamps value to range", () => {
		const spinBox = new CDoubleSpinBox();
		spinBox.setRange(-10.5, 20.25);

		spinBox.setValue(-50);
		expect(spinBox.value()).toBe(-10.5);

		spinBox.setValue(50);
		expect(spinBox.value()).toBe(20.25);
	});

	test("sets minimum and maximum", () => {
		const spinBox = new CDoubleSpinBox();

		spinBox.setMinimum(-5.25);
		spinBox.setMaximum(42.75);

		expect(spinBox.minimum()).toBe(-5.25);
		expect(spinBox.maximum()).toBe(42.75);
	});

	test("sets maximum to minimum for an inverted range", () => {
		const spinBox = new CDoubleSpinBox();

		spinBox.setRange(8.5, 2.5);

		expect(spinBox.minimum()).toBe(8.5);
		expect(spinBox.maximum()).toBe(8.5);
		expect(spinBox.value()).toBe(8.5);
	});

	test("rounds range endpoints to configured decimals", () => {
		const spinBox = new CDoubleSpinBox();

		spinBox.setRange(-1.236, 8.765);

		expect(spinBox.minimum()).toBe(-1.24);
		expect(spinBox.maximum()).toBe(8.77);
	});

	test("ignores non-finite values and ranges", () => {
		const spinBox = new CDoubleSpinBox();
		spinBox.setValue(10.5);

		spinBox.setValue(Number.NaN);
		spinBox.setValue(Number.POSITIVE_INFINITY);
		spinBox.setRange(Number.NEGATIVE_INFINITY, 50);

		expect(spinBox.value()).toBe(10.5);
		expect(spinBox.minimum()).toBe(0);
		expect(spinBox.maximum()).toBe(99.99);
	});

	test("sets decimals and reformats value", () => {
		const spinBox = new CDoubleSpinBox();
		spinBox.setValue(12.34);

		spinBox.setDecimals(3);

		expect(spinBox.decimals()).toBe(3);
		expect(spinBox.value()).toBe(12.34);
		expect(spinBox.lineEdit().text()).toBe("12.340");
	});

	test("reducing decimals rounds the current value", () => {
		const spinBox = new CDoubleSpinBox();
		spinBox.setValue(12.36);

		spinBox.setDecimals(1);

		expect(spinBox.value()).toBe(12.4);
		expect(spinBox.lineEdit().text()).toBe("12.4");
	});

	test("clamps decimals to the supported range", () => {
		const spinBox = new CDoubleSpinBox();

		spinBox.setDecimals(-5);
		expect(spinBox.decimals()).toBe(0);

		spinBox.setDecimals(500);
		expect(spinBox.decimals()).toBe(100);
	});

	test("ignores non-finite decimals", () => {
		const spinBox = new CDoubleSpinBox();

		spinBox.setDecimals(Number.NaN);

		expect(spinBox.decimals()).toBe(2);
	});

	test("emits valueChanged when value changes", () => {
		const spinBox = new CDoubleSpinBox();
		const slot = vi.fn();
		spinBox.valueChanged.connect(slot);

		spinBox.setValue(4.25);

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith(4.25);
	});

	test("does not emit when rounded value is unchanged", () => {
		const spinBox = new CDoubleSpinBox();
		spinBox.setValue(4.25);
		const slot = vi.fn();
		spinBox.valueChanged.connect(slot);

		spinBox.setValue(4.251);

		expect(slot).not.toHaveBeenCalled();
	});

	test("changing decimals emits when it changes the value", () => {
		const spinBox = new CDoubleSpinBox();
		spinBox.setValue(4.26);
		const slot = vi.fn();
		spinBox.valueChanged.connect(slot);

		spinBox.setDecimals(1);

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith(4.3);
	});

	test("steps without floating-point drift", () => {
		const spinBox = new CDoubleSpinBox();
		spinBox.setSingleStep(0.1);

		spinBox.stepUp();
		spinBox.stepUp();
		spinBox.stepUp();

		expect(spinBox.value()).toBe(0.3);
		expect(spinBox.lineEdit().text()).toBe("0.30");
	});

	test("step down supports negative decimal values", () => {
		const spinBox = new CDoubleSpinBox();
		spinBox.setRange(-10, 10);
		spinBox.setSingleStep(0.25);

		spinBox.stepDown();

		expect(spinBox.value()).toBe(-0.25);
	});

	test("clamps negative single step to zero", () => {
		const spinBox = new CDoubleSpinBox();

		spinBox.setSingleStep(-0.5);

		expect(spinBox.singleStep()).toBe(0);
	});

	test("arrow keys step and are accepted", () => {
		const spinBox = new CDoubleSpinBox();
		spinBox.setSingleStep(0.25);
		const up = new CKeyEvent(CEventType.KeyPress, "ArrowUp");
		const down = new CKeyEvent(CEventType.KeyPress, "ArrowDown");

		spinBox.event(up);
		spinBox.event(down);

		expect(spinBox.value()).toBe(0);
		expect(up.isAccepted()).toBe(true);
		expect(down.isAccepted()).toBe(true);
	});

	test("ignores unsupported key", () => {
		const spinBox = new CDoubleSpinBox();
		const event = new CKeyEvent(CEventType.KeyPress, "Escape");

		spinBox.event(event);

		expect(event.isAccepted()).toBe(false);
	});

	test("editing text does not change value until committed", () => {
		const spinBox = new CDoubleSpinBox();
		spinBox.setValue(3.5);

		spinBox.lineEdit().setText("7.25");

		expect(spinBox.value()).toBe(3.5);
	});

	test("enter commits and formats decimal editor value", () => {
		const spinBox = new CDoubleSpinBox();
		spinBox.lineEdit().setText("7.2");

		spinBox.event(new CKeyEvent(CEventType.KeyPress, "Enter"));

		expect(spinBox.value()).toBe(7.2);
		expect(spinBox.lineEdit().text()).toBe("7.20");
	});

	test("enter clamps editor value", () => {
		const spinBox = new CDoubleSpinBox();
		spinBox.setRange(-2.5, 4.75);
		spinBox.lineEdit().setText("20.5");

		spinBox.event(new CKeyEvent(CEventType.KeyPress, "Enter"));

		expect(spinBox.value()).toBe(4.75);
		expect(spinBox.lineEdit().text()).toBe("4.75");
	});

	test("invalid editor text restores current formatted value", () => {
		const spinBox = new CDoubleSpinBox();
		spinBox.setValue(4.5);
		spinBox.lineEdit().setText("abc");

		spinBox.event(new CKeyEvent(CEventType.KeyPress, "Enter"));

		expect(spinBox.value()).toBe(4.5);
		expect(spinBox.lineEdit().text()).toBe("4.50");
	});

	test("focus out commits editor value", () => {
		const spinBox = new CDoubleSpinBox();
		spinBox.lineEdit().setText("8.125");

		spinBox.lineEdit().event(new CFocusEvent(CEventType.FocusOut));

		expect(spinBox.value()).toBe(8.13);
		expect(spinBox.lineEdit().text()).toBe("8.13");
	});

	test("line editor accepts decimal input and rejects letters", () => {
		const spinBox = new CDoubleSpinBox();
		const editor = spinBox.lineEdit();
		editor.setText("");

		editor.insert("-12.5");
		editor.insert("a");

		expect(editor.text()).toBe("-12.5");
	});

	test("line editor rejects digits beyond configured decimals", () => {
		const spinBox = new CDoubleSpinBox();
		const editor = spinBox.lineEdit();
		editor.setText("");

		editor.insert("12.34");
		editor.insert("5");

		expect(editor.text()).toBe("12.34");
	});

	test("changing decimals changes the editor input limit", () => {
		const spinBox = new CDoubleSpinBox();
		const editor = spinBox.lineEdit();
		spinBox.setDecimals(3);
		editor.setText("");

		editor.insert("1.234");
		editor.insert("5");

		expect(editor.text()).toBe("1.234");
	});

	test("zero decimals rejects the decimal point", () => {
		const spinBox = new CDoubleSpinBox();
		const editor = spinBox.lineEdit();
		spinBox.setDecimals(0);
		editor.setText("");

		editor.insert("12");
		editor.insert(".");

		expect(editor.text()).toBe("12");
	});

	test("line editor accepts intermediate negative decimal input", () => {
		const spinBox = new CDoubleSpinBox();
		const editor = spinBox.lineEdit();
		editor.setText("");

		editor.insert("-");
		editor.insert(".");
		editor.insert("5");

		expect(editor.text()).toBe("-.5");
	});

	test("resizing updates editor geometry", () => {
		const spinBox = new CDoubleSpinBox();

		spinBox.setGeometry(10, 20, 140, 30);

		expect(spinBox.lineEdit().x()).toBe(0);
		expect(spinBox.lineEdit().y()).toBe(0);
		expect(spinBox.lineEdit().width()).toBe(120);
		expect(spinBox.lineEdit().height()).toBe(30);
	});

	test("mouse wheel changes value", () => {
		const spinBox = new CDoubleSpinBox();
		spinBox.setRange(-10, 10);
		spinBox.setSingleStep(0.25);

		spinBox.event(new CWheelEvent(0, -120));
		expect(spinBox.value()).toBe(0.25);

		spinBox.event(new CWheelEvent(0, 120));
		expect(spinBox.value()).toBe(0);
	});
});
