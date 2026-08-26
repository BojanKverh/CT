import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CBoxLayout, CBoxLayoutDirection } from "../../src/layouts/CBoxLayout.js";
import { CVBoxLayout } from "../../src/layouts/CVBoxLayout.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";

describe("CVBoxLayout", () => {
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

	const spacing: number = 6;
	const margin: number = 6;

	test("uses top to bottom direction", () => {
		const layout = new CVBoxLayout();

		expect(layout.direction()).toBe(
			CBoxLayoutDirection.TopToBottom
		);
	});

	test("lays out widgets from top to bottom", () => {
		const parent = new CWidget();
		parent.resize(100, 300);

		const layout = new CVBoxLayout();
		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();
		const widget3 = new CWidget();

		layout.addWidget(widget1);
		layout.addWidget(widget2);
		layout.addWidget(widget3);

		const availableHeight = 300 - 2 * margin - 2 * spacing;
		const itemHeight = availableHeight / 3;

		expect(widget1.y()).toBe(margin);
		expect(widget2.y()).toBe(margin + itemHeight + spacing);
		expect(widget3.y()).toBe(margin + 2 * (itemHeight + spacing));

		expect(widget1.width()).toBe(100 - 2 * margin);
		expect(widget2.width()).toBe(100 - 2 * margin);
		expect(widget3.width()).toBe(100 - 2 * margin);
	});

	test("uses configured spacing", () => {
		const parent = new CWidget();
		parent.resize(50, 220);

		const layout = new CVBoxLayout();
		layout.setSpacing(20);
		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();

		layout.addWidget(widget1);
		layout.addWidget(widget2);

		const itemHeight = (220 - 2 * margin - 20) / 2;

		expect(widget1.height()).toBe(itemHeight);
		expect(widget2.y()).toBe(margin + itemHeight + 20);
		expect(widget2.height()).toBe(itemHeight);
	});

	test("updates layout when parent height changes", () => {
		const parent = new CWidget();
		parent.resize(50, 200);

		const layout = new CVBoxLayout();
		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();

		layout.addWidget(widget1);
		layout.addWidget(widget2);

		parent.resize(50, 400);

		const itemHeight = (400 - 2 * margin - spacing) / 2;

		expect(widget1.height()).toBe(itemHeight);
		expect(widget2.y()).toBe(margin + itemHeight + spacing);
		expect(widget2.height()).toBe(itemHeight);
	});

	test("applies contents margins vertically", () => {
		const parent = new CWidget();
		parent.resize(100, 340);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.TopToBottom
		);

		layout.setContentsMargins(20, 10, 10, 30);
		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();

		layout.addWidget(widget1);
		layout.addWidget(widget2);

		expect(widget1.x()).toBe(20);
		expect(widget1.y()).toBe(10);
		expect(widget1.width()).toBe(70);
		const itemHeight = (340 - 10 - 30 - spacing) / 2;

		expect(widget1.height()).toBe(itemHeight);

		expect(widget2.x()).toBe(20);
		expect(widget2.y()).toBe(10 + itemHeight + spacing);
		expect(widget2.width()).toBe(70);
		expect(widget2.height()).toBe(itemHeight);
	});
});