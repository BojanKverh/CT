import { CObject } from "../core/CObject.js";

/** Describes the validity of text currently being edited. */
export enum CValidatorState {
	Invalid,
	Intermediate,
	Acceptable
}

/** Base class for reusable text validators. */
export abstract class CValidator extends CObject {
	/** Returns the validation state of the supplied text. */
	abstract validate(input: string): CValidatorState;
}
