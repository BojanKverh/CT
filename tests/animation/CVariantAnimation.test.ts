import { CPoint } from "../../src/geometry/CPoint.js";
import { CSize } from "../../src/geometry/CSize.js";
import { CRect } from "../../src/geometry/CRect.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CObject } from "../../src/core/CObject.js";
import { CAbstractAnimation, CAnimationState, CAnimationDirection } from "../../src/animation/CAbstractAnimation.js";
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
    test("elastic curve settings survive both assignment and getter copies", () => {
        const a = make(), curve = new CEasingCurve(CEasingCurveType.OutElastic);
        curve.setOscillations(3); curve.setDamping(0); a.setEasingCurve(curve);
        curve.setOscillations(2); curve.setDamping(100);
        const copy = a.easingCurve(); expect(copy.oscillations()).toBe(3); expect(copy.damping()).toBe(0);
        copy.setOscillations(2); a.start(); tick(50); expect(a.currentValue()).toBeCloseTo(2);
    });
    test("elastic output overshoots ascending endpoints without ending the animation", () => {
        const a = make(), curve = new CEasingCurve(CEasingCurveType.OutElastic), done = vi.fn();
        curve.setOscillations(1); curve.setDamping(0); a.setEasingCurve(curve);
        a.setStartValue(10); a.setEndValue(20); a.finished.connect(done); a.start(); tick(50);
        expect(a.currentValue()).toBeCloseTo(30); expect(a.state()).toBe(CAnimationState.Running);
        expect(done).not.toHaveBeenCalled(); tick(100); expect(a.currentValue()).toBe(20); expect(done).toHaveBeenCalledOnce();
    });
    test("elastic output undershoots a descending endpoint", () => {
        const a = make(), curve = new CEasingCurve(CEasingCurveType.OutElastic);
        curve.setOscillations(1); curve.setDamping(0); a.setEasingCurve(curve);
        a.setStartValue(20); a.setEndValue(10); a.start(); tick(50); expect(a.currentValue()).toBeCloseTo(0);
        tick(100); expect(a.currentValue()).toBe(10);
    });
    test("elastic interpolation works with negative endpoints", () => {
        const a = make(), curve = new CEasingCurve(CEasingCurveType.OutElastic);
        curve.setOscillations(1); curve.setDamping(0); a.setEasingCurve(curve);
        a.setStartValue(-100); a.setEndValue(-50); a.start(); tick(50); expect(a.currentValue()).toBeCloseTo(0);
        tick(100); expect(a.currentValue()).toBe(-50);
    });
    test("assigning a modified getter copy changes the active curve", () => {
        const a = make(), curve = new CEasingCurve(CEasingCurveType.OutElastic);
        curve.setOscillations(1); curve.setDamping(0); a.setEasingCurve(curve); a.setCurrentTime(50);
        expect(a.currentValue()).toBeCloseTo(2);
        const changed = a.easingCurve(); changed.setOscillations(2); a.setEasingCurve(changed);
        expect(a.currentValue()).toBeCloseTo(0); expect(a.currentTime()).toBe(50);
    });
    test("enum assignment uses the default elastic parameters", () => {
        const a = make(); a.setEasingCurve(CEasingCurveType.OutElastic);
        expect(a.easingCurve().oscillations()).toBe(2.25); expect(a.easingCurve().damping()).toBe(6);
        a.start(); tick(25); expect(a.currentValue()).toBeGreaterThan(1);
    });
    test("bounce peaks do not finish the animation before its duration", () => {
        const a = make(), done = vi.fn(); a.setEasingCurve(CEasingCurveType.OutBounce); a.finished.connect(done);
        a.start(); tick(100 / 2.75); expect(a.currentValue()).toBeCloseTo(1);
        expect(a.state()).toBe(CAnimationState.Running); expect(done).not.toHaveBeenCalled();
        tick(100 * 1.5 / 2.75); expect(a.currentValue()).toBeCloseTo(0.75);
        tick(100); expect(a.currentValue()).toBe(1); expect(done).toHaveBeenCalledOnce();
    });
    test("bounce interpolates descending values and remains within their bounds", () => {
        const a = make(); a.setStartValue(20); a.setEndValue(10); a.setEasingCurve(CEasingCurveType.OutBounce); a.start();
        for (const time of [10, 30, 50, 70, 90, 100]) {
            tick(time); expect(a.currentValue()).toBeGreaterThanOrEqual(10); expect(a.currentValue()).toBeLessThan(20.001);
        }
        expect(a.currentValue()).toBe(10);
    });
    test("equal large endpoints remain finite even at elastic overshoot", () => {
        const a = make(), curve = new CEasingCurve(CEasingCurveType.OutElastic); curve.setOscillations(1); curve.setDamping(0);
        a.setStartValue(Number.MAX_VALUE); a.setEndValue(Number.MAX_VALUE); a.setEasingCurve(curve);
        a.start(); tick(50); expect(a.currentValue()).toBe(Number.MAX_VALUE);
    });
    test("elastic extrapolation avoids intermediate overflow for large finite values", () => {
        const a = make(), curve = new CEasingCurve(CEasingCurveType.OutElastic); curve.setOscillations(1); curve.setDamping(0);
        a.setStartValue(Number.MAX_VALUE); a.setEndValue(Number.MAX_VALUE * 0.75); a.setEasingCurve(curve);
        a.start(); tick(50); expect(Number.isFinite(a.currentValue())).toBe(true);
        expect(a.currentValue() / Number.MAX_VALUE).toBeCloseTo(0.5);
    });
    test("unrepresentable elastic extrapolation saturates at a finite limit", () => {
        const a = make(), curve = new CEasingCurve(CEasingCurveType.OutElastic); curve.setOscillations(1); curve.setDamping(0);
        a.setStartValue(-Number.MAX_VALUE); a.setEndValue(Number.MAX_VALUE); a.setEasingCurve(curve);
        a.start(); tick(50); expect(a.currentValue()).toBe(Number.MAX_VALUE);
    });
    test("elastic pause and resume retain the configured curve", () => {
        const a = make(), curve = new CEasingCurve(CEasingCurveType.OutElastic); curve.setOscillations(3); curve.setDamping(4);
        a.setEasingCurve(curve); a.start(); tick(25); const value = a.currentValue(); a.pause(); tick(1000);
        expect(a.currentValue()).toBe(value); a.resume(); tick(1075);
        expect(a.currentValue()).toBe(1); expect(a.easingCurve().oscillations()).toBe(3);
    });

});

describe("CEasingCurve elastic and bounce", () => {
    test("new enum members preserve all previous numeric values", () => {
        expect(CEasingCurveType.Linear).toBe(0); expect(CEasingCurveType.OutCubic).toBe(4);
        expect(CEasingCurveType.OutElastic).toBe(5); expect(CEasingCurveType.OutBounce).toBe(6);
    });
    test("elastic defaults match the demo's frequency and damping", () => {
        const curve = new CEasingCurve(CEasingCurveType.OutElastic);
        expect(curve.oscillations()).toBe(2.25); expect(curve.damping()).toBe(6);
    });
    test("both new curves preserve exact endpoints and clamp input time", () => {
        for (const type of [CEasingCurveType.OutElastic, CEasingCurveType.OutBounce]) {
            const curve = new CEasingCurve(type);
            for (const t of [0, -1, -Infinity, NaN]) expect(curve.valueForProgress(t)).toBe(0);
            for (const t of [1, 2, Infinity]) expect(curve.valueForProgress(t)).toBe(1);
        }
    });
    test("elastic progress is allowed to exceed one", () => {
        expect(new CEasingCurve(CEasingCurveType.OutElastic).valueForProgress(0.25)).toBeGreaterThan(1);
    });
    test("oscillation count changes the frequency", () => {
        const slow = new CEasingCurve(CEasingCurveType.OutElastic), fast = new CEasingCurve(slow);
        slow.setOscillations(1); fast.setOscillations(2); slow.setDamping(0); fast.setDamping(0);
        expect(slow.valueForProgress(0.5)).toBeCloseTo(2); expect(fast.valueForProgress(0.5)).toBeCloseTo(0);
    });
    test("larger damping reduces the oscillation amplitude", () => {
        const low = new CEasingCurve(CEasingCurveType.OutElastic), high = new CEasingCurve(low);
        low.setOscillations(3); high.setOscillations(3); low.setDamping(2); high.setDamping(8);
        expect(Math.abs(high.valueForProgress(0.5) - 1)).toBeLessThan(Math.abs(low.valueForProgress(0.5) - 1));
    });
    test("copy construction preserves independent settings", () => {
        const source = new CEasingCurve(CEasingCurveType.OutElastic); source.setOscillations(3.5); source.setDamping(4);
        const copy = new CEasingCurve(source); source.setOscillations(1); source.setDamping(10); source.setType(CEasingCurveType.Linear);
        expect(copy.type()).toBe(CEasingCurveType.OutElastic); expect(copy.oscillations()).toBe(3.5); expect(copy.damping()).toBe(4);
    });
    test("switching curve type retains the elastic settings", () => {
        const curve = new CEasingCurve(CEasingCurveType.OutElastic); curve.setOscillations(3); curve.setDamping(4);
        const before = curve.valueForProgress(0.25); curve.setType(CEasingCurveType.OutBounce); curve.setType(CEasingCurveType.OutElastic);
        expect(curve.valueForProgress(0.25)).toBe(before);
    });
    test("invalid parameters are rejected without changing existing settings", () => {
        const curve = new CEasingCurve(CEasingCurveType.OutElastic);
        for (const value of [-1, NaN, Infinity, -Infinity]) {
            expect(() => curve.setOscillations(value)).toThrow(RangeError);
            expect(() => curve.setDamping(value)).toThrow(RangeError);
        }
        expect(() => curve.setOscillations(Number.MAX_VALUE)).toThrow(RangeError);
        expect(curve.oscillations()).toBe(2.25); expect(curve.damping()).toBe(6);
    });
    test("zero oscillations give a non-oscillating transition", () => {
        const curve = new CEasingCurve(CEasingCurveType.OutElastic); curve.setOscillations(0); let previous = 0;
        for (let index = 0; index <= 100; ++index) {
            const value = curve.valueForProgress(index / 100); expect(value).toBeGreaterThanOrEqual(previous); previous = value;
        }
        curve.setDamping(0); expect(curve.valueForProgress(0.4)).toBe(0.4);
    });
    test("extreme finite settings never produce NaN or infinity", () => {
        const curve = new CEasingCurve(CEasingCurveType.OutElastic);
        for (const frequency of [0, Number.MIN_VALUE, 0.01, 2.25, 20, 1e300]) {
            for (const damping of [0, Number.MIN_VALUE, 6, Number.MAX_VALUE]) {
                curve.setOscillations(frequency); curve.setDamping(damping);
                for (const time of [0, 0.0001, 0.5, 0.95, 0.999999, 1])
                    expect(Number.isFinite(curve.valueForProgress(time))).toBe(true);
            }
        }
    });
    test("the final taper approaches the endpoint continuously, including with no damping", () => {
        const curve = new CEasingCurve(CEasingCurveType.OutElastic); curve.setOscillations(3); curve.setDamping(0);
        expect(curve.valueForProgress(0.9 - 1e-8)).toBeCloseTo(curve.valueForProgress(0.9 + 1e-8));
        expect(Math.abs(curve.valueForProgress(1 - 1e-6) - 1)).toBeLessThan(1e-8);
        expect(curve.valueForProgress(1)).toBe(1);
    });
    test("bounce valleys and peaks have the expected heights", () => {
        const curve = new CEasingCurve(CEasingCurveType.OutBounce);
        for (const time of [1 / 2.75, 2 / 2.75, 2.5 / 2.75]) expect(curve.valueForProgress(time)).toBeCloseTo(1);
        expect(curve.valueForProgress(1.5 / 2.75)).toBeCloseTo(0.75);
        expect(curve.valueForProgress(2.25 / 2.75)).toBeCloseTo(0.9375);
        expect(curve.valueForProgress(2.625 / 2.75)).toBeCloseTo(0.984375);
    });
    test("bounce stays within zero and one", () => {
        const curve = new CEasingCurve(CEasingCurveType.OutBounce);
        for (let index = 0; index <= 1000; ++index) {
            const value = curve.valueForProgress(index / 1000);
            expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThan(1.000000000001);
        }
    });
    test("bounce is continuous across its piecewise boundaries", () => {
        const curve = new CEasingCurve(CEasingCurveType.OutBounce);
        for (const boundary of [1 / 2.75, 2 / 2.75, 2.5 / 2.75])
            expect(Math.abs(curve.valueForProgress(boundary - 1e-9) - curve.valueForProgress(boundary + 1e-9))).toBeLessThan(1e-7);
    });
    test("elastic parameters have no effect on bounce or existing curve types", () => {
        for (const type of [CEasingCurveType.Linear, CEasingCurveType.InQuad, CEasingCurveType.OutCubic, CEasingCurveType.OutBounce]) {
            const curve = new CEasingCurve(type), expected = curve.valueForProgress(0.4);
            curve.setOscillations(20); curve.setDamping(0); expect(curve.valueForProgress(0.4)).toBe(expected);
        }
    });
});

describe("CVariantAnimation geometry values", () => {
    function point(p: CPoint): number[] { return [p.x(), p.y()]; }
    function size(s: CSize): number[] { return [s.width(), s.height()]; }
    function rect(r: CRect): number[] { return [r.x(), r.y(), r.width(), r.height()]; }
    test("interpolates both point coordinates including fractions and negative positions", () => {
        const a = new CVariantAnimation<CPoint>(); a.setStartValue(new CPoint(-10, 5)); a.setEndValue(new CPoint(11, 20));
        a.setDuration(100); a.setCurrentTime(25); expect(point(a.currentValue())).toEqual([-4.75, 8.75]); a.destroy();
    });
    test("interpolates size components independently", () => {
        const a = new CVariantAnimation<CSize>(); a.setStartValue(new CSize(10, 40)); a.setEndValue(new CSize(50, 20));
        a.setDuration(100); a.setCurrentTime(50); expect(size(a.currentValue())).toEqual([30, 30]); a.destroy();
    });
    test("interpolates all four rectangle components", () => {
        const a = new CVariantAnimation<CRect>(); a.setStartValue(new CRect(20, 20, 100, 60)); a.setEndValue(new CRect(300, 100, 200, 120));
        a.setDuration(100); a.setCurrentTime(50); expect(rect(a.currentValue())).toEqual([160, 60, 150, 90]); a.destroy();
    });
    test("preserves exact endpoints and clamps seeking", () => {
        const a = new CVariantAnimation<CRect>(); a.setStartValue(new CRect(-2, 3, 10, 20)); a.setEndValue(new CRect(11, 19, 30, 40));
        a.setCurrentTime(-100); expect(rect(a.currentValue())).toEqual([-2, 3, 10, 20]);
        a.setCurrentTime(1000); expect(rect(a.currentValue())).toEqual([11, 19, 30, 40]); a.destroy();
    });
    test("applies easing equally to every component", () => {
        const a = new CVariantAnimation<CRect>(); a.setStartValue(new CRect()); a.setEndValue(new CRect(10, 20, 40, 80));
        a.setDuration(100); a.setEasingCurve(CEasingCurveType.InQuad); a.setCurrentTime(50);
        expect(rect(a.currentValue())).toEqual([2.5, 5, 10, 20]); a.destroy();
    });
    test("elastic extrapolation is preserved rather than clamped to endpoints", () => {
        const a = new CVariantAnimation<CSize>(); a.setStartValue(new CSize(10, 10)); a.setEndValue(new CSize(0, 20));
        const curve = new CEasingCurve(CEasingCurveType.OutElastic); curve.setOscillations(2); curve.setDamping(2);
        a.setDuration(100); a.setEasingCurve(curve); a.setCurrentTime(25);
        expect(a.currentValue().width()).toBeLessThan(0); expect(a.currentValue().height()).toBeGreaterThan(20); a.destroy();
    });
    test("zero duration yields the geometry endpoint", () => {
        const a = new CVariantAnimation<CPoint>(); a.setStartValue(new CPoint(1, 2)); a.setEndValue(new CPoint(3, 4));
        a.setDuration(0); expect(point(a.currentValue())).toEqual([3, 4]); a.destroy();
    });
    test("a first geometry start supplies a matching unit end", () => {
        const a = new CVariantAnimation<CPoint>(); a.setStartValue(new CPoint(4, 8));
        expect(point(a.endValue())).toEqual([1, 1]); expect(point(a.currentValue())).toEqual([4, 8]); a.destroy();
    });
    test("a first geometry end supplies a matching zero start", () => {
        const a = new CVariantAnimation<CRect>(); a.setEndValue(new CRect(1, 2, 3, 4));
        expect(rect(a.startValue())).toEqual([0, 0, 0, 0]); a.destroy();
    });
    test("copies point endpoint inputs and getter results", () => {
        const a = new CVariantAnimation<CPoint>(); const from = new CPoint(2, 4), to = new CPoint(10, 12);
        a.setStartValue(from); a.setEndValue(to); from.move(100, 100); to.moveBy(100, 100);
        a.startValue().move(200, 200); a.endValue().move(300, 300); a.currentValue().move(400, 400);
        expect(point(a.startValue())).toEqual([2, 4]); expect(point(a.endValue())).toEqual([10, 12]);
        expect(point(a.currentValue())).toEqual([2, 4]); a.destroy();
    });
    test("copies size endpoint inputs and getter results", () => {
        const a = new CVariantAnimation<CSize>(); const from = new CSize(2, 4), to = new CSize(10, 12);
        a.setStartValue(from); a.setEndValue(to); from.resize(100, 100); to.resize(100, 100);
        a.startValue().resize(200, 200); a.endValue().resize(300, 300); a.currentValue().resize(400, 400);
        expect(size(a.startValue())).toEqual([2, 4]); expect(size(a.endValue())).toEqual([10, 12]);
        expect(size(a.currentValue())).toEqual([2, 4]); a.destroy();
    });
    test("copies rectangle endpoint inputs and getter results", () => {
        const a = new CVariantAnimation<CRect>(); const from = new CRect(1, 2, 3, 4), to = new CRect(5, 6, 7, 8);
        a.setStartValue(from); a.setEndValue(to); from.setGeometry(90, 90, 90, 90); to.setGeometry(90, 90, 90, 90);
        a.startValue().setGeometry(90, 90, 90, 90); a.endValue().setGeometry(90, 90, 90, 90); a.currentValue().setGeometry(90, 90, 90, 90);
        expect(rect(a.startValue())).toEqual([1, 2, 3, 4]); expect(rect(a.endValue())).toEqual([5, 6, 7, 8]);
        expect(rect(a.currentValue())).toEqual([1, 2, 3, 4]); a.destroy();
    });
    test("mutating an emitted geometry cannot corrupt cached values or subsequent reapplication", () => {
        const a = new CVariantAnimation<CPoint>(); a.setStartValue(new CPoint()); a.setEndValue(new CPoint(10, 20)); a.setDuration(100);
        const values: number[][] = []; a.valueChanged.connect(v => { values.push(point(v)); v.move(99, 99); });
        a.setCurrentTime(50); expect(point(a.currentValue())).toEqual([5, 10]); a.applyCurrentValue();
        expect(values).toEqual([[5, 10], [5, 10]]); expect(point(a.currentValue())).toEqual([5, 10]); a.destroy();
    });
    test("unchanged components do not emit redundant valueChanged signals", () => {
        const a = new CVariantAnimation<CPoint>(); a.setStartValue(new CPoint(2, 4)); a.setEndValue(new CPoint(2, 4));
        const changed = vi.fn(); a.valueChanged.connect(changed); a.setCurrentTime(50); a.setCurrentTime(100);
        expect(changed).not.toHaveBeenCalled(); a.applyCurrentValue(); expect(changed).toHaveBeenCalledOnce(); a.destroy();
    });
    test("rejects mismatched endpoint kinds without damaging valid endpoints", () => {
        const a = new CVariantAnimation<CPoint | CSize>(); a.setStartValue(new CPoint(1, 2));
        expect(() => a.setEndValue(new CSize(3, 4))).toThrow(TypeError);
        a.setEndValue(new CPoint(3, 4)); a.setDuration(100); a.setCurrentTime(50);
        expect(point(a.currentValue() as CPoint)).toEqual([2, 3]); a.destroy();
    });
    test("rejects non-finite geometry components before adopting the value kind", () => {
        const a = new CVariantAnimation<CRect>();
        for (const bad of [new CRect(NaN, 0, 0, 0), new CRect(0, Infinity, 0, 0), new CRect(0, 0, -Infinity, 0), new CRect(0, 0, 0, NaN)])
            expect(() => a.setStartValue(bad)).toThrow(RangeError);
        a.setStartValue(new CRect(1, 2, 3, 4)); expect(rect(a.currentValue())).toEqual([1, 2, 3, 4]); a.destroy();
    });
    test("rejects unsupported runtime values", () => {
        const a = new CVariantAnimation();
        expect(() => a.setStartValue({ x: 1, y: 2 } as unknown as number)).toThrow(TypeError);
        expect(() => a.setStartValue(null as unknown as number)).toThrow(TypeError); a.destroy();
    });
    test("stable interpolation also applies to extreme geometry coordinates", () => {
        const a = new CVariantAnimation<CPoint>(); a.setStartValue(new CPoint(-Number.MAX_VALUE, Number.MAX_VALUE));
        a.setEndValue(new CPoint(Number.MAX_VALUE, -Number.MAX_VALUE)); a.setDuration(100); a.setCurrentTime(50);
        expect(point(a.currentValue())).toEqual([0, 0]); a.destroy();
    });
});

describe("animation playback loops and direction", () => {
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
        const a = new CVariantAnimation(); animations.push(a); a.setDuration(duration); a.setEndValue(10); return a;
    }
    test("playback defaults retain single forward execution", () => {
        const a = make(); expect(a.loopCount()).toBe(1); expect(a.direction()).toBe(CAnimationDirection.Forward);
        expect(a.autoReverse()).toBe(false); expect(a.currentLoop()).toBe(0); expect(a.totalDuration()).toBe(100);
    });
    test("finite repeats restart at each boundary and finish only once", () => {
        const a = make(); a.setLoopCount(3); const done = vi.fn(); a.finished.connect(done); a.start();
        tick(100); expect(a.currentTime()).toBe(100); expect(a.currentLoop()).toBe(1); expect(a.currentLoopTime()).toBe(0);
        expect(a.currentValue()).toBe(0); expect(done).not.toHaveBeenCalled();
        tick(250); expect(a.currentLoop()).toBe(2); expect(a.currentValue()).toBe(5);
        tick(300); expect(a.currentLoopTime()).toBe(100); expect(a.currentValue()).toBe(10); expect(done).toHaveBeenCalledOnce();
    });
    test("a long frame skips loops arithmetically and signals the resulting loop", () => {
        const a = make(); a.setLoopCount(1000000); const loops: number[] = []; a.currentLoopChanged.connect(n => loops.push(n));
        a.start(); tick(12345678); expect(a.currentLoop()).toBe(123456); expect(a.currentValue()).toBeCloseTo(7.8);
        expect(loops).toEqual([123456]); expect(frames.size).toBe(1);
    });
    test("endless playback continues across a long frame and stops explicitly", () => {
        const a = make(); a.setLoopCount(-1); const done = vi.fn(); a.finished.connect(done); a.start(); tick(100000050);
        expect(a.totalDuration()).toBe(-1); expect(a.currentLoop()).toBe(1000000); expect(a.currentValue()).toBe(5);
        expect(a.state()).toBe(CAnimationState.Running); a.stop(); expect(frames.size).toBe(0); expect(done).not.toHaveBeenCalled();
    });
    test("zero loop count does not run or finish", () => {
        const a = make(); a.setLoopCount(0); const done = vi.fn(); a.finished.connect(done); a.start();
        expect(a.totalDuration()).toBe(0); expect(a.state()).toBe(CAnimationState.Stopped); expect(frames.size).toBe(0); expect(done).not.toHaveBeenCalled();
    });
    test("backward direction starts at the end and finishes at the start", () => {
        const a = make(); a.setDirection(CAnimationDirection.Backward); a.start(); expect(a.currentValue()).toBe(10);
        expect(a.currentLoopTime()).toBe(100); tick(25); expect(a.currentValue()).toBe(7.5); expect(a.currentTime()).toBe(25);
        tick(100); expect(a.currentValue()).toBe(0); expect(a.state()).toBe(CAnimationState.Stopped);
    });
    test("backward repeats reset to the end of the next leg", () => {
        const a = make(); a.setLoopCount(2); a.setDirection(CAnimationDirection.Backward); a.start();
        tick(100); expect(a.currentLoop()).toBe(1); expect(a.currentValue()).toBe(10); tick(150); expect(a.currentValue()).toBe(5);
        tick(200); expect(a.currentValue()).toBe(0);
    });
    test("auto reverse counts each leg and joins endpoints continuously", () => {
        const a = make(); a.setLoopCount(2); a.setAutoReverse(true); a.start(); tick(100);
        expect(a.currentValue()).toBe(10); expect(a.currentDirection()).toBe(CAnimationDirection.Backward);
        tick(150); expect(a.currentValue()).toBe(5); tick(200); expect(a.currentValue()).toBe(0); expect(a.currentLoop()).toBe(1);
    });
    test("odd auto reverse leg count ends at the final forward value", () => {
        const a = make(); a.setLoopCount(3); a.setAutoReverse(true); a.start(); tick(300);
        expect(a.currentValue()).toBe(10); expect(a.currentLoop()).toBe(2);
    });
    test("backward auto reverse starts backwards then runs forwards", () => {
        const a = make(); a.setLoopCount(2); a.setAutoReverse(true); a.setDirection(CAnimationDirection.Backward); a.start();
        expect(a.currentValue()).toBe(10); tick(100); expect(a.currentValue()).toBe(0); tick(150); expect(a.currentValue()).toBe(5);
        tick(200); expect(a.currentValue()).toBe(10);
    });
    test("endless alternating playback does not finish", () => {
        const a = make(); a.setLoopCount(-1); a.setAutoReverse(true); a.start(); tick(175);
        expect(a.currentLoop()).toBe(1); expect(a.currentValue()).toBe(2.5); tick(225); expect(a.currentValue()).toBe(2.5);
        expect(a.currentDirection()).toBe(CAnimationDirection.Forward);
    });
    test("pause and resume exclude time spent paused across loop boundaries", () => {
        const a = make(); a.setLoopCount(3); a.setAutoReverse(true); a.start(); tick(125); a.pause(); tick(1000);
        expect(a.currentValue()).toBe(7.5); a.resume(); tick(1025); expect(a.currentTime()).toBe(150); expect(a.currentValue()).toBe(5);
    });
    test("seeking across loops while stopped and paused uses directed loop time", () => {
        const a = make(); a.setLoopCount(3); a.setAutoReverse(true); a.setCurrentTime(125);
        expect(a.currentLoop()).toBe(1); expect(a.currentLoopTime()).toBe(75); expect(a.currentValue()).toBe(7.5);
        a.start(); a.pause(); a.setCurrentTime(250); expect(a.currentValue()).toBe(5); expect(a.state()).toBe(CAnimationState.Paused);
    });
    test("running seek to the total endpoint finishes once", () => {
        const a = make(); a.setLoopCount(2); a.setAutoReverse(true); const done = vi.fn(); a.finished.connect(done);
        a.start(); a.setCurrentTime(999); expect(a.currentTime()).toBe(200); expect(a.currentValue()).toBe(0); expect(done).toHaveBeenCalledOnce();
    });
    test("live direction changes preserve displayed position and reverse subsequent travel", () => {
        const a = make(); const changed = vi.fn(); a.directionChanged.connect(changed); a.start(); tick(25);
        a.setDirection(CAnimationDirection.Backward); expect(a.currentValue()).toBe(2.5); expect(a.currentLoopTime()).toBe(25);
        tick(50); expect(a.currentValue()).toBe(0); expect(a.state()).toBe(CAnimationState.Stopped); expect(changed).toHaveBeenCalledWith(CAnimationDirection.Backward);
    });
    test("paused direction changes retain the position without scheduling frames", () => {
        const a = make(); a.start(); tick(25); a.pause(); a.setDirection(CAnimationDirection.Backward);
        expect(a.currentValue()).toBe(2.5); expect(frames.size).toBe(0); a.resume(); tick(50); expect(a.currentValue()).toBe(0);
    });
    test("changing auto reverse during an odd loop preserves the position", () => {
        const a = make(); a.setLoopCount(3); a.start(); tick(125); a.setAutoReverse(true);
        expect(a.currentValue()).toBe(2.5); tick(150); expect(a.currentValue()).toBe(0);
    });
    test("shortening a live loop count clamps and finishes", () => {
        const a = make(); a.setLoopCount(3); const done = vi.fn(); a.finished.connect(done); a.start(); tick(250); a.setLoopCount(2);
        expect(a.currentTime()).toBe(200); expect(a.currentValue()).toBe(10); expect(done).toHaveBeenCalledOnce();
    });
    test("invalid repeat counts leave the old count unchanged", () => {
        const a = make();
        for (const count of [-2, .5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) expect(() => a.setLoopCount(count)).toThrow(RangeError);
        expect(a.loopCount()).toBe(1);
    });
    test("invalid directions are rejected", () => {
        const a = make(); expect(() => a.setDirection(999 as CAnimationDirection)).toThrow(RangeError);
        expect(a.direction()).toBe(CAnimationDirection.Forward);
    });
    test("unbounded zero-duration repetition is rejected", () => {
        const a = make(0); expect(() => a.setLoopCount(-1)).toThrow(RangeError); expect(a.loopCount()).toBe(1);
        const b = make(); b.setLoopCount(-1); expect(() => b.setDuration(0)).toThrow(RangeError); expect(b.duration()).toBe(100);
    });
    test("finite zero-duration loops settle immediately at the last leg", () => {
        const a = make(0); a.setLoopCount(2); a.setAutoReverse(true); const done = vi.fn(); a.finished.connect(done); a.start();
        expect(a.currentLoop()).toBe(1); expect(a.currentValue()).toBe(0); expect(done).toHaveBeenCalledOnce(); expect(frames.size).toBe(0);
    });
    test("zero-duration backward playback ends at its start value", () => {
        const a = make(0); a.setDirection(CAnimationDirection.Backward); a.start(); expect(a.currentValue()).toBe(0);
    });
    test("restart resets loop position but retains repeat settings", () => {
        const a = make(); a.setLoopCount(3); a.setAutoReverse(true); a.start(); tick(250); a.start();
        expect(a.currentLoop()).toBe(0); expect(a.currentValue()).toBe(0); expect(a.loopCount()).toBe(3); expect(frames.size).toBe(1);
    });
    test("a loop callback may stop playback without stale target updates", () => {
        const a = make(); a.setLoopCount(3); a.currentLoopChanged.connect(() => a.stop()); a.start(); tick(125);
        expect(a.state()).toBe(CAnimationState.Stopped); expect(frames.size).toBe(0);
    });
    test("a loop callback may destroy the animation", () => {
        const a = make(); a.setLoopCount(3); a.currentLoopChanged.connect(() => a.destroy()); a.start(); tick(125);
        expect(a.isDestroyed()).toBe(true); expect(frames.size).toBe(0);
    });
    test("destroying an endless animation cancels its frame", () => {
        const a = make(); a.setLoopCount(-1); a.start(); a.destroy(); tick(1000); expect(frames.size).toBe(0);
    });
    test("fractional durations retain an exact finite endpoint", () => {
        const a = make(.7); a.setLoopCount(3); a.start(); tick(10); expect(a.currentValue()).toBe(10);
    });
    test("finite total duration overflow is rejected", () => {
        const a = make(Number.MAX_VALUE); expect(() => a.setLoopCount(2)).toThrow(RangeError); expect(a.loopCount()).toBe(1);
    });
    test("an unrepresentable endless loop index is rejected without leaving a frame", () => {
        const a = make(); a.setLoopCount(-1); a.start(); expect(() => a.setCurrentTime(Number.MAX_VALUE)).toThrow(RangeError);
        expect(a.state()).toBe(CAnimationState.Stopped); expect(frames.size).toBe(0);
    });

});
