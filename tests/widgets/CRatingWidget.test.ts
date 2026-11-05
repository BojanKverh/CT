import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";
import { CRatingWidget } from "../../src/widgets/CRatingWidget.js";
import { CApplication } from "../../src/core/CApplication.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CStyleOptionRatingWidget } from "../../src/gui/CStyleOptionRatingWidget.js";
import { CStyleState } from "../../src/gui/CStyleOption.js";
import { CDefaultStyle } from "../../src/gui/CDefaultStyle.js";
import { CPaletteColorRole } from "../../src/gui/CPalette.js";
import { CFocusPolicy } from "../../src/gui/CFocusPolicy.js";
import type { CPainter } from "../../src/painting/CPainter.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

class PaintableRating extends CRatingWidget {
    paint(painter: CPainter): void { this.paintEvent(painter); }
}
function recordingPainter() {
    const painter = { save: vi.fn(), restore: vi.fn(), clipRect: vi.fn(), setBrush: vi.fn(), fillRect: vi.fn(),
        setPen: vi.fn(), drawLine: vi.fn(), setLineWidth: vi.fn() };
    return { painter, paint: painter as unknown as CPainter };
}

describe("CRatingWidget", () => {
    let rating: PaintableRating;
    beforeEach(() => {
        if (CApplication.exists()) CApplication.instance().destroy();
        new CApplication(createTestCanvas()); rating = new PaintableRating();
        const hint = rating.sizeHint(); rating.resize(hint.width(), hint.height());
    });
    afterEach(() => { rating.destroy(); if (CApplication.exists()) CApplication.instance().destroy(); });
    function key(value: string): CKeyEvent {
        const event = new CKeyEvent(CEventType.KeyPress, value); rating.event(event); return event;
    }
    function mouse(type: CEventType, value: number, button = CMouseButton.LeftButton): void {
        const r = rating.starRect(value - 1)!;
        rating.event(new CMouseEvent(type, r.x() + r.width() / 2, r.y() + r.height() / 2, button));
    }
    function click(value: number): void { mouse(CEventType.MousePress, value); mouse(CEventType.MouseRelease, value); }
    function option(): CStyleOptionRatingWidget {
        let value: CStyleOptionRatingWidget | null = null;
        const draw = vi.spyOn(rating.style(), "drawRatingWidget");
        draw.mockImplementation((_painter, data) => { value = data; });
        try { rating.paint({} as CPainter); } finally { draw.mockRestore(); }
        return value!;
    }
    test("defaults to five unrated stars", () => {
        expect(rating.value()).toBe(0); expect(rating.maximum()).toBe(5);
        expect(rating.previewValue()).toBe(0); expect(rating.isReadOnly()).toBe(false);
    });
    test("clamps and rounds integer values", () => {
        rating.setValue(3.9); expect(rating.value()).toBe(3);
        rating.setValue(99); expect(rating.value()).toBe(5); rating.setValue(-2); expect(rating.value()).toBe(0);
    });
    test("emits only when the committed value changes", () => {
        const changed = vi.fn(); rating.valueChanged.connect(changed); rating.setValue(3); rating.setValue(3);
        expect(changed).toHaveBeenCalledOnce(); expect(changed).toHaveBeenCalledWith(3);
    });
    test("reducing maximum clamps the value and emits", () => {
        rating.setValue(5); const changed = vi.fn(); rating.valueChanged.connect(changed); rating.setMaximum(3);
        expect(rating.value()).toBe(3); expect(changed).toHaveBeenCalledWith(3);
    });
    test("normalizes maximum to one through one hundred", () => {
        rating.setMaximum(0); expect(rating.maximum()).toBe(1);
        rating.setMaximum(200); expect(rating.maximum()).toBe(100);
        rating.setMaximum(7.9); expect(rating.maximum()).toBe(7);
    });
    test("rejects non-finite properties without changing state", () => {
        expect(() => rating.setValue(NaN)).toThrow(RangeError);
        expect(() => rating.setMaximum(Infinity)).toThrow(RangeError);
        expect(() => rating.setStarSize(-Infinity)).toThrow(RangeError);
        expect(() => rating.setSpacing(NaN)).toThrow(RangeError); expect(rating.maximum()).toBe(5);
    });
    test("hover changes preview without committing or emitting", () => {
        rating.setValue(2); const changed = vi.fn(); rating.valueChanged.connect(changed);
        mouse(CEventType.MouseMove, 4); expect(rating.previewValue()).toBe(4); expect(rating.value()).toBe(2);
        expect(changed).not.toHaveBeenCalled();
    });
    test("leaving the widget restores the committed preview", () => {
        rating.setValue(2); mouse(CEventType.MouseMove, 5);
        rating.event(new CMouseEvent(CEventType.MouseLeave, -1, -1, CMouseButton.NoButton));
        expect(rating.previewValue()).toBe(2);
    });
    test("click commits on release", () => {
        mouse(CEventType.MousePress, 4); expect(rating.value()).toBe(0);
        mouse(CEventType.MouseRelease, 4); expect(rating.value()).toBe(4);
    });
    test("dragging to another star commits the release position", () => {
        mouse(CEventType.MousePress, 1); mouse(CEventType.MouseMove, 5); mouse(CEventType.MouseRelease, 5);
        expect(rating.value()).toBe(5);
    });
    test("release outside cancels a pending selection", () => {
        rating.setValue(2); mouse(CEventType.MousePress, 5);
        rating.event(new CMouseEvent(CEventType.MouseRelease, -10, -10, CMouseButton.LeftButton));
        expect(rating.value()).toBe(2); expect(rating.previewValue()).toBe(2);
    });
    test("release without press does not commit", () => { mouse(CEventType.MouseRelease, 5); expect(rating.value()).toBe(0); });
    test("right click does not commit", () => {
        mouse(CEventType.MousePress, 5, CMouseButton.RightButton); mouse(CEventType.MouseRelease, 5, CMouseButton.RightButton);
        expect(rating.value()).toBe(0);
    });
    test("gaps do not select stars", () => {
        const r = rating.starRect(0)!; rating.event(new CMouseEvent(CEventType.MouseMove, r.right() + 2, 16, CMouseButton.LeftButton));
        expect(rating.previewValue()).toBe(0);
    });
    test("arrow keys adjust the committed value", () => {
        key("ArrowRight"); key("ArrowUp"); expect(rating.value()).toBe(2);
        key("ArrowDown"); key("ArrowLeft"); expect(rating.value()).toBe(0);
    });
    test("Home and End select the limits", () => {
        key("End"); expect(rating.value()).toBe(5); key("Home"); expect(rating.value()).toBe(0);
    });
    for (const clear of ["Delete", "Backspace"]) test(`${clear} clears a rating`, () => {
        rating.setValue(4); key(clear); expect(rating.value()).toBe(0);
    });
    test("keyboard actions discard hover preview", () => {
        rating.setValue(2); mouse(CEventType.MouseMove, 5); key("ArrowRight");
        expect(rating.previewValue()).toBe(3); expect(rating.value()).toBe(3);
    });
    test("Escape cancels an uncommitted mouse selection", () => {
        mouse(CEventType.MousePress, 5); key("Escape"); mouse(CEventType.MouseRelease, 5);
        expect(rating.value()).toBe(0);
    });
    test("Tab remains available for focus navigation", () => { expect(key("Tab").isAccepted()).toBe(false); });
    test("read-only mode blocks user changes but allows programmatic values", () => {
        rating.setReadOnly(true); mouse(CEventType.MouseMove, 5); click(5); key("End");
        expect(rating.value()).toBe(0); expect(rating.previewValue()).toBe(0);
        rating.setValue(3); expect(rating.value()).toBe(3);
        expect(rating.focusPolicy()).toBe(CFocusPolicy.NoFocus);
        rating.setReadOnly(false); expect(rating.focusPolicy()).toBe(CFocusPolicy.StrongFocus);
    });
    test("switching to read-only cancels a pending mouse press", () => {
        mouse(CEventType.MousePress, 5); rating.setReadOnly(true); rating.setReadOnly(false);
        mouse(CEventType.MouseRelease, 5); expect(rating.value()).toBe(0);
    });
    test("disabled widgets neither preview nor commit", () => {
        rating.setValue(2); mouse(CEventType.MouseMove, 4); rating.setEnabled(false);
        mouse(CEventType.MouseMove, 5); click(5); key("End");
        expect(rating.value()).toBe(2); expect(rating.previewValue()).toBe(2);
    });
    test("hiding cancels pending selection", () => {
        mouse(CEventType.MousePress, 5); rating.hide(); rating.show(); mouse(CEventType.MouseRelease, 5);
        expect(rating.value()).toBe(0);
    });
    test("resizing cancels pending selection", () => {
        mouse(CEventType.MousePress, 5); rating.resize(100, 30); mouse(CEventType.MouseRelease, 5); expect(rating.value()).toBe(0);
    });
    test("star size and spacing affect preferred size", () => {
        const before = rating.sizeHint().width(); rating.setStarSize(32); expect(rating.sizeHint().width()).toBeGreaterThan(before);
        const larger = rating.sizeHint().width(); rating.setSpacing(8); expect(rating.sizeHint().width()).toBeGreaterThan(larger);
    });
    test("invalid star indices have no geometry", () => {
        expect(rating.starRect(-1)).toBeNull(); expect(rating.starRect(5)).toBeNull(); expect(rating.starRect(0.5)).toBeNull();
    });
    test("stars shrink together to fit a narrow viewport", () => {
        rating.resize(80, 20);
        for (let i = 0; i < rating.maximum(); ++i) {
            const r = rating.starRect(i)!; expect(r.x()).toBeGreaterThanOrEqual(0);
            expect(r.right()).toBeLessThanOrEqual(80); expect(r.y()).toBeGreaterThanOrEqual(0);
            expect(r.bottom()).toBeLessThanOrEqual(20);
        }
        click(3); expect(rating.value()).toBe(3);
    });
    test("zero-sized widgets do not produce active hit areas", () => {
        rating.resize(0, 0); rating.event(new CMouseEvent(CEventType.MousePress, 0, 0, CMouseButton.LeftButton));
        rating.event(new CMouseEvent(CEventType.MouseRelease, 0, 0, CMouseButton.LeftButton)); expect(rating.value()).toBe(0);
    });
    test("style receives committed and preview values independently", () => {
        rating.setValue(2); mouse(CEventType.MouseMove, 4); const data = option();
        expect(data.value).toBe(2); expect(data.previewValue).toBe(4); expect(data.starRects).toHaveLength(5);
    });
    test("style options copy star geometry", () => {
        const source = option(), copy = new CStyleOptionRatingWidget(source);
        source.starRects[0]!.setGeometry(99, 99, 1, 1); expect(copy.starRects[0]!.x()).toBe(4);
    });
    test("renderer draws ten outline edges per star and balances painter state", () => {
        const r = recordingPainter(); new CDefaultStyle().drawRatingWidget(r.paint, option());
        expect(r.painter.drawLine).toHaveBeenCalledTimes(50);
        expect(r.painter.save.mock.calls.length).toBe(r.painter.restore.mock.calls.length);
        expect(r.painter.fillRect.mock.calls.length).toBeGreaterThan(0);
    });
    test("selected stars use Highlight and empty stars use Mid", () => {
        rating.setValue(2); const data = option(), r = recordingPainter(); new CDefaultStyle().drawRatingWidget(r.paint, data);
        expect(r.painter.setPen.mock.calls.filter(call => call[0] === data.palette.color(CPaletteColorRole.Highlight).toCss())).toHaveLength(2);
        expect(r.painter.setPen.mock.calls.filter(call => call[0] === data.palette.color(CPaletteColorRole.Mid).toCss())).toHaveLength(3);
    });
    test("disabled star outlines use DisabledText", () => {
        const data = option(); data.state &= ~CStyleState.Enabled; const r = recordingPainter();
        new CDefaultStyle().drawRatingWidget(r.paint, data);
        for (const call of r.painter.setPen.mock.calls) expect(call[0]).toBe(data.palette.color(CPaletteColorRole.DisabledText).toCss());
    });
    test("focus indicator is omitted for read-only display", () => {
        const data = option(); data.state |= CStyleState.HasFocus;
        const editable = recordingPainter(); new CDefaultStyle().drawRatingWidget(editable.paint, data);
        data.readOnly = true; const display = recordingPainter(); new CDefaultStyle().drawRatingWidget(display.paint, data);
        expect(editable.painter.fillRect.mock.calls.length).toBeGreaterThan(display.painter.fillRect.mock.calls.length);
    });
});
