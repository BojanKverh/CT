/** Describes a foreign-key relation used by CSqlRelationalTableModel. */
export class CSqlRelation {
	#m_tableName: string;
	#m_indexColumn: string;
	#m_displayColumn: string;

	constructor(
		tableName: string,
		indexColumn: string,
		displayColumn: string
	) {
		this.#m_tableName = tableName.trim();
		this.#m_indexColumn = indexColumn.trim();
		this.#m_displayColumn = displayColumn.trim();
	}

	/**
	 * Reads the lookup table name.
	 * @returns The trimmed related table name.
	 */
	tableName(): string {
		return this.#m_tableName;
	}

	/**
	 * Reads the lookup column used to match stored keys.
	 * @returns The trimmed key column name.
	 */
	indexColumn(): string {
		return this.#m_indexColumn;
	}

	/**
	 * Reads the lookup column used for presentation.
	 * @returns The trimmed display column name.
	 */
	displayColumn(): string {
		return this.#m_displayColumn;
	}

	/**
	 * Checks that the table and both column names are present.
	 * @returns `true` if all three trimmed names are nonempty.
	 */
	isValid(): boolean {
		return this.#m_tableName.length > 0
			&& this.#m_indexColumn.length > 0
			&& this.#m_displayColumn.length > 0;
	}
}
