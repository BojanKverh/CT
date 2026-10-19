import { describe, expect, test } from "vitest";
import { previousWordPosition, nextWordPosition } from "../../src/util/CTextWordBoundary.js";

describe("word boundaries", () => {
    test("moves right from inside words and across whitespace", () => {
        expect(nextWordPosition("one   two", 1)).toBe(6);
        expect(nextWordPosition("one   two", 4)).toBe(6);
    });
    test("moves left from inside words and across whitespace", () => {
        expect(previousWordPosition("one   two", 8)).toBe(6);
        expect(previousWordPosition("one   two", 6)).toBe(0);
    });
    test("punctuation forms its own navigation token", () => {
        expect(nextWordPosition("one, two", 0)).toBe(3);
        expect(nextWordPosition("one, two", 3)).toBe(5);
        expect(previousWordPosition("one, two", 5)).toBe(3);
    });
    test("includes Unicode letters numbers marks and underscores in words", () => {
        const text = "ča\u0301j_42 next";
        expect(nextWordPosition(text, 0)).toBe(8);
        expect(previousWordPosition(text, 7)).toBe(0);
    });
    test("does not split emoji surrogate pairs", () => {
        expect(nextWordPosition("A 😀 B", 2)).toBe(5);
        expect(previousWordPosition("A 😀 B", 4)).toBe(2);
    });
    test("treats paragraph breaks as whitespace", () => {
        expect(nextWordPosition("one\n\ttwo", 0)).toBe(5);
        expect(previousWordPosition("one\n\ttwo", 5)).toBe(0);
    });
    test("handles empty text and out of range positions", () => {
        expect(nextWordPosition("", 0)).toBe(0);
        expect(previousWordPosition("", 0)).toBe(0);
        expect(nextWordPosition("one", 999)).toBe(3);
        expect(previousWordPosition("one", -10)).toBe(0);
    });
    test("stops correctly at either end", () => {
        expect(previousWordPosition("one", 0)).toBe(0);
        expect(nextWordPosition("one", 3)).toBe(3);
    });
});
