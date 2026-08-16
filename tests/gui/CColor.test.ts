import { describe, expect, test } from "vitest";

import { CColor } from "../../src/gui/CColor.js";

describe("CColor", () => {
	test("stores RGB components", () => {
		const color = new CColor(10, 20, 30);

		expect(color.red()).toBe(10);
		expect(color.green()).toBe(20);
		expect(color.blue()).toBe(30);
	});

	test("uses full alpha by default", () => {
		const color = new CColor(10, 20, 30);

		expect(color.alpha()).toBe(255);
	});

	test("stores alpha component", () => {
		const color = new CColor(10, 20, 30, 128);

		expect(color.alpha()).toBe(128);
	});

	test("clamps components below zero", () => {
		const color = new CColor(-10, -20, -30, -40);

		expect(color.red()).toBe(0);
		expect(color.green()).toBe(0);
		expect(color.blue()).toBe(0);
		expect(color.alpha()).toBe(0);
	});

	test("clamps components above 255", () => {
		const color = new CColor(300, 400, 500, 600);

		expect(color.red()).toBe(255);
		expect(color.green()).toBe(255);
		expect(color.blue()).toBe(255);
		expect(color.alpha()).toBe(255);
	});

	test("compares equal colors", () => {
		const color1 = new CColor(10, 20, 30, 40);
		const color2 = new CColor(10, 20, 30, 40);

		expect(color1.equals(color2)).toBe(true);
	});

	test("compares different colors", () => {
		const color1 = new CColor(10, 20, 30, 40);
		const color2 = new CColor(10, 20, 31, 40);

		expect(color1.equals(color2)).toBe(false);
	});

	test("converts opaque color to CSS", () => {
		const color = new CColor(10, 20, 30);

		expect(color.toCss()).toBe(
			"rgba(10, 20, 30, 1)"
		);
	});

	test("converts translucent color to CSS", () => {
		const color = new CColor(10, 20, 30, 128);

		expect(color.toCss()).toBe(
			"rgba(10, 20, 30, 0.5019607843137255)"
		);
	});

	test("converts transparent color to CSS", () => {
		const color = new CColor(10, 20, 30, 0);

		expect(color.toCss()).toBe(
			"rgba(10, 20, 30, 0)"
		);
	});
});