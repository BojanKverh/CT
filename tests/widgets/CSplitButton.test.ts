import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";
import { CSplitButton } from "../../src/widgets/CSplitButton.js";
import { CStyleOptionSplitButton } from "../../src/gui/CStyleOptionSplitButton.js";
import { CAction } from "../../src/core/CAction.js";
import { CApplication } from "../../src/core/CApplication.js";
import { CMenu } from "../../src/widgets/CMenu.js";
import { CPushButton } from "../../src/widgets/CPushButton.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CMouseEvent, CMouseButton } from "../../src/events/CMouseEvent.js";
import { CRect } from "../../src/geometry/CRect.js";
import { CDefaultStyle } from "../../src/gui/CDefaultStyle.js";
import { CStyleState } from "../../src/gui/CStyleOption.js";
import { CPaletteColorRole } from "../../src/gui/CPalette.js";
import type { CPainter } from "../../src/painting/CPainter.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

function recordPainting() {
    let fill = "";
    const fills: Array<{ rect: CRect; color: string }> = [];
    const stack: string[] = [];
    const painter = {
        setBrush: vi.fn((color: string) => { fill = color; }),
        setFillStyle: vi.fn((color: string) => { fill = color; }),
        fillRect: vi.fn((rect: CRect) => { fills.push({ rect, color: fill }); }),
        setPen: vi.fn(), setStrokeStyle: vi.fn(), setFont: vi.fn(),
        setTextAlign: vi.fn(), setTextBaseline: vi.fn(), drawText: vi.fn(),
        drawRoundedRect: vi.fn(), strokeRect: vi.fn(), drawLine: vi.fn(),
        drawEllipse: vi.fn(), fillEllipse: vi.fn(), drawPixmap: vi.fn(),
        clipRect: vi.fn(), setLineWidth: vi.fn(),
        save: vi.fn(() => { stack.push(fill); }),
        restore: vi.fn(() => { fill = stack.pop()!; })
    };
    return {
        painter, paint: painter as unknown as CPainter,
        dots: () => fills.filter(item => item.rect.width() === 1 && item.rect.height() === 1)
    };
}

describe("CSplitButton", () => {
    let button: CSplitButton;
    let menu: CMenu;
    beforeEach(() => {
        if (CApplication.exists()) CApplication.instance().destroy();
        new CApplication(createTestCanvas());
        button = new CSplitButton(); button.setGeometry(20, 20, 140, 30); button.setText("New");
        menu = new CMenu(); menu.addAction(new CAction("Invoice")); menu.addAction(new CAction("Quotation"));
        button.setMenu(menu);
    });
    afterEach(() => {
        button.destroy(); menu.destroy();
        if (CApplication.exists()) CApplication.instance().destroy();
    });
    function mouse(type: CEventType, x: number, y = 15, which = CMouseButton.LeftButton): void {
        button.event(new CMouseEvent(type, x, y, which));
    }
    function click(x: number, y = 15): void { mouse(CEventType.MousePress, x, y); mouse(CEventType.MouseRelease, x, y); }
    function key(value: string, release = false, alt = false): CKeyEvent {
        const event = new CKeyEvent(release ? CEventType.KeyRelease : CEventType.KeyPress, value, false, false, alt);
        button.event(event); return event;
    }
    test("main click emits clicked without opening the menu", () => {
        const clicked = vi.fn(); button.clicked.connect(clicked); click(20);
        expect(clicked).toHaveBeenCalledOnce(); expect(menu.isOpen()).toBe(false);
    });
    test("arrow click opens only the menu", () => {
        const clicked = vi.fn(); button.clicked.connect(clicked); click(130);
        expect(menu.isOpen()).toBe(true); expect(clicked).not.toHaveBeenCalled();
        expect(menu.currentIndex()).toBe(0); expect(menu.hasFocus()).toBe(true);
    });
    test("dragging from main to arrow activates neither", () => {
        const clicked = vi.fn(); button.clicked.connect(clicked);
        mouse(CEventType.MousePress, 10); mouse(CEventType.MouseRelease, 130);
        expect(clicked).not.toHaveBeenCalled(); expect(menu.isOpen()).toBe(false);
    });
    test("dragging from arrow to main activates neither", () => {
        const clicked = vi.fn(); button.clicked.connect(clicked);
        mouse(CEventType.MousePress, 130); mouse(CEventType.MouseRelease, 10);
        expect(clicked).not.toHaveBeenCalled(); expect(menu.isOpen()).toBe(false);
    });
    test("releasing outside cancels the press", () => {
        const clicked = vi.fn(); button.clicked.connect(clicked);
        mouse(CEventType.MousePress, 10); mouse(CEventType.MouseRelease, -5);
        expect(clicked).not.toHaveBeenCalled(); expect(button.isDown()).toBe(false);
    });
    test("right click does not activate either part", () => {
        mouse(CEventType.MousePress, 130, 15, CMouseButton.RightButton);
        mouse(CEventType.MouseRelease, 130, 15, CMouseButton.RightButton);
        expect(menu.isOpen()).toBe(false); expect(button.isDown()).toBe(false);
    });
    for (const value of ["Enter", "Return"]) test(`${value} triggers the main action`, () => {
        const action = new CAction("New"); const triggered = vi.fn(); action.triggered.connect(triggered);
        button.setDefaultAction(action); key(value);
        expect(triggered).toHaveBeenCalledOnce(); expect(menu.isOpen()).toBe(false);
    });
    test("Space activates once on release", () => {
        const clicked = vi.fn(); button.clicked.connect(clicked);
        key(" "); key(" "); expect(clicked).not.toHaveBeenCalled(); expect(button.isDown()).toBe(true);
        key(" ", true); key(" ", true); expect(clicked).toHaveBeenCalledOnce();
    });
    for (const value of ["ArrowDown", "F4"]) test(`${value} opens the menu`, () => {
        expect(key(value).isAccepted()).toBe(true); expect(menu.isOpen()).toBe(true);
    });
    test("Alt+Down opens the menu", () => { key("ArrowDown", false, true); expect(menu.isOpen()).toBe(true); });
    test("closing the popup restores button focus", () => {
        button.setFocus(); button.showMenu(); menu.close();
        expect(button.hasFocus()).toBe(true); expect(button.isDown()).toBe(false);
    });
    test("Escape closes the menu without triggering main action", () => {
        const clicked = vi.fn(); button.clicked.connect(clicked);
        button.setFocus(); button.showMenu(); key("Escape");
        expect(menu.isOpen()).toBe(false); expect(button.hasFocus()).toBe(true); expect(clicked).not.toHaveBeenCalled();
    });
    test("menu keyboard navigation triggers its own action", () => {
        const triggered = vi.fn(); menu.actionAt(1)!.triggered.connect(triggered);
        button.showMenu(); menu.event(new CKeyEvent(CEventType.KeyPress, "ArrowDown"));
        menu.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
        expect(triggered).toHaveBeenCalledOnce(); expect(menu.isOpen()).toBe(false);
    });
    test("disabled buttons cannot activate either part", () => {
        const clicked = vi.fn(); button.clicked.connect(clicked); button.setEnabled(false);
        click(10); click(130); key("Enter"); button.showMenu();
        expect(clicked).not.toHaveBeenCalled(); expect(menu.isOpen()).toBe(false);
    });
    test("disabling a pressed button cancels its press", () => {
        const clicked = vi.fn(); button.clicked.connect(clicked); key(" ");
        button.setEnabled(false); button.setEnabled(true); key(" ", true);
        expect(clicked).not.toHaveBeenCalled(); expect(button.isDown()).toBe(false);
    });
    test("disabling the button closes its menu", () => {
        button.showMenu(); button.setEnabled(false); expect(menu.isOpen()).toBe(false);
    });
    test("empty menus do not open", () => { menu.clear(); button.showMenu(); expect(menu.isOpen()).toBe(false); });
    test("removing the menu returns the arrow area to the main action", () => {
        button.setMenu(null); const clicked = vi.fn(); button.clicked.connect(clicked); click(130);
        expect(clicked).toHaveBeenCalledOnce(); expect(button.menuButtonRect().width()).toBe(0);
    });
    test("replacing a menu closes the old one without taking ownership", () => {
        button.showMenu(); const other = new CMenu(); other.addAction(new CAction("Other"));
        button.setMenu(other); expect(menu.isOpen()).toBe(false); expect(button.menu()).toBe(other);
        button.setMenu(menu); other.destroy();
    });
    test("default action synchronizes text, enabled and checked state", () => {
        const action = new CAction("Create"); action.setCheckable(true); button.setDefaultAction(action);
        expect(button.text()).toBe("Create"); click(20);
        expect(action.isChecked()).toBe(true); expect(button.isChecked()).toBe(true);
        action.setText("Changed"); action.setEnabled(false);
        expect(button.text()).toBe("Changed"); expect(button.isEnabled()).toBe(false);
    });
    test("replacing the default action disconnects the old action", () => {
        const old = new CAction("Old"), next = new CAction("Next"); button.setDefaultAction(old); button.setDefaultAction(next);
        old.setText("Stale"); old.setEnabled(false);
        expect(button.text()).toBe("Next"); expect(button.isEnabled()).toBe(true);
        const triggered = vi.fn(); next.triggered.connect(triggered); click(10); expect(triggered).toHaveBeenCalledOnce();
    });
    test("a checkable button without an action toggles on main click", () => {
        button.setCheckable(true); click(10); expect(button.isChecked()).toBe(true);
        click(130); expect(button.isChecked()).toBe(true);
    });
    test("menu contributes its width to the size hint", () => {
        const withMenu = button.sizeHint().width(); button.setMenu(null);
        expect(withMenu - button.sizeHint().width()).toBe(CSplitButton.MenuButtonWidth);
    });
    test("tiny buttons keep arrow geometry inside their bounds", () => {
        button.setGeometry(0, 0, 8, 6); const r = button.menuButtonRect();
        expect(r.x()).toBe(0); expect(r.width()).toBe(8); expect(r.height()).toBe(6);
    });
    test("popup uses canvas coordinates for an offset parent", () => {
        const owner = new CWidget(); owner.setGeometry(40, 30, 250, 150);
        button.setParent(owner); button.showMenu();
        expect(menu.x()).toBe(60); expect(menu.y()).toBe(80);
        button.setParent(null); owner.destroy();
    });
    test("hiding the button closes its popup", () => { button.showMenu(); button.hide(); expect(menu.isOpen()).toBe(false); });
    test("style option copies independent part states", () => {
        const option = new CStyleOptionSplitButton(); option.menuWidth = 24; option.menuDown = true; option.mainHovered = true;
        const copy = new CStyleOptionSplitButton(option); option.menuWidth = 0;
        expect(copy.menuWidth).toBe(24); expect(copy.menuDown).toBe(true); expect(copy.mainHovered).toBe(true);
    });
    test("paint passes independent pressed parts to the style", () => {
        class Paintable extends CSplitButton { paint(p: CPainter): void { this.paintEvent(p); } }
        const edit = new Paintable(); edit.setGeometry(0, 0, 140, 30); edit.setMenu(menu);
        const draw = vi.spyOn(edit.style(), "drawSplitButton"); draw.mockImplementation(() => {});
        try {
            edit.event(new CMouseEvent(CEventType.MousePress, 130, 15, CMouseButton.LeftButton));
            edit.paint({} as CPainter);
            const option = draw.mock.calls[0]![1];
            expect(option.menuDown).toBe(true); expect(option.mainDown).toBe(false); expect(option.menuWidth).toBe(24);
        } finally { draw.mockRestore(); edit.setMenu(null); edit.destroy(); }
    });
    test("style paints parts separately and balances clipping", () => {
        const style = new CDefaultStyle(); const draw = vi.spyOn(style, "drawPushButton"); draw.mockImplementation(() => {});
        const option = new CStyleOptionSplitButton(); option.initFromPushButton(button);
        option.menuWidth = 24; option.menuDown = true;
        const painter = { save: vi.fn(), restore: vi.fn(), clipRect: vi.fn(), setFont: vi.fn(),
            setTextAlign: vi.fn(), setTextBaseline: vi.fn(), setPen: vi.fn(), setLineWidth: vi.fn(),
            setBrush: vi.fn(), fillRect: vi.fn(), drawLine: vi.fn(), drawText: vi.fn(), drawPixmap: vi.fn() };
        try {
            style.drawSplitButton(painter as unknown as CPainter, option);
            expect(draw).toHaveBeenCalledTimes(2);
            expect((draw.mock.calls[0]![1].state & CStyleState.Sunken) !== 0).toBe(false);
            expect((draw.mock.calls[1]![1].state & CStyleState.Sunken) !== 0).toBe(true);
            expect(painter.drawText).toHaveBeenCalledWith("New", 58, 15);
            expect(painter.drawLine).toHaveBeenCalledTimes(3);
            expect(painter.save.mock.calls.length).toBe(painter.restore.mock.calls.length);
        } finally { draw.mockRestore(); }
    });
    test("losing focus cancels a held Space key", () => {
        const clicked = vi.fn(); button.clicked.connect(clicked); button.setFocus(); key(" ");
        const other = new CPushButton(); other.setFocus(); key(" ", true);
        expect(clicked).not.toHaveBeenCalled(); other.destroy();
    });
    test("destroy disconnects the borrowed action", () => {
        const action = new CAction("Before"); button.setDefaultAction(action); button.destroy();
        action.setText("After"); expect(button.text()).toBe("Before");
    });
    test("popup fits at the bottom and right edges of the canvas", () => {
        const device = CApplication.instance().paintDevice();
        button.setGeometry(device.width() - 100, device.height() - 30, 100, 30);
        button.showMenu();
        expect(menu.x() + menu.width()).toBeLessThanOrEqual(device.width());
        expect(menu.y() + menu.height()).toBeLessThanOrEqual(device.height());
        expect(menu.y()).toBeLessThan(button.y());
    });
    test("real style draws a focus outline without changing either action", () => {
        const option = new CStyleOptionSplitButton(); option.initFromPushButton(button);
        option.menuWidth = 24; option.state |= CStyleState.HasFocus;
        const recorded = recordPainting(); new CDefaultStyle().drawSplitButton(recorded.paint, option);
        expect(recorded.dots().length).toBeGreaterThan(0);
        expect(recorded.painter.save.mock.calls.length).toBe(recorded.painter.restore.mock.calls.length);
    });
    test("disabled arrow and caption use DisabledText", () => {
        const option = new CStyleOptionSplitButton(); option.initFromPushButton(button);
        option.menuWidth = 24; option.state &= ~CStyleState.Enabled;
        const recorded = recordPainting(); new CDefaultStyle().drawSplitButton(recorded.paint, option);
        expect(recorded.painter.setPen).toHaveBeenCalledWith(option.palette.color(CPaletteColorRole.DisabledText).toCss());
        expect(recorded.dots().length).toBe(0);
    });
    test("tiny style rectangles keep drawn arrow points within bounds", () => {
        const option = new CStyleOptionSplitButton(); option.initFromPushButton(button);
        option.rect = new CRect(0, 0, 6, 6); option.menuWidth = 24;
        const recorded = recordPainting(); new CDefaultStyle().drawSplitButton(recorded.paint, option);
        for (const line of recorded.painter.drawLine.mock.calls) {
            for (let i = 0; i < line.length; ++i) {
                expect(line[i]).toBeGreaterThanOrEqual(0); expect(line[i]).toBeLessThanOrEqual(6);
            }
        }
    });

});
