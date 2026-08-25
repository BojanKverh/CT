import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CStackedWidget } from "../../src/widgets/CStackedWidget.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CStackedWidget", () =>
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

	test("has no widgets by default", () =>
	{
		const stack = new CStackedWidget();

		expect(stack.count()).toBe(0);
	});

	test("has no current widget by default", () =>
	{
		const stack = new CStackedWidget();

		expect(stack.currentIndex()).toBe(-1);
		expect(stack.currentWidget()).toBeNull();
	});

	test("stores parent from constructor", () =>
	{
		const parent = new CWidget();
		const stack = new CStackedWidget(parent);

		expect(stack.parent()).toBe(parent);
	});

	test("adds widget", () =>
	{
		const stack = new CStackedWidget();
		const page = new CWidget();

		const index = stack.addWidget(page);

		expect(index).toBe(0);
		expect(stack.count()).toBe(1);
		expect(stack.widget(0)).toBe(page);
	});

	test("added widget becomes child of stack", () =>
	{
		const stack = new CStackedWidget();
		const page = new CWidget();

		stack.addWidget(page);

		expect(page.parent()).toBe(stack);
	});

	test("first added widget becomes current", () =>
	{
		const stack = new CStackedWidget();
		const page = new CWidget();

		stack.addWidget(page);

		expect(stack.currentIndex()).toBe(0);
		expect(stack.currentWidget()).toBe(page);
		expect(page.isVisible()).toBe(true);
	});

	test("additional widgets are hidden", () =>
	{
		const stack = new CStackedWidget();
		const page1 = new CWidget();
		const page2 = new CWidget();

		stack.addWidget(page1);
		stack.addWidget(page2);

		expect(page1.isVisible()).toBe(true);
		expect(page2.isVisible()).toBe(false);
	});

	test("addWidget returns widget index", () =>
	{
		const stack = new CStackedWidget();

		expect(stack.addWidget(new CWidget())).toBe(0);
		expect(stack.addWidget(new CWidget())).toBe(1);
		expect(stack.addWidget(new CWidget())).toBe(2);
	});

	test("does not add same widget twice", () =>
	{
		const stack = new CStackedWidget();
		const page = new CWidget();

		expect(stack.addWidget(page)).toBe(0);
		expect(stack.addWidget(page)).toBe(0);
		expect(stack.count()).toBe(1);
	});

	test("inserts widget at requested index", () =>
	{
		const stack = new CStackedWidget();
		const page1 = new CWidget();
		const page2 = new CWidget();
		const page3 = new CWidget();

		stack.addWidget(page1);
		stack.addWidget(page3);

		expect(stack.insertWidget(1, page2)).toBe(1);

		expect(stack.widget(0)).toBe(page1);
		expect(stack.widget(1)).toBe(page2);
		expect(stack.widget(2)).toBe(page3);
	});

	test("insertWidget clamps negative index to beginning", () =>
	{
		const stack = new CStackedWidget();
		const page1 = new CWidget();
		const page2 = new CWidget();

		stack.addWidget(page1);
		stack.insertWidget(-10, page2);

		expect(stack.widget(0)).toBe(page2);
		expect(stack.widget(1)).toBe(page1);
	});

	test("insertWidget clamps large index to end", () =>
	{
		const stack = new CStackedWidget();
		const page1 = new CWidget();
		const page2 = new CWidget();

		stack.addWidget(page1);
		stack.insertWidget(100, page2);

		expect(stack.widget(0)).toBe(page1);
		expect(stack.widget(1)).toBe(page2);
	});

	test("inserting before current widget preserves current widget", () =>
	{
		const stack = new CStackedWidget();
		const page1 = new CWidget();
		const page2 = new CWidget();
		const page3 = new CWidget();

		stack.addWidget(page1);
		stack.addWidget(page2);
		stack.setCurrentWidget(page2);

		stack.insertWidget(0, page3);

		expect(stack.currentWidget()).toBe(page2);
		expect(stack.currentIndex()).toBe(2);
	});

	test("widget returns null for invalid index", () =>
	{
		const stack = new CStackedWidget();

		stack.addWidget(new CWidget());

		expect(stack.widget(-1)).toBeNull();
		expect(stack.widget(1)).toBeNull();
	});

	test("indexOf returns widget index", () =>
	{
		const stack = new CStackedWidget();
		const page1 = new CWidget();
		const page2 = new CWidget();

		stack.addWidget(page1);
		stack.addWidget(page2);

		expect(stack.indexOf(page1)).toBe(0);
		expect(stack.indexOf(page2)).toBe(1);
	});

	test("indexOf returns -1 for unknown widget", () =>
	{
		const stack = new CStackedWidget();
		const page = new CWidget();

		expect(stack.indexOf(page)).toBe(-1);
	});

	test("setCurrentIndex changes current widget", () =>
	{
		const stack = new CStackedWidget();
		const page1 = new CWidget();
		const page2 = new CWidget();

		stack.addWidget(page1);
		stack.addWidget(page2);

		stack.setCurrentIndex(1);

		expect(stack.currentIndex()).toBe(1);
		expect(stack.currentWidget()).toBe(page2);
	});

	test("setCurrentIndex hides previous widget", () =>
	{
		const stack = new CStackedWidget();
		const page1 = new CWidget();
		const page2 = new CWidget();

		stack.addWidget(page1);
		stack.addWidget(page2);

		stack.setCurrentIndex(1);

		expect(page1.isVisible()).toBe(false);
		expect(page2.isVisible()).toBe(true);
	});

	test("setCurrentIndex ignores invalid index", () =>
	{
		const stack = new CStackedWidget();
		const page = new CWidget();

		stack.addWidget(page);

		stack.setCurrentIndex(-1);
		expect(stack.currentIndex()).toBe(0);

		stack.setCurrentIndex(10);
		expect(stack.currentIndex()).toBe(0);
	});

	test("setCurrentIndex does nothing for current index", () =>
	{
		const stack = new CStackedWidget();
		const page = new CWidget();

		stack.addWidget(page);

		const slot = vi.fn();
		stack.currentChanged.connect(slot);

		stack.setCurrentIndex(0);

		expect(slot).not.toHaveBeenCalled();
	});

	test("setCurrentWidget changes current widget", () =>
	{
		const stack = new CStackedWidget();
		const page1 = new CWidget();
		const page2 = new CWidget();

		stack.addWidget(page1);
		stack.addWidget(page2);

		stack.setCurrentWidget(page2);

		expect(stack.currentWidget()).toBe(page2);
		expect(stack.currentIndex()).toBe(1);
	});

	test("setCurrentWidget ignores unknown widget", () =>
	{
		const stack = new CStackedWidget();
		const page1 = new CWidget();
		const page2 = new CWidget();

		stack.addWidget(page1);
		stack.setCurrentWidget(page2);

		expect(stack.currentWidget()).toBe(page1);
		expect(stack.currentIndex()).toBe(0);
	});

	test("first widget emits currentChanged", () =>
	{
		const stack = new CStackedWidget();
		const slot = vi.fn();

		stack.currentChanged.connect(slot);
		stack.addWidget(new CWidget());

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith(0);
	});

	test("changing current index emits currentChanged", () =>
	{
		const stack = new CStackedWidget();
		const slot = vi.fn();

		stack.addWidget(new CWidget());
		stack.addWidget(new CWidget());

		stack.currentChanged.connect(slot);
		stack.setCurrentIndex(1);

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith(1);
	});

	test("removeWidget removes widget", () =>
	{
		const stack = new CStackedWidget();
		const page1 = new CWidget();
		const page2 = new CWidget();

		stack.addWidget(page1);
		stack.addWidget(page2);

		const removed = stack.removeWidget(1);

		expect(removed).toBe(page2);
		expect(stack.count()).toBe(1);
		expect(stack.indexOf(page2)).toBe(-1);
	});

	test("removeWidget returns null for invalid index", () =>
	{
		const stack = new CStackedWidget();

		expect(stack.removeWidget(-1)).toBeNull();
		expect(stack.removeWidget(0)).toBeNull();
	});

	test("removed widget no longer has stack as parent", () =>
	{
		const stack = new CStackedWidget();
		const page = new CWidget();

		stack.addWidget(page);
		stack.removeWidget(0);

		expect(page.parent()).toBeNull();
	});

	test("removed widget is hidden", () =>
	{
		const stack = new CStackedWidget();
		const page = new CWidget();

		stack.addWidget(page);
		stack.removeWidget(0);

		expect(page.isVisible()).toBe(false);
	});

	test("removing only widget clears current widget", () =>
	{
		const stack = new CStackedWidget();
		const page = new CWidget();

		stack.addWidget(page);
		stack.removeWidget(0);

		expect(stack.currentIndex()).toBe(-1);
		expect(stack.currentWidget()).toBeNull();
	});

	test("removing only widget emits currentChanged with -1", () =>
	{
		const stack = new CStackedWidget();

		stack.addWidget(new CWidget());

		const slot = vi.fn();
		stack.currentChanged.connect(slot);

		stack.removeWidget(0);

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith(-1);
	});

	test("removing current widget selects next widget", () =>
	{
		const stack = new CStackedWidget();
		const page1 = new CWidget();
		const page2 = new CWidget();
		const page3 = new CWidget();

		stack.addWidget(page1);
		stack.addWidget(page2);
		stack.addWidget(page3);

		stack.setCurrentIndex(1);
		stack.removeWidget(1);

		expect(stack.currentIndex()).toBe(1);
		expect(stack.currentWidget()).toBe(page3);
		expect(page3.isVisible()).toBe(true);
	});

	test("removing last current widget selects previous widget", () =>
	{
		const stack = new CStackedWidget();
		const page1 = new CWidget();
		const page2 = new CWidget();

		stack.addWidget(page1);
		stack.addWidget(page2);

		stack.setCurrentIndex(1);
		stack.removeWidget(1);

		expect(stack.currentIndex()).toBe(0);
		expect(stack.currentWidget()).toBe(page1);
		expect(page1.isVisible()).toBe(true);
	});

	test("removing widget before current preserves current widget", () =>
	{
		const stack = new CStackedWidget();
		const page1 = new CWidget();
		const page2 = new CWidget();
		const page3 = new CWidget();

		stack.addWidget(page1);
		stack.addWidget(page2);
		stack.addWidget(page3);

		stack.setCurrentWidget(page3);
		stack.removeWidget(0);

		expect(stack.currentWidget()).toBe(page3);
		expect(stack.currentIndex()).toBe(1);
	});

	test("removing non-current widget does not emit currentChanged", () =>
	{
		const stack = new CStackedWidget();

		stack.addWidget(new CWidget());
		stack.addWidget(new CWidget());

		const slot = vi.fn();
		stack.currentChanged.connect(slot);

		stack.removeWidget(1);

		expect(slot).not.toHaveBeenCalled();
	});

	test("resizes added widget to stack size", () =>
	{
		const stack = new CStackedWidget();

		stack.resize(300, 200);

		const page = new CWidget();
		stack.addWidget(page);

		expect(page.x()).toBe(0);
		expect(page.y()).toBe(0);
		expect(page.width()).toBe(300);
		expect(page.height()).toBe(200);
	});

	test("resizing stack resizes all pages", () =>
	{
		const stack = new CStackedWidget();
		const page1 = new CWidget();
		const page2 = new CWidget();

		stack.addWidget(page1);
		stack.addWidget(page2);

		stack.resize(320, 240);

		expect(page1.width()).toBe(320);
		expect(page1.height()).toBe(240);
		expect(page2.width()).toBe(320);
		expect(page2.height()).toBe(240);
	});

	test("moving stack does not change page local position", () =>
	{
		const stack = new CStackedWidget();
		const page = new CWidget();

		stack.addWidget(page);
		stack.move(100, 80);

		expect(page.x()).toBe(0);
		expect(page.y()).toBe(0);
	});

	test("removed widget can be destroyed", () =>
	{
		const stack = new CStackedWidget();
		const page = new CWidget();

		stack.addWidget(page);

		const removed = stack.removeWidget(0);

		expect(() => removed?.destroy()).not.toThrow();
	});
});