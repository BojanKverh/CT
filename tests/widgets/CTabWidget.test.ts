import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { CTabWidget } from "../../src/widgets/CTabWidget.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CTabWidget", () =>
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

	test("has no tabs by default", () =>
	{
		const tabs = new CTabWidget();

		expect(tabs.count()).toBe(0);
	});

	test("has no current tab by default", () =>
	{
		const tabs = new CTabWidget();

		expect(tabs.currentIndex()).toBe(-1);
		expect(tabs.currentWidget()).toBeNull();
	});

	test("stores parent from constructor", () =>
	{
		const parent = new CWidget();
		const tabs = new CTabWidget(parent);

		expect(tabs.parent()).toBe(parent);
	});

	test("adds tab", () =>
	{
		const tabs = new CTabWidget();
		const page = new CWidget();

		const index = tabs.addTab(page, "General");

		expect(index).toBe(0);
		expect(tabs.count()).toBe(1);
		expect(tabs.widget(0)).toBe(page);
		expect(tabs.tabText(0)).toBe("General");
	});

	test("first added tab becomes current", () =>
	{
		const tabs = new CTabWidget();
		const page = new CWidget();

		tabs.addTab(page, "General");

		expect(tabs.currentIndex()).toBe(0);
		expect(tabs.currentWidget()).toBe(page);
	});

	test("additional tabs do not become current", () =>
	{
		const tabs = new CTabWidget();
		const page1 = new CWidget();
		const page2 = new CWidget();

		tabs.addTab(page1, "General");
		tabs.addTab(page2, "Display");

		expect(tabs.currentWidget()).toBe(page1);
		expect(tabs.currentIndex()).toBe(0);
	});

	test("addTab returns tab index", () =>
	{
		const tabs = new CTabWidget();

		expect(tabs.addTab(new CWidget(), "One")).toBe(0);
		expect(tabs.addTab(new CWidget(), "Two")).toBe(1);
		expect(tabs.addTab(new CWidget(), "Three")).toBe(2);
	});

	test("does not add same widget twice", () =>
	{
		const tabs = new CTabWidget();
		const page = new CWidget();

		expect(tabs.addTab(page, "One")).toBe(0);
		expect(tabs.addTab(page, "Two")).toBe(0);
		expect(tabs.count()).toBe(1);
	});

	test("inserts tab at requested index", () =>
	{
		const tabs = new CTabWidget();
		const page1 = new CWidget();
		const page2 = new CWidget();
		const page3 = new CWidget();

		tabs.addTab(page1, "One");
		tabs.addTab(page3, "Three");
		tabs.insertTab(1, page2, "Two");

		expect(tabs.widget(0)).toBe(page1);
		expect(tabs.widget(1)).toBe(page2);
		expect(tabs.widget(2)).toBe(page3);

		expect(tabs.tabText(0)).toBe("One");
		expect(tabs.tabText(1)).toBe("Two");
		expect(tabs.tabText(2)).toBe("Three");
	});

	test("insertTab clamps negative index to beginning", () =>
	{
		const tabs = new CTabWidget();
		const page1 = new CWidget();
		const page2 = new CWidget();

		tabs.addTab(page1, "One");
		tabs.insertTab(-10, page2, "Two");

		expect(tabs.widget(0)).toBe(page2);
		expect(tabs.widget(1)).toBe(page1);
	});

	test("insertTab clamps large index to end", () =>
	{
		const tabs = new CTabWidget();
		const page1 = new CWidget();
		const page2 = new CWidget();

		tabs.addTab(page1, "One");
		tabs.insertTab(100, page2, "Two");

		expect(tabs.widget(0)).toBe(page1);
		expect(tabs.widget(1)).toBe(page2);
	});

	test("widget returns null for invalid index", () =>
	{
		const tabs = new CTabWidget();

		tabs.addTab(new CWidget(), "General");

		expect(tabs.widget(-1)).toBeNull();
		expect(tabs.widget(1)).toBeNull();
	});

	test("indexOf returns widget index", () =>
	{
		const tabs = new CTabWidget();
		const page1 = new CWidget();
		const page2 = new CWidget();

		tabs.addTab(page1, "One");
		tabs.addTab(page2, "Two");

		expect(tabs.indexOf(page1)).toBe(0);
		expect(tabs.indexOf(page2)).toBe(1);
	});

	test("indexOf returns -1 for unknown widget", () =>
	{
		const tabs = new CTabWidget();

		expect(tabs.indexOf(new CWidget())).toBe(-1);
	});

	test("returns tab text", () =>
	{
		const tabs = new CTabWidget();

		tabs.addTab(new CWidget(), "General");

		expect(tabs.tabText(0)).toBe("General");
	});

	test("tabText returns empty string for invalid index", () =>
	{
		const tabs = new CTabWidget();

		expect(tabs.tabText(0)).toBe("");
		expect(tabs.tabText(-1)).toBe("");
	});

	test("setTabText changes tab text", () =>
	{
		const tabs = new CTabWidget();

		tabs.addTab(new CWidget(), "General");
		tabs.setTabText(0, "Settings");

		expect(tabs.tabText(0)).toBe("Settings");
	});

	test("setTabText ignores invalid index", () =>
	{
		const tabs = new CTabWidget();

		expect(() => tabs.setTabText(0, "Settings")).not.toThrow();
	});

	test("tabs are enabled by default", () =>
	{
		const tabs = new CTabWidget();

		tabs.addTab(new CWidget(), "General");

		expect(tabs.isTabEnabled(0)).toBe(true);
	});

	test("setTabEnabled disables tab", () =>
	{
		const tabs = new CTabWidget();

		tabs.addTab(new CWidget(), "General");
		tabs.setTabEnabled(0, false);

		expect(tabs.isTabEnabled(0)).toBe(false);
	});

	test("isTabEnabled returns false for invalid index", () =>
	{
		const tabs = new CTabWidget();

		expect(tabs.isTabEnabled(-1)).toBe(false);
		expect(tabs.isTabEnabled(0)).toBe(false);
	});

	test("setCurrentIndex changes current tab", () =>
	{
		const tabs = new CTabWidget();
		const page1 = new CWidget();
		const page2 = new CWidget();

		tabs.addTab(page1, "One");
		tabs.addTab(page2, "Two");

		tabs.setCurrentIndex(1);

		expect(tabs.currentIndex()).toBe(1);
		expect(tabs.currentWidget()).toBe(page2);
	});

	test("setCurrentIndex ignores disabled tab", () =>
	{
		const tabs = new CTabWidget();

		tabs.addTab(new CWidget(), "One");
		tabs.addTab(new CWidget(), "Two");

		tabs.setTabEnabled(1, false);
		tabs.setCurrentIndex(1);

		expect(tabs.currentIndex()).toBe(0);
	});

	test("setCurrentIndex ignores invalid index", () =>
	{
		const tabs = new CTabWidget();

		tabs.addTab(new CWidget(), "One");

		tabs.setCurrentIndex(-1);
		expect(tabs.currentIndex()).toBe(0);

		tabs.setCurrentIndex(10);
		expect(tabs.currentIndex()).toBe(0);
	});

	test("setCurrentWidget changes current tab", () =>
	{
		const tabs = new CTabWidget();
		const page1 = new CWidget();
		const page2 = new CWidget();

		tabs.addTab(page1, "One");
		tabs.addTab(page2, "Two");

		tabs.setCurrentWidget(page2);

		expect(tabs.currentWidget()).toBe(page2);
		expect(tabs.currentIndex()).toBe(1);
	});

	test("setCurrentWidget ignores unknown widget", () =>
	{
		const tabs = new CTabWidget();
		const page1 = new CWidget();
		const page2 = new CWidget();

		tabs.addTab(page1, "One");
		tabs.setCurrentWidget(page2);

		expect(tabs.currentWidget()).toBe(page1);
		expect(tabs.currentIndex()).toBe(0);
	});

	test("currentChanged is emitted when current tab changes", () =>
	{
		const tabs = new CTabWidget();

		tabs.addTab(new CWidget(), "One");
		tabs.addTab(new CWidget(), "Two");

		const slot = vi.fn();
		tabs.currentChanged.connect(slot);

		tabs.setCurrentIndex(1);

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith(1);
	});

	test("currentChanged is not emitted for same current tab", () =>
	{
		const tabs = new CTabWidget();

		tabs.addTab(new CWidget(), "One");

		const slot = vi.fn();
		tabs.currentChanged.connect(slot);

		tabs.setCurrentIndex(0);

		expect(slot).not.toHaveBeenCalled();
	});

	test("removeTab removes tab and returns widget", () =>
	{
		const tabs = new CTabWidget();
		const page1 = new CWidget();
		const page2 = new CWidget();

		tabs.addTab(page1, "One");
		tabs.addTab(page2, "Two");

		const removed = tabs.removeTab(1);

		expect(removed).toBe(page2);
		expect(tabs.count()).toBe(1);
		expect(tabs.indexOf(page2)).toBe(-1);
	});

	test("removeTab returns null for invalid index", () =>
	{
		const tabs = new CTabWidget();

		expect(tabs.removeTab(-1)).toBeNull();
		expect(tabs.removeTab(0)).toBeNull();
	});

	test("removing current tab changes current tab", () =>
	{
		const tabs = new CTabWidget();
		const page1 = new CWidget();
		const page2 = new CWidget();

		tabs.addTab(page1, "One");
		tabs.addTab(page2, "Two");

		tabs.removeTab(0);

		expect(tabs.currentIndex()).toBe(0);
		expect(tabs.currentWidget()).toBe(page2);
	});

	test("removing only tab clears current tab", () =>
	{
		const tabs = new CTabWidget();

		tabs.addTab(new CWidget(), "One");
		tabs.removeTab(0);

		expect(tabs.currentIndex()).toBe(-1);
		expect(tabs.currentWidget()).toBeNull();
	});

	test("disabled current tab selects next enabled tab", () =>
	{
		const tabs = new CTabWidget();

		tabs.addTab(new CWidget(), "One");
		tabs.addTab(new CWidget(), "Two");
		tabs.addTab(new CWidget(), "Three");

		tabs.setTabEnabled(0, false);

		expect(tabs.currentIndex()).toBe(1);
	});

	test("disabled last current tab selects previous enabled tab", () =>
	{
		const tabs = new CTabWidget();

		tabs.addTab(new CWidget(), "One");
		tabs.addTab(new CWidget(), "Two");

		tabs.setCurrentIndex(1);
		tabs.setTabEnabled(1, false);

		expect(tabs.currentIndex()).toBe(0);
	});

	test("mouse press on tab marks tab as pressed", () =>
	{
		const tabs = new CTabWidget();

		tabs.addTab(new CWidget(), "One");
		tabs.addTab(new CWidget(), "Two");

		tabs.event(new CMouseEvent(
			CEventType.MousePress, 75, 10, CMouseButton.LeftButton
		));

		expect(tabs.isTabPressed(1)).toBe(true);
	});

	test("mouse release on same tab changes current tab", () =>
	{
		const tabs = new CTabWidget();

		tabs.addTab(new CWidget(), "One");
		tabs.addTab(new CWidget(), "Two");

		tabs.event(new CMouseEvent(
			CEventType.MousePress, 75, 10, CMouseButton.LeftButton
		));

		tabs.event(new CMouseEvent(
			CEventType.MouseRelease, 75, 10, CMouseButton.LeftButton
		));

		expect(tabs.currentIndex()).toBe(1);
	});

	test("mouse release on different tab does not activate pressed tab", () =>
	{
		const tabs = new CTabWidget();

		tabs.addTab(new CWidget(), "One");
		tabs.addTab(new CWidget(), "Two");

		tabs.event(new CMouseEvent(
			CEventType.MousePress, 150, 10, CMouseButton.LeftButton
		));

		tabs.event(new CMouseEvent(
			CEventType.MouseRelease, 50, 10, CMouseButton.LeftButton
		));

		expect(tabs.currentIndex()).toBe(0);
	});

	test("clicking disabled tab does not change current tab", () =>
	{
		const tabs = new CTabWidget();

		tabs.addTab(new CWidget(), "One");
		tabs.addTab(new CWidget(), "Two");
		tabs.setTabEnabled(1, false);

		tabs.event(new CMouseEvent(
			CEventType.MousePress, 150, 10, CMouseButton.LeftButton
		));

		tabs.event(new CMouseEvent(
			CEventType.MouseRelease, 150, 10, CMouseButton.LeftButton
		));

		expect(tabs.currentIndex()).toBe(0);
	});

	test("clicking tab emits tabClicked", () =>
	{
		const tabs = new CTabWidget();

		tabs.addTab(new CWidget(), "One");
		tabs.addTab(new CWidget(), "Two");

		const slot = vi.fn();
		tabs.tabClicked.connect(slot);

		tabs.event(new CMouseEvent(
			CEventType.MousePress, 75, 10, CMouseButton.LeftButton
		));

		tabs.event(new CMouseEvent(
			CEventType.MouseRelease, 75, 10, CMouseButton.LeftButton
		));

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith(1);
	});

	test("mouse move updates hovered tab", () =>
	{
		const tabs = new CTabWidget();

		tabs.addTab(new CWidget(), "One");
		tabs.addTab(new CWidget(), "Two");

		tabs.event(new CMouseEvent(
			CEventType.MouseMove, 75, 10, CMouseButton.NoButton
		));

		expect(tabs.isTabHovered(1)).toBe(true);
		expect(tabs.isTabHovered(0)).toBe(false);
	});

	test("mouse leave clears hovered tab", () =>
	{
		const tabs = new CTabWidget();

		tabs.addTab(new CWidget(), "One");

		tabs.event(new CMouseEvent(
			CEventType.MouseMove, 30, 10, CMouseButton.NoButton
		));

		expect(tabs.isTabHovered(0)).toBe(true);

		tabs.event(new CMouseEvent(
			CEventType.MouseLeave, 60, 10, CMouseButton.NoButton
		));

		expect(tabs.isTabHovered(0)).toBe(false);
	});

	test("mouse outside tab bar does not hover tab", () =>
	{
		const tabs = new CTabWidget();

		tabs.addTab(new CWidget(), "One");

		tabs.event(new CMouseEvent(
			CEventType.MouseMove, 50, 50, CMouseButton.NoButton
		));

		expect(tabs.isTabHovered(0)).toBe(false);
	});

	test("stack occupies area below tab bar", () =>
	{
		const tabs = new CTabWidget();

		tabs.setGeometry(10, 20, 300, 200);

		const page = new CWidget();
		tabs.addTab(page, "One");

		expect(page.x()).toBe(0);
		expect(page.y()).toBe(0);
		expect(page.width()).toBe(300);
		expect(page.height()).toBe(200 - tabs.tabHeight());
	});

	test("resizing tab widget resizes page area", () =>
	{
		const tabs = new CTabWidget();
		const page = new CWidget();

		tabs.addTab(page, "One");
		tabs.resize(400, 300);

		expect(page.width()).toBe(400);
		expect(page.height()).toBe(300 - tabs.tabHeight());
	});

	test("removed tab widget can be destroyed", () =>
	{
		const tabs = new CTabWidget();
		const page = new CWidget();

		tabs.addTab(page, "One");

		const removed = tabs.removeTab(0);

		expect(() => removed?.destroy()).not.toThrow();
	});
});