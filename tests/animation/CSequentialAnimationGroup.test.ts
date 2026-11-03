import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CObject } from "../../src/core/CObject.js";
import { CAbstractAnimation, CAnimationState, CAnimationDirection } from "../../src/animation/CAbstractAnimation.js";
import { CVariantAnimation } from "../../src/animation/CVariantAnimation.js";
import { CParallelAnimationGroup } from "../../src/animation/CParallelAnimationGroup.js";
import { CSequentialAnimationGroup } from "../../src/animation/CSequentialAnimationGroup.js";

describe("CSequentialAnimationGroup", () => {
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

    function group(...members: CAbstractAnimation[]): CSequentialAnimationGroup {
        const result = new CSequentialAnimationGroup(); animations.push(result);
        for (const member of members) result.addAnimation(member);
        return result;
    }
    test("empty sequences have zero duration and no current animation", () => {
        const g = group(); expect(g.duration()).toBe(0); expect(g.currentAnimation()).toBeNull();
        expect(g.state()).toBe(CAnimationState.Stopped);
    });
    test("duration is the sum in insertion order", () => {
        const a = make(100), b = make(200), g = group(a, b); expect(g.duration()).toBe(300);
        a.setDuration(50); expect(g.duration()).toBe(250); expect(g.animationAt(0)).toBe(a);
    });
    test("only the first member starts and the sequence requests one frame", () => {
        const a = make(100), b = make(200), g = group(a, b); g.start();
        expect(g.currentAnimation()).toBe(a); expect(a.state()).toBe(CAnimationState.Running);
        expect(b.state()).toBe(CAnimationState.Stopped); expect(frames.size).toBe(1);
        tick(50); expect(a.currentValue()).toBe(0.5); expect(b.currentValue()).toBe(0);
    });
    test("a member boundary finishes the old member before starting the new one", () => {
        const a = make(100), b = make(200), g = group(a, b), events: string[] = [];
        a.finished.connect(() => events.push("a done"));
        b.stateChanged.connect(state => { if (state === CAnimationState.Running) events.push("b running"); });
        g.start(); tick(100); expect(events).toEqual(["a done", "b running"]);
        expect(g.currentAnimation()).toBe(b); expect(a.currentValue()).toBe(1); expect(b.currentTime()).toBe(0);
        tick(150); expect(b.currentValue()).toBe(0.25);
    });
    test("frame overshoot is carried into the next member", () => {
        const a = make(100), b = make(200), g = group(a, b); g.start(); tick(175);
        expect(a.currentValue()).toBe(1); expect(b.currentTime()).toBe(75); expect(b.currentValue()).toBe(0.375);
    });
    test("a long frame can cross multiple members without losing completion order", () => {
        const a = make(100), b = make(200), c = make(300), g = group(a, b, c), events: string[] = [];
        a.finished.connect(() => events.push("a")); b.finished.connect(() => events.push("b"));
        c.finished.connect(() => events.push("c")); g.finished.connect(() => events.push("group"));
        g.start(); tick(1000); expect(events).toEqual(["a", "b", "c", "group"]);
        expect(g.currentTime()).toBe(600); expect(g.currentAnimation()).toBe(c); expect(frames.size).toBe(0);
    });
    test("currentAnimationChanged follows actual member transitions", () => {
        const a = make(100), b = make(200), g = group(a, b), changes: Array<CAbstractAnimation | null> = [];
        g.currentAnimationChanged.connect(animation => changes.push(animation));
        g.start(); tick(40); tick(100); tick(150); tick(300); expect(changes).toEqual([a, b]);
    });
    test("empty sequences finish synchronously", () => {
        const g = group(), done = vi.fn(); g.finished.connect(done); g.start();
        expect(done).toHaveBeenCalledOnce(); expect(g.state()).toBe(CAnimationState.Stopped); expect(frames.size).toBe(0);
    });
    test("zero-duration members execute once in insertion order", () => {
        const a = make(0), b = make(0), c = make(100), g = group(a, b, c), events: string[] = [];
        a.finished.connect(() => events.push("a")); b.finished.connect(() => events.push("b"));
        g.start(); expect(events).toEqual(["a", "b"]); expect(g.currentAnimation()).toBe(c);
        tick(50); expect(events).toEqual(["a", "b"]); expect(c.currentValue()).toBe(0.5);
    });
    test("zero-duration members at the end run before group finished", () => {
        const a = make(100), b = make(0), g = group(a, b), events: string[] = [];
        a.finished.connect(() => events.push("a")); b.finished.connect(() => events.push("b"));
        g.finished.connect(() => events.push("group")); g.start(); tick(100);
        expect(events).toEqual(["a", "b", "group"]); expect(g.currentAnimation()).toBe(b); expect(frames.size).toBe(0);
    });
    test("all-zero sequences finish synchronously without leaving a frame", () => {
        const a = make(0), b = make(0), g = group(a, b), done = vi.fn(); g.finished.connect(done); g.start();
        expect(a.currentValue()).toBe(1); expect(b.currentValue()).toBe(1);
        expect(done).toHaveBeenCalledOnce(); expect(frames.size).toBe(0);
    });
    test("pause freezes the active member and resume excludes paused time", () => {
        const a = make(100), b = make(200), g = group(a, b); g.start(); tick(40); g.pause();
        expect(a.state()).toBe(CAnimationState.Paused); expect(frames.size).toBe(0);
        tick(1040); expect(a.currentValue()).toBe(0.4); g.resume(); tick(1120);
        expect(a.currentValue()).toBe(1); expect(b.currentTime()).toBe(20); expect(g.currentTime()).toBe(120);
    });
    test("pause at a member's finished signal retains the boundary time", () => {
        const a = make(100), b = make(200), g = group(a, b); a.finished.connect(() => g.pause());
        g.start(); tick(50); tick(100); expect(g.state()).toBe(CAnimationState.Paused);
        expect(g.currentTime()).toBe(100); expect(frames.size).toBe(0);
        tick(1000); g.resume(); tick(1050); expect(b.currentTime()).toBe(50); expect(g.currentAnimation()).toBe(b);
    });
    test("stop retains displayed values and never emits finished", () => {
        const a = make(100), b = make(200), g = group(a, b), done = vi.fn(); g.finished.connect(done);
        g.start(); tick(150); g.stop(); tick(1000);
        expect(a.currentValue()).toBe(1); expect(b.currentValue()).toBe(0.25);
        expect(a.state()).toBe(CAnimationState.Stopped); expect(b.state()).toBe(CAnimationState.Stopped);
        expect(done).not.toHaveBeenCalled(); expect(frames.size).toBe(0);
    });
    test("start restarts a running or paused sequence from the first member", () => {
        const a = make(100), b = make(200), g = group(a, b); g.start(); tick(150); g.start();
        expect(g.currentAnimation()).toBe(a); expect(a.currentValue()).toBe(0); expect(b.state()).toBe(CAnimationState.Stopped);
        tick(175); g.pause(); g.start(); expect(g.currentTime()).toBe(0); expect(a.currentValue()).toBe(0);
    });
    test("future members do not overwrite a shared target", () => {
        const a = make(100), b = make(100), g = group(a, b); let value = -1;
        a.setStartValue(0); a.setEndValue(10); b.setStartValue(50); b.setEndValue(60);
        a.valueChanged.connect(v => { value = v; }); b.valueChanged.connect(v => { value = v; });
        g.start(); expect(value).toBe(0); tick(50); expect(value).toBe(5);
        tick(100); expect(value).toBe(50); tick(150); expect(value).toBe(55);
    });
    test("constant-valued members apply even when their cached value does not change", () => {
        const a = make(100), b = make(100), g = group(a, b); let value = -1;
        a.setStartValue(5); a.setEndValue(5); b.setStartValue(20); b.setEndValue(20);
        a.valueChanged.connect(v => { value = v; }); b.valueChanged.connect(v => { value = v; });
        g.start(); expect(value).toBe(5); tick(100); expect(value).toBe(20);
        tick(200); expect(value).toBe(20); g.start(); expect(value).toBe(5);
    });
    test("stopped seeking updates past and active values without playing", () => {
        const a = make(100), b = make(200), g = group(a, b), done = vi.fn();
        a.finished.connect(done); b.finished.connect(done); g.finished.connect(done);
        g.setCurrentTime(150); expect(a.currentValue()).toBe(1); expect(b.currentValue()).toBe(0.25);
        expect(g.currentAnimation()).toBe(b); expect(frames.size).toBe(0); expect(done).not.toHaveBeenCalled();
    });
    test("seeking to an exact boundary selects the following positive-duration member", () => {
        const a = make(100), b = make(200), g = group(a, b); g.setCurrentTime(100);
        expect(g.currentAnimation()).toBe(b); expect(b.currentTime()).toBe(0);
    });
    test("stopped seeking does not redundantly select old past members", () => {
        const a = make(100), b = make(200), g = group(a, b), changed = vi.fn();
        g.setCurrentTime(150); g.currentAnimationChanged.connect(changed); g.setCurrentTime(150);
        expect(changed).not.toHaveBeenCalled();
    });
    test("running seeking rebases the active member and sequence clocks", () => {
        const a = make(100), b = make(200), g = group(a, b); g.start(); tick(20); g.setCurrentTime(150); tick(40);
        expect(g.currentTime()).toBe(170); expect(g.currentAnimation()).toBe(b); expect(b.currentTime()).toBe(70);
    });
    test("paused seeking selects another member without leaving frames", () => {
        const a = make(100), b = make(200), g = group(a, b); g.start(); tick(20); g.pause(); g.setCurrentTime(150);
        expect(g.currentAnimation()).toBe(b); expect(b.currentValue()).toBe(0.25); expect(frames.size).toBe(0);
        tick(1000); g.resume(); tick(1050); expect(b.currentTime()).toBe(100);
    });
    test("backward seeking stops future members and replays the earlier member", () => {
        const a = make(100), b = make(200), g = group(a, b); g.start(); tick(150); g.setCurrentTime(40);
        expect(g.currentAnimation()).toBe(a); expect(a.currentValue()).toBe(0.4); expect(b.state()).toBe(CAnimationState.Stopped);
        tick(200); expect(a.currentTime()).toBe(90); tick(220); expect(b.currentTime()).toBe(10);
    });
    test("backward and forward seeks restore cached shared-target values", () => {
        const a = make(100), b = make(100), g = group(a, b); let value = -1;
        a.setEndValue(10); b.setStartValue(50); b.setEndValue(60);
        a.valueChanged.connect(v => { value = v; }); b.valueChanged.connect(v => { value = v; });
        g.start(); tick(100); expect(value).toBe(50); g.setCurrentTime(50); expect(value).toBe(5);
        g.setCurrentTime(100); expect(value).toBe(50);
    });
    test("seeking a running group beyond its end completes it once", () => {
        const a = make(100), b = make(200), g = group(a, b), done = vi.fn(); g.finished.connect(done);
        g.start(); g.setCurrentTime(1000); expect(done).toHaveBeenCalledOnce(); expect(g.currentTime()).toBe(300);
        expect(b.currentValue()).toBe(1); expect(frames.size).toBe(0);
    });
    test("negative seek clamps to zero and invalid times leave members unchanged", () => {
        const a = make(), g = group(a); g.setCurrentTime(-10); expect(g.currentTime()).toBe(0);
        for (const time of [NaN, Infinity]) expect(() => g.setCurrentTime(time)).toThrow(RangeError);
        expect(a.currentValue()).toBe(0);
    });
    test("a parallel group can be a sequence member", () => {
        const a = make(100), b = make(200), parallel = new CParallelAnimationGroup(); animations.push(parallel);
        parallel.addAnimation(a); parallel.addAnimation(b); const c = make(100), g = group(parallel, c);
        expect(g.duration()).toBe(300); g.start(); tick(100);
        expect(a.currentValue()).toBe(1); expect(b.currentValue()).toBe(0.5); expect(c.currentValue()).toBe(0);
        tick(250); expect(c.currentValue()).toBe(0.5); expect(frames.size).toBe(1);
        tick(300); expect(frames.size).toBe(0);
    });
    test("a sequence can be a parallel group member", () => {
        const a = make(100), b = make(200), seq = group(a, b), c = make(400);
        const parallel = new CParallelAnimationGroup(); animations.push(parallel); parallel.addAnimation(seq); parallel.addAnimation(c);
        parallel.start(); tick(150); expect(b.currentValue()).toBe(0.25); expect(c.currentValue()).toBe(0.375);
        tick(400); expect(seq.state()).toBe(CAnimationState.Stopped); expect(parallel.state()).toBe(CAnimationState.Stopped);
    });
    test("nested sequences carry time across both levels", () => {
        const a = make(100), b = make(200), inner = group(a, b), c = make(100), outer = group(inner, c);
        outer.start(); tick(250); expect(b.currentValue()).toBe(0.75); expect(c.currentValue()).toBe(0);
        tick(350); expect(c.currentValue()).toBe(0.5); tick(400); expect(frames.size).toBe(0);
    });
    test("pausing nested groups releases every frame", () => {
        const a = make(100), b = make(200), inner = new CParallelAnimationGroup(); animations.push(inner);
        inner.addAnimation(a); inner.addAnimation(b); const outer = group(inner); outer.start(); tick(50); outer.pause();
        expect(a.state()).toBe(CAnimationState.Paused); expect(b.state()).toBe(CAnimationState.Paused); expect(frames.size).toBe(0);
        tick(1000); outer.resume(); tick(1100); expect(b.currentValue()).toBe(0.75);
    });
    test("an unchanging nested parallel member can reapply its target values", () => {
        const a = make(100); a.setStartValue(7); a.setEndValue(7); let value = -1;
        a.valueChanged.connect(v => { value = v; }); const parallel = new CParallelAnimationGroup(); animations.push(parallel);
        parallel.addAnimation(a); const g = group(parallel); g.start(); expect(value).toBe(7);
    });
    test("destroying the sequence destroys members and cancels the active clock", () => {
        const a = make(), b = make(), g = group(a, b); g.start(); tick(20); g.destroy();
        expect(a.isDestroyed()).toBe(true); expect(b.isDestroyed()).toBe(true); expect(g.currentAnimation()).toBeNull();
        expect(frames.size).toBe(0);
    });
    test("destroying a current member stops the sequence and clears the current reference", () => {
        const a = make(), b = make(), g = group(a, b); g.start(); tick(20); a.destroy();
        expect(g.state()).toBe(CAnimationState.Stopped); expect(g.currentAnimation()).toBeNull();
        expect(g.animationCount()).toBe(1); expect(frames.size).toBe(0);
    });
    test("taking a member restores standalone playback", () => {
        const a = make(), b = make(), g = group(a, b); g.start(); tick(20); g.stop();
        expect(g.takeAnimation(0)).toBe(a); expect(a.parent()).toBeNull(); expect(g.currentAnimation()).toBeNull();
        a.start(); tick(70); expect(a.currentValue()).toBe(0.5); expect(frames.size).toBe(1);
    });
    test("membership changes remain forbidden while running or paused", () => {
        const a = make(), g = group(a); g.start(); expect(() => g.addAnimation(make())).toThrow();
        g.pause(); expect(() => g.takeAnimation(0)).toThrow(); expect(() => g.clear()).toThrow();
    });
    test("inherited ownership validation prevents cycles and double ownership", () => {
        const a = make(), inner = group(a), outer = group(inner);
        expect(() => inner.addAnimation(outer)).toThrow(); expect(() => group().addAnimation(a)).toThrow();
        expect(() => outer.addAnimation(outer)).toThrow();
    });
    test("clear removes the current reference and destroys members", () => {
        const a = make(), g = group(a); g.setCurrentTime(10); g.clear();
        expect(g.currentAnimation()).toBeNull(); expect(a.isDestroyed()).toBe(true); expect(g.duration()).toBe(0);
    });
    test("an owner destroys the nested sequence", () => {
        const owner = new CObject(), g = new CSequentialAnimationGroup(owner); animations.push(g);
        const a = make(); g.addAnimation(a); g.start(); owner.destroy(); expect(g.isDestroyed()).toBe(true);
        expect(a.isDestroyed()).toBe(true); expect(frames.size).toBe(0);
    });
    test("a finished handler can repeat the entire sequence", () => {
        const a = make(100), b = make(100), g = group(a, b); let count = 0;
        g.finished.connect(() => { if (++count === 1) g.start(); }); g.start(); tick(200);
        expect(g.state()).toBe(CAnimationState.Running); expect(g.currentAnimation()).toBe(a); expect(a.currentValue()).toBe(0);
        tick(400); expect(count).toBe(2); expect(frames.size).toBe(0);
    });
    test("a member finished handler may stop before the next member starts", () => {
        const a = make(100), b = make(200), g = group(a, b), done = vi.fn(); g.finished.connect(done);
        a.finished.connect(() => g.stop()); g.start(); tick(100);
        expect(g.state()).toBe(CAnimationState.Stopped); expect(b.currentTime()).toBe(0);
        expect(b.state()).toBe(CAnimationState.Stopped); expect(done).not.toHaveBeenCalled(); expect(frames.size).toBe(0);
    });
    test("a member callback can restart the sequence without a stale transition", () => {
        const a = make(100), b = make(200), g = group(a, b); let count = 0;
        a.finished.connect(() => { if (++count === 1) g.start(); }); g.start(); tick(100);
        expect(g.currentAnimation()).toBe(a); expect(a.currentValue()).toBe(0); expect(b.currentTime()).toBe(0);
        tick(150); expect(a.currentValue()).toBe(0.5);
    });
    test("currentAnimationChanged may stop navigation before a new member starts", () => {
        const a = make(100), b = make(200), g = group(a, b);
        g.currentAnimationChanged.connect(animation => { if (animation === b) g.stop(); });
        g.start(); tick(100); expect(g.state()).toBe(CAnimationState.Stopped); expect(b.currentTime()).toBe(0);
        expect(frames.size).toBe(0);
    });
    test("pausing at an initial zero-duration member can resume into the next member", () => {
        const a = make(0), b = make(100), g = group(a, b); a.finished.connect(() => g.pause());
        g.start(); expect(g.state()).toBe(CAnimationState.Paused); expect(frames.size).toBe(0);
        tick(1000); g.resume(); tick(1050); expect(b.currentValue()).toBe(0.5);
    });
    test("the sequence still controls members after a containing group releases its clock", () => {
        const a = make(100), b = make(200), g = group(a, b); g.setExternalClock(true); g.start();
        g.setCurrentTime(50); g.setExternalClock(false); tick(25);
        expect(a.currentTime()).toBe(75); expect(b.currentTime()).toBe(0); expect(frames.size).toBe(1);
    });
    test("duration overflow is rejected before transferring ownership", () => {
        const a = make(Number.MAX_VALUE), b = make(Number.MAX_VALUE), g = group(a);
        expect(() => g.addAnimation(b)).toThrow(RangeError); expect(b.parent()).toBeNull(); expect(g.animationCount()).toBe(1);
    });
    test("invalid duration changes prevent start without leaving clocks", () => {
        const a = make(100), b = make(200), g = group(a, b); a.setDuration(Number.MAX_VALUE); b.setDuration(Number.MAX_VALUE);
        expect(() => g.start()).toThrow(RangeError); expect(g.state()).toBe(CAnimationState.Stopped); expect(frames.size).toBe(0);
    });
    test("explicit value reapplication preserves time and does not schedule a frame", () => {
        const a = make(); a.setCurrentTime(50); const changed = vi.fn(); a.valueChanged.connect(changed);
        a.applyCurrentValue(); a.applyCurrentValue(); expect(changed).toHaveBeenCalledTimes(2);
        expect(changed).toHaveBeenCalledWith(0.5); expect(a.currentTime()).toBe(50);
        expect(a.state()).toBe(CAnimationState.Stopped); expect(frames.size).toBe(0);
        a.destroy(); a.applyCurrentValue(); expect(changed).toHaveBeenCalledTimes(2);
    });
    test("a supplied clock can be released back to standalone playback", () => {
        const a = make(); a.setExternalClock(true); a.start(); expect(frames.size).toBe(0);
        a.setCurrentTime(50); expect(a.currentValue()).toBe(0.5);
        a.setExternalClock(false); expect(frames.size).toBe(1); tick(25); expect(a.currentValue()).toBe(0.75);
    });
    test("taking a nested group restores its native member clocks", () => {
        const a = make(100), b = make(200), inner = new CParallelAnimationGroup(); animations.push(inner);
        inner.addAnimation(a); inner.addAnimation(b); const outer = group(inner); outer.start(); tick(20); outer.stop();
        outer.takeAnimation(0); inner.start(); tick(70);
        expect(a.currentValue()).toBe(0.5); expect(b.currentValue()).toBe(0.25); expect(frames.size).toBe(1);
    });
    test("runtime duration overflow stops the sequence before reporting the error", () => {
        const a = make(100), b = make(200), g = group(a, b); g.start(); tick(20);
        a.setDuration(Number.MAX_VALUE); b.setDuration(Number.MAX_VALUE);
        expect(() => g.duration()).toThrow(RangeError); expect(g.state()).toBe(CAnimationState.Stopped);
        expect(frames.size).toBe(0);
    });

    test("repeats a sequence without manually restarting it", () => {
        const a = make(), b = make(), g = group(a, b); g.setLoopCount(2); const done = vi.fn(); g.finished.connect(done);
        g.start(); tick(250); expect(g.currentLoop()).toBe(1); expect(g.currentAnimation()).toBe(a); expect(a.currentValue()).toBe(.5);
        tick(400); expect(b.currentValue()).toBe(1); expect(done).toHaveBeenCalledOnce(); expect(frames.size).toBe(0);
    });
    test("backward sequences activate members in reverse insertion order", () => {
        const a = make(), b = make(), g = group(a, b); g.setDirection(CAnimationDirection.Backward); g.start();
        expect(g.currentAnimation()).toBe(b); expect(b.currentValue()).toBe(1); expect(a.state()).toBe(CAnimationState.Stopped);
        tick(50); expect(b.currentValue()).toBe(.5); tick(100); expect(g.currentAnimation()).toBe(a); expect(a.currentValue()).toBe(1);
        tick(150); expect(a.currentValue()).toBe(.5); tick(200); expect(a.currentValue()).toBe(0); expect(frames.size).toBe(0);
    });
    test("auto reverse sequence joins the last endpoint then runs the earlier members", () => {
        const a = make(), b = make(), g = group(a, b); g.setLoopCount(2); g.setAutoReverse(true); g.start();
        tick(200); expect(g.currentAnimation()).toBe(b); expect(b.currentValue()).toBe(1);
        tick(250); expect(b.currentValue()).toBe(.5); tick(300); expect(g.currentAnimation()).toBe(a);
        tick(350); expect(a.currentValue()).toBe(.5); tick(400); expect(a.currentValue()).toBe(0); expect(g.state()).toBe(CAnimationState.Stopped);
    });
    test("member loops contribute their total time to a sequence", () => {
        const a = make(), b = make(); a.setLoopCount(3); const g = group(a, b); expect(g.duration()).toBe(400);
        g.start(); tick(250); expect(g.currentAnimation()).toBe(a); expect(a.currentValue()).toBe(.5);
        tick(350); expect(g.currentAnimation()).toBe(b); expect(b.currentValue()).toBe(.5);
    });
    test("nested parallel groups can play backwards inside a sequence", () => {
        const a = make(), b = make(), tail = make(); const parallel = new CParallelAnimationGroup(); animations.push(parallel);
        parallel.addAnimation(a); parallel.addAnimation(b); const g = group(parallel, tail); g.setDirection(CAnimationDirection.Backward); g.start();
        tick(150); expect(g.currentAnimation()).toBe(parallel); expect(a.currentValue()).toBe(.5); expect(b.currentValue()).toBe(.5);
        tick(200); expect(a.currentValue()).toBe(0); expect(b.currentValue()).toBe(0); expect(frames.size).toBe(0);
    });
    test("a backward sequence can be nested in a backwards parallel group", () => {
        const a = make(), b = make(), sequence = group(a, b); sequence.setDirection(CAnimationDirection.Backward);
        const parent = new CParallelAnimationGroup(); animations.push(parent); parent.addAnimation(sequence); parent.setDirection(CAnimationDirection.Backward);
        parent.start(); tick(50); expect(sequence.currentAnimation()).toBe(a); expect(a.currentValue()).toBe(.5);
        tick(200); expect(b.currentValue()).toBe(1); expect(frames.size).toBe(0);
    });
    test("long alternating sequence frames settle in the correct member and loop", () => {
        const a = make(), b = make(), g = group(a, b); g.setLoopCount(1000); g.setAutoReverse(true); g.start(); tick(199950);
        expect(g.currentLoop()).toBe(999); expect(g.currentAnimation()).toBe(a); expect(a.currentValue()).toBe(.5);
    });
    test("pausing a reversed sequence freezes all nested members", () => {
        const a = make(), b = make(), g = group(a, b); g.setDirection(CAnimationDirection.Backward); g.start(); tick(50); g.pause(); tick(1000);
        expect(b.currentValue()).toBe(.5); expect(frames.size).toBe(0); g.resume(); tick(1025); expect(b.currentValue()).toBe(.25);
    });
    test("backwards zero-duration members complete in reverse order", () => {
        const a = make(0), b = make(0), c = make(), g = group(a, b, c); const events: string[] = [];
        a.finished.connect(() => events.push("a")); b.finished.connect(() => events.push("b")); g.setDirection(CAnimationDirection.Backward);
        g.start(); tick(100); expect(events).toEqual(["b", "a"]); expect(g.currentAnimation()).toBe(a);
    });
    test("zero-loop members are omitted from the sequence", () => {
        const a = make(), b = make(); a.setLoopCount(0); const done = vi.fn(); a.finished.connect(done); const g = group(a, b);
        g.start(); expect(g.currentAnimation()).toBe(b); tick(100); expect(done).not.toHaveBeenCalled();
    });
    test("an endless containing sequence can repeat finite stages", () => {
        const a = make(), b = make(), g = group(a, b); g.setLoopCount(-1); g.setAutoReverse(true); g.start(); tick(350);
        expect(g.currentLoop()).toBe(1); expect(g.currentAnimation()).toBe(a); expect(a.currentValue()).toBe(.5); expect(frames.size).toBe(1);
    });
    test("a loop callback can stop a sequence before starting a fresh member", () => {
        const a = make(), b = make(), g = group(a, b); g.setLoopCount(3); g.currentLoopChanged.connect(() => g.stop());
        g.start(); tick(250); expect(g.state()).toBe(CAnimationState.Stopped); expect(a.state()).toBe(CAnimationState.Stopped); expect(frames.size).toBe(0);
    });

});
