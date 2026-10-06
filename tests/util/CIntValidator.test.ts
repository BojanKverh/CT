import { describe, expect, test } from "vitest";
import { CIntValidator } from "../../src/util/CIntValidator.js";
import { CValidatorState } from "../../src/util/CValidator.js";

describe("CIntValidator", () => {
	test("has the full safe-integer range by default", () => {
		const validator = new CIntValidator();

		expect(validator.bottom()).toBe(Number.MIN_SAFE_INTEGER);
		expect(validator.top()).toBe(Number.MAX_SAFE_INTEGER);
	});

	test("stores constructor range", () => {
		const validator = new CIntValidator(-10, 20);

		expect(validator.bottom()).toBe(-10);
		expect(validator.top()).toBe(20);
	});

	test("truncates range endpoints", () => {
		const validator = new CIntValidator(-10.8, 20.9);

		expect(validator.bottom()).toBe(-10);
		expect(validator.top()).toBe(20);
	});

	test("normalizes an inverted range", () => {
		const validator = new CIntValidator(20, 10);

		expect(validator.bottom()).toBe(20);
		expect(validator.top()).toBe(20);
	});

	test("sets bottom, top and range", () => {
		const validator = new CIntValidator(-10, 10);

		validator.setBottom(-20);
		validator.setTop(30);
		expect(validator.bottom()).toBe(-20);
		expect(validator.top()).toBe(30);

		validator.setRange(5, 15);
		expect(validator.bottom()).toBe(5);
		expect(validator.top()).toBe(15);
	});

	test("accepts integers inside the range", () => {
		const validator = new CIntValidator(-10, 20);

		expect(validator.validate("-10")).toBe(CValidatorState.Acceptable);
		expect(validator.validate("0")).toBe(CValidatorState.Acceptable);
		expect(validator.validate("+20")).toBe(CValidatorState.Acceptable);
	});

	test("treats empty input as intermediate", () => {
		const validator = new CIntValidator();

		expect(validator.validate("")).toBe(CValidatorState.Intermediate);
	});

	test("allows a negative sign only for ranges containing negatives", () => {
		expect(new CIntValidator(-10, 10).validate("-"))
			.toBe(CValidatorState.Intermediate);
		expect(new CIntValidator(0, 10).validate("-"))
			.toBe(CValidatorState.Invalid);
	});

	test("allows a positive sign only for ranges containing positives", () => {
		expect(new CIntValidator(-10, 10).validate("+"))
			.toBe(CValidatorState.Intermediate);
		expect(new CIntValidator(-10, -1).validate("+"))
			.toBe(CValidatorState.Invalid);
	});

	test("treats an out-of-range integer as intermediate", () => {
		const validator = new CIntValidator(0, 100);

		expect(validator.validate("150")).toBe(CValidatorState.Intermediate);
	});

	test("rejects decimals, letters and embedded signs", () => {
		const validator = new CIntValidator();

		expect(validator.validate("1.5")).toBe(CValidatorState.Invalid);
		expect(validator.validate("abc")).toBe(CValidatorState.Invalid);
		expect(validator.validate("1-2")).toBe(CValidatorState.Invalid);
	});

	test("rejects integers outside the safe-number range", () => {
		const validator = new CIntValidator();

		expect(validator.validate("9007199254740992"))
			.toBe(CValidatorState.Invalid);
	});

	test("ignores a non-finite range update", () => {
		const validator = new CIntValidator(-10, 10);

		validator.setRange(Number.NaN, 50);

		expect(validator.bottom()).toBe(-10);
		expect(validator.top()).toBe(10);
	});
});
