/** @module Models/CSqlError */
/** Database operation during which an SQL model error occurred. */
export type CSqlOperation = "select" | "insert" | "update" | "remove";

/** Describes an error reported by a CSqlTableAdapter. */
export class CSqlError extends Error {
    /** SQL operation associated with this error. */
    readonly operation: CSqlOperation;
    /** Original adapter or transport failure retained for diagnosis. */
    readonly originalError: unknown;

    /**
    * Wraps an operation failure while retaining its original error.
    * @param operation Input used to configure CSqlError.
    * @param message Input used to configure CSqlError.
    * @param originalError Input used to configure CSqlError. Omit to use `null`.
    */
    constructor(
		operation: CSqlOperation,
		message: string,
		originalError: unknown = null
	) {
		super(message);
		this.name = "CSqlError";
		this.operation = operation;
		this.originalError = originalError;
	}

    /** Converts an arbitrary rejected value to a CSqlError. */
    static from(
		operation: CSqlOperation,
		error: unknown
	): CSqlError {
		if (error instanceof CSqlError)
			return error;

		const message = error instanceof Error
			? error.message
			: String(error);

		return new CSqlError(operation, message, error);
	}
}
