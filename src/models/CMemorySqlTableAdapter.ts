import {
	CSqlTableAdapter,
	type CSqlRow,
	type CSqlSelectRequest,
	type CSqlSelectResult
} from "./CSqlTableAdapter.js";
import { CSortOrder } from "../gui/CSortOrder.js";
import { CSqlFilterOperator, type CSqlFilter } from "./CSqlFilter.js";

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
		let rows = [...this.#table(request.table)];
		const filters = request.filters;
		if (filters !== undefined)
			rows = rows.filter(row => filters.every(filter =>
				this.#matchesFilter(row, filter)));

		if (request.sortColumn !== undefined) {
			const column = request.sortColumn;
			const direction = request.sortOrder === CSortOrder.DescendingOrder
				? -1
				: 1;
			rows.sort((left, right) => direction * this.#compareValues(
				left[column],
				right[column]
			));
		}

		const offset = Math.max(0, Math.floor(request.offset));
		const limit = Math.max(0, Math.floor(request.limit));
		const selected = rows.slice(offset, offset + limit);

		return {
			rows: selected.map(row =>
				this.#selectColumns(row, request.columns)),
			totalRowCount: rows.length
		};
	}

	#matchesFilter(row: CSqlRow, filter: CSqlFilter): boolean {
		const actual = row[filter.column];
		const expected = filter.value;

		switch (filter.operator) {
			case CSqlFilterOperator.Equal:
				return Object.is(actual, expected);
			case CSqlFilterOperator.NotEqual:
				return !Object.is(actual, expected);
			case CSqlFilterOperator.LessThan:
				return this.#compareValues(actual, expected) < 0;
			case CSqlFilterOperator.LessThanOrEqual:
				return this.#compareValues(actual, expected) <= 0;
			case CSqlFilterOperator.GreaterThan:
				return this.#compareValues(actual, expected) > 0;
			case CSqlFilterOperator.GreaterThanOrEqual:
				return this.#compareValues(actual, expected) >= 0;
			case CSqlFilterOperator.Contains:
				return this.#text(actual, filter).includes(
					this.#text(expected, filter));
			case CSqlFilterOperator.StartsWith:
				return this.#text(actual, filter).startsWith(
					this.#text(expected, filter));
			case CSqlFilterOperator.EndsWith:
				return this.#text(actual, filter).endsWith(
					this.#text(expected, filter));
		}
	}

	#text(value: unknown, filter: CSqlFilter): string {
		const text = String(value ?? "");
		return filter.caseSensitive === true ? text : text.toLocaleLowerCase();
	}

	#compareValues(left: unknown, right: unknown): number {
		if (Object.is(left, right))
			return 0;
		if (left === null || left === undefined)
			return -1;
		if (right === null || right === undefined)
			return 1;
		if (typeof left === "number" && typeof right === "number")
			return left - right;
		if (left instanceof Date && right instanceof Date)
			return left.getTime() - right.getTime();
		return String(left).localeCompare(String(right));
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
