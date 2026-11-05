import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";
import { CBusyIndicator } from "../../src/widgets/CBusyIndicator.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { CApplication } from "../../src/core/CApplication.js";
import { CAnimationDriver } from "../../src/animation/CAnimationDriver.js";
import { CStyleOptionBusyIndicator } from "../../src/gui/CStyleOptionBusyIndicator.js";
import { CDefaultStyle } from "../../src/gui/CDefaultStyle.js";
import { CStyleState } from "../../src/gui/CStyleOption.js";
import { CPaletteColorRole } from "../../src/gui/CPalette.js";
import { CRect } from "../../src/geometry/CRect.js";
import type { CPainter } from "../../src/painting/CPainter.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

class PaintableBusy extends CBusyIndicator { paint(p: CPainter): void { this.paintEvent(p); } }

describe("CBusyIndicator", () => {
    let busy: PaintableBusy;
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
        busy = new PaintableBusy(); busy.resize(32, 32);
    });
    afterEach(() => {
        busy.destroy(); restoreDriver(); restoreClock();
        if (CApplication.exists()) CApplication.instance().destroy();
    });
    function step(ms: number): void { now += ms; for (const tick of [...ticks]) tick(now); }
    function option(): CStyleOptionBusyIndicator {
        let data: CStyleOptionBusyIndicator | null = null;
        const draw = vi.spyOn(busy.style(), "drawBusyIndicator"); draw.mockImplementation((_p, o) => { data = o; });
        try { busy.paint({} as CPainter); } finally { draw.mockRestore(); }
        return data!;
    }
    function painter() {
        const p = { save: vi.fn(), restore: vi.fn(), clipRect: vi.fn(), setLineWidth: vi.fn(), setPen: vi.fn(), drawLine: vi.fn() };
        return { p, paint: p as unknown as CPainter };
    }
    test("defaults to stopped, 32 pixels and a one-second cycle", () => {
        expect(busy.isRunning()).toBe(false); expect(busy.isAnimating()).toBe(false);
        expect(busy.indicatorSize()).toBe(32); expect(busy.cycleDuration()).toBe(1000); expect(ticks.size).toBe(0);
    });
    test("start registers one animation and stop removes it", () => {
        busy.start(); busy.start(); expect(ticks.size).toBe(1); expect(busy.isAnimating()).toBe(true);
        busy.stop(); expect(ticks.size).toBe(0); expect(busy.isRunning()).toBe(false); expect(busy.angle()).toBe(0);
    });
    test("runningChanged emits only when the requested state changes", () => {
        const changed = vi.fn(); busy.runningChanged.connect(changed);
        busy.start(); busy.start(); busy.stop(); busy.stop();
        expect(changed).toHaveBeenCalledTimes(2); expect(changed).toHaveBeenCalledWith(true); expect(changed).toHaveBeenCalledWith(false);
    });
    test("shared-driver frames advance rotation", () => { busy.start(); step(250); expect(busy.angle()).toBeCloseTo(90); });
    test("endless animation continues across cycles", () => {
        busy.start(); step(1250); expect(busy.angle()).toBeCloseTo(90); expect(busy.isAnimating()).toBe(true);
    });
    test("hidden indicators do not register frames until shown", () => {
        busy.hide(); busy.start(); expect(busy.isRunning()).toBe(true); expect(ticks.size).toBe(0);
        busy.show(); expect(ticks.size).toBe(1);
    });
    test("hide suspends and show resumes the same phase", () => {
        busy.start(); step(250); busy.hide(); expect(busy.isAnimating()).toBe(false); expect(ticks.size).toBe(0);
        step(1000); expect(busy.angle()).toBeCloseTo(90); busy.show(); step(250); expect(busy.angle()).toBeCloseTo(180);
    });
    test("direct setVisible suspends and resumes", () => {
        busy.start(); busy.setVisible(false); expect(ticks.size).toBe(0); busy.setVisible(true); expect(ticks.size).toBe(1);
    });
    test("hiding an ancestor suspends immediately", () => {
        const root = new CWidget(); const panel = new CWidget(root); busy.setParent(panel); busy.start();
        root.hide(); expect(ticks.size).toBe(0); expect(busy.isRunning()).toBe(true);
        root.show(); expect(ticks.size).toBe(1); busy.setParent(null); root.destroy();
    });
    test("a hidden child stays suspended when its parent is shown", () => {
        const root = new CWidget(); busy.setParent(root); busy.hide(); busy.start(); root.hide(); root.show();
        expect(ticks.size).toBe(0); busy.setParent(null); root.destroy();
    });
    test("starting under an already hidden parent does not schedule", () => {
        const root = new CWidget(); root.hide(); busy.setParent(root); busy.start(); expect(ticks.size).toBe(0);
        root.show(); expect(ticks.size).toBe(1); busy.setParent(null); root.destroy();
    });
    test("reparenting between visible and hidden roots updates scheduling", () => {
        const root = new CWidget(); root.hide(); busy.start(); busy.setParent(root); expect(ticks.size).toBe(0);
        busy.setParent(null); expect(ticks.size).toBe(1); root.destroy();
    });
    test("reparenting a container updates nested indicators", () => {
        const hidden = new CWidget(); hidden.hide(); const panel = new CWidget(); busy.setParent(panel); busy.start();
        panel.setParent(hidden); expect(ticks.size).toBe(0); panel.setParent(null); expect(ticks.size).toBe(1);
        busy.setParent(null); panel.destroy(); hidden.destroy();
    });
    test("stop while hidden prevents automatic resume", () => {
        busy.start(); busy.hide(); busy.stop(); busy.show(); expect(ticks.size).toBe(0); expect(busy.isRunning()).toBe(false);
    });
    test("changing cycle duration controls rotation speed", () => {
        busy.setCycleDuration(2000); busy.start(); step(500); expect(busy.angle()).toBeCloseTo(90);
    });
    test("changing duration preserves the current fractional phase", () => {
        busy.start(); step(250); busy.setCycleDuration(2000); expect(busy.angle()).toBeCloseTo(90);
        step(500); expect(busy.angle()).toBeCloseTo(180);
    });
    test("changing duration while suspended does not resume", () => {
        busy.start(); step(250); busy.hide(); busy.setCycleDuration(2000);
        expect(ticks.size).toBe(0); expect(busy.angle()).toBeCloseTo(90);
    });
    test("indicator size updates both preferred dimensions", () => {
        busy.setIndicatorSize(48); expect(busy.sizeHint().width()).toBe(48); expect(busy.sizeHint().height()).toBe(48);
    });
    test("normalizes duration and size", () => {
        busy.setCycleDuration(0); expect(busy.cycleDuration()).toBe(16);
        busy.setCycleDuration(100000); expect(busy.cycleDuration()).toBe(60000);
        busy.setIndicatorSize(0); expect(busy.indicatorSize()).toBe(8);
        busy.setIndicatorSize(999); expect(busy.indicatorSize()).toBe(256);
    });
    test("rejects non-finite settings", () => {
        expect(() => busy.setCycleDuration(NaN)).toThrow(RangeError);
        expect(() => busy.setIndicatorSize(Infinity)).toThrow(RangeError);
    });
    test("destroy detaches the animation and prevents restart", () => {
        busy.start(); busy.destroy(); expect(ticks.size).toBe(0); busy.start(); expect(ticks.size).toBe(0);
    });
    test("destroying a parent detaches its nested indicator", () => {
        const root = new CWidget(); busy.setParent(root); busy.start(); root.destroy(); expect(ticks.size).toBe(0);
    });
    test("visibility notifications skip non-widget animation children", () => {
        busy.start(); busy.hide(); busy.show(); expect(ticks.size).toBe(1);
    });
    test("painting passes running state and current angle", () => {
        busy.start(); step(250); const data = option(); expect(data.running).toBe(true); expect(data.angle).toBeCloseTo(90);
    });
    test("style options copy animation state", () => {
        busy.start(); step(250); const copy = new CStyleOptionBusyIndicator(option());
        expect(copy.running).toBe(true); expect(copy.angle).toBeCloseTo(90);
    });
    test("stopped indicators draw nothing", () => {
        const r = painter(); new CDefaultStyle().drawBusyIndicator(r.paint, option()); expect(r.p.drawLine).not.toHaveBeenCalled();
    });
    test("running style draws twelve spokes with balanced painter state", () => {
        busy.start(); const r = painter(); new CDefaultStyle().drawBusyIndicator(r.paint, option());
        expect(r.p.drawLine).toHaveBeenCalledTimes(12); expect(r.p.save).toHaveBeenCalledOnce(); expect(r.p.restore).toHaveBeenCalledOnce();
    });
    test("spokes use fading alpha without modifying the palette", () => {
        busy.start(); const data = option(), r = painter(); const before = data.palette.color(CPaletteColorRole.Highlight).toCss();
        new CDefaultStyle().drawBusyIndicator(r.paint, data);
        expect(r.p.setPen.mock.calls[0]![0]).not.toBe(r.p.setPen.mock.calls[11]![0]);
        expect(data.palette.color(CPaletteColorRole.Highlight).toCss()).toBe(before);
    });
    test("disabled rendering uses DisabledText", () => {
        busy.start(); const data = option(); data.state &= ~CStyleState.Enabled;
        const r = painter(); new CDefaultStyle().drawBusyIndicator(r.paint, data);
        expect(r.p.setPen).toHaveBeenCalledWith(data.palette.color(CPaletteColorRole.DisabledText).toCss());
    });
    test("offset rectangles keep all spoke endpoints within bounds", () => {
        busy.start(); const data = option(); data.rect = new CRect(20, 30, 80, 40);
        const r = painter(); new CDefaultStyle().drawBusyIndicator(r.paint, data);
        for (const line of r.p.drawLine.mock.calls) {
            expect(line[0]).toBeGreaterThanOrEqual(20); expect(line[0]).toBeLessThanOrEqual(100);
            expect(line[1]).toBeGreaterThanOrEqual(30); expect(line[1]).toBeLessThanOrEqual(70);
            expect(line[2]).toBeGreaterThanOrEqual(20); expect(line[2]).toBeLessThanOrEqual(100);
            expect(line[3]).toBeGreaterThanOrEqual(30); expect(line[3]).toBeLessThanOrEqual(70);
        }
    });
    test("tiny rectangles do not draw invalid spokes", () => {
        busy.start(); const data = option(); data.rect = new CRect(0, 0, 2, 2);
        const r = painter(); new CDefaultStyle().drawBusyIndicator(r.paint, data); expect(r.p.drawLine).not.toHaveBeenCalled();
    });
});
