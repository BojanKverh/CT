import { CRect } from "../../src/geometry/CRect.js";
import { CDefaultStyle } from "../../src/gui/CDefaultStyle.js";
import { CFont, CFontStyle } from "../../src/gui/CFont.js";
import { CPaletteColorRole } from "../../src/gui/CPalette.js";
import { CStyleState } from "../../src/gui/CStyleOption.js";
import type { CPainter } from "../../src/painting/CPainter.js";
import { CMenu } from "../../src/widgets/CMenu.js";
import { CContextMenuEvent, CContextMenuReason } from "../../src/events/CContextMenuEvent.js";
import { CPoint } from "../../src/geometry/CPoint.js";
import {afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CLineEdit } from "../../src/widgets/CLineEdit.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";
import { CMouseEvent, CMouseButton } from "../../src/index.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/index.js";
import { CFontMetrics } from "../../src/gui/CFontMetrics.js";
import { CStyleOptionLineEdit } from "../../src/gui/CStyleOptionLineEdit.js";
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


    describe("standard context menu", () => {
        function request(edit: CLineEdit): CContextMenuEvent {
            const event = new CContextMenuEvent(
                CContextMenuReason.Mouse, new CPoint(10, 12), new CPoint(120, 140));
            edit.event(event);
            return event;
        }
        function activeMenu(): CMenu {
            const menu = CApplication.instance().popupWidgets().find(popup => popup instanceof CMenu);
            expect(menu).toBeInstanceOf(CMenu);
            return menu as CMenu;
        }
        test("contains standard actions and separators", () => {
            const edit = new CLineEdit();
            const menu = edit.createStandardContextMenu();
            expect(Array.from({ length: menu.count() }, (_, i) => menu.actionAt(i)?.text() ?? null))
                .toEqual(["Undo", "Redo", null, "Cut", "Copy", "Paste", null, "Select All"]);
            menu.destroy();
        });
        test("empty editor permits system Paste without reading the clipboard in advance", () => {
            const edit = new CLineEdit();
            CClipboard.instance().setText("");
            const menu = edit.createStandardContextMenu();
            for (const i of [0, 1, 3, 4, 7])
                expect(menu.actionAt(i)?.isEnabled()).toBe(false);
            expect(menu.actionAt(5)?.isEnabled()).toBe(true);
            expect(navigator.clipboard.readText).not.toHaveBeenCalled();
            menu.destroy();
        });
        test("menu enables undo and redo according to history", () => {
            const edit = new CLineEdit();
            edit.insert("A"); edit.insert("B"); edit.undo();
            const menu = edit.createStandardContextMenu();
            expect(menu.actionAt(0)?.isEnabled()).toBe(true);
            expect(menu.actionAt(1)?.isEnabled()).toBe(true);
            menu.actionAt(0)!.trigger();
            expect(edit.text()).toBe("");
            menu.actionAt(1)!.trigger();
            expect(edit.text()).toBe("A");
            menu.destroy();
        });
        test("copy preserves text and copies selection", () => {
            const edit = new CLineEdit();
            edit.setText("abcdef"); edit.setSelection(1, 4);
            const menu = edit.createStandardContextMenu();
            expect(menu.actionAt(4)?.isEnabled()).toBe(true);
            menu.actionAt(4)!.trigger();
            expect(CClipboard.instance().text()).toBe("bcd");
            expect(edit.text()).toBe("abcdef");
            menu.destroy();
        });
        test("cut can be undone with its original selection", () => {
            const edit = new CLineEdit();
            edit.setText("abcdef"); edit.setSelection(4, 1);
            const menu = edit.createStandardContextMenu();
            menu.actionAt(3)!.trigger();
            expect(edit.text()).toBe("aef");
            expect(CClipboard.instance().text()).toBe("bcd");
            edit.undo();
            expect(edit.text()).toBe("abcdef");
            expect(edit.selectedText()).toBe("bcd");
            expect(edit.cursorPosition()).toBe(1);
            menu.destroy();
        });
        test("paste replaces the selection and is undoable", async () => {
            const edit = new CLineEdit();
            edit.setText("abc"); edit.setSelection(0, 3);
            CClipboard.instance().withNativeClipboard(() => CClipboard.instance().setText("Stale internal text"));
            vi.mocked(navigator.clipboard.readText).mockResolvedValue("Pasted");
            const menu = edit.createStandardContextMenu();
            expect(menu.actionAt(5)?.isEnabled()).toBe(true);
            menu.actionAt(5)!.trigger();
            await vi.waitFor(() => expect(edit.text()).toBe("Pasted"));
            expect(navigator.clipboard.readText).toHaveBeenCalledOnce();
            edit.undo(); expect(edit.text()).toBe("abc");
            menu.destroy();
        });

        test("empty internal clipboard disables Paste when system reading is unavailable", () => {
            const available = vi.spyOn(CClipboard.instance(), "canReadSystemText").mockReturnValue(false);
            try {
                const edit = new CLineEdit(); CClipboard.instance().clear();
                const menu = edit.createStandardContextMenu();
                for (const i of [0, 1, 3, 4, 5, 7]) expect(menu.actionAt(i)?.isEnabled()).toBe(false);
                menu.destroy();
            } finally { available.mockRestore(); }
        });
        test("internal Paste remains synchronous and undoable without system reading", () => {
            const available = vi.spyOn(CClipboard.instance(), "canReadSystemText").mockReturnValue(false);
            try {
                const edit = new CLineEdit(); edit.setText("abc"); edit.setSelection(0, 3);
                CClipboard.instance().withNativeClipboard(() => CClipboard.instance().setText("Internal"));
                const menu = edit.createStandardContextMenu(); menu.actionAt(5)!.trigger();
                expect(edit.text()).toBe("Internal");
                expect(navigator.clipboard.readText).not.toHaveBeenCalled();
                edit.undo(); expect(edit.text()).toBe("abc"); menu.destroy();
            } finally { available.mockRestore(); }
        });
        test("select all preserves cursor direction and does not change history", () => {
            const edit = new CLineEdit();
            edit.setText("abc");
            const menu = edit.createStandardContextMenu();
            menu.actionAt(7)!.trigger();
            expect(edit.selectedText()).toBe("abc");
            expect(edit.cursorPosition()).toBe(3);
            expect(edit.canUndo()).toBe(false);
            menu.destroy();
            const selectedMenu = edit.createStandardContextMenu();
            expect(selectedMenu.actionAt(7)?.isEnabled()).toBe(false);
            selectedMenu.destroy();
        });
        test("read-only menu permits copying and selecting but no mutations", () => {
            const edit = new CLineEdit();
            edit.insert("abc"); edit.setSelection(0, 1); edit.setReadOnly(true);
            CClipboard.instance().setText("Paste");
            const menu = edit.createStandardContextMenu();
            for (const i of [0, 1, 3, 5]) {
                expect(menu.actionAt(i)?.isEnabled()).toBe(false);
                menu.actionAt(i)!.trigger();
            }
            expect(menu.actionAt(4)?.isEnabled()).toBe(true);
            expect(menu.actionAt(7)?.isEnabled()).toBe(true);
            menu.actionAt(4)!.trigger();
            expect(CClipboard.instance().text()).toBe("a");
            expect(edit.text()).toBe("abc");
            menu.destroy();
        });
        test("disabled editor menu contains no enabled actions", () => {
            const edit = new CLineEdit();
            edit.insert("abc"); edit.setSelection(0, 1); edit.setEnabled(false);
            CClipboard.instance().setText("Paste");
            const menu = edit.createStandardContextMenu();
            for (const i of [0, 1, 3, 4, 5, 7])
                expect(menu.actionAt(i)?.isEnabled()).toBe(false);
            menu.destroy();
        });
        test("read-only state is rechecked when triggering an existing action", () => {
            const edit = new CLineEdit();
            edit.insert("abc"); edit.setSelection(0, 1);
            const menu = edit.createStandardContextMenu();
            edit.setReadOnly(true);
            menu.actionAt(0)!.trigger(); menu.actionAt(3)!.trigger();
            expect(edit.text()).toBe("abc");
            menu.destroy();
        });
        test("context request opens menu at canvas position without changing selection", () => {
            const edit = new CLineEdit();
            edit.setText("abcdef"); edit.setSelection(4, 1);
            const event = request(edit);
            const menu = activeMenu();
            expect(event.isAccepted()).toBe(true);
            expect([menu.x(), menu.y()]).toEqual([120, 140]);
            expect(edit.selectedText()).toBe("bcd");
            menu.close();
            expect(CApplication.instance().popupWidgets()).not.toContain(menu);
            expect(edit.hasFocus()).toBe(true);
        });
        test("reopening and destroying an editor leaves no open context menus", () => {
            const edit = new CLineEdit();
            request(edit);
            const first = activeMenu();
            request(edit);
            const second = activeMenu();
            expect(second).not.toBe(first);
            expect(first.isOpen()).toBe(false);
            expect(CApplication.instance().popupWidgets()).not.toContain(first);
            edit.destroy();
            expect(second.isOpen()).toBe(false);
            expect(CApplication.instance().popupWidgets()).not.toContain(second);
        });
        test("disabled editor ignores context requests", () => {
            const edit = new CLineEdit();
            edit.setEnabled(false);
            const event = request(edit);
            expect(event.isAccepted()).toBe(false);
            expect(CApplication.instance().popupWidgets()).toHaveLength(0);
        });

        test("Ctrl+A selects the entire line", () => {
            const edit = new CLineEdit();
            edit.setText("abc");
            edit.event(new CKeyEvent(CEventType.KeyPress, "a", true));
            expect(edit.selectedText()).toBe("abc");
        });
        test("opening the context menu does not finish editing", () => {
            const edit = new CLineEdit();
            edit.setText("abc"); edit.setFocus();
            const finished = vi.fn();
            edit.editingFinished.connect(finished);
            request(edit);
            expect(finished).not.toHaveBeenCalled();
            activeMenu().close();
        });
        test("paste from the context menu still respects the validator", () => {
            const edit = new CLineEdit();
            edit.setValidator(text => /^\d*$/.test(text));
            CClipboard.instance().setText("abc");
            const menu = edit.createStandardContextMenu();
            menu.actionAt(5)!.trigger();
            expect(edit.text()).toBe("");
            expect(edit.canUndo()).toBe(false);
            menu.destroy();
        });

    });


    describe("multi-click selection", () => {
        function click(edit: CLineEdit, text: string, position: number, count: number,
            type = CEventType.MousePress, button = CMouseButton.LeftButton): CMouseEvent {
            const metrics = new CFontMetrics(edit.font());
            // These selection tests click characters in fully visible text.
            edit.resize(Math.ceil(metrics.textWidth(text)) + 20, 28);
            const x = 5 + metrics.textWidth(text.slice(0, position))
                + metrics.textWidth(text[position] ?? "") / 4;
            const event = new CMouseEvent(type, x, 10, button, false, count);
            edit.event(event);
            return event;
        }
        test("double press selects the clicked word and release preserves it", () => {
            const edit = new CLineEdit();
            edit.setText("Hello world");
            click(edit, "Hello world", 7, 2);
            expect(edit.selectedText()).toBe("world");
            click(edit, "Hello world", 7, 2, CEventType.MouseRelease);
            expect(edit.selectedText()).toBe("world");
        });
        test("native double-click event selects a word", () => {
            const edit = new CLineEdit();
            edit.setText("Hello world");
            click(edit, "Hello world", 2, 2, CEventType.MouseDoubleClick);
            expect(edit.selectedText()).toBe("Hello");
        });
        test("double click selects Unicode words", () => {
            const edit = new CLineEdit();
            edit.setText("Hi čebelar_42!");
            click(edit, "Hi čebelar_42!", 5, 2);
            expect(edit.selectedText()).toBe("čebelar_42");
        });
        test("double click selects spaces without adjoining words", () => {
            const edit = new CLineEdit();
            edit.setText("one   two");
            click(edit, "one   two", 4, 2);
            expect(edit.selectedText()).toBe("   ");
        });
        test("triple click selects the entire line", () => {
            const edit = new CLineEdit();
            edit.setText("Hello world");
            click(edit, "Hello world", 2, 3);
            expect(edit.selectedText()).toBe("Hello world");
            click(edit, "Hello world", 2, 3, CEventType.MouseRelease);
            expect(edit.selectedText()).toBe("Hello world");
        });
        test("read-only editor still allows word selection", () => {
            const edit = new CLineEdit();
            edit.setText("Hello world"); edit.setReadOnly(true);
            click(edit, "Hello world", 2, 2);
            expect(edit.selectedText()).toBe("Hello");
            expect(edit.canUndo()).toBe(false);
        });
        test("right double click preserves an existing selection", () => {
            const edit = new CLineEdit();
            edit.setText("Hello world"); edit.setSelection(0, 5);
            const event = click(edit, "Hello world", 7, 2,
                CEventType.MouseDoubleClick, CMouseButton.RightButton);
            expect(event.isAccepted()).toBe(false);
            expect(edit.selectedText()).toBe("Hello");
        });
        test("typing over a selected word is undoable", () => {
            const edit = new CLineEdit();
            edit.setText("Hello world");
            click(edit, "Hello world", 7, 2);
            edit.insert("Bojan");
            expect(edit.text()).toBe("Hello Bojan");
            edit.undo();
            expect(edit.text()).toBe("Hello world");
            expect(edit.selectedText()).toBe("world");
        });
    });


    describe("word keyboard navigation", () => {
        function press(edit: CLineEdit, key: string, shift = false): CKeyEvent {
            const event = new CKeyEvent(CEventType.KeyPress, key, true, shift);
            edit.event(event);
            return event;
        }
        test("Ctrl+Left moves to preceding word starts", () => {
            const edit = new CLineEdit();
            edit.setText("one two three");
            press(edit, "ArrowLeft"); expect(edit.cursorPosition()).toBe(8);
            press(edit, "ArrowLeft"); expect(edit.cursorPosition()).toBe(4);
            press(edit, "ArrowLeft"); expect(edit.cursorPosition()).toBe(0);
            press(edit, "ArrowLeft"); expect(edit.cursorPosition()).toBe(0);
        });
        test("Ctrl+Right moves to following word starts and clamps at the end", () => {
            const edit = new CLineEdit();
            edit.setText("one two three"); edit.setCursorPosition(0);
            press(edit, "ArrowRight"); expect(edit.cursorPosition()).toBe(4);
            press(edit, "ArrowRight"); expect(edit.cursorPosition()).toBe(8);
            press(edit, "ArrowRight"); expect(edit.cursorPosition()).toBe(13);
            press(edit, "ArrowRight"); expect(edit.cursorPosition()).toBe(13);
        });
        test("Ctrl+Shift keeps the selection anchor when reversing direction", () => {
            const edit = new CLineEdit();
            edit.setText("one two three"); edit.setCursorPosition(4);
            press(edit, "ArrowRight", true);
            expect(edit.selectedText()).toBe("two ");
            press(edit, "ArrowLeft", true);
            expect(edit.hasSelection()).toBe(false);
            press(edit, "ArrowLeft", true);
            expect(edit.selectedText()).toBe("one ");
            expect(edit.cursorPosition()).toBe(0);
        });
        test("Ctrl navigation clears a selection without changing text or history", () => {
            const edit = new CLineEdit();
            edit.setText("one two three"); edit.setSelection(0, 4);
            const event = press(edit, "ArrowRight");
            expect(edit.hasSelection()).toBe(false);
            expect(edit.cursorPosition()).toBe(8);
            expect(edit.text()).toBe("one two three");
            expect(edit.canUndo()).toBe(false);
            expect(event.isAccepted()).toBe(true);
        });
        test("Ctrl+Backspace deletes one word and restores the original cursor", () => {
            const edit = new CLineEdit();
            edit.setText("one two");
            press(edit, "Backspace"); expect(edit.text()).toBe("one ");
            edit.undo(); expect(edit.text()).toBe("one two");
            expect(edit.cursorPosition()).toBe(7);
            edit.redo(); expect(edit.text()).toBe("one ");
        });
        test("Ctrl+Delete removes the following word and its whitespace", () => {
            const edit = new CLineEdit();
            edit.setText("one two"); edit.setCursorPosition(0);
            press(edit, "Delete"); expect(edit.text()).toBe("two");
            edit.undo(); expect(edit.text()).toBe("one two");
            expect(edit.cursorPosition()).toBe(0);
            edit.redo(); expect(edit.text()).toBe("two");
        });
        test("successive word deletions remain separate undo steps", () => {
            const edit = new CLineEdit();
            edit.setText("one two three");
            press(edit, "Backspace"); press(edit, "Backspace");
            expect(edit.text()).toBe("one ");
            edit.undo(); expect(edit.text()).toBe("one two ");
            edit.undo(); expect(edit.text()).toBe("one two three");
        });
        test("word deletion removes only the existing backwards selection", () => {
            const edit = new CLineEdit();
            edit.setText("one two three"); edit.setSelection(7, 4);
            press(edit, "Delete"); expect(edit.text()).toBe("one  three");
            edit.undo();
            expect(edit.text()).toBe("one two three");
            expect(edit.selectedText()).toBe("two");
            expect(edit.cursorPosition()).toBe(4);
        });
        test("word deletion at a boundary creates no undo step", () => {
            const edit = new CLineEdit();
            edit.setText("one"); edit.setCursorPosition(0);
            press(edit, "Backspace");
            edit.setCursorPosition(3); press(edit, "Delete");
            expect(edit.text()).toBe("one");
            expect(edit.canUndo()).toBe(false);
        });
        test("read-only mode permits word navigation and selection but blocks deletion", () => {
            const edit = new CLineEdit();
            edit.setText("one two"); edit.setReadOnly(true);
            press(edit, "ArrowLeft"); expect(edit.cursorPosition()).toBe(4);
            press(edit, "ArrowLeft", true); expect(edit.selectedText()).toBe("one ");
            press(edit, "Backspace"); press(edit, "Delete");
            expect(edit.text()).toBe("one two");
            expect(edit.canUndo()).toBe(false);
        });
        test("word navigation ends the current typing undo group", () => {
            const edit = new CLineEdit();
            for (const key of "one two")
                edit.event(new CKeyEvent(CEventType.KeyPress, key));
            press(edit, "ArrowLeft");
            edit.event(new CKeyEvent(CEventType.KeyPress, "X"));
            edit.undo(); expect(edit.text()).toBe("one two");
            edit.undo(); expect(edit.text()).toBe("");
        });
        test("new word deletion after undo discards redo", () => {
            const edit = new CLineEdit();
            edit.setText("one two"); edit.insert(" three"); edit.undo();
            press(edit, "Backspace");
            expect(edit.canRedo()).toBe(false);
            expect(edit.text()).toBe("one ");
        });

    });


    describe("horizontal scrolling", () => {
        const text = "abcdefghijklmnopqrstuvwxyz".repeat(3);
        function editor(): CLineEdit {
            const edit = new CLineEdit();
            edit.resize(90, 28);
            edit.setText(text);
            return edit;
        }
        function expectCursorVisible(edit: CLineEdit): void {
            const metrics = new CFontMetrics(edit.font());
            const x = 5 + metrics.textWidth(edit.text().slice(0, edit.cursorPosition()))
                - edit.horizontalOffset();
            expect(x).toBeGreaterThanOrEqual(5);
            expect(x).toBeLessThanOrEqual(edit.width() - 6);
        }
        test("long programmatic text keeps the end visible", () => {
            const edit = editor();
            expect(edit.horizontalOffset()).toBeGreaterThan(0);
            expectCursorVisible(edit);
        });
        test("style options carry and copy the text offset", () => {
            const edit = editor();
            const option = new CStyleOptionLineEdit();
            option.initFromLineEdit(edit);
            expect(option.horizontalOffset).toBe(edit.horizontalOffset());
            const copy = new CStyleOptionLineEdit(option);
            expect(copy.horizontalOffset).toBe(option.horizontalOffset);
            expect(copy.horizontalOffset).toBeGreaterThan(0);
        });
        test("native double-click selects a visible word after horizontal scrolling", () => {
            const edit = new CLineEdit();
            edit.resize(100, 28);
            const text = "A long prefix ".repeat(10) + "world";
            edit.setText(text);
            const metrics = new CFontMetrics(edit.font());
            const x = 5 + metrics.textWidth(text.slice(0, -5))
                + metrics.textWidth("w") / 4 - edit.horizontalOffset();
            expect(edit.horizontalOffset()).toBeGreaterThan(0);
            expect(x).toBeGreaterThanOrEqual(5);
            expect(x).toBeLessThan(edit.width() - 5);
            edit.event(new CMouseEvent(CEventType.MouseDoubleClick, x, 14,
                CMouseButton.LeftButton, false, 2));
            expect(edit.selectedText()).toBe("world");
        });
        test("double-click selects the first word after returning to the start", () => {
            const edit = new CLineEdit();
            edit.resize(100, 28);
            edit.setText("Hello " + "a long tail ".repeat(10));
            expect(edit.horizontalOffset()).toBeGreaterThan(0);
            edit.setCursorPosition(0);
            expect(edit.horizontalOffset()).toBe(0);
            const x = 5 + new CFontMetrics(edit.font()).textWidth("H") / 4;
            edit.event(new CMouseEvent(CEventType.MousePress, x, 14,
                CMouseButton.LeftButton, false, 2));
            expect(edit.selectedText()).toBe("Hello");
        });
        test("short text has no offset", () => {
            const edit = editor();
            edit.setText("Hi");
            expect(edit.horizontalOffset()).toBe(0);
        });
        test("Home and End reveal the corresponding ends", () => {
            const edit = editor();
            edit.event(new CKeyEvent(CEventType.KeyPress, "Home"));
            expect(edit.horizontalOffset()).toBe(0);
            edit.event(new CKeyEvent(CEventType.KeyPress, "End"));
            expect(edit.cursorPosition()).toBe(text.length);
            expectCursorVisible(edit);
        });
        test("arrow navigation keeps every cursor position visible", () => {
            const edit = editor();
            for (let i = 0; i < text.length; ++i) {
                edit.event(new CKeyEvent(CEventType.KeyPress, "ArrowLeft"));
                expectCursorVisible(edit);
            }
            for (let i = 0; i < text.length; ++i) {
                edit.event(new CKeyEvent(CEventType.KeyPress, "ArrowRight"));
                expectCursorVisible(edit);
            }
        });
        test("inserting and undoing a long string updates the visible range", () => {
            const edit = editor();
            edit.setText("");
            edit.insert(text);
            expectCursorVisible(edit);
            edit.undo();
            expect(edit.horizontalOffset()).toBe(0);
            edit.redo();
            expect(edit.text()).toBe(text);
            expectCursorVisible(edit);
        });
        test("resizing rechecks cursor visibility and removes unused offset", () => {
            const edit = editor();
            edit.resize(40, 28);
            expectCursorVisible(edit);
            edit.resize(new CFontMetrics(edit.font()).textWidth(text) + 20, 28);
            expect(edit.horizontalOffset()).toBe(0);
        });
        test("selection follows its active end in both directions", () => {
            const edit = editor();
            edit.setSelection(0, text.length);
            expectCursorVisible(edit);
            edit.setSelection(text.length, 0);
            expect(edit.horizontalOffset()).toBe(0);
            expect(edit.selectedText()).toBe(text);
        });
        test("mouse hit testing includes the displayed text offset", () => {
            const edit = editor();
            const metrics = new CFontMetrics(edit.font());
            const offset = edit.horizontalOffset();
            const x = 30;
            let expected = text.length;
            for (let i = 1; i <= text.length; ++i) {
                const midpoint = (metrics.textWidth(text.slice(0, i - 1))
                    + metrics.textWidth(text.slice(0, i))) / 2;
                if (x - 5 + offset < midpoint) { expected = i - 1; break; }
            }
            edit.event(new CMouseEvent(CEventType.MousePress, x, 14,
                CMouseButton.LeftButton));
            expect(edit.cursorPosition()).toBe(expected);
            expectCursorVisible(edit);
        });
        test("dragging beyond the edge continues scrolling until release", () => {
            vi.useFakeTimers();
            const edit = editor();
            edit.setCursorPosition(0);
            edit.event(new CMouseEvent(CEventType.MousePress, 5, 14,
                CMouseButton.LeftButton));
            edit.event(new CMouseEvent(CEventType.MouseMove, 100, 14,
                CMouseButton.LeftButton));
            const first = edit.cursorPosition();
            vi.advanceTimersByTime(200);
            expect(edit.cursorPosition()).toBeGreaterThan(first);
            expect(edit.horizontalOffset()).toBeGreaterThan(0);
            expect(edit.hasSelection()).toBe(true);
            edit.event(new CMouseEvent(CEventType.MouseRelease, 100, 14,
                CMouseButton.LeftButton));
            const released = edit.cursorPosition();
            vi.advanceTimersByTime(200);
            expect(edit.cursorPosition()).toBe(released);
            edit.destroy();
        });
        test("dragging left reveals the beginning without losing the anchor", () => {
            vi.useFakeTimers();
            const edit = editor();
            edit.event(new CMouseEvent(CEventType.MousePress, 84, 14,
                CMouseButton.LeftButton));
            const anchor = edit.cursorPosition();
            edit.event(new CMouseEvent(CEventType.MouseMove, -10, 14,
                CMouseButton.LeftButton));
            vi.advanceTimersByTime(text.length * 40);
            expect(edit.cursorPosition()).toBe(0);
            expect(edit.horizontalOffset()).toBe(0);
            expect(edit.selectionEnd()).toBe(anchor);
            edit.destroy();
        });
    });

    describe("placeholder text", () => {
        test("is empty by default", () => {
            const edit = new CLineEdit();
            expect(edit.placeholderText()).toBe("");
        });

        test("stores and replaces Unicode placeholder text", () => {
            const edit = new CLineEdit();
            edit.setPlaceholderText("Vpiši število …");
            expect(edit.placeholderText()).toBe("Vpiši število …");
            edit.setPlaceholderText("Drugi namig");
            expect(edit.placeholderText()).toBe("Drugi namig");
            edit.setPlaceholderText("");
            expect(edit.placeholderText()).toBe("");
        });

        test("requests a repaint when changed or removed", () => {
            const edit = new CLineEdit();
            const update = vi.spyOn(edit, "update");
            edit.setPlaceholderText("Hint");
            expect(update).toHaveBeenCalled();
            update.mockClear();
            edit.setPlaceholderText("");
            expect(update).toHaveBeenCalled();
            update.mockRestore();
        });

        test("is not part of the text, cursor or selection", () => {
            const edit = new CLineEdit();
            edit.setPlaceholderText("This is placeholder");
            edit.selectAll();
            expect(edit.text()).toBe("");
            expect(edit.cursorPosition()).toBe(0);
            expect(edit.selectedText()).toBe("");
            expect(edit.hasSelection()).toBe(false);
        });

        test("does not emit text change or user editing signals", () => {
            const edit = new CLineEdit();
            const textChanged = vi.fn();
            const textEdited = vi.fn();
            edit.textChanged.connect(textChanged);
            edit.textEdited.connect(textEdited);
            edit.setPlaceholderText("Hint");
            edit.setPlaceholderText("Another hint");
            edit.setPlaceholderText("");
            expect(textChanged).not.toHaveBeenCalled();
            expect(textEdited).not.toHaveBeenCalled();
        });

        test("preserves existing text, cursor and selection", () => {
            const edit = new CLineEdit();
            edit.setText("Hello world");
            edit.setSelection(0, 5);
            const cursor = edit.cursorPosition();
            edit.setPlaceholderText("Hint");
            expect(edit.text()).toBe("Hello world");
            expect(edit.cursorPosition()).toBe(cursor);
            expect(edit.selectedText()).toBe("Hello");
        });

        test("survives typing and deletion back to an empty editor", () => {
            const edit = new CLineEdit();
            edit.setPlaceholderText("Hint");
            edit.insert("abc");
            expect(edit.text()).toBe("abc");
            expect(edit.placeholderText()).toBe("Hint");
            edit.selectAll();
            edit.event(new CKeyEvent(CEventType.KeyPress, "Backspace"));
            expect(edit.text()).toBe("");
            expect(edit.placeholderText()).toBe("Hint");
        });

        test("does not create undo commands", () => {
            const edit = new CLineEdit();
            edit.setPlaceholderText("Hint");
            expect(edit.canUndo()).toBe(false);
            expect(edit.canRedo()).toBe(false);
        });

        test("does not clear editing history and is independent of undo and redo", () => {
            const edit = new CLineEdit();
            edit.insert("abc");
            edit.setPlaceholderText("First hint");
            edit.undo();
            expect(edit.text()).toBe("");
            expect(edit.placeholderText()).toBe("First hint");
            edit.setPlaceholderText("Second hint");
            expect(edit.canRedo()).toBe(true);
            edit.redo();
            expect(edit.text()).toBe("abc");
            expect(edit.placeholderText()).toBe("Second hint");
        });

        test("does not copy the hint into the clipboard", () => {
            const edit = new CLineEdit();
            CClipboard.instance().withNativeClipboard(() =>
                CClipboard.instance().setText("Existing clipboard"));
            edit.setPlaceholderText("Hint");
            edit.selectAll();
            edit.copy();
            expect(CClipboard.instance().text()).toBe("Existing clipboard");
        });

        test("does not pass the hint through the input validator", () => {
            const edit = new CLineEdit();
            edit.setValidator(new CIntValidator(0, 100));
            edit.setPlaceholderText("Enter a number");
            expect(edit.placeholderText()).toBe("Enter a number");
            expect(edit.text()).toBe("");
            edit.insert("42");
            expect(edit.text()).toBe("42");
        });

        test("can be changed while read-only or disabled", () => {
            const edit = new CLineEdit();
            edit.setReadOnly(true);
            edit.setPlaceholderText("Read-only hint");
            expect(edit.placeholderText()).toBe("Read-only hint");
            edit.setEnabled(false);
            edit.setPlaceholderText("Disabled hint");
            expect(edit.placeholderText()).toBe("Disabled hint");
            expect(edit.text()).toBe("");
        });
    });
});

/** Records state at draw time, so later font changes cannot hide regressions. */
function recordingPainter() {
	let font = new CFont();
	let pen = "";
	const draws: Array<{ text: string; x: number; y: number; font: CFont; pen: string }> = [];
	const painter = {
		setFillStyle: vi.fn(), fillRect: vi.fn(), setStrokeStyle: vi.fn(),
		strokeRect: vi.fn(), save: vi.fn(), restore: vi.fn(), clipRect: vi.fn((_rect: CRect) => {}),
		setTextAlign: vi.fn(), setTextBaseline: vi.fn(), setBrush: vi.fn(),
		drawLine: vi.fn(),
		setFont: vi.fn((value: CFont) => { font = new CFont(value); }),
		setPen: vi.fn((value: string) => { pen = value; }),
		drawText: vi.fn((text: string, x: number, y: number) => {
			draws.push({ text, x, y, font: new CFont(font), pen });
		})
	};
	return { painter, draws, paint: painter as unknown as CPainter };
}

describe("line edit placeholder style", () => {
	let oldWindow: PropertyDescriptor | undefined;
	let style: CDefaultStyle;
	let option: CStyleOptionLineEdit;

	beforeEach(() => {
		oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
		Object.defineProperty(globalThis, "window", {
			value: createTestWindow(), configurable: true, writable: true
		});
		new CApplication(createTestCanvas());
		style = new CDefaultStyle();
		option = new CStyleOptionLineEdit();
		option.rect = new CRect(0, 0, 200, 30);
		option.state = CStyleState.Enabled;
		option.font = new CFont();
		option.font.setStyle(CFontStyle.Normal);
		option.placeholderText = "Vpiši ime …";
	});

	afterEach(() => {
		if (CApplication.exists()) CApplication.instance().destroy();
		if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
		else Reflect.deleteProperty(globalThis, "window");
	});

	test("style options default to no hint and no focus", () => {
		const empty = new CStyleOptionLineEdit();
		expect(empty.placeholderText).toBe("");
		expect(empty.focus).toBe(false);
	});

	test("initialization transfers placeholder and focus from the widget", () => {
		const edit = new CLineEdit();
		try {
			edit.setPlaceholderText("Widget hint");
			edit.setFocus();
			option.initFromLineEdit(edit);
			expect(option.placeholderText).toBe("Widget hint");
			expect(option.text).toBe("");
			expect(option.focus).toBe(true);
			expect(option.state & CStyleState.HasFocus).not.toBe(0);
			edit.clearFocus();
			edit.setPlaceholderText("Updated hint");
			option.initFromLineEdit(edit);
			expect(option.placeholderText).toBe("Updated hint");
			expect(option.focus).toBe(false);
		} finally { edit.destroy(); }
	});

	test("copy preserves the hint and both focus representations", () => {
		option.focus = true;
		option.state |= CStyleState.HasFocus;
		const copy = new CStyleOptionLineEdit(option);
		expect(copy.placeholderText).toBe(option.placeholderText);
		expect(copy.focus).toBe(true);
		expect(copy.state & CStyleState.HasFocus).not.toBe(0);
		copy.placeholderText = "Changed";
		expect(option.placeholderText).toBe("Vpiši ime …");
	});

	test("draws an unfocused empty editor hint with the placeholder palette role", () => {
		const result = recordingPainter();
		style.drawLineEdit(result.paint, option);
		expect(result.draws).toHaveLength(1);
		expect(result.draws[0]!.text).toBe(option.placeholderText);
		expect(result.draws[0]!.pen).toBe(
			option.palette.color(CPaletteColorRole.PlaceholderText).toCss());
		expect(result.draws[0]!.font.style()).toBe(CFontStyle.Italic);
	});

	test("drawing the hint does not mutate the supplied font", () => {
		const font = option.font;
		const original = font.toCss();
		style.drawLineEdit(recordingPainter().paint, option);
		expect(option.font).toBe(font);
		expect(option.font.toCss()).toBe(original);
	});

	test("ordinary text remains upright after drawing a hint with the same option", () => {
		style.drawLineEdit(recordingPainter().paint, option);
		option.text = "Actual value";
		const result = recordingPainter();
		style.drawLineEdit(result.paint, option);
		expect(result.draws[0]!.text).toBe("Actual value");
		expect(result.draws[0]!.font.style()).toBe(CFontStyle.Normal);
		expect(result.draws[0]!.pen).toBe(option.palette.color(CPaletteColorRole.Text).toCss());
	});

	test("existing text takes precedence over the placeholder", () => {
		option.text = "Entered text";
		const result = recordingPainter();
		style.drawLineEdit(result.paint, option);
		expect(result.draws.map(draw => draw.text)).toEqual(["Entered text"]);
	});

	test("hides the placeholder while the empty editor has focus", () => {
		option.focus = true;
		option.state |= CStyleState.HasFocus;
		option.cursorVisible = true;
		const result = recordingPainter();
		style.drawLineEdit(result.paint, option);
		expect(result.draws.some(draw => draw.text === option.placeholderText)).toBe(false);
		expect(result.painter.drawLine).toHaveBeenCalledOnce();
	});

	test("copying a focused option does not make its placeholder reappear", () => {
		option.focus = true;
		option.state |= CStyleState.HasFocus;
		const result = recordingPainter();
		style.drawLineEdit(result.paint, new CStyleOptionLineEdit(option));
		expect(result.draws.some(draw => draw.text === option.placeholderText)).toBe(false);
	});

	test("shows the hint again after losing focus", () => {
		option.focus = true;
		option.state |= CStyleState.HasFocus;
		style.drawLineEdit(recordingPainter().paint, option);
		option.focus = false;
		option.state &= ~CStyleState.HasFocus;
		const result = recordingPainter();
		style.drawLineEdit(result.paint, option);
		expect(result.draws[0]!.text).toBe(option.placeholderText);
	});

	test("selected text is drawn instead of the placeholder", () => {
		option.text = "abc";
		option.selectionStart = 0;
		option.selectionEnd = 3;
		const result = recordingPainter();
		style.drawLineEdit(result.paint, option);
		expect(result.draws.map(draw => draw.text).join("")).toBe("abc");
		expect(result.draws.find(draw => draw.text === "abc")!.pen).toBe(
			option.palette.color(CPaletteColorRole.HighlightedText).toCss());
	});

	test("clips the hint to the editor interior and restores painter state", () => {
		option.rect = new CRect(0, 0, 90, 28);
		option.placeholderText = "A much longer placeholder than the editor width";
		const result = recordingPainter();
		style.drawLineEdit(result.paint, option);
		const clip = result.painter.clipRect.mock.calls[0]![0];
		expect(clip.x()).toBe(5);
		expect(clip.y()).toBe(2);
		expect(clip.width()).toBe(80);
		expect(clip.height()).toBe(24);
		expect(result.painter.save).toHaveBeenCalledOnce();
		expect(result.painter.restore).toHaveBeenCalledOnce();
	});
});
