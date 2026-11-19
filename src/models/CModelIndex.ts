/** @module Models/CModelIndex */
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

    /** Returns the zero-based row of the index. */
    row(): number {
		return this.#m_row;
	}

    /** Returns the zero-based column of the index. */
    column(): number {
		return this.#m_column;
	}

    /** Returns the internal data associated with the index. */
    data(): unknown {
		return this.#m_data;
	}

    /**
    * Model providing item data for this component.
    * The initial value is `null`.
    */
    model(): CAbstractItemModel | null {
		return this.#m_model;
	}

    /** Returns whether the index refers to a valid model item. */
    isValid(): boolean {
		return this.#m_row >= 0
			&& this.#m_column >= 0
			&& this.#m_model !== null;
	}

    /** Returns whether this index identifies the same item as another index. */
    equals(other: CModelIndex): boolean {
		return this.#m_row === other.#m_row
			&& this.#m_column === other.#m_column
			&& this.#m_data === other.#m_data
			&& this.#m_model === other.#m_model;
	}
}
