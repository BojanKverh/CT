import { CSignal } from "../core/CSignal.js";
import { COrientation } from "../gui/COrientation.js";
import { CAbstractItemModel } from "../models/CAbstractItemModel.js";
import { CModelIndex } from "../models/CModelIndex.js";
import { CTreeView } from "./CTreeView.js";
import { CTreeWidgetItem } from "./CTreeWidgetItem.js";
import { CWidget } from "./CWidget.js";

class CTreeWidgetModel extends CAbstractItemModel {
	#m_items: CTreeWidgetItem[] = [];
	#m_headerLabels: string[] = [];

	rowCount(parent: CModelIndex = new CModelIndex()): number {
		if (!parent.isValid())
			return this.#m_items.length;

		const item = parent.data();

		if (!(item instanceof CTreeWidgetItem))
			return 0;

		return item.childCount();
	}

	columnCount(_parent: CModelIndex = new CModelIndex()): number {
		let count = this.#m_headerLabels.length;

		const visit = (item: CTreeWidgetItem): void => {
			count = Math.max(count, item.columnCount());

			for (let i = 0; i < item.childCount(); i++) {
				const child = item.child(i);

				if (child !== null)
					visit(child);
			}
		};

		for (const item of this.#m_items)
			visit(item);

		return count;
	}

	override index(row: number, column: number,
		parent: CModelIndex = new CModelIndex()): CModelIndex {
		if (row < 0 || column < 0 ||
			column >= this.columnCount(parent))
			return new CModelIndex();

		let item: CTreeWidgetItem | null;

		if (!parent.isValid()) {
			item = this.#m_items[row] ?? null;
		} else {
			const parentItem = parent.data();

			if (!(parentItem instanceof CTreeWidgetItem))
				return new CModelIndex();

			item = parentItem.child(row);
		}

		if (item === null)
			return new CModelIndex();

		return this.createIndex(row, column, item);
	}

	override parentIndex(index: CModelIndex): CModelIndex {
		if (!index.isValid() || index.model() !== this)
			return new CModelIndex();

		const item = index.data();

		if (!(item instanceof CTreeWidgetItem))
			return new CModelIndex();

		const parent = item.parent();

		if (parent === null)
			return new CModelIndex();

		const grandParent = parent.parent();
		let row: number;

		if (grandParent === null) {
			row = this.#m_items.indexOf(parent);
		} else {
			row = grandParent.indexOfChild(parent);
		}

		if (row < 0)
			return new CModelIndex();

		return this.createIndex(row, 0, parent);
	}

	data(index: CModelIndex): unknown {
		if (!index.isValid() || index.model() !== this)
			return null;

		const item = index.data();

		if (!(item instanceof CTreeWidgetItem))
			return null;

		return item.text(index.column());
	}

    override headerData(section: number,
		orientation: COrientation): string | number | null {
	        if (orientation !== COrientation.Horizontal)
			return super.headerData(section, orientation);

		return this.#m_headerLabels[section] ?? "";
	}

	topLevelItem(index: number): CTreeWidgetItem | null {
		return this.#m_items[index] ?? null;
	}

	topLevelItemCount(): number {
		return this.#m_items.length;
	}

	indexOfTopLevelItem(item: CTreeWidgetItem): number {
		return this.#m_items.indexOf(item);
	}

	addTopLevelItem(item: CTreeWidgetItem): void {
		this.insertTopLevelItem(this.#m_items.length, item);
	}

	insertTopLevelItem(index: number, item: CTreeWidgetItem): void {
		if (item.parent() !== null)
			item.parent()?.removeChild(item);

		const oldIndex = this.#m_items.indexOf(item);

		if (oldIndex >= 0) {
			this.#m_items.splice(oldIndex, 1);

			if (oldIndex < index)
				index--;
		}

		index = Math.max(0, Math.min(index, this.#m_items.length));

		this.#m_items.splice(index, 0, item);
		this.resetModel();
	}

	takeTopLevelItem(index: number): CTreeWidgetItem | null {
		if (index < 0 || index >= this.#m_items.length)
			return null;

		const item = this.#m_items[index];

		if (item === undefined)
			return null;

		this.#m_items.splice(index, 1);
		this.resetModel();

		return item;
	}

	setHeaderLabels(labels: string[]): void {
		this.#m_headerLabels = [...labels];
		this.resetModel();
	}

	itemFromIndex(index: CModelIndex): CTreeWidgetItem | null {
		if (!index.isValid() || index.model() !== this)
			return null;

		const item = index.data();

		return item instanceof CTreeWidgetItem
			? item
			: null;
	}

	indexFromItem(item: CTreeWidgetItem,
		column: number = 0): CModelIndex {
		if (column < 0 || column >= this.columnCount())
			return new CModelIndex();

		const parent = item.parent();

		if (parent === null) {
			const row = this.#m_items.indexOf(item);

			if (row < 0)
				return new CModelIndex();

			return this.createIndex(row, column, item);
		}

		const parentIndex = this.indexFromItem(parent);

		if (!parentIndex.isValid())
			return new CModelIndex();

		const row = parent.indexOfChild(item);

		if (row < 0)
			return new CModelIndex();

		return this.createIndex(row, column, item);
	}
}

/** Implements the tree widget widget. */
export class CTreeWidget extends CTreeView {
	#m_treeModel: CTreeWidgetModel;

	/** Signal emitted when current item changes. */
	readonly currentItemChanged =
		new CSignal<[CTreeWidgetItem | null, CTreeWidgetItem | null]>();

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null) {
		/** Provides super behavior. */
		super(parent);

		this.#m_treeModel = new CTreeWidgetModel(this);
		this.setModel(this.#m_treeModel);

		this.selectionModel()?.currentChanged.connect(
			(current, previous) => {
				this.currentItemChanged.emit(
					this.#m_treeModel.itemFromIndex(current),
					this.#m_treeModel.itemFromIndex(previous)
				);
			}
		);
	}

	/** Adds top level item. */
	addTopLevelItem(item: CTreeWidgetItem): void {
		this.#m_treeModel.addTopLevelItem(item);
	}

	/** Inserts top level item. */
	insertTopLevelItem(index: number, item: CTreeWidgetItem): void {
		this.#m_treeModel.insertTopLevelItem(index, item);
	}

	/** Removes and returns top level item. */
	takeTopLevelItem(index: number): CTreeWidgetItem | null {
		return this.#m_treeModel.takeTopLevelItem(index);
	}

	/** Provides top level item behavior. */
	topLevelItem(index: number): CTreeWidgetItem | null {
		return this.#m_treeModel.topLevelItem(index);
	}

	/** Provides top level item count behavior. */
	topLevelItemCount(): number {
		return this.#m_treeModel.topLevelItemCount();
	}

	/** Provides index of top level item behavior. */
	indexOfTopLevelItem(item: CTreeWidgetItem): number {
		return this.#m_treeModel.indexOfTopLevelItem(item);
	}

	/** Sets the header labels. */
	setHeaderLabels(labels: string[]): void {
		this.#m_treeModel.setHeaderLabels(labels);
	}

	/** Returns the current item. */
	currentItem(): CTreeWidgetItem | null {
		return this.#m_treeModel.itemFromIndex(this.currentIndex());
	}

	/** Sets the current item. */
	setCurrentItem(item: CTreeWidgetItem | null,
		column: number = 0): void {
		/** Provides if behavior. */
		if (item === null) {
			this.setCurrentIndex(new CModelIndex());
			return;
		}

		const index =
			this.#m_treeModel.indexFromItem(item, column);

		/** Provides if behavior. */
		if (index.isValid())
			this.setCurrentIndex(index);
	}

	/** Returns the selected items. */
	selectedItems(): CTreeWidgetItem[] {
		const selectionModel = this.selectionModel();

		/** Provides if behavior. */
		if (selectionModel === null)
			return [];

		const result: CTreeWidgetItem[] = [];

		/** Provides for behavior. */
		for (const index of selectionModel.selectedIndexes()) {
			const item =
				this.#m_treeModel.itemFromIndex(index);

			/** Provides if behavior. */
			if (item !== null && !result.includes(item))
				result.push(item);
		}

		return result;
	}

	/** Provides item from index behavior. */
	itemFromIndex(index: CModelIndex): CTreeWidgetItem | null {
		return this.#m_treeModel.itemFromIndex(index);
	}

	/** Provides index from item behavior. */
	indexFromItem(item: CTreeWidgetItem,
		column: number = 0): CModelIndex {
		return this.#m_treeModel.indexFromItem(item, column);
	}
}