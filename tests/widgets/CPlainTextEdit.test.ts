import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CClipboard } from "../../src/core/CClipboard.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CTextCharFormat } from "../../src/gui/CTextCharFormat.js";
import { CPlainTextEdit } from "../../src/widgets/CPlainTextEdit.js";
import { CTextEdit } from "../../src/widgets/CTextEdit.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";

describe("CPlainTextEdit", () => {
	let edit: CPlainTextEdit;
	let oldWindow: PropertyDescriptor | undefined;
	let oldNavigator: PropertyDescriptor | undefined;

	beforeEach(() => {
		oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
		oldNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
		Object.defineProperty(globalThis, "window", {
			value: createTestWindow(), configurable: true, writable: true
		});
		Object.defineProperty(globalThis, "navigator", {
			value: { clipboard: {
				writeText: vi.fn().mockResolvedValue(undefined),
				readText: vi.fn().mockResolvedValue("external <b>text</b>")
			} }, configurable: true, writable: true
		});
		new CApplication(createTestCanvas());
		edit = new CPlainTextEdit();
		edit.setGeometry(0, 0, 320, 160);
	});

	afterEach(() => {
		edit.destroy();
		if (CApplication.exists()) CApplication.instance().destroy();
		if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
		else Reflect.deleteProperty(globalThis, "window");
		if (oldNavigator) Object.defineProperty(globalThis, "navigator", oldNavigator);
		else Reflect.deleteProperty(globalThis, "navigator");
	});

	test("shares the CTextEdit implementation", () => {
		expect(edit instanceof CTextEdit).toBe(true);
		expect(edit.toPlainText()).toBe("");
	});

	test("accepts a parent", () => {
		const parent = new CWidget();
		const child = new CPlainTextEdit(parent);
		expect(child.parent()).toBe(parent);
		parent.destroy();
	});

	test("preserves whitespace, Unicode and markup in plain text", () => {
		const text = "čebelar\t42\n  <b>literal</b> & text\n";
		edit.setPlainText(text);
		expect(edit.toPlainText()).toBe(text);
	});

	test("insert replaces a selection and keeps markup literal", () => {
		edit.setPlainText("Hello world");
		edit.setSelection(6, 11);
		edit.insert("<i>CT</i>");
		expect(edit.toPlainText()).toBe("Hello <i>CT</i>");
		edit.undo();
		expect(edit.toPlainText()).toBe("Hello world");
		edit.redo();
		expect(edit.toPlainText()).toBe("Hello <i>CT</i>");
	});

	test("setHtml imports text without character formatting", () => {
		edit.setHtml('<b>Hello</b><br><span style="color: red">world</span>');
		expect(edit.toPlainText()).toBe("Hello\nworld");
		edit.setCursorPosition(2);
		expect(edit.currentCharFormat().equals(new CTextCharFormat())).toBe(true);
		edit.setCursorPosition(edit.toPlainText().length);
		expect(edit.currentCharFormat().equals(new CTextCharFormat())).toBe(true);
		expect(edit.toHtml()).not.toContain("<b>");
		expect(edit.toHtml()).not.toContain("color:");
	});

	const formatters: Array<[string, (editor: CTextEdit) => void]> = [
		["bold", editor => editor.setFontBold(true)],
		["italic", editor => editor.setFontItalic(true)],
		["underline", editor => editor.setFontUnderline(true)],
		["color", editor => editor.setTextColor("red")],
		["family", editor => editor.setFontFamily("serif")],
		["size", editor => editor.setFontSize(30)],
		["complete format", editor => {
			const format = new CTextCharFormat();
			format.setFontBold(true);
			format.setAnchorHref("https://example.com");
			editor.setCurrentCharFormat(format);
		}]
	];
	for (const [name, apply] of formatters) {
		test(`ignores ${name} for selected and subsequently inserted text`, () => {
			edit.setPlainText("abc");
			edit.selectAll();
			const changed = vi.fn();
			edit.textChanged.connect(changed);
			apply(edit);
			expect(edit.selectedText()).toBe("abc");
			expect(edit.currentCharFormat().equals(new CTextCharFormat())).toBe(true);
			expect(edit.canUndo()).toBe(false);
			expect(changed).not.toHaveBeenCalled();
			edit.setCursorPosition(3);
			apply(edit);
			edit.insert("d");
			expect(edit.toPlainText()).toBe("abcd");
			expect(edit.currentCharFormat().equals(new CTextCharFormat())).toBe(true);
			edit.undo();
			expect(edit.toPlainText()).toBe("abc");
		});
	}

	test("CTextEdit still supports HTML and selected character formatting", () => {
		const rich = new CTextEdit();
		try {
			rich.setHtml("<b>Hello</b>");
			expect(rich.currentCharFormat().fontBold()).toBe(true);
			rich.selectAll();
			rich.setFontItalic(true);
			expect(rich.currentCharFormat().fontItalic()).toBe(true);
		} finally { rich.destroy(); }
	});

	test("copy and paste use plain text and preserve undo", () => {
		edit.setPlainText("<b>text</b>");
		edit.selectAll();
		edit.copy();
		expect(CClipboard.instance().text()).toBe("<b>text</b>");
		edit.setCursorPosition(edit.toPlainText().length);
		edit.paste();
		expect(edit.toPlainText()).toBe("<b>text</b><b>text</b>");
		edit.undo();
		expect(edit.toPlainText()).toBe("<b>text</b>");
	});

	test("system paste keeps markup literal", async () => {
		await edit.pasteFromSystem();
		expect(edit.toPlainText()).toBe("external <b>text</b>");
		expect(edit.currentCharFormat().fontBold()).toBe(false);
		edit.undo();
		expect(edit.toPlainText()).toBe("");
	});

	test("read-only blocks keyboard editing and paste", () => {
		edit.setPlainText("abc");
		edit.setReadOnly(true);
		edit.selectAll();
		edit.event(new CKeyEvent(CEventType.KeyPress, "Delete"));
		edit.insert("changed");
		CClipboard.instance().setText("paste");
		edit.paste();
		expect(edit.toPlainText()).toBe("abc");
		expect(edit.selectedText()).toBe("abc");
	});

	test("Enter and deletion share the existing undo implementation", () => {
		edit.setPlainText("abcd");
		edit.setCursorPosition(2);
		edit.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
		expect(edit.toPlainText()).toBe("ab\ncd");
		edit.event(new CKeyEvent(CEventType.KeyPress, "Delete"));
		expect(edit.toPlainText()).toBe("ab\nd");
		edit.undo();
		expect(edit.toPlainText()).toBe("ab\ncd");
	});

	test("Home and End navigate within the current line", () => {
		edit.setPlainText("first\nsecond\nthird");
		edit.setCursorPosition(8);
		edit.event(new CKeyEvent(CEventType.KeyPress, "Home"));
		expect(edit.cursorPosition()).toBe(6);
		edit.event(new CKeyEvent(CEventType.KeyPress, "End"));
		expect(edit.cursorPosition()).toBe(12);
	});

	test("plain text is escaped on inherited HTML export", () => {
		edit.setPlainText("<b>text</b> & more");
		expect(edit.toHtml()).toContain("&lt;b&gt;text&lt;/b&gt; &amp; more");
	});
});
