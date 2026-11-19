/** @module Models/CSqlRelation */
/** Describes a foreign-key relation used by CSqlRelationalTableModel. */
export class CSqlRelation {
	#m_tableName: string;
	#m_indexColumn: string;
	#m_displayColumn: string;

    /**
    * Defines the related table, its key column and its displayed label column. Names are trimmed.
    */
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
    * Returns the related table name.
    */
    tableName(): string {
		return this.#m_tableName;
	}

    /**
    * Returns the related key column matched against stored foreign-key values.
    */
    indexColumn(): string {
		return this.#m_indexColumn;
	}

    /**
    * Returns the related label column shown by the model.
    */
    displayColumn(): string {
		return this.#m_displayColumn;
	}

    /**
    * Reports whether all three trimmed relation names are non-empty.
    */
    isValid(): boolean {
		return this.#m_tableName.length > 0
			&& this.#m_indexColumn.length > 0
			&& this.#m_displayColumn.length > 0;
	}
}
