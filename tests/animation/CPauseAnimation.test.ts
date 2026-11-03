import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CObject } from "../../src/core/CObject.js";
import { CAbstractAnimation, CAnimationState, CAnimationDirection } from "../../src/animation/CAbstractAnimation.js";
import { CPauseAnimation } from "../../src/animation/CPauseAnimation.js";
import { CVariantAnimation } from "../../src/animation/CVariantAnimation.js";
import { CParallelAnimationGroup } from "../../src/animation/CParallelAnimationGroup.js";

describe("CPauseAnimation", () => {
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
    function make(duration = 100): CPauseAnimation {
        const pause = new CPauseAnimation(duration); animations.push(pause); return pause;
    }
    test("defaults to a stopped 250 millisecond interval", () => {
        const pause = new CPauseAnimation(); animations.push(pause);
        expect(pause.duration()).toBe(250); expect(pause.state()).toBe(CAnimationState.Stopped); expect(pause.currentTime()).toBe(0);
    });
    test("accepts duration and parent and follows object ownership", () => {
        const parent = new CObject(), pause = new CPauseAnimation(123, parent); animations.push(pause);
        expect(pause.parent()).toBe(parent); expect(pause.duration()).toBe(123); pause.start(); parent.destroy();
        expect(pause.isDestroyed()).toBe(true); expect(frames.size).toBe(0);
    });
    test("invalid constructor durations do not attach a partial child", () => {
        const parent = new CObject();
        for (const duration of [-1, NaN, Infinity, -Infinity]) expect(() => new CPauseAnimation(duration, parent)).toThrow(RangeError);
        expect(parent.children().length).toBe(0); parent.destroy();
    });
    test("finishes once after its duration", () => {
        const pause = make(), done = vi.fn(); pause.finished.connect(done); pause.start(); tick(99);
        expect(done).not.toHaveBeenCalled(); tick(100); tick(500); expect(done).toHaveBeenCalledOnce(); expect(frames.size).toBe(0);
    });
    test("zero duration finishes synchronously without a frame", () => {
        const pause = make(0), done = vi.fn(); pause.finished.connect(done); pause.start();
        expect(done).toHaveBeenCalledOnce(); expect(pause.state()).toBe(CAnimationState.Stopped); expect(frames.size).toBe(0);
    });
    test("pause and resume exclude paused wall-clock time", () => {
        const pause = make(); pause.start(); tick(25); pause.pause(); tick(1000); expect(pause.currentTime()).toBe(25);
        pause.resume(); tick(1050); expect(pause.currentTime()).toBe(75); tick(1075); expect(pause.state()).toBe(CAnimationState.Stopped);
    });
    test("stop retains elapsed time and does not finish", () => {
        const pause = make(), done = vi.fn(); pause.finished.connect(done); pause.start(); tick(30); pause.stop(); tick(1000);
        expect(pause.currentTime()).toBe(30); expect(done).not.toHaveBeenCalled(); expect(frames.size).toBe(0);
    });
    test("restart resets elapsed time", () => {
        const pause = make(); pause.start(); tick(80); pause.start(); expect(pause.currentTime()).toBe(0);
        tick(100); expect(pause.currentTime()).toBe(20); expect(frames.size).toBe(1);
    });
    test("backwards direction counts down the local pause position", () => {
        const pause = make(); pause.setDirection(CAnimationDirection.Backward); pause.start(); expect(pause.currentLoopTime()).toBe(100);
        tick(25); expect(pause.currentLoopTime()).toBe(75); tick(100); expect(pause.currentLoopTime()).toBe(0);
    });
    test("repeats and auto reverse retain the same total waiting time", () => {
        const pause = make(); pause.setLoopCount(2); pause.setAutoReverse(true); const done = vi.fn(); pause.finished.connect(done);
        pause.start(); tick(150); expect(pause.currentLoop()).toBe(1); expect(pause.currentLoopTime()).toBe(50);
        expect(done).not.toHaveBeenCalled(); tick(200); expect(done).toHaveBeenCalledOnce();
    });
    test("seeking while stopped does not schedule or finish", () => {
        const pause = make(), done = vi.fn(); pause.finished.connect(done); pause.setCurrentTime(50);
        expect(pause.currentTime()).toBe(50); expect(pause.state()).toBe(CAnimationState.Stopped); expect(frames.size).toBe(0); expect(done).not.toHaveBeenCalled();
    });
    test("explicit current value reapplication is inert", () => {
        const pause = make(); pause.setCurrentTime(50); pause.applyCurrentValue();
        expect(pause.currentTime()).toBe(50); expect(frames.size).toBe(0);
    });
    test("a duration change can finish a running pause", () => {
        const pause = make(), done = vi.fn(); pause.finished.connect(done); pause.start(); tick(60); pause.setDuration(50);
        expect(done).toHaveBeenCalledOnce(); expect(pause.currentTime()).toBe(50); expect(frames.size).toBe(0);
    });
    test("a parallel pause can keep the group alive after a value animation finishes", () => {
        const pause = make(200), value = new CVariantAnimation(); animations.push(value); value.setDuration(100);
        const group = new CParallelAnimationGroup(); animations.push(group); group.addAnimation(value); group.addAnimation(pause);
        group.start(); tick(150); expect(value.currentValue()).toBe(1); expect(group.state()).toBe(CAnimationState.Running);
        tick(200); expect(group.state()).toBe(CAnimationState.Stopped); expect(frames.size).toBe(0);
    });
    test("destroy cancels an endless pause", () => {
        const pause = make(); pause.setLoopCount(-1); pause.start(); tick(250); pause.destroy(); expect(frames.size).toBe(0);
        pause.start(); expect(frames.size).toBe(0);
    });
});
