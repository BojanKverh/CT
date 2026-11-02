import { CPoint } from "../../src/geometry/CPoint.js";
import { CSize } from "../../src/geometry/CSize.js";
import { CRect } from "../../src/geometry/CRect.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CObject } from "../../src/core/CObject.js";
import { CAbstractAnimation, CAnimationState } from "../../src/animation/CAbstractAnimation.js";
import { CVariantAnimation } from "../../src/animation/CVariantAnimation.js";
import { CPropertyAnimation } from "../../src/animation/CPropertyAnimation.js";
import { CEasingCurve, CEasingCurveType } from "../../src/animation/CEasingCurve.js";
import { CParallelAnimationGroup } from "../../src/animation/CParallelAnimationGroup.js";
import { CSequentialAnimationGroup } from "../../src/animation/CSequentialAnimationGroup.js";

describe("CPropertyAnimation", () => {
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
    function make(setter: (value: number) => void, from = 0, to = 10): CPropertyAnimation {
        const animation = new CPropertyAnimation(setter); animations.push(animation);
        animation.setStartValue(from); animation.setEndValue(to); animation.setDuration(100);
        return animation;
    }
    test("inherits the numeric animation API without writing during configuration", () => {
        const setter = vi.fn(); const a = make(setter, 10, 20);
        a.setEasingCurve(CEasingCurveType.OutQuad);
        expect(a instanceof CVariantAnimation).toBe(true);
        expect(a.currentValue()).toBe(10); expect(setter).not.toHaveBeenCalled();
        a.start(); expect(setter).toHaveBeenCalledWith(10);
        tick(50); expect(setter.mock.calls.at(-1)).toEqual([17.5]);
    });
    test("writes the initial value even when its numeric cache already matches", () => {
        let value = 99; const a = make(v => { value = v; });
        a.start(); expect(value).toBe(0);
    });
    test("property is updated before public valueChanged listeners", () => {
        let value = -1; const a = make(v => { value = v; });
        const observed: number[] = []; a.valueChanged.connect(v => { observed.push(value); expect(value).toBe(v); });
        a.start(); tick(50); expect(observed).toEqual([5]);
    });
    test("writes the endpoint before finished", () => {
        let value = -1; const a = make(v => { value = v; });
        const finished = vi.fn(() => { expect(value).toBe(10); }); a.finished.connect(finished);
        a.start(); tick(100); expect(finished).toHaveBeenCalledOnce(); expect(frames.size).toBe(0);
    });
    test("seeking while stopped updates the target and clamps time", () => {
        let value = -1; const a = make(v => { value = v; }, 10, 20);
        a.setCurrentTime(50); expect(value).toBe(15); expect(a.state()).toBe(CAnimationState.Stopped);
        a.setCurrentTime(-1); expect(value).toBe(10);
        a.setCurrentTime(500); expect(value).toBe(20); expect(frames.size).toBe(0);
    });
    test("applyCurrentValue restores an externally changed target", () => {
        let value = 99; const a = make(v => { value = v; }, 4, 4);
        a.applyCurrentValue(); expect(value).toBe(4); value = 50;
        a.applyCurrentValue(); expect(value).toBe(4);
    });
    test("constant animations restore the target when restarted", () => {
        let value = 99; const a = make(v => { value = v; }, 4, 4);
        a.start(); expect(value).toBe(4); tick(100); value = 99;
        a.start(); expect(value).toBe(4);
    });
    test("pause freezes and resume continues from the same time", () => {
        let value = -1; const a = make(v => { value = v; });
        a.start(); tick(40); a.pause(); tick(400); expect(value).toBe(4);
        a.resume(); tick(430); expect(value).toBe(7);
    });
    test("stop retains the target and does not emit finished", () => {
        let value = -1; const a = make(v => { value = v; }); const finished = vi.fn(); a.finished.connect(finished);
        a.start(); tick(40); a.stop(); tick(400); expect(value).toBe(4); expect(finished).not.toHaveBeenCalled();
    });
    test("zero duration applies the endpoint synchronously", () => {
        let value = -1; const a = make(v => { value = v; }, 3, 9); a.setDuration(0);
        expect(value).toBe(-1); a.start(); expect(value).toBe(9); expect(frames.size).toBe(0);
    });
    test("custom elastic settings and overshoot reach the setter", () => {
        let value = 0; const a = make(v => { value = v; }, 0, 1);
        const curve = new CEasingCurve(CEasingCurveType.OutElastic); curve.setOscillations(2); curve.setDamping(2);
        a.setEasingCurve(curve); curve.setOscillations(0);
        a.start(); tick(25); expect(value).toBeGreaterThan(1);
        expect(a.easingCurve().oscillations()).toBe(2); tick(100); expect(value).toBe(1);
    });
    test("changing configuration while running updates the target", () => {
        let value = -1; const a = make(v => { value = v; });
        a.start(); tick(50); a.setEndValue(20); expect(value).toBe(10);
        a.setEasingCurve(CEasingCurveType.InQuad); expect(value).toBe(5);
    });
    test("invalid configuration cannot leave target writes suppressed", () => {
        const setter = vi.fn(); const a = make(setter);
        expect(() => a.setEndValue(NaN)).toThrow(RangeError);
        expect(() => a.setDuration(-1)).toThrow(RangeError);
        expect(() => a.setEasingCurve(999 as CEasingCurveType)).toThrow(RangeError);
        a.start(); tick(50); expect(setter.mock.calls.at(-1)).toEqual([5]);
    });
    test("invalid setters are rejected without attaching a partially constructed child", () => {
        const parent = new CObject();
        expect(() => new CPropertyAnimation(null as unknown as (value: number) => void, parent)).toThrow(TypeError);
        expect(parent.children().length).toBe(0); parent.destroy();
    });
    test("parent destruction stops playback and prevents subsequent writes", () => {
        const parent = new CObject(); const setter = vi.fn();
        const a = new CPropertyAnimation(setter, parent); animations.push(a); a.start();
        expect(a.parent()).toBe(parent); parent.destroy(); setter.mockClear();
        tick(500); a.applyCurrentValue(); a.setCurrentTime(100); a.start();
        expect(setter).not.toHaveBeenCalled(); expect(a.isDestroyed()).toBe(true);
    });
    test("destroy from the setter cancels the scheduled animation", () => {
        const a = make(v => { if (v >= 5) a.destroy(); }); const finished = vi.fn(); a.finished.connect(finished);
        a.start(); tick(50); expect(a.isDestroyed()).toBe(true); expect(frames.size).toBe(0);
        expect(finished).not.toHaveBeenCalled();
    });
    test("stop from the setter stops playback without finishing", () => {
        const a = make(v => { if (v >= 5) a.stop(); }); const finished = vi.fn(); a.finished.connect(finished);
        a.start(); tick(50); expect(a.state()).toBe(CAnimationState.Stopped); expect(frames.size).toBe(0);
        expect(finished).not.toHaveBeenCalled();
    });
    test("parallel members update independent properties on one shared frame", () => {
        const target = { x: -1, y: -1 }; const x = make(v => { target.x = v; });
        const y = make(v => { target.y = v; }, 20, 40);
        const group = new CParallelAnimationGroup(); animations.push(group); group.addAnimation(x); group.addAnimation(y);
        group.start(); expect(frames.size).toBe(1); tick(50);
        expect(target).toEqual({ x: 5, y: 30 }); tick(100); expect(target).toEqual({ x: 10, y: 40 });
    });
    test("future sequential members do not overwrite a shared target", () => {
        let value = 99; const first = make(v => { value = v; });
        const second = make(v => { value = v; }, 10, 20);
        const group = new CSequentialAnimationGroup(); animations.push(group); group.addAnimation(first); group.addAnimation(second);
        expect(value).toBe(99); group.start(); tick(50); expect(value).toBe(5);
        tick(100); expect(value).toBe(10); tick(150); expect(value).toBe(15); tick(200); expect(value).toBe(20);
        group.start(); expect(value).toBe(0);
    });
    test("a constant sequential stage restores its cached value on activation", () => {
        let value = 99; const first = make(v => { value = v; });
        const second = make(v => { value = v; }, 4, 4);
        const group = new CSequentialAnimationGroup(); animations.push(group); group.addAnimation(first); group.addAnimation(second);
        group.start(); tick(100); expect(value).toBe(4); tick(200); expect(value).toBe(4);
        group.start(); tick(300); expect(value).toBe(4);
    });
    test("backwards seeking in a sequence restores the correct property value", () => {
        let value = 99; const first = make(v => { value = v; }); const second = make(v => { value = v; }, 10, 20);
        const group = new CSequentialAnimationGroup(); animations.push(group); group.addAnimation(first); group.addAnimation(second);
        group.setCurrentTime(150); expect(value).toBe(15); group.setCurrentTime(25); expect(value).toBe(2.5);
    });
    test("a point setter receives every interpolated coordinate", () => {
        let value = new CPoint(99, 99); const a = new CPropertyAnimation<CPoint>(p => { value = p; }); animations.push(a);
        a.setStartValue(new CPoint(10, 20)); a.setEndValue(new CPoint(30, 60)); a.setDuration(100);
        expect(value.x()).toBe(99); a.start(); expect(value.x()).toBe(10); tick(50);
        expect([value.x(), value.y()]).toEqual([20, 40]); tick(100); expect([value.x(), value.y()]).toEqual([30, 60]);
    });
    test("a size setter can mutate its argument without changing animation data", () => {
        const a = new CPropertyAnimation<CSize>(s => { s.resize(999, 999); }); animations.push(a);
        a.setStartValue(new CSize(10, 20)); a.setEndValue(new CSize(30, 60)); a.setDuration(100); a.start(); tick(50);
        expect([a.currentValue().width(), a.currentValue().height()]).toEqual([20, 40]);
        expect([a.startValue().width(), a.endValue().height()]).toEqual([10, 60]);
    });
    test("a rectangle setter updates all geometry components", () => {
        let value = new CRect(); const a = new CPropertyAnimation<CRect>(r => { value = r; }); animations.push(a);
        a.setStartValue(new CRect(20, 20, 100, 60)); a.setEndValue(new CRect(300, 100, 200, 120));
        a.setDuration(100); a.start(); tick(50);
        expect([value.x(), value.y(), value.width(), value.height()]).toEqual([160, 60, 150, 90]);
    });
    test("unchanged geometry still restores an externally modified target", () => {
        let value = new CPoint(99, 99); const a = new CPropertyAnimation<CPoint>(p => { value = p; }); animations.push(a);
        a.setStartValue(new CPoint(2, 4)); a.setEndValue(new CPoint(2, 4)); a.setDuration(100);
        a.start(); value.move(90, 90); a.setCurrentTime(50); expect([value.x(), value.y()]).toEqual([2, 4]);
        value.move(90, 90); a.applyCurrentValue(); expect([value.x(), value.y()]).toEqual([2, 4]);
    });
    test("geometry sequential stages restore targets across boundaries and backwards seeks", () => {
        let value = new CPoint(); const first = new CPropertyAnimation<CPoint>(p => { value = p; });
        const second = new CPropertyAnimation<CPoint>(p => { value = p; }); animations.push(first, second);
        first.setStartValue(new CPoint()); first.setEndValue(new CPoint(10, 20)); first.setDuration(100);
        second.setStartValue(new CPoint(10, 20)); second.setEndValue(new CPoint(20, 40)); second.setDuration(100);
        const group = new CSequentialAnimationGroup(); animations.push(group); group.addAnimation(first); group.addAnimation(second);
        group.start(); tick(50); expect([value.x(), value.y()]).toEqual([5, 10]);
        tick(150); expect([value.x(), value.y()]).toEqual([15, 30]); group.setCurrentTime(25);
        expect([value.x(), value.y()]).toEqual([2.5, 5]);
    });
    test("parallel groups accept numeric and geometry animations together", () => {
        let point = new CPoint(); let opacity = -1;
        const position = new CPropertyAnimation<CPoint>(p => { point = p; }); animations.push(position);
        position.setStartValue(new CPoint()); position.setEndValue(new CPoint(20, 40)); position.setDuration(100);
        const alpha = make(v => { opacity = v; }, 0, 1);
        const group = new CParallelAnimationGroup(); animations.push(group); group.addAnimation(position); group.addAnimation(alpha);
        group.start(); tick(50); expect([point.x(), point.y(), opacity]).toEqual([10, 20, .5]); expect(frames.size).toBe(1);
    });
    test("geometry property changes are visible to valueChanged observers", () => {
        let value = new CRect(); const a = new CPropertyAnimation<CRect>(r => { value = r; }); animations.push(a);
        a.setStartValue(new CRect()); a.setEndValue(new CRect(10, 20, 30, 40)); a.setDuration(100);
        const observed: number[] = []; a.valueChanged.connect(r => { observed.push(value.x()); expect(value.equals(r)).toBe(true); });
        a.start(); tick(50); expect(observed).toEqual([5]);
    });

});
