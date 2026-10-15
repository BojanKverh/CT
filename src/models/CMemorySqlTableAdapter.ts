import {
	CSqlTableAdapter,
	type CSqlRow,
	type CSqlSelectRequest,
	type CSqlSelectResult
} from "./CSqlTableAdapter.js";

/** An in-memory SQL table adapter useful for demos and tests. */
export class CMemorySqlTableAdapter extends CSqlTableAdapter {
	#m_tables = new Map<string, CSqlRow[]>();
	#m_autoIncrementColumns = new Map<string, string | null>();

	constructor(tables: Record<string, readonly CSqlRow[]> = {}) {
		super();

		for (const [name, rows] of Object.entries(tables))
			this.setTable(name, rows);
	}

	/** Creates or replaces a table with independent copies of the rows. */
	setTable(
		table: string,
		rows: readonly CSqlRow[],
		autoIncrementColumn: string | null = "id"
	): void {
		this.#m_tables.set(table, rows.map(row => ({ ...row })));
		this.#m_autoIncrementColumns.set(table, autoIncrementColumn);
	}

	/** Returns independent copies of all records in a table. */
	rows(table: string): CSqlRow[] {
		return this.#table(table).map(row => ({ ...row }));
	}

	setAutoIncrementColumn(table: string, column: string | null): void {
		this.#table(table);
		this.#m_autoIncrementColumns.set(table, column);
	}

	override async select(
		request: CSqlSelectRequest
	): Promise<CSqlSelectResult> {
		const rows = this.#table(request.table);
		const offset = Math.max(0, Math.floor(request.offset));
		const limit = Math.max(0, Math.floor(request.limit));
		const selected = rows.slice(offset, offset + limit);

		return {
			rows: selected.map(row =>
				this.#selectColumns(row, request.columns)),
			totalRowCount: rows.length
		};
	}

	override async insert(
		table: string,
		values: Readonly<CSqlRow>
	): Promise<CSqlRow> {
		const rows = this.#table(table);
		const row = { ...values };
		const autoIncrementColumn = this.#m_autoIncrementColumns.get(table);

		if (autoIncrementColumn !== null && autoIncrementColumn !== undefined
			&& (row[autoIncrementColumn] === undefined
				|| row[autoIncrementColumn] === null)) {
			row[autoIncrementColumn] = this.#nextInteger(
				rows,
				autoIncrementColumn
			);
		}

		rows.push(row);
		return { ...row };
	}

	override async update(
		table: string,
		primaryKeyColumn: string,
		primaryKey: unknown,
		values: Readonly<CSqlRow>
	): Promise<void> {
		const row = this.#findRow(table, primaryKeyColumn, primaryKey);

		for (const [column, value] of Object.entries(values)) {
			if (column !== primaryKeyColumn)
				row[column] = value;
		}
	}

	override async remove(
		table: string,
		primaryKeyColumn: string,
		primaryKey: unknown
	): Promise<void> {
		const rows = this.#table(table);
		const index = rows.findIndex(row =>
			Object.is(row[primaryKeyColumn], primaryKey));

		if (index < 0)
			throw new Error(
				`Record '${String(primaryKey)}' was not found in table '${table}'.`
			);

		rows.splice(index, 1);
	}

	#table(table: string): CSqlRow[] {
		const rows = this.#m_tables.get(table);
		if (rows === undefined)
			throw new Error(`Table '${table}' does not exist.`);
		return rows;
	}

	#findRow(
		table: string,
		primaryKeyColumn: string,
		primaryKey: unknown
	): CSqlRow {
		const row = this.#table(table).find(item =>
			Object.is(item[primaryKeyColumn], primaryKey));

		if (row === undefined)
			throw new Error(
				`Record '${String(primaryKey)}' was not found in table '${table}'.`
			);

		return row;
	}

	#selectColumns(row: CSqlRow, columns: readonly string[]): CSqlRow {
		if (columns.length === 0)
			return { ...row };

		const result: CSqlRow = {};
		for (const column of columns)
			result[column] = row[column];
		return result;
	}

	#nextInteger(rows: readonly CSqlRow[], column: string): number {
		let maximum = 0;
		for (const row of rows) {
			const value = row[column];
			if (typeof value === "number" && Number.isInteger(value))
				maximum = Math.max(maximum, value);
		}
		return maximum + 1;
	}
}
