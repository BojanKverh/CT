import { describe, expect, test } from "vitest";
import { evaluateNumberExpression, isNumberExpressionInput } from "../../src/util/CNumberExpression.js";

describe("numeric expression parser", () => {
    const cases: [string, number][] = [
        ["(60+40)*1.22", 122], ["(60+40)*1,22", 122],
        ["2+3*4", 14], ["(2+3)*4", 20], ["8/4/2", 1],
        ["10-3-2", 5], ["-(2+3)*2", -10], ["2*-3", -6],
        ["2--3", 5], ["--2", 2], [" .5 + ,5 ", 1],
        ["5.", 5], ["5,", 5], ["  ( 2 + 3 ) / +2  ", 2.5],
        ["((1+2)*(3+4))", 21], ["-0", 0]
    ];
    for (const [expression, value] of cases) {
        test(`evaluates ${expression}`, () => {
            expect(evaluateNumberExpression(expression)).toBe(value);
        });
    }
    for (const expression of ["", " ", ".", "-", "(60+", "()", "2 3", "2(3)",
        "(2+3", "2+3)", "1.2.3", "1,2.3", "2**3", "1/0", "0/0", "1/(2-2)",
        "NaN", "Infinity", "2e3", "Math.random()", "2;3", "1\n2", "9".repeat(309)]) {
        test(`rejects ${JSON.stringify(expression)}`, () => {
            expect(() => evaluateNumberExpression(expression)).toThrow();
        });
    }
    test("accepts unfinished expressions while typing", () => {
        expect(isNumberExpressionInput("(60+")).toBe(true);
        expect(isNumberExpressionInput("-.,()+*/ 123")).toBe(true);
    });
    test("does not accept letters, exponents or line breaks as input", () => {
        for (const expression of ["1e3", "abc", "π", "2^3", "1\n2", "1\t2"])
            expect(isNumberExpressionInput(expression)).toBe(false);
    });
    test("rejects excessively deep parentheses without overflowing the stack", () => {
        expect(() => evaluateNumberExpression("(".repeat(150) + "1" + ")".repeat(150)))
            .toThrow(RangeError);
    });
});
