import { describe, expect, test } from "vitest";
import { CTextCharFormat } from "../../src/gui/CTextCharFormat.js";

describe("CTextCharFormat anchor metadata", () => {
	test("stores underline and anchor href", () => {
		const format = new CTextCharFormat();
		format.setFontUnderline(true);
		format.setAnchorHref("/docs");

		expect(format.fontUnderline()).toBe(true);
		expect(format.anchorHref()).toBe("/docs");
	});

	test("clone preserves underline and anchor href", () => {
		const format = new CTextCharFormat();
		format.setFontUnderline(true);
		format.setAnchorHref("/docs");

		const clone = format.clone();

		expect(clone.equals(format)).toBe(true);
		expect(clone.anchorHref()).toBe("/docs");
	});
});
