import { CClipboard } from "../core/CClipboard.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import { CSignal } from "../core/CSignal.js";
import { CUndoCommand } from "../core/CUndoCommand.js";
import { CUndoStack } from "../core/CUndoStack.js";
import { COrientation } from "../gui/COrientation.js";
import { CSortOrder } from "../gui/CSortOrder.js";
import { CAbstractItemModel, type CItemTextEdit, type CItemTextEditError } from "../models/CAbstractItemModel.js";
import { CModelIndex } from "../models/CModelIndex.js";
import { CTableView } from "./CTableView.js";
import { CTableWidgetItem } from "./CTableWidgetItem.js";
import { CWidget } from "./CWidget.js";

type CTableItemChange = { item: CTableWidgetItem; before: unknown; after: unknown };

class CTableWidgetModel extends CAbstractItemModel {
	#m_items: Array<Array<CTableWidgetItem | null>> = [];
	#m_columnCount = 0;
	#m_horizontalHeaderLabels: string[] = [];
	#m_verticalHeaderLabels: string[] = [];
    #editHistory = new CUndoStack(this);

    /**
     * Reads the edit history.
     * @returns The edit history.
     */
    override undoStack(): CUndoStack {
        return this.#editHistory;
    }

    constructor(parent: CWidget) {
        super(parent);
        this.modelReset.connect(() => this.#editHistory.clear());
    }

	/**
	 * Reads the number of entries in the items.
	 * @param _parent Owning object or parent item. Defaults to `new CModelIndex()`. This implementation ignores the argument.
	 * @returns The number of entries in the items.
	 */
	rowCount(_parent: CModelIndex = new CModelIndex()): number {
		return this.#m_items.length;
	}

	/**
	 * Reads the column count.
	 * @param _parent Owning object or parent item. Defaults to `new CModelIndex()`. This implementation ignores the argument.
	 * @returns The column count.
	 */
	columnCount(_parent: CModelIndex = new CModelIndex()): number {
		return this.#m_columnCount;
	}

	/**
	 * Reads the backing item's data for a cell.
	 * @param index Index owned by this table model.
	 * @returns Stored data, or `null` when the cell is empty or its index is invalid or foreign.
	 */
	data(index: CModelIndex): unknown {
		if (!index.isValid() || index.model() !== this)
			return null;

		const item = this.item(index.row(), index.column());
		return item === null ? null : item.data();
	}

	/**
	 * Updates an editable table item and records an undoable edit if its value changes.
	 * @param index Valid cell index owned by this model.
	 * @param value New cell value.
	 * @returns `true` if the cell accepts edits, including an unchanged value. Returns `false` for a foreign or invalid index, missing item or read-only item.
	 */
	override setItemData(index: CModelIndex, value: unknown): boolean {
		if (!index.isValid() || index.model() !== this)
			return false;

		const item = this.item(index.row(), index.column());

		if (item === null || !item.isEditable())
			return false;

        const before = item.data();
        if (!Object.is(before, value))
            this.#recordChanges([{ item, before, after: value }], "Edit cell");

		return true;
	}

    /**
     * Validates the entire batch before applying it as one undoable edit. Existing numeric and Boolean cells require corresponding textual values.
     * @param edits Batch of editable target cells owned by this table model and their replacement text.
     * @returns `null` if accepted, including a no-op, or an error giving the first rejected edit's zero-based position and reason.
     */
    override applyTextEdits(edits: readonly CItemTextEdit[]): CItemTextEditError | null {
        const changes: CTableItemChange[] = [];

        for (const [editIndex, { index, text }] of edits.entries()) {
            const row = index.row();
            const column = index.column();
            const item = this.item(row, column);
            if (index.model() !== this || item === null || !item.isEditable())
                return { editIndex, message: "Cell is read-only or does not exist." };

            const previous = item.data();
            let value: string | number | boolean = text;
            if (typeof previous === "number") {
                const trimmed = text.trim();
                const number = Number(trimmed);
                if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(trimmed) ||
                    !Number.isFinite(number))
                    return { editIndex, message: "Expected a number." };
                value = number;
            } else if (typeof previous === "boolean") {
                const boolean = text.trim().toLowerCase();
                if (boolean !== "true" && boolean !== "false")
                    return { editIndex, message: "Expected TRUE or FALSE." };
                value = boolean === "true";
            }

            if (Object.is(value, previous)) continue;
            changes.push({ item, before: previous, after: value });
        }

        if (changes.length > 0) this.#recordChanges(changes, "Paste cells");
        return null;
    }

    /**
     * Verifies that each target is editable, runs the optional callback and clears nonempty values as one undoable edit.
     * @param indexes Indexes owned by this table model.
     * @param label Label for the undo command. Defaults to `Clear cells`.
     * @param beforeClear Optional callback after validation and before clearing.
     * @returns The first rejected index, or `null` if all indexes passed validation.
     */
    clearCells(indexes: Iterable<CModelIndex>, label = "Clear cells", beforeClear?: () => void): CModelIndex | null {
        const changes: CTableItemChange[] = [];
        for (const index of indexes) {
            const item = this.item(index.row(), index.column());
            if (index.model() !== this || item === null || !item.isEditable()) return index;
            const before = item.data();
            if (before !== null && before !== undefined && before !== "")
                changes.push({ item, before, after: null });
        }

        beforeClear?.();
        if (changes.length > 0) this.#recordChanges(changes, label);
        return null;
    }

    #recordChanges(changes: readonly CTableItemChange[], label: string): void {
        const apply = (direction: "before" | "after"): void => {
            for (const change of changes) change.item.setData(change[direction]);
            // Resolve the current position because sorting can move an edited item.
            if (changes.length === 1) {
                const index = this.indexFromItem(changes[0]!.item);
                this.emitDataChanged(index, index);
                return;
            }
            this.emitDataChanged(this.index(0, 0), this.index(this.rowCount() - 1, this.columnCount() - 1));
        };
        this.#editHistory.push(new class extends CUndoCommand {
            /**
             * Restores the values captured before the edit and notifies the view.
             */
            override undo(): void { apply("before"); }
            /**
             * Reapplies the edited values and notifies the view.
             */
            override redo(): void { apply("after"); }
        }(label));
    }

	/**
	 * Queries the backing table item for editability.
	 * @param index Index in the current model identifying the item.
	 * @returns `true` if a valid owned index resolves to an editable item.
	 */
	override isEditable(index: CModelIndex): boolean {
		if (!index.isValid() || index.model() !== this)
			return false;

		return this.item(index.row(), index.column())?.isEditable() ?? false;
	}

	/**
	 * Reads the configured label for a row or column and falls back to default numbering.
	 * @param section Zero-based header section.
	 * @param orientation Horizontal for column labels or vertical for row labels.
	 * @returns The configured label or the default one-based section number.
	 */
	override headerData(section: number,
		orientation: COrientation): string | number | null {
		if (orientation === COrientation.Horizontal)
			return this.#m_horizontalHeaderLabels[section] ??
				super.headerData(section, orientation);

		return this.#m_verticalHeaderLabels[section] ??
			super.headerData(section, orientation);
	}

	/**
	 * Reorders rows by the values in the requested column. An invalid column or a table with fewer than two rows is left unchanged.
	 * @param column Zero-based column to sort by.
	 * @param order Ascending or descending order. Defaults to ascending.
	 */
	override sort(
		column: number,
		order: CSortOrder = CSortOrder.AscendingOrder
	): void {
		if (column < 0 || column >= this.#m_columnCount ||
			this.#m_items.length < 2)
			return;

		const rows = this.#m_items.map((items, originalIndex) => ({
			items,
			originalIndex
		}));

		rows.sort((left, right) => {
			const leftItem = left.items[column] ?? null;
			const rightItem = right.items[column] ?? null;

			if (leftItem === null && rightItem === null)
				return left.originalIndex - right.originalIndex;

			if (leftItem === null)
				return 1;

			if (rightItem === null)
				return -1;

			const leftValue = leftItem.data();
			const rightValue = rightItem.data();
			const leftValueEmpty = leftValue === null ||
				leftValue === undefined;
			const rightValueEmpty = rightValue === null ||
				rightValue === undefined;

			if (leftValueEmpty && rightValueEmpty)
				return left.originalIndex - right.originalIndex;

			if (leftValueEmpty)
				return 1;

			if (rightValueEmpty)
				return -1;

			const comparison = this.#compareValues(
				leftValue,
				rightValue
			);
			const directedComparison =
				order === CSortOrder.DescendingOrder
					? -comparison
					: comparison;

			return directedComparison === 0
				? left.originalIndex - right.originalIndex
				: directedComparison;
		});

		const oldRows = [...this.#m_items];
		const oldIndexes: CModelIndex[] = [];

		for (let row = 0; row < oldRows.length; row++) {
			for (let currentColumn = 0;
				currentColumn < this.#m_columnCount;
				currentColumn++) {
				oldIndexes.push(this.createIndex(row, currentColumn));
			}
		}

		this.beginLayoutChange();
		this.#m_items = rows.map(row => row.items);

		const newIndexes: CModelIndex[] = [];

		for (let oldRow = 0; oldRow < oldRows.length; oldRow++) {
			const newRow = this.#m_items.indexOf(oldRows[oldRow]!);

			for (let currentColumn = 0;
				currentColumn < this.#m_columnCount;
				currentColumn++) {
				newIndexes.push(this.createIndex(newRow, currentColumn));
			}
		}

		this.endLayoutChange(oldIndexes, newIndexes);
	}

	/**
	 * Sets the row count. May emit a model reset.
	 * @param count Number of items.
	 */
	setRowCount(count: number): void {
		count = Math.max(0, Math.floor(count));

		if (count === this.rowCount())
			return;

		while (this.#m_items.length < count)
			this.#m_items.push(this.#createRow());

		this.#m_items.length = count;
		this.resetModel();
	}

	/**
	 * Sets the column count. May emit a model reset.
	 * @param count Number of items.
	 */
	setColumnCount(count: number): void {
		count = Math.max(0, Math.floor(count));

		if (count === this.#m_columnCount)
			return;

		this.#m_columnCount = count;

		for (const row of this.#m_items) {
			while (row.length < count)
				row.push(null);

			row.length = count;
		}

		this.resetModel();
	}

	/**
	 * Looks up the item backing a table cell.
	 * @param row Zero-based row.
	 * @param column Zero-based column.
	 * @returns The cell item, or `null` for an empty cell or an out-of-range coordinate.
	 */
	item(row: number, column: number): CTableWidgetItem | null {
		if (!this.#isValidCell(row, column))
			return null;

		return this.#m_items[row]?.[column] ?? null;
	}

	/**
	 * Sets the item. May emit a model reset.
	 * @param row Zero-based row.
	 * @param column Zero-based column.
	 * @param item Item to operate on.
	 */
	setItem(row: number, column: number,
		item: CTableWidgetItem): void {
		if (!this.#isValidCell(row, column))
			return;

		const oldPosition = this.#findItem(item);

		if (oldPosition !== null)
			this.#m_items[oldPosition.row]![oldPosition.column] = null;

		this.#m_items[row]![column] = item;
		this.resetModel();
	}

	/**
	 * Removes the item from a cell without destroying it and resets the model if an item was removed.
	 * @param row Zero-based row.
	 * @param column Zero-based column.
	 * @returns The removed item, or `null` if the cell is empty or out of range.
	 */
	takeItem(row: number, column: number): CTableWidgetItem | null {
		if (!this.#isValidCell(row, column))
			return null;

		const item = this.#m_items[row]?.[column] ?? null;

		if (item === null)
			return null;

		this.#m_items[row]![column] = null;
		this.resetModel();

		return item;
	}

	/**
	 * Sets the horizontal header labels. May emit a model reset.
	 * @param labels Labels.
	 */
	setHorizontalHeaderLabels(labels: string[]): void {
		this.#m_horizontalHeaderLabels = [...labels];
		this.resetModel();
	}

	/**
	 * Sets the vertical header labels. May emit a model reset.
	 * @param labels Labels.
	 */
	setVerticalHeaderLabels(labels: string[]): void {
		this.#m_verticalHeaderLabels = [...labels];
		this.resetModel();
	}

	/**
	 * Resolves a model index to its table item.
	 * @param index Index owned by this table's model.
	 * @returns The cell item, or `null` for an empty cell or an invalid or foreign index.
	 */
	itemFromIndex(index: CModelIndex): CTableWidgetItem | null {
		if (!index.isValid() || index.model() !== this)
			return null;

		return this.item(index.row(), index.column());
	}

	/**
	 * Finds the cell containing the supplied item by identity.
	 * @param item Table item to locate.
	 * @returns Model index for the item, or an invalid index if it does not occur in this table.
	 */
	indexFromItem(item: CTableWidgetItem): CModelIndex {
		const position = this.#findItem(item);

		if (position === null)
			return new CModelIndex();

		return this.index(position.row, position.column);
	}

	#createRow(): Array<CTableWidgetItem | null> {
		return new Array<CTableWidgetItem | null>(
			this.#m_columnCount
		).fill(null);
	}

	#isValidCell(row: number, column: number): boolean {
		return row >= 0 && row < this.rowCount() &&
			column >= 0 && column < this.columnCount();
	}

	#findItem(item: CTableWidgetItem):
		{ row: number; column: number } | null {
		for (let row = 0; row < this.rowCount(); row++) {
			for (let column = 0;
				column < this.columnCount(); column++) {
				if (this.#m_items[row]?.[column] === item)
					return { row, column };
			}
		}

		return null;
	}

	#compareValues(left: unknown, right: unknown): number {
		if (Object.is(left, right))
			return 0;

		if (left === null || left === undefined)
			return 1;

		if (right === null || right === undefined)
			return -1;

		if (typeof left === "number" && typeof right === "number") {
			if (Number.isNaN(left))
				return Number.isNaN(right) ? 0 : 1;

			if (Number.isNaN(right))
				return -1;

			return left < right ? -1 : 1;
		}

		if (left instanceof Date && right instanceof Date) {
			const leftTime = left.getTime();
			const rightTime = right.getTime();

			if (leftTime === rightTime)
				return 0;

			return leftTime < rightTime ? -1 : 1;
		}

		if (typeof left === "boolean" && typeof right === "boolean")
			return left === right ? 0 : left ? 1 : -1;

		return String(left).localeCompare(String(right));
	}
}

/** Implements the table widget widget. */
export class CTableWidget extends CTableView {
	#m_tableModel: CTableWidgetModel;

    /** Reports the first selected cell that cannot be cleared. */
    readonly clearRejected = new CSignal<[row: number, column: number]>();

	/** Signal emitted when current item changes. */
	readonly currentItemChanged =
		new CSignal<[CTableWidgetItem | null, CTableWidgetItem | null]>();

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null) {
		/** Provides super behavior. */
		super(parent);

		this.#m_tableModel = new CTableWidgetModel(this);
		this.setModel(this.#m_tableModel);

		this.selectionModel()?.currentChanged.connect(
			(current, previous) => {
				this.currentItemChanged.emit(
					this.#m_tableModel.itemFromIndex(current),
					this.#m_tableModel.itemFromIndex(previous)
				);
			}
		);
	}

    /**
     * Creates the cut and clear commands for the current table selection. Disables them for an empty selection or any noneditable cell.
     * @returns Command callbacks and their enabled state, or `null` when the internal table model or its selection model is unavailable.
     */
    protected override contextCellActions(): { enabled: boolean; cut: () => void; clear: () => void } | null {
        const selection = this.selectionModel();
        if (selection === null || this.model() !== this.#m_tableModel) return null;
        let enabled = selection.hasSelection();
        for (const index of selection.selectedIndexesInRowOrder()) {
            if (!this.#m_tableModel.isEditable(index)) {
                enabled = false;
                break;
            }
        }
        return {
            enabled,
            cut: () => this.cutSelection(),
            clear: () => this.clearSelectedCells()
        };
    }

    /** Clears editable selected cells as a single undo command. */
    clearSelectedCells(): void {
        const selection = this.selectionModel();
        if (selection === null || this.model() !== this.#m_tableModel) return;
        const rejected = this.#m_tableModel.clearCells(selection.selectedIndexesInRowOrder());
        if (rejected !== null) this.clearRejected.emit(rejected.row(), rejected.column());
    }

    /**
     * Cuts the selection after validating all its cells.
     * @param writeText Optional write text.
     */
    cutSelection(writeText?: (text: string) => void): void {
        const selection = this.selectionModel();
        if (selection === null || !selection.hasSelection() || this.model() !== this.#m_tableModel) return;
        let text: string | undefined;
        const rejected = this.#m_tableModel.clearCells(selection.selectedIndexesInRowOrder(), "Cut cells", () => {
            text = this.selectedText();
            writeText?.(text);
        });
        if (rejected !== null) this.clearRejected.emit(rejected.row(), rejected.column());
        else if (writeText === undefined && text !== undefined) CClipboard.instance().setText(text);
    }

    /**
     * Handles cut and clear shortcuts for the internal editable table, forwarding other keys to the table view.
     * @param event Keyboard event from the table content.
     */
    override contentKeyPressEvent(event: CKeyEvent): void {
        if (event.key().toLowerCase() === "x" && (event.ctrl() || event.meta()) &&
            !event.alt() && !event.altGraph() && !event.shift() &&
            this.model() === this.#m_tableModel && this.selectionModel()?.hasSelection()) {
            this.cutSelection();
            event.accept();
            return;
        }
        if (event.key() === "Delete" && !event.ctrl() && !event.meta() && !event.alt() &&
            !event.shift() && this.model() === this.#m_tableModel && this.selectionModel()?.hasSelection()) {
            this.clearSelectedCells();
            event.accept();
            return;
        }
        super.contentKeyPressEvent(event);
    }

	/**
	 * Reads the row count of the table widget.
	 * @returns The row count.
	 */
	rowCount(): number {
		return this.#m_tableModel.rowCount();
	}

	/**
	 * Sets the row count.
	 * @param count Number of items.
	 */
	setRowCount(count: number): void {
		this.#m_tableModel.setRowCount(count);
	}

	/**
	 * Reads the column count of the table widget.
	 * @returns The column count.
	 */
	columnCount(): number {
		return this.#m_tableModel.columnCount();
	}

	/**
	 * Sets the column count.
	 * @param count Number of items.
	 */
	setColumnCount(count: number): void {
		this.#m_tableModel.setColumnCount(count);
	}

	/**
	 * Looks up the item backing a table cell.
	 * @param row Zero-based row.
	 * @param column Zero-based column.
	 * @returns The cell item, or `null` for an empty cell or an out-of-range coordinate.
	 */
	item(row: number, column: number): CTableWidgetItem | null {
		return this.#m_tableModel.item(row, column);
	}

	/**
	 * Sets the item.
	 * @param row Zero-based row.
	 * @param column Zero-based column.
	 * @param item Item to operate on.
	 */
	setItem(row: number, column: number,
		item: CTableWidgetItem): void {
		this.#m_tableModel.setItem(row, column, item);
	}

	/**
	 * Removes the item from a cell without destroying it and resets the model if an item was removed.
	 * @param row Zero-based row.
	 * @param column Zero-based column.
	 * @returns The removed item, or `null` if the cell is empty or out of range.
	 */
	takeItem(row: number, column: number): CTableWidgetItem | null {
		return this.#m_tableModel.takeItem(row, column);
	}

	/**
	 * Sets the horizontal header labels.
	 * @param labels Labels.
	 */
	setHorizontalHeaderLabels(labels: string[]): void {
		this.#m_tableModel.setHorizontalHeaderLabels(labels);
	}

	/**
	 * Sets the vertical header labels.
	 * @param labels Labels.
	 */
	setVerticalHeaderLabels(labels: string[]): void {
		this.#m_tableModel.setVerticalHeaderLabels(labels);
	}

	/**
	 * Looks up the item backing the current cell.
	 * @returns The current cell item, or `null` if no item is current.
	 */
	currentItem(): CTableWidgetItem | null {
		return this.#m_tableModel.itemFromIndex(this.currentIndex());
	}

	/**
	 * Sets the current item.
	 * @param item Item to operate on.
	 */
	setCurrentItem(item: CTableWidgetItem | null): void {
		/** Provides if behavior. */
		if (item === null) {
			this.setCurrentIndex(new CModelIndex());
			return;
		}

		const index = this.#m_tableModel.indexFromItem(item);

		/** Provides if behavior. */
		if (index.isValid())
			this.setCurrentIndex(index);
	}

	/**
	 * Collects unique items associated with selected model indexes, omitting empty cells.
	 * @returns A new array of selected items in selection order.
	 */
	selectedItems(): CTableWidgetItem[] {
		const selectionModel = this.selectionModel();

		/** Provides if behavior. */
		if (selectionModel === null)
			return [];

		const result: CTableWidgetItem[] = [];

		/** Provides for behavior. */
		for (const index of selectionModel.selectedIndexes()) {
			const item = this.#m_tableModel.itemFromIndex(index);

			/** Provides if behavior. */
			if (item !== null && !result.includes(item))
				result.push(item);
		}

		return result;
	}

	/**
	 * Resolves a model index to its table item.
	 * @param index Index owned by this table's model.
	 * @returns The cell item, or `null` for an empty cell or an invalid or foreign index.
	 */
	itemFromIndex(index: CModelIndex): CTableWidgetItem | null {
		return this.#m_tableModel.itemFromIndex(index);
	}

	/**
	 * Finds the cell containing the supplied item by identity.
	 * @param item Table item to locate.
	 * @returns Model index for the item, or an invalid index if it does not occur in this table.
	 */
	indexFromItem(item: CTableWidgetItem): CModelIndex {
		return this.#m_tableModel.indexFromItem(item);
	}
}
