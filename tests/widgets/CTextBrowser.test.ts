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
});
