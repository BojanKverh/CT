import { CValidator, CValidatorState } from "./CValidator.js";

/** Validates floating-point text within a configurable range. */
export class CDoubleValidator extends CValidator {
	#m_bottom = -Number.MAX_VALUE;
	#m_top = Number.MAX_VALUE;
	#m_decimals = 2;

	/** Creates a floating-point validator. */
	constructor(
		bottom = -Number.MAX_VALUE,
		top = Number.MAX_VALUE,
		decimals = 2
	) {
		super();
		this.setRange(bottom, top);
		this.setDecimals(decimals);
	}

	/** Returns the lower bound. */
	bottom(): number {
		return this.#m_bottom;
	}

	/** Returns the upper bound. */
	top(): number {
		return this.#m_top;
	}

	/** Returns the maximum number of fractional digits. */
	decimals(): number {
		return this.#m_decimals;
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

		if (bottom > top)
			top = bottom;

		this.#m_bottom = bottom;
		this.#m_top = top;
	}

	/** Sets the maximum number of fractional digits. */
	setDecimals(decimals: number): void {
		if (Number.isFinite(decimals))
			this.#m_decimals = this.#normalizeDecimals(decimals);
	}

	/** Validates floating-point text. */
	override validate(input: string): CValidatorState {
		if (input === "")
			return CValidatorState.Intermediate;

		const negativeIntermediate = input === "-" || input === "-.";
		if (negativeIntermediate) {
			return this.#m_bottom < 0
				? CValidatorState.Intermediate
				: CValidatorState.Invalid;
		}

		const positiveIntermediate = input === "+" || input === "."
			|| input === "+.";
		if (positiveIntermediate) {
			return this.#m_top >= 0
				? CValidatorState.Intermediate
				: CValidatorState.Invalid;
		}

		const pattern = this.#m_decimals === 0
			? /^[+-]?\d+$/
			: new RegExp(
				`^[+-]?(?:\\d+(?:\\.\\d{0,${this.#m_decimals}})?|`
				+ `\\.\\d{1,${this.#m_decimals}})$`
			);

		if (!pattern.test(input))
			return CValidatorState.Invalid;

		const value = Number(input);
		if (!Number.isFinite(value))
			return CValidatorState.Invalid;

		if (value < this.#m_bottom || value > this.#m_top)
			return CValidatorState.Intermediate;

		return CValidatorState.Acceptable;
	}

	#normalizeDecimals(decimals: number): number {
		return Math.max(0, Math.min(100, Math.trunc(decimals)));
	}
}
