import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CToolTipWidget } from "../../src/widgets/CToolTipWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CToolTipWidget", () =>
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

	test("has empty text by default", () =>
	{
		const toolTip = new CToolTipWidget();

		expect(toolTip.text()).toBe("");
	});

	test("sets text", () =>
	{
		const toolTip = new CToolTipWidget();

		toolTip.setText("Hello");

		expect(toolTip.text()).toBe("Hello");
	});

	test("setText resizes tooltip to text", () =>
	{
		const toolTip = new CToolTipWidget();

		toolTip.setText("Hello");

		expect(toolTip.width()).toBe(
			5 * 8 + 2 * toolTip.style().toolTipHorizontalPadding()
		);

		expect(toolTip.height()).toBe(
			13 + 2 * toolTip.style().toolTipVerticalPadding()
		);
	});

	test("longer text makes tooltip wider", () =>
	{
		const toolTip = new CToolTipWidget();

		toolTip.setText("Hello");
		const oldWidth = toolTip.width();

		toolTip.setText("Hello world");

		expect(toolTip.width()).toBeGreaterThan(oldWidth);
	});

	test("setting same text does not change size", () =>
	{
		const toolTip = new CToolTipWidget();

		toolTip.setText("Hello");

		const width = toolTip.width();
		const height = toolTip.height();

		toolTip.setText("Hello");

		expect(toolTip.width()).toBe(width);
		expect(toolTip.height()).toBe(height);
	});
});