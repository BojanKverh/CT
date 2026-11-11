import { CAction } from "../core/CAction.js";
import { CContextMenuEvent, CContextMenuReason } from "../events/CContextMenuEvent.js";
import { CMenu } from "./CMenu.js";
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

	rowCount(_parent: CModelIndex = new CModelIndex()): number {
		return this.#m_items.length;
	}

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

	setRowCount(count: number): void {
		count = Math.max(0, Math.floor(count));

		if (count === this.rowCount())
			return;

		while (this.#m_items.length < count)
			this.#m_items.push(this.#createRow());

		this.#m_items.length = count;
		this.resetModel();
	}

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

	item(row: number, column: number): CTableWidgetItem | null {
		if (!this.#isValidCell(row, column))
			return null;

		return this.#m_items[row]?.[column] ?? null;
	}

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

	setHorizontalHeaderLabels(labels: string[]): void {
		this.#m_horizontalHeaderLabels = [...labels];
		this.resetModel();
	}

	setVerticalHeaderLabels(labels: string[]): void {
		this.#m_verticalHeaderLabels = [...labels];
		this.resetModel();
	}

	itemFromIndex(index: CModelIndex): CTableWidgetItem | null {
		if (!index.isValid() || index.model() !== this)
			return null;

		return this.item(index.row(), index.column());
	}

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
    #contextMenu: CMenu | null = null;
    #pasteRequest = 0;

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

    protected override contextMenuEvent(event: CContextMenuEvent): void {
        const selection = this.selectionModel();
        if (!this.isEnabled() || selection === null || this.model() !== this.#m_tableModel) {
            event.ignore();
            return;
        }

        const viewport = this.viewport();
        let position = event.globalPos();
        if (event.reason() === CContextMenuReason.Mouse) {
            const point = viewport.mapFromCanvas(position.x(), position.y());
            const index = this.cellAtContentPoint(point.x() + this.scrollX(), point.y() + this.scrollY());
            if (!index.isValid()) {
                event.ignore();
                return;
            }
            if (!selection.isSelected(index)) {
                selection.clearSelection();
                selection.select(index);
                this.update();
            }
            this.setCurrentIndex(index);
        } else {
            if (!this.currentIndex().isValid()) {
                event.ignore();
                return;
            }
            position = viewport.mapToCanvas(viewport.width() / 2, viewport.height() / 2);
        }

        this.#disposeContextMenu();
        const menu = new CMenu();
        const clipboard = CClipboard.instance();
        const hasSelection = selection.hasSelection();
        let editableSelection = hasSelection;
        for (const index of selection.selectedIndexesInRowOrder()) {
            if (!this.#m_tableModel.isEditable(index)) {
                editableSelection = false;
                break;
            }
        }

        const add = (label: string, enabled: boolean, execute: () => void): void => {
            const action = new CAction(label);
            action.setEnabled(enabled);
            action.triggered.connect(execute);
            menu.addAction(action);
        };
        add("Cut", editableSelection, () => this.cutSelection());
        add("Copy", hasSelection, () => this.copy());
        add("Paste", this.canPaste() && (clipboard.canReadSystemText() || clipboard.text().length > 0),
            () => { void this.#pasteFromContextMenu(); });
        menu.addSeparator();
        add("Clear", editableSelection, () => this.clearSelectedCells());

        this.setFocus();
        this.#contextMenu = menu;
        menu.closed.connect(() => {
            if (this.#contextMenu !== menu) return;
            this.#contextMenu = null;
            menu.destroy();
        });
        event.accept();
        menu.exec(position);
    }

    async #pasteFromContextMenu(): Promise<void> {
        const model = this.model();
        const index = this.currentIndex();
        const request = ++this.#pasteRequest;
        const clipboard = CClipboard.instance();
        if (!clipboard.canReadSystemText()) {
            this.paste(clipboard.text());
            return;
        }

        const text = await clipboard.readSystemText();
        if (request === this.#pasteRequest && text !== null && model === this.model() &&
            index.equals(this.currentIndex()) && this.isVisible() && this.isEnabled() && this.canPaste())
            this.paste(text);
    }

    #disposeContextMenu(): void {
        const menu = this.#contextMenu;
        this.#contextMenu = null;
        menu?.close();
        menu?.destroy();
    }

    override destroy(): void {
        ++this.#pasteRequest;
        this.#disposeContextMenu();
        super.destroy();
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

	/** Provides row count behavior. */
	rowCount(): number {
		return this.#m_tableModel.rowCount();
	}

	/** Sets the row count. */
	setRowCount(count: number): void {
		this.#m_tableModel.setRowCount(count);
	}

	/** Provides column count behavior. */
	columnCount(): number {
		return this.#m_tableModel.columnCount();
	}

	/** Sets the column count. */
	setColumnCount(count: number): void {
		this.#m_tableModel.setColumnCount(count);
	}

	/** Provides item behavior. */
	item(row: number, column: number): CTableWidgetItem | null {
		return this.#m_tableModel.item(row, column);
	}

	/** Sets the item. */
	setItem(row: number, column: number,
		item: CTableWidgetItem): void {
		this.#m_tableModel.setItem(row, column, item);
	}

	/** Removes and returns item. */
	takeItem(row: number, column: number): CTableWidgetItem | null {
		return this.#m_tableModel.takeItem(row, column);
	}

	/** Sets the horizontal header labels. */
	setHorizontalHeaderLabels(labels: string[]): void {
		this.#m_tableModel.setHorizontalHeaderLabels(labels);
	}

	/** Sets the vertical header labels. */
	setVerticalHeaderLabels(labels: string[]): void {
		this.#m_tableModel.setVerticalHeaderLabels(labels);
	}

	/** Returns the current item. */
	currentItem(): CTableWidgetItem | null {
		return this.#m_tableModel.itemFromIndex(this.currentIndex());
	}

	/** Sets the current item. */
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

	/** Returns the selected items. */
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

	/** Provides item from index behavior. */
	itemFromIndex(index: CModelIndex): CTableWidgetItem | null {
		return this.#m_tableModel.itemFromIndex(index);
	}

	/** Provides index from item behavior. */
	indexFromItem(item: CTableWidgetItem): CModelIndex {
		return this.#m_tableModel.indexFromItem(item);
	}
}
