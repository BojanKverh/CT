import { CObject } from "../core/CObject.js";

/** Describes the validity of text currently being edited. */
export enum CValidatorState {
	Invalid,
	Intermediate,
	Acceptable
}

/** Base class for reusable text validators. */
export abstract class CValidator extends CObject {
	/**
	 * Classifies input text according to the concrete validator's rules.
	 * @param input Raw text to validate.
	 * @returns `Acceptable` for complete valid input, `Intermediate` for input that may be allowed while editing, or `Invalid` for rejected input.
	 */
	abstract validate(input: string): CValidatorState;
}
