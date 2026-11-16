import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CFontMetrics } from "../../src/gui/CFontMetrics.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { CFont } from "../../src/gui/CFont.js";
import { TestPaintDevice } from "../helpers/createTestPaintEngine.js";

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

	test("measures text without requesting a context from a custom device's canvas", () => {
		CApplication.instance().destroy();
		const canvas = createTestCanvas();
		const getContext = vi.spyOn(canvas, "getContext").mockReturnValue(null);
		const paintDevice = Object.assign(new TestPaintDevice(), { resize: () => false });
		const app = new CApplication(canvas, paintDevice);

		expect(app.paintDevice()).toBe(paintDevice);
		expect(new CFontMetrics(new CFont("sans-serif", 16)).textWidth("Hello")).toBe(40);
		expect(getContext).not.toHaveBeenCalled();
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
