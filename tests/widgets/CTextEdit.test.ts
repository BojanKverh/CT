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
		edit.event(new CKeyEvent(CEventType.KeyPress, "a", true));

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
		const content = edit.widget()!;

		content.event(new CMouseEvent(
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
		const content = edit.widget()!;

		content.event(new CMouseEvent(
			CEventType.MousePress,
			startX,
			8,
			CMouseButton.LeftButton
		));

		content.event(new CMouseEvent(
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

	test("vertical scrollbar is hidden for short text", () => {
		const edit = new CTextEdit();

		edit.resize(240, 120);
		edit.setPlainText("Hello\nWorld");

		expect(edit.verticalScrollBar().isVisible()).toBe(false);
	});

	test("vertical scrollbar is shown for tall content", () => {
		const edit = new CTextEdit();

		edit.resize(240, 80);
		edit.setPlainText(
			"1\n2\n3\n4\n5\n6\n7\n8\n9\n10"
		);

		expect(edit.verticalScrollBar().isVisible()).toBe(true);
	});

	test("horizontal scrollbar is hidden for short lines", () => {
		const edit = new CTextEdit();

		edit.resize(240, 120);
		edit.setPlainText("Hello\nWorld");

		expect(edit.horizontalScrollBar().isVisible()).toBe(false);
	});

	test("horizontal scrollbar is shown for long line", () => {
		const edit = new CTextEdit();

		edit.resize(120, 120);
		edit.setPlainText(
			"This is a very long line that does not fit."
		);

		expect(edit.horizontalScrollBar().isVisible()).toBe(true);
	});

	test("vertical scrollbar maximum matches content overflow", () => {
		const edit = new CTextEdit();

		edit.resize(240, 80);
		edit.setPlainText(
			"1\n2\n3\n4\n5\n6\n7\n8\n9\n10"
		);

		expect(edit.verticalScrollBar().maximum()).toBeGreaterThan(0);
		expect(edit.verticalScrollBar().maximum()).toBe(
			edit.widget()!.height() - edit.viewport().height()
		);
	});

	test("horizontal scrollbar maximum matches content overflow", () => {
		const edit = new CTextEdit();

		edit.resize(120, 120);
		edit.setPlainText(
			"This is a very long line that does not fit."
		);

		expect(edit.horizontalScrollBar().maximum()).toBeGreaterThan(0);
		expect(edit.horizontalScrollBar().maximum()).toBe(
			edit.widget()!.width() - edit.viewport().width()
		);
	});

	test("setting vertical scrollbar value scrolls content", () => {
		const edit = new CTextEdit();

		edit.resize(240, 80);
		edit.setPlainText(
			"1\n2\n3\n4\n5\n6\n7\n8\n9\n10"
		);

		edit.verticalScrollBar().setValue(20);

		expect(edit.scrollY()).toBe(20);
		expect(edit.widget()!.y()).toBe(-20);
	});

	test("setting horizontal scrollbar value scrolls content", () => {
		const edit = new CTextEdit();

		edit.resize(120, 120);
		edit.setPlainText(
			"This is a very long line that does not fit."
		);

		edit.horizontalScrollBar().setValue(20);

		expect(edit.scrollX()).toBe(20);
		expect(edit.widget()!.x()).toBe(-20);
	});

	test("moving cursor down scrolls vertically to keep it visible", () => {
		const edit = new CTextEdit();

		edit.resize(240, 60);
		edit.setPlainText(
			"1\n2\n3\n4\n5\n6\n7\n8\n9\n10"
		);
		edit.setCursorPosition(0);

		expect(edit.scrollY()).toBe(0);

		for (let i = 0; i < 8; ++i) {
			edit.event(new CKeyEvent(
				CEventType.KeyPress,
				"ArrowDown"
			));
		}

		expect(edit.scrollY()).toBeGreaterThan(0);
	});

	test("moving cursor back up scrolls vertically toward top", () => {
		const edit = new CTextEdit();

		edit.resize(240, 60);
		edit.setPlainText(
			"1\n2\n3\n4\n5\n6\n7\n8\n9\n10"
		);

		for (let i = 0; i < 9; ++i) {
			edit.event(new CKeyEvent(
				CEventType.KeyPress,
				"ArrowUp"
			));
		}

		expect(edit.scrollY()).toBe(0);
	});

	test("moving cursor right scrolls horizontally to keep it visible", () => {
		const edit = new CTextEdit();

		edit.resize(100, 80);
		edit.setPlainText(
			"abcdefghijklmnopqrstuvwxyz"
		);
		edit.setCursorPosition(0);

		expect(edit.scrollX()).toBe(0);

		for (let i = 0; i < 20; ++i) {
			edit.event(new CKeyEvent(
				CEventType.KeyPress,
				"ArrowRight"
			));
		}

		expect(edit.scrollX()).toBeGreaterThan(0);
	});

	test("moving cursor back left scrolls horizontally toward start", () => {
		const edit = new CTextEdit();

		edit.resize(100, 80);
		edit.setPlainText(
			"abcdefghijklmnopqrstuvwxyz"
		);

		for (let i = 0; i < 26; ++i) {
			edit.event(new CKeyEvent(
				CEventType.KeyPress,
				"ArrowLeft"
			));
		}

		expect(edit.scrollX()).toBe(0);
	});

	test("setting cursor position ensures it is vertically visible", () => {
		const edit = new CTextEdit();

		edit.resize(240, 60);
		edit.setPlainText(
			"1\n2\n3\n4\n5\n6\n7\n8\n9\n10"
		);

		edit.setCursorPosition(edit.toPlainText().length);

		expect(edit.scrollY()).toBeGreaterThan(0);
	});

	test("setting cursor position ensures it is horizontally visible", () => {
		const edit = new CTextEdit();

		edit.resize(100, 80);
		edit.setPlainText(
			"abcdefghijklmnopqrstuvwxyz"
		);

		edit.setCursorPosition(edit.toPlainText().length);

		expect(edit.scrollX()).toBeGreaterThan(0);
	});

	test("shrinking text hides vertical scrollbar", () => {
		const edit = new CTextEdit();

		edit.resize(240, 80);
		edit.setPlainText(
			"1\n2\n3\n4\n5\n6\n7\n8\n9\n10"
		);

		expect(edit.verticalScrollBar().isVisible()).toBe(true);

		edit.setPlainText("Hello");

		expect(edit.verticalScrollBar().isVisible()).toBe(false);
		expect(edit.scrollY()).toBe(0);
	});

	test("shrinking line hides horizontal scrollbar", () => {
		const edit = new CTextEdit();

		edit.resize(100, 80);
		edit.setPlainText(
			"abcdefghijklmnopqrstuvwxyz"
		);

		expect(edit.horizontalScrollBar().isVisible()).toBe(true);

		edit.setPlainText("Hello");

		expect(edit.horizontalScrollBar().isVisible()).toBe(false);
		expect(edit.scrollX()).toBe(0);
	});

	test("clear resets scroll position", () => {
		const edit = new CTextEdit();

		edit.resize(100, 60);
		edit.setPlainText(
			"abcdefghijklmnopqrstuvwxyz\n"
			+ "2\n3\n4\n5\n6\n7\n8\n9"
		);

		edit.scrollTo(20, 20);

		expect(edit.scrollX()).toBeGreaterThan(0);
		expect(edit.scrollY()).toBeGreaterThan(0);

		edit.clear();

		expect(edit.scrollX()).toBe(0);
		expect(edit.scrollY()).toBe(0);
	});

	test("resizing larger hides no longer needed scrollbars", () => {
		const edit = new CTextEdit();

		edit.resize(100, 60);
		edit.setPlainText(
			"abcdefghijklmnopqrstuvwxyz\n"
			+ "2\n3\n4\n5\n6\n7\n8"
		);

		expect(
			edit.horizontalScrollBar().isVisible()
			|| edit.verticalScrollBar().isVisible()
		).toBe(true);

		edit.resize(800, 600);

		expect(edit.horizontalScrollBar().isVisible()).toBe(false);
		expect(edit.verticalScrollBar().isVisible()).toBe(false);
		expect(edit.scrollX()).toBe(0);
		expect(edit.scrollY()).toBe(0);
	});

	test("vertical scrollbar single step equals line height", () => {
		const edit = new CTextEdit();

		expect(edit.verticalScrollBar().singleStep()).toBe(18);
	});

	test("mouse position remains correct after vertical scrolling", () => {
		const edit = new CTextEdit();

		edit.resize(200, 60);
		edit.setPlainText(
			"Line0\nLine1\nLine2\nLine3\nLine4\nLine5"
		);

		edit.setScrollY(36);

		const content = edit.widget()!;

		content.event(new CMouseEvent(
			CEventType.MousePress,
			6,
			5 + edit.scrollY(),
			CMouseButton.LeftButton
		));

		expect(edit.cursorPosition()).toBe(12);
	});

    test("undo is unavailable initially", () => {
		const edit = new CTextEdit();

		expect(edit.canUndo()).toBe(false);
	});

	test("redo is unavailable initially", () => {
		const edit = new CTextEdit();

		expect(edit.canRedo()).toBe(false);
	});

	test("insert creates undo state", () => {
		const edit = new CTextEdit();

		edit.insert("Hello");

		expect(edit.canUndo()).toBe(true);
		expect(edit.canRedo()).toBe(false);
	});

	test("undo restores text before insert", () => {
		const edit = new CTextEdit();

		edit.insert("Hello");
		edit.undo();

		expect(edit.toPlainText()).toBe("");
		expect(edit.cursorPosition()).toBe(0);
		expect(edit.canUndo()).toBe(false);
		expect(edit.canRedo()).toBe(true);
	});

	test("redo restores undone insert", () => {
		const edit = new CTextEdit();

		edit.insert("Hello");
		edit.undo();
		edit.redo();

		expect(edit.toPlainText()).toBe("Hello");
		expect(edit.cursorPosition()).toBe(5);
		expect(edit.canUndo()).toBe(true);
		expect(edit.canRedo()).toBe(false);
	});

	test("multiple edits can be undone in reverse order", () => {
		const edit = new CTextEdit();

		edit.insert("A");
		edit.insert("B");
		edit.insert("C");

		expect(edit.toPlainText()).toBe("ABC");

		edit.undo();
		expect(edit.toPlainText()).toBe("AB");

		edit.undo();
		expect(edit.toPlainText()).toBe("A");

		edit.undo();
		expect(edit.toPlainText()).toBe("");
	});

	test("multiple undone edits can be redone", () => {
		const edit = new CTextEdit();

		edit.insert("A");
		edit.insert("B");
		edit.insert("C");

		edit.undo();
		edit.undo();
		edit.undo();

		edit.redo();
		expect(edit.toPlainText()).toBe("A");

		edit.redo();
		expect(edit.toPlainText()).toBe("AB");

		edit.redo();
		expect(edit.toPlainText()).toBe("ABC");
	});

	test("new edit clears redo stack", () => {
		const edit = new CTextEdit();

		edit.insert("A");
		edit.insert("B");

		edit.undo();

		expect(edit.canRedo()).toBe(true);

		edit.insert("C");

		expect(edit.toPlainText()).toBe("AC");
		expect(edit.canRedo()).toBe(false);
	});

	test("undo does nothing when no undo state exists", () => {
		const edit = new CTextEdit();

		edit.undo();

		expect(edit.toPlainText()).toBe("");
		expect(edit.cursorPosition()).toBe(0);
	});

	test("redo does nothing when no redo state exists", () => {
		const edit = new CTextEdit();

		edit.redo();

		expect(edit.toPlainText()).toBe("");
		expect(edit.cursorPosition()).toBe(0);
	});

	test("undo restores cursor position", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setCursorPosition(2);
		edit.insert("X");

		expect(edit.cursorPosition()).toBe(3);

		edit.undo();

		expect(edit.toPlainText()).toBe("Hello");
		expect(edit.cursorPosition()).toBe(2);
	});

	test("redo restores cursor position", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setCursorPosition(2);
		edit.insert("X");

		edit.undo();
		edit.redo();

		expect(edit.toPlainText()).toBe("HeXllo");
		expect(edit.cursorPosition()).toBe(3);
	});

	test("undo restores selection replaced by insert", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello World");
		edit.setSelection(6, 11);

		edit.insert("CT");

		expect(edit.toPlainText()).toBe("Hello CT");
		expect(edit.hasSelection()).toBe(false);

		edit.undo();

		expect(edit.toPlainText()).toBe("Hello World");
		expect(edit.selectionStart()).toBe(6);
		expect(edit.selectionEnd()).toBe(11);
		expect(edit.selectedText()).toBe("World");
	});

	test("redo restores replacement of selection", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello World");
		edit.setSelection(6, 11);
		edit.insert("CT");

		edit.undo();
		edit.redo();

		expect(edit.toPlainText()).toBe("Hello CT");
		expect(edit.cursorPosition()).toBe(8);
		expect(edit.hasSelection()).toBe(false);
	});

	test("backspace can be undone", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Backspace"
		));

		expect(edit.toPlainText()).toBe("Hell");

		edit.undo();

		expect(edit.toPlainText()).toBe("Hello");
		expect(edit.cursorPosition()).toBe(5);
	});

	test("delete can be undone", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setCursorPosition(1);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Delete"
		));

		expect(edit.toPlainText()).toBe("Hllo");

		edit.undo();

		expect(edit.toPlainText()).toBe("Hello");
		expect(edit.cursorPosition()).toBe(1);
	});

	test("newline insertion can be undone", () => {
		const edit = new CTextEdit();

		edit.setPlainText("HelloWorld");
		edit.setCursorPosition(5);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Enter"
		));

		expect(edit.toPlainText()).toBe("Hello\nWorld");

		edit.undo();

		expect(edit.toPlainText()).toBe("HelloWorld");
		expect(edit.cursorPosition()).toBe(5);
	});

	test("clear can be undone", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.clear();

		expect(edit.toPlainText()).toBe("");

		edit.undo();

		expect(edit.toPlainText()).toBe("Hello");
		expect(edit.cursorPosition()).toBe(5);
	});

	test("setPlainText clears undo and redo history", () => {
		const edit = new CTextEdit();

		edit.insert("A");
		edit.insert("B");
		edit.undo();

		expect(edit.canUndo()).toBe(true);
		expect(edit.canRedo()).toBe(true);

		edit.setPlainText("New text");

		expect(edit.canUndo()).toBe(false);
		expect(edit.canRedo()).toBe(false);
		expect(edit.toPlainText()).toBe("New text");
	});

	test("undo emits textChanged", () => {
		const edit = new CTextEdit();
		const callback = vi.fn();

		edit.insert("Hello");

		edit.textChanged.connect(callback);

		edit.undo();

		expect(callback).toHaveBeenCalledTimes(1);
	});

	test("redo emits textChanged", () => {
		const edit = new CTextEdit();
		const callback = vi.fn();

		edit.insert("Hello");
		edit.undo();

		edit.textChanged.connect(callback);

		edit.redo();

		expect(callback).toHaveBeenCalledTimes(1);
	});

	test("undo of replacement restores selection", () => {
		const edit = new CTextEdit();

		edit.setPlainText("abcdef");
		edit.setSelection(2, 5);

		edit.insert("X");
		edit.undo();

		expect(edit.selectionStart()).toBe(2);
		expect(edit.selectionEnd()).toBe(5);
		expect(edit.selectedText()).toBe("cde");
	});

	test("undo works after ordinary key input", () => {
		const edit = new CTextEdit();

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"A"
		));

		expect(edit.toPlainText()).toBe("A");

		edit.undo();

		expect(edit.toPlainText()).toBe("");
	});

	test("Ctrl+Z performs undo", () => {
		const edit = new CTextEdit();

		edit.insert("Hello");
		edit.event(new CKeyEvent(CEventType.KeyPress, "z", true));

		expect(edit.toPlainText()).toBe("");
	});

	test("Ctrl+Y performs redo", () => {
		const edit = new CTextEdit();

		edit.insert("Hello");
		edit.undo();
		edit.event(new CKeyEvent(CEventType.KeyPress, "y", true));

		expect(edit.toPlainText()).toBe("Hello");
	});

	test("Ctrl+Shift+Z performs redo", () => {
		const edit = new CTextEdit();

		edit.insert("Hello");
		edit.undo();
		edit.event(new CKeyEvent(CEventType.KeyPress, "z", true, true));

		expect(edit.toPlainText()).toBe("Hello");
	});

	test("undo is blocked in read-only mode only for new edits", () => {
		const edit = new CTextEdit();

		edit.insert("Hello");
		edit.setReadOnly(true);

		edit.undo();

		expect(edit.toPlainText()).toBe("");
	});

	test("read-only editing does not create undo state", () => {
		const edit = new CTextEdit();

		edit.setReadOnly(true);
		edit.insert("Hello");

		expect(edit.toPlainText()).toBe("");
		expect(edit.canUndo()).toBe(false);
	});

	test("undo updates content size after restoring longer text", () => {
		const edit = new CTextEdit();

		edit.resize(100, 60);
		edit.setPlainText(
			"1\n2\n3\n4\n5\n6\n7\n8"
		);

		edit.clear();

		expect(edit.verticalScrollBar().isVisible()).toBe(false);

		edit.undo();

		expect(edit.verticalScrollBar().isVisible()).toBe(true);
	});

	test("redo updates content size after restoring shorter text", () => {
		const edit = new CTextEdit();

		edit.resize(100, 60);
		edit.setPlainText(
			"1\n2\n3\n4\n5\n6\n7\n8"
		);

		edit.clear();
		edit.undo();
		edit.redo();

		expect(edit.toPlainText()).toBe("");
		expect(edit.verticalScrollBar().isVisible()).toBe(false);
	});

	test("undo ensures restored cursor is visible", () => {
		const edit = new CTextEdit();

		edit.resize(100, 60);
		edit.setPlainText(
			"1\n2\n3\n4\n5\n6\n7\n8\n9\n10"
		);

		edit.setCursorPosition(edit.toPlainText().length);
		edit.insert("X");

		edit.setCursorPosition(0);
		expect(edit.scrollY()).toBe(0);

		edit.undo();

		expect(edit.cursorPosition()).toBe(
			"1\n2\n3\n4\n5\n6\n7\n8\n9\n10".length
		);
		expect(edit.scrollY()).toBeGreaterThan(0);
	});

	test("consecutive typing is grouped into one undo", () => {
		const edit = new CTextEdit();

		for (const key of "Hello") {
			edit.event(new CKeyEvent(
				CEventType.KeyPress,
				key
			));
		}

		expect(edit.toPlainText()).toBe("Hello");

		edit.undo();

		expect(edit.toPlainText()).toBe("");
		expect(edit.canUndo()).toBe(false);
		expect(edit.canRedo()).toBe(true);
	});

	test("redo restores grouped typing", () => {
		const edit = new CTextEdit();

		for (const key of "Hello") {
			edit.event(new CKeyEvent(
				CEventType.KeyPress,
				key
			));
		}

		edit.undo();
		edit.redo();

		expect(edit.toPlainText()).toBe("Hello");
		expect(edit.cursorPosition()).toBe(5);
	});

	test("cursor movement breaks typing undo group", () => {
		const edit = new CTextEdit();

		for (const key of "Hello") {
			edit.event(new CKeyEvent(
				CEventType.KeyPress,
				key
			));
		}

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowLeft"
		));

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"X"
		));

		expect(edit.toPlainText()).toBe("HellXo");

		edit.undo();

		expect(edit.toPlainText()).toBe("Hello");
		expect(edit.cursorPosition()).toBe(4);

		edit.undo();

		expect(edit.toPlainText()).toBe("");
	});

	test("selection change breaks typing undo group", () => {
		const edit = new CTextEdit();

		for (const key of "Hello") {
			edit.event(new CKeyEvent(
				CEventType.KeyPress,
				key
			));
		}

		edit.setSelection(0, 2);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"X"
		));

		expect(edit.toPlainText()).toBe("Xllo");

		edit.undo();

		expect(edit.toPlainText()).toBe("Hello");
		expect(edit.selectedText()).toBe("He");

		edit.undo();

		expect(edit.toPlainText()).toBe("");
	});

	test("consecutive backspaces are grouped into one undo", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");

		for (let i = 0; i < 5; ++i) {
			edit.event(new CKeyEvent(
				CEventType.KeyPress,
				"Backspace"
			));
		}

		expect(edit.toPlainText()).toBe("");

		edit.undo();

		expect(edit.toPlainText()).toBe("Hello");
		expect(edit.cursorPosition()).toBe(5);
	});

	test("redo restores grouped backspaces", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");

		for (let i = 0; i < 3; ++i) {
			edit.event(new CKeyEvent(
				CEventType.KeyPress,
				"Backspace"
			));
		}

		expect(edit.toPlainText()).toBe("He");

		edit.undo();
		expect(edit.toPlainText()).toBe("Hello");

		edit.redo();
		expect(edit.toPlainText()).toBe("He");
	});

	test("cursor movement breaks backspace undo group", () => {
		const edit = new CTextEdit();

		edit.setPlainText("abcdef");

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Backspace"
		));

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Backspace"
		));

		expect(edit.toPlainText()).toBe("abcd");

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowLeft"
		));

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Backspace"
		));

		expect(edit.toPlainText()).toBe("abd");

		edit.undo();

		expect(edit.toPlainText()).toBe("abcd");
		expect(edit.cursorPosition()).toBe(3);

		edit.undo();

		expect(edit.toPlainText()).toBe("abcdef");
	});

	test("consecutive deletes are grouped into one undo", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setCursorPosition(0);

		for (let i = 0; i < 3; ++i) {
			edit.event(new CKeyEvent(
				CEventType.KeyPress,
				"Delete"
			));
		}

		expect(edit.toPlainText()).toBe("lo");

		edit.undo();

		expect(edit.toPlainText()).toBe("Hello");
		expect(edit.cursorPosition()).toBe(0);
	});

	test("redo restores grouped deletes", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setCursorPosition(0);

		for (let i = 0; i < 3; ++i) {
			edit.event(new CKeyEvent(
				CEventType.KeyPress,
				"Delete"
			));
		}

		edit.undo();
		edit.redo();

		expect(edit.toPlainText()).toBe("lo");
		expect(edit.cursorPosition()).toBe(0);
	});

	test("cursor movement breaks delete undo group", () => {
		const edit = new CTextEdit();

		edit.setPlainText("abcdef");
		edit.setCursorPosition(0);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Delete"
		));

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Delete"
		));

		expect(edit.toPlainText()).toBe("cdef");

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowRight"
		));

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Delete"
		));

		expect(edit.toPlainText()).toBe("cef");

		edit.undo();

		expect(edit.toPlainText()).toBe("cdef");

		edit.undo();

		expect(edit.toPlainText()).toBe("abcdef");
	});

	test("typing followed by backspace creates separate groups", () => {
		const edit = new CTextEdit();

		for (const key of "Hello") {
			edit.event(new CKeyEvent(
				CEventType.KeyPress,
				key
			));
		}

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Backspace"
		));

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Backspace"
		));

		expect(edit.toPlainText()).toBe("Hel");

		edit.undo();

		expect(edit.toPlainText()).toBe("Hello");

		edit.undo();

		expect(edit.toPlainText()).toBe("");
	});

	test("backspace followed by typing creates separate groups", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Backspace"
		));

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Backspace"
		));

		for (const key of "p!") {
			edit.event(new CKeyEvent(
				CEventType.KeyPress,
				key
			));
		}

		expect(edit.toPlainText()).toBe("Help!");

		edit.undo();

		expect(edit.toPlainText()).toBe("Hel");

		edit.undo();

		expect(edit.toPlainText()).toBe("Hello");
	});

	test("Enter breaks typing undo group", () => {
		const edit = new CTextEdit();

		for (const key of "Hello") {
			edit.event(new CKeyEvent(
				CEventType.KeyPress,
				key
			));
		}

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Enter"
		));

		for (const key of "World") {
			edit.event(new CKeyEvent(
				CEventType.KeyPress,
				key
			));
		}

		expect(edit.toPlainText()).toBe(
			"Hello\nWorld"
		);

		edit.undo();
		expect(edit.toPlainText()).toBe("Hello\n");

		edit.undo();
		expect(edit.toPlainText()).toBe("Hello");

		edit.undo();
		expect(edit.toPlainText()).toBe("");
	});

	test("undo breaks current typing group", () => {
		const edit = new CTextEdit();

		for (const key of "Hello") {
			edit.event(new CKeyEvent(
				CEventType.KeyPress,
				key
			));
		}

		edit.undo();

		expect(edit.toPlainText()).toBe("");

		for (const key of "World") {
			edit.event(new CKeyEvent(
				CEventType.KeyPress,
				key
			));
		}

		edit.undo();

		expect(edit.toPlainText()).toBe("");
	});

	test("redo breaks current undo group", () => {
		const edit = new CTextEdit();

		for (const key of "Hello") {
			edit.event(new CKeyEvent(
				CEventType.KeyPress,
				key
			));
		}

		edit.undo();
		edit.redo();

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"!"
		));

		expect(edit.toPlainText()).toBe("Hello!");

		edit.undo();

		expect(edit.toPlainText()).toBe("Hello");

		edit.undo();

		expect(edit.toPlainText()).toBe("");
	});

	test("public insert is not grouped", () => {
		const edit = new CTextEdit();

		edit.insert("Hello");
		edit.insert(" ");
		edit.insert("World");

		expect(edit.toPlainText()).toBe(
			"Hello World"
		);

		edit.undo();
		expect(edit.toPlainText()).toBe("Hello ");

		edit.undo();
		expect(edit.toPlainText()).toBe("Hello");

		edit.undo();
		expect(edit.toPlainText()).toBe("");
	});

	test("deleting a selection is a separate undo operation", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello World");
		edit.setSelection(6, 11);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Backspace"
		));

		expect(edit.toPlainText()).toBe("Hello ");

		edit.undo();

		expect(edit.toPlainText()).toBe(
			"Hello World"
		);
		expect(edit.selectedText()).toBe("World");
	});

	test("selection deletion does not join backspace group", () => {
		const edit = new CTextEdit();

		edit.setPlainText("abcdef");

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Backspace"
		));

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Backspace"
		));

		expect(edit.toPlainText()).toBe("abcd");

		edit.setSelection(1, 3);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Backspace"
		));

		expect(edit.toPlainText()).toBe("ad");

		edit.undo();

		expect(edit.toPlainText()).toBe("abcd");
		expect(edit.selectedText()).toBe("bc");

		edit.undo();

		expect(edit.toPlainText()).toBe("abcdef");
	});

	test("setPlainText resets current undo group", () => {
		const edit = new CTextEdit();

		for (const key of "Hello") {
			edit.event(new CKeyEvent(
				CEventType.KeyPress,
				key
			));
		}

		edit.setPlainText("World");

		for (const key of "!!!") {
			edit.event(new CKeyEvent(
				CEventType.KeyPress,
				key
			));
		}

		expect(edit.toPlainText()).toBe("World!!!");

		edit.undo();

		expect(edit.toPlainText()).toBe("World");
		expect(edit.canUndo()).toBe(false);
	});

	test("Escape clears selection", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello World");
		edit.setSelection(0, 5);

		expect(edit.selectedText()).toBe("Hello");

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Escape"
		));

		expect(edit.hasSelection()).toBe(false);
		expect(edit.toPlainText()).toBe("Hello World");
	});

	test("Escape does nothing when there is no selection", () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setCursorPosition(2);

		edit.event(new CKeyEvent(
			CEventType.KeyPress,
			"Escape"
		));

		expect(edit.hasSelection()).toBe(false);
		expect(edit.cursorPosition()).toBe(2);
		expect(edit.toPlainText()).toBe("Hello");
	});

	test("mouse drag selects text on first attempt when edit already has focus", () => {
		const app = CApplication.instance();
		const canvas = app.canvas();

		const edit = new CTextEdit();
		edit.setGeometry(0, 0, 300, 120);
		edit.setPlainText("Hello World");
		edit.setFocus();

		const content = edit.widget()!;
		const metrics = new CFontMetrics(edit.font());

		const start = content.mapToCanvas(
			5 + metrics.textWidth("H"),
			10
		);

		const end = content.mapToCanvas(
			5 + metrics.textWidth("Hello"),
			10
		);

		canvas.dispatchEvent({
			type: "pointerdown",
			clientX: start.x(),
			clientY: start.y(),
			button: 0,
			pointerId: 1
		} as PointerEvent);

		canvas.dispatchEvent({
			type: "pointermove",
			clientX: end.x(),
			clientY: end.y(),
			button: -1,
			pointerId: 1
		} as PointerEvent);

		canvas.dispatchEvent({
			type: "pointerup",
			clientX: end.x(),
			clientY: end.y(),
			button: 0,
			pointerId: 1
		} as PointerEvent);

		expect(edit.hasFocus()).toBe(true);
		expect(edit.hasSelection()).toBe(true);
		expect(edit.selectedText()).toBe("ello");
	});

	test("content width follows viewport when vertical scrollbar appears", () => {
		const edit = new CTextEdit();

		edit.resize(300, 100);
		edit.setPlainText(
			"Line 1\n" +
			"Line 2\n" +
			"Line 3\n" +
			"Line 4\n" +
			"Line 5\n" +
			"Line 6"
		);

		const content = edit.widget()!;

		expect(edit.verticalScrollBar().isVisible()).toBe(true);
		expect(edit.horizontalScrollBar().isVisible()).toBe(false);
		expect(content.width()).toBe(edit.viewport().width());
		expect(content.width()).toBeLessThan(edit.width());
	});
});