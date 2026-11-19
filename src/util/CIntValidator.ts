/** @module Utilities/CIntValidator */
import { CValidator, CValidatorState } from "./CValidator.js";

/** Validates integer text within a configurable range. */
export class CIntValidator extends CValidator {
	#m_bottom = Number.MIN_SAFE_INTEGER;
	#m_top = Number.MAX_SAFE_INTEGER;

    /** Creates an integer validator. */
    constructor(
		bottom = Number.MIN_SAFE_INTEGER,
		top = Number.MAX_SAFE_INTEGER
	) {
		super();
		this.setRange(bottom, top);
	}

    /** Returns the lower bound. */
    bottom(): number {
		return this.#m_bottom;
	}

    /** Returns the upper bound. */
    top(): number {
		return this.#m_top;
	}

    /** Sets the lower bound. */
    setBottom(bottom: number): void {
		this.setRange(bottom, this.#m_top);
	}

    /** Sets the upper bound. */
    setTop(top: number): void {
		this.setRange(this.#m_bottom, top);
	}

    /** Sets the accepted range. */
    setRange(bottom: number, top: number): void {
		if (!Number.isFinite(bottom) || !Number.isFinite(top))
			return;

		bottom = Math.trunc(bottom);
		top = Math.trunc(top);

		if (bottom > top)
			top = bottom;

		this.#m_bottom = bottom;
		this.#m_top = top;
	}

    /** Validates integer text. */
    override validate(input: string): CValidatorState {
		if (input === "")
			return CValidatorState.Intermediate;

		if (input === "-") {
			return this.#m_bottom < 0
				? CValidatorState.Intermediate
				: CValidatorState.Invalid;
		}

		if (input === "+") {
			return this.#m_top >= 0
				? CValidatorState.Intermediate
				: CValidatorState.Invalid;
		}

		if (!/^[+-]?\d+$/.test(input))
			return CValidatorState.Invalid;

		const value = Number(input);
		if (!Number.isSafeInteger(value))
			return CValidatorState.Invalid;

		if (value < this.#m_bottom || value > this.#m_top)
			return CValidatorState.Intermediate;

		return CValidatorState.Acceptable;
	}
}
