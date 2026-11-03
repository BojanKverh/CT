import { describe, expect, test } from "vitest";
import { CRegularExpressionValidator } from "../../src/util/CRegularExpressionValidator.js";
import { CValidator, CValidatorState } from "../../src/util/CValidator.js";

const { Acceptable, Intermediate, Invalid } = CValidatorState;

describe("CRegularExpressionValidator", () => {
    test("accepts arbitrary text by default", () => {
        const v = new CRegularExpressionValidator();
        expect(v instanceof CValidator).toBe(true);
        for (const input of ["", "Hello", "čšž", "a\nb", "😀"]) expect(v.validate(input)).toBe(Acceptable);
    });
    test("validates complete postal codes and incomplete prefixes", () => {
        const v = new CRegularExpressionValidator(/[0-9]{4}/);
        for (const input of ["", "1", "12", "123"]) expect(v.validate(input)).toBe(Intermediate);
        expect(v.validate("1234")).toBe(Acceptable);
        for (const input of ["12345", "123x", "x", " 1234", "1234\n"]) expect(v.validate(input)).toBe(Invalid);
    });
    test("distinguishes a product code prefix from a wrong character", () => {
        const v = new CRegularExpressionValidator(/[A-Z]{2}-[0-9]{4}/);
        for (const input of ["", "A", "AB", "AB-", "AB-12"]) expect(v.validate(input)).toBe(Intermediate);
        expect(v.validate("AB-1234")).toBe(Acceptable);
        for (const input of ["AB-X", "A-", "ab-1234", "AB1234", "AB-12345"]) expect(v.validate(input)).toBe(Invalid);
    });
    test("case insensitive matching follows JavaScript character semantics", () => {
        const v = new CRegularExpressionValidator(/[a-zčšž]+/i);
        expect(v.validate("ČEBELAR")).toBe(Acceptable); expect(v.validate("Č1")).toBe(Invalid);
    });
    test("requires the whole value even for an unanchored pattern", () => {
        const v = new CRegularExpressionValidator(/cat/);
        expect(v.validate("cat")).toBe(Acceptable); expect(v.validate("ca")).toBe(Intermediate);
        expect(v.validate("a cat")).toBe(Invalid); expect(v.validate("cats")).toBe(Invalid);
    });
    test("outer anchors are accepted but do not allow a trailing newline", () => {
        const v = new CRegularExpressionValidator(/^abc$/m);
        expect(v.validate("abc")).toBe(Acceptable); expect(v.validate("ab")).toBe(Intermediate);
        expect(v.validate("abc\n")).toBe(Invalid); expect(v.validate("\nabc")).toBe(Invalid);
    });
    test("escaped anchors remain literal characters", () => {
        const v = new CRegularExpressionValidator(/\^a\$/);
        expect(v.validate("^a")).toBe(Intermediate); expect(v.validate("^a$")).toBe(Acceptable);
    });
    test("empty patterns accept only empty text", () => {
        const v = new CRegularExpressionValidator(/(?:)/);
        expect(v.validate("")).toBe(Acceptable); expect(v.validate("a")).toBe(Invalid);
    });
    test("alternatives retain all viable branches", () => {
        const v = new CRegularExpressionValidator(/cat|car|dog/);
        expect(v.validate("ca")).toBe(Intermediate); expect(v.validate("car")).toBe(Acceptable);
        expect(v.validate("do")).toBe(Intermediate); expect(v.validate("cab")).toBe(Invalid);
    });
    test("an acceptable short branch takes priority over an incomplete longer branch", () => {
        const v = new CRegularExpressionValidator(/a|abc/);
        expect(v.validate("a")).toBe(Acceptable); expect(v.validate("ab")).toBe(Intermediate);
    });
    test("ordinary and noncapturing groups support concatenated alternatives", () => {
        const v = new CRegularExpressionValidator(/(AB|CD)-(?:one|two)/);
        expect(v.validate("CD-t")).toBe(Intermediate); expect(v.validate("AB-one")).toBe(Acceptable);
        expect(v.validate("AD-one")).toBe(Invalid);
    });
    test("optional groups can be skipped", () => {
        const v = new CRegularExpressionValidator(/ab(?:cd)?e/);
        expect(v.validate("abe")).toBe(Acceptable); expect(v.validate("abcd")).toBe(Intermediate);
        expect(v.validate("abcde")).toBe(Acceptable);
    });
    test("star and plus support empty and repeated text", () => {
        expect(new CRegularExpressionValidator(/a*/).validate("")).toBe(Acceptable);
        const v = new CRegularExpressionValidator(/a+b/);
        expect(v.validate("")).toBe(Intermediate); expect(v.validate("aaaa")).toBe(Intermediate);
        expect(v.validate("aaaab")).toBe(Acceptable); expect(v.validate("b")).toBe(Invalid);
    });
    test("bounded and open repetitions respect their limits", () => {
        const v = new CRegularExpressionValidator(/a{2,4}b{2,}/);
        expect(v.validate("aab")).toBe(Intermediate); expect(v.validate("aabb")).toBe(Acceptable);
        expect(v.validate("aaaabbbbb")).toBe(Acceptable); expect(v.validate("aaaaab")).toBe(Invalid);
    });
    test("zero repetitions and nullable cycles terminate", () => {
        expect(new CRegularExpressionValidator(/a{0}/).validate("")).toBe(Acceptable);
        const v = new CRegularExpressionValidator(/(?:a?)*b/);
        expect(v.validate("aaa")).toBe(Intermediate); expect(v.validate("aaab")).toBe(Acceptable);
        expect(v.validate("aaac")).toBe(Invalid);
    });
    test("lazy quantifiers do not change the accepted language", () => {
        const v = new CRegularExpressionValidator(/a+?b{1,2}?c??/);
        expect(v.validate("aaa")).toBe(Intermediate); expect(v.validate("aaabbc")).toBe(Acceptable);
    });
    test("predefined character classes and negated classes work", () => {
        const v = new CRegularExpressionValidator(/\d\s\w[^0-9]/);
        expect(v.validate("1 A!")).toBe(Acceptable); expect(v.validate("1 A")).toBe(Intermediate);
        expect(v.validate("1 A2")).toBe(Invalid);
        expect(new CRegularExpressionValidator(/\D\S\W/).validate("xA!")).toBe(Acceptable);
    });
    test("dot respects the dotAll flag", () => {
        expect(new CRegularExpressionValidator(/a.b/).validate("a\nb")).toBe(Invalid);
        expect(new CRegularExpressionValidator(/a.b/s).validate("a\nb")).toBe(Acceptable);
    });
    test("escaped class delimiters are handled by native character matching", () => {
        const v = new CRegularExpressionValidator(/[\]\\-]{2}/);
        expect(v.validate("]\\")).toBe(Acceptable); expect(v.validate("-")).toBe(Intermediate);
    });
    test("hexadecimal, control and whitespace escapes work", () => {
        const v = new CRegularExpressionValidator(/\x41\u0042\cC\0\t\n\r\f\v/);
        expect(v.validate("AB\x03\0\t\n\r\f\v")).toBe(Acceptable);
    });
    test("escaped metacharacters remain literal", () => {
        const v = new CRegularExpressionValidator(/\(a\)\+\?\.\*\{\}\|/);
        expect(v.validate("(a)+?.*{}|")).toBe(Acceptable);
    });
    test("astral literals follow non-Unicode UTF-16 prefix semantics", () => {
        const v = new CRegularExpressionValidator(/😀!/);
        expect(v.validate("\ud83d")).toBe(Intermediate); expect(v.validate("😀")).toBe(Intermediate);
        expect(v.validate("😀!")).toBe(Acceptable); expect(v.validate("😁!")).toBe(Invalid);
    });
    test("impossible character classes do not produce false intermediate states", () => {
        const v = new CRegularExpressionValidator(/a[^\s\S]b/);
        expect(v.validate("")).toBe(Invalid); expect(v.validate("a")).toBe(Invalid);
        expect(new CRegularExpressionValidator(/[]/).validate("")).toBe(Invalid);
        expect(new CRegularExpressionValidator(/[^]/).validate("\n")).toBe(Acceptable);
    });
    test("an optional impossible branch can be skipped", () => {
        const v = new CRegularExpressionValidator(/a(?:[])?b/);
        expect(v.validate("a")).toBe(Intermediate); expect(v.validate("ab")).toBe(Acceptable);
    });
    test("global and sticky flags do not leak lastIndex state", () => {
        const expression = /ab/gy; expression.lastIndex = 99; const v = new CRegularExpressionValidator(expression);
        for (let i = 0; i < 4; ++i) { expect(v.validate("ab")).toBe(Acceptable); expect(v.validate("a")).toBe(Intermediate); }
        expect(expression.lastIndex).toBe(99); expect(v.regularExpression().flags).toBe("gy");
    });
    test("expression getters return independent snapshots", () => {
        const expression = /ab/i, v = new CRegularExpressionValidator(expression), snapshot = v.regularExpression();
        expect(snapshot === expression).toBe(false); snapshot.lastIndex = 50;
        expect(v.regularExpression().lastIndex).toBe(0); expect(v.validate("AB")).toBe(Acceptable);
    });
    test("a setter replaces both the full language and partial matching program", () => {
        const v = new CRegularExpressionValidator(/ab/); v.setRegularExpression(/\d{2}/);
        expect(v.validate("1")).toBe(Intermediate); expect(v.validate("12")).toBe(Acceptable); expect(v.validate("ab")).toBe(Invalid);
    });
    test("unsupported constructs are rejected instead of guessed", () => {
        for (const expression of [/(?=a)a/, /(?!a)b/, /(?<=a)b/, /(a)\1/, /\ba/, /a\B/, /(?<name>a)/, /a^b/, /a$b/, /\p{L}+/u])
            expect(() => new CRegularExpressionValidator(expression)).toThrow(SyntaxError);
    });
    test("invalid or oversized configuration preserves the old validator", () => {
        const v = new CRegularExpressionValidator(/ab/);
        expect(() => v.setRegularExpression(/(?=x)x/)).toThrow(SyntaxError);
        expect(() => v.setRegularExpression(/a{1025}/)).toThrow(RangeError);
        expect(v.regularExpression().source).toBe("ab"); expect(v.validate("a")).toBe(Intermediate);
    });
    test("non-RegExp arguments are rejected", () => {
        expect(() => new CRegularExpressionValidator("abc" as unknown as RegExp)).toThrow(TypeError);
        const v = new CRegularExpressionValidator(/ab/);
        expect(() => v.setRegularExpression(null as unknown as RegExp)).toThrow(TypeError);
        expect(v.validate("ab")).toBe(Acceptable);
    });
    test("state and nesting limits reject excessive compilation", () => {
        expect(() => new CRegularExpressionValidator(/a{1024}b{1024}/)).toThrow(RangeError);
        expect(() => new CRegularExpressionValidator(new RegExp("(".repeat(65) + "a" + ")".repeat(65)))).toThrow(RangeError);
    });
    test("long ambiguous prefixes do not require recursive backtracking", () => {
        const v = new CRegularExpressionValidator(/(a+)+b/);
        expect(v.validate("a".repeat(2000))).toBe(Intermediate);
        expect(v.validate("a".repeat(2000) + "!")).toBe(Invalid);
    });
    test("bounded languages agree with native full matches and independently enumerated prefixes", () => {
        const words = [""]; let frontier = [""];
        for (let length = 1; length <= 4; ++length) {
            frontier = frontier.flatMap(prefix => ["a", "b", "c"].map(char => prefix + char)); words.push(...frontier);
        }
        for (const pattern of [/a(b|c)?/, /(ab|ba){1,2}/, /[ab]{1,3}/, /(?:a?b){1,2}/, /a[]|b/, /a{0}/, /[^ab]{1,2}/, /[a-c]{2}/]) {
            const native = new RegExp(`^(?:${pattern.source})(?![\\s\\S])`);
            const accepted = words.filter(word => native.test(word)); const validator = new CRegularExpressionValidator(pattern);
            for (const word of words) {
                const expected = native.test(word) ? Acceptable : accepted.some(candidate => candidate.startsWith(word)) ? Intermediate : Invalid;
                expect(validator.validate(word)).toBe(expected);
            }
        }
    });
});
