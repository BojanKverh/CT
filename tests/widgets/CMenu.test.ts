import type { CPainter } from "../../src/painting/CPainter.js";
import { CFont } from "../../src/gui/CFont.js";
import { CPaletteColorRole } from "../../src/gui/CPalette.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CAction } from "../../src/core/CAction.js";
import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { CMenu } from "../../src/widgets/CMenu.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CPoint } from "../../src/geometry/CPoint.js";

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

	test("exec moves menu to requested position", () => {
		const menu = new CMenu();

		menu.exec(new CPoint(120, 80));

		expect(menu.x()).toBe(120);
		expect(menu.y()).toBe(80);
	});

	test("exec opens menu", () => {
		const menu = new CMenu();

		expect(menu.isOpen()).toBe(false);

		menu.exec(new CPoint(120, 80));

		expect(menu.isOpen()).toBe(true);
	});

	test("exec gives focus to menu", () => {
		const app = CApplication.instance();
		const menu = new CMenu();

		menu.exec(new CPoint(120, 80));

		expect(app.focusWidget()).toBe(menu);
	});

    describe("shortcut labels", () => {
        class PaintedMenu extends CMenu {
            draw() {
                const texts: { text: string; x: number; y: number; pen: string }[] = [];
                let pen = "";
                const painter = {
                    setBrush(_brush: string) {},
                    setPen(value: string) { pen = value; },
                    setFont(_font: CFont) {},
                    drawRect(_x: number, _y: number, _w: number, _h: number) {},
                    drawLine(_x: number, _y: number, _x2: number, _y2: number) {},
                    drawText(text: string, x: number, y: number) { texts.push({ text, x, y, pen }); }
                };
                this.paintEvent(painter as unknown as CPainter);
                return texts;
            }
        }
        function add(menu: CMenu, text: string, key: string) {
            const action = new CAction(text);
            action.setShortcut(key);
            menu.addAction(action);
            return action;
        }
        test("draws the canonical shortcut beside the action label", () => {
            const menu = new PaintedMenu();
            add(menu, "Save", "control+s");
            const texts = menu.draw();
            expect(texts.map(t => t.text)).toEqual(["Save", "Ctrl+S"]);
            expect(texts[0]!.y).toBe(texts[1]!.y);
        });
        test("right-aligns shortcuts of different lengths", () => {
            const menu = new PaintedMenu();
            add(menu, "Save", "Ctrl+S"); add(menu, "Save as", "Ctrl+Shift+S");
            const labels = menu.draw().filter(t => t.text.startsWith("Ctrl+"));
            for (const label of labels) {
                expect(label.x + menu.fontMetrics().textWidth(label.text)).toBeCloseTo(
                    menu.width() - CMenu.HorizontalPadding);
            }
        });
        test("reserves separate columns for the widest label and shortcut", () => {
            const menu = new PaintedMenu();
            add(menu, "A very long action label", "Ctrl+S"); add(menu, "X", "Ctrl+Shift+Alt+S");
            const texts = menu.draw();
            const labelEnd = texts[0]!.x + menu.fontMetrics().textWidth(texts[0]!.text);
            expect(texts[3]!.x - labelEnd).toBeGreaterThanOrEqual(CMenu.ShortcutSpacing);
        });
        test("actions without shortcuts do not draw an empty shortcut label", () => {
            const menu = new PaintedMenu(); menu.addAction(new CAction("Open"));
            expect(menu.draw().map(t => t.text)).toEqual(["Open"]);
        });
        test("disabled shortcuts use DisabledText", () => {
            const menu = new PaintedMenu(); const action = add(menu, "Save", "Ctrl+S");
            action.setEnabled(false);
            const expected = menu.palette().color(CPaletteColorRole.DisabledText).toCss();
            expect(menu.draw().map(t => t.pen)).toEqual([expected, expected]);
        });
        test("selected shortcuts use HighlightedText", () => {
            const menu = new PaintedMenu(); add(menu, "Save", "Ctrl+S"); menu.open();
            const expected = menu.palette().color(CPaletteColorRole.HighlightedText).toCss();
            expect(menu.draw().map(t => t.pen)).toEqual([expected, expected]);
        });
        test("changing a shortcut refreshes geometry and painting", () => {
            const menu = new PaintedMenu(); const action = add(menu, "Save", "Ctrl+S");
            const width = menu.width(); const update = vi.spyOn(menu, "update");
            action.setShortcut("Ctrl+Shift+Alt+S");
            expect(menu.width()).toBeGreaterThan(width);
            expect(menu.draw().map(t => t.text)).toContain("Ctrl+Alt+Shift+S");
            expect(update).toHaveBeenCalled();
        });
        test("clearing a shortcut shrinks the menu and removes its label", () => {
            const menu = new PaintedMenu(); const action = add(menu, "Save", "Ctrl+Shift+Alt+S");
            const width = menu.width(); action.setShortcut("");
            expect(menu.width()).toBeLessThan(width);
            expect(menu.draw().map(t => t.text)).toEqual(["Save"]);
        });
        test("changing the action text recalculates width", () => {
            const menu = new CMenu(); const action = add(menu, "Save", "Ctrl+S");
            const width = menu.width(); action.setText("Save a very long document name");
            expect(menu.width()).toBeGreaterThan(width);
        });
        test("changing the font recalculates width using font metrics", () => {
            const menu = new CMenu(); add(menu, "Save document", "Ctrl+Shift+S");
            const font = new CFont(menu.font()); font.setPixelSize(30); menu.setFont(font);
            const metrics = menu.fontMetrics();
            expect(menu.width()).toBe(Math.max(120, Math.ceil(CMenu.HorizontalPadding * 2 +
                CMenu.CheckColumnWidth + metrics.textWidth("Save document") +
                CMenu.ShortcutSpacing + metrics.textWidth("Ctrl+Shift+S"))));
        });
        test("submenu arrows occupy their own column", () => {
            const menu = new PaintedMenu(); add(menu, "Save", "Ctrl+S");
            menu.addMenu("More", new CMenu());
            const texts = menu.draw();
            const shortcut = texts.find(t => t.text === "Ctrl+S")!;
            const arrow = texts.find(t => t.text === "▶")!;
            expect(shortcut.x + menu.fontMetrics().textWidth(shortcut.text)).toBeLessThan(arrow.x);
        });
        test("clear disconnects removed actions", () => {
            const menu = new CMenu(); const action = add(menu, "Save", "Ctrl+S");
            menu.clear(); const resize = vi.spyOn(menu, "resize"); const update = vi.spyOn(menu, "update");
            action.setShortcut("Ctrl+Shift+S");
            expect(resize).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled();
        });
        test("destroy disconnects actions without destroying shared actions", () => {
            const menu = new CMenu(); const action = add(menu, "Save", "Ctrl+S");
            menu.destroy(); const resize = vi.spyOn(menu, "resize");
            action.setShortcut("Ctrl+Shift+S");
            expect(resize).not.toHaveBeenCalled();
            const triggered = vi.fn(); action.triggered.connect(triggered); action.trigger();
            expect(triggered).toHaveBeenCalledOnce();
        });
        test("adding the same action twice keeps one change subscription", () => {
            const menu = new CMenu(); const action = add(menu, "Save", "Ctrl+S"); menu.addAction(action);
            const resize = vi.spyOn(menu, "resize"); action.setShortcut("Ctrl+Shift+S");
            expect(resize).toHaveBeenCalledOnce();
        });
        test("shared actions refresh each menu independently", () => {
            const first = new PaintedMenu(); const second = new PaintedMenu();
            const action = add(first, "Save", "Ctrl+S"); second.addAction(action);
            first.clear(); action.setShortcut("Ctrl+Shift+S");
            expect(second.draw().map(t => t.text)).toContain("Ctrl+Shift+S");
            expect(first.count()).toBe(0);
        });
    });
});