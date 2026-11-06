import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";
import { CCategoryButton } from "../../src/widgets/CCategoryButton.js";
import { CStyleOptionCategoryButton } from "../../src/gui/CStyleOptionCategoryButton.js";
import { CApplication } from "../../src/core/CApplication.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CMouseEvent, CMouseButton } from "../../src/events/CMouseEvent.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CDefaultStyle } from "../../src/gui/CDefaultStyle.js";
import { CStyleState } from "../../src/gui/CStyleOption.js";
import { CFocusPolicy } from "../../src/gui/CFocusPolicy.js";
import { CPaletteColorRole } from "../../src/gui/CPalette.js";
import { CFont } from "../../src/gui/CFont.js";
import { CFontMetrics } from "../../src/gui/CFontMetrics.js";
import { CIcon, CIconMode, CIconState } from "../../src/gui/CIcon.js";
import { CPixmap } from "../../src/painting/CPixmap.js";
import { CRect } from "../../src/geometry/CRect.js";
import type { CPainter } from "../../src/painting/CPainter.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

class PaintableSegments extends CCategoryButton { paint(p: CPainter): void { this.paintEvent(p); } }

describe("CCategoryButton", () => {
    let control: PaintableSegments;
    beforeEach(() => {
        if (CApplication.exists()) CApplication.instance().destroy();
        new CApplication(createTestCanvas()); control = new PaintableSegments(); control.resize(300, 32);
    });
    afterEach(() => { control.destroy(); if (CApplication.exists()) CApplication.instance().destroy(); });
    function items(): void { control.addItems(["Day", "Week", "Month"]); }
    function key(name: string, type = CEventType.KeyPress): void { control.event(new CKeyEvent(type, name)); }
    function mouse(type: CEventType, index: number, button = CMouseButton.LeftButton): void {
        const rect = control.segmentRect(index)!;
        control.event(new CMouseEvent(type, rect.x() + rect.width() / 2, 16, button));
    }
    function click(index: number): void { mouse(CEventType.MousePress, index); mouse(CEventType.MouseRelease, index); }
    function recorder() {
        const p = { save: vi.fn(), restore: vi.fn(), clipRect: vi.fn(), setBrush: vi.fn(), setPen: vi.fn(), setLineWidth: vi.fn(),
            drawRoundedRect: vi.fn(), drawLine: vi.fn(), fillRect: vi.fn(), setFont: vi.fn(), setTextAlign: vi.fn(), setTextBaseline: vi.fn(), drawText: vi.fn(), drawPixmap: vi.fn() };
        return { p, paint: p as unknown as CPainter };
    }
    function option(): CStyleOptionCategoryButton {
        const o = new CStyleOptionCategoryButton(); o.rect = new CRect(0, 0, 200, 32); o.state = CStyleState.Enabled;
        o.segments = [{ text: "Day", icon: null, enabled: true, rect: new CRect(0, 0, 100, 32) },
            { text: "Week", icon: null, enabled: true, rect: new CRect(100, 0, 100, 32) }]; o.currentIndex = 0; return o;
    }
    test("starts empty with no selection", () => { expect(control.count()).toBe(0); expect(control.currentIndex()).toBe(-1); expect(control.currentText()).toBe(""); });
    test("first item is automatically selected", () => { expect(control.addItem("Day")).toBe(0); expect(control.currentIndex()).toBe(0); expect(control.currentText()).toBe("Day"); });
    test("adding more items preserves selection", () => { items(); expect(control.count()).toBe(3); expect(control.currentText()).toBe("Day"); });
    test("programmatic selection emits only changed indices", () => {
        items(); const changed = vi.fn(), activated = vi.fn(); control.currentIndexChanged.connect(changed); control.activated.connect(activated);
        control.setCurrentIndex(2); control.setCurrentIndex(2); expect(changed).toHaveBeenCalledOnce(); expect(changed).toHaveBeenCalledWith(2); expect(activated).not.toHaveBeenCalled();
    });
    test("invalid and disabled indices cannot be selected", () => {
        items(); control.setItemEnabled(1, false); for (const index of [1, 20, -2, 0.5, NaN]) control.setCurrentIndex(index); expect(control.currentIndex()).toBe(0);
    });
    test("minus one explicitly clears selection", () => { items(); control.setCurrentIndex(-1); expect(control.currentText()).toBe(""); });
    test("inserting before selection preserves its identity and reports the new index", () => {
        items(); control.setCurrentIndex(1); control.insertItem(0, "Hour"); expect(control.currentIndex()).toBe(2); expect(control.currentText()).toBe("Week");
    });
    test("invalid insertions do not mutate items", () => { items(); expect(control.insertItem(-1, "x")).toBe(-1); expect(control.insertItem(4, "x")).toBe(-1); expect(control.count()).toBe(3); });
    test("removing before selection preserves its identity", () => { items(); control.setCurrentIndex(2); control.removeItem(0); expect(control.currentIndex()).toBe(1); expect(control.currentText()).toBe("Month"); });
    test("removing current item notifies even when the replacement has the same index", () => {
        items(); const changed = vi.fn(); control.currentIndexChanged.connect(changed); control.removeItem(0); expect(control.currentText()).toBe("Week"); expect(changed).toHaveBeenCalledWith(0);
    });
    test("removing the last selected item wraps to an enabled item", () => { items(); control.setCurrentIndex(2); control.removeItem(2); expect(control.currentIndex()).toBe(0); });
    test("clear resets count and selection", () => { items(); control.clear(); expect(control.count()).toBe(0); expect(control.currentIndex()).toBe(-1); });
    test("disabling selected item advances and skips disabled items", () => { items(); control.setItemEnabled(1, false); control.setItemEnabled(0, false); expect(control.currentIndex()).toBe(2); });
    test("all disabled gives no selection; enabling an item selects it", () => {
        items(); for (let i = 0; i < 3; ++i) control.setItemEnabled(i, false); expect(control.currentIndex()).toBe(-1);
        control.setItemEnabled(1, true); expect(control.currentIndex()).toBe(1);
    });
    test("click changes selection and emits activation", () => { items(); const activated = vi.fn(); control.activated.connect(activated); click(2); expect(control.currentIndex()).toBe(2); expect(activated).toHaveBeenCalledWith(2); });
    test("clicking current item cannot unselect it", () => { items(); click(0); expect(control.currentIndex()).toBe(0); });
    test("disabled segment ignores clicks", () => { items(); control.setItemEnabled(1, false); click(1); expect(control.currentIndex()).toBe(0); });
    test("right click does not select", () => { items(); mouse(CEventType.MousePress, 2, CMouseButton.RightButton); mouse(CEventType.MouseRelease, 2, CMouseButton.RightButton); expect(control.currentIndex()).toBe(0); });
    test("press and release on different segments cancels activation", () => { items(); mouse(CEventType.MousePress, 1); mouse(CEventType.MouseRelease, 2); expect(control.currentIndex()).toBe(0); });
    test("release without a press does not activate", () => { items(); mouse(CEventType.MouseRelease, 2); expect(control.currentIndex()).toBe(0); });
    test("arrow keys wrap and skip disabled segments", () => {
        items(); control.setItemEnabled(1, false); key("ArrowRight"); expect(control.currentIndex()).toBe(2);
        key("ArrowRight"); expect(control.currentIndex()).toBe(0); key("ArrowLeft"); expect(control.currentIndex()).toBe(2);
    });
    test("Home and End select first and last enabled segments", () => { items(); control.setItemEnabled(0, false); key("End"); expect(control.currentIndex()).toBe(2); key("Home"); expect(control.currentIndex()).toBe(1); });
    test("arrows recover from an explicitly cleared selection", () => { items(); control.setCurrentIndex(-1); key("ArrowRight"); expect(control.currentIndex()).toBe(0); });
    test("Space activates once on release despite repeated keydown", () => {
        items(); const activated = vi.fn(); control.activated.connect(activated); key(" "); key(" "); expect(activated).not.toHaveBeenCalled();
        key(" ", CEventType.KeyRelease); key(" ", CEventType.KeyRelease); expect(activated).toHaveBeenCalledOnce();
    });
    test("Enter activates current selection", () => { items(); const activated = vi.fn(); control.activated.connect(activated); key("Enter"); expect(activated).toHaveBeenCalledWith(0); });
    test("Escape cancels pending Space", () => { items(); const activated = vi.fn(); control.activated.connect(activated); key(" "); key("Escape"); key(" ", CEventType.KeyRelease); expect(activated).not.toHaveBeenCalled(); });
    test("disabling the group cancels pending input", () => {
        items(); const activated = vi.fn(); control.activated.connect(activated); key(" "); control.setEnabled(false); click(2); control.setEnabled(true); key(" ", CEventType.KeyRelease); expect(activated).not.toHaveBeenCalled();
    });
    test("mutating items cancels a pending click", () => { items(); mouse(CEventType.MousePress, 1); control.insertItem(0, "Hour"); mouse(CEventType.MouseRelease, 1); expect(control.currentText()).toBe("Day"); });
    test("Tab sees a single focus stop", () => {
        const parent = new CWidget(); control.setParent(parent); items(); const next = new CWidget(parent); next.setFocusPolicy(CFocusPolicy.StrongFocus);
        control.setFocus(); CApplication.instance().focusNextWidget(); expect(next.hasFocus()).toBe(true); control.setParent(null); parent.destroy();
    });
    test("segment geometry covers the width without gaps or overlaps", () => {
        items(); for (const width of [17, 150, 600]) { control.resize(width, 32); let x = 0;
            for (let i = 0; i < 3; ++i) { const r = control.segmentRect(i)!; expect(r.x()).toBeCloseTo(x); x += r.width(); }
            expect(x).toBeCloseTo(width);
        }
    });
    test("zero geometry and invalid indices have no rectangle", () => { items(); expect(control.segmentRect(8)).toBeNull(); control.resize(0, 0); expect(control.segmentRect(0)).toBeNull(); });
    test("caption and icon changes update item data and preferred width", () => {
        control.addItem("A"); const before = control.sizeHint().width(); control.setItemText(0, "Notifications"); expect(control.sizeHint().width()).toBeGreaterThan(before);
        const icon = new CIcon(new CPixmap({} as CanvasImageSource, 16, 16)); const width = control.sizeHint().width(); control.setItemIcon(0, icon);
        expect(control.itemIcon(0)).toBe(icon); expect(control.sizeHint().width()).toBeGreaterThan(width);
    });
    test("font affects preferred size", () => {
        items(); const spy = vi.spyOn(CFontMetrics.prototype, "textWidth"); spy.mockImplementation(function(this: CFontMetrics, text: string) { return text.length * this.font().pixelSize(); });
        try { const before = control.sizeHint().width(); const font = new CFont(control.font()); font.setPixelSize(30); control.setFont(font); expect(control.sizeHint().width()).toBeGreaterThan(before); } finally { spy.mockRestore(); }
    });
    test("style option copies segment geometry independently", () => {
        const o = option(), copy = new CStyleOptionCategoryButton(o); copy.segments[0]!.rect = new CRect(9, 9, 9, 9); copy.segments[0]!.text = "Changed";
        expect(o.segments[0]!.text).toBe("Day"); expect(o.segments[0]!.rect.x()).toBe(0);
    });
    test("style draws connected segments and balanced clips", () => {
        const r = recorder(); new CDefaultStyle().drawCategoryButton(r.paint, option()); expect(r.p.drawRoundedRect).toHaveBeenCalledTimes(2);
        expect(r.p.save.mock.calls.length).toBe(r.p.restore.mock.calls.length); expect(r.p.clipRect.mock.calls.length).toBe(3);
    });
    test("selected segment uses palette highlight colors", () => {
        const o = option(), r = recorder(); new CDefaultStyle().drawCategoryButton(r.paint, o);
        expect(r.p.setBrush).toHaveBeenCalledWith(o.palette.color(CPaletteColorRole.Highlight).toCss()); expect(r.p.setPen).toHaveBeenCalledWith(o.palette.color(CPaletteColorRole.HighlightedText).toCss());
    });
    test("disabled segment uses DisabledText", () => {
        const o = option(), r = recorder(); o.segments[1]!.enabled = false; new CDefaultStyle().drawCategoryButton(r.paint, o);
        expect(r.p.setPen).toHaveBeenCalledWith(o.palette.color(CPaletteColorRole.DisabledText).toCss());
    });
    test("icons request selected and disabled modes", () => {
        const o = option(), r = recorder(), icon = new CIcon(new CPixmap({} as CanvasImageSource, 16, 16));
        o.segments[0]!.icon = icon; o.segments[1]!.icon = icon; o.segments[1]!.enabled = false;
        const spy = vi.spyOn(icon, "pixmap"); new CDefaultStyle().drawCategoryButton(r.paint, o);
        expect(spy.mock.calls[0]![1]).toBe(CIconMode.Selected); expect(spy.mock.calls[0]![2]).toBe(CIconState.On);
        expect(spy.mock.calls[1]![1]).toBe(CIconMode.Disabled); expect(r.p.drawPixmap).toHaveBeenCalledTimes(2); spy.mockRestore();
    });
    test("focus outline is confined to the selected segment", () => {
        const o = option(), r = recorder(); o.state |= CStyleState.HasFocus; new CDefaultStyle().drawCategoryButton(r.paint, o);
        expect(r.p.fillRect.mock.calls.length).toBeGreaterThan(0);
        for (const [rect] of r.p.fillRect.mock.calls) expect((rect as CRect).x() < 100).toBe(true);
    });
    test("tiny segment geometry is skipped safely", () => {
        const o = option(), r = recorder(); o.segments[0]!.rect = new CRect(0, 0, 1, 1); o.segments[1]!.rect = new CRect(1, 0, 1, 1);
        new CDefaultStyle().drawCategoryButton(r.paint, o); expect(r.p.drawRoundedRect).not.toHaveBeenCalled();
    });
});
