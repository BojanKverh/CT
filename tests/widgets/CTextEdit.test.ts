import {
	afterEach,
	beforeEach,
	describe,
	expect,
	test,
	vi
} from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CTextEdit } from "../../src/widgets/CTextEdit.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import {
	CMouseButton,
	CMouseEvent
} from "../../src/events/CMouseEvent.js";
import { CFontMetrics } from "../../src/gui/CFontMetrics.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";

describe("CTextEdit", () => {
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
		const edit = new CTextEdit();

		expect(edit.toPlainText()).toBe("");
	});

	test("has cursor at zero by default", () => {
		const edit = new CTextEdit();

		expect(edit.cursorPosition()).toBe(0);
	});

	test("sets plain text", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello\nWorld");

		expect(edit.toPlainText()).toBe("Hello\nWorld");
	});

	test("moves cursor to end when setting plain text", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello\nWorld");

		expect(edit.cursorPosition()).toBe(11);
	});

	test("emits textChanged when text changes", () => {
		const edit = new CTextEdit();
		const slot = vi.fn();

		edit.textChanged.connect(slot);
		edit.setPlainText("Hello");

		expect(slot).toHaveBeenCalledOnce();
	});

	test("does not emit textChanged when text is unchanged", () => {
		const edit = new CTextEdit();
		const slot = vi.fn();

		edit.setPlainText("Hello");
		edit.textChanged.connect(slot);

		edit.setPlainText("Hello");

		expect(slot).not.toHaveBeenCalled();
	});

	test("clears text", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello\nWorld");
		edit.clear();

		expect(edit.toPlainText()).toBe("");
		expect(edit.cursorPosition()).toBe(0);
	});

	test("sets cursor position", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setCursorPosition(2);

		expect(edit.cursorPosition()).toBe(2);
	});

	test("clamps cursor position below zero", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setCursorPosition(-10);

		expect(edit.cursorPosition()).toBe(0);
	});

	test("clamps cursor position beyond text length", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setCursorPosition(100);

		expect(edit.cursorPosition()).toBe(5);
	});

	test("inserts text at cursor position", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setCursorPosition(2);
		edit.insert("XY");

		expect(edit.toPlainText()).toBe("HeXYllo");
		expect(edit.cursorPosition()).toBe(4);
	});

	test("inserts multiline text", () => {
		const edit = new CTextEdit();

		edit.setPlainText("HelloWorld");
		edit.setCursorPosition(5);
		edit.insert("\nBeautiful\n");

		expect(edit.toPlainText())
			.toBe("Hello\nBeautiful\nWorld");
	});

	test("inserting empty text does nothing", () => {
		const edit = new CTextEdit();
		const slot = vi.fn();

		edit.setPlainText("Hello");
		edit.textChanged.connect(slot);

		edit.insert("");

		expect(edit.toPlainText()).toBe("Hello");
		expect(slot).not.toHaveBeenCalled();
	});

	test("has no selection by default", () => {
		const edit = new CTextEdit();

		expect(edit.hasSelection()).toBe(false);
		expect(edit.selectedText()).toBe("");
	});

	test("sets selection", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello World");
		edit.setSelection(1, 5);

		expect(edit.hasSelection()).toBe(true);
		expect(edit.selectionStart()).toBe(1);
		expect(edit.selectionEnd()).toBe(5);
		expect(edit.selectedText()).toBe("ello");
	});

	test("handles reverse selection", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello World");
		edit.setSelection(5, 1);

		expect(edit.selectionStart()).toBe(1);
		expect(edit.selectionEnd()).toBe(5);
		expect(edit.selectedText()).toBe("ello");
	});

	test("selection can span multiple lines", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello\nWorld\nAgain");
		edit.setSelection(3, 13);

		expect(edit.selectedText()).toBe("lo\nWorld\nA");
	});

	test("selectAll selects entire text", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello\nWorld");
		edit.selectAll();

		expect(edit.selectionStart()).toBe(0);
		expect(edit.selectionEnd()).toBe(11);
		expect(edit.selectedText()).toBe("Hello\nWorld");
	});

	test("clearSelection clears selection at cursor", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setSelection(1, 4);
		edit.clearSelection();

		expect(edit.hasSelection()).toBe(false);
		expect(edit.selectionStart()).toBe(4);
		expect(edit.selectionEnd()).toBe(4);
	});

	test("setting cursor position clears selection", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setSelection(1, 4);
		edit.setCursorPosition(2);

		expect(edit.hasSelection()).toBe(false);
		expect(edit.cursorPosition()).toBe(2);
	});

	test("insert replaces selected text", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello World");
		edit.setSelection(6, 11);
		edit.insert("Canvas");

		expect(edit.toPlainText()).toBe("Hello Canvas");
		expect(edit.cursorPosition()).toBe(12);
		expect(edit.hasSelection()).toBe(false);
	});

	test("Enter inserts newline", () => {
		const edit = new CTextEdit();

		edit.setPlainText("HelloWorld");
		edit.setCursorPosition(5);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Enter"
		));

		expect(edit.toPlainText()).toBe("Hello\nWorld");
		expect(edit.cursorPosition()).toBe(6);
	});

	test("Backspace removes character before cursor", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setCursorPosition(3);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Backspace"
		));

		expect(edit.toPlainText()).toBe("Helo");
		expect(edit.cursorPosition()).toBe(2);
	});

	test("Backspace joins lines at beginning of line", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello\nWorld");
		edit.setCursorPosition(6);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Backspace"
		));

		expect(edit.toPlainText()).toBe("HelloWorld");
		expect(edit.cursorPosition()).toBe(5);
	});

	test("Delete removes character after cursor", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setCursorPosition(2);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Delete"
		));

		expect(edit.toPlainText()).toBe("Helo");
		expect(edit.cursorPosition()).toBe(2);
	});

	test("Delete joins lines at end of line", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello\nWorld");
		edit.setCursorPosition(5);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Delete"
		));

		expect(edit.toPlainText()).toBe("HelloWorld");
		expect(edit.cursorPosition()).toBe(5);
	});

	test("Backspace deletes selected text", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello\nWorld");
		edit.setSelection(3, 8);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Backspace"
		));

		expect(edit.toPlainText()).toBe("Helrld");
		expect(edit.cursorPosition()).toBe(3);
		expect(edit.hasSelection()).toBe(false);
	});

	test("Delete deletes selected text", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello\nWorld");
		edit.setSelection(3, 8);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Delete"
		));

		expect(edit.toPlainText()).toBe("Helrld");
		expect(edit.cursorPosition()).toBe(3);
	});

	test("ArrowLeft moves cursor left", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setCursorPosition(3);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowLeft"
		));

		expect(edit.cursorPosition()).toBe(2);
	});

	test("ArrowRight moves cursor right", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setCursorPosition(2);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowRight"
		));

		expect(edit.cursorPosition()).toBe(3);
	});

	test("ArrowDown moves cursor to same column on next line", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello\nWorld");
		edit.setCursorPosition(2);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowDown"
		));

		expect(edit.cursorPosition()).toBe(8);
	});

	test("ArrowUp moves cursor to same column on previous line", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello\nWorld");
		edit.setCursorPosition(8);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowUp"
		));

		expect(edit.cursorPosition()).toBe(2);
	});

	test("ArrowDown clamps column to shorter line", () => {
		const edit = new CTextEdit();

		edit.setPlainText("abcdef\nxy");
		edit.setCursorPosition(5);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowDown"
		));

		expect(edit.cursorPosition()).toBe(9);
	});

	test("ArrowUp clamps column to shorter line", () => {
		const edit = new CTextEdit();

		edit.setPlainText("xy\nabcdef");
		edit.setCursorPosition(8);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowUp"
		));

		expect(edit.cursorPosition()).toBe(2);
	});

	test("ArrowUp does nothing on first line", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello\nWorld");
		edit.setCursorPosition(2);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowUp"
		));

		expect(edit.cursorPosition()).toBe(2);
	});

	test("ArrowDown does nothing on last line", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello\nWorld");
		edit.setCursorPosition(8);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowDown"
		));

		expect(edit.cursorPosition()).toBe(8);
	});

	test("Home moves cursor to beginning of current line", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello\nWorld");
		edit.setCursorPosition(9);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Home"
		));

		expect(edit.cursorPosition()).toBe(6);
	});

	test("End moves cursor to end of current line", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello\nWorld");
		edit.setCursorPosition(7);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"End"
		));

		expect(edit.cursorPosition()).toBe(11);
	});

	test("Shift+ArrowRight extends selection", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setCursorPosition(1);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowRight",
			false,
			true
		));

		expect(edit.selectionStart()).toBe(1);
		expect(edit.selectionEnd()).toBe(2);
		expect(edit.selectedText()).toBe("e");
	});

	test("Shift+ArrowDown extends selection across lines", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello\nWorld");
		edit.setCursorPosition(2);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowDown",
			false,
			true
		));

		expect(edit.selectionStart()).toBe(2);
		expect(edit.selectionEnd()).toBe(8);
		expect(edit.selectedText()).toBe("llo\nWo");
	});

	test("Ctrl+A selects all text", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello\nWorld");

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"a",
			true
		));

		expect(edit.selectedText()).toBe("Hello\nWorld");
	});

	test("is editable by default", () => {
		const edit = new CTextEdit();

		expect(edit.isReadOnly()).toBe(false);
	});

	test("sets read only state", () => {
		const edit = new CTextEdit();

		edit.setReadOnly();

		expect(edit.isReadOnly()).toBe(true);
	});

	test("read only prevents character insertion", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setReadOnly();
		edit.setCursorPosition(2);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"X"
		));

		expect(edit.toPlainText()).toBe("Hello");
	});

	test("read only prevents Enter", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setReadOnly();

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Enter"
		));

		expect(edit.toPlainText()).toBe("Hello");
	});

	test("read only prevents Backspace", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setReadOnly();

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Backspace"
		));

		expect(edit.toPlainText()).toBe("Hello");
	});

	test("read only prevents Delete", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setCursorPosition(0);
		edit.setReadOnly();

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Delete"
		));

		expect(edit.toPlainText()).toBe("Hello");
	});

	test("read only still allows cursor movement", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setCursorPosition(2);
		edit.setReadOnly();

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowRight"
		));

		expect(edit.cursorPosition()).toBe(3);
	});

	test("copies selected text", async () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello\nWorld");
		edit.setSelection(0, 5);

		await edit.copy();

		expect(navigator.clipboard.writeText)
			.toHaveBeenCalledWith("Hello");
	});

	test("copies from read only editor", async () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setSelection(0, 5);
		edit.setReadOnly();

		await edit.copy();

		expect(navigator.clipboard.writeText)
			.toHaveBeenCalledWith("Hello");
	});

	test("cuts selected text", async () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello World");
		edit.setSelection(0, 6);

		await edit.cut();

		expect(navigator.clipboard.writeText)
			.toHaveBeenCalledWith("Hello ");
		expect(edit.toPlainText()).toBe("World");
	});

	test("cut copies but does not modify read only text", async () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setSelection(0, 5);
		edit.setReadOnly();

		await edit.cut();

		expect(navigator.clipboard.writeText)
			.toHaveBeenCalledWith("Hello");
		expect(edit.toPlainText()).toBe("Hello");
	});

	test("pastes text at cursor position", async () => {
		vi.mocked(navigator.clipboard.readText)
			.mockResolvedValue("XY");

		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setCursorPosition(2);

		await edit.paste();

		expect(edit.toPlainText()).toBe("HeXYllo");
		expect(edit.cursorPosition()).toBe(4);
	});

	test("paste supports multiline clipboard text", async () => {
		vi.mocked(navigator.clipboard.readText)
			.mockResolvedValue("A\nB");

		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setCursorPosition(2);

		await edit.paste();

		expect(edit.toPlainText()).toBe("HeA\nBllo");
	});

	test("read only prevents paste", async () => {
		vi.mocked(navigator.clipboard.readText)
			.mockResolvedValue("XY");

		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setReadOnly();

		await edit.paste();

		expect(navigator.clipboard.readText)
			.not.toHaveBeenCalled();
		expect(edit.toPlainText()).toBe("Hello");
	});

	test("cursor starts blinking when focused", () => {
		vi.useFakeTimers();

		const edit = new CTextEdit();

		edit.setFocus();

		expect(edit.cursorVisible()).toBe(true);

		vi.advanceTimersByTime(500);

		expect(edit.cursorVisible()).toBe(false);

		vi.advanceTimersByTime(500);

		expect(edit.cursorVisible()).toBe(true);
	});

	test("editing resets cursor blink", () => {
		vi.useFakeTimers();

		const edit = new CTextEdit();

		edit.setFocus();

		vi.advanceTimersByTime(500);

		expect(edit.cursorVisible()).toBe(false);

		edit.insert("A");

		expect(edit.cursorVisible()).toBe(true);
	});

	test("size hint is 240 by 120", () => {
		const edit = new CTextEdit();

		expect(edit.sizeHint().width()).toBe(240);
		expect(edit.sizeHint().height()).toBe(120);
	});

	test("left mouse press places cursor on clicked line", () => {
		const edit = new CTextEdit();

		edit.resize(200, 100);
		edit.setPlainText("Hello\nWorld");

		const metrics = new CFontMetrics(edit.font());
		const x = 5 + metrics.textWidth("Wo") + 1;

		edit.event(new CMouseEvent(
			CEventType.MousePress,
			x,
			5 + 18 + 5,
			CMouseButton.LeftButton
		));

		expect(edit.cursorPosition()).toBe(8);
	});

	test("right mouse press is ignored", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		const originalPosition = edit.cursorPosition();

		const event = new CMouseEvent(
			CEventType.MousePress,
			5,
			5,
			CMouseButton.RightButton
		);

		edit.event(event);

		expect(edit.cursorPosition()).toBe(originalPosition);
		expect(event.isAccepted()).toBe(false);
	});

	test("mouse drag creates selection across lines", () => {
		const edit = new CTextEdit();

		edit.resize(200, 100);
		edit.setPlainText("Hello\nWorld");

		const metrics = new CFontMetrics(edit.font());

		const startX = 5 + metrics.textWidth("He");
		const endX = 5 + metrics.textWidth("Wor");

		edit.event(new CMouseEvent(
			CEventType.MousePress,
			startX,
			8,
			CMouseButton.LeftButton
		));

		edit.event(new CMouseEvent(
			CEventType.MouseMove,
			endX,
			5 + 18 + 8,
			CMouseButton.NoButton
		));

		expect(edit.selectionStart()).toBe(2);
		expect(edit.selectionEnd()).toBe(9);
		expect(edit.selectedText()).toBe("llo\nWor");
	});

	test("emits selectionChanged when selection changes", () => {
		const edit = new CTextEdit();
		const slot = vi.fn();

		edit.setPlainText("Hello");
		edit.selectionChanged.connect(slot);

		edit.setSelection(1, 4);

		expect(slot).toHaveBeenCalledOnce();
	});

	test("does not emit selectionChanged for identical selection", () => {
		const edit = new CTextEdit();
		const slot = vi.fn();

		edit.setPlainText("Hello");
		edit.setSelection(1, 4);

		edit.selectionChanged.connect(slot);
		edit.setSelection(1, 4);

		expect(slot).not.toHaveBeenCalled();
	});
});