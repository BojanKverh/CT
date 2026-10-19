import { CMenu } from "../../src/widgets/CMenu.js";
import { CContextMenuEvent, CContextMenuReason } from "../../src/events/CContextMenuEvent.js";
import { CPoint } from "../../src/geometry/CPoint.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CTextEdit } from "../../src/widgets/CTextEdit.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { CFontMetrics } from "../../src/gui/CFontMetrics.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";
import { CClipboard } from "../../src/core/CClipboard.js";
import { CTextCharFormat } from "../../src/gui/CTextCharFormat.js";
import {
	CFont,
	CFontStretch,
	CFontStyle,
	CFontWeight
} from "../../src/gui/CFont.js";
import { CPainter } from "../../src/painting/CPainter.js";
import { TestPaintDevice } from "../helpers/createTestPaintEngine.js";

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

		edit.copy();

		expect(CClipboard.instance().text()).toBe("Hello");
	});

	test("copies from read only editor", async () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setSelection(0, 5);
		edit.setReadOnly();
		edit.copy();

		expect(CClipboard.instance().text()).toBe("Hello");
	});

	test("cuts selected text", async () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello World");
		edit.setSelection(0, 6);

		await edit.cut();

		expect(CClipboard.instance().text()).toBe("Hello ");
		expect(edit.toPlainText()).toBe("World");
	});

	test("cut copies but does not modify read only text", async () => {
		const edit = new CTextEdit();

		edit.setPlainText("Hello");
		edit.setSelection(0, 5);
		edit.setReadOnly();

		edit.cut();
		expect(CClipboard.instance().text()).toBe("Hello");
		expect(edit.toPlainText()).toBe("Hello");
	});

	test("pastes text at cursor position", async () => {
		const edit = new CTextEdit();
		edit.setPlainText("Hello");
		edit.setCursorPosition(2);

		CClipboard.instance().setText("XY");
		edit.paste();
		expect(CClipboard.instance().text()).toBe("XY");
		expect(edit.toPlainText()).toBe("HeXYllo");
		expect(edit.cursorPosition()).toBe(4);
	});

	test("paste supports multiline clipboard text", async () => {
		
		const edit = new CTextEdit();
		edit.setPlainText("Hello");
		edit.setCursorPosition(2);
		CClipboard.instance().setText("A\nB");
		edit.paste();

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

	test("paints plain text using the widget CFont", () => {
		const edit = new CTextEdit();
		const font = new CFont("serif", 19);
		font.setStyle(CFontStyle.Italic);
		font.setWeight(CFontWeight.DemiBold);
		font.setStretch(CFontStretch.Condensed);
		edit.setFont(font);
		edit.setPlainText("Hello");

		const device = new TestPaintDevice();
		edit.paintText(new CPainter(device));

		expect(device.engine.setFont).toHaveBeenCalledWith(
			"italic 600 condensed 19px serif"
		);
	});

	test("rich text font properties override the widget CFont", () => {
		const edit = new CTextEdit();
		const font = new CFont("sans-serif", 17);
		font.setStretch(CFontStretch.Expanded);
		edit.setFont(font);
		edit.setHtml(
			'<span style="font-size: 24px; font-family: serif; ' +
			'font-weight: bold; font-style: italic">Hello</span>'
		);

		const device = new TestPaintDevice();
		edit.paintText(new CPainter(device));

		expect(device.engine.setFont).toHaveBeenCalledWith(
			"italic 700 expanded 24px serif"
		);
	});

	test("heading size is derived from the widget CFont pixel size", () => {
		const edit = new CTextEdit();
		edit.setFont(new CFont("sans-serif", 20));
		edit.setHtml("<h1>Heading</h1>");

		edit.setCursorPosition(2);

		expect(edit.currentCharFormat().fontSize()).toBe(36);
		expect(edit.currentCharFormat().fontBold()).toBe(true);
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

test("setFontBold formats the current selection", () => {
		const edit = new CTextEdit();
		edit.setPlainText("Hello world");

		edit.setSelection(6, 11);
		edit.setFontBold(true);

		edit.setCursorPosition(7);
		expect(edit.currentCharFormat().fontBold()).toBe(true);

		edit.setCursorPosition(1);
		expect(edit.currentCharFormat().fontBold()).toBe(false);
	});

	test("setFontItalic preserves existing bold formatting", () => {
		const edit = new CTextEdit();
		edit.setPlainText("abcdef");

		edit.setSelection(1, 5);
		edit.setFontBold(true);

		edit.setSelection(2, 4);
		edit.setFontItalic(true);

		edit.setCursorPosition(3);
		expect(edit.currentCharFormat().fontBold()).toBe(true);
		expect(edit.currentCharFormat().fontItalic()).toBe(true);

		edit.setCursorPosition(1);
		expect(edit.currentCharFormat().fontBold()).toBe(false);
		expect(edit.currentCharFormat().fontItalic()).toBe(false);
	});

	test("format without selection is used by subsequently inserted text", () => {
		const edit = new CTextEdit();

		edit.setFontBold(true);
		edit.insert("A");

		expect(edit.toPlainText()).toBe("A");
		expect(edit.currentCharFormat().fontBold()).toBe(true);

		edit.setCursorPosition(1);
		expect(edit.currentCharFormat().fontBold()).toBe(true);
	});

	test("setCurrentCharFormat replaces the selection format", () => {
		const edit = new CTextEdit();
		const format = new CTextCharFormat();

		edit.setPlainText("Hello");
		edit.setSelection(0, 5);

		format.setFontBold(true);
		format.setFontItalic(true);
		format.setForeground("#123456");

		edit.setCurrentCharFormat(format);
		edit.setCursorPosition(2);

		const current = edit.currentCharFormat();

		expect(current.fontBold()).toBe(true);
		expect(current.fontItalic()).toBe(true);
		expect(current.foreground()).toBe("#123456");
	});

	test("selection formatting is undoable and redoable", () => {
		const edit = new CTextEdit();
		edit.setPlainText("Hello");

		edit.setSelection(0, 5);
		edit.setFontBold(true);

		edit.undo();
		edit.setCursorPosition(2);
		expect(edit.currentCharFormat().fontBold()).toBe(false);

		edit.redo();
		edit.setCursorPosition(2);
		expect(edit.currentCharFormat().fontBold()).toBe(true);
	});

	test("setTextColor modifies only the selected text", () => {
		const edit = new CTextEdit();
		edit.setPlainText("red black");

		edit.setSelection(0, 3);
		edit.setTextColor("#ff0000");

		edit.setCursorPosition(1);
		expect(edit.currentCharFormat().foreground()).toBe("#ff0000");

		edit.setCursorPosition(5);
		expect(edit.currentCharFormat().foreground()).toBeNull();
	});

test("setFontSize changes the selected text format", () => {
		const edit = new CTextEdit();
		edit.setPlainText("small BIG small");
		edit.setSelection(6, 9);

		edit.setFontSize(30);

		expect(edit.currentCharFormat().fontSize()).toBe(30);
		expect(edit.toPlainText()).toBe("small BIG small");
	});

	test("setFontFamily changes the selected text format", () => {
		const edit = new CTextEdit();
		edit.setPlainText("abc");
		edit.selectAll();

		edit.setFontFamily("serif");

		expect(edit.currentCharFormat().fontFamily()).toBe("serif");
		expect(edit.toPlainText()).toBe("abc");
	});

	test("font size becomes the active insertion format without a selection", () => {
		const edit = new CTextEdit();
		edit.setFontSize(28);

		edit.insert("X");

		expect(edit.currentCharFormat().fontSize()).toBe(28);
		expect(edit.toPlainText()).toBe("X");
	});

test("imports plain text from basic HTML", () => {
		const edit = new CTextEdit();

		edit.setHtml("<p>Hello <b>rich</b> text</p><p>Second line</p>");

		expect(edit.toPlainText()).toBe("Hello rich text\nSecond line");
	});

	test("imports bold and italic formatting", () => {
		const edit = new CTextEdit();

		edit.setHtml("normal <b>bold</b> <i>italic</i>");

		edit.setCursorPosition(8);
		expect(edit.currentCharFormat().fontBold()).toBe(true);
		expect(edit.currentCharFormat().fontItalic()).toBe(false);

		edit.setCursorPosition(13);
		expect(edit.currentCharFormat().fontBold()).toBe(false);
		expect(edit.currentCharFormat().fontItalic()).toBe(true);
	});

	test("preserves nested formatting", () => {
		const edit = new CTextEdit();

		edit.setHtml("<b>bold <i>both</i> bold</b>");

		edit.setCursorPosition(7);
		expect(edit.currentCharFormat().fontBold()).toBe(true);
		expect(edit.currentCharFormat().fontItalic()).toBe(true);

		edit.setCursorPosition(12);
		expect(edit.currentCharFormat().fontBold()).toBe(true);
		expect(edit.currentCharFormat().fontItalic()).toBe(false);
	});

	test("imports span color font size and font family", () => {
		const edit = new CTextEdit();

		edit.setHtml(
			'<span style="color: #ff0000; font-size: 30px; font-family: serif">styled</span>'
		);

		edit.setCursorPosition(2);
		const format = edit.currentCharFormat();

		expect(format.foreground()).toBe("#ff0000");
		expect(format.fontSize()).toBe(30);
		expect(format.fontFamily()).toBe("serif");
	});

	test("imports headings as bold enlarged text", () => {
		const edit = new CTextEdit();

		edit.setHtml("<h1>Heading</h1><p>Body</p>");

		expect(edit.toPlainText()).toBe("Heading\nBody");

		edit.setCursorPosition(2);
		const heading = edit.currentCharFormat();
		expect(heading.fontBold()).toBe(true);
		expect(heading.fontSize()).not.toBeNull();

		edit.setCursorPosition(9);
		expect(edit.currentCharFormat().fontBold()).toBe(false);
		expect(edit.currentCharFormat().fontSize()).toBeNull();
	});

	test("decodes common and numeric HTML entities", () => {
		const edit = new CTextEdit();

		edit.setHtml("A &amp; B &#33; &#x41;");

		expect(edit.toPlainText()).toBe("A & B ! A");
	});

	test("unknown tags preserve their text content", () => {
		const edit = new CTextEdit();

		edit.setHtml("before <unknown>inside</unknown> after");

		expect(edit.toPlainText()).toBe("before inside after");
	});

	test("setHtml replaces formatting even when plain text is unchanged", () => {
		const edit = new CTextEdit();

		edit.setHtml("<b>Hello</b>");
		edit.setHtml("Hello");
		edit.setCursorPosition(2);

		expect(edit.toPlainText()).toBe("Hello");
		expect(edit.currentCharFormat().fontBold()).toBe(false);
	});

test("exports plain text as HTML-safe text", () => {
		const edit = new CTextEdit();
		edit.setPlainText(`A < B & "quoted"`);

		expect(edit.toHtml()).toBe(
			"A &lt; B &amp; &quot;quoted&quot;"
		);
	});

	test("exports newlines as br elements", () => {
		const edit = new CTextEdit();
		edit.setPlainText("one\ntwo\nthree");

		expect(edit.toHtml()).toBe("one<br>two<br>three");
	});

	test("exports bold and italic formatting", () => {
		const edit = new CTextEdit();
		edit.setPlainText("bold italic");

		edit.setSelection(0, 4);
		edit.setFontBold(true);

		edit.setSelection(5, 11);
		edit.setFontItalic(true);

		expect(edit.toHtml()).toContain("<b>bold</b>");
		expect(edit.toHtml()).toContain("<i>italic</i>");
	});

	test("exports color, font size and font family", () => {
		const edit = new CTextEdit();
		edit.setPlainText("styled");
		edit.selectAll();

		edit.setTextColor("#ff0000");
		edit.setFontSize(30);
		edit.setFontFamily("serif");

		const html = edit.toHtml();

		expect(html).toContain("color: #ff0000");
		expect(html).toContain("font-size: 30px");
		expect(html).toContain("font-family: serif");
		expect(html).toContain(">styled</span>");
	});

	test("setHtml toHtml setHtml preserves plain text and formatting", () => {
		const source = new CTextEdit();

		source.setHtml(
			`Normal <b>bold</b> <i>italic</i> ` +
			`<span style="color: #ff0000; font-size: 30px">BIG RED</span>`
		);

		const html = source.toHtml();

		const copy = new CTextEdit();
		copy.setHtml(html);

		expect(copy.toPlainText()).toBe(source.toPlainText());

		copy.setCursorPosition(copy.toPlainText().indexOf("bold") + 1);
		expect(copy.currentCharFormat().fontBold()).toBe(true);

		copy.setCursorPosition(copy.toPlainText().indexOf("italic") + 1);
		expect(copy.currentCharFormat().fontItalic()).toBe(true);

		copy.setCursorPosition(copy.toPlainText().indexOf("BIG RED") + 1);
		expect(copy.currentCharFormat().foreground()).toBe("#ff0000");
		expect(copy.currentCharFormat().fontSize()).toBe(30);
	});

	test("HTML export reflects formatting changes made after import", () => {
		const edit = new CTextEdit();
		edit.setHtml("Hello world");

		edit.setSelection(6, 11);
		edit.setFontBold(true);
		edit.setTextColor("#123456");

		const html = edit.toHtml();

		expect(html).toContain("<b>");
		expect(html).toContain("color: #123456");

		const copy = new CTextEdit();
		copy.setHtml(html);

		copy.setCursorPosition(7);
		expect(copy.currentCharFormat().fontBold()).toBe(true);
		expect(copy.currentCharFormat().foreground()).toBe("#123456");
	});

test("imports anchor href into the character format", () => {
		const edit = new CTextEdit();
		edit.setHtml('Visit <a href="https://example.com">Example</a>.');

		edit.setCursorPosition(7);
		const format = edit.currentCharFormat();

		expect(format.anchorHref()).toBe("https://example.com");
		expect(format.fontUnderline()).toBe(true);
	});

	test("decodes HTML entities in href", () => {
		const edit = new CTextEdit();
		edit.setHtml('<a href="search?q=canvas&amp;page=2">Search</a>');

		edit.setCursorPosition(2);
		expect(edit.currentCharFormat().anchorHref()).toBe(
			"search?q=canvas&page=2"
		);
	});

	test("exports anchors and safely encodes href", () => {
		const edit = new CTextEdit();
		edit.setHtml('<a href="search?q=canvas&amp;page=2">Search</a>');

		const html = edit.toHtml();

		expect(html).toContain(
			'<a href="search?q=canvas&amp;page=2">'
		);
		expect(html).toContain("Search");
	});

	test("setHtml toHtml setHtml preserves anchor metadata", () => {
		const source = new CTextEdit();
		source.setHtml(
			'Go to <a href="/documentation"><b>Documentation</b></a> now'
		);

		const copy = new CTextEdit();
		copy.setHtml(source.toHtml());
		copy.setCursorPosition(copy.toPlainText().indexOf("Documentation") + 1);

		const format = copy.currentCharFormat();
		expect(format.anchorHref()).toBe("/documentation");
		expect(format.fontUnderline()).toBe(true);
		expect(format.fontBold()).toBe(true);
	});

	test("imports explicit underline formatting", () => {
		const edit = new CTextEdit();
		edit.setHtml("normal <u>underlined</u>");

		edit.setCursorPosition(9);
		expect(edit.currentCharFormat().fontUnderline()).toBe(true);
	});


    describe("history availability signals", () => {
        test("emits only on availability transitions", () => {
            const edit = new CTextEdit();
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
            expect(edit.toPlainText()).toBe("AB");
        });
        test("empty history operations emit no availability changes", () => {
            const edit = new CTextEdit();
            const undo: boolean[] = [], redo: boolean[] = [];
            edit.undoAvailable.connect(value => undo.push(value));
            edit.redoAvailable.connect(value => redo.push(value));
            edit.undo(); edit.redo(); edit.setPlainText("");
            expect(undo).toEqual([]);
            expect(redo).toEqual([]);
        });
        test("loading text disables both undo and redo", () => {
            const edit = new CTextEdit();
            edit.insert("A"); edit.insert("B"); edit.undo();
            const undo: boolean[] = [], redo: boolean[] = [];
            edit.undoAvailable.connect(value => undo.push(value));
            edit.redoAvailable.connect(value => redo.push(value));
            edit.setPlainText("Loaded");
            expect(undo).toEqual([false]);
            expect(redo).toEqual([false]);
        });
        test("new editing after undo disables redo", () => {
            const edit = new CTextEdit();
            edit.insert("A"); edit.insert("B"); edit.undo();
            const redo: boolean[] = [];
            edit.redoAvailable.connect(value => redo.push(value));
            edit.insert("C");
            expect(redo).toEqual([false]);
            expect(edit.toPlainText()).toBe("AC");
        });
        test("grouped typing emits undoAvailable true only once", () => {
            const edit = new CTextEdit();
            const undo: boolean[] = [];
            edit.undoAvailable.connect(value => undo.push(value));
            for (const key of "abc")
                edit.event(new CKeyEvent(CEventType.KeyPress, key));
            edit.undo(); edit.redo();
            expect(undo).toEqual([true, false, true]);
        });
    });
    describe("undo stack integration", () => {
        function press(edit: CTextEdit, key: string): void {
            edit.event(new CKeyEvent(CEventType.KeyPress, key));
        }
        test("same-value setPlainText resets history without textChanged", () => {
            const edit = new CTextEdit();
            edit.insert("abc");
            const changed = vi.fn();
            edit.textChanged.connect(changed);
            edit.setPlainText("abc");
            expect(edit.canUndo()).toBe(false);
            expect(edit.canRedo()).toBe(false);
            expect(changed).not.toHaveBeenCalled();
        });
        test("setHtml discards both undo and redo history", () => {
            const edit = new CTextEdit();
            edit.insert("A"); edit.insert("B"); edit.undo();
            edit.setHtml("<b>Loaded</b>");
            expect(edit.toPlainText()).toBe("Loaded");
            expect(edit.canUndo()).toBe(false);
            expect(edit.canRedo()).toBe(false);
        });
        test("typing after selection replacement forms a new command", () => {
            const edit = new CTextEdit();
            edit.setPlainText("abc"); edit.setSelection(3, 0);
            press(edit, "X"); press(edit, "Y");
            edit.undo(); expect(edit.toPlainText()).toBe("X");
            edit.undo();
            expect(edit.toPlainText()).toBe("abc");
            expect(edit.selectedText()).toBe("abc");
            expect(edit.cursorPosition()).toBe(0);
            edit.redo(); edit.redo();
            expect(edit.toPlainText()).toBe("XY");
            expect(edit.cursorPosition()).toBe(2);
        });
        test("paste between typing groups is a separate command", () => {
            const edit = new CTextEdit();
            press(edit, "A");
            CClipboard.instance().setText("one\ntwo");
            edit.paste(); press(edit, "B");
            edit.undo(); expect(edit.toPlainText()).toBe("Aone\ntwo");
            edit.undo(); expect(edit.toPlainText()).toBe("A");
            edit.redo(); expect(edit.toPlainText()).toBe("Aone\ntwo");
        });
        test("cut undo and redo restore backwards selection", () => {
            const edit = new CTextEdit();
            edit.setPlainText("abcdef"); edit.setSelection(5, 1); edit.cut();
            expect(edit.toPlainText()).toBe("af");
            edit.undo();
            expect(edit.toPlainText()).toBe("abcdef");
            expect(edit.selectedText()).toBe("bcde");
            expect(edit.cursorPosition()).toBe(1);
            edit.redo(); expect(edit.toPlainText()).toBe("af");
        });
        test("editing after undo discards rich text redo history", () => {
            const edit = new CTextEdit();
            edit.setPlainText("abc"); edit.selectAll(); edit.setFontBold(true);
            edit.undo(); edit.setCursorPosition(3); edit.insert("X");
            expect(edit.canRedo()).toBe(false);
            edit.undo(); expect(edit.toPlainText()).toBe("abc");
            expect(edit.currentCharFormat().fontBold()).toBe(false);
        });
    });


    describe("standard context menu", () => {
        function request(edit: CTextEdit): CContextMenuEvent {
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
            const edit = new CTextEdit();
            const menu = edit.createStandardContextMenu();
            expect(Array.from({ length: menu.count() }, (_, i) => menu.actionAt(i)?.text() ?? null))
                .toEqual(["Undo", "Redo", null, "Cut", "Copy", "Paste", null, "Select All"]);
            menu.destroy();
        });
        test("empty editor with empty clipboard disables all actions", () => {
            const edit = new CTextEdit();
            CClipboard.instance().setText("");
            const menu = edit.createStandardContextMenu();
            for (const i of [0, 1, 3, 4, 5, 7])
                expect(menu.actionAt(i)?.isEnabled()).toBe(false);
            menu.destroy();
        });
        test("menu enables undo and redo according to history", () => {
            const edit = new CTextEdit();
            edit.insert("A"); edit.insert("B"); edit.undo();
            const menu = edit.createStandardContextMenu();
            expect(menu.actionAt(0)?.isEnabled()).toBe(true);
            expect(menu.actionAt(1)?.isEnabled()).toBe(true);
            menu.actionAt(0)!.trigger();
            expect(edit.toPlainText()).toBe("");
            menu.actionAt(1)!.trigger();
            expect(edit.toPlainText()).toBe("A");
            menu.destroy();
        });
        test("copy preserves text and copies selection", () => {
            const edit = new CTextEdit();
            edit.setPlainText("abcdef"); edit.setSelection(1, 4);
            const menu = edit.createStandardContextMenu();
            expect(menu.actionAt(4)?.isEnabled()).toBe(true);
            menu.actionAt(4)!.trigger();
            expect(CClipboard.instance().text()).toBe("bcd");
            expect(edit.toPlainText()).toBe("abcdef");
            menu.destroy();
        });
        test("cut can be undone with its original selection", () => {
            const edit = new CTextEdit();
            edit.setPlainText("abcdef"); edit.setSelection(4, 1);
            const menu = edit.createStandardContextMenu();
            menu.actionAt(3)!.trigger();
            expect(edit.toPlainText()).toBe("aef");
            expect(CClipboard.instance().text()).toBe("bcd");
            edit.undo();
            expect(edit.toPlainText()).toBe("abcdef");
            expect(edit.selectedText()).toBe("bcd");
            expect(edit.cursorPosition()).toBe(1);
            menu.destroy();
        });
        test("paste replaces the selection and is undoable", () => {
            const edit = new CTextEdit();
            edit.setPlainText("abc"); edit.setSelection(0, 3);
            CClipboard.instance().setText("Pasted");
            const menu = edit.createStandardContextMenu();
            expect(menu.actionAt(5)?.isEnabled()).toBe(true);
            menu.actionAt(5)!.trigger();
            expect(edit.toPlainText()).toBe("Pasted");
            edit.undo(); expect(edit.toPlainText()).toBe("abc");
            menu.destroy();
        });
        test("select all preserves cursor direction and does not change history", () => {
            const edit = new CTextEdit();
            edit.setPlainText("abc");
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
            const edit = new CTextEdit();
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
            expect(edit.toPlainText()).toBe("abc");
            menu.destroy();
        });
        test("disabled editor menu contains no enabled actions", () => {
            const edit = new CTextEdit();
            edit.insert("abc"); edit.setSelection(0, 1); edit.setEnabled(false);
            CClipboard.instance().setText("Paste");
            const menu = edit.createStandardContextMenu();
            for (const i of [0, 1, 3, 4, 5, 7])
                expect(menu.actionAt(i)?.isEnabled()).toBe(false);
            menu.destroy();
        });
        test("read-only state is rechecked when triggering an existing action", () => {
            const edit = new CTextEdit();
            edit.insert("abc"); edit.setSelection(0, 1);
            const menu = edit.createStandardContextMenu();
            edit.setReadOnly(true);
            menu.actionAt(0)!.trigger(); menu.actionAt(3)!.trigger();
            expect(edit.toPlainText()).toBe("abc");
            menu.destroy();
        });
        test("context request opens menu at canvas position without changing selection", () => {
            const edit = new CTextEdit();
            edit.setPlainText("abcdef"); edit.setSelection(4, 1);
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
            const edit = new CTextEdit();
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
            const edit = new CTextEdit();
            edit.setEnabled(false);
            const event = request(edit);
            expect(event.isAccepted()).toBe(false);
            expect(CApplication.instance().popupWidgets()).toHaveLength(0);
        });

        test("content widget forwards the request to the text editor", () => {
            const edit = new CTextEdit();
            edit.setPlainText("abc"); edit.selectAll();
            const event = new CContextMenuEvent(
                CContextMenuReason.Mouse, new CPoint(5, 5), new CPoint(160, 180));
            edit.widget()!.event(event);
            const menu = activeMenu();
            expect(event.isAccepted()).toBe(true);
            expect([menu.x(), menu.y()]).toEqual([160, 180]);
            expect(edit.selectedText()).toBe("abc");
            menu.close();
        });

    });


    describe("multi-click selection", () => {
        function click(edit: CTextEdit, text: string, position: number, count: number,
            type = CEventType.MousePress, button = CMouseButton.LeftButton): CMouseEvent {
            const metrics = new CFontMetrics(edit.font());
            const x = 5 + metrics.textWidth(text.slice(0, position))
                + metrics.textWidth(text[position] ?? "") / 4;
            const event = new CMouseEvent(type, x, 10, button, false, count);
            edit.widget()!.event(event);
            return event;
        }
        test("double press selects the clicked word and release preserves it", () => {
            const edit = new CTextEdit();
            edit.setPlainText("Hello world");
            click(edit, "Hello world", 7, 2);
            expect(edit.selectedText()).toBe("world");
            click(edit, "Hello world", 7, 2, CEventType.MouseRelease);
            expect(edit.selectedText()).toBe("world");
        });
        test("native double-click event selects a word", () => {
            const edit = new CTextEdit();
            edit.setPlainText("Hello world");
            click(edit, "Hello world", 2, 2, CEventType.MouseDoubleClick);
            expect(edit.selectedText()).toBe("Hello");
        });
        test("double click selects Unicode words", () => {
            const edit = new CTextEdit();
            edit.setPlainText("Hi čebelar_42!");
            click(edit, "Hi čebelar_42!", 5, 2);
            expect(edit.selectedText()).toBe("čebelar_42");
        });
        test("double click selects spaces without adjoining words", () => {
            const edit = new CTextEdit();
            edit.setPlainText("one   two");
            click(edit, "one   two", 4, 2);
            expect(edit.selectedText()).toBe("   ");
        });
        test("triple click selects the paragraph including its newline", () => {
            const edit = new CTextEdit();
            edit.setPlainText("Hello world\nNext paragraph");
            click(edit, "Hello world", 2, 3);
            expect(edit.selectedText()).toBe("Hello world\n");
            click(edit, "Hello world", 2, 3, CEventType.MouseRelease);
            expect(edit.selectedText()).toBe("Hello world\n");
        });
        test("read-only editor still allows word selection", () => {
            const edit = new CTextEdit();
            edit.setPlainText("Hello world"); edit.setReadOnly(true);
            click(edit, "Hello world", 2, 2);
            expect(edit.selectedText()).toBe("Hello");
            expect(edit.canUndo()).toBe(false);
        });
        test("right double click preserves an existing selection", () => {
            const edit = new CTextEdit();
            edit.setPlainText("Hello world"); edit.setSelection(0, 5);
            const event = click(edit, "Hello world", 7, 2,
                CEventType.MouseDoubleClick, CMouseButton.RightButton);
            expect(event.isAccepted()).toBe(false);
            expect(edit.selectedText()).toBe("Hello");
        });
        test("typing over a selected word is undoable", () => {
            const edit = new CTextEdit();
            edit.setPlainText("Hello world");
            click(edit, "Hello world", 7, 2);
            edit.insert("Bojan");
            expect(edit.toPlainText()).toBe("Hello Bojan");
            edit.undo();
            expect(edit.toPlainText()).toBe("Hello world");
            expect(edit.selectedText()).toBe("world");
        });
    });


    describe("word keyboard navigation", () => {
        function press(edit: CTextEdit, key: string, shift = false): CKeyEvent {
            const event = new CKeyEvent(CEventType.KeyPress, key, true, shift);
            edit.event(event);
            return event;
        }
        test("Ctrl+Left moves to preceding word starts", () => {
            const edit = new CTextEdit();
            edit.setPlainText("one two three");
            press(edit, "ArrowLeft"); expect(edit.cursorPosition()).toBe(8);
            press(edit, "ArrowLeft"); expect(edit.cursorPosition()).toBe(4);
            press(edit, "ArrowLeft"); expect(edit.cursorPosition()).toBe(0);
            press(edit, "ArrowLeft"); expect(edit.cursorPosition()).toBe(0);
        });
        test("Ctrl+Right moves to following word starts and clamps at the end", () => {
            const edit = new CTextEdit();
            edit.setPlainText("one two three"); edit.setCursorPosition(0);
            press(edit, "ArrowRight"); expect(edit.cursorPosition()).toBe(4);
            press(edit, "ArrowRight"); expect(edit.cursorPosition()).toBe(8);
            press(edit, "ArrowRight"); expect(edit.cursorPosition()).toBe(13);
            press(edit, "ArrowRight"); expect(edit.cursorPosition()).toBe(13);
        });
        test("Ctrl+Shift keeps the selection anchor when reversing direction", () => {
            const edit = new CTextEdit();
            edit.setPlainText("one two three"); edit.setCursorPosition(4);
            press(edit, "ArrowRight", true);
            expect(edit.selectedText()).toBe("two ");
            press(edit, "ArrowLeft", true);
            expect(edit.hasSelection()).toBe(false);
            press(edit, "ArrowLeft", true);
            expect(edit.selectedText()).toBe("one ");
            expect(edit.cursorPosition()).toBe(0);
        });
        test("Ctrl navigation clears a selection without changing text or history", () => {
            const edit = new CTextEdit();
            edit.setPlainText("one two three"); edit.setSelection(0, 4);
            const event = press(edit, "ArrowRight");
            expect(edit.hasSelection()).toBe(false);
            expect(edit.cursorPosition()).toBe(8);
            expect(edit.toPlainText()).toBe("one two three");
            expect(edit.canUndo()).toBe(false);
            expect(event.isAccepted()).toBe(true);
        });
        test("Ctrl+Backspace deletes one word and restores the original cursor", () => {
            const edit = new CTextEdit();
            edit.setPlainText("one two");
            press(edit, "Backspace"); expect(edit.toPlainText()).toBe("one ");
            edit.undo(); expect(edit.toPlainText()).toBe("one two");
            expect(edit.cursorPosition()).toBe(7);
            edit.redo(); expect(edit.toPlainText()).toBe("one ");
        });
        test("Ctrl+Delete removes the following word and its whitespace", () => {
            const edit = new CTextEdit();
            edit.setPlainText("one two"); edit.setCursorPosition(0);
            press(edit, "Delete"); expect(edit.toPlainText()).toBe("two");
            edit.undo(); expect(edit.toPlainText()).toBe("one two");
            expect(edit.cursorPosition()).toBe(0);
            edit.redo(); expect(edit.toPlainText()).toBe("two");
        });
        test("successive word deletions remain separate undo steps", () => {
            const edit = new CTextEdit();
            edit.setPlainText("one two three");
            press(edit, "Backspace"); press(edit, "Backspace");
            expect(edit.toPlainText()).toBe("one ");
            edit.undo(); expect(edit.toPlainText()).toBe("one two ");
            edit.undo(); expect(edit.toPlainText()).toBe("one two three");
        });
        test("word deletion removes only the existing backwards selection", () => {
            const edit = new CTextEdit();
            edit.setPlainText("one two three"); edit.setSelection(7, 4);
            press(edit, "Delete"); expect(edit.toPlainText()).toBe("one  three");
            edit.undo();
            expect(edit.toPlainText()).toBe("one two three");
            expect(edit.selectedText()).toBe("two");
            expect(edit.cursorPosition()).toBe(4);
        });
        test("word deletion at a boundary creates no undo step", () => {
            const edit = new CTextEdit();
            edit.setPlainText("one"); edit.setCursorPosition(0);
            press(edit, "Backspace");
            edit.setCursorPosition(3); press(edit, "Delete");
            expect(edit.toPlainText()).toBe("one");
            expect(edit.canUndo()).toBe(false);
        });
        test("read-only mode permits word navigation and selection but blocks deletion", () => {
            const edit = new CTextEdit();
            edit.setPlainText("one two"); edit.setReadOnly(true);
            press(edit, "ArrowLeft"); expect(edit.cursorPosition()).toBe(4);
            press(edit, "ArrowLeft", true); expect(edit.selectedText()).toBe("one ");
            press(edit, "Backspace"); press(edit, "Delete");
            expect(edit.toPlainText()).toBe("one two");
            expect(edit.canUndo()).toBe(false);
        });
        test("word navigation ends the current typing undo group", () => {
            const edit = new CTextEdit();
            for (const key of "one two")
                edit.event(new CKeyEvent(CEventType.KeyPress, key));
            press(edit, "ArrowLeft");
            edit.event(new CKeyEvent(CEventType.KeyPress, "X"));
            edit.undo(); expect(edit.toPlainText()).toBe("one two");
            edit.undo(); expect(edit.toPlainText()).toBe("");
        });
        test("new word deletion after undo discards redo", () => {
            const edit = new CTextEdit();
            edit.setPlainText("one two"); edit.insert(" three"); edit.undo();
            press(edit, "Backspace");
            expect(edit.canRedo()).toBe(false);
            expect(edit.toPlainText()).toBe("one ");
        });

        test("word navigation crosses paragraph boundaries", () => {
            const edit = new CTextEdit();
            edit.setPlainText("one\ntwo"); edit.setCursorPosition(0);
            press(edit, "ArrowRight"); expect(edit.cursorPosition()).toBe(4);
            press(edit, "Backspace"); expect(edit.toPlainText()).toBe("two");
            edit.undo(); expect(edit.toPlainText()).toBe("one\ntwo");
        });
        test("word deletion undo restores rich character formatting", () => {
            const edit = new CTextEdit();
            edit.setHtml("<b>one</b> two");
            edit.setCursorPosition(0); press(edit, "Delete");
            expect(edit.toPlainText()).toBe("two");
            edit.undo();
            expect(edit.toPlainText()).toBe("one two");
            edit.setCursorPosition(1);
            expect(edit.currentCharFormat().fontBold()).toBe(true);
        });

    });


    describe("page navigation and selection autoscroll", () => {
        const line = "abcdefghij";
        const text = Array(80).fill(line).join("\n");
        function editor(): CTextEdit {
            const edit = new CTextEdit();
            edit.resize(240, 100);
            edit.setPlainText(text);
            edit.setCursorPosition(3);
            return edit;
        }
        function page(edit: CTextEdit, key: "PageUp" | "PageDown", shift = false): void {
            const event = new CKeyEvent(CEventType.KeyPress, key, false, shift);
            edit.event(event);
            expect(event.isAccepted()).toBe(true);
        }
        function mouse(edit: CTextEdit, type: CEventType, x: number, y: number): void {
            // The content receives local coordinates, including the current scroll offset.
            edit.widget()!.event(new CMouseEvent(type, x + edit.scrollX(),
                y + edit.scrollY(), CMouseButton.LeftButton));
        }
        test("PageDown moves cursor and viewport by approximately a page", () => {
            const edit = editor();
            page(edit, "PageDown");
            const row = Math.floor(edit.cursorPosition() / (line.length + 1));
            expect(row).toBeGreaterThan(1);
            expect(edit.cursorPosition() % (line.length + 1)).toBe(3);
            expect(Math.abs(row * 18 - edit.viewport().height())).toBeLessThanOrEqual(28);
            expect(edit.scrollY()).toBeGreaterThan(edit.viewport().height() / 2);
            expect(edit.hasSelection()).toBe(false);
            expect(edit.canUndo()).toBe(false);
        });
        test("PageUp returns toward the previous page", () => {
            const edit = editor();
            edit.setCursorPosition(30 * (line.length + 1) + 3);
            const previous = edit.cursorPosition();
            const scroll = edit.scrollY();
            page(edit, "PageUp");
            expect(edit.cursorPosition()).toBeLessThan(previous - line.length);
            expect(edit.cursorPosition() % (line.length + 1)).toBe(3);
            expect(edit.scrollY()).toBeLessThan(scroll);
        });
        test("Shift+PageDown extends selection and emits selectionChanged", () => {
            const edit = editor();
            const changed = vi.fn();
            edit.selectionChanged.connect(changed);
            page(edit, "PageDown", true);
            expect(edit.selectionStart()).toBe(3);
            expect(edit.selectionEnd()).toBe(edit.cursorPosition());
            expect(edit.selectedText()).toBe(text.slice(3, edit.cursorPosition()));
            expect(changed).toHaveBeenCalledOnce();
        });
        test("Shift+PageUp keeps the anchor when extending backwards", () => {
            const edit = editor();
            const anchor = 30 * (line.length + 1) + 3;
            edit.setCursorPosition(anchor);
            page(edit, "PageUp", true);
            expect(edit.selectionEnd()).toBe(anchor);
            expect(edit.selectionStart()).toBe(edit.cursorPosition());
            expect(edit.selectedText()).toBe(text.slice(edit.cursorPosition(), anchor));
        });
        test("an unmodified page key clears an existing selection", () => {
            const edit = editor();
            page(edit, "PageDown", true);
            page(edit, "PageDown");
            expect(edit.hasSelection()).toBe(false);
        });
        test("page movement clamps to the first and last lines", () => {
            const edit = editor();
            for (let i = 0; i < 80; ++i) page(edit, "PageDown");
            expect(edit.cursorPosition()).toBe(79 * (line.length + 1) + 3);
            for (let i = 0; i < 80; ++i) page(edit, "PageUp");
            expect(edit.cursorPosition()).toBe(3);
            expect(edit.scrollY()).toBe(0);
        });
        test("page navigation is harmless in an empty document", () => {
            const edit = new CTextEdit();
            page(edit, "PageDown", true);
            page(edit, "PageUp");
            expect(edit.cursorPosition()).toBe(0);
            expect(edit.hasSelection()).toBe(false);
            expect(edit.scrollY()).toBe(0);
        });
        test("a taller viewport moves farther", () => {
            const short = editor();
            const tall = editor();
            tall.resize(240, 200);
            page(short, "PageDown");
            page(tall, "PageDown");
            expect(tall.cursorPosition()).toBeGreaterThan(short.cursorPosition());
        });
        test("page movement respects rich-text line heights", () => {
            const plain = editor();
            const rich = editor();
            rich.selectAll();
            rich.setFontSize(30);
            rich.setCursorPosition(3);
            page(plain, "PageDown");
            page(rich, "PageDown");
            expect(rich.cursorPosition()).toBeGreaterThan(3);
            expect(rich.cursorPosition()).toBeLessThan(plain.cursorPosition());
            expect(rich.currentCharFormat().fontSize()).toBe(30);
        });
        test("page navigation also works in read-only mode", () => {
            const edit = editor();
            edit.setReadOnly(true);
            page(edit, "PageDown", true);
            expect(edit.cursorPosition()).toBeGreaterThan(3);
            expect(edit.hasSelection()).toBe(true);
            expect(edit.toPlainText()).toBe(text);
        });
        test("holding a drag below the viewport keeps scrolling and selecting", () => {
            vi.useFakeTimers();
            const edit = editor();
            mouse(edit, CEventType.MousePress, 6, 6);
            const anchor = edit.cursorPosition();
            mouse(edit, CEventType.MouseMove, 6, edit.viewport().height() + 10);
            const position = edit.cursorPosition();
            const scroll = edit.scrollY();
            vi.advanceTimersByTime(200);
            expect(edit.cursorPosition()).toBeGreaterThan(position);
            expect(edit.scrollY()).toBeGreaterThan(scroll);
            expect(edit.selectionStart()).toBe(anchor);
            expect(edit.toPlainText()).toBe(text);
            expect(edit.canUndo()).toBe(false);
            edit.destroy();
        });
        test("holding a drag above the viewport scrolls back toward the beginning", () => {
            vi.useFakeTimers();
            const edit = editor();
            edit.setCursorPosition(40 * (line.length + 1));
            mouse(edit, CEventType.MousePress, 6, 10);
            const anchor = edit.cursorPosition();
            mouse(edit, CEventType.MouseMove, 6, -10);
            const position = edit.cursorPosition();
            const scroll = edit.scrollY();
            vi.advanceTimersByTime(200);
            expect(edit.cursorPosition()).toBeLessThan(position);
            expect(edit.scrollY()).toBeLessThan(scroll);
            expect(edit.selectionEnd()).toBe(anchor);
            edit.destroy();
        });
        test("a stationary drag outside a horizontal edge scrolls long lines", () => {
            vi.useFakeTimers();
            const edit = editor();
            edit.setPlainText("abcdefghij".repeat(100));
            edit.setCursorPosition(0);
            mouse(edit, CEventType.MousePress, 6, 6);
            mouse(edit, CEventType.MouseMove, edit.viewport().width() + 10, 6);
            const position = edit.cursorPosition();
            const scroll = edit.scrollX();
            vi.advanceTimersByTime(200);
            expect(edit.cursorPosition()).toBeGreaterThan(position);
            expect(edit.scrollX()).toBeGreaterThan(scroll);
            mouse(edit, CEventType.MouseMove, -10, 6);
            const rightScroll = edit.scrollX();
            vi.advanceTimersByTime(200);
            expect(edit.scrollX()).toBeLessThan(rightScroll);
            edit.destroy();
        });
        test("returning the pointer inside stops automatic selection scrolling", () => {
            vi.useFakeTimers();
            const edit = editor();
            mouse(edit, CEventType.MousePress, 6, 6);
            mouse(edit, CEventType.MouseMove, 6, edit.viewport().height() + 10);
            vi.advanceTimersByTime(120);
            mouse(edit, CEventType.MouseMove, 6, 30);
            const position = edit.cursorPosition();
            const scroll = edit.scrollY();
            vi.advanceTimersByTime(200);
            expect(edit.cursorPosition()).toBe(position);
            expect(edit.scrollY()).toBe(scroll);
            edit.destroy();
        });
        test("releasing the mouse stops automatic scrolling", () => {
            vi.useFakeTimers();
            const edit = editor();
            mouse(edit, CEventType.MousePress, 6, 6);
            mouse(edit, CEventType.MouseMove, 6, edit.viewport().height() + 10);
            vi.advanceTimersByTime(120);
            mouse(edit, CEventType.MouseRelease, 6, edit.viewport().height() + 10);
            const position = edit.cursorPosition();
            const scroll = edit.scrollY();
            vi.advanceTimersByTime(200);
            expect(edit.cursorPosition()).toBe(position);
            expect(edit.scrollY()).toBe(scroll);
            edit.destroy();
        });
        test("losing focus stops automatic scrolling", () => {
            vi.useFakeTimers();
            const edit = editor();
            mouse(edit, CEventType.MousePress, 6, 6);
            mouse(edit, CEventType.MouseMove, 6, edit.viewport().height() + 10);
            vi.advanceTimersByTime(120);
            const other = new CTextEdit();
            other.setFocus();
            const position = edit.cursorPosition();
            const scroll = edit.scrollY();
            vi.advanceTimersByTime(200);
            expect(edit.cursorPosition()).toBe(position);
            expect(edit.scrollY()).toBe(scroll);
            edit.destroy();
            other.destroy();
        });
        test("read-only text can still be selected by autoscrolling", () => {
            vi.useFakeTimers();
            const edit = editor();
            edit.setReadOnly(true);
            mouse(edit, CEventType.MousePress, 6, 6);
            mouse(edit, CEventType.MouseMove, 6, edit.viewport().height() + 10);
            const position = edit.cursorPosition();
            vi.advanceTimersByTime(200);
            expect(edit.cursorPosition()).toBeGreaterThan(position);
            expect(edit.toPlainText()).toBe(text);
            edit.destroy();
        });
        test("destroying the editor cancels its selection timer", () => {
            vi.useFakeTimers();
            const edit = editor();
            mouse(edit, CEventType.MousePress, 6, 6);
            mouse(edit, CEventType.MouseMove, 6, edit.viewport().height() + 10);
            const move = vi.spyOn(edit, "scrollTo");
            edit.destroy();
            move.mockClear();
            vi.advanceTimersByTime(200);
            expect(move).not.toHaveBeenCalled();
        });
        test("moving outside without a pressed mouse button does not start scrolling", () => {
            vi.useFakeTimers();
            const edit = editor();
            const position = edit.cursorPosition();
            mouse(edit, CEventType.MouseMove, 6, edit.viewport().height() + 10);
            vi.advanceTimersByTime(200);
            expect(edit.cursorPosition()).toBe(position);
            expect(edit.scrollY()).toBe(0);
            edit.destroy();
        });
        test("disabling the editor stops selection autoscroll", () => {
            vi.useFakeTimers();
            const edit = editor();
            mouse(edit, CEventType.MousePress, 6, 6);
            mouse(edit, CEventType.MouseMove, 6, edit.viewport().height() + 10);
            edit.setEnabled(false);
            const position = edit.cursorPosition();
            const scroll = edit.scrollY();
            vi.advanceTimersByTime(200);
            expect(edit.cursorPosition()).toBe(position);
            expect(edit.scrollY()).toBe(scroll);
            edit.destroy();
        });
        test("autoscroll stops polling when the document edge is reached", () => {
            vi.useFakeTimers();
            const edit = editor();
            edit.setPlainText("one\ntwo\nthree\nfour\nfive\nsix");
            edit.setCursorPosition(0);
            mouse(edit, CEventType.MousePress, 6, 6);
            mouse(edit, CEventType.MouseMove, 6, edit.viewport().height() + 10);
            vi.advanceTimersByTime(400);
            const move = vi.spyOn(edit, "scrollTo");
            vi.advanceTimersByTime(200);
            expect(move).not.toHaveBeenCalled();
            expect(edit.scrollY()).toBeGreaterThan(0);
            edit.destroy();
        });
    });
});
