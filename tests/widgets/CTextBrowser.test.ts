import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CTextBrowser } from "../../src/widgets/CTextBrowser.js";
import { CTextEdit } from "../../src/widgets/CTextEdit.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CTextBrowser", () => {
	let app: CApplication;

	beforeEach(() => {
		app = new CApplication(createTestCanvas());
	});

	afterEach(() => {
		app.destroy();
	});

	test("is a CTextEdit", () => {
		const browser = new CTextBrowser();

		expect(browser).toBeInstanceOf(CTextEdit);
	});

	test("is read only by default", () => {
		const browser = new CTextBrowser();

		expect(browser.isReadOnly()).toBe(true);
	});

	test("cannot be made editable", () => {
		const browser = new CTextBrowser();

		browser.setReadOnly(false);

		expect(browser.isReadOnly()).toBe(true);
	});

	test("accepts a parent widget", () => {
		const parent = new CWidget();
		const browser = new CTextBrowser(parent);

		expect(browser.parent()).toBe(parent);
	});

	test("displays plain text", () => {
		const browser = new CTextBrowser();

		browser.setPlainText("Hello\nCanvas Toolkit");

		expect(browser.toPlainText()).toBe(
			"Hello\nCanvas Toolkit"
		);
	});

	test("does not allow insert", () => {
		const browser = new CTextBrowser();

		browser.setPlainText("Hello");
		browser.setCursorPosition(5);
		browser.insert(" world");

		expect(browser.toPlainText()).toBe("Hello");
	});

	test("does not expose undo history", () => {
		const browser = new CTextBrowser();

		browser.setPlainText("Hello");

		expect(browser.canUndo()).toBe(false);
		expect(browser.canRedo()).toBe(false);

		browser.undo();
		browser.redo();

		expect(browser.toPlainText()).toBe("Hello");
	});

	test("still supports text selection", () => {
		const browser = new CTextBrowser();

		browser.setPlainText("Canvas Toolkit");
		browser.setSelection(0, 6);

		expect(browser.hasSelection()).toBe(true);
		expect(browser.selectedText()).toBe("Canvas");
	});

	test("stores html source", () => {
		const browser = new CTextBrowser();
		const html = "<p>Hello <b>world</b></p>";

		browser.setHtml(html);

		expect(browser.toHtml()).toBe(html);
	});

	test("converts html to plain text", () => {
		const browser = new CTextBrowser();

		browser.setHtml(
			"<h2>Canvas Toolkit</h2>" +
			"<p>This is <b>CTextBrowser</b>.</p>"
		);

		expect(browser.toPlainText()).toBe(
			"Canvas Toolkit\nThis is CTextBrowser."
		);
	});

	test("supports br tags", () => {
		const browser = new CTextBrowser();

		browser.setHtml("one<br>two<br/>three");

		expect(browser.toPlainText()).toBe(
			"one\ntwo\nthree"
		);
	});

	test("decodes common html entities", () => {
		const browser = new CTextBrowser();

		browser.setHtml(
			"&lt;b&gt; &amp; &quot;hello&quot;"
		);

		expect(browser.toPlainText()).toBe(
			'<b> & "hello"'
		);
	});

	test("unknown tags preserve text content", () => {
		const browser = new CTextBrowser();

		browser.setHtml(
			"<section>Hello <span>world</span></section>"
		);

		expect(browser.toPlainText()).toBe(
			"Hello world"
		);
	});

	test("setPlainText leaves html mode", () => {
		const browser = new CTextBrowser();

		browser.setHtml("<b>Hello</b>");
		browser.setPlainText("Plain");

		expect(browser.toPlainText()).toBe("Plain");
		expect(browser.toHtml()).toBe("");
	});

	test("strips anchor markup from plain text", () => {
		const browser = new CTextBrowser();

		browser.setHtml(
			'<p>Visit <a href="https://example.com">Example</a>.</p>'
		);

		expect(browser.toPlainText()).toBe(
			"Visit Example."
		);
	});

	test("preserves anchor markup in html source", () => {
		const browser = new CTextBrowser();
		const html =
			'<a href="/documentation">Documentation</a>';

		browser.setHtml(html);

		expect(browser.toHtml()).toBe(html);
	});

	test("decodes entities in href", () => {
		const browser = new CTextBrowser();

		browser.setHtml(
			'<a href="search?q=canvas&amp;page=2">Search</a>'
		);

		expect(browser.toPlainText()).toBe("Search");
	});

});
