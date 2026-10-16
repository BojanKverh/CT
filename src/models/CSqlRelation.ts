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

	tableName(): string {
		return this.#m_tableName;
	}

	indexColumn(): string {
		return this.#m_indexColumn;
	}

	displayColumn(): string {
		return this.#m_displayColumn;
	}

	isValid(): boolean {
		return this.#m_tableName.length > 0
			&& this.#m_indexColumn.length > 0
			&& this.#m_displayColumn.length > 0;
	}
}
