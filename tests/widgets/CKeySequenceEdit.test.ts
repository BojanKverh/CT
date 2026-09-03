import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CFocusEvent } from "../../src/events/CFocusEvent.js";
import { CKeySequenceEdit } from "../../src/widgets/CKeySequenceEdit.js";
import { CFocusPolicy } from "../../src/gui/CFocusPolicy.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CKeySequenceEdit", () => {
	let app: CApplication;

	beforeEach(() => {
            new CApplication(createTestCanvas());
        });
    
    afterEach(() => {
        if (CApplication.exists())
            CApplication.instance().destroy();
    });

	test("starts with an empty key sequence", () => {
		const edit = new CKeySequenceEdit();

		expect(edit.keySequence()).toBe("");
	});

	test("has strong focus policy", () => {
		const edit = new CKeySequenceEdit();

		expect(edit.focusPolicy()).toBe(CFocusPolicy.StrongFocus);
	});

	test("setKeySequence sets the key sequence", () => {
		const edit = new CKeySequenceEdit();

		edit.setKeySequence("Ctrl+S");

		expect(edit.keySequence()).toBe("Ctrl+S");
	});

	test("setKeySequence emits keySequenceChanged", () => {
		const edit = new CKeySequenceEdit();
		const spy = vi.fn();

		edit.keySequenceChanged.connect(spy);
		edit.setKeySequence("Ctrl+S");

		expect(spy).toHaveBeenCalledOnce();
		expect(spy).toHaveBeenCalledWith("Ctrl+S");
	});

	test("setKeySequence does not emit when sequence is unchanged", () => {
		const edit = new CKeySequenceEdit();
		const spy = vi.fn();

		edit.setKeySequence("Ctrl+S");
		edit.keySequenceChanged.connect(spy);
		edit.setKeySequence("Ctrl+S");

		expect(spy).not.toHaveBeenCalled();
	});

	test("clear clears the key sequence", () => {
		const edit = new CKeySequenceEdit();

		edit.setKeySequence("Ctrl+S");
		edit.clear();

		expect(edit.keySequence()).toBe("");
	});

	test("clear emits keySequenceChanged", () => {
		const edit = new CKeySequenceEdit();
		const spy = vi.fn();

		edit.setKeySequence("Ctrl+S");
		edit.keySequenceChanged.connect(spy);
		edit.clear();

		expect(spy).toHaveBeenCalledOnce();
		expect(spy).toHaveBeenCalledWith("");
	});

	test("clear does not emit when already empty", () => {
		const edit = new CKeySequenceEdit();
		const spy = vi.fn();

		edit.keySequenceChanged.connect(spy);
		edit.clear();

		expect(spy).not.toHaveBeenCalled();
	});

	test("captures a normal key", () => {
		const edit = new CKeySequenceEdit();

		edit.event(new CKeyEvent(
			CEventType.KeyPress, "s", false, false, false, false, "KeyS"
		));

		expect(edit.keySequence()).toBe("S");
	});

	test("captures Ctrl combination", () => {
		const edit = new CKeySequenceEdit();

		edit.event(new CKeyEvent(
			CEventType.KeyPress, "s", true, false, false, false, "KeyS"
		));

		expect(edit.keySequence()).toBe("Ctrl+S");
	});

	test("captures Ctrl+Shift combination", () => {
		const edit = new CKeySequenceEdit();

		edit.event(new CKeyEvent(
			CEventType.KeyPress, "S", true, true, false, false, "KeyS"
		));

		expect(edit.keySequence()).toBe("Ctrl+Shift+S");
	});

	test("captures Ctrl+Alt combination", () => {
		const edit = new CKeySequenceEdit();

		edit.event(new CKeyEvent(
			CEventType.KeyPress, "v", true, false, true, false, "KeyV"
		));

		expect(edit.keySequence()).toBe("Ctrl+Alt+V");
	});

	test("uses physical key code for AltGraph letters", () => {
		const edit = new CKeySequenceEdit();

		edit.event(new CKeyEvent(
			CEventType.KeyPress, "@", false, false, false, false,
			"KeyV", true
		));

		expect(edit.keySequence()).toBe("Ctrl+Alt+V");
	});

	test("uses physical key code for another AltGraph letter", () => {
		const edit = new CKeySequenceEdit();

		edit.event(new CKeyEvent(
			CEventType.KeyPress, "]", false, false, false, false,
			"KeyG", true
		));

		expect(edit.keySequence()).toBe("Ctrl+Alt+G");
	});

	test("captures Alt combination", () => {
		const edit = new CKeySequenceEdit();

		edit.event(new CKeyEvent(
			CEventType.KeyPress, "F4", false, false, true, false, "F4"
		));

		expect(edit.keySequence()).toBe("Alt+F4");
	});

	test("captures Meta combination", () => {
		const edit = new CKeySequenceEdit();

		edit.event(new CKeyEvent(
			CEventType.KeyPress, "s", false, false, false, true, "KeyS"
		));

		expect(edit.keySequence()).toBe("Meta+S");
	});

	test("modifier-only key does not change the sequence", () => {
		const edit = new CKeySequenceEdit();

		edit.setKeySequence("Ctrl+S");

		edit.event(new CKeyEvent(
			CEventType.KeyPress, "Control", true, false, false, false,
			"ControlLeft"
		));

		expect(edit.keySequence()).toBe("Ctrl+S");
	});

	test("all modifier-only keys are ignored", () => {
		const edit = new CKeySequenceEdit();
		const spy = vi.fn();

		edit.keySequenceChanged.connect(spy);

		edit.event(new CKeyEvent(
			CEventType.KeyPress, "Control", true
		));
		edit.event(new CKeyEvent(
			CEventType.KeyPress, "Shift", false, true
		));
		edit.event(new CKeyEvent(
			CEventType.KeyPress, "Alt", false, false, true
		));
		edit.event(new CKeyEvent(
			CEventType.KeyPress, "Meta", false, false, false, true
		));

		expect(edit.keySequence()).toBe("");
		expect(spy).not.toHaveBeenCalled();
	});

	test("Backspace clears the sequence", () => {
		const edit = new CKeySequenceEdit();

		edit.setKeySequence("Ctrl+S");

		edit.event(new CKeyEvent(
			CEventType.KeyPress, "Backspace"
		));

		expect(edit.keySequence()).toBe("");
	});

	test("Delete clears the sequence", () => {
		const edit = new CKeySequenceEdit();

		edit.setKeySequence("Ctrl+S");

		edit.event(new CKeyEvent(
			CEventType.KeyPress, "Delete"
		));

		expect(edit.keySequence()).toBe("");
	});

	test("replaces the previous sequence", () => {
		const edit = new CKeySequenceEdit();

		edit.setKeySequence("Ctrl+S");

		edit.event(new CKeyEvent(
			CEventType.KeyPress, "n", true, false, false, false, "KeyN"
		));

		expect(edit.keySequence()).toBe("Ctrl+N");
	});

	test("normalizes letter keys to upper case", () => {
		const edit = new CKeySequenceEdit();

		edit.event(new CKeyEvent(
			CEventType.KeyPress, "a", false, false, false, false, "KeyA"
		));

		expect(edit.keySequence()).toBe("A");
	});

	test("captures Space", () => {
		const edit = new CKeySequenceEdit();

		edit.event(new CKeyEvent(
			CEventType.KeyPress, " ", true, false, false, false, "Space"
		));

		expect(edit.keySequence()).toBe("Ctrl+Space");
	});

	test("normalizes arrow key names", () => {
		const edit = new CKeySequenceEdit();

		edit.event(new CKeyEvent(
			CEventType.KeyPress, "ArrowLeft", true, false, false, false,
			"ArrowLeft"
		));

		expect(edit.keySequence()).toBe("Ctrl+Left");
	});

	test("emits keySequenceChanged for keyboard input", () => {
		const edit = new CKeySequenceEdit();
		const spy = vi.fn();

		edit.keySequenceChanged.connect(spy);

		edit.event(new CKeyEvent(
			CEventType.KeyPress, "s", true, false, false, false, "KeyS"
		));

		expect(spy).toHaveBeenCalledOnce();
		expect(spy).toHaveBeenCalledWith("Ctrl+S");
	});

	test("emits editingFinished when focus is lost", () => {
		const edit = new CKeySequenceEdit();
		const spy = vi.fn();

		edit.editingFinished.connect(spy);
		edit.event(new CFocusEvent(CEventType.FocusOut));

		expect(spy).toHaveBeenCalledOnce();
	});

	test("sizeHint returns the expected size", () => {
		const edit = new CKeySequenceEdit();
		const hint = edit.sizeHint();

		expect(hint.width()).toBe(160);
		expect(hint.height()).toBe(28);
	});
});