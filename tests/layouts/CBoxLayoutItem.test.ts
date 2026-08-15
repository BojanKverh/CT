import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CBoxLayoutItem } from "../../src/layouts/CBoxLayoutItem.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";

describe("CBoxLayoutItem", () => {
	beforeEach(() => {
		Object.defineProperty(globalThis, "window", {
			value: createTestWindow(),
			writable: true,
			configurable: true
		});

		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("stores widget", () => {
		const widget = new CWidget();
		const item = new CBoxLayoutItem(widget);

		expect(item.widget()).toBe(widget);
	});

	test("uses zero stretch by default", () => {
		const widget = new CWidget();
		const item = new CBoxLayoutItem(widget);

		expect(item.stretch()).toBe(0);
	});

	test("stores stretch", () => {
		const widget = new CWidget();
		const item = new CBoxLayoutItem(widget, 3);

		expect(item.stretch()).toBe(3);
	});

	test("clamps negative stretch to zero", () => {
		const widget = new CWidget();
		const item = new CBoxLayoutItem(widget, -2);

		expect(item.stretch()).toBe(0);
	});

	test("sets stretch", () => {
		const widget = new CWidget();
		const item = new CBoxLayoutItem(widget);

		item.setStretch(4);

		expect(item.stretch()).toBe(4);
	});

	test("clamps negative stretch when setting stretch", () => {
		const widget = new CWidget();
		const item = new CBoxLayoutItem(widget, 3);

		item.setStretch(-1);

		expect(item.stretch()).toBe(0);
	});
});