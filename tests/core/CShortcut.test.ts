import { describe, expect, test } from "vitest";
import { CObject } from "../../src/core/CObject.js";
import { CShortcut } from "../../src/core/CShortcut.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CEventType } from "../../src/events/CEvent.js";
import type { CWidget } from "../../src/widgets/CWidget.js";

describe("CShortcut", () => {
    function shortcut(key: string): CShortcut {
        // Ownership and matching need no canvas or running application.
        return new CShortcut(key, new CObject() as CWidget);
    }
    function event(key: string, ctrl = true, shift = false, alt = false, meta = false,
        code = "", altGraph = false): CKeyEvent {
        return new CKeyEvent(CEventType.KeyPress, key, ctrl, shift, alt, meta, code, altGraph);
    }
    test("normalizes modifier order and case", () => {
        expect(shortcut("shift+control+s").key()).toBe("Ctrl+Shift+S");
    });
    test("matches a key combination", () => {
        expect(shortcut("Ctrl+S").matches(event("s"))).toBe(true);
    });
    test("requires an exact set of modifiers", () => {
        const value = shortcut("Ctrl+S");
        expect(value.matches(event("s", false))).toBe(false);
        expect(value.matches(event("s", true, true))).toBe(false);
        expect(value.matches(event("s", true, false, true))).toBe(false);
        expect(value.matches(event("s", true, false, false, true))).toBe(false);
    });
    test("disabled shortcuts do not match", () => {
        const value = shortcut("Ctrl+S"); value.setEnabled(false);
        expect(value.matches(event("s"))).toBe(false);
        value.setEnabled(); expect(value.matches(event("s"))).toBe(true);
    });
    test("empty keys disable matching", () => {
        const value = shortcut("");
        expect(value.matches(event("s"))).toBe(false);
        value.setKey("Ctrl+S"); expect(value.matches(event("s"))).toBe(true);
    });
    test("supports Meta, Alt and function keys", () => {
        expect(shortcut("Cmd+S").matches(event("s", false, false, false, true))).toBe(true);
        expect(shortcut("Alt+F4").matches(event("F4", false, false, true))).toBe(true);
    });
    test("supports arrow and space names emitted by the key sequence editor", () => {
        expect(shortcut("Ctrl+Left").matches(event("ArrowLeft"))).toBe(true);
        expect(shortcut("Ctrl+Space").matches(event(" "))).toBe(true);
    });
    test("supports a literal plus key", () => {
        expect(shortcut("Ctrl++").matches(event("+"))).toBe(true);
        expect(shortcut("+").matches(event("+", false))).toBe(true);
    });
    test("uses physical letter and digit codes like CKeySequenceEdit", () => {
        expect(shortcut("Ctrl+Q").matches(event("a", true, false, false, false, "KeyQ"))).toBe(true);
        expect(shortcut("Ctrl+Shift+1").matches(event("!", true, true, false, false, "Digit1"))).toBe(true);
    });
    test("AltGraph text input cannot activate a shortcut", () => {
        expect(shortcut("Ctrl+Alt+Q").matches(event("q", true, false, true, false, "KeyQ", true))).toBe(false);
    });
    test("modifier-only and multi-chord sequences are rejected", () => {
        for (const key of ["Ctrl", "Ctrl+", "Ctrl+Ctrl+S", "Ctrl+K, Ctrl+C", "Wrong+S"])
            expect(() => shortcut(key)).toThrow(RangeError);
    });
    test("a rejected assignment retains the existing key", () => {
        const value = shortcut("Ctrl+S");
        expect(() => value.setKey("Wrong+S")).toThrow(RangeError);
        expect(value.key()).toBe("Ctrl+S");
    });
    test("destroy detaches a shortcut from its owner", () => {
        const owner = new CObject();
        const value = new CShortcut("Ctrl+S", owner as CWidget);
        expect(owner.children()).toContain(value);
        value.destroy(); expect(owner.children()).not.toContain(value);
    });
});
