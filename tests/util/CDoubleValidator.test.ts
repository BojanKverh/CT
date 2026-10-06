import { describe, expect, test } from "vitest";
import { CDoubleValidator } from "../../src/util/CDoubleValidator.js";
import { CValidatorState } from "../../src/util/CValidator.js";

describe("CDoubleValidator", () => {
	test("has expected defaults", () => {
		const validator = new CDoubleValidator();

		expect(validator.bottom()).toBe(-Number.MAX_VALUE);
		expect(validator.top()).toBe(Number.MAX_VALUE);
		expect(validator.decimals()).toBe(2);
	});

	test("stores constructor settings", () => {
		const validator = new CDoubleValidator(-10.5, 20.75, 3);

		expect(validator.bottom()).toBe(-10.5);
		expect(validator.top()).toBe(20.75);
		expect(validator.decimals()).toBe(3);
	});

	test("normalizes an inverted range", () => {
		const validator = new CDoubleValidator(20.5, 10.5);

		expect(validator.bottom()).toBe(20.5);
		expect(validator.top()).toBe(20.5);
	});

	test("sets bottom, top and range", () => {
		const validator = new CDoubleValidator(-10, 10);

		validator.setBottom(-20.5);
		validator.setTop(30.5);
		expect(validator.bottom()).toBe(-20.5);
		expect(validator.top()).toBe(30.5);

		validator.setRange(1.25, 2.75);
		expect(validator.bottom()).toBe(1.25);
		expect(validator.top()).toBe(2.75);
	});

	test("sets and clamps decimals", () => {
		const validator = new CDoubleValidator();

		validator.setDecimals(4);
		expect(validator.decimals()).toBe(4);

		validator.setDecimals(-1);
		expect(validator.decimals()).toBe(0);

		validator.setDecimals(500);
		expect(validator.decimals()).toBe(100);
	});

	test("accepts values inside the range", () => {
		const validator = new CDoubleValidator(-10.5, 20.75, 2);

		expect(validator.validate("-10.50")).toBe(CValidatorState.Acceptable);
		expect(validator.validate(".5")).toBe(CValidatorState.Acceptable);
		expect(validator.validate("+20.75")).toBe(CValidatorState.Acceptable);
	});

	test("accepts an integer representation", () => {
		const validator = new CDoubleValidator(0, 100, 2);

		expect(validator.validate("42")).toBe(CValidatorState.Acceptable);
	});

	test("accepts a trailing decimal point while editing", () => {
		const validator = new CDoubleValidator(0, 100, 2);

		expect(validator.validate("42.")).toBe(CValidatorState.Acceptable);
	});

	test("treats empty and sign-only text as intermediate", () => {
		const validator = new CDoubleValidator(-10, 10, 2);

		expect(validator.validate("")).toBe(CValidatorState.Intermediate);
		expect(validator.validate("-")).toBe(CValidatorState.Intermediate);
		expect(validator.validate("+")).toBe(CValidatorState.Intermediate);
		expect(validator.validate("-.")).toBe(CValidatorState.Intermediate);
		expect(validator.validate(".")).toBe(CValidatorState.Intermediate);
	});

	test("rejects a negative intermediate value for a non-negative range", () => {
		const validator = new CDoubleValidator(0, 10, 2);

		expect(validator.validate("-")).toBe(CValidatorState.Invalid);
		expect(validator.validate("-.")).toBe(CValidatorState.Invalid);
	});

	test("rejects fractional digits beyond the configured decimals", () => {
		const validator = new CDoubleValidator(-100, 100, 2);

		expect(validator.validate("12.34")).toBe(CValidatorState.Acceptable);
		expect(validator.validate("12.345")).toBe(CValidatorState.Invalid);
	});

	test("zero decimals accepts integers and rejects decimal points", () => {
		const validator = new CDoubleValidator(-100, 100, 0);

		expect(validator.validate("12")).toBe(CValidatorState.Acceptable);
		expect(validator.validate("12.")).toBe(CValidatorState.Invalid);
	});

	test("treats out-of-range values as intermediate", () => {
		const validator = new CDoubleValidator(0, 10, 2);

		expect(validator.validate("12.5")).toBe(CValidatorState.Intermediate);
	});

	test("rejects letters, multiple points and scientific notation", () => {
		const validator = new CDoubleValidator();

		expect(validator.validate("abc")).toBe(CValidatorState.Invalid);
		expect(validator.validate("1.2.3")).toBe(CValidatorState.Invalid);
		expect(validator.validate("1e3")).toBe(CValidatorState.Invalid);
	});

	test("ignores non-finite configuration values", () => {
		const validator = new CDoubleValidator(-10, 10, 2);

		validator.setRange(Number.NaN, 50);
		validator.setDecimals(Number.POSITIVE_INFINITY);

		expect(validator.bottom()).toBe(-10);
		expect(validator.top()).toBe(10);
		expect(validator.decimals()).toBe(2);
	});
});
