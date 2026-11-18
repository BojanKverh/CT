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

	/**
	 * Reads the inclusive lower limit.
	 * @returns The minimum accepted numeric value.
	 */
	bottom(): number {
		return this.#m_bottom;
	}

	/**
	 * Reads the inclusive upper limit.
	 * @returns The maximum accepted numeric value.
	 */
	top(): number {
		return this.#m_top;
	}

	/**
	 * Reads the permitted fractional precision.
	 * @returns Maximum number of digits after the decimal point.
	 */
	decimals(): number {
		return this.#m_decimals;
	}

	/**
	 * Changes the lower bound. The upper bound is raised if necessary to keep the range ordered.
	 * @param bottom Finite lower bound.
	 */
	setBottom(bottom: number): void {
		this.setRange(bottom, this.#m_top);
	}

	/**
	 * Changes the upper bound without allowing it below the current lower bound.
	 * @param top Finite upper bound.
	 */
	setTop(top: number): void {
		this.setRange(this.#m_bottom, top);
	}

	/**
	 * Changes both inclusive bounds. Nonfinite inputs are ignored. A reversed range collapses to the lower bound.
	 * @param bottom Finite lower bound.
	 * @param top Finite upper bound.
	 */
	setRange(bottom: number, top: number): void {
		if (!Number.isFinite(bottom) || !Number.isFinite(top))
			return;

		if (bottom > top)
			top = bottom;

		this.#m_bottom = bottom;
		this.#m_top = top;
	}

	/**
	 * Changes the maximum number of fractional digits. Nonfinite arguments are ignored.
	 * @param decimals Finite digit count, truncated toward zero and clamped to the range 0 through 100.
	 */
	setDecimals(decimals: number): void {
		if (Number.isFinite(decimals))
			this.#m_decimals = this.#normalizeDecimals(decimals);
	}

	/**
	 * Classifies signed decimal text against the configured bounds and fractional precision. Exponent notation is rejected.
	 * @param input Raw decimal text using a period as the decimal separator.
	 * @returns `Acceptable` for an in-range finite number with allowed precision, `Intermediate` for an out-of-range finite number, empty text or an allowed incomplete sign or decimal prefix, and `Invalid` otherwise.
	 */
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
