import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CFontMetrics } from "../../src/gui/CFontMetrics.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { CFont } from "../../src/gui/CFont.js";

describe("CFontMetrics", () =>
{
	beforeEach(() =>
	{
		new CApplication(createTestCanvas());
	});

	afterEach(() =>
	{
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("stores font", () =>
	{
		const metrics = new CFontMetrics(new CFont("sans-serif", 16));

		expect(metrics.font().toCss()).toBe("16px sans-serif");
	});

	test("returns text width", () =>
	{
		const metrics = new CFontMetrics(new CFont("sans-serif", 16));

		expect(metrics.textWidth("Hello")).toBe(40);
	});

	test("returns zero width for empty text", () =>
	{
		const metrics = new CFontMetrics(new CFont("sans-serif", 16));

		expect(metrics.textWidth("")).toBe(0);
	});

	test("returns font height", () =>
	{
		const metrics = new CFontMetrics(new CFont("sans-serif", 16));

		expect(metrics.height()).toBe(13);
	});

	test("returns an independent font copy", () => {
		const metrics = new CFontMetrics(new CFont("Arial", 16));
		const font = metrics.font();

		font.setPixelSize(24);

		expect(metrics.font().pixelSize()).toBe(16);
	});
});
