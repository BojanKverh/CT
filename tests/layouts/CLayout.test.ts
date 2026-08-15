import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CLayout } from "../../src/layouts/CLayout.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";

class TestLayout extends CLayout {
	updateCalls = 0;

	override update(): void {
		++this.updateCalls;
	}
}

describe("CLayout", () => {
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

	test("has no parent widget by default", () => {
		const layout = new TestLayout();

		expect(layout.parentWidget()).toBeNull();
	});

	test("sets parent widget", () => {
		const layout = new TestLayout();
		const parent = new CWidget();

		layout.setParentWidget(parent);

		expect(layout.parentWidget()).toBe(parent);
	});

	test("adds widget", () => {
		const layout = new TestLayout();
		const widget = new CWidget();

		layout.addWidget(widget);

		expect(layout.count()).toBe(1);
		expect(layout.widgetAt(0)).toBe(widget);
	});

	test("does not add the same widget twice", () => {
		const layout = new TestLayout();
		const widget = new CWidget();

		layout.addWidget(widget);
		layout.addWidget(widget);

		expect(layout.count()).toBe(1);
	});

	test("returns null for invalid widget index", () => {
		const layout = new TestLayout();

		expect(layout.widgetAt(0)).toBeNull();
		expect(layout.widgetAt(10)).toBeNull();
	});

	test("uses zero spacing by default", () => {
		const layout = new TestLayout();

		expect(layout.spacing()).toBe(0);
	});

	test("sets spacing", () => {
		const layout = new TestLayout();

		layout.setSpacing(8);

		expect(layout.spacing()).toBe(8);
	});

	test("setting spacing updates layout", () => {
		const layout = new TestLayout();

		layout.setSpacing(8);

		expect(layout.updateCalls).toBe(1);
	});

	test("setting same spacing does not update layout", () => {
		const layout = new TestLayout();

		layout.setSpacing(8);
		layout.setSpacing(8);

		expect(layout.updateCalls).toBe(1);
	});

	test("adding widget updates layout", () => {
		const layout = new TestLayout();
		const widget = new CWidget();

		layout.addWidget(widget);

		expect(layout.updateCalls).toBe(1);
	});

	test("added widget becomes child of parent widget", () => {
		const parent = new CWidget();
		const layout = new TestLayout();

		layout.setParentWidget(parent);

		const child = new CWidget();
		layout.addWidget(child);

		expect(child.parent()).toBe(parent);
	});

	test("existing widgets become children when parent widget is set", () => {
		const layout = new TestLayout();

		const child1 = new CWidget();
		const child2 = new CWidget();

		layout.addWidget(child1);
		layout.addWidget(child2);

		const parent = new CWidget();
		layout.setParentWidget(parent);

		expect(child1.parent()).toBe(parent);
		expect(child2.parent()).toBe(parent);
	});

	test("uses zero contents margins by default", () => {
		const layout = new TestLayout();

		expect(layout.contentsMargins()).toEqual({
			left: 0,
			top: 0,
			right: 0,
			bottom: 0
		});
	});

	test("sets contents margins", () => {
		const layout = new TestLayout();

		layout.setContentsMargins(10, 20, 30, 40);

		expect(layout.contentsMargins()).toEqual({
			left: 10,
			top: 20,
			right: 30,
			bottom: 40
		});
	});

	test("setting contents margins updates layout", () => {
		const layout = new TestLayout();

		layout.setContentsMargins(10, 20, 30, 40);

		expect(layout.updateCalls).toBe(1);
	});

	test("setting same contents margins does not update layout", () => {
		const layout = new TestLayout();

		layout.setContentsMargins(10, 20, 30, 40);
		layout.setContentsMargins(10, 20, 30, 40);

		expect(layout.updateCalls).toBe(1);
	});

	test("contentsMargins returns a copy", () => {
		const layout = new TestLayout();

		layout.setContentsMargins(10, 20, 30, 40);

		const margins = layout.contentsMargins();
		margins.left = 999;

		expect(layout.contentsMargins().left).toBe(10);
	});
});