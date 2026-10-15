import { describe, expect, test } from "vitest";
import {
	CFont,
	CFontCapitalization,
	CFontStretch,
	CFontStyle,
	CFontWeight
} from "../../src/gui/CFont.js";

describe("CFont", () => {
	test("has canvas-compatible defaults", () => {
		const font = new CFont();

		expect(font.family()).toBe("sans-serif");
		expect(font.pixelSize()).toBe(14);
		expect(font.weight()).toBe(CFontWeight.Normal);
		expect(font.style()).toBe(CFontStyle.Normal);
		expect(font.toCss()).toBe("14px sans-serif");
	});

	test("stores font properties", () => {
		const font = new CFont("Arial", 18);
		font.setWeight(CFontWeight.DemiBold);
		font.setStyle(CFontStyle.Oblique);
		font.setStretch(CFontStretch.Condensed);
		font.setCapitalization(CFontCapitalization.SmallCaps);

		expect(font.family()).toBe("Arial");
		expect(font.pixelSize()).toBe(18);
		expect(font.weight()).toBe(CFontWeight.DemiBold);
		expect(font.style()).toBe(CFontStyle.Oblique);
		expect(font.stretch()).toBe(CFontStretch.Condensed);
		expect(font.capitalization()).toBe(CFontCapitalization.SmallCaps);
	});

	test("supports bold and italic convenience properties", () => {
		const font = new CFont();
		font.setBold(true);
		font.setItalic(true);

		expect(font.isBold()).toBe(true);
		expect(font.isItalic()).toBe(true);
		expect(font.toCss()).toBe("italic 700 14px sans-serif");
	});

	test("creates independent copies", () => {
		const source = new CFont("Arial", 18, CFontWeight.Bold, true);
		const copy = new CFont(source);

		copy.setPixelSize(24);

		expect(copy.isEqual(source)).toBe(false);
		expect(source.pixelSize()).toBe(18);
	});

	test("converts every supported property to CSS shorthand", () => {
		const font = new CFont("Open Sans, sans-serif", 20);
		font.setStyle(CFontStyle.Italic);
		font.setWeight(CFontWeight.Bold);
		font.setStretch(CFontStretch.SemiExpanded);
		font.setCapitalization(CFontCapitalization.SmallCaps);

		expect(font.toCss()).toBe(
			"italic small-caps 700 semi-expanded 20px Open Sans, sans-serif"
		);
	});

	test("parses a canvas CSS font string", () => {
		const font = CFont.fromCss(
			"italic small-caps 700 condensed 16px Arial"
		);

		expect(font.style()).toBe(CFontStyle.Italic);
		expect(font.capitalization()).toBe(CFontCapitalization.SmallCaps);
		expect(font.weight()).toBe(CFontWeight.Bold);
		expect(font.stretch()).toBe(CFontStretch.Condensed);
		expect(font.pixelSize()).toBe(16);
		expect(font.family()).toBe("Arial");
	});

	test("ignores invalid family size and weight values", () => {
		const font = new CFont();

		font.setFamily("   ");
		font.setPixelSize(0);
		font.setWeight(Number.NaN);

		expect(font.toCss()).toBe("14px sans-serif");
	});
});
