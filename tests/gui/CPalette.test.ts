import { describe, expect, test } from "vitest";

import { CColor } from "../../src/gui/CColor.js";
import {
	CPalette,
	CPaletteColorRole
} from "../../src/gui/CPalette.js";

describe("CPalette", () => {
	test("has default window color", () => {
		const palette = new CPalette();

		expect(
			palette.color(CPaletteColorRole.Window)
		).toEqual(new CColor(240, 240, 240));
	});

	test("has default window text color", () => {
		const palette = new CPalette();

		expect(
			palette.color(CPaletteColorRole.WindowText)
		).toEqual(new CColor(0, 0, 0));
	});

	test("has default base color", () => {
		const palette = new CPalette();

		expect(
			palette.color(CPaletteColorRole.Base)
		).toEqual(new CColor(255, 255, 255));
	});

	test("has default text color", () => {
		const palette = new CPalette();

		expect(
			palette.color(CPaletteColorRole.Text)
		).toEqual(new CColor(0, 0, 0));
	});

	test("has default button color", () => {
		const palette = new CPalette();

		expect(
			palette.color(CPaletteColorRole.Button)
		).toEqual(new CColor(240, 240, 240));
	});

	test("has default button text color", () => {
		const palette = new CPalette();

		expect(
			palette.color(CPaletteColorRole.ButtonText)
		).toEqual(new CColor(0, 0, 0));
	});

	test("has default highlight color", () => {
		const palette = new CPalette();

		expect(
			palette.color(CPaletteColorRole.Highlight)
		).toEqual(new CColor(0, 120, 215));
	});

	test("has default highlighted text color", () => {
		const palette = new CPalette();

		expect(
			palette.color(CPaletteColorRole.HighlightedText)
		).toEqual(new CColor(255, 255, 255));
	});

	test("sets color for role", () => {
		const palette = new CPalette();
		const color = new CColor(10, 20, 30);

		palette.setColor(CPaletteColorRole.Button, color);

		expect(
			palette.color(CPaletteColorRole.Button)
		).toBe(color);
	});

	test("changing one role does not affect other roles", () => {
		const palette = new CPalette();

		palette.setColor(
			CPaletteColorRole.Button,
			new CColor(10, 20, 30)
		);

		expect(
			palette.color(CPaletteColorRole.Window)
		).toEqual(new CColor(240, 240, 240));
	});
});