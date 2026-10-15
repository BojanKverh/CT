/** A row returned by an SQL table adapter. */
export type CSqlRow = Record<string, unknown>;

/** Parameters used to read a table. */
export interface CSqlSelectRequest {
	table: string;
	columns: readonly string[];
	offset: number;
	limit: number;
}

/** One page of rows and the complete unpaged row count. */
export interface CSqlSelectResult {
	rows: CSqlRow[];
	totalRowCount: number;
}

/**
 * Backend-independent data access used by CSqlTableModel.
 *
 * Browser applications can implement this interface using fetch(), SQLite
 * WASM or any other asynchronous storage mechanism.
 */
export abstract class CSqlTableAdapter {
	abstract select(request: CSqlSelectRequest): Promise<CSqlSelectResult>;

	abstract insert(
		table: string,
		values: Readonly<CSqlRow>
	): Promise<CSqlRow>;

	abstract update(
		table: string,
		primaryKeyColumn: string,
		primaryKey: unknown,
		values: Readonly<CSqlRow>
	): Promise<void>;

	abstract remove(
		table: string,
		primaryKeyColumn: string,
		primaryKey: unknown
	): Promise<void>;
}
