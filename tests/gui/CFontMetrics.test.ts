import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CFontMetrics } from "../../src/gui/CFontMetrics.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

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
		const metrics = new CFontMetrics("16px sans-serif");

		expect(metrics.font()).toBe("16px sans-serif");
	});

	test("returns text width", () =>
	{
		const metrics = new CFontMetrics("16px sans-serif");

		expect(metrics.textWidth("Hello")).toBe(40);
	});

	test("returns zero width for empty text", () =>
	{
		const metrics = new CFontMetrics("16px sans-serif");

		expect(metrics.textWidth("")).toBe(0);
	});

	test("returns font height", () =>
	{
		const metrics = new CFontMetrics("16px sans-serif");

		expect(metrics.height()).toBe(13);
	});
});