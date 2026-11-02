import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CObject } from "../../src/core/CObject.js";
import { CAbstractAnimation, CAnimationState } from "../../src/animation/CAbstractAnimation.js";
import { CVariantAnimation } from "../../src/animation/CVariantAnimation.js";
import { CEasingCurve, CEasingCurveType } from "../../src/animation/CEasingCurve.js";

describe("CEasingCurve", () => {
    test("linear is the default", () => {
        const curve = new CEasingCurve(); expect(curve.type()).toBe(CEasingCurveType.Linear);
        expect(curve.valueForProgress(0.3)).toBe(0.3);
    });
    test("all curves retain the endpoints and clamp input", () => {
        for (const type of [CEasingCurveType.Linear, CEasingCurveType.InQuad, CEasingCurveType.OutQuad,
            CEasingCurveType.InOutQuad, CEasingCurveType.OutCubic]) {
            const curve = new CEasingCurve(type);
            expect(curve.valueForProgress(0)).toBe(0); expect(curve.valueForProgress(1)).toBe(1);
            expect(curve.valueForProgress(-1)).toBe(0); expect(curve.valueForProgress(2)).toBe(1);
            expect(curve.valueForProgress(NaN)).toBe(0);
        }
    });
    test("quadratic and cubic curves have the expected intermediate values", () => {
        expect(new CEasingCurve(CEasingCurveType.InQuad).valueForProgress(0.5)).toBe(0.25);
        expect(new CEasingCurve(CEasingCurveType.OutQuad).valueForProgress(0.5)).toBe(0.75);
        expect(new CEasingCurve(CEasingCurveType.OutCubic).valueForProgress(0.5)).toBe(0.875);
        const curve = new CEasingCurve(CEasingCurveType.InOutQuad);
        expect(curve.valueForProgress(0.25)).toBe(0.125);
        expect(curve.valueForProgress(0.5)).toBe(0.5);
        expect(curve.valueForProgress(0.75)).toBe(0.875);
    });
    test("curves are monotonic over the unit interval", () => {
        for (const type of [CEasingCurveType.Linear, CEasingCurveType.InQuad, CEasingCurveType.OutQuad,
            CEasingCurveType.InOutQuad, CEasingCurveType.OutCubic]) {
            const curve = new CEasingCurve(type); let previous = 0;
            for (let i = 0; i <= 100; ++i) {
                const value = curve.valueForProgress(i / 100);
                expect(value).toBeGreaterThanOrEqual(previous); previous = value;
            }
        }
    });
    test("unknown curve types are rejected", () => {
        expect(() => new CEasingCurve(999 as CEasingCurveType)).toThrow(RangeError);
    });
});

describe("CVariantAnimation", () => {
    let frames: Map<number, FrameRequestCallback>;
    let next: number, now: number;
    let oldRequest: PropertyDescriptor | undefined, oldCancel: PropertyDescriptor | undefined;
    let restoreClock: () => void;
    let animations: CAbstractAnimation[];
    beforeEach(() => {
        frames = new Map(); next = 0; now = 0; animations = [];
        const clock = vi.spyOn(performance, "now").mockImplementation(() => now);
        restoreClock = () => clock.mockRestore();
        oldRequest = Object.getOwnPropertyDescriptor(globalThis, "requestAnimationFrame");
        oldCancel = Object.getOwnPropertyDescriptor(globalThis, "cancelAnimationFrame");
        Object.defineProperty(globalThis, "requestAnimationFrame", { configurable: true, writable: true,
            value: (callback: FrameRequestCallback) => { frames.set(++next, callback); return next; } });
        Object.defineProperty(globalThis, "cancelAnimationFrame", { configurable: true, writable: true,
            value: (id: number) => { frames.delete(id); } });
    });
    afterEach(() => {
        for (const animation of animations) animation.destroy();
        expect(frames.size).toBe(0);
        restoreClock();
        if (oldRequest) Object.defineProperty(globalThis, "requestAnimationFrame", oldRequest);
        else Reflect.deleteProperty(globalThis, "requestAnimationFrame");
        if (oldCancel) Object.defineProperty(globalThis, "cancelAnimationFrame", oldCancel);
        else Reflect.deleteProperty(globalThis, "cancelAnimationFrame");
    });
    function tick(time: number): void {
        now = time; const pending = [...frames.values()]; frames.clear();
        for (const callback of pending) callback(time);
    }
    function make(duration = 100): CVariantAnimation {
        const animation = new CVariantAnimation(); animations.push(animation);
        animation.setDuration(duration); return animation;
    }
    test("defaults are stopped, linear, zero to one in 250 milliseconds", () => {
        const a = new CVariantAnimation(); animations.push(a);
        expect(a.state()).toBe(CAnimationState.Stopped); expect(a.duration()).toBe(250);
        expect(a.currentTime()).toBe(0); expect(a.currentValue()).toBe(0);
        expect(a.startValue()).toBe(0); expect(a.endValue()).toBe(1);
        expect(a.easingCurve().type()).toBe(CEasingCurveType.Linear);
    });
    test("interpolates numeric values and finishes exactly once", () => {
        const a = make(); a.setStartValue(20); a.setEndValue(60);
        const finished = vi.fn(); a.finished.connect(finished); a.start();
        expect(a.currentValue()).toBe(20); tick(50); expect(a.currentValue()).toBe(40);
        tick(100); expect(a.currentValue()).toBe(60); expect(a.currentTime()).toBe(100);
        expect(a.state()).toBe(CAnimationState.Stopped); expect(finished).toHaveBeenCalledOnce();
        tick(200); expect(finished).toHaveBeenCalledOnce(); expect(frames.size).toBe(0);
    });
    test("supports descending endpoints", () => {
        const a = make(); a.setStartValue(10); a.setEndValue(-10); a.start();
        tick(75); expect(a.currentValue()).toBe(-5);
    });
    test("easing affects values, not the elapsed time", () => {
        const a = make(); a.setEasingCurve(CEasingCurveType.InQuad); a.start(); tick(50);
        expect(a.currentTime()).toBe(50); expect(a.currentValue()).toBe(0.25);
    });
    test("stores and returns independent easing curve copies", () => {
        const a = make(), curve = new CEasingCurve(CEasingCurveType.OutQuad);
        a.setEasingCurve(curve); curve.setType(CEasingCurveType.Linear);
        a.easingCurve().setType(CEasingCurveType.InQuad);
        expect(a.easingCurve().type()).toBe(CEasingCurveType.OutQuad);
    });
    test("does not emit unchanged values on repeated frames", () => {
        const a = make(), changed = vi.fn(); a.valueChanged.connect(changed); a.start();
        tick(50); tick(50); expect(changed).toHaveBeenCalledOnce();
        expect(changed).toHaveBeenCalledWith(0.5);
    });
    test("state changes include new and previous states", () => {
        const a = make(), states: CAnimationState[][] = [];
        a.stateChanged.connect((state, previous) => states.push([state, previous]));
        a.start(); a.pause(); a.resume(); a.stop();
        expect(states).toEqual([[CAnimationState.Running, CAnimationState.Stopped],
            [CAnimationState.Paused, CAnimationState.Running], [CAnimationState.Running, CAnimationState.Paused],
            [CAnimationState.Stopped, CAnimationState.Running]]);
    });
    test("pause releases the frame and resume excludes paused time", () => {
        const a = make(); a.start(); tick(40); a.pause();
        expect(frames.size).toBe(0); tick(1040); expect(a.currentValue()).toBe(0.4);
        a.resume(); tick(1070); expect(a.currentValue()).toBe(0.7);
        tick(1100); expect(a.currentValue()).toBe(1);
    });
    test("pause and resume are harmless outside their applicable states", () => {
        const a = make(); a.pause(); a.resume(); expect(a.state()).toBe(CAnimationState.Stopped);
        expect(frames.size).toBe(0); a.start(); a.resume(); expect(frames.size).toBe(1);
    });
    test("stop retains the value and does not emit finished", () => {
        const a = make(), finished = vi.fn(); a.finished.connect(finished);
        a.start(); tick(25); a.stop(); tick(1000);
        expect(a.currentValue()).toBe(0.25); expect(a.currentTime()).toBe(25);
        expect(finished).not.toHaveBeenCalled(); expect(frames.size).toBe(0);
    });
    test("start restarts a running animation from its initial value", () => {
        const a = make(); a.start(); tick(75); a.start();
        expect(a.currentValue()).toBe(0); expect(frames.size).toBe(1);
        tick(100); expect(a.currentValue()).toBe(0.25);
    });
    test("start restarts a paused animation", () => {
        const a = make(); a.start(); tick(75); a.pause(); a.start();
        expect(a.currentTime()).toBe(0); tick(125); expect(a.currentValue()).toBe(0.5);
    });
    test("a long frame clamps to the exact endpoint", () => {
        const a = make(); a.start(); tick(100000);
        expect(a.currentValue()).toBe(1); expect(a.currentTime()).toBe(100); expect(frames.size).toBe(0);
    });
    test("a decreasing frame timestamp never reverses progress", () => {
        const a = make(); a.start(); tick(50); tick(40); expect(a.currentTime()).toBe(50);
    });
    test("zero duration finishes synchronously without requesting a frame", () => {
        const a = make(0), finished = vi.fn(); a.finished.connect(finished); a.start();
        expect(a.currentValue()).toBe(1); expect(a.state()).toBe(CAnimationState.Stopped);
        expect(finished).toHaveBeenCalledOnce(); expect(frames.size).toBe(0);
    });
    test("invalid durations and endpoint values are rejected", () => {
        const a = make();
        for (const value of [-1, NaN, Infinity]) expect(() => a.setDuration(value)).toThrow(RangeError);
        for (const value of [NaN, Infinity, -Infinity]) {
            expect(() => a.setStartValue(value)).toThrow(RangeError);
            expect(() => a.setEndValue(value)).toThrow(RangeError);
            expect(() => a.setCurrentTime(value)).toThrow(RangeError);
        }
    });
    test("seeking clamps and updates a stopped animation without starting it", () => {
        const a = make(), finished = vi.fn(); a.finished.connect(finished);
        a.setCurrentTime(50); expect(a.currentValue()).toBe(0.5);
        a.setCurrentTime(-10); expect(a.currentValue()).toBe(0);
        a.setCurrentTime(200); expect(a.currentValue()).toBe(1);
        expect(a.state()).toBe(CAnimationState.Stopped); expect(frames.size).toBe(0);
        expect(finished).not.toHaveBeenCalled();
    });
    test("seeking a running animation reanchors its clock", () => {
        const a = make(); a.start(); tick(20); a.setCurrentTime(60); tick(40);
        expect(a.currentTime()).toBe(80); expect(a.currentValue()).toBe(0.8);
    });
    test("seeking a running animation to its end finishes it", () => {
        const a = make(), finished = vi.fn(); a.finished.connect(finished); a.start(); a.setCurrentTime(100);
        expect(finished).toHaveBeenCalledOnce(); expect(frames.size).toBe(0);
    });
    test("shortening duration past the current time finishes a running animation", () => {
        const a = make(), finished = vi.fn(); a.finished.connect(finished); a.start(); tick(60); a.setDuration(30);
        expect(a.currentTime()).toBe(30); expect(a.currentValue()).toBe(1);
        expect(finished).toHaveBeenCalledOnce(); expect(frames.size).toBe(0);
    });
    test("all running animations share one scheduled frame", () => {
        const a = make(100), b = make(200); a.start(); b.start();
        expect(frames.size).toBe(1); tick(50);
        expect(a.currentValue()).toBe(0.5); expect(b.currentValue()).toBe(0.25); expect(frames.size).toBe(1);
        tick(100); expect(a.state()).toBe(CAnimationState.Stopped); expect(frames.size).toBe(1);
        tick(200); expect(b.currentValue()).toBe(1); expect(frames.size).toBe(0);
    });
    test("stopping one animation does not cancel another", () => {
        const a = make(), b = make(); a.start(); b.start(); a.stop();
        expect(frames.size).toBe(1); tick(50); expect(b.currentValue()).toBe(0.5);
    });
    test("destroy cancels the final frame and prevents reuse", () => {
        const a = make(), finished = vi.fn(); a.finished.connect(finished);
        a.start(); a.destroy(); a.start(); a.resume(); a.destroy();
        expect(a.state()).toBe(CAnimationState.Stopped); expect(frames.size).toBe(0);
        expect(finished).not.toHaveBeenCalled();
    });
    test("destroying a CObject parent destroys its animations", () => {
        const parent = new CObject(), a = new CVariantAnimation(parent); animations.push(a);
        a.start(); parent.destroy(); expect(frames.size).toBe(0); expect(a.parent()).toBeNull();
    });
    test("a canceled callback cannot advance a restarted animation", () => {
        const a = make(); a.start(); const stale = [...frames.values()][0]!;
        a.stop(); a.start(); stale(1000);
        expect(a.currentValue()).toBe(0); expect(a.state()).toBe(CAnimationState.Running);
        expect(frames.size).toBe(1);
    });
    test("a valueChanged handler may stop at the endpoint without finished", () => {
        const a = make(), finished = vi.fn(); a.finished.connect(finished);
        a.valueChanged.connect(value => { if (value === 1) a.stop(); });
        a.start(); tick(100); expect(finished).not.toHaveBeenCalled(); expect(frames.size).toBe(0);
    });
    test("a valueChanged handler may restart at the endpoint", () => {
        const a = make(), finished = vi.fn(); a.finished.connect(finished);
        a.valueChanged.connect(value => { if (value === 1) a.start(); });
        a.start(); tick(100); expect(a.currentValue()).toBe(0); expect(a.state()).toBe(CAnimationState.Running);
        expect(finished).not.toHaveBeenCalled(); expect(frames.size).toBe(1);
        tick(150); expect(a.currentValue()).toBe(0.5);
    });
    test("a finished handler may restart the same animation", () => {
        const a = make(); let completions = 0;
        a.finished.connect(() => { if (++completions === 1) a.start(); });
        a.start(); tick(100); expect(a.state()).toBe(CAnimationState.Running); expect(frames.size).toBe(1);
        tick(200); expect(completions).toBe(2); expect(frames.size).toBe(0);
    });
    test("a handler can stop an animation awaiting the same shared frame", () => {
        const a = make(), b = make(); a.valueChanged.connect(() => b.stop());
        a.start(); b.start(); tick(50); expect(b.currentValue()).toBe(0);
    });
    test("a handler can add an animation without advancing it in the current frame", () => {
        const a = make(), b = make(); a.valueChanged.connect(() => b.start());
        a.start(); tick(50); expect(b.currentValue()).toBe(0); expect(frames.size).toBe(1);
    });
    test("a stateChanged handler can cancel start before any frame is scheduled", () => {
        const a = make(); a.stateChanged.connect(state => { if (state === CAnimationState.Running) a.stop(); });
        a.start(); expect(a.state()).toBe(CAnimationState.Stopped); expect(frames.size).toBe(0);
    });
    test("without requestAnimationFrame the driver uses a cancelable timeout", () => {
        Reflect.deleteProperty(globalThis, "requestAnimationFrame");
        Reflect.deleteProperty(globalThis, "cancelAnimationFrame");
        const callbacks: Array<() => void> = [];
        const timeout = vi.spyOn(globalThis, "setTimeout").mockImplementation(callback => {
            callbacks.push(() => { if (typeof callback === "function") callback(); });
            return 17 as unknown as ReturnType<typeof setTimeout>;
        });
        const clear = vi.spyOn(globalThis, "clearTimeout").mockImplementation(() => {});
        const a = make(), b = make();
        try {
            a.start(); b.start(); expect(timeout).toHaveBeenCalledOnce();
            now = 50; callbacks[0]!(); expect(a.currentValue()).toBe(0.5); expect(b.currentValue()).toBe(0.5);
            a.stop(); b.stop(); expect(clear).toHaveBeenCalledWith(17);
        } finally { a.destroy(); b.destroy(); timeout.mockRestore(); clear.mockRestore(); }
    });
    test("interpolation remains finite between opposite large endpoints", () => {
        const a = make(); a.setStartValue(-Number.MAX_VALUE); a.setEndValue(Number.MAX_VALUE);
        a.start(); tick(50); expect(a.currentValue()).toBe(0);
    });
});
