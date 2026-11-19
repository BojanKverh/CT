/** @module Widgets/CTableWidget */
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

    override undoStack(): CUndoStack {
        return this.#editHistory;
    }

    constructor(parent: CWidget) {
        super(parent);
        this.modelReset.connect(() => this.#editHistory.clear());
    }

    /**
    * Returns the number of rows retained by the internal item model.
    */
    rowCount(_parent: CModelIndex = new CModelIndex()): number {
		return this.#m_items.length;
	}

    /**
    * Returns the number of columns retained by the internal item model.
    */
    columnCount(_parent: CModelIndex = new CModelIndex()): number {
		return this.#m_columnCount;
	}

	data(index: CModelIndex): unknown {
		if (!index.isValid() || index.model() !== this)
			return null;

		const item = this.item(index.row(), index.column());
		return item === null ? null : item.data();
	}

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
            override undo(): void { apply("before"); }
            override redo(): void { apply("after"); }
        }(label));
    }

	override isEditable(index: CModelIndex): boolean {
		if (!index.isValid() || index.model() !== this)
			return false;

		return this.item(index.row(), index.column())?.isEditable() ?? false;
	}

	override headerData(section: number,
		orientation: COrientation): string | number | null {
		if (orientation === COrientation.Horizontal)
			return this.#m_horizontalHeaderLabels[section] ??
				super.headerData(section, orientation);

		return this.#m_verticalHeaderLabels[section] ??
			super.headerData(section, orientation);
	}

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
    * Changes the internal model's row count, adding or removing retained cell positions.
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
    * Changes the internal model's column count, adding or removing retained cell positions.
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
    * Returns the item object at a row and column, or null for an empty or invalid cell.
    */
    item(row: number, column: number): CTableWidgetItem | null {
		if (!this.#isValidCell(row, column))
			return null;

		return this.#m_items[row]?.[column] ?? null;
	}

    /**
    * Assigns an item to an internal-model cell.
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
    * Sets column captions in supplied order.
    */
    setHorizontalHeaderLabels(labels: string[]): void {
		this.#m_horizontalHeaderLabels = [...labels];
		this.resetModel();
	}

    /**
    * Sets row captions in supplied order.
    */
    setVerticalHeaderLabels(labels: string[]): void {
		this.#m_verticalHeaderLabels = [...labels];
		this.resetModel();
	}

    /**
    * Resolves an internal model index to its item object.
    */
    itemFromIndex(index: CModelIndex): CTableWidgetItem | null {
		if (!index.isValid() || index.model() !== this)
			return null;

		return this.item(index.row(), index.column());
	}

    /**
    * Resolves an owned item to its internal model index.
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

/** Item-based editable table backed by an internal model and CTableWidgetItem objects. */
export class CTableWidget extends CTableView {
	#m_tableModel: CTableWidgetModel;

    /**
    * Reports the first selected cell that cannot be cleared.
    * @group Signals
    */
    readonly clearRejected = new CSignal<[row: number, column: number]>();

    /**
    * Emitted with the new and previous current tree items when keyboard or pointer navigation changes the current item.
    * @group Signals
    */
    readonly currentItemChanged =
		new CSignal<[CTableWidgetItem | null, CTableWidgetItem | null]>();

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    * @param parent Owner of this object. Widget parents manage child lifetime and inherited state. Omit to use `null`.
    */
    constructor(parent: CWidget | null = null) {
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

    /** Cuts the selection after validating all its cells. */
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
    * Returns the number of rows retained by the internal item model.
    */
    rowCount(): number {
		return this.#m_tableModel.rowCount();
	}

    /**
    * Changes the internal model's row count, adding or removing retained cell positions.
    */
    setRowCount(count: number): void {
		this.#m_tableModel.setRowCount(count);
	}

    /**
    * Returns the number of columns retained by the internal item model.
    */
    columnCount(): number {
		return this.#m_tableModel.columnCount();
	}

    /**
    * Changes the internal model's column count, adding or removing retained cell positions.
    */
    setColumnCount(count: number): void {
		this.#m_tableModel.setColumnCount(count);
	}

    /**
    * Returns the item object at a row and column, or null for an empty or invalid cell.
    */
    item(row: number, column: number): CTableWidgetItem | null {
		return this.#m_tableModel.item(row, column);
	}

    /**
    * Assigns an item to an internal-model cell.
    */
    setItem(row: number, column: number,
		item: CTableWidgetItem): void {
		this.#m_tableModel.setItem(row, column, item);
	}

    /** Removes and returns item. */
    takeItem(row: number, column: number): CTableWidgetItem | null {
		return this.#m_tableModel.takeItem(row, column);
	}

    /**
    * Sets column captions in supplied order.
    */
    setHorizontalHeaderLabels(labels: string[]): void {
		this.#m_tableModel.setHorizontalHeaderLabels(labels);
	}

    /**
    * Sets row captions in supplied order.
    */
    setVerticalHeaderLabels(labels: string[]): void {
		this.#m_tableModel.setVerticalHeaderLabels(labels);
	}

    /**
    * Returns the item at the keyboard-current model index, or null.
    */
    currentItem(): CTableWidgetItem | null {
		return this.#m_tableModel.itemFromIndex(this.currentIndex());
	}

    /**
    * Moves the keyboard-current model index to an owned item.
    */
    setCurrentItem(item: CTableWidgetItem | null): void {
		if (item === null) {
			this.setCurrentIndex(new CModelIndex());
			return;
		}

		const index = this.#m_tableModel.indexFromItem(item);

		if (index.isValid())
			this.setCurrentIndex(index);
	}

    /**
    * Returns the retained item objects covered by the current model selection.
    */
    selectedItems(): CTableWidgetItem[] {
		const selectionModel = this.selectionModel();

		if (selectionModel === null)
			return [];

		const result: CTableWidgetItem[] = [];

		for (const index of selectionModel.selectedIndexes()) {
			const item = this.#m_tableModel.itemFromIndex(index);

			if (item !== null && !result.includes(item))
				result.push(item);
		}

		return result;
	}

    /**
    * Resolves an internal model index to its item object.
    */
    itemFromIndex(index: CModelIndex): CTableWidgetItem | null {
		return this.#m_tableModel.itemFromIndex(index);
	}

    /**
    * Resolves an owned item to its internal model index.
    */
    indexFromItem(item: CTableWidgetItem): CModelIndex {
		return this.#m_tableModel.indexFromItem(item);
	}
}
