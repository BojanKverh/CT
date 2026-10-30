import { CFocusPolicy } from "../../src/gui/CFocusPolicy.js";
import { CLabel } from "../../src/widgets/CLabel.js";
import { CLineEdit } from "../../src/widgets/CLineEdit.js";
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
import { CDoubleValidator } from "../../src/util/CDoubleValidator.js";
import { CValidatorState } from "../../src/util/CValidator.js";

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
		spinBox.setRange(-100, 100);

		const editor = spinBox.lineEdit();
		editor.setText("");

		const validator = editor.validator() as CDoubleValidator;

		expect(validator.bottom()).toBe(-100);
		expect(validator.top()).toBe(100);
		expect(validator.validate("-")).toBe(CValidatorState.Intermediate);

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

 describe("focus proxy", () => {
  test("uses the line editor as its focus proxy", () => {
   const spin = new CDoubleSpinBox();
   expect(spin.focusProxy()).toBe(spin.lineEdit());
   expect(spin.focusPolicy()).toBe(CFocusPolicy.StrongFocus);
  });
  test("setFocus gives the editor actual focus and the spin box logical focus", () => {
   const spin = new CDoubleSpinBox(); spin.setFocus();
   expect(CApplication.instance().focusWidget()).toBe(spin.lineEdit());
   expect(spin.hasFocus()).toBe(true); expect(spin.lineEdit().hasFocus()).toBe(true);
  });
  test("focusing the editor also gives the spin box logical focus", () => {
   const spin = new CDoubleSpinBox(); spin.lineEdit().setFocus();
   expect(spin.hasFocus()).toBe(true);
   spin.clearFocus(); expect(CApplication.instance().focusWidget()).toBeNull();
  });
  test("focusing another field clears logical focus", () => {
   const spin = new CDoubleSpinBox(); const other = new CLineEdit();
   spin.setFocus(); other.setFocus(); expect(spin.hasFocus()).toBe(false);
  });
  test("focus policy changes propagate to the editor", () => {
   const spin = new CDoubleSpinBox(); spin.setFocus(); spin.setFocusPolicy(CFocusPolicy.NoFocus);
   expect(spin.lineEdit().focusPolicy()).toBe(CFocusPolicy.NoFocus);
   expect(spin.hasFocus()).toBe(false);
   spin.setFocusPolicy(CFocusPolicy.StrongFocus); spin.setFocus();
   expect(spin.lineEdit().hasFocus()).toBe(true);
  });
  test("hidden and disabled spin boxes cannot acquire editor focus", () => {
   const spin = new CDoubleSpinBox(); const other = new CLineEdit(); other.setFocus();
   spin.hide(); spin.setFocus(); expect(other.hasFocus()).toBe(true);
   spin.show(); spin.setEnabled(false); spin.setFocus(); expect(other.hasFocus()).toBe(true);
   spin.setEnabled(true); spin.setFocus(); expect(spin.lineEdit().hasFocus()).toBe(true);
  });
  test("Tab and Shift+Tab visit the spin box once and skip its arrow buttons", () => {
   const root = new CWidget(); const first = new CLineEdit(root);
   const spin = new CDoubleSpinBox(root); const last = new CLineEdit(root);
   const app = CApplication.instance(); first.setFocus();
   for (const target of [spin.lineEdit(), last, first]) {
    expect(app.focusNextWidget()).toBe(true); expect(app.focusWidget()).toBe(target);
   }
   for (const target of [last, spin.lineEdit(), first]) {
    expect(app.focusNextWidget(false)).toBe(true); expect(app.focusWidget()).toBe(target);
   }
  });
  test("custom Tab order addresses the complete spin box", () => {
   const root = new CWidget(); const first = new CLineEdit(root);
   const spin = new CDoubleSpinBox(root); const last = new CLineEdit(root);
   CWidget.setTabOrder(first, last); CWidget.setTabOrder(last, spin);
   const app = CApplication.instance(); first.setFocus();
   app.focusNextWidget(); expect(app.focusWidget()).toBe(last);
   app.focusNextWidget(); expect(app.focusWidget()).toBe(spin.lineEdit());
   app.focusNextWidget(); expect(app.focusWidget()).toBe(first);
  });
  test("a label buddy focuses the embedded editor", () => {
   const root = new CWidget(); const spin = new CDoubleSpinBox(root); const label = new CLabel(root);
   label.setText("&Value"); label.setBuddy(spin);
   expect(label.activateBuddy()).toBe(true);
   expect(CApplication.instance().focusWidget()).toBe(spin.lineEdit());
   expect(spin.hasFocus()).toBe(true);
  });
  test("leaving by Tab commits edited text once", () => {
   const root = new CWidget(); const spin = new CDoubleSpinBox(root); const next = new CLineEdit(root);
   const changed = vi.fn(); spin.valueChanged.connect(changed);
   spin.setFocus(); spin.lineEdit().setText("42.25");
   CApplication.instance().focusNextWidget();
   expect(next.hasFocus()).toBe(true); expect(spin.hasFocus()).toBe(false);
   expect(spin.value()).toBe(42.25); expect(changed).toHaveBeenCalledOnce();
  });
  test("reparenting the complete spin box preserves its proxy", () => {
   const spin = new CDoubleSpinBox(); const root = new CWidget(); spin.setParent(root); spin.setFocus();
   expect(spin.focusProxy()).toBe(spin.lineEdit()); expect(spin.lineEdit().hasFocus()).toBe(true);
  });
  test("destroying a focused spin box clears actual focus", () => {
   const spin = new CDoubleSpinBox(); spin.setFocus(); spin.destroy();
   expect(CApplication.instance().focusWidget()).toBeNull();
  });
 });
});
