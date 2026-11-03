import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CObject } from "../../src/core/CObject.js";
import { CAbstractAnimation, CAnimationState, CAnimationDirection } from "../../src/animation/CAbstractAnimation.js";
import { CVariantAnimation } from "../../src/animation/CVariantAnimation.js";
import { CParallelAnimationGroup } from "../../src/animation/CParallelAnimationGroup.js";

describe("CParallelAnimationGroup", () => {
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

    function group(...members: CAbstractAnimation[]): CParallelAnimationGroup {
        const result = new CParallelAnimationGroup(); animations.push(result);
        for (const member of members) result.addAnimation(member);
        return result;
    }
    test("empty groups are stopped and have zero duration", () => {
        const g = group(); expect(g.state()).toBe(CAnimationState.Stopped); expect(g.duration()).toBe(0);
        expect(g.animationCount()).toBe(0); expect(g.animationAt(0)).toBeNull();
    });
    test("all members start together and share one requested frame", () => {
        const a = make(100), b = make(200), g = group(a, b); g.start();
        expect(a.state()).toBe(CAnimationState.Running); expect(b.state()).toBe(CAnimationState.Running);
        expect(g.state()).toBe(CAnimationState.Running); expect(frames.size).toBe(1);
        tick(50); expect(a.currentValue()).toBe(0.5); expect(b.currentValue()).toBe(0.25);
    });
    test("duration is the longest member's duration", () => {
        const a = make(300), b = make(100), g = group(a, b);
        expect(g.duration()).toBe(300); a.setDuration(50); expect(g.duration()).toBe(100);
    });
    test("group duration cannot be assigned directly", () => {
        const g = group(); expect(() => g.setDuration(400)).toThrow();
    });
    test("small clock differences during member start do not prevent exact completion", () => {
        const a = make(100), b = make(100), g = group(a, b), order: string[] = [];
        a.stateChanged.connect(state => { if (state === CAnimationState.Running) now += 5; });
        b.stateChanged.connect(state => { if (state === CAnimationState.Running) now += 5; });
        a.finished.connect(() => order.push("a")); b.finished.connect(() => order.push("b"));
        g.finished.connect(() => order.push("group")); g.start(); tick(100);
        expect(a.currentValue()).toBe(1); expect(b.currentValue()).toBe(1);
        expect(order).toEqual(["a", "b", "group"]); expect(frames.size).toBe(0);
    });
    test("a shorter member finishes while the group continues", () => {
        const a = make(100), b = make(200), g = group(a, b), done = vi.fn(); g.finished.connect(done);
        g.start(); tick(100); expect(a.state()).toBe(CAnimationState.Stopped);
        expect(b.state()).toBe(CAnimationState.Running); expect(g.state()).toBe(CAnimationState.Running);
        expect(done).not.toHaveBeenCalled(); expect(a.currentValue()).toBe(1);
    });
    test("group finished follows all member completions and is emitted once", () => {
        const a = make(100), b = make(200), g = group(a, b), order: string[] = [];
        a.finished.connect(() => order.push("a")); b.finished.connect(() => order.push("b"));
        g.finished.connect(() => order.push("group")); g.start(); tick(100); tick(200); tick(1000);
        expect(order).toEqual(["a", "b", "group"]); expect(g.currentTime()).toBe(200); expect(frames.size).toBe(0);
    });
    test("long frames finish every member at its exact endpoint", () => {
        const a = make(100), b = make(200), g = group(a, b); a.setEndValue(30); b.setEndValue(-20);
        g.start(); tick(10000); expect(a.currentValue()).toBe(30); expect(b.currentValue()).toBe(-20);
        expect(g.state()).toBe(CAnimationState.Stopped); expect(frames.size).toBe(0);
    });
    test("empty groups finish synchronously without a frame", () => {
        const g = group(), done = vi.fn(); g.finished.connect(done); g.start();
        expect(done).toHaveBeenCalledOnce(); expect(g.state()).toBe(CAnimationState.Stopped); expect(frames.size).toBe(0);
    });
    test("zero-duration members finish immediately while other members continue", () => {
        const a = make(0), b = make(100), g = group(a, b), done = vi.fn(); a.finished.connect(done);
        g.start(); expect(done).toHaveBeenCalledOnce(); expect(a.currentValue()).toBe(1);
        expect(g.state()).toBe(CAnimationState.Running); tick(100); expect(done).toHaveBeenCalledOnce();
    });
    test("groups consisting only of zero-duration members finish synchronously", () => {
        const a = make(0), b = make(0), g = group(a, b), order: string[] = [];
        a.finished.connect(() => order.push("a")); b.finished.connect(() => order.push("b"));
        g.finished.connect(() => order.push("group")); g.start(); expect(order).toEqual(["a", "b", "group"]);
        expect(frames.size).toBe(0);
    });
    test("pause freezes every active member and resume excludes paused time", () => {
        const a = make(100), b = make(200), g = group(a, b); g.start(); tick(40); g.pause();
        expect(a.state()).toBe(CAnimationState.Paused); expect(b.state()).toBe(CAnimationState.Paused);
        expect(frames.size).toBe(0); tick(1040); expect(a.currentValue()).toBe(0.4);
        g.resume(); tick(1080); expect(a.currentValue()).toBe(0.8); expect(b.currentValue()).toBe(0.4);
        expect(g.currentTime()).toBe(80);
    });
    test("resuming does not restart a member that already finished", () => {
        const a = make(50), b = make(200), g = group(a, b), done = vi.fn(); a.finished.connect(done);
        g.start(); tick(100); g.pause(); tick(1000); g.resume(); tick(1050);
        expect(a.currentValue()).toBe(1); expect(a.state()).toBe(CAnimationState.Stopped);
        expect(done).toHaveBeenCalledOnce(); expect(b.currentValue()).toBe(0.75);
    });
    test("stop retains current values and emits no finished signals", () => {
        const a = make(), b = make(200), g = group(a, b), done = vi.fn();
        a.finished.connect(done); b.finished.connect(done); g.finished.connect(done);
        g.start(); tick(40); g.stop(); tick(1000);
        expect(a.currentValue()).toBe(0.4); expect(b.currentValue()).toBe(0.2);
        expect(a.state()).toBe(CAnimationState.Stopped); expect(b.state()).toBe(CAnimationState.Stopped);
        expect(done).not.toHaveBeenCalled(); expect(frames.size).toBe(0);
    });
    test("start restarts running or paused members from zero", () => {
        const a = make(), b = make(200), g = group(a, b); g.start(); tick(50); g.start();
        expect(a.currentValue()).toBe(0); expect(b.currentValue()).toBe(0); expect(frames.size).toBe(1);
        tick(75); g.pause(); g.start(); expect(g.currentTime()).toBe(0); expect(a.currentValue()).toBe(0);
    });
    test("stopped seeking clamps each member to its duration without playing", () => {
        const a = make(100), b = make(200), g = group(a, b), done = vi.fn(); g.finished.connect(done);
        g.setCurrentTime(150); expect(a.currentValue()).toBe(1); expect(b.currentValue()).toBe(0.75);
        expect(g.currentTime()).toBe(150); expect(frames.size).toBe(0); expect(done).not.toHaveBeenCalled();
        g.setCurrentTime(-10); expect(a.currentValue()).toBe(0); expect(b.currentValue()).toBe(0);
    });
    test("running seeking reanchors the group and member clocks", () => {
        const a = make(100), b = make(200), g = group(a, b); g.start(); tick(20); g.setCurrentTime(60); tick(40);
        expect(a.currentValue()).toBe(0.8); expect(b.currentValue()).toBe(0.4); expect(g.currentTime()).toBe(80);
    });
    test("paused seeking updates values without scheduling a frame", () => {
        const a = make(100), b = make(200), g = group(a, b); g.start(); tick(20); g.pause(); g.setCurrentTime(80);
        expect(a.currentValue()).toBe(0.8); expect(b.currentValue()).toBe(0.4); expect(frames.size).toBe(0);
    });
    test("seeking backwards reactivates an already completed member", () => {
        const a = make(50), b = make(200), g = group(a, b); g.start(); tick(100); g.setCurrentTime(20);
        expect(a.state()).toBe(CAnimationState.Running); expect(a.currentValue()).toBe(0.4);
        tick(110); expect(a.currentValue()).toBe(0.6); expect(g.currentTime()).toBe(30);
    });
    test("seeking to the end completes members before the group", () => {
        const a = make(100), b = make(200), g = group(a, b), order: string[] = [];
        a.finished.connect(() => order.push("a")); b.finished.connect(() => order.push("b"));
        g.finished.connect(() => order.push("group")); g.start(); g.setCurrentTime(500);
        expect(order).toEqual(["a", "b", "group"]); expect(g.currentTime()).toBe(200); expect(frames.size).toBe(0);
    });
    test("callbacks see the updated group time during seeking and can pause safely", () => {
        const a = make(), b = make(200), g = group(a, b); let observed = -1;
        a.finished.connect(() => { observed = g.currentTime(); g.pause(); });
        g.start(); g.setCurrentTime(100);
        expect(observed).toBe(100); expect(g.currentTime()).toBe(100); expect(b.currentValue()).toBe(0.5);
        expect(g.state()).toBe(CAnimationState.Paused); expect(frames.size).toBe(0);
    });
    test("invalid seek times do not alter members", () => {
        const a = make(), g = group(a);
        for (const time of [NaN, Infinity]) expect(() => g.setCurrentTime(time)).toThrow(RangeError);
        expect(a.currentValue()).toBe(0);
    });
    test("nested groups start, pause and finish as one group", () => {
        const a = make(100), b = make(200), inner = group(a), outer = group(inner, b);
        expect(outer.duration()).toBe(200); outer.start(); tick(50);
        expect(a.currentValue()).toBe(0.5); expect(b.currentValue()).toBe(0.25); expect(frames.size).toBe(1);
        outer.pause(); expect(inner.state()).toBe(CAnimationState.Paused); expect(a.state()).toBe(CAnimationState.Paused);
        tick(1000); outer.resume(); tick(1150); expect(outer.state()).toBe(CAnimationState.Stopped);
        expect(a.currentValue()).toBe(1); expect(b.currentValue()).toBe(1); expect(frames.size).toBe(0);
    });
    test("nested groups support seeking", () => {
        const a = make(100), b = make(200), g = group(group(a), b); g.setCurrentTime(50);
        expect(a.currentValue()).toBe(0.5); expect(b.currentValue()).toBe(0.25);
    });
    test("adding transfers CObject ownership to the group", () => {
        const parent = new CObject(), a = new CVariantAnimation(parent); animations.push(a); const g = group(a);
        expect(a.parent()).toBe(g); expect(parent.children()).toHaveLength(0);
    });
    test("an animation constructed with the group as parent can be registered", () => {
        const g = group(), a = new CVariantAnimation(g); animations.push(a); g.addAnimation(a);
        expect(g.animationAt(0)).toBe(a); expect(g.children()).toEqual([a]);
    });
    test("adding the same member twice does not duplicate it", () => {
        const a = make(), g = group(a); g.addAnimation(a); expect(g.animationCount()).toBe(1);
        expect(g.animationAt(0)).toBe(a); expect(g.animationAt(-1)).toBeNull(); expect(g.animationAt(10)).toBeNull();
    });
    test("a member cannot belong to two groups", () => {
        const a = make(), first = group(a), second = group(); expect(() => second.addAnimation(a)).toThrow();
        expect(a.parent()).toBe(first); expect(first.animationCount()).toBe(1); expect(second.animationCount()).toBe(0);
    });
    test("cycles and self-insertion are rejected", () => {
        const inner = group(), outer = group(inner);
        expect(() => inner.addAnimation(outer)).toThrow(); expect(() => outer.addAnimation(outer)).toThrow();
    });
    test("a running or destroyed member cannot be added", () => {
        const a = make(), g = group(); a.start(); expect(() => g.addAnimation(a)).toThrow(); a.stop();
        a.destroy(); expect(() => g.addAnimation(a)).toThrow();
    });
    test("membership edits require a stopped group", () => {
        const a = make(), b = make(), g = group(a); g.start();
        expect(() => g.addAnimation(b)).toThrow(); expect(() => g.takeAnimation(0)).toThrow();
        expect(() => g.removeAnimation(a)).toThrow(); expect(() => g.clear()).toThrow();
        g.pause(); expect(() => g.addAnimation(b)).toThrow();
    });
    test("takeAnimation detaches without destroying and allows transfer to another group", () => {
        const a = make(), g = group(a), other = group(); expect(g.takeAnimation(0)).toBe(a);
        expect(a.parent()).toBeNull(); expect(a.isDestroyed()).toBe(false); other.addAnimation(a);
        expect(a.parent()).toBe(other); expect(g.duration()).toBe(0); expect(g.takeAnimation(0)).toBeNull();
    });
    test("removeAnimation detaches only a matching member", () => {
        const a = make(), b = make(), g = group(a); expect(g.removeAnimation(b)).toBe(false);
        expect(g.removeAnimation(a)).toBe(true); expect(a.parent()).toBeNull(); expect(a.isDestroyed()).toBe(false);
    });
    test("clear destroys all owned members", () => {
        const a = make(), b = make(), g = group(a, b); g.clear();
        expect(a.isDestroyed()).toBe(true); expect(b.isDestroyed()).toBe(true);
        expect(g.animationCount()).toBe(0); expect(g.children()).toHaveLength(0); expect(g.duration()).toBe(0);
    });
    test("destroying a member stops the group and removes that member", () => {
        const a = make(), b = make(200), g = group(a, b); g.start(); tick(20); a.destroy();
        expect(g.state()).toBe(CAnimationState.Stopped); expect(b.state()).toBe(CAnimationState.Stopped);
        expect(g.animationCount()).toBe(1); expect(g.animationAt(0)).toBe(b); expect(g.duration()).toBe(200);
        expect(frames.size).toBe(0);
    });
    test("destroying the group destroys its members and cancels all frames", () => {
        const a = make(), b = make(), g = group(a, b), done = vi.fn(); g.finished.connect(done); g.start(); g.destroy();
        expect(a.isDestroyed()).toBe(true); expect(b.isDestroyed()).toBe(true); expect(frames.size).toBe(0);
        expect(done).not.toHaveBeenCalled(); expect(() => g.addAnimation(make())).toThrow();
        g.start(); expect(frames.size).toBe(0);
    });
    test("destroying a CObject owner destroys the whole nested animation tree", () => {
        const owner = new CObject(), g = new CParallelAnimationGroup(owner); animations.push(g);
        const a = make(); g.addAnimation(a); g.start(); owner.destroy();
        expect(g.isDestroyed()).toBe(true); expect(a.isDestroyed()).toBe(true); expect(frames.size).toBe(0);
    });
    test("destroyed is emitted exactly once and does not imply finished", () => {
        const a = make(), gone = vi.fn(), done = vi.fn(); a.destroyed.connect(gone); a.finished.connect(done);
        a.start(); a.destroy(); a.destroy(); expect(gone).toHaveBeenCalledOnce(); expect(done).not.toHaveBeenCalled();
    });
    test("a group finished handler can restart it safely", () => {
        const a = make(), g = group(a); let completions = 0;
        g.finished.connect(() => { if (++completions === 1) g.start(); });
        g.start(); tick(100); expect(g.state()).toBe(CAnimationState.Running); expect(a.currentValue()).toBe(0);
        tick(200); expect(completions).toBe(2); expect(frames.size).toBe(0);
    });
    test("a member finished handler can explicitly stop the group", () => {
        const a = make(50), b = make(200), g = group(a, b), done = vi.fn(); g.finished.connect(done);
        a.finished.connect(() => g.stop()); g.start(); tick(50);
        expect(g.state()).toBe(CAnimationState.Stopped); expect(done).not.toHaveBeenCalled(); expect(frames.size).toBe(0);
    });
    test("a member can restart the whole group at the end of its run", () => {
        const a = make(), g = group(a); let runs = 0;
        a.finished.connect(() => { if (++runs === 1) g.start(); }); g.start(); tick(100);
        expect(g.state()).toBe(CAnimationState.Running); expect(a.currentValue()).toBe(0);
        tick(150); expect(a.currentValue()).toBe(0.5); expect(g.currentTime()).toBe(50);
    });
    test("pausing from a zero-duration member's finished handler does not lose later members", () => {
        const a = make(0), b = make(), g = group(a, b); a.finished.connect(() => g.pause()); g.start();
        expect(g.state()).toBe(CAnimationState.Paused); expect(frames.size).toBe(0);
        g.resume(); tick(50); expect(b.currentValue()).toBe(0.5); tick(100); expect(g.state()).toBe(CAnimationState.Stopped);
    });
    test("shortening member durations while running clamps group time to the new endpoint", () => {
        const a = make(200), g = group(a); g.start(); tick(100); a.setDuration(50); tick(110);
        expect(g.currentTime()).toBe(50); expect(g.state()).toBe(CAnimationState.Stopped); expect(a.currentValue()).toBe(1);
    });
    test("stopping one group leaves an unrelated animation running", () => {
        const a = make(), g = group(a), other = make(200); g.start(); other.start(); g.stop();
        expect(frames.size).toBe(1); tick(100); expect(other.currentValue()).toBe(0.5);
    });
    test("repeats the entire parallel group", () => {
        const a = make(100), b = make(200), g = group(a, b); g.setLoopCount(2); const done = vi.fn(); g.finished.connect(done);
        g.start(); tick(250); expect(g.currentLoop()).toBe(1); expect(a.currentValue()).toBe(.5); expect(b.currentValue()).toBe(.25);
        tick(400); expect(a.currentValue()).toBe(1); expect(b.currentValue()).toBe(1); expect(done).toHaveBeenCalledOnce();
    });
    test("backwards parallel playback retains shorter endpoints until their interval is reached", () => {
        const a = make(100), b = make(200), g = group(a, b); g.setDirection(CAnimationDirection.Backward); g.start();
        expect(a.currentValue()).toBe(1); expect(b.currentValue()).toBe(1); tick(50); expect(a.currentValue()).toBe(1); expect(b.currentValue()).toBe(.75);
        tick(150); expect(a.currentValue()).toBe(.5); expect(b.currentValue()).toBe(.25); tick(200);
        expect(a.currentValue()).toBe(0); expect(b.currentValue()).toBe(0); expect(frames.size).toBe(0);
    });
    test("alternating parallel playback reverses all members on the next leg", () => {
        const a = make(), b = make(), g = group(a, b); g.setLoopCount(2); g.setAutoReverse(true); g.start();
        tick(100); expect(a.currentValue()).toBe(1); tick(150); expect(a.currentValue()).toBe(.5); expect(b.currentValue()).toBe(.5);
        tick(200); expect(a.currentValue()).toBe(0); expect(g.state()).toBe(CAnimationState.Stopped);
    });
    test("member repeat counts contribute to parallel duration", () => {
        const a = make(100), b = make(150); a.setLoopCount(3); const g = group(a, b);
        expect(g.duration()).toBe(300); g.start(); tick(250); expect(a.currentLoop()).toBe(2); expect(a.currentValue()).toBe(.5); expect(b.currentValue()).toBe(1);
    });
    test("parallel members preserve their independently configured direction", () => {
        const a = make(), b = make(); b.setDirection(CAnimationDirection.Backward); const g = group(a, b); g.start(); tick(25);
        expect(a.currentValue()).toBe(.25); expect(b.currentValue()).toBe(.75);
    });
    test("infinite group repetition uses a single cancellable frame", () => {
        const a = make(), g = group(a); g.setLoopCount(-1); g.start(); tick(100000025);
        expect(a.currentValue()).toBe(.25); expect(frames.size).toBe(1); g.destroy(); expect(frames.size).toBe(0);
    });
    test("zero-loop members do not emit value or completion signals", () => {
        const a = make(), b = make(); a.setLoopCount(0); const changed = vi.fn(), done = vi.fn();
        a.valueChanged.connect(changed); a.finished.connect(done); const g = group(a, b); g.start(); tick(100);
        expect(changed).not.toHaveBeenCalled(); expect(done).not.toHaveBeenCalled();
    });
    test("unbounded members are rejected before ownership is transferred", () => {
        const a = make(); a.setLoopCount(-1); const g = group(); expect(() => g.addAnimation(a)).toThrow(RangeError);
        expect(a.parent()).toBeNull(); expect(g.animationCount()).toBe(0);
    });

    test("explicit group reapplication ignores disabled zero-loop members", () => {
        const a = make(), b = make(); a.setLoopCount(0); const changed = vi.fn(); a.valueChanged.connect(changed);
        const g = group(a, b); g.start(); g.applyCurrentValue(); expect(changed).not.toHaveBeenCalled();
    });

});
