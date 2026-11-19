/** @module Models/CSqlTableAdapter */
import { CSortOrder } from "../gui/CSortOrder.js";
import type { CSqlFilter } from "./CSqlFilter.js";

/** A row returned by an SQL table adapter. */
export type CSqlRow = Record<string, unknown>;

/** Parameters used to read a table. */
export interface CSqlSelectRequest {
    /**
    * Backend table identifier to query.
    */
    table: string;
    /**
    * Ordered backend column names requested for each row.
    */
    columns: readonly string[];
    /**
    * Zero-based row offset after filtering and sorting.
    */
    offset: number;
    /**
    * Maximum number of rows requested for this page.
    */
    limit: number;
    /**
    * Optional backend column name used to order results.
    */
    sortColumn?: string;
    /**
    * Direction applied to sortColumn when ordering results.
    */
    sortOrder?: CSortOrder;
    /**
    * Filter predicates applied before paging the result set.
    */
    filters?: readonly CSqlFilter[];
}

/** One page of rows and the complete unpaged row count. */
export interface CSqlSelectResult {
    /**
    * Records returned for the requested page, keyed by backend column name.
    */
    rows: CSqlRow[];
    /**
    * Number of matching records before offset and limit are applied.
    */
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
    * Fetches a batch of rows and the total unpaged record count for a table query.
    */
    abstract select(request: CSqlSelectRequest): Promise<CSqlSelectResult>;

    /**
    * Persists one new row and resolves with the stored row, including any generated key.
    */
    abstract insert(
		table: string,
		values: Readonly<CSqlRow>
	): Promise<CSqlRow>;

    /**
    * Persists changes to a row identified by its primary-key column and value.
    */
    abstract update(
		table: string,
		primaryKeyColumn: string,
		primaryKey: unknown,
		values: Readonly<CSqlRow>
	): Promise<void>;

    /**
    * Deletes a row identified by its primary-key column and value.
    */
    abstract remove(
		table: string,
		primaryKeyColumn: string,
		primaryKey: unknown
	): Promise<void>;
}
