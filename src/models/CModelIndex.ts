import type { CAbstractItemModel } from "./CAbstractItemModel.js";

/**
 * Identifies an item in an item model by row and column.
 *
 * An invalid index has negative coordinates or is not associated with a model.
 */
export class CModelIndex {
	#m_row = -1;
	#m_column = -1;
	#m_data: unknown = null;
	#m_model: CAbstractItemModel | null = null;

	/**
	 * Creates a model index.
	 *
	 * @param row Zero-based row, or `-1` for an invalid index.
	 * @param column Zero-based column, or `-1` for an invalid index.
	 * @param data Optional internal data associated with the index.
	 * @param model Model that owns the index.
	 */
	constructor(row = -1, column = -1, data: unknown = null,
		model: CAbstractItemModel | null = null) {
		this.#m_row = row;
		this.#m_column = column;
		this.#m_data = data;
		this.#m_model = model;
	}

	/**
	 * Reads the stored row coordinate.
	 * @returns Zero-based row, or a negative value for an invalid coordinate.
	 */
	row(): number {
		return this.#m_row;
	}

	/**
	 * Reads the stored column coordinate.
	 * @returns Zero-based column, or a negative value for an invalid coordinate.
	 */
	column(): number {
		return this.#m_column;
	}

	/**
	 * Reads the model's internal index payload.
	 * @returns The payload supplied when creating the index. For display data, query the model.
	 */
	data(): unknown {
		return this.#m_data;
	}

	/**
	 * Identifies the model associated with this index.
	 * @returns The associated model, or `null`.
	 */
	model(): CAbstractItemModel | null {
		return this.#m_model;
	}

	/**
	 * Checks the coordinates and model association without querying current model bounds.
	 * @returns `true` when both coordinates are nonnegative and a model is associated.
	 */
	isValid(): boolean {
		return this.#m_row >= 0
			&& this.#m_column >= 0
			&& this.#m_model !== null;
	}

	/**
	 * Compares coordinates, model identity and internal payload using strict equality.
	 * @param other Index to compare with this one.
	 * @returns `true` when all four fields match.
	 */
	equals(other: CModelIndex): boolean {
		return this.#m_row === other.#m_row
			&& this.#m_column === other.#m_column
			&& this.#m_data === other.#m_data
			&& this.#m_model === other.#m_model;
	}
}
