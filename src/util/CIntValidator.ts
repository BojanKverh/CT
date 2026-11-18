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

	/**
	 * Reads the inclusive lower limit.
	 * @returns The minimum accepted integer.
	 */
	bottom(): number {
		return this.#m_bottom;
	}

	/**
	 * Reads the inclusive upper limit.
	 * @returns The maximum accepted integer.
	 */
	top(): number {
		return this.#m_top;
	}

	/**
	 * Changes the lower bound. The upper bound is raised if necessary to keep the range ordered.
	 * @param bottom Finite lower bound, truncated toward zero.
	 */
	setBottom(bottom: number): void {
		this.setRange(bottom, this.#m_top);
	}

	/**
	 * Changes the upper bound without allowing it below the current lower bound.
	 * @param top Finite upper bound, truncated toward zero.
	 */
	setTop(top: number): void {
		this.setRange(this.#m_bottom, top);
	}

	/**
	 * Changes both inclusive bounds. Nonfinite inputs are ignored. A reversed range collapses to the lower bound.
	 * @param bottom Finite lower bound, truncated toward zero.
	 * @param top Finite upper bound, truncated toward zero.
	 */
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

	/**
	 * Classifies signed decimal integer text against the configured bounds.
	 * @param input Raw text without leading or trailing whitespace.
	 * @returns `Acceptable` for an in-range safe integer, `Intermediate` for an out-of-range safe integer, empty text or an allowed standalone sign, and `Invalid` otherwise.
	 */
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
