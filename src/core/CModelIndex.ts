export class CModelIndex {
	#m_row = -1;
	#m_column = -1;
	#m_data: unknown = null;

	constructor(row = -1, column = -1, data: unknown = null) {
		this.#m_row = row;
		this.#m_column = column;
		this.#m_data = data;
	}

	row(): number {
		return this.#m_row;
	}

	column(): number {
		return this.#m_column;
	}

	data(): unknown {
		return this.#m_data;
	}

	isValid(): boolean {
		return this.#m_row >= 0 && this.#m_column >= 0;
	}

	equals(other: CModelIndex): boolean {
		return this.#m_row === other.#m_row
			&& this.#m_column === other.#m_column
			&& this.#m_data === other.#m_data;
	}
}