import {afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CLineEdit } from "../../src/widgets/CLineEdit.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";
import { CMouseEvent, CMouseButton } from "../../src/index.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/index.js";
import { CFontMetrics } from "../../src/gui/CFontMetrics.js";
import { CClipboard } from "../../src/core/CClipboard.js";
import { CIntValidator } from "../../src/util/CIntValidator.js";
import { CCompleter } from "../../src/widgets/CCompleter.js";

describe("CLineEdit", () => {
	beforeEach(() => {
		Object.defineProperty(globalThis, "window", {
			value: createTestWindow(),
			writable: true,
			configurable: true
		});
		Object.defineProperty(globalThis, "navigator", {
			value: {
				clipboard: {
					writeText: vi.fn().mockResolvedValue(undefined),
					readText: vi.fn().mockResolvedValue("")
				}
			},
			writable: true,
			configurable: true
		});

		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		vi.useRealTimers();

		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has empty text by default", () => {
		const edit = new CLineEdit();

		expect(edit.text()).toBe("");
	});

	test("stores the visual validation error state", () => {
		const edit = new CLineEdit();

		expect(edit.hasValidationError()).toBe(false);
		edit.setValidationError();
		expect(edit.hasValidationError()).toBe(true);
		edit.setValidationError(false);
		expect(edit.hasValidationError()).toBe(false);
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

	test("selects text by dragging mouse to the right", () => {
		const edit = new CLineEdit();
		edit.resize(300, 30);
		edit.setText("Hello");

		const metrics = new CFontMetrics(edit.font());

		const startX = 4 + metrics.textWidth("H");
		const endX = 4 + metrics.textWidth("Hell");

		edit.event(new CMouseEvent(
			CEventType.MousePress,
			startX,
			15,
			CMouseButton.LeftButton
		));

		edit.event(new CMouseEvent(
			CEventType.MouseMove,
			endX,
			15,
			CMouseButton.NoButton
		));

		expect(edit.hasSelection()).toBe(true);
		expect(edit.selectionStart()).toBe(1);
		expect(edit.selectionEnd()).toBe(4);
		expect(edit.selectedText()).toBe("ell");
	});

	test("selects text by dragging mouse to the left", () => {
		const edit = new CLineEdit();
		edit.resize(300, 30);
		edit.setText("Hello");

		const metrics = new CFontMetrics(edit.font());

		const startX = 5 + metrics.textWidth("Hell");
		const endX = 5 + metrics.textWidth("H");

		edit.event(new CMouseEvent(CEventType.MousePress, startX, 15, CMouseButton.LeftButton));
		edit.event(new CMouseEvent(CEventType.MouseMove, endX, 15, CMouseButton.NoButton));

		expect(edit.hasSelection()).toBe(true);
		expect(edit.selectionStart()).toBe(1);
		expect(edit.selectionEnd()).toBe(4);
		expect(edit.selectedText()).toBe("ell");
	});

	test("mouse release finishes selection", () => {
		const edit = new CLineEdit();
		edit.resize(300, 30);
		edit.setText("Hello");

		const metrics = new CFontMetrics(edit.font());

		const startX = 5 + metrics.textWidth("H");
		const endX = 5 + metrics.textWidth("Hell");

		edit.event(new CMouseEvent(CEventType.MousePress, startX, 15, CMouseButton.LeftButton));
		edit.event(new CMouseEvent(CEventType.MouseMove, endX, 15, CMouseButton.NoButton));
		edit.event(new CMouseEvent(CEventType.MouseRelease, endX, 15, CMouseButton.LeftButton));

		expect(edit.selectionStart()).toBe(1);
		expect(edit.selectionEnd()).toBe(4);
		expect(edit.selectedText()).toBe("ell");
	});

	test("dragging past left edge selects to beginning", () => {
		const edit = new CLineEdit();
		edit.resize(300, 30);
		edit.setText("Hello");

		const metrics = new CFontMetrics(edit.font());
		const startX = 5 + metrics.textWidth("Hell");

		edit.event(new CMouseEvent(CEventType.MousePress, startX, 15, CMouseButton.LeftButton));
		edit.event(new CMouseEvent(CEventType.MouseMove, -50, 15, CMouseButton.NoButton));

		expect(edit.selectionStart()).toBe(0);
		expect(edit.selectionEnd()).toBe(4);
		expect(edit.selectedText()).toBe("Hell");
	});

	test("dragging past right edge selects to end", () => {
		const edit = new CLineEdit();
		edit.resize(300, 30);
		edit.setText("Hello");

		const metrics = new CFontMetrics(edit.font());
		const startX = 4 + metrics.textWidth("H");

		edit.event(new CMouseEvent(CEventType.MousePress, startX, 15, CMouseButton.LeftButton));
		edit.event(new CMouseEvent(CEventType.MouseMove, 500, 15, CMouseButton.NoButton));

		expect(edit.selectionStart()).toBe(1);
		expect(edit.selectionEnd()).toBe(5);
		expect(edit.selectedText()).toBe("ello");
	});

	test("mouse move without mouse press does not create selection", () => {
		const edit = new CLineEdit();
		edit.resize(300, 30);
		edit.setText("Hello");

		edit.event(new CMouseEvent(CEventType.MouseMove, 100, 15, CMouseButton.NoButton));
		expect(edit.hasSelection()).toBe(false);
	});

	test("home moves cursor to beginning", () => {
		const edit = new CLineEdit();
		edit.setText("Hello");
		edit.setCursorPosition(3);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Home"
		));

		expect(edit.cursorPosition()).toBe(0);
		expect(edit.hasSelection()).toBe(false);
	});

	test("end moves cursor to end", () => {
		const edit = new CLineEdit();
		edit.setText("Hello");
		edit.setCursorPosition(2);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"End"
		));

		expect(edit.cursorPosition()).toBe(5);
		expect(edit.hasSelection()).toBe(false);
	});

	test("shift home selects to beginning", () => {
		const edit = new CLineEdit();
		edit.setText("Hello");
		edit.setCursorPosition(3);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Home",
			false,
			true
		));

		expect(edit.cursorPosition()).toBe(0);
		expect(edit.hasSelection()).toBe(true);
		expect(edit.selectionStart()).toBe(0);
		expect(edit.selectionEnd()).toBe(3);
		expect(edit.selectedText()).toBe("Hel");
	});

	test("shift end selects to end", () => {
		const edit = new CLineEdit();
		edit.setText("Hello");
		edit.setCursorPosition(2);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"End",
			false,
			true
		));

		expect(edit.cursorPosition()).toBe(5);
		expect(edit.hasSelection()).toBe(true);
		expect(edit.selectionStart()).toBe(2);
		expect(edit.selectionEnd()).toBe(5);
		expect(edit.selectedText()).toBe("llo");
	});

	test("home clears existing selection", () => {
		const edit = new CLineEdit();
		edit.setText("Hello");
		edit.setSelection(1, 4);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Home"
		));

		expect(edit.cursorPosition()).toBe(0);
		expect(edit.hasSelection()).toBe(false);
	});

	test("end clears existing selection", () => {
		const edit = new CLineEdit();
		edit.setText("Hello");
		edit.setSelection(1, 3);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"End"
		));

		expect(edit.cursorPosition()).toBe(5);
		expect(edit.hasSelection()).toBe(false);
	});

		test("shows cursor when line edit receives focus", () => {
		vi.useFakeTimers();

		const edit = new CLineEdit();

		edit.setFocus();

		expect(edit.cursorVisible()).toBe(true);

		vi.useRealTimers();
	});

	test("toggles cursor visibility while focused", () => {
		vi.useFakeTimers();

		const edit = new CLineEdit();
		edit.setFocus();

		expect(edit.cursorVisible()).toBe(true);

		vi.advanceTimersByTime(500);

		expect(edit.cursorVisible()).toBe(false);

		vi.advanceTimersByTime(500);

		expect(edit.cursorVisible()).toBe(true);

		vi.useRealTimers();
	});

	test("hides cursor when focus is cleared", () => {
		vi.useFakeTimers();

		const edit = new CLineEdit();
		edit.setFocus();

		edit.clearFocus();

		expect(edit.cursorVisible()).toBe(false);

		vi.advanceTimersByTime(1000);

		expect(edit.cursorVisible()).toBe(false);

		vi.useRealTimers();
	});

	test("moving cursor resets blinking and makes cursor visible", () => {
		vi.useFakeTimers();

		const edit = new CLineEdit();
		edit.setText("Hello");
		edit.setFocus();

		vi.advanceTimersByTime(500);

		expect(edit.cursorVisible()).toBe(false);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowLeft"
		));

		expect(edit.cursorVisible()).toBe(true);

		vi.useRealTimers();
	});

	test("inserting text resets blinking and makes cursor visible", () => {
		vi.useFakeTimers();

		const edit = new CLineEdit();
		edit.setFocus();

		vi.advanceTimersByTime(500);

		expect(edit.cursorVisible()).toBe(false);

		edit.insert("A");

		expect(edit.cursorVisible()).toBe(true);

		vi.useRealTimers();
	});

	test("deleting text resets blinking and makes cursor visible", () => {
		vi.useFakeTimers();

		const edit = new CLineEdit();
		edit.setText("Hello");
		edit.setFocus();

		vi.advanceTimersByTime(500);

		expect(edit.cursorVisible()).toBe(false);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Backspace"
		));

		expect(edit.cursorVisible()).toBe(true);

		vi.useRealTimers();
	});

	test("copies selected text with Ctrl+C", async () => {
		const edit = new CLineEdit();
		edit.setText("HelloWorld");
		edit.setSelection(0, 5);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"c",
			true
		));

		await Promise.resolve();

		expect(CClipboard.instance().text()).toBe("Hello");
		expect(edit.text()).toBe("HelloWorld");
		expect(edit.selectedText()).toBe("Hello");
	});

	test("Ctrl+C does nothing without selection", async () => {
		const edit = new CLineEdit();
		edit.setText("Hello");

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"c",
			true
		));

		await Promise.resolve();

		expect(navigator.clipboard.writeText)
			.not.toHaveBeenCalled();
	});

	test("cuts selected text with Ctrl+X", async () => {
		const edit = new CLineEdit();
		edit.setText("HelloWorld");
		edit.setSelection(0, 5);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"x",
			true
		));

		await Promise.resolve();

		expect(CClipboard.instance().text()).toBe("Hello");
		
		expect(edit.text()).toBe("World");
		expect(edit.cursorPosition()).toBe(0);
		expect(edit.hasSelection()).toBe(false);
	});

	test("Ctrl+X does nothing without selection", async () => {
		const edit = new CLineEdit();
		edit.setText("Hello");

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"x",
			true
		));

		await Promise.resolve();

		expect(navigator.clipboard.writeText)
			.not.toHaveBeenCalled();

		expect(edit.text()).toBe("Hello");
	});

	test("pastes clipboard text with Ctrl+V", async () => {
		
		const edit = new CLineEdit();
		edit.setText("Hello");
		edit.setCursorPosition(2);

		CClipboard.instance().setText("XY");
		expect(CClipboard.instance().text()).toBe("XY");
		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"v",
			true
		));

		expect(edit.text()).toBe("HeXYllo");
		expect(edit.cursorPosition()).toBe(4);
	});

	test("paste replaces selected text", async () => {
		
		const edit = new CLineEdit();
		edit.setText("HelloWorld");
		edit.setSelection(3, 5);

		CClipboard.instance().setText("XY");
		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"v",
			true
		));
		expect(CClipboard.instance().text()).toBe("XY");
		
		expect(edit.text()).toBe("HelXYWorld");
		expect(edit.cursorPosition()).toBe(5);
		expect(edit.hasSelection()).toBe(false);
	});

	test("pasting empty clipboard text does nothing", async () => {
		vi.mocked(navigator.clipboard.readText)
			.mockResolvedValue("");

		const edit = new CLineEdit();
		edit.setText("Hello");
		edit.setCursorPosition(2);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"v",
			true
		));

		await Promise.resolve();
		await Promise.resolve();

		expect(edit.text()).toBe("Hello");
		expect(edit.cursorPosition()).toBe(2);
	});

	test("Ctrl+C is accepted", () => {
		const edit = new CLineEdit();
		edit.setText("Hello");
		edit.setSelection(0, 5);

		const event = new CKeyEvent(
			CEventType.KeyPress,
			"c",
			true
		);

		edit.event(event);

		expect(event.isAccepted()).toBe(true);
	});

	test("Ctrl+X is accepted", () => {
		const edit = new CLineEdit();
		edit.setText("Hello");
		edit.setSelection(0, 5);

		const event = new CKeyEvent(
			CEventType.KeyPress,
			"x",
			true
		);

		edit.event(event);

		expect(event.isAccepted()).toBe(true);
	});

	test("Ctrl+V is accepted", () => {
		const edit = new CLineEdit();

		const event = new CKeyEvent(
			CEventType.KeyPress,
			"v",
			true
		);

		edit.event(event);

		expect(event.isAccepted()).toBe(true);
	});

	test("validator accepts valid inserted text", () => {
		const edit = new CLineEdit();

		edit.setValidator(text => /^\d*$/.test(text));
		edit.insert("123");

		expect(edit.text()).toBe("123");
		expect(edit.cursorPosition()).toBe(3);
	});

	test("validator rejects invalid inserted text", () => {
		const edit = new CLineEdit();

		edit.setValidator(text => /^\d*$/.test(text));
		edit.insert("abc");

		expect(edit.text()).toBe("");
		expect(edit.cursorPosition()).toBe(0);
	});

	test("validator checks resulting text, not only inserted text", () => {
		const edit = new CLineEdit();

		edit.setValidator(text => /^\d*$/.test(text));
		edit.setText("12");
		edit.setCursorPosition(2);

		edit.insert("a");

		expect(edit.text()).toBe("12");
		expect(edit.cursorPosition()).toBe(2);
	});

	test("validator allows replacing selection with valid text", () => {
		const edit = new CLineEdit();

		edit.setValidator(text => /^\d*$/.test(text));
		edit.setText("1234");
		edit.setSelection(1, 3);

		edit.insert("99");

		expect(edit.text()).toBe("1994");
		expect(edit.cursorPosition()).toBe(3);
		expect(edit.hasSelection()).toBe(false);
	});

	test("validator rejects replacing selection with invalid text", () => {
		const edit = new CLineEdit();

		edit.setValidator(text => /^\d*$/.test(text));
		edit.setText("1234");
		edit.setSelection(1, 3);

		edit.insert("ab");

		expect(edit.text()).toBe("1234");
		expect(edit.selectionStart()).toBe(1);
		expect(edit.selectionEnd()).toBe(3);
	});

	test("validator allows empty text", () => {
		const edit = new CLineEdit();

		edit.setValidator(text => /^\d*$/.test(text));
		edit.setText("123");
		edit.setSelection(0, 3);

		edit.insert("");

		expect(edit.text()).toBe("123");
	});

	test("validator rejects invalid pasted text", async () => {
		vi.mocked(navigator.clipboard.readText)
			.mockResolvedValue("abc");

		const edit = new CLineEdit();
		edit.setValidator(text => /^\d*$/.test(text));

		await edit.paste();
		expect(edit.text()).toBe("");
	});

	test("is not read only by default", () => {
		const lineEdit = new CLineEdit();

		expect(lineEdit.isReadOnly()).toBe(false);
	});

	test("setReadOnly changes read only state", () => {
		const lineEdit = new CLineEdit();

		lineEdit.setReadOnly(true);

		expect(lineEdit.isReadOnly()).toBe(true);

		lineEdit.setReadOnly(false);

		expect(lineEdit.isReadOnly()).toBe(false);
	});

	test("setText still works when read only", () => {
		const lineEdit = new CLineEdit();

		lineEdit.setReadOnly(true);
		lineEdit.setText("Hello");

		expect(lineEdit.text()).toBe("Hello");
	});

	test("setText emits textChanged when read only", () => {
		const lineEdit = new CLineEdit();
		let text = "";

		lineEdit.setReadOnly(true);

		lineEdit.textChanged.connect(value => {
			text = value;
		});

		lineEdit.setText("Hello");

		expect(text).toBe("Hello");
	});

	test("typing does not change text when read only", () => {
		const lineEdit = new CLineEdit();

		lineEdit.setText("Hello");
		lineEdit.setReadOnly(true);

		lineEdit.event(
			new CKeyEvent(
				CEventType.KeyPress,
				"X",
				false,
				false,
				false,
				false
			)
		);

		expect(lineEdit.text()).toBe("Hello");
	});

	test("Backspace does not change text when read only", () => {
		const lineEdit = new CLineEdit();

		lineEdit.setText("Hello");
		lineEdit.setReadOnly(true);

		lineEdit.event(
			new CKeyEvent(
				CEventType.KeyPress,
				"Backspace",
				false,
				false,
				false,
				false
			)
		);

		expect(lineEdit.text()).toBe("Hello");
	});

	test("Delete does not change text when read only", () => {
		const lineEdit = new CLineEdit();

		lineEdit.setText("Hello");
		lineEdit.setReadOnly(true);

		lineEdit.event(
			new CKeyEvent(
				CEventType.KeyPress,
				"Delete",
				false,
				false,
				false,
				false
			)
		);

		expect(lineEdit.text()).toBe("Hello");
	});

	test("typing does not emit textChanged when read only", () => {
		const lineEdit = new CLineEdit();
		let count = 0;

		lineEdit.setText("Hello");
		lineEdit.setReadOnly(true);

		lineEdit.textChanged.connect(() => {
			++count;
		});

		lineEdit.event(
			new CKeyEvent(
				CEventType.KeyPress,
				"X",
				false,
				false,
				false,
				false
			)
		);

		expect(count).toBe(0);
	});

	test("editing works again after read only is disabled", () => {
		const lineEdit = new CLineEdit();

		lineEdit.setText("Hello");
		lineEdit.setReadOnly(true);
		lineEdit.setReadOnly(false);

		lineEdit.event(
			new CKeyEvent(
				CEventType.KeyPress,
				"X",
				false,
				false,
				false,
				false
			)
		);

		expect(lineEdit.text()).toBe("HelloX");
	});

	test("Enter emits returnPressed and editingFinished", () => {
		const edit = new CLineEdit();
		const returnPressed = vi.fn();
		const editingFinished = vi.fn();
		edit.returnPressed.connect(returnPressed);
		edit.editingFinished.connect(editingFinished);
		const event = new CKeyEvent(CEventType.KeyPress, "Enter");

		edit.event(event);

		expect(returnPressed).toHaveBeenCalledOnce();
		expect(editingFinished).toHaveBeenCalledOnce();
		expect(event.isAccepted()).toBe(true);
	});

	test("Return emits returnPressed and editingFinished", () => {
		const edit = new CLineEdit();
		const returnPressed = vi.fn();
		const editingFinished = vi.fn();
		edit.returnPressed.connect(returnPressed);
		edit.editingFinished.connect(editingFinished);

		edit.event(new CKeyEvent(CEventType.KeyPress, "Return"));

		expect(returnPressed).toHaveBeenCalledOnce();
		expect(editingFinished).toHaveBeenCalledOnce();
	});

	test("Enter does not finish input rejected by a function validator", () => {
		const edit = new CLineEdit();
		const returnPressed = vi.fn();
		const editingFinished = vi.fn();
		edit.setText("bad");
		edit.setValidator(text => text !== "bad");
		edit.returnPressed.connect(returnPressed);
		edit.editingFinished.connect(editingFinished);
		const event = new CKeyEvent(CEventType.KeyPress, "Enter");

		edit.event(event);

		expect(returnPressed).not.toHaveBeenCalled();
		expect(editingFinished).not.toHaveBeenCalled();
		expect(event.isAccepted()).toBe(false);
	});

	test("Enter does not finish intermediate object-validator input", () => {
		const edit = new CLineEdit();
		const returnPressed = vi.fn();
		const editingFinished = vi.fn();
		edit.setValidator(new CIntValidator(-100, 100));
		edit.insert("-");
		edit.returnPressed.connect(returnPressed);
		edit.editingFinished.connect(editingFinished);
		const event = new CKeyEvent(CEventType.KeyPress, "Enter");

		edit.event(event);

		expect(returnPressed).not.toHaveBeenCalled();
		expect(editingFinished).not.toHaveBeenCalled();
		expect(event.isAccepted()).toBe(false);
	});

	test("emits textEdited for user input but not setText", () => {
		const edit = new CLineEdit();
		const edited = vi.fn();
		edit.textEdited.connect(edited);

		edit.setText("Hello");
		expect(edited).not.toHaveBeenCalled();

		edit.insert("!");
		expect(edited).toHaveBeenCalledOnce();
		expect(edited).toHaveBeenCalledWith("Hello!");
	});

	test("sets and removes a completer", () => {
		const edit = new CLineEdit();
		const completer = new CCompleter(["Hello"]);

		edit.setCompleter(completer);
		expect(edit.completer()).toBe(completer);
		expect(completer.widget()).toBe(edit);

		edit.setCompleter(null);
		expect(edit.completer()).toBeNull();
		expect(completer.widget()).toBeNull();
	});

	test("completion keys are handled before ordinary line editing", () => {
		const edit = new CLineEdit();
		const completer = new CCompleter(["Mercator", "Merkur"]);
		edit.setCompleter(completer);
		edit.insert("M");

		edit.event(new CKeyEvent(CEventType.KeyPress, "ArrowDown"));
		edit.event(new CKeyEvent(CEventType.KeyPress, "Enter"));

		expect(edit.text()).toBe("Merkur");
	});


    describe("history availability signals", () => {
        test("emits only on availability transitions", () => {
            const edit = new CLineEdit();
            const undo: boolean[] = [], redo: boolean[] = [];
            edit.undoAvailable.connect(value => {
                expect(edit.canUndo()).toBe(value);
                undo.push(value);
            });
            edit.redoAvailable.connect(value => {
                expect(edit.canRedo()).toBe(value);
                redo.push(value);
            });
            edit.insert("A"); edit.insert("B");
            edit.undo(); edit.undo(); edit.redo(); edit.redo();
            expect(undo).toEqual([true, false, true]);
            expect(redo).toEqual([true, false]);
            expect(edit.text()).toBe("AB");
        });
        test("empty history operations emit no availability changes", () => {
            const edit = new CLineEdit();
            const undo: boolean[] = [], redo: boolean[] = [];
            edit.undoAvailable.connect(value => undo.push(value));
            edit.redoAvailable.connect(value => redo.push(value));
            edit.undo(); edit.redo(); edit.setText("");
            expect(undo).toEqual([]);
            expect(redo).toEqual([]);
        });
        test("loading text disables both undo and redo", () => {
            const edit = new CLineEdit();
            edit.insert("A"); edit.insert("B"); edit.undo();
            const undo: boolean[] = [], redo: boolean[] = [];
            edit.undoAvailable.connect(value => undo.push(value));
            edit.redoAvailable.connect(value => redo.push(value));
            edit.setText("Loaded");
            expect(undo).toEqual([false]);
            expect(redo).toEqual([false]);
        });
        test("new editing after undo disables redo", () => {
            const edit = new CLineEdit();
            edit.insert("A"); edit.insert("B"); edit.undo();
            const redo: boolean[] = [];
            edit.redoAvailable.connect(value => redo.push(value));
            edit.insert("C");
            expect(redo).toEqual([false]);
            expect(edit.text()).toBe("AC");
        });
        test("grouped typing emits undoAvailable true only once", () => {
            const edit = new CLineEdit();
            const undo: boolean[] = [];
            edit.undoAvailable.connect(value => undo.push(value));
            for (const key of "abc")
                edit.event(new CKeyEvent(CEventType.KeyPress, key));
            edit.undo(); edit.redo();
            expect(undo).toEqual([true, false, true]);
        });
    });
    describe("undo and redo", () => {
        function press(edit: CLineEdit, key: string, ctrl = false, shift = false): void {
            edit.event(new CKeyEvent(CEventType.KeyPress, key, ctrl, shift));
        }
        function type(edit: CLineEdit, value: string): void {
            for (const key of value) press(edit, key);
        }

        test("starts with empty history", () => {
            const edit = new CLineEdit();
            expect(edit.canUndo()).toBe(false);
            expect(edit.canRedo()).toBe(false);
            edit.undo(); edit.redo();
            expect(edit.text()).toBe("");
        });
        test("groups consecutive typing and restores it with redo", () => {
            const edit = new CLineEdit();
            type(edit, "Hello");
            edit.undo();
            expect(edit.text()).toBe("");
            expect(edit.cursorPosition()).toBe(0);
            expect(edit.canUndo()).toBe(false);
            expect(edit.canRedo()).toBe(true);
            edit.redo();
            expect(edit.text()).toBe("Hello");
            expect(edit.cursorPosition()).toBe(5);
        });
        test("explicit insert calls are separate operations", () => {
            const edit = new CLineEdit();
            edit.insert("A"); edit.insert("B");
            edit.undo(); expect(edit.text()).toBe("A");
            edit.undo(); expect(edit.text()).toBe("");
        });
        test("cursor movement separates typing groups", () => {
            const edit = new CLineEdit();
            type(edit, "ab"); press(edit, "ArrowLeft"); type(edit, "X");
            edit.undo();
            expect(edit.text()).toBe("ab");
            expect(edit.cursorPosition()).toBe(1);
            edit.undo(); expect(edit.text()).toBe("");
        });
        test("selection replacement restores backwards selection", () => {
            const edit = new CLineEdit();
            edit.setText("abcdef"); edit.setSelection(5, 1); edit.insert("X");
            edit.undo();
            expect(edit.text()).toBe("abcdef");
            expect(edit.selectedText()).toBe("bcde");
            expect(edit.cursorPosition()).toBe(1);
            edit.redo();
            expect(edit.text()).toBe("aXf");
            expect(edit.hasSelection()).toBe(false);
            expect(edit.cursorPosition()).toBe(2);
        });
        test("typing after a replacement is a separate operation", () => {
            const edit = new CLineEdit();
            edit.setText("abc"); edit.setSelection(0, 3);
            type(edit, "XY");
            edit.undo(); expect(edit.text()).toBe("X");
            edit.undo();
            expect(edit.text()).toBe("abc");
            expect(edit.selectedText()).toBe("abc");
        });
        test("groups consecutive backspaces", () => {
            const edit = new CLineEdit();
            edit.setText("abcd"); press(edit, "Backspace"); press(edit, "Backspace");
            expect(edit.text()).toBe("ab");
            edit.undo(); expect(edit.text()).toBe("abcd");
            expect(edit.cursorPosition()).toBe(4);
            edit.redo(); expect(edit.text()).toBe("ab");
        });
        test("groups consecutive deletes", () => {
            const edit = new CLineEdit();
            edit.setText("abcd"); edit.setCursorPosition(1);
            press(edit, "Delete"); press(edit, "Delete");
            expect(edit.text()).toBe("ad");
            edit.undo(); expect(edit.text()).toBe("abcd");
            expect(edit.cursorPosition()).toBe(1);
            edit.redo(); expect(edit.text()).toBe("ad");
        });
        test("typing and backspace have separate groups", () => {
            const edit = new CLineEdit();
            type(edit, "abc"); press(edit, "Backspace");
            edit.undo(); expect(edit.text()).toBe("abc");
            edit.undo(); expect(edit.text()).toBe("");
        });
        test("deleting a selection is an independent operation", () => {
            const edit = new CLineEdit();
            edit.setText("abcdef"); edit.setSelection(1, 4);
            press(edit, "Delete"); press(edit, "Delete");
            edit.undo(); expect(edit.text()).toBe("aef");
            edit.undo();
            expect(edit.text()).toBe("abcdef");
            expect(edit.selectedText()).toBe("bcd");
        });
        test("paste is undone as one operation", () => {
            const edit = new CLineEdit();
            type(edit, "ab");
            CClipboard.instance().setText("long paste");
            edit.paste(); type(edit, "X");
            edit.undo(); expect(edit.text()).toBe("ablong paste");
            edit.undo(); expect(edit.text()).toBe("ab");
            edit.undo(); expect(edit.text()).toBe("");
        });
        test("cut restores text and selection", () => {
            const edit = new CLineEdit();
            edit.setText("Hello world"); edit.setSelection(6, 11); edit.cut();
            expect(edit.text()).toBe("Hello ");
            edit.undo();
            expect(edit.text()).toBe("Hello world");
            expect(edit.selectedText()).toBe("world");
            edit.redo(); expect(edit.text()).toBe("Hello ");
        });
        test("new editing after undo discards redo", () => {
            const edit = new CLineEdit();
            type(edit, "abc"); edit.undo(); type(edit, "X");
            expect(edit.canRedo()).toBe(false);
            edit.redo(); expect(edit.text()).toBe("X");
            edit.undo(); expect(edit.text()).toBe("");
        });
        test("redo followed by typing creates a new group", () => {
            const edit = new CLineEdit();
            type(edit, "abc"); edit.undo(); edit.redo(); type(edit, "X");
            edit.undo(); expect(edit.text()).toBe("abc");
            edit.undo(); expect(edit.text()).toBe("");
        });
        test("setText resets both histories", () => {
            const edit = new CLineEdit();
            edit.insert("A"); edit.insert("B"); edit.undo();
            edit.setText("Loaded");
            expect(edit.canUndo()).toBe(false);
            expect(edit.canRedo()).toBe(false);
            edit.undo(); expect(edit.text()).toBe("Loaded");
        });
        test("setText with identical text also resets history without text signals", () => {
            const edit = new CLineEdit();
            edit.insert("A");
            const changed = vi.fn();
            edit.textChanged.connect(changed);
            edit.setText("A");
            expect(edit.canUndo()).toBe(false);
            expect(changed).not.toHaveBeenCalled();
        });
        test("rejected input preserves undo and redo history", () => {
            const edit = new CLineEdit();
            edit.setValidator(text => /^\d*$/.test(text));
            type(edit, "12"); edit.undo(); type(edit, "x");
            expect(edit.canUndo()).toBe(false);
            expect(edit.canRedo()).toBe(true);
            edit.redo(); expect(edit.text()).toBe("12");
        });
        test("read-only edits create no history", () => {
            const edit = new CLineEdit();
            edit.setText("abc"); edit.setReadOnly(true);
            type(edit, "X"); press(edit, "Backspace"); edit.insert("Y");
            expect(edit.text()).toBe("abc");
            expect(edit.canUndo()).toBe(false);
        });
        test("undo and redo emit textChanged and textEdited once per operation", () => {
            const edit = new CLineEdit();
            type(edit, "abc");
            const changed = vi.fn(), edited = vi.fn();
            edit.textChanged.connect(changed); edit.textEdited.connect(edited);
            edit.undo();
            expect(changed).toHaveBeenCalledOnce();
            expect(changed).toHaveBeenCalledWith("");
            expect(edited).toHaveBeenCalledOnce();
            expect(edited).toHaveBeenCalledWith("");
            changed.mockClear(); edited.mockClear();
            edit.redo();
            expect(changed).toHaveBeenCalledOnce();
            expect(changed).toHaveBeenCalledWith("abc");
            expect(edited).toHaveBeenCalledOnce();
            expect(edited).toHaveBeenCalledWith("abc");
        });
        test("Ctrl+Z Ctrl+Y and Ctrl+Shift+Z operate on history", () => {
            const edit = new CLineEdit();
            type(edit, "abc");
            press(edit, "z", true); expect(edit.text()).toBe("");
            press(edit, "y", true); expect(edit.text()).toBe("abc");
            press(edit, "Z", true); expect(edit.text()).toBe("");
            press(edit, "Z", true, true); expect(edit.text()).toBe("abc");
        });
        test("Enter separates editing sessions", () => {
            const edit = new CLineEdit();
            type(edit, "abc"); press(edit, "Enter"); type(edit, "X");
            edit.undo(); expect(edit.text()).toBe("abc");
            edit.undo(); expect(edit.text()).toBe("");
        });
    });

});
