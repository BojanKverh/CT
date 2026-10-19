import { describe, expect, test } from "vitest";
import { textSelectionRange } from "../../src/util/CTextSelection.js";

describe("textSelectionRange", () => {
    test("selects a Unicode word including combining marks and underscores", () => {
        const text = "Hi čebelar_42 ča\u0301j!";
        const range = textSelectionRange(text, 5);
        expect(text.slice(...range)).toBe("čebelar_42");
        expect(text.slice(...textSelectionRange(text, 16))).toBe("ča\u0301j");
    });
    test("selects whitespace and punctuation runs separately", () => {
        expect(textSelectionRange("abc   !!def", 4)).toEqual([3, 6]);
        expect(textSelectionRange("abc   !!def", 6)).toEqual([6, 8]);
    });
    test("does not split a surrogate pair", () => {
        const text = "A 😀 B";
        expect(textSelectionRange(text, 3)).toEqual([2, 4]);
    });
    test("selects the last word when clicking beyond the text", () => {
        expect(textSelectionRange("one two", 99)).toEqual([4, 7]);
    });
    test("handles empty text", () => {
        expect(textSelectionRange("", 0)).toEqual([0, 0]);
    });
    test("paragraph includes its newline", () => {
        expect(textSelectionRange("one\ntwo\nthree", 5, true)).toEqual([4, 8]);
    });
    test("last paragraph extends to end of text", () => {
        expect(textSelectionRange("one\ntwo", 5, true)).toEqual([4, 7]);
    });
    test("empty first paragraph selects only its newline", () => {
        expect(textSelectionRange("\none", 0, true)).toEqual([0, 1]);
    });
    test("blank middle paragraph selects only its newline", () => {
        expect(textSelectionRange("one\n\ntwo", 4, true)).toEqual([4, 5]);
    });
    test("trailing empty paragraph remains empty", () => {
        expect(textSelectionRange("one\n", 4, true)).toEqual([4, 4]);
    });
});
