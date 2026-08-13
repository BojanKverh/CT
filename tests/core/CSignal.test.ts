import { describe, expect, test, vi } from "vitest";
import { CSignal } from "../../src/core/CSignal";

describe("CSignal", () => {
    test("emits a signal to a connected slot", () => {
        const signal = new CSignal();
        const slot = vi.fn();

        signal.connect(slot);
        signal.emit();

        expect(slot).toHaveBeenCalledOnce();
    });

    test("emits a signal to multiple slots in connection order", () => {
        const signal = new CSignal();
        const calls: string[] = [];

        signal.connect(() => calls.push("A"));
        signal.connect(() => calls.push("B"));
        signal.connect(() => calls.push("C"));

        signal.emit();

        expect(calls).toEqual(["A", "B", "C"]);
    });

    test("forwards arguments to connected slots", () => {
        const signal = new CSignal<[number, string]>();
        const slot = vi.fn();

        signal.connect(slot);
        signal.emit(42, "hello");

        expect(slot).toHaveBeenCalledWith(42, "hello");
    });

    test("disconnects a connected slot", () => {
        const signal = new CSignal();
        const slot = vi.fn();

        signal.connect(slot);
        signal.disconnect(slot);
        signal.emit();

        expect(slot).not.toHaveBeenCalled();
    });

    test("ignores disconnecting a slot that is not connected", () => {
        const signal = new CSignal();
        const slot = vi.fn();

        expect(() => {
            signal.disconnect(slot);
        }).not.toThrow();
    });

    test("prevents duplicate connections", () => {
        const signal = new CSignal();
        const slot = vi.fn();

        signal.connect(slot);
        signal.connect(slot);
        signal.connect(slot);

        signal.emit();

        expect(slot).toHaveBeenCalledOnce();
    });

    test("allows a disconnected slot to be connected again", () => {
        const signal = new CSignal();
        const slot = vi.fn();

        signal.connect(slot);
        signal.disconnect(slot);
        signal.connect(slot);

        signal.emit();

        expect(slot).toHaveBeenCalledOnce();
    });

    test("uses connection order after reconnecting a slot", () => {
        const signal = new CSignal();
        const calls: string[] = [];

        const slotA = () => calls.push("A");
        const slotB = () => calls.push("B");

        signal.connect(slotA);
        signal.connect(slotB);

        signal.disconnect(slotA);
        signal.connect(slotA);

        signal.emit();

        expect(calls).toEqual(["B", "A"]);
    });

    test("does not call a slot connected during the current emission", () => {
        const signal = new CSignal();
        const calls: string[] = [];

        const slotB = () => calls.push("B");

        signal.connect(() => {
            calls.push("A");
            signal.connect(slotB);
        });

        signal.emit();

        expect(calls).toEqual(["A"]);

        signal.emit();

        expect(calls).toEqual(["A", "A", "B"]);
    });

    test("finishes the current emission when a slot is disconnected during emission", () => {
        const signal = new CSignal();
        const calls: string[] = [];

        const slotB = () => calls.push("B");

        signal.connect(() => {
            calls.push("A");
            signal.disconnect(slotB);
        });

        signal.connect(slotB);

        signal.emit();

        expect(calls).toEqual(["A", "B"]);

        calls.length = 0;

        signal.emit();

        expect(calls).toEqual(["A"]);
    });

    test("propagates exceptions thrown by slots", () => {
        const signal = new CSignal();

        signal.connect(() => {
            throw new Error("Slot error");
        });

        expect(() => {
            signal.emit();
        }).toThrow("Slot error");
    });
});