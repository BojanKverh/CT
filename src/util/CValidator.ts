/** @module Utilities/CValidator */
import { CObject } from "../core/CObject.js";

/** Describes the validity of text currently being edited. */
export enum CValidatorState {
    /**
    * Input cannot be accepted and is not a valid intermediate edit.
    */
    Invalid,
    /**
    * Incomplete input that may become acceptable with further typing.
    */
    Intermediate,
    /**
    * Input satisfies the validator and can be committed.
    */
    Acceptable
}

/** Base class for reusable text validators. */
export abstract class CValidator extends CObject {
    /** Returns the validation state of the supplied text. */
    abstract validate(input: string): CValidatorState;
}
