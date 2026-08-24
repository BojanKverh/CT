import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CAction } from "../../src/core/CAction.js";
import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { CMenu } from "../../src/widgets/CMenu.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";

describe("CMenu", () => {
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

	test("is a popup widget", () => {
		const menu = new CMenu();

		expect(menu.isOpen()).toBe(false);

		menu.open();

		expect(menu.isOpen()).toBe(true);
		expect(CApplication.instance().popupWidgets()).toContain(menu);
	});

	test("has no items by default", () => {
		const menu = new CMenu();

		expect(menu.count()).toBe(0);
	});

	test("adds action", () => {
		const menu = new CMenu();
		const action = new CAction("Open");

		const result = menu.addAction(action);

		expect(result).toBe(action);
		expect(menu.count()).toBe(1);
		expect(menu.actionAt(0)).toBe(action);
	});

	test("adds separator", () => {
		const menu = new CMenu();

		menu.addSeparator();

		expect(menu.count()).toBe(1);
		expect(menu.actionAt(0)).toBeNull();
	});

	test("clear removes all items", () => {
		const menu = new CMenu();

		menu.addAction(new CAction("Open"));
		menu.addSeparator();
		menu.addAction(new CAction("Exit"));

		menu.clear();

		expect(menu.count()).toBe(0);
		expect(menu.actionAt(0)).toBeNull();
	});

	test("actionAt returns null for invalid index", () => {
		const menu = new CMenu();

		expect(menu.actionAt(-1)).toBeNull();
		expect(menu.actionAt(0)).toBeNull();
		expect(menu.actionAt(100)).toBeNull();
	});

	test("clicking action triggers it and closes menu", () => {
		const menu = new CMenu();
		const action = new CAction("Open");
		const slot = vi.fn();

		action.triggered.connect(slot);
		menu.addAction(action);
		menu.open();

		const event = new CMouseEvent(
			CEventType.MousePress, 10, 10, CMouseButton.LeftButton
		);

		menu.event(event);

		expect(slot).toHaveBeenCalledOnce();
		expect(menu.isOpen()).toBe(false);
		expect(event.isAccepted()).toBe(true);
	});

	test("disabled action is not triggered", () => {
		const menu = new CMenu();
		const action = new CAction("Open");
		const slot = vi.fn();

		action.setEnabled(false);
		action.triggered.connect(slot);

		menu.addAction(action);
		menu.open();

		const event = new CMouseEvent(
			CEventType.MousePress, 10, 10, CMouseButton.LeftButton
		);

		menu.event(event);

		expect(slot).not.toHaveBeenCalled();
		expect(menu.isOpen()).toBe(true);
		expect(event.isAccepted()).toBe(true);
	});

	test("clicking separator does not trigger action", () => {
		const menu = new CMenu();

		menu.addSeparator();
		menu.open();

		const event = new CMouseEvent(
			CEventType.MousePress, 10, 3, CMouseButton.LeftButton
		);

		menu.event(event);

		expect(menu.isOpen()).toBe(true);
		expect(event.isAccepted()).toBe(true);
	});

	test("click outside menu items is ignored", () => {
		const menu = new CMenu();

		menu.addAction(new CAction("Open"));

		const event = new CMouseEvent(
			CEventType.MousePress, 10, 1000, CMouseButton.LeftButton
		);

		menu.event(event);

		expect(event.isAccepted()).toBe(false);
	});

	test("checkable action toggles when triggered from menu", () => {
		const menu = new CMenu();
		const action = new CAction("Option");

		action.setCheckable(true);

		menu.addAction(action);
		menu.open();

		menu.event(new CMouseEvent(
			CEventType.MousePress, 10, 10, CMouseButton.LeftButton
		));

		expect(action.isChecked()).toBe(true);
	});

	test("arrow down selects next action", () => {
		const menu = new CMenu();

		menu.addAction(new CAction("Open"));
		menu.addAction(new CAction("Save"));
		menu.open();
		menu.setFocus();

		expect(menu.currentIndex()).toBe(0);

		menu.event(new CKeyEvent(CEventType.KeyPress, "ArrowDown"));

		expect(menu.currentIndex()).toBe(1);

		menu.event(new CKeyEvent(CEventType.KeyPress, "ArrowDown"));

		expect(menu.currentIndex()).toBe(0);
	});

	test("arrow up selects previous action", () => {
		const menu = new CMenu();

		menu.addAction(new CAction("Open"));
		menu.addAction(new CAction("Save"));
		menu.open();
		menu.setFocus();

		menu.event(new CKeyEvent(CEventType.KeyPress, "ArrowUp"));

		expect(menu.currentIndex()).toBe(1);

		menu.event(new CKeyEvent(CEventType.KeyPress, "ArrowUp"));

		expect(menu.currentIndex()).toBe(0);
	});

	test("keyboard navigation skips separators", () => {
		const menu = new CMenu();

		menu.addAction(new CAction("Open"));
		menu.addSeparator();
		menu.addAction(new CAction("Save"));
		menu.open();
		menu.setFocus();

		expect(menu.currentIndex()).toBe(0);

		menu.event(new CKeyEvent(CEventType.KeyPress, "ArrowDown"));

		expect(menu.currentIndex()).toBe(2);

		menu.event(new CKeyEvent(CEventType.KeyPress, "ArrowDown"));

		expect(menu.currentIndex()).toBe(0);
	});
	
	test("keyboard navigation skips disabled actions", () => {
		const menu = new CMenu();

		const disabledAction = new CAction("Disabled");
		disabledAction.setEnabled(false);

		menu.addAction(new CAction("Open"));
		menu.addAction(disabledAction);
		menu.addAction(new CAction("Save"));
		menu.open();
		menu.setFocus();

		expect(menu.currentIndex()).toBe(0);

		menu.event(new CKeyEvent(CEventType.KeyPress, "ArrowDown"));

		expect(menu.currentIndex()).toBe(2);

		menu.event(new CKeyEvent(CEventType.KeyPress, "ArrowDown"));

		expect(menu.currentIndex()).toBe(0);
	});

	test("enter triggers current action and closes menu", () => {
		const menu = new CMenu();
		const action = new CAction("Open");
		const slot = vi.fn();

		action.triggered.connect(slot);

		menu.addAction(action);
		menu.open();
		menu.setFocus();

		menu.event(new CKeyEvent(CEventType.KeyPress, "ArrowDown"));
		menu.event(new CKeyEvent(CEventType.KeyPress, "Enter"));

		expect(slot).toHaveBeenCalledOnce();
		expect(menu.isOpen()).toBe(false);
	});

	test("arrow right enters open submenu", () => {
		const menu = new CMenu();
		const submenu = new CMenu();

		menu.addAction(new CAction("Open"));
		menu.addMenu("Options", submenu);

		submenu.addAction(new CAction("General"));

		menu.open();
		menu.setFocus();

		expect(menu.currentIndex()).toBe(0);

		menu.event(new CKeyEvent(CEventType.KeyPress, "ArrowDown"));

		expect(menu.currentIndex()).toBe(1);
		expect(submenu.isOpen()).toBe(true);

		menu.event(new CKeyEvent(CEventType.KeyPress, "ArrowRight"));

		expect(submenu.hasFocus()).toBe(true);
		expect(submenu.currentIndex()).toBe(0);
	});
	
	test("arrow left closes submenu and returns focus to parent", () => {
		const menu = new CMenu();
		const submenu = new CMenu();

		submenu.addAction(new CAction("General"));
		menu.addMenu("Options", submenu);

		menu.open();
		menu.setFocus();

		menu.event(new CKeyEvent(CEventType.KeyPress, "ArrowDown"));
		menu.event(new CKeyEvent(CEventType.KeyPress, "ArrowRight"));

		submenu.event(new CKeyEvent(CEventType.KeyPress, "ArrowLeft"));

		expect(submenu.isOpen()).toBe(false);
		expect(menu.isOpen()).toBe(true);
		expect(menu.hasFocus()).toBe(true);
		expect(menu.currentIndex()).toBe(0);
	});

	test("submenu action closes entire menu chain", () => {
		const menu = new CMenu();
		const submenu = new CMenu();
		const action = new CAction("General");
		const slot = vi.fn();

		action.triggered.connect(slot);

		submenu.addAction(action);
		menu.addMenu("Options", submenu);

		menu.open();
		menu.setFocus();

		menu.event(new CKeyEvent(CEventType.KeyPress, "ArrowDown"));
		menu.event(new CKeyEvent(CEventType.KeyPress, "ArrowRight"));

		submenu.event(new CKeyEvent(CEventType.KeyPress, "Enter"));

		expect(slot).toHaveBeenCalledOnce();
		expect(submenu.isOpen()).toBe(false);
		expect(menu.isOpen()).toBe(false);
	});
});