import { describe, expect, test } from "vitest";
import { CTextCharFormat } from "../../src/gui/CTextCharFormat.js";
import { CTextDocument } from "../../src/gui/CTextDocument.js";

describe("CTextCharFormat", () => {
	test("has a plain default format", () => {
		const format = new CTextCharFormat();

		expect(format.fontBold()).toBe(false);
		expect(format.fontItalic()).toBe(false);
		expect(format.foreground()).toBeNull();
		expect(format.fontFamily()).toBeNull();
		expect(format.fontSize()).toBeNull();
	});

	test("stores character formatting", () => {
		const format = new CTextCharFormat();
		format.setFontBold(true);
		format.setFontItalic(true);
		format.setForeground("#ff0000");
		format.setFontFamily("serif");
		format.setFontSize(18);

		expect(format.fontBold()).toBe(true);
		expect(format.fontItalic()).toBe(true);
		expect(format.foreground()).toBe("#ff0000");
		expect(format.fontFamily()).toBe("serif");
		expect(format.fontSize()).toBe(18);
	});

	test("clones independently", () => {
		const original = new CTextCharFormat();
		original.setFontBold(true);

		const clone = original.clone();
		clone.setFontItalic(true);

		expect(original.fontItalic()).toBe(false);
		expect(clone.fontBold()).toBe(true);
		expect(clone.fontItalic()).toBe(true);
	});
});

describe("CTextDocument", () => {
	test("stores plain text", () => {
		const document = new CTextDocument("Canvas Toolkit");

		expect(document.toPlainText()).toBe("Canvas Toolkit");
		expect(document.length()).toBe(14);
	});

	test("starts with one default format range", () => {
		const document = new CTextDocument("Hello");
		const ranges = document.formatRanges();

		expect(ranges).toHaveLength(1);
		expect(ranges[0]!.start).toBe(0);
		expect(ranges[0]!.length).toBe(5);
		expect(ranges[0]!.format.fontBold()).toBe(false);
	});

	test("applies a format to a text range", () => {
		const document = new CTextDocument("Hello world");
		const bold = new CTextCharFormat();
		bold.setFontBold(true);

		document.setCharFormat(6, 5, bold);

		const ranges = document.formatRanges();
		expect(ranges).toHaveLength(2);
		expect(ranges[0]!.length).toBe(6);
		expect(ranges[0]!.format.fontBold()).toBe(false);
		expect(ranges[1]!.start).toBe(6);
		expect(ranges[1]!.length).toBe(5);
		expect(ranges[1]!.format.fontBold()).toBe(true);
	});

	test("splits a range when formatting its middle", () => {
		const document = new CTextDocument("abcdef");
		const italic = new CTextCharFormat();
		italic.setFontItalic(true);

		document.setCharFormat(2, 2, italic);

		const ranges = document.formatRanges();
		expect(ranges.map(r => [r.start, r.length, r.format.fontItalic()]))
			.toEqual([
				[0, 2, false],
				[2, 2, true],
				[4, 2, false]
			]);
	});

	test("merges adjacent equal ranges", () => {
		const document = new CTextDocument("abcdef");
		const bold = new CTextCharFormat();
		bold.setFontBold(true);

		document.setCharFormat(0, 3, bold);
		document.setCharFormat(3, 3, bold);

		const ranges = document.formatRanges();
		expect(ranges).toHaveLength(1);
		expect(ranges[0]!.start).toBe(0);
		expect(ranges[0]!.length).toBe(6);
		expect(ranges[0]!.format.fontBold()).toBe(true);
	});

	test("inserts text using the surrounding format", () => {
		const document = new CTextDocument("Hello");
		const bold = new CTextCharFormat();
		bold.setFontBold(true);
		document.setCharFormat(0, 5, bold);

		document.insert(5, " world");

		expect(document.toPlainText()).toBe("Hello world");
		expect(document.formatRanges()).toHaveLength(1);
		expect(document.charFormatAt(10).fontBold()).toBe(true);
	});

	test("inserts text with an explicit format", () => {
		const document = new CTextDocument("Hello world");
		const italic = new CTextCharFormat();
		italic.setFontItalic(true);

		document.insert(5, " beautiful", italic);

		expect(document.toPlainText()).toBe("Hello beautiful world");
		expect(document.charFormatAt(6).fontItalic()).toBe(true);
		expect(document.charFormatAt(0).fontItalic()).toBe(false);
	});

	test("removes text and preserves surrounding formats", () => {
		const document = new CTextDocument("Hello brave world");
		const bold = new CTextCharFormat();
		bold.setFontBold(true);
		document.setCharFormat(12, 5, bold);

		document.remove(6, 6);

		expect(document.toPlainText()).toBe("Hello world");
		expect(document.charFormatAt(6).fontBold()).toBe(true);
	});

	test("returns cloned formats", () => {
		const document = new CTextDocument("abc");
		const format = document.charFormatAt(0);
		format.setFontBold(true);

		expect(document.charFormatAt(0).fontBold()).toBe(false);
	});
});
