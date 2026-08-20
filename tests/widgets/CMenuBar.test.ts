import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CAction } from "../../src/core/CAction.js";
import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { CMenu } from "../../src/widgets/CMenu.js";
import { CMenuBar } from "../../src/widgets/CMenuBar.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";

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
});