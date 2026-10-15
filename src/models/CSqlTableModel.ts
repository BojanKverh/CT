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

	adapter(): CSqlTableAdapter {
		return this.#m_adapter;
	}

	setTable(table: string): void {
		this.#m_table = table.trim();
	}

	table(): string {
		return this.#m_table;
	}

	setPrimaryKey(column: string): void {
		this.#m_primaryKey = column;
	}

	primaryKey(): string {
		return this.#m_primaryKey;
	}

	setColumns(columns: readonly string[]): void {
		this.#m_columns = [...columns];
		this.resetModel();
	}

	columns(): readonly string[] {
		return [...this.#m_columns];
	}

	setColumnHeader(column: string, label: string): void {
		this.#m_headers.set(column, label);
		this.resetModel();
	}

	setEditStrategy(strategy: CSqlEditStrategy): void {
		this.#m_editStrategy = strategy;
	}

	editStrategy(): CSqlEditStrategy {
		return this.#m_editStrategy;
	}

	isLoading(): boolean {
		return this.#m_loading;
	}

	lastError(): CSqlError | null {
		return this.#m_lastError;
	}

	setFetchSize(fetchSize: number): void {
		if (Number.isInteger(fetchSize) && fetchSize > 0)
			this.#m_fetchSize = fetchSize;
	}

	fetchSize(): number {
		return this.#m_fetchSize;
	}

	totalRowCount(): number {
		return this.#m_totalRowCount;
	}

	sortColumn(): number {
		return this.#m_sortColumn;
	}

	sortOrder(): CSortOrder {
		return this.#m_sortOrder;
	}

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

	filters(): readonly CSqlFilter[] {
		return this.#m_filters.map(filter => ({ ...filter }));
	}

	setFilter(filter: CSqlFilter): void {
		this.setFilters([filter]);
	}

	setFilters(filters: readonly CSqlFilter[]): void {
		this.#m_filters = filters.map(filter => ({ ...filter }));
		this.#reload();
	}

	clearFilter(): void {
		if (this.#m_filters.length === 0)
			return;
		this.#m_filters = [];
		this.#reload();
	}

	override canFetchMore(_parent = new CModelIndex()): boolean {
		return !this.#m_loading && this.#m_rows.length < this.#m_totalRowCount;
	}

	override rowCount(_parent = new CModelIndex()): number {
		return this.#m_rows.length;
	}

	override columnCount(_parent = new CModelIndex()): number {
		return this.#m_columns.length;
	}

	override data(index: CModelIndex): unknown {
		const column = this.#columnAt(index);
		if (column === null)
			return null;

		return this.#m_rows[index.row()]?.[column] ?? null;
	}

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

	override isEditable(index: CModelIndex): boolean {
		const column = this.#columnAt(index);
		return column !== null && column !== this.#m_primaryKey;
	}

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

	/** Reloads the complete table from the adapter. */
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
			this.#reportError("select", error);
			return false;
		} finally {
			this.#setLoading(false);
		}
	}

	/** Appends the next block of rows when more data is available. */
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
			this.#reportError("select", error);
			return false;
		} finally {
			this.#setLoading(false);
		}
	}

	/** Inserts a record and appends the adapter-returned row to the model. */
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
			this.#reportError("insert", error);
			return false;
		}
	}

	/** Removes a row after the adapter confirms deletion. */
	async removeRow(row: number): Promise<boolean> {
		if (!this.#requireTable("remove"))
			return false;

		const record = this.#m_rows[row];
		if (record === undefined)
			return false;

		const key = record[this.#m_primaryKey];
		if (key === undefined || key === null) {
			this.#reportError("remove", new Error("The row has no primary key value."));
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
			this.#reportError("remove", error);
			return false;
		}
	}

	/** Submits all pending changes. */
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

	/** Submits pending changes in one row. */
	async submitRow(row: number): Promise<boolean> {
		const columns = [...(this.#m_dirtyColumns.get(row) ?? [])];
		if (columns.length === 0)
			return true;

		const result = await this.#enqueueSubmit(row, columns);
		if (this.#m_activeRow === row)
			this.#m_activeRow = null;
		return result;
	}

	/** Discards all changes that have not been submitted successfully. */
	revertAll(): void {
		this.#m_rows = this.#m_committedRows.map(row => ({ ...row }));
		this.#m_dirtyColumns.clear();
		this.#m_activeRow = null;
		this.resetModel();
	}

	/** Resolves when all automatically started writes have completed. */
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
			this.#reportError("update", new Error("The row has no primary key value."));
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
			this.#reportError("update", error);

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

		this.#reportError(operation, new Error("No SQL table has been selected."));
		return false;
	}

	#reportError(operation: CSqlOperation, error: unknown): void {
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
