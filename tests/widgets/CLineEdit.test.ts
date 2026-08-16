import {afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CLineEdit } from "../../src/widgets/CLineEdit.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";
import { CMouseEvent, CMouseButton } from "../../src/index.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/index.js";
import { CFontMetrics } from "../../src/gui/CFontMetrics.js";

describe("CLineEdit", () => {
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

	test("has empty text by default", () => {
		const edit = new CLineEdit();

		expect(edit.text()).toBe("");
	});

	test("has cursor at zero by default", () => {
		const edit = new CLineEdit();

		expect(edit.cursorPosition()).toBe(0);
	});

	test("sets text", () => {
		const edit = new CLineEdit();

		edit.setText("Hello");

		expect(edit.text()).toBe("Hello");
	});

	test("moves cursor to end when setting text", () => {
		const edit = new CLineEdit();

		edit.setText("Hello");

		expect(edit.cursorPosition()).toBe(5);
	});

	test("emits textChanged when text changes", () => {
		const edit = new CLineEdit();
		const slot = vi.fn();

		edit.textChanged.connect(slot);

		edit.setText("Hello");

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith("Hello");
	});

	test("does not emit textChanged when text is unchanged", () => {
		const edit = new CLineEdit();
		const slot = vi.fn();

		edit.setText("Hello");
		edit.textChanged.connect(slot);

		edit.setText("Hello");

		expect(slot).not.toHaveBeenCalled();
	});

	test("sets cursor position", () => {
		const edit = new CLineEdit();
		edit.setText("Hello");

		edit.setCursorPosition(2);

		expect(edit.cursorPosition()).toBe(2);
	});

	test("clamps cursor position below zero", () => {
		const edit = new CLineEdit();
		edit.setText("Hello");

		edit.setCursorPosition(-10);

		expect(edit.cursorPosition()).toBe(0);
	});

	test("clamps cursor position beyond text length", () => {
		const edit = new CLineEdit();
		edit.setText("Hello");

		edit.setCursorPosition(100);

		expect(edit.cursorPosition()).toBe(5);
	});

	test("inserts text at cursor position", () => {
		const edit = new CLineEdit();
		edit.setText("Hello");
		edit.setCursorPosition(2);

		edit.insert("XY");

		expect(edit.text()).toBe("HeXYllo");
	});

	test("moves cursor after inserted text", () => {
		const edit = new CLineEdit();
		edit.setText("Hello");
		edit.setCursorPosition(2);

		edit.insert("XY");

		expect(edit.cursorPosition()).toBe(4);
	});

	test("inserts text at beginning", () => {
		const edit = new CLineEdit();
		edit.setText("World");
		edit.setCursorPosition(0);

		edit.insert("Hello ");

		expect(edit.text()).toBe("Hello World");
		expect(edit.cursorPosition()).toBe(6);
	});

	test("inserts text at end", () => {
		const edit = new CLineEdit();
		edit.setText("Hello");

		edit.insert(" World");

		expect(edit.text()).toBe("Hello World");
		expect(edit.cursorPosition()).toBe(11);
	});

	test("emits textChanged when text is inserted", () => {
		const edit = new CLineEdit();
		edit.setText("Hello");
		edit.setCursorPosition(2);

		const slot = vi.fn();
		edit.textChanged.connect(slot);

		edit.insert("XY");

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith("HeXYllo");
	});

	test("inserting empty text does nothing", () => {
		const edit = new CLineEdit();
		edit.setText("Hello");
		edit.setCursorPosition(2);

		const slot = vi.fn();
		edit.textChanged.connect(slot);

		edit.insert("");

		expect(edit.text()).toBe("Hello");
		expect(edit.cursorPosition()).toBe(2);
		expect(slot).not.toHaveBeenCalled();
	});

    test("moves cursor near beginning when clicking near start", () => {
	    const edit = new CLineEdit();
	    edit.resize(200, 30);
	    edit.setText("Hello");
    	const event = new CMouseEvent(CEventType.MousePress, 5, 15, CMouseButton.LeftButton);
    	edit.event(event);
    	expect(edit.cursorPosition()).toBe(0);
	    expect(event.isAccepted()).toBe(true);
    });

    test("moves cursor to end when clicking past text", () => {
	    const edit = new CLineEdit();
	    edit.resize(200, 30);
	    edit.setText("Hello");
	    const event = new CMouseEvent(CEventType.MousePress, 180, 15, CMouseButton.LeftButton);
    	edit.event(event);
    	expect(edit.cursorPosition()).toBe(5);
	    expect(event.isAccepted()).toBe(true);
    });

    test("moves cursor to nearest character position", () => {
	    const edit = new CLineEdit();
	    edit.resize(200, 30);
	    edit.setText("Hello");
    	const fm = new CFontMetrics(edit.font());
    	const before = fm.textWidth("He");
	    const after = fm.textWidth("Hel");
	    const x = 5 + (before + after) / 2 + 1;
    	const event = new CMouseEvent(CEventType.MousePress, x, 15, CMouseButton.LeftButton);
    	edit.event(event);
    	expect(edit.cursorPosition()).toBe(3);
    });

    test("clicking left half of character places cursor before it", () => {
	    const edit = new CLineEdit();
	    edit.resize(200, 30);
	    edit.setText("Hello");
	    const fm = new CFontMetrics(edit.font());
    	const left = fm.textWidth("He");
	    const right = fm.textWidth("Hel");
	    const middle = (left + right) / 2;
    	const event = new CMouseEvent(CEventType.MousePress, 4 + middle - 1,
	        15, CMouseButton.LeftButton
	    );
    	edit.event(event);
    	expect(edit.cursorPosition()).toBe(2);
    });

    test("clicking right half of character places cursor after it", () => {
	    const edit = new CLineEdit();
	    edit.resize(200, 30);
	    edit.setText("Hello");
    	const metrics = new CFontMetrics(edit.font());
    	const left = metrics.textWidth("He");
	    const right = metrics.textWidth("Hel");
	    const middle = (left + right) / 2;
    	const event = new CMouseEvent(CEventType.MousePress, 4 + middle + 1,
		    15, CMouseButton.LeftButton
	    );
    	edit.event(event);
    	expect(edit.cursorPosition()).toBe(3);
    });

    test("ignores non-left mouse press", () => {
	    const edit = new CLineEdit();
	    edit.setText("Hello");
    	const originalPosition = edit.cursorPosition();
    	const event = new CMouseEvent(CEventType.MousePress, 5, 15, CMouseButton.RightButton);
    	edit.event(event);
    	expect(edit.cursorPosition()).toBe(originalPosition);
	    expect(event.isAccepted()).toBe(false);
    });

    test("has no selection by default", () => {
	    const edit = new CLineEdit();
    	expect(edit.hasSelection()).toBe(false);
	    expect(edit.selectedText()).toBe("");
    });

    test("selection start and end are cursor position without selection", () => {
	    const edit = new CLineEdit();
	    edit.setText("Hello");
	    edit.setCursorPosition(2);
    	expect(edit.selectionStart()).toBe(2);
	    expect(edit.selectionEnd()).toBe(2);
    });

    test("returns selected text", () => {
	    const edit = new CLineEdit();
	    edit.setText("Hello");
    	edit.setSelection(1, 4);
    	expect(edit.hasSelection()).toBe(true);
	    expect(edit.selectionStart()).toBe(1);
	    expect(edit.selectionEnd()).toBe(4);
	    expect(edit.selectedText()).toBe("ell");
    });

    test("handles selection in reverse direction", () => {
	    const edit = new CLineEdit();
	    edit.setText("Hello");
    	edit.setSelection(4, 1);
    	expect(edit.hasSelection()).toBe(true);
	    expect(edit.selectionStart()).toBe(1);
	    expect(edit.selectionEnd()).toBe(4);
	    expect(edit.selectedText()).toBe("ell");
    });

    test("clears selection at cursor position", () => {
	    const edit = new CLineEdit();
	    edit.setText("Hello");
	    edit.setSelection(1, 4);
    	edit.clearSelection();
    	expect(edit.hasSelection()).toBe(false);
	    expect(edit.selectionStart()).toBe(edit.cursorPosition());
	    expect(edit.selectionEnd()).toBe(edit.cursorPosition());
    });

    test("setting cursor position clears selection", () => {
	    const edit = new CLineEdit();
	    edit.setText("Hello");
	    edit.setSelection(1, 4);
    	edit.setCursorPosition(2);
    	expect(edit.cursorPosition()).toBe(2);
    	expect(edit.hasSelection()).toBe(false);
    });

    test("setting text clears selection and moves cursor to end", () => {
	    const edit = new CLineEdit();
	    edit.setText("Hello");
	    edit.setSelection(1, 4);
    	edit.setText("World");
    	expect(edit.text()).toBe("World");
	    expect(edit.cursorPosition()).toBe(5);
	    expect(edit.hasSelection()).toBe(false);
    });

    test("inserting text clears selection state", () => {
	    const edit = new CLineEdit();
	    edit.setText("Hello");
	    edit.setCursorPosition(2);
    	edit.insert("XY");

    	expect(edit.text()).toBe("HeXYllo");
	    expect(edit.cursorPosition()).toBe(4);
    	expect(edit.hasSelection()).toBe(false);
    });

    test("shift left extends selection to the left", () => {
	    const edit = new CLineEdit();
	    edit.setText("Hello");
	    edit.setCursorPosition(3);
    	edit.event(new CKeyEvent(CEventType.KeyPress, "ArrowLeft", false, true));
    	expect(edit.cursorPosition()).toBe(2);
	    expect(edit.hasSelection()).toBe(true);
	    expect(edit.selectionStart()).toBe(2);
	    expect(edit.selectionEnd()).toBe(3);
	    expect(edit.selectedText()).toBe("l");
    });

    test("shift right extends selection to the right", () => {
	    const edit = new CLineEdit();
	    edit.setText("Hello");
	    edit.setCursorPosition(2);
    	edit.event(new CKeyEvent(CEventType.KeyPress, "ArrowRight", false, true));
    	expect(edit.cursorPosition()).toBe(3);
	    expect(edit.hasSelection()).toBe(true);
	    expect(edit.selectionStart()).toBe(2);
	    expect(edit.selectionEnd()).toBe(3);
	    expect(edit.selectedText()).toBe("l");
    });

    test("repeated shift right extends selection", () => {
	    const edit = new CLineEdit();
	    edit.setText("Hello");
	    edit.setCursorPosition(1);
	    edit.event(new CKeyEvent(CEventType.KeyPress, "ArrowRight", false, true));
    	edit.event(new CKeyEvent(CEventType.KeyPress, "ArrowRight", false, true));
    	expect(edit.cursorPosition()).toBe(3);
	    expect(edit.selectionStart()).toBe(1);
	    expect(edit.selectionEnd()).toBe(3);
	    expect(edit.selectedText()).toBe("el");
    });

    test("shift left can shrink existing selection", () => {
	    const edit = new CLineEdit();
	    edit.setText("Hello");
	    edit.setSelection(1, 3);
    	edit.event(new CKeyEvent(CEventType.KeyPress, "ArrowLeft", false, true));
    	expect(edit.cursorPosition()).toBe(2);
	    expect(edit.selectionStart()).toBe(1);
	    expect(edit.selectionEnd()).toBe(2);
	    expect(edit.selectedText()).toBe("e");
    });

    test("arrow key without shift clears selection", () => {
	    const edit = new CLineEdit();
	    edit.setText("Hello");
	    edit.setSelection(1, 3);
    	edit.event(new CKeyEvent(CEventType.KeyPress, "ArrowLeft"
	    ));
    	expect(edit.hasSelection()).toBe(false);
    	expect(edit.cursorPosition()).toBe(2);
    });

    test("typing replaces selected text", () => {
	    const edit = new CLineEdit();
	    edit.setText("HelloWorld");
	    edit.setSelection(3, 5);

	    edit.event(new CKeyEvent(CEventType.KeyPress, "X"));

	    expect(edit.text()).toBe("HelXWorld");
	    expect(edit.cursorPosition()).toBe(4);
	    expect(edit.hasSelection()).toBe(false);
    });

    test("backspace deletes selected text", () => {
	    const edit = new CLineEdit();
	    edit.setText("HelloWorld");
	    edit.setSelection(3, 5);
    	edit.event(new CKeyEvent(CEventType.KeyPress, "Backspace"));
    	expect(edit.text()).toBe("HelWorld");
	    expect(edit.cursorPosition()).toBe(3);
	    expect(edit.hasSelection()).toBe(false);
    });

    test("delete deletes selected text", () => {
	    const edit = new CLineEdit();
	    edit.setText("HelloWorld");
	    edit.setSelection(3, 5);

	    edit.event(new CKeyEvent(CEventType.KeyPress, "Delete"));

	    expect(edit.text()).toBe("HelWorld");
	    expect(edit.cursorPosition()).toBe(3);
	    expect(edit.hasSelection()).toBe(false);
    });
});