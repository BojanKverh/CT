import { CFontMetrics } from "../../src/gui/CFontMetrics.js";
import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";
import { CNavigationPath } from "../../src/widgets/CNavigationPath.js";
import { CApplication } from "../../src/core/CApplication.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CStyleOptionNavigationPath } from "../../src/gui/CStyleOptionNavigationPath.js";
import { CStyleState } from "../../src/gui/CStyleOption.js";
import { CDefaultStyle } from "../../src/gui/CDefaultStyle.js";
import { CPaletteColorRole } from "../../src/gui/CPalette.js";
import { CFont } from "../../src/gui/CFont.js";
import { CRect } from "../../src/geometry/CRect.js";
import type { CPainter } from "../../src/painting/CPainter.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

class PaintablePath extends CNavigationPath {
    paint(painter: CPainter): void { this.paintEvent(painter); }
}
function recordingPainter() {
    const painter = { save: vi.fn(), restore: vi.fn(), clipRect: vi.fn(), setBrush: vi.fn(), fillRect: vi.fn(),
        setPen: vi.fn(), setFont: vi.fn(), setTextAlign: vi.fn(), setTextBaseline: vi.fn(),
        drawText: vi.fn(), drawLine: vi.fn(), setLineWidth: vi.fn() };
    return { painter, paint: painter as unknown as CPainter };
}

describe("CNavigationPath", () => {
    let path: PaintablePath;
    beforeEach(() => {
        if (CApplication.exists()) CApplication.instance().destroy();
        const canvas = createTestCanvas(); canvas.width = 1000; canvas.height = 700;
        new CApplication(canvas);
        path = new PaintablePath(); path.setGeometry(0, 0, 900, 32);
    });
    afterEach(() => { path.destroy(); if (CApplication.exists()) CApplication.instance().destroy(); });
    function key(value: string, release = false): CKeyEvent {
        const event = new CKeyEvent(release ? CEventType.KeyRelease : CEventType.KeyPress, value);
        path.event(event); return event;
    }
    function mouse(type: CEventType, x: number, y = 15, button = CMouseButton.LeftButton): void {
        path.event(new CMouseEvent(type, x, y, button));
    }
    function click(index: number): void {
        const rect = path.segmentRect(index)!;
        const x = rect.x() + rect.width() / 2;
        mouse(CEventType.MousePress, x); mouse(CEventType.MouseRelease, x);
    }
    function longPath(): void {
        path.setPath(["Company headquarters", "Sales department", "Fiscal year 2026", "Issued documents", "Invoice 2026-0042"]);
        path.resize(230, 32);
    }
    function option(): CStyleOptionNavigationPath {
        let result: CStyleOptionNavigationPath | null = null;
        const draw = vi.spyOn(path.style(), "drawNavigationPath");
        draw.mockImplementation((_painter, value) => { result = value; });
        try { path.paint({} as CPainter); } finally { draw.mockRestore(); }
        return result!;
    }
    test("starts with an empty path", () => {
        expect(path.path()).toEqual([]); expect(path.count()).toBe(0); expect(path.currentIndex()).toBe(-1);
        expect(path.segmentRect(0)).toBeNull(); expect(path.overflowButtonRect()).toBeNull();
    });
    test("stores and returns copies", () => {
        const items = ["Company", "Sales"]; path.setPath(items); items[0] = "Changed";
        const copy = path.path(); copy.pop(); expect(path.path()).toEqual(["Company", "Sales"]);
    });
    test("emits pathChanged only when the path changes", () => {
        const changed = vi.fn(); path.pathChanged.connect(changed);
        path.setPath(["Company", "Sales"]); path.setPath(["Company", "Sales"]);
        expect(changed).toHaveBeenCalledOnce(); expect(changed).toHaveBeenCalledWith(["Company", "Sales"]);
    });
    test("signal payload does not expose internal storage", () => {
        path.pathChanged.connect(items => items.pop()); path.setPath(["Company", "Sales"]); expect(path.count()).toBe(2);
    });
    test("clear resets the path", () => { path.setPath(["Company"]); path.clear(); expect(path.count()).toBe(0); });
    test("all segments are visible when space is available", () => {
        path.setPath(["Company", "Sales", "Invoices"]);
        for (let i = 0; i < 3; ++i) expect(path.segmentRect(i)).not.toBeNull();
        expect(path.hiddenIndices()).toEqual([]); expect(path.overflowButtonRect()).toBeNull();
    });
    test("ancestor click emits its index and text without changing the path", () => {
        path.setPath(["Company", "Sales", "Invoices"]); const activated = vi.fn(); path.activated.connect(activated);
        click(1); expect(activated).toHaveBeenCalledWith(1, "Sales"); expect(path.count()).toBe(3);
    });
    test("the current page is not an interactive ancestor", () => {
        path.setPath(["Company", "Sales"]); const activated = vi.fn(); path.activated.connect(activated);
        click(1); expect(activated).not.toHaveBeenCalled();
    });
    test("identical captions still identify the correct segment", () => {
        path.setPath(["Same", "Same", "Current"]); const activated = vi.fn(); path.activated.connect(activated);
        click(1); expect(activated).toHaveBeenCalledWith(1, "Same");
    });
    test("dragging between segments cancels activation", () => {
        path.setPath(["Company", "Sales", "Current"]); const activated = vi.fn(); path.activated.connect(activated);
        mouse(CEventType.MousePress, 10); mouse(CEventType.MouseRelease, path.segmentRect(1)!.x() + 10);
        expect(activated).not.toHaveBeenCalled();
    });
    test("releasing outside cancels activation", () => {
        path.setPath(["Company", "Sales"]); const activated = vi.fn(); path.activated.connect(activated);
        mouse(CEventType.MousePress, 10); mouse(CEventType.MouseRelease, -10);
        expect(activated).not.toHaveBeenCalled();
    });
    test("right mouse button does not activate", () => {
        path.setPath(["Company", "Sales"]); const activated = vi.fn(); path.activated.connect(activated);
        mouse(CEventType.MousePress, 10, 15, CMouseButton.RightButton);
        mouse(CEventType.MouseRelease, 10, 15, CMouseButton.RightButton); expect(activated).not.toHaveBeenCalled();
    });
    test("separators do not activate adjacent segments", () => {
        path.setPath(["Company", "Sales"]); const activated = vi.fn(); path.activated.connect(activated);
        const x = path.segmentRect(0)!.right() + 5;
        mouse(CEventType.MousePress, x); mouse(CEventType.MouseRelease, x); expect(activated).not.toHaveBeenCalled();
    });
    test("disabled paths reject mouse and keyboard activation", () => {
        path.setPath(["Company", "Sales"]); const activated = vi.fn(); path.activated.connect(activated);
        path.setEnabled(false); click(0); key("Enter"); expect(activated).not.toHaveBeenCalled();
    });
    test("arrow keys choose ancestors and Enter activates", () => {
        path.setPath(["Company", "Sales", "Invoices", "Current"]); const activated = vi.fn(); path.activated.connect(activated);
        key("Home"); key("ArrowRight"); key("Enter"); expect(activated).toHaveBeenCalledWith(1, "Sales");
        key("End"); key("Enter"); expect(activated).toHaveBeenCalledWith(2, "Invoices");
        key("ArrowLeft"); expect(option().focusedIndex).toBe(1);
    });
    test("Space activates once on release", () => {
        path.setPath(["Company", "Current"]); const activated = vi.fn(); path.activated.connect(activated);
        key(" "); expect(activated).not.toHaveBeenCalled(); key(" ", true); key(" ", true);
        expect(activated).toHaveBeenCalledOnce();
    });
    test("losing focus cancels held Space", () => {
        path.setPath(["Company", "Current"]); const activated = vi.fn(); path.activated.connect(activated);
        path.setFocus(); key(" "); const other = new CNavigationPath(); other.setFocus(); key(" ", true);
        expect(activated).not.toHaveBeenCalled(); other.destroy();
    });
    test("single-page paths do not activate with Enter", () => {
        path.setPath(["Current"]); expect(key("Enter").isAccepted()).toBe(false);
    });
    test("Tab is left to application focus navigation", () => {
        path.setPath(["Company", "Current"]); expect(key("Tab").isAccepted()).toBe(false);
    });
    test("overflow keeps the current page visible", () => {
        longPath(); expect(path.hiddenIndices().length).toBeGreaterThan(0);
        expect(path.segmentRect(path.currentIndex())).not.toBeNull(); expect(path.overflowButtonRect()).not.toBeNull();
    });
    test("current text is elided to fit available width", () => {
        longPath(); path.resize(100, 32); const current = option().segments.find(s => s.index === path.currentIndex())!;
        expect(current.text.endsWith("…")).toBe(true);
        expect(current.rect.right()).toBeLessThanOrEqual(path.width());
    });
    test("tiny rectangles retain valid current-page geometry", () => {
        longPath(); path.resize(20, 12); const items = option().segments;
        expect(items).toHaveLength(1); expect(items[0]!.index).toBe(path.currentIndex());
        expect(items[0]!.rect.width()).toBeGreaterThanOrEqual(0); expect(items[0]!.rect.right()).toBeLessThanOrEqual(20);
    });
    test("zero-sized paths produce no drawable segments", () => {
        longPath(); path.resize(0, 0); expect(option().segments).toEqual([]);
    });
    test("overflow lists omitted ancestors in original order", () => {
        longPath(); const hidden = path.hiddenIndices(); click(-1); const menu = path.overflowMenu()!;
        expect(menu.isOpen()).toBe(true); expect(menu.count()).toBe(hidden.length);
        for (let i = 0; i < hidden.length; ++i) expect(menu.actionAt(i)!.text()).toBe(path.path()[hidden[i]!]);
    });
    test("overflow action emits the original index and text", () => {
        longPath(); const activated = vi.fn(); path.activated.connect(activated); const index = path.hiddenIndices()[0]!;
        path.showOverflow(); const menu = path.overflowMenu()!;
        menu.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
        expect(activated).toHaveBeenCalledWith(index, path.path()[index]); expect(menu.isOpen()).toBe(false);
    });
    test("Down opens overflow and closing restores focus", () => {
        longPath(); path.setFocus(); key("ArrowDown"); expect(path.overflowMenu()!.isOpen()).toBe(true);
        path.overflowMenu()!.close(); expect(path.hasFocus()).toBe(true);
    });
    test("navigation can replace the path while a menu action is being handled", () => {
        longPath(); path.activated.connect(index => path.setPath(path.path().slice(0, index + 1)));
        const index = path.hiddenIndices()[0]!; path.showOverflow(); const menu = path.overflowMenu()!;
        menu.event(new CKeyEvent(CEventType.KeyPress, "Enter")); expect(path.count()).toBe(index + 1);
        expect(path.overflowMenu()).toBeNull();
    });
    test("resize closes stale overflow and recomputes visible items", () => {
        longPath(); path.showOverflow(); const menu = path.overflowMenu()!; path.resize(2000, 32);
        expect(menu.isOpen()).toBe(false); expect(path.hiddenIndices()).toEqual([]); expect(path.overflowMenu()).toBeNull();
    });
    test("font changes update preferred size and overflow", () => {
        // The shared test canvas uses fixed text widths. Supply font-dependent
        // metrics here to verify that the widget measures using its updated font.
        const measure = vi.spyOn(CFontMetrics.prototype, "textWidth");
        measure.mockImplementation(function (this: CFontMetrics, text: string): number {
            return Array.from(text).length * this.font().pixelSize() / 2;
        });
        try {
            const small = new CFont(); small.setPixelSize(12); path.setFont(small);
            path.setPath(["Company", "Department", "Invoices"]);
            const before = path.sizeHint().width();
            path.resize(before, 32);
            expect(path.hiddenIndices()).toEqual([]);
            const large = new CFont(small); large.setPixelSize(30); path.setFont(large);
            expect(path.sizeHint().width()).toBeGreaterThan(before);
            expect(path.hiddenIndices().length).toBeGreaterThan(0);
            expect(path.segmentRect(path.currentIndex())).not.toBeNull();
        } finally { measure.mockRestore(); }
    });
    test("hiding and disabling close the overflow popup", () => {
        longPath(); path.showOverflow(); path.hide(); expect(path.overflowMenu()).toBeNull();
        path.show(); path.showOverflow(); path.setEnabled(false); expect(path.overflowMenu()).toBeNull();
    });
    test("overflow position includes the parent offset", () => {
        const parent = new CWidget(); parent.setGeometry(40, 20, 500, 200);
        path.setParent(parent); path.setGeometry(10, 10, 230, 32); longPath(); path.showOverflow();
        expect(path.overflowMenu()!.x()).toBe(50 + path.overflowButtonRect()!.x());
        expect(path.overflowMenu()!.y()).toBe(62); path.setParent(null); parent.destroy();
    });
    test("copying style options copies segment geometry", () => {
        path.setPath(["Company", "Current"]); const source = option(); const copy = new CStyleOptionNavigationPath(source);
        source.segments[0]!.rect.setGeometry(100, 100, 1, 1);
        expect(copy.segments[0]!.rect.x()).toBe(0); expect(copy.currentIndex).toBe(1);
    });
    test("renderer draws captions and separators with balanced clipping", () => {
        path.setPath(["Company", "Sales", "Current"]); const value = option(); const r = recordingPainter();
        new CDefaultStyle().drawNavigationPath(r.paint, value);
        expect(r.painter.drawText).toHaveBeenCalledTimes(3); expect(r.painter.drawLine).toHaveBeenCalledTimes(4);
        expect(r.painter.save.mock.calls.length).toBe(r.painter.restore.mock.calls.length);
        expect(r.painter.setPen).toHaveBeenCalledWith(value.palette.color(CPaletteColorRole.Link).toCss());
    });
    test("disabled renderer uses DisabledText", () => {
        path.setPath(["Company", "Current"]); const value = option(); value.state &= ~CStyleState.Enabled;
        const r = recordingPainter(); new CDefaultStyle().drawNavigationPath(r.paint, value);
        for (const call of r.painter.setPen.mock.calls) expect(call[0]).toBe(value.palette.color(CPaletteColorRole.DisabledText).toCss());
    });
    test("keyboard focus draws a dotted outline on the focused ancestor", () => {
        path.setPath(["Company", "Current"]); const value = option(); value.state |= CStyleState.HasFocus;
        const r = recordingPainter(); new CDefaultStyle().drawNavigationPath(r.paint, value);
        expect(r.painter.fillRect.mock.calls.filter(call => call[0].width() === 1 && call[0].height() === 1).length).toBeGreaterThan(0);
    });
    test("hover and press affect the matching ancestor", () => {
        path.setPath(["Company", "Current"]); mouse(CEventType.MouseMove, 10); mouse(CEventType.MousePress, 10);
        const value = option(); expect(value.hoveredIndex).toBe(0); expect(value.pressedIndex).toBe(0);
        const r = recordingPainter(); new CDefaultStyle().drawNavigationPath(r.paint, value);
        expect(r.painter.setBrush).toHaveBeenCalledWith(value.palette.color(CPaletteColorRole.Highlight).toCss());
    });
    test("visible segments stay ordered and inside bounds across widths and fonts", () => {
        for (const size of [12, 18, 30]) {
            const font = new CFont(); font.setPixelSize(size); path.setFont(font);
            path.setPath(["Company", "Sales", "Financial year 2026", "Invoices", "Invoice 2026-0042"]);
            for (const width of [1, 20, 47, 48, 64, 90, 140, 230, 400, 900, 2000]) {
                path.resize(width, 32); const value = option();
                expect(value.segments[value.segments.length - 1]!.index).toBe(path.currentIndex());
                let edge = 0;
                for (const segment of value.segments) {
                    expect(segment.rect.x()).toBeGreaterThanOrEqual(edge);
                    expect(segment.rect.right()).toBeLessThanOrEqual(width);
                    expect(segment.rect.width()).toBeGreaterThanOrEqual(0);
                    edge = segment.rect.right();
                }
                const visible = value.segments.filter(s => s.index >= 0).map(s => s.index);
                expect(visible).toEqual([...visible].sort((a, b) => a - b));
                for (let i = 0; i < path.currentIndex(); ++i)
                    expect(Number(visible.includes(i)) + Number(path.hiddenIndices().includes(i))).toBe(1);
            }
        }
    });

    test("overflow is positioned within the canvas at its bottom-right corner", () => {
        longPath(); const device = CApplication.instance().paintDevice();
        path.setGeometry(device.width() - 230, device.height() - 32, 230, 32); path.showOverflow();
        const menu = path.overflowMenu()!;
        expect(menu.x()).toBeGreaterThanOrEqual(0); expect(menu.y()).toBeGreaterThanOrEqual(0);
        expect(menu.x() + menu.width()).toBeLessThanOrEqual(device.width());
        expect(menu.y() + menu.height()).toBeLessThanOrEqual(device.height());
        expect(menu.y()).toBeLessThan(path.y());
    });

});
