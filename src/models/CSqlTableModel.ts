import { CSignal } from "../core/CSignal.js";
import { COrientation } from "../gui/COrientation.js";
import { CSortOrder } from "../gui/CSortOrder.js";
import { CAbstractTableModel } from "./CAbstractTableModel.js";
import { CModelIndex } from "./CModelIndex.js";
import { CSqlEditStrategy } from "./CSqlEditStrategy.js";
import { CSqlError, type CSqlOperation } from "./CSqlError.js";
import type { CSqlFilter } from "./CSqlFilter.js";
import {
	CSqlTableAdapter,
	type CSqlRow,
	type CSqlSelectRequest
} from "./CSqlTableAdapter.js";

/** A flat editable model backed by an asynchronous SQL table adapter. */
export class CSqlTableModel extends CAbstractTableModel {
	readonly loadingChanged = new CSignal<[boolean]>();
	readonly errorOccurred = new CSignal<[CSqlError]>();
	readonly dataSubmitted = new CSignal<[CModelIndex]>();

	#m_adapter: CSqlTableAdapter;
	#m_table = "";
	#m_primaryKey = "id";
	#m_columns: string[] = [];
	#m_headers = new Map<string, string>();
	#m_rows: CSqlRow[] = [];
	#m_committedRows: CSqlRow[] = [];
	#m_totalRowCount = 0;
	#m_fetchSize = 100;
	#m_sortColumn = -1;
	#m_sortOrder = CSortOrder.AscendingOrder;
	#m_filters: CSqlFilter[] = [];
	#m_dirtyColumns = new Map<number, Set<string>>();
	#m_editStrategy = CSqlEditStrategy.OnFieldChange;
	#m_activeRow: number | null = null;
	#m_loading = false;
	#m_lastError: CSqlError | null = null;
	#m_pendingOperations = new Set<Promise<void>>();
	#m_rowQueues = new Map<number, Promise<void>>();

	constructor(adapter: CSqlTableAdapter) {
		super();
		this.#m_adapter = adapter;
	}

	/**
	 * Identifies the data-access adapter used by this model.
	 * @returns The adapter supplied at construction.
	 */
	adapter(): CSqlTableAdapter {
		return this.#m_adapter;
	}

	/**
	 * Changes the table name used by subsequent operations. Call `select()` to load it.
	 * @param table Table name, with surrounding whitespace trimmed.
	 */
	setTable(table: string): void {
		this.#m_table = table.trim();
	}

	/**
	 * Reads the configured table name.
	 * @returns The trimmed name, or an empty string if unset.
	 */
	table(): string {
		return this.#m_table;
	}

	/**
	 * Sets the field used to identify records for updates and deletions.
	 * @param column Exact column name to use as the primary key.
	 */
	setPrimaryKey(column: string): void {
		this.#m_primaryKey = column;
	}

	/**
	 * Reads the configured identifier column.
	 * @returns The primary-key column name, initially `id`.
	 */
	primaryKey(): string {
		return this.#m_primaryKey;
	}

	/**
	 * Replaces the displayed column order and emits a model reset.
	 * @param columns Column names in display order. An empty array allows columns to be inferred on a subsequent load.
	 */
	setColumns(columns: readonly string[]): void {
		this.#m_columns = [...columns];
		this.resetModel();
	}

	/**
	 * Lists the currently configured display columns.
	 * @returns A fresh array of column names in display order.
	 */
	columns(): readonly string[] {
		return [...this.#m_columns];
	}

	/**
	 * Stores a display label for a column and emits a model reset.
	 * @param column Column name to label.
	 * @param label Text to display in the horizontal header.
	 */
	setColumnHeader(column: string, label: string): void {
		this.#m_headers.set(column, label);
		this.resetModel();
	}

	/**
	 * Changes when future cell edits are submitted.
	 * @param strategy Submission strategy for subsequent edits.
	 */
	setEditStrategy(strategy: CSqlEditStrategy): void {
		this.#m_editStrategy = strategy;
	}

	/**
	 * Reads the configured submission policy.
	 * @returns The current edit strategy.
	 */
	editStrategy(): CSqlEditStrategy {
		return this.#m_editStrategy;
	}

	/**
	 * Checks the loading flag used by select and fetch operations.
	 * @returns `true` while the model reports that it is loading.
	 */
	isLoading(): boolean {
		return this.#m_loading;
	}

	/**
	 * Reads the most recently recorded operation failure.
	 * @returns The recorded SQL error, or `null` if no error is stored.
	 */
	lastError(): CSqlError | null {
		return this.#m_lastError;
	}

	/**
	 * Changes the page size for future data requests. Invalid sizes are ignored.
	 * @param fetchSize Positive integer number of rows per request.
	 */
	setFetchSize(fetchSize: number): void {
		if (Number.isInteger(fetchSize) && fetchSize > 0)
			this.#m_fetchSize = fetchSize;
	}

	/**
	 * Reads the configured page size.
	 * @returns Maximum requested rows per page, initially 100.
	 */
	fetchSize(): number {
		return this.#m_fetchSize;
	}

	/**
	 * Reads the model's estimate of the total matching rows across pages.
	 * @returns Total known row count, including rows that have yet to be loaded.
	 */
	totalRowCount(): number {
		return this.#m_totalRowCount;
	}

	/**
	 * Reads the requested SQL sort column.
	 * @returns Zero-based display column, or `-1` when no sort column is selected.
	 */
	sortColumn(): number {
		return this.#m_sortColumn;
	}

	/**
	 * Reads the configured sort direction.
	 * @returns Ascending or descending order.
	 */
	sortOrder(): CSortOrder {
		return this.#m_sortOrder;
	}

	/**
	 * Changes the adapter-side sort and starts a reload when the requested ordering differs.
	 * @param column Zero-based display column, or `-1` to clear sorting. Out-of-range columns are ignored.
	 * @param order Direction to request. Defaults to ascending.
	 */
	override sort(
		column: number,
		order: CSortOrder = CSortOrder.AscendingOrder
	): void {
		if (column < -1 || column >= this.columnCount())
			return;
		if (this.#m_sortColumn === column && this.#m_sortOrder === order)
			return;

		this.#m_sortColumn = column;
		this.#m_sortOrder = order;
		this.#reload();
	}

	/**
	 * Lists the filters used for selection requests.
	 * @returns An array of shallow copies of the filter descriptors.
	 */
	filters(): readonly CSqlFilter[] {
		return this.#m_filters.map(filter => ({ ...filter }));
	}

	/**
	 * Replaces all filters with a single filter and starts a reload.
	 * @param filter Filter to apply.
	 */
	setFilter(filter: CSqlFilter): void {
		this.setFilters([filter]);
	}

	/**
	 * Replaces the active filter descriptors and starts a reload.
	 * @param filters Filters to pass to the adapter. Each descriptor is shallow-copied.
	 */
	setFilters(filters: readonly CSqlFilter[]): void {
		this.#m_filters = filters.map(filter => ({ ...filter }));
		this.#reload();
	}

	/** Removes all active filters and starts a reload if any filters were set. */
	clearFilter(): void {
		if (this.#m_filters.length === 0)
			return;
		this.#m_filters = [];
		this.#reload();
	}

	/**
	 * Checks whether another page can be requested.
	 * @param _parent Parent index. This flat model ignores it.
	 * @returns `true` if the model is idle for loading and fewer rows are loaded than the known total.
	 */
	override canFetchMore(_parent = new CModelIndex()): boolean {
		return !this.#m_loading && this.#m_rows.length < this.#m_totalRowCount;
	}

	/**
	 * Counts the rows currently held by the model.
	 * @param _parent Parent index. This flat model ignores it.
	 * @returns Number of loaded rows.
	 */
	override rowCount(_parent = new CModelIndex()): number {
		return this.#m_rows.length;
	}

	/**
	 * Counts the columns currently exposed by the model.
	 * @param _parent Parent index. This flat model ignores it.
	 * @returns Number of display columns.
	 */
	override columnCount(_parent = new CModelIndex()): number {
		return this.#m_columns.length;
	}

	/**
	 * Reads a loaded cell, including any pending local edit.
	 * @param index Index in this model.
	 * @returns Cell value, or `null` for an invalid or missing cell or a nullish value.
	 */
	override data(index: CModelIndex): unknown {
		const column = this.#columnAt(index);
		if (column === null)
			return null;

		return this.#m_rows[index.row()]?.[column] ?? null;
	}

	/**
	 * Reads the row number or configured column heading.
	 * @param section Zero-based header section.
	 * @param orientation Vertical for row numbers or horizontal for column headings.
	 * @returns One-based row number, custom label, column name, or `null` for a missing horizontal section.
	 */
	override headerData(
		section: number,
		orientation: COrientation
	): string | number | null {
		if (orientation === COrientation.Vertical)
			return section + 1;

		const column = this.#m_columns[section];
		if (column === undefined)
			return null;

		return this.#m_headers.get(column) ?? column;
	}

	/**
	 * Checks whether a loaded cell can be edited through the model.
	 * @param index Index in this model.
	 * @returns `true` for a valid loaded cell outside the primary-key column.
	 */
	override isEditable(index: CModelIndex): boolean {
		const column = this.#columnAt(index);
		return column !== null && column !== this.#m_primaryKey;
	}

	/**
	 * Updates a writable cell locally and emits a data change when its value differs. Field-change mode queues a write. Row-change mode submits the previous edited row when editing moves to a different row.
	 * @param index Index of a writable loaded cell in this model.
	 * @param value New value to store.
	 * @returns `true` if accepted locally, including an unchanged value. Persistence may finish later.
	 */
	override setItemData(index: CModelIndex, value: unknown): boolean {
		const column = this.#columnAt(index);
		if (column === null || column === this.#m_primaryKey)
			return false;

		const row = this.#m_rows[index.row()];
		if (row === undefined)
			return false;

		if (Object.is(row[column], value))
			return true;

		const previousActiveRow = this.#m_activeRow;
		row[column] = value;
		this.#markDirty(index.row(), column);
		this.emitDataChanged(index, index);

		if (this.#m_editStrategy === CSqlEditStrategy.OnFieldChange) {
			this.#track(
				this.#enqueueSubmit(index.row(), [column]).then(() => undefined)
			);
		} else if (this.#m_editStrategy === CSqlEditStrategy.OnRowChange) {
			this.#m_activeRow = index.row();
			if (previousActiveRow !== null && previousActiveRow !== index.row())
				this.#track(this.submitRow(previousActiveRow).then(() => undefined));
		}

		return true;
	}

	/**
	 * Loads the first page using the current sort and filters. On success, replaces loaded rows, clears pending edit bookkeeping and emits a reset.
	 * @returns A promise resolving to `true` on load success or `false` if no table is configured or the adapter fails.
	 */
	async select(): Promise<boolean> {
		if (!this.#requireTable("select"))
			return false;

		this.#setLoading(true);
		try {
			const result = await this.#m_adapter.select(this.#selectRequest(0));

			this.#m_rows = result.rows.map(row => ({ ...row }));
			this.#m_committedRows = result.rows.map(row => ({ ...row }));
			this.#m_totalRowCount = Math.max(
				result.totalRowCount,
				result.rows.length
			);
			if (this.#m_columns.length === 0 && result.rows.length > 0)
				this.#m_columns = Object.keys(result.rows[0]!);

			this.#m_dirtyColumns.clear();
			this.#m_activeRow = null;
			this.#m_lastError = null;
			this.resetModel();
			return true;
		} catch (error) {
			this.reportError("select", error);
			return false;
		} finally {
			this.#setLoading(false);
		}
	}

	/**
	 * Loads the next page at the current row count and appends it with row-insertion notifications.
	 * @param _parent Parent index. This flat model ignores it.
	 * @returns A promise resolving to `true` if rows were appended or `false` if unavailable, empty or unsuccessful.
	 */
	override async fetchMore(
		_parent = new CModelIndex()
	): Promise<boolean> {
		if (!this.canFetchMore() || !this.#requireTable("select"))
			return false;

		this.#setLoading(true);
		try {
			const result = await this.#m_adapter.select(
				this.#selectRequest(this.#m_rows.length)
			);
			if (result.rows.length === 0) {
				this.#m_totalRowCount = this.#m_rows.length;
				return false;
			}

			const first = this.#m_rows.length;
			const last = first + result.rows.length - 1;
			this.beginInsertRows(new CModelIndex(), first, last);
			this.#m_rows.push(...result.rows.map(row => ({ ...row })));
			this.#m_committedRows.push(
				...result.rows.map(row => ({ ...row }))
			);
			this.#m_totalRowCount = Math.max(
				result.totalRowCount,
				this.#m_rows.length
			);
			this.#m_lastError = null;
			this.endInsertRows();
			return true;
		} catch (error) {
			this.reportError("select", error);
			return false;
		} finally {
			this.#setLoading(false);
		}
	}

	/**
	 * Inserts a record through the adapter immediately and appends the returned row to the loaded data.
	 * @param values Column names and initial values for the new record.
	 * @returns A promise resolving to `true` if the row was inserted and appended.
	 */
	async insertRecord(values: Readonly<CSqlRow>): Promise<boolean> {
		if (!this.#requireTable("insert"))
			return false;

		try {
			const inserted = await this.#m_adapter.insert(
				this.#m_table,
				{ ...values }
			);
			const row = this.#m_rows.length;
			this.beginInsertRows(new CModelIndex(), row, row);
			this.#m_rows.push({ ...inserted });
			this.#m_committedRows.push({ ...inserted });
			++this.#m_totalRowCount;
			if (this.#m_columns.length === 0)
				this.#m_columns = Object.keys(inserted);
			this.#m_lastError = null;
			this.endInsertRows();
			return true;
		} catch (error) {
			this.reportError("insert", error);
			return false;
		}
	}

	/**
	 * Deletes a loaded row by primary key and removes it locally after the adapter confirms deletion.
	 * @param row Zero-based loaded row index.
	 * @returns A promise resolving to `true` if removed or `false` for an absent row, a missing key or a failed deletion.
	 */
	async removeRow(row: number): Promise<boolean> {
		if (!this.#requireTable("remove"))
			return false;

		const record = this.#m_rows[row];
		if (record === undefined)
			return false;

		const key = record[this.#m_primaryKey];
		if (key === undefined || key === null) {
			this.reportError("remove", new Error("The row has no primary key value."));
			return false;
		}

		try {
			await this.#m_adapter.remove(
				this.#m_table,
				this.#m_primaryKey,
				key
			);
			this.beginRemoveRows(new CModelIndex(), row, row);
			this.#m_rows.splice(row, 1);
			this.#m_committedRows.splice(row, 1);
			this.#m_totalRowCount = Math.max(0, this.#m_totalRowCount - 1);
			this.#reindexDirtyRowsAfterRemoval(row);
			this.#m_activeRow = null;
			this.#m_lastError = null;
			this.endRemoveRows();
			return true;
		} catch (error) {
			this.reportError("remove", error);
			return false;
		}
	}

	/**
	 * Attempts to persist all dirty rows in row order and clears the active edit row.
	 * @returns A promise resolving to `true` if all attempted writes succeeded, including when there were no edits.
	 */
	async submitAll(): Promise<boolean> {
		const rows = [...this.#m_dirtyColumns.keys()].sort((a, b) => a - b);
		let succeeded = true;

		for (const row of rows) {
			const columns = [...(this.#m_dirtyColumns.get(row) ?? [])];
			if (columns.length > 0)
				succeeded = await this.#enqueueSubmit(row, columns) && succeeded;
		}

		this.#m_activeRow = null;
		return succeeded;
	}

	/**
	 * Queues the dirty columns of one row for persistence.
	 * @param row Zero-based loaded row index.
	 * @returns A promise resolving to the write result, or `true` when the row has no dirty columns.
	 */
	async submitRow(row: number): Promise<boolean> {
		const columns = [...(this.#m_dirtyColumns.get(row) ?? [])];
		if (columns.length === 0)
			return true;

		const result = await this.#enqueueSubmit(row, columns);
		if (this.#m_activeRow === row)
			this.#m_activeRow = null;
		return result;
	}

	/** Restores the last committed local values, clears dirty tracking and emits a reset. Previously issued adapter requests are not canceled. */
	revertAll(): void {
		this.#m_rows = this.#m_committedRows.map(row => ({ ...row }));
		this.#m_dirtyColumns.clear();
		this.#m_activeRow = null;
		this.resetModel();
	}

	/**
	 * Waits until all tracked automatic submissions and reloads have settled.
	 * @returns A promise that resolves when the tracked operation set is empty.
	 */
	async whenIdle(): Promise<void> {
		while (this.#m_pendingOperations.size > 0)
			await Promise.all([...this.#m_pendingOperations]);
	}

	#reload(): void {
		this.#track(this.select().then(() => undefined));
	}

	#selectRequest(offset: number): CSqlSelectRequest {
		const request: CSqlSelectRequest = {
			table: this.#m_table,
			columns: [...this.#m_columns],
			offset,
			limit: this.#m_fetchSize
		};

		const sortColumn = this.#m_columns[this.#m_sortColumn];
		if (sortColumn !== undefined) {
			request.sortColumn = sortColumn;
			request.sortOrder = this.#m_sortOrder;
		}
		if (this.#m_filters.length > 0)
			request.filters = this.filters();
		return request;
	}

	#columnAt(index: CModelIndex): string | null {
		if (!index.isValid() || index.model() !== this)
			return null;

		return this.#m_columns[index.column()] ?? null;
	}

	#markDirty(row: number, column: string): void {
		let columns = this.#m_dirtyColumns.get(row);
		if (columns === undefined) {
			columns = new Set<string>();
			this.#m_dirtyColumns.set(row, columns);
		}
		columns.add(column);
	}

	#enqueueSubmit(row: number, columns: string[]): Promise<boolean> {
		const previous = this.#m_rowQueues.get(row) ?? Promise.resolve();
		const operation = previous.then(() => this.#submitColumns(row, columns));
		const settled = operation.then(() => undefined, () => undefined);
		this.#m_rowQueues.set(row, settled);
		settled.finally(() => {
			if (this.#m_rowQueues.get(row) === settled)
				this.#m_rowQueues.delete(row);
		});
		return operation;
	}

	async #submitColumns(row: number, columns: string[]): Promise<boolean> {
		if (!this.#requireTable("update"))
			return false;

		const record = this.#m_rows[row];
		const committed = this.#m_committedRows[row];
		if (record === undefined || committed === undefined)
			return false;

		const key = record[this.#m_primaryKey];
		if (key === undefined || key === null) {
			this.reportError("update", new Error("The row has no primary key value."));
			return false;
		}

		const values: CSqlRow = {};
		for (const column of columns)
			values[column] = record[column];

		try {
			await this.#m_adapter.update(
				this.#m_table,
				this.#m_primaryKey,
				key,
				values
			);
			for (const column of columns) {
				committed[column] = values[column];
				if (Object.is(record[column], values[column]))
					this.#clearDirty(row, column);
			}
			this.#m_lastError = null;
			const firstColumn = Math.min(...columns.map(column =>
				this.#m_columns.indexOf(column)));
			this.dataSubmitted.emit(this.index(row, firstColumn));
			return true;
		} catch (error) {
			this.reportError("update", error);

			if (this.#m_editStrategy === CSqlEditStrategy.OnFieldChange) {
				for (const column of columns) {
					if (Object.is(record[column], values[column])) {
						record[column] = committed[column];
						this.#clearDirty(row, column);
					}
				}
				const indexes = columns
					.map(column => this.#m_columns.indexOf(column))
					.filter(column => column >= 0);
				if (indexes.length > 0)
					this.emitDataChanged(
						this.index(row, Math.min(...indexes)),
						this.index(row, Math.max(...indexes))
					);
			}

			return false;
		}
	}

	#clearDirty(row: number, column: string): void {
		const columns = this.#m_dirtyColumns.get(row);
		if (columns === undefined)
			return;

		columns.delete(column);
		if (columns.size === 0)
			this.#m_dirtyColumns.delete(row);
	}

	#track(operation: Promise<void>): void {
		this.#m_pendingOperations.add(operation);
		operation.finally(() => this.#m_pendingOperations.delete(operation));
	}

	#setLoading(loading: boolean): void {
		if (this.#m_loading === loading)
			return;
		this.#m_loading = loading;
		this.loadingChanged.emit(loading);
	}

	#requireTable(operation: CSqlOperation): boolean {
		if (this.#m_table.length > 0)
			return true;

		this.reportError(operation, new Error("No SQL table has been selected."));
		return false;
	}

	/**
	 * Records an operation error and emits `errorOccurred`.
	 * @param operation SQL operation associated with the error.
	 * @param error Thrown or rejected value to convert to a `CSqlError`.
	 */
	protected reportError(operation: CSqlOperation, error: unknown): void {
		this.#m_lastError = CSqlError.from(operation, error);
		this.errorOccurred.emit(this.#m_lastError);
	}

	#reindexDirtyRowsAfterRemoval(removedRow: number): void {
		const dirty = new Map<number, Set<string>>();
		for (const [row, columns] of this.#m_dirtyColumns) {
			if (row < removedRow)
				dirty.set(row, columns);
			else if (row > removedRow)
				dirty.set(row - 1, columns);
		}
		this.#m_dirtyColumns = dirty;
	}
}
