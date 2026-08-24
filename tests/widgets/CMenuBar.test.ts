import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CAction } from "../../src/core/CAction.js";
import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { CMenu } from "../../src/widgets/CMenu.js";
import { CMenuBar } from "../../src/widgets/CMenuBar.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";

describe("CMenuBar", () =>
{
	beforeEach(() =>
	{
		Object.defineProperty(globalThis, "window", {
			value: createTestWindow(),
			writable: true,
			configurable: true
		});

		new CApplication(createTestCanvas());
	});

	afterEach(() =>
	{
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has no items by default", () =>
	{
		const menuBar = new CMenuBar();

		expect(menuBar.count()).toBe(0);
	});

	test("adds menu", () =>
	{
		const menuBar = new CMenuBar();
		const menu = new CMenu();

		const result = menuBar.addMenu("File", menu);

		expect(result).toBe(menu);
		expect(menuBar.count()).toBe(1);
		expect(menuBar.menuAt(0)).toBe(menu);
	});

	test("adds separator", () =>
	{
		const menuBar = new CMenuBar();

		menuBar.addSeparator();

		expect(menuBar.count()).toBe(1);
		expect(menuBar.menuAt(0)).toBeNull();
	});

	test("menuAt returns null for invalid index", () =>
	{
		const menuBar = new CMenuBar();

		expect(menuBar.menuAt(-1)).toBeNull();
		expect(menuBar.menuAt(0)).toBeNull();
		expect(menuBar.menuAt(100)).toBeNull();
	});

	test("clear removes all items", () =>
	{
		const menuBar = new CMenuBar();

		menuBar.addMenu("File", new CMenu());
		menuBar.addSeparator();
		menuBar.addMenu("Help", new CMenu());

		menuBar.clear();

		expect(menuBar.count()).toBe(0);
	});

	test("clicking menu bar item opens menu", () =>
	{
		const menuBar = new CMenuBar();
		const menu = new CMenu();

		menuBar.resize(500, CMenuBar.DefaultHeight);
		menuBar.addMenu("File", menu);

		menuBar.event(new CMouseEvent(
			CEventType.MousePress,
			10,
			10,
			CMouseButton.LeftButton
		));

		expect(menu.isOpen()).toBe(true);
	});

	test("clicking open menu bar item closes menu", () =>
	{
		const menuBar = new CMenuBar();
		const menu = new CMenu();

		menuBar.resize(500, CMenuBar.DefaultHeight);
		menuBar.addMenu("File", menu);

		menuBar.event(new CMouseEvent(
			CEventType.MousePress,
			10,
			10,
			CMouseButton.LeftButton
		));

		expect(menu.isOpen()).toBe(true);

		menuBar.event(new CMouseEvent(
			CEventType.MousePress,
			10,
			10,
			CMouseButton.LeftButton
		));

		expect(menu.isOpen()).toBe(false);
	});

	test("hover does not open menu when no menu is active", () =>
	{
		const menuBar = new CMenuBar();
		const fileMenu = new CMenu();
		const editMenu = new CMenu();

		menuBar.resize(500, CMenuBar.DefaultHeight);
		menuBar.addMenu("File", fileMenu);
		menuBar.addMenu("Edit", editMenu);

		menuBar.event(new CMouseEvent(
			CEventType.MouseMove,
			10,
			10,
			CMouseButton.NoButton
		));

		expect(fileMenu.isOpen()).toBe(false);

		menuBar.event(new CMouseEvent(
			CEventType.MouseMove,
			70,
			10,
			CMouseButton.NoButton
		));

		expect(editMenu.isOpen()).toBe(false);
	});

	test("hover switches menu when one menu is already open", () =>
	{
		const menuBar = new CMenuBar();
		const fileMenu = new CMenu();
		const editMenu = new CMenu();

		menuBar.resize(500, CMenuBar.DefaultHeight);
		menuBar.addMenu("File", fileMenu);
		menuBar.addMenu("Edit", editMenu);

		menuBar.event(new CMouseEvent(
			CEventType.MousePress,
			10,
			10,
			CMouseButton.LeftButton
		));

		expect(fileMenu.isOpen()).toBe(true);

		menuBar.event(new CMouseEvent(
			CEventType.MouseMove,
			70,
			10,
			CMouseButton.NoButton
		));

		expect(fileMenu.isOpen()).toBe(false);
		expect(editMenu.isOpen()).toBe(true);
	});

	test("closing active menu disables hover switching", () =>
	{
		const menuBar = new CMenuBar();
		const fileMenu = new CMenu();
		const editMenu = new CMenu();

		menuBar.resize(500, CMenuBar.DefaultHeight);
		menuBar.addMenu("File", fileMenu);
		menuBar.addMenu("Edit", editMenu);

		menuBar.event(new CMouseEvent(
			CEventType.MousePress,
			10,
			10,
			CMouseButton.LeftButton
		));

		expect(fileMenu.isOpen()).toBe(true);

		fileMenu.close();

		menuBar.event(new CMouseEvent(
			CEventType.MouseMove,
			70,
			10,
			CMouseButton.NoButton
		));

		expect(editMenu.isOpen()).toBe(false);
	});

	test("separator places following menus on right side", () =>
	{
		const menuBar = new CMenuBar();
		const fileMenu = new CMenu();
		const helpMenu = new CMenu();

		menuBar.resize(500, CMenuBar.DefaultHeight);

		menuBar.addMenu("File", fileMenu);
		menuBar.addSeparator();
		menuBar.addMenu("Help", helpMenu);

		menuBar.event(new CMouseEvent(
			CEventType.MousePress,
			470,
			10,
			CMouseButton.LeftButton
		));

		expect(helpMenu.isOpen()).toBe(true);
		expect(fileMenu.isOpen()).toBe(false);
	});

	test("right aligned menu stays inside menu bar width", () =>
	{
		const menuBar = new CMenuBar();
		const helpMenu = new CMenu();

		helpMenu.addAction(new CAction("Documentation"));
		helpMenu.addAction(new CAction("About Clara Toolkit"));

		menuBar.resize(500, CMenuBar.DefaultHeight);

		menuBar.addSeparator();
		menuBar.addMenu("Help", helpMenu);

		menuBar.event(new CMouseEvent(
			CEventType.MousePress,
			470,
			10,
			CMouseButton.LeftButton
		));

		expect(helpMenu.isOpen()).toBe(true);
		expect(helpMenu.x()).toBeGreaterThanOrEqual(0);
		expect(helpMenu.x() + helpMenu.width()).toBeLessThanOrEqual(500);
	});

	test("clear closes currently open menu", () =>
	{
		const menuBar = new CMenuBar();
		const menu = new CMenu();

		menuBar.resize(500, CMenuBar.DefaultHeight);
		menuBar.addMenu("File", menu);

		menuBar.event(new CMouseEvent(
			CEventType.MousePress,
			10,
			10,
			CMouseButton.LeftButton
		));

		expect(menu.isOpen()).toBe(true);

		menuBar.clear();

		expect(menu.isOpen()).toBe(false);
		expect(menuBar.count()).toBe(0);
	});

	test("menu action can be triggered after opening from menu bar", () =>
	{
		const menuBar = new CMenuBar();
		const menu = new CMenu();
		const action = new CAction("Open");
		const slot = vi.fn();

		action.triggered.connect(slot);
		menu.addAction(action);

		menuBar.resize(500, CMenuBar.DefaultHeight);
		menuBar.addMenu("File", menu);

		menuBar.event(new CMouseEvent(
			CEventType.MousePress,
			10,
			10,
			CMouseButton.LeftButton
		));

		menu.event(new CMouseEvent(
			CEventType.MousePress,
			10,
			10,
			CMouseButton.LeftButton
		));

		expect(slot).toHaveBeenCalledOnce();
		expect(menu.isOpen()).toBe(false);
	});

	test("arrow down opens current menu and gives it focus", () =>
	{
		const app = CApplication.instance();
		const menuBar = new CMenuBar();
		const fileMenu = new CMenu();

		fileMenu.addAction(new CAction("New"));
		fileMenu.addAction(new CAction("Open"));

		menuBar.resize(500, CMenuBar.DefaultHeight);
		menuBar.addMenu("File", fileMenu);

		menuBar.setFocus();

		menuBar.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowRight"
		));

		menuBar.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowDown"
		));

		expect(fileMenu.isOpen()).toBe(true);
		expect(fileMenu.currentIndex()).toBe(0);
		expect(app.focusWidget()).toBe(fileMenu);
	});

	test("first arrow down in open menu moves to next selectable item", () =>
	{
		const menuBar = new CMenuBar();
		const fileMenu = new CMenu();

		fileMenu.addAction(new CAction("New"));
		fileMenu.addSeparator();
		fileMenu.addAction(new CAction("Open"));

		menuBar.resize(500, CMenuBar.DefaultHeight);
		menuBar.addMenu("File", fileMenu);

		menuBar.setFocus();

		menuBar.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowRight"
		));

		menuBar.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowDown"
		));

		expect(fileMenu.currentIndex()).toBe(0);

		fileMenu.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowDown"
		));

		expect(fileMenu.currentIndex()).toBe(2);
	});

	test("reopening menu restores last selected item", () =>
	{
		const menu = new CMenu();

		menu.addAction(new CAction("New"));
		menu.addAction(new CAction("Open"));
		menu.addAction(new CAction("Save"));

		menu.open();

		expect(menu.currentIndex()).toBe(0);

		menu.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowDown"
		));

		expect(menu.currentIndex()).toBe(1);

		menu.close();
		menu.open();

		expect(menu.currentIndex()).toBe(1);
	});

	test("reopening menu opens submenu of current item", () =>
	{
		const menu = new CMenu();
		const submenu = new CMenu();

		menu.addAction(new CAction("Open"));
		menu.addMenu("Options", submenu);

		submenu.addAction(new CAction("General"));
		submenu.addAction(new CAction("Display"));

		menu.open();

		expect(menu.currentIndex()).toBe(0);

		menu.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowDown"
		));

		expect(menu.currentIndex()).toBe(1);
		expect(submenu.isOpen()).toBe(true);

		menu.close();

		expect(submenu.isOpen()).toBe(false);

		menu.open();

		expect(menu.currentIndex()).toBe(1);
		expect(submenu.isOpen()).toBe(true);
	});

	test("keyboard opening menu focuses automatically opened submenu", () =>
	{
		const app = CApplication.instance();
		const menuBar = new CMenuBar();
		const viewMenu = new CMenu();
		const panelsMenu = new CMenu();

		viewMenu.addAction(new CAction("Show grid"));
		viewMenu.addMenu("Panels", panelsMenu);

		panelsMenu.addAction(new CAction("Properties"));
		panelsMenu.addAction(new CAction("Inspector"));

		viewMenu.open();

		viewMenu.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowDown"
		));

		expect(viewMenu.currentIndex()).toBe(1);
		expect(panelsMenu.isOpen()).toBe(true);

		viewMenu.close();

		expect(viewMenu.isOpen()).toBe(false);
		expect(panelsMenu.isOpen()).toBe(false);

		menuBar.resize(500, CMenuBar.DefaultHeight);
		menuBar.addMenu("View", viewMenu);

		menuBar.setFocus();

		menuBar.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowRight"
		));

		menuBar.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowDown"
		));

		expect(viewMenu.isOpen()).toBe(true);
		expect(panelsMenu.isOpen()).toBe(true);
		expect(app.focusWidget()).toBe(panelsMenu);
	});

	test("arrow down navigates submenu when it was opened automatically", () =>
	{
		const app = CApplication.instance();
		const menuBar = new CMenuBar();
		const viewMenu = new CMenu();
		const panelsMenu = new CMenu();

		viewMenu.addAction(new CAction("Show grid"));
		viewMenu.addMenu("Panels", panelsMenu);

		panelsMenu.addAction(new CAction("Properties"));
		panelsMenu.addAction(new CAction("Inspector"));

		viewMenu.open();

		viewMenu.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowDown"
		));

		expect(viewMenu.currentIndex()).toBe(1);
		expect(panelsMenu.isOpen()).toBe(true);

		viewMenu.close();

		menuBar.resize(500, CMenuBar.DefaultHeight);
		menuBar.addMenu("View", viewMenu);

		menuBar.setFocus();

		menuBar.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowRight"
		));

		menuBar.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowDown"
		));

		expect(app.focusWidget()).toBe(panelsMenu);
		expect(panelsMenu.currentIndex()).toBe(0);

		panelsMenu.event(new CKeyEvent(
			CEventType.KeyPress,
			"ArrowDown"
		));

		expect(panelsMenu.currentIndex()).toBe(1);

		expect(viewMenu.currentIndex()).toBe(1);
		expect(panelsMenu.isOpen()).toBe(true);
	});
});