import { CSortOrder } from "../gui/CSortOrder.js";
import type { CSqlFilter } from "./CSqlFilter.js";

/** A row returned by an SQL table adapter. */
export type CSqlRow = Record<string, unknown>;

/** Parameters used to read a table. */
export interface CSqlSelectRequest {
	table: string;
	columns: readonly string[];
	offset: number;
	limit: number;
	sortColumn?: string;
	sortOrder?: CSortOrder;
	filters?: readonly CSqlFilter[];
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
	/**
	 * Reads a page of records from a table.
	 * @param request Table, projection, offset, limit and optional sorting and filtering.
	 * @returns A promise resolving to the selected page and total matching count before paging.
	 */
	abstract select(request: CSqlSelectRequest): Promise<CSqlSelectResult>;

	/**
	 * Inserts a record into a table.
	 * @param table Target table name.
	 * @param values Initial values keyed by column name.
	 * @returns A promise resolving to the stored record, including any generated values.
	 */
	abstract insert(
		table: string,
		values: Readonly<CSqlRow>
	): Promise<CSqlRow>;

	/**
	 * Persists changes to an existing record identified by its primary key.
	 * @param table Target table name.
	 * @param primaryKeyColumn Name of the key column.
	 * @param primaryKey Value identifying the record.
	 * @param values Changed values keyed by column.
	 * @returns A promise that resolves when the update completes.
	 */
	abstract update(
		table: string,
		primaryKeyColumn: string,
		primaryKey: unknown,
		values: Readonly<CSqlRow>
	): Promise<void>;

	/**
	 * Deletes an existing record by its primary key.
	 * @param table Target table name.
	 * @param primaryKeyColumn Name of the key column.
	 * @param primaryKey Value identifying the record.
	 * @returns A promise that resolves when deletion completes.
	 */
	abstract remove(
		table: string,
		primaryKeyColumn: string,
		primaryKey: unknown
	): Promise<void>;
}
