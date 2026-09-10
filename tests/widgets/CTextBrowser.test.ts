import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CTextBrowser } from "../../src/widgets/CTextBrowser.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CTextBrowser shared rich-text engine", () => {
	let app: CApplication;

	beforeEach(() => {
		app = new CApplication(createTestCanvas());
	});

	afterEach(() => {
		app.destroy();
	});

	test("uses CTextEdit formatting for imported HTML", () => {
		const browser = new CTextBrowser();

		browser.setHtml(
			'<b>bold</b> <span style="color: #ff0000; font-size: 30px">red</span>'
		);

		browser.setCursorPosition(1);
		expect(browser.currentCharFormat().fontBold()).toBe(true);

		browser.setCursorPosition(6);
		expect(browser.currentCharFormat().foreground()).toBe("#ff0000");
		expect(browser.currentCharFormat().fontSize()).toBe(30);
	});

	test("stores hyperlink metadata in the shared document format", () => {
		const browser = new CTextBrowser();

		browser.setHtml(
			'<a href="https://example.com">Example</a>'
		);
		browser.setCursorPosition(2);

		const format = browser.currentCharFormat();
		expect(format.anchorHref()).toBe("https://example.com");
		expect(format.fontUnderline()).toBe(true);
	});

	test("decodes entities in href through the shared HTML parser", () => {
		const browser = new CTextBrowser();

		browser.setHtml(
			'<a href="search?q=canvas&amp;page=2">Search</a>'
		);
		browser.setCursorPosition(1);

		expect(browser.currentCharFormat().anchorHref()).toBe(
			"search?q=canvas&page=2"
		);
	});

	test("keeps the original HTML source for browser compatibility", () => {
		const browser = new CTextBrowser();
		const html = '<p>Hello <b>world</b> <a href="/docs">docs</a></p>';

		browser.setHtml(html);

		expect(browser.toHtml()).toBe(html);
	});

	test("setPlainText leaves HTML source mode", () => {
		const browser = new CTextBrowser();

		browser.setHtml("<b>Hello</b>");
		browser.setPlainText("Plain");

		expect(browser.toHtml()).toBe("");
		expect(browser.toPlainText()).toBe("Plain");
	});
});
