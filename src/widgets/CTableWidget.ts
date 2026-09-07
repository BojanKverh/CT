import { CSignal } from "../core/CSignal.js";
import { COrientation } from "../gui/COrientation.js";
import { CAbstractItemModel } from "../models/CAbstractItemModel.js";
import { CModelIndex } from "../models/CModelIndex.js";
import { CTableView } from "./CTableView.js";
import { CTableWidgetItem } from "./CTableWidgetItem.js";
import { CWidget } from "./CWidget.js";

class CTableWidgetModel extends CAbstractItemModel {
	#m_items: Array<Array<CTableWidgetItem | null>> = [];
	#m_columnCount = 0;
	#m_horizontalHeaderLabels: string[] = [];
	#m_verticalHeaderLabels: string[] = [];

	rowCount(_parent: CModelIndex = new CModelIndex()): number {
		return this.#m_items.length;
	}

	columnCount(_parent: CModelIndex = new CModelIndex()): number {
		return this.#m_columnCount;
	}

	data(index: CModelIndex): string | null {
		if (!index.isValid() || index.model() !== this)
			return null;

		return this.item(index.row(), index.column())?.text() ?? null;
	}

	override headerData(section: number,
		orientation: COrientation): string | number | null {
		if (orientation === COrientation.Horizontal)
			return this.#m_horizontalHeaderLabels[section] ??
				super.headerData(section, orientation);

		return this.#m_verticalHeaderLabels[section] ??
			super.headerData(section, orientation);
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
}

export class CTableWidget extends CTableView {
	#m_tableModel: CTableWidgetModel;

	readonly currentItemChanged =
		new CSignal<[CTableWidgetItem | null, CTableWidgetItem | null]>();

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

	rowCount(): number {
		return this.#m_tableModel.rowCount();
	}

	setRowCount(count: number): void {
		this.#m_tableModel.setRowCount(count);
	}

	columnCount(): number {
		return this.#m_tableModel.columnCount();
	}

	setColumnCount(count: number): void {
		this.#m_tableModel.setColumnCount(count);
	}

	item(row: number, column: number): CTableWidgetItem | null {
		return this.#m_tableModel.item(row, column);
	}

	setItem(row: number, column: number,
		item: CTableWidgetItem): void {
		this.#m_tableModel.setItem(row, column, item);
	}

	takeItem(row: number, column: number): CTableWidgetItem | null {
		return this.#m_tableModel.takeItem(row, column);
	}

	setHorizontalHeaderLabels(labels: string[]): void {
		this.#m_tableModel.setHorizontalHeaderLabels(labels);
	}

	setVerticalHeaderLabels(labels: string[]): void {
		this.#m_tableModel.setVerticalHeaderLabels(labels);
	}

	currentItem(): CTableWidgetItem | null {
		return this.#m_tableModel.itemFromIndex(this.currentIndex());
	}

	setCurrentItem(item: CTableWidgetItem | null): void {
		if (item === null) {
			this.setCurrentIndex(new CModelIndex());
			return;
		}

		const index = this.#m_tableModel.indexFromItem(item);

		if (index.isValid())
			this.setCurrentIndex(index);
	}

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

	itemFromIndex(index: CModelIndex): CTableWidgetItem | null {
		return this.#m_tableModel.itemFromIndex(index);
	}

	indexFromItem(item: CTableWidgetItem): CModelIndex {
		return this.#m_tableModel.indexFromItem(item);
	}
}