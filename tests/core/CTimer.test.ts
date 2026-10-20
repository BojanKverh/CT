import { afterEach, describe, expect, test, vi } from "vitest";
import { CObject } from "../../src/core/CObject.js";
import { CTimer } from "../../src/core/CTimer.js";

describe("CTimer lifetime", () => {
    afterEach(() => { vi.useRealTimers(); });

    test("destroy cancels a repeating timer and detaches it", () => {
        vi.useFakeTimers();
        const parent = new CObject();
        const timer = new CTimer(parent);
        const timeout = vi.fn(); timer.timeout.connect(timeout); timer.start(10);
        timer.destroy();
        expect(timer.isActive()).toBe(false);
        expect(timer.remainingTime()).toBe(-1);
        expect(parent.children()).not.toContain(timer);
        vi.advanceTimersByTime(100);
        expect(timeout).not.toHaveBeenCalled();
    });
    test("destroy cancels a single-shot timer", () => {
        vi.useFakeTimers();
        const timer = new CTimer(); timer.setSingleShot(true);
        const timeout = vi.fn(); timer.timeout.connect(timeout); timer.start(10);
        timer.destroy(); vi.advanceTimersByTime(100);
        expect(timeout).not.toHaveBeenCalled();
    });
    test("destroying the parent stops its timer children", () => {
        vi.useFakeTimers();
        const parent = new CObject(); const timer = new CTimer(parent);
        const timeout = vi.fn(); timer.timeout.connect(timeout); timer.start(10);
        parent.destroy(); vi.advanceTimersByTime(100);
        expect(timer.isActive()).toBe(false); expect(timeout).not.toHaveBeenCalled();
    });
    test("destroy inside a timeout prevents the next repetition", () => {
        vi.useFakeTimers();
        const timer = new CTimer(); const timeout = vi.fn();
        timer.timeout.connect(() => { timeout(); timer.destroy(); });
        timer.start(10); vi.advanceTimersByTime(100);
        expect(timeout).toHaveBeenCalledOnce(); expect(timer.isActive()).toBe(false);
    });
    test("destroy is harmless when repeated or inactive", () => {
        vi.useFakeTimers();
        const timer = new CTimer(); timer.destroy(); timer.destroy();
        expect(timer.isActive()).toBe(false); expect(vi.getTimerCount()).toBe(0);
    });
});
