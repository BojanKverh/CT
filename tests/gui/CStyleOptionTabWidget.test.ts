import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CStyleOptionTabWidget } from
	"../../src/gui/CStyleOptionTabWidget.js";
import { CStyleState } from "../../src/gui/CStyleOption.js";
import { CTabWidget } from "../../src/widgets/CTabWidget.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CStyleOptionTabWidget", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has default values", () => {
		const option = new CStyleOptionTabWidget();

		expect(option.tabHeight).toBe(0);
		expect(option.tabs).toEqual([]);
		expect(option.state).toBe(CStyleState.None);
	});

	test("copy constructor copies values", () => {
		const tabWidget = new CTabWidget();

		tabWidget.addTab(new CWidget(), "First");
		tabWidget.addTab(new CWidget(), "Second");

		const option = new CStyleOptionTabWidget();
		option.initFromTabWidget(tabWidget);

		const copy = new CStyleOptionTabWidget(option);

		expect(copy.tabHeight).toBe(tabWidget.tabHeight());
		expect(copy.tabs).toEqual(option.tabs);
		expect(copy.tabs).not.toBe(option.tabs);
		expect(copy.tabs[0]).not.toBe(option.tabs[0]);
	});

	test("initFromTabWidget initializes base option", () => {
		const tabWidget = new CTabWidget();

		tabWidget.setGeometry(10, 20, 300, 200);

		const option = new CStyleOptionTabWidget();
		option.initFromTabWidget(tabWidget);

		expect(option.rect.x()).toBe(0);
		expect(option.rect.y()).toBe(0);
		expect(option.rect.width()).toBe(300);
		expect(option.rect.height()).toBe(200);
		expect(option.state & CStyleState.Enabled).not.toBe(0);
	});

	test("initFromTabWidget copies tabs", () => {
		const tabWidget = new CTabWidget();

		tabWidget.addTab(new CWidget(), "First");
		tabWidget.addTab(new CWidget(), "Second");

		const option = new CStyleOptionTabWidget();
		option.initFromTabWidget(tabWidget);

		expect(option.tabs).toHaveLength(2);

		expect(option.tabs[0]!.text).toBe("First");
		expect(option.tabs[0]!.width).toBe(tabWidget.tabWidth(0));
		expect(option.tabs[0]!.enabled).toBe(true);
		expect(option.tabs[0]!.current).toBe(true);

		expect(option.tabs[1]!.text).toBe("Second");
		expect(option.tabs[1]!.width).toBe(tabWidget.tabWidth(1));
		expect(option.tabs[1]!.enabled).toBe(true);
		expect(option.tabs[1]!.current).toBe(false);
	});

	test("initFromTabWidget copies disabled tab state", () => {
		const tabWidget = new CTabWidget();

		tabWidget.addTab(new CWidget(), "First");
		tabWidget.addTab(new CWidget(), "Second");
		tabWidget.setTabEnabled(1, false);

		const option = new CStyleOptionTabWidget();
		option.initFromTabWidget(tabWidget);

		expect(option.tabs[0]!.enabled).toBe(true);
		expect(option.tabs[1]!.enabled).toBe(false);
	});

	test("initFromTabWidget copies current tab", () => {
		const tabWidget = new CTabWidget();

		tabWidget.addTab(new CWidget(), "First");
		tabWidget.addTab(new CWidget(), "Second");
		tabWidget.setCurrentIndex(1);

		const option = new CStyleOptionTabWidget();
		option.initFromTabWidget(tabWidget);

		expect(option.tabs[0]!.current).toBe(false);
		expect(option.tabs[1]!.current).toBe(true);
	});

	test("initFromTabWidget copies hovered tab", () => {
		const tabWidget = new CTabWidget();

		tabWidget.addTab(new CWidget(), "First");
		tabWidget.addTab(new CWidget(), "Second");

		const x = tabWidget.tabWidth(0) + 1;
		const event = new CMouseEvent(
			CEventType.MouseMove, x, 5, CMouseButton.NoButton
		);

		tabWidget.event(event);

		const option = new CStyleOptionTabWidget();
		option.initFromTabWidget(tabWidget);

		expect(option.tabs[0]!.hovered).toBe(false);
		expect(option.tabs[1]!.hovered).toBe(true);
	});

	test("initFromTabWidget copies pressed tab", () => {
		const tabWidget = new CTabWidget();

		tabWidget.addTab(new CWidget(), "First");
		tabWidget.addTab(new CWidget(), "Second");

		const event = new CMouseEvent(
			CEventType.MousePress, 5, 5, CMouseButton.LeftButton
		);

		tabWidget.event(event);

		const option = new CStyleOptionTabWidget();
		option.initFromTabWidget(tabWidget);

		expect(option.tabs[0]!.pressed).toBe(true);
		expect(option.tabs[1]!.pressed).toBe(false);
	});

	test("reinitializing replaces tab data", () => {
		const tabWidget = new CTabWidget();
		const option = new CStyleOptionTabWidget();

		tabWidget.addTab(new CWidget(), "First");
		option.initFromTabWidget(tabWidget);

		expect(option.tabs).toHaveLength(1);
		expect(option.tabs[0]!.text).toBe("First");

		tabWidget.addTab(new CWidget(), "Second");
		tabWidget.setTabText(0, "Changed");

		option.initFromTabWidget(tabWidget);

		expect(option.tabs).toHaveLength(2);
		expect(option.tabs[0]!.text).toBe("Changed");
		expect(option.tabs[1]!.text).toBe("Second");
	});
});