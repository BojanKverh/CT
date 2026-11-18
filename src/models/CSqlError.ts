/** Database operation during which an SQL model error occurred. */
export type CSqlOperation = "select" | "insert" | "update" | "remove";

/** Describes an error reported by a CSqlTableAdapter. */
export class CSqlError extends Error {
	readonly operation: CSqlOperation;
	readonly originalError: unknown;

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

	/**
	 * Converts a thrown value into a model error. An existing `CSqlError` is kept as-is.
	 * @param operation Operation to associate with a newly wrapped error.
	 * @param error Thrown value to convert.
	 * @returns The existing error or a new `CSqlError` retaining the original value.
	 */
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
