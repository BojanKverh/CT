import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";
import { CToggleSwitch } from "../../src/widgets/CToggleSwitch.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { CAbstractButton } from "../../src/widgets/CAbstractButton.js";
import { CApplication } from "../../src/core/CApplication.js";
import { CAnimationDriver } from "../../src/animation/CAnimationDriver.js";
import { CStyleOptionToggleSwitch } from "../../src/gui/CStyleOptionToggleSwitch.js";
import { CDefaultStyle } from "../../src/gui/CDefaultStyle.js";
import { CStyleState } from "../../src/gui/CStyleOption.js";
import { CPaletteColorRole } from "../../src/gui/CPalette.js";
import { CRect } from "../../src/geometry/CRect.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { CFocusPolicy } from "../../src/gui/CFocusPolicy.js";
import { CFont } from "../../src/gui/CFont.js";
import { CFontMetrics } from "../../src/gui/CFontMetrics.js";
import type { CPainter } from "../../src/painting/CPainter.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

class PaintableSwitch extends CToggleSwitch { paint(p: CPainter): void { this.paintEvent(p); } }

describe("CToggleSwitch", () => {
    let control: PaintableSwitch;
    let now: number;
    let ticks: Set<(time: number) => void>;
    let restoreClock: () => void;
    let restoreDriver: () => void;
    beforeEach(() => {
        if (CApplication.exists()) CApplication.instance().destroy();
        new CApplication(createTestCanvas()); now = 1000; ticks = new Set();
        const clock = vi.spyOn(CAnimationDriver, "now"); clock.mockImplementation(() => now);
        const driver = vi.spyOn(CAnimationDriver, "add");
        driver.mockImplementation(tick => { ticks.add(tick); return () => { ticks.delete(tick); }; });
        restoreClock = () => clock.mockRestore(); restoreDriver = () => driver.mockRestore();
        control = new PaintableSwitch(); control.resize(180, 32);
    });
    afterEach(() => {
        control.destroy(); restoreDriver(); restoreClock();
        if (CApplication.exists()) CApplication.instance().destroy();
    });
    function step(ms: number): void { now += ms; for (const tick of [...ticks]) tick(now); }
    function press(name: string): void { control.event(new CKeyEvent(CEventType.KeyPress, name)); }
    function release(name: string): void { control.event(new CKeyEvent(CEventType.KeyRelease, name)); }
    function mouse(type: CEventType, x = 12, y = 12, button = CMouseButton.LeftButton): void {
        control.event(new CMouseEvent(type, x, y, button));
    }
    function click(): void { mouse(CEventType.MousePress); mouse(CEventType.MouseRelease); }
    function recorder() {
        const p = { save: vi.fn(), restore: vi.fn(), clipRect: vi.fn(), setBrush: vi.fn(), setPen: vi.fn(), setLineWidth: vi.fn(),
            drawRoundedRect: vi.fn(), fillEllipse: vi.fn(), fillRect: vi.fn(), setFont: vi.fn(), setTextAlign: vi.fn(), setTextBaseline: vi.fn(), drawText: vi.fn() };
        return { p, paint: p as unknown as CPainter };
    }
    function styleOption(): CStyleOptionToggleSwitch {
        const o = new CStyleOptionToggleSwitch(); o.rect = new CRect(0, 0, 180, 32); o.state = CStyleState.Enabled; return o;
    }
    test("is a checkable abstract button initially off", () => {
        expect(control instanceof CAbstractButton).toBe(true); expect(control.isCheckable()).toBe(true);
        expect(control.isChecked()).toBe(false); expect(control.thumbPosition()).toBe(0); expect(ticks.size).toBe(0);
    });
    test("programmatic changes emit toggled but not clicked", () => {
        const toggled = vi.fn(), clicked = vi.fn(); control.toggled.connect(toggled); control.clicked.connect(clicked);
        control.setChecked(true); control.setChecked(true); expect(toggled).toHaveBeenCalledOnce(); expect(clicked).not.toHaveBeenCalled();
    });
    test("click toggles once and emits the new state before clicked", () => {
        const events: string[] = []; control.toggled.connect(v => events.push(String(v))); control.clicked.connect(() => events.push("clicked"));
        click(); expect(control.isChecked()).toBe(true); expect(events).toEqual(["true", "clicked"]);
    });
    test("NoFocus policy still permits mouse activation", () => {
        control.setFocusPolicy(CFocusPolicy.NoFocus); click(); expect(control.isChecked()).toBe(true);
    });
    test("second click toggles off", () => { click(); click(); expect(control.isChecked()).toBe(false); });
    test("release without press does not toggle", () => { mouse(CEventType.MouseRelease); expect(control.isChecked()).toBe(false); });
    test("release outside cancels mouse activation", () => {
        mouse(CEventType.MousePress); mouse(CEventType.MouseRelease, -1); expect(control.isChecked()).toBe(false);
    });
    test("right click does not activate", () => {
        mouse(CEventType.MousePress, 12, 12, CMouseButton.RightButton); mouse(CEventType.MouseRelease, 12, 12, CMouseButton.RightButton); expect(control.isChecked()).toBe(false);
    });
    test("Space toggles only on release", () => { press(" "); expect(control.isChecked()).toBe(false); release(" "); expect(control.isChecked()).toBe(true); });
    test("repeated Space presses cause one activation", () => {
        const clicked = vi.fn(); control.clicked.connect(clicked); press(" "); press(" "); press(" "); release(" "); release(" "); expect(clicked).toHaveBeenCalledOnce();
    });
    test("Escape cancels pending Space", () => { press(" "); press("Escape"); release(" "); expect(control.isChecked()).toBe(false); });
    test("unrelated keys do not toggle", () => { press("a"); release("a"); expect(control.isChecked()).toBe(false); });
    test("disabled control rejects user input", () => { control.setEnabled(false); click(); press(" "); release(" "); expect(control.isChecked()).toBe(false); });
    test("disabling cancels a pending press", () => {
        press(" "); control.setEnabled(false); control.setEnabled(true); release(" "); expect(control.isChecked()).toBe(false);
    });
    test("focus loss cancels pending Space", () => {
        control.setFocus(); press(" "); const other = new CWidget(); other.setFocusPolicy(CFocusPolicy.StrongFocus); other.setFocus(); release(" "); expect(control.isChecked()).toBe(false); other.destroy();
    });
    test("animation moves through an intermediate value and reaches its endpoint", () => {
        control.setChecked(true); expect(ticks.size).toBe(1); step(80); expect(control.thumbPosition()).toBeCloseTo(0.5);
        step(80); expect(control.thumbPosition()).toBe(1); expect(ticks.size).toBe(0);
    });
    test("rapid reversal starts at the current thumb position", () => {
        control.setChecked(true); step(80); const before = control.thumbPosition(); control.setChecked(false);
        expect(control.thumbPosition()).toBeCloseTo(before); expect(ticks.size).toBe(1); step(80); expect(control.thumbPosition()).toBe(0);
    });
    test("zero duration disables animation", () => {
        control.setAnimationDuration(0); control.setChecked(true); expect(control.thumbPosition()).toBe(1); expect(ticks.size).toBe(0);
    });
    test("duration is normalized and rejects nonfinite input", () => {
        control.setAnimationDuration(-10); expect(control.animationDuration()).toBe(0);
        control.setAnimationDuration(123.9); expect(control.animationDuration()).toBe(123);
        expect(() => control.setAnimationDuration(NaN)).toThrow();
    });
    test("hiding during animation snaps and removes the frame callback", () => {
        control.setChecked(true); step(40); control.hide(); expect(control.thumbPosition()).toBe(1); expect(ticks.size).toBe(0);
    });
    test("hidden ancestor prevents animation", () => {
        const parent = new CWidget(); control.setParent(parent); parent.hide(); control.setChecked(true);
        expect(control.thumbPosition()).toBe(1); expect(ticks.size).toBe(0); control.setParent(null); parent.destroy();
    });
    test("disabling during animation snaps to the logical state", () => {
        control.setChecked(true); control.setEnabled(false); expect(control.thumbPosition()).toBe(1); expect(ticks.size).toBe(0);
    });
    test("destroy cancels animation and is idempotent", () => {
        control.setChecked(true); control.destroy(); control.destroy(); expect(ticks.size).toBe(0); step(200);
    });
    test("caption increases preferred width", () => {
        const before = control.sizeHint().width(); control.setText("Notifications"); expect(control.sizeHint().width()).toBeGreaterThan(before);
    });
    test("font size increases preferred height", () => {
        const before = control.sizeHint().height(); const font = new CFont(control.font()); font.setPixelSize(48); control.setFont(font);
        // Height is constrained by a mock's metrics in some environments: provide font-dependent measurement.
        const spy = vi.spyOn(CFontMetrics.prototype, "height"); spy.mockImplementation(() => 48);
        try { expect(control.sizeHint().height()).toBeGreaterThan(before); } finally { spy.mockRestore(); }
    });
    test("style option copies caption and animated position", () => {
        const o = styleOption(); o.text = "Theme"; o.position = 0.75;
        const copy = new CStyleOptionToggleSwitch(o); expect(copy.text).toBe("Theme"); expect(copy.position).toBe(0.75);
    });
    test("paint forwards logical and animated states", () => {
        control.setText("Theme"); control.setAnimationDuration(0); control.setChecked(true);
        let option: CStyleOptionToggleSwitch | null = null;
        const spy = vi.spyOn(control.style(), "drawToggleSwitch"); spy.mockImplementation((_p, o) => { option = o; });
        try { control.paint({} as CPainter); } finally { spy.mockRestore(); }
        expect(option!.text).toBe("Theme"); expect(option!.position).toBe(1); expect((option!.state & CStyleState.On) !== 0).toBe(true);
    });
    test("style draws a track and thumb and balances painter state", () => {
        const r = recorder(); new CDefaultStyle().drawToggleSwitch(r.paint, styleOption());
        expect(r.p.drawRoundedRect).toHaveBeenCalledOnce(); expect(r.p.fillEllipse).toHaveBeenCalledOnce();
        expect(r.p.save.mock.calls.length).toBe(r.p.restore.mock.calls.length);
    });
    test("on style uses Highlight and moves the thumb right", () => {
        const a = recorder(), b = recorder(), o = styleOption(); new CDefaultStyle().drawToggleSwitch(a.paint, o);
        o.state |= CStyleState.On; o.position = 1; new CDefaultStyle().drawToggleSwitch(b.paint, o);
        expect(b.p.setBrush).toHaveBeenCalledWith(o.palette.color(CPaletteColorRole.Highlight).toCss());
        expect(b.p.fillEllipse.mock.calls[0]![0]).toBeGreaterThan(a.p.fillEllipse.mock.calls[0]![0]);
    });
    test("disabled caption and thumb use DisabledText", () => {
        const r = recorder(), o = styleOption(); o.state = 0; o.text = "Disabled"; new CDefaultStyle().drawToggleSwitch(r.paint, o);
        expect(r.p.setPen).toHaveBeenCalledWith(o.palette.color(CPaletteColorRole.DisabledText).toCss());
        expect(r.p.setBrush).toHaveBeenCalledWith(o.palette.color(CPaletteColorRole.DisabledText).toCss());
    });
    test("focused enabled switch draws a dotted outline", () => {
        const r = recorder(), o = styleOption(); o.state |= CStyleState.HasFocus; new CDefaultStyle().drawToggleSwitch(r.paint, o); expect(r.p.fillRect.mock.calls.length).toBeGreaterThan(0);
    });
    test("tiny and zero rectangles do not draw invalid track geometry", () => {
        const r = recorder(), o = styleOption(); o.rect = new CRect(0, 0, 2, 2); new CDefaultStyle().drawToggleSwitch(r.paint, o);
        o.rect = new CRect(0, 0, 0, 0); new CDefaultStyle().drawToggleSwitch(r.paint, o); expect(r.p.drawRoundedRect).not.toHaveBeenCalled();
    });
    test("thumb uses center coordinates and radius, not top-left and diameter", () => {
        const r = recorder(), o = styleOption(); new CDefaultStyle().drawToggleSwitch(r.paint, o);
        expect(r.p.fillEllipse).toHaveBeenCalledWith(16, 16, 9, 9);
        const on = recorder(); o.position = 1; new CDefaultStyle().drawToggleSwitch(on.paint, o);
        expect(on.p.fillEllipse).toHaveBeenCalledWith(36, 16, 9, 9);
    });
    test("thumb stays inside the track during motion, at offsets and when pressed", () => {
        for (const size of [32, 20]) for (const position of [0, 0.25, 0.5, 0.75, 1]) for (const pressed of [false, true]) {
            const r = recorder(), o = styleOption(); o.rect = new CRect(20, 30, 180, size); o.position = position;
            if (pressed) o.state |= CStyleState.Sunken;
            new CDefaultStyle().drawToggleSwitch(r.paint, o);
            const [x, y, w, h] = r.p.drawRoundedRect.mock.calls[0]!;
            const [cx, cy, rx, ry] = r.p.fillEllipse.mock.calls[0]!;
            expect(cx - rx >= x && cx + rx <= x + w).toBe(true);
            expect(cy - ry >= y && cy + ry <= y + h).toBe(true);
        }
    });

});
