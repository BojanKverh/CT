import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CBoxLayoutDirection } from "../../src/layouts/CBoxLayout.js";
import { CBoxLayout } from "../../src/layouts/CBoxLayout.js";
import { CHBoxLayout } from "../../src/layouts/CHBoxLayout.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";

describe("CHBoxLayout", () => {
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

	test("uses left to right direction", () => {
		const layout = new CHBoxLayout();

		expect(layout.direction()).toBe(
			CBoxLayoutDirection.LeftToRight
		);
	});

	test("lays out widgets from left to right", () => {
		const parent = new CWidget();
		parent.resize(300, 100);

		const layout = new CHBoxLayout();
		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();
		const widget3 = new CWidget();

		layout.addWidget(widget1);
		layout.addWidget(widget2);
		layout.addWidget(widget3);

		expect(widget1.x()).toBe(0);
		expect(widget2.x()).toBe(100);
		expect(widget3.x()).toBe(200);

		expect(widget1.height()).toBe(100);
		expect(widget2.height()).toBe(100);
		expect(widget3.height()).toBe(100);
	});

	test("uses configured spacing", () => {
		const parent = new CWidget();
		parent.resize(220, 50);

		const layout = new CHBoxLayout();
		layout.setSpacing(20);
		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();

		layout.addWidget(widget1);
		layout.addWidget(widget2);

		expect(widget1.width()).toBe(100);
		expect(widget2.x()).toBe(120);
		expect(widget2.width()).toBe(100);
	});

	test("updates layout when parent width changes", () => {
		const parent = new CWidget();
		parent.resize(200, 50);

		const layout = new CHBoxLayout();
		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();

		layout.addWidget(widget1);
		layout.addWidget(widget2);

		parent.resize(400, 50);

		expect(widget1.width()).toBe(200);
		expect(widget2.x()).toBe(200);
		expect(widget2.width()).toBe(200);
	});

	test("applies contents margins horizontally", () => {
		const parent = new CWidget();
		parent.resize(340, 100);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.LeftToRight
		);

		layout.setContentsMargins(10, 20, 30, 10);
		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();

		layout.addWidget(widget1);
		layout.addWidget(widget2);

		expect(widget1.x()).toBe(10);
		expect(widget1.y()).toBe(20);
		expect(widget1.width()).toBe(150);
		expect(widget1.height()).toBe(70);

		expect(widget2.x()).toBe(160);
		expect(widget2.y()).toBe(20);
		expect(widget2.width()).toBe(150);
		expect(widget2.height()).toBe(70);
	});
});