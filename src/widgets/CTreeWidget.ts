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

	/**
	 * Counts the children under a supplied parent index. An invalid parent denotes the root.
	 * @param parent Parent index, or an omitted or invalid index for top-level items.
	 * @returns Number of child items, or zero if a valid parent has no tree item.
	 */
	rowCount(parent: CModelIndex = new CModelIndex()): number {
		if (!parent.isValid())
			return this.#m_items.length;

		const item = parent.data();

		if (!(item instanceof CTreeWidgetItem))
			return 0;

		return item.childCount();
	}

	/**
	 * Measures the widest item across the whole tree and includes any configured headers.
	 * @param _parent Parent index. The model uses one column count for the entire tree.
	 * @returns Number of columns required by the headers and items.
	 */
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

	/**
	 * Builds an index that carries the corresponding tree item as its internal payload.
	 * @param row Zero-based row among the parent's children.
	 * @param column Zero-based column.
	 * @param parent Parent index, or an invalid index for a root item.
	 * @returns Owned index for an existing item and column, or an invalid index.
	 */
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

	/**
	 * Resolves a tree item's parent and finds that parent among its own siblings.
	 * @param index Index owned by this tree model.
	 * @returns Parent index at column zero, or an invalid index for a root, foreign, invalid or unresolvable item.
	 */
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

	/**
	 * Reads an item's text for the indexed column.
	 * @param index Index owned by this tree model.
	 * @returns Item text, or `null` when the index does not identify a tree item.
	 */
	data(index: CModelIndex): unknown {
		if (!index.isValid() || index.model() !== this)
			return null;

		const item = index.data();

		if (!(item instanceof CTreeWidgetItem))
			return null;

		return item.text(index.column());
	}

    /**
     * Reads a horizontal header label or uses the default row numbering for vertical headers.
     * @param section Zero-based header section.
     * @param orientation Horizontal for labels or vertical for row numbers.
     * @returns Configured label, an empty string for an unset horizontal label, or a one-based vertical number.
     */
    override headerData(section: number,
		orientation: COrientation): string | number | null {
	        if (orientation !== COrientation.Horizontal)
			return super.headerData(section, orientation);

		return this.#m_headerLabels[section] ?? "";
	}

	/**
	 * Looks up a root item without changing the tree.
	 * @param index Zero-based position among top-level items.
	 * @returns The item at that position, or `null` if absent.
	 */
	topLevelItem(index: number): CTreeWidgetItem | null {
		return this.#m_items[index] ?? null;
	}

	/**
	 * Reads the number of entries in the items.
	 * @returns The number of entries in the items.
	 */
	topLevelItemCount(): number {
		return this.#m_items.length;
	}

	/**
	 * Finds a root item by identity.
	 * @param item Item to locate in the top-level list.
	 * @returns Zero-based position, or `-1` if the item is not at the root.
	 */
	indexOfTopLevelItem(item: CTreeWidgetItem): number {
		return this.#m_items.indexOf(item);
	}

	/**
	 * Adds a top level item.
	 * @param item Item to operate on.
	 */
	addTopLevelItem(item: CTreeWidgetItem): void {
		this.insertTopLevelItem(this.#m_items.length, item);
	}

	/**
	 * Inserts a top level item. May emit a model reset.
	 * @param index Zero-based item index.
	 * @param item Item to operate on.
	 */
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

	/**
	 * Removes a root item and its subtree from the tree and resets the model. The item remains usable by the caller.
	 * @param index Zero-based position among top-level items.
	 * @returns The removed item, or `null` if the position is invalid.
	 */
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

	/**
	 * Sets the header labels. May emit a model reset.
	 * @param labels Labels.
	 */
	setHeaderLabels(labels: string[]): void {
		this.#m_headerLabels = [...labels];
		this.resetModel();
	}

	/**
	 * Resolves a model index to its backing tree item.
	 * @param index Index owned by this tree's model.
	 * @returns The item stored in the index, or `null` for an invalid, foreign or unsuitable index.
	 */
	itemFromIndex(index: CModelIndex): CTreeWidgetItem | null {
		if (!index.isValid() || index.model() !== this)
			return null;

		const item = index.data();

		return item instanceof CTreeWidgetItem
			? item
			: null;
	}

	/**
	 * Builds a model index from the item's position among its siblings.
	 * @param item Tree item to locate.
	 * @param column Zero-based column, defaulting to zero.
	 * @returns Index for the item and column, or an invalid index if the position cannot be resolved.
	 */
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

	/**
	 * Adds top level item.
	 * @param item Item to operate on.
	 */
	addTopLevelItem(item: CTreeWidgetItem): void {
		this.#m_treeModel.addTopLevelItem(item);
	}

	/**
	 * Inserts top level item.
	 * @param index Zero-based item index.
	 * @param item Item to operate on.
	 */
	insertTopLevelItem(index: number, item: CTreeWidgetItem): void {
		this.#m_treeModel.insertTopLevelItem(index, item);
	}

	/**
	 * Removes a root item and its subtree from the tree and resets the model. The item remains usable by the caller.
	 * @param index Zero-based position among top-level items.
	 * @returns The removed item, or `null` if the position is invalid.
	 */
	takeTopLevelItem(index: number): CTreeWidgetItem | null {
		return this.#m_treeModel.takeTopLevelItem(index);
	}

	/**
	 * Looks up a root item without changing the tree.
	 * @param index Zero-based position among top-level items.
	 * @returns The item at that position, or `null` if absent.
	 */
	topLevelItem(index: number): CTreeWidgetItem | null {
		return this.#m_treeModel.topLevelItem(index);
	}

	/**
	 * Reads the top level item count of the tree widget.
	 * @returns The top level item count.
	 */
	topLevelItemCount(): number {
		return this.#m_treeModel.topLevelItemCount();
	}

	/**
	 * Finds a root item by identity.
	 * @param item Item to locate in the top-level list.
	 * @returns Zero-based position, or `-1` if the item is not at the root.
	 */
	indexOfTopLevelItem(item: CTreeWidgetItem): number {
		return this.#m_treeModel.indexOfTopLevelItem(item);
	}

	/**
	 * Sets the header labels.
	 * @param labels Labels.
	 */
	setHeaderLabels(labels: string[]): void {
		this.#m_treeModel.setHeaderLabels(labels);
	}

	/**
	 * Resolves the current model index to a tree item.
	 * @returns Current item, or `null` if no current tree item is resolved.
	 */
	currentItem(): CTreeWidgetItem | null {
		return this.#m_treeModel.itemFromIndex(this.currentIndex());
	}

	/**
	 * Sets the current item.
	 * @param item Item to operate on.
	 * @param column Zero-based column. Defaults to `0`.
	 */
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

	/**
	 * Maps selected model indexes to items and deduplicates multi-column selections.
	 * @returns A new array of selected items, in selection order.
	 */
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

	/**
	 * Resolves a model index to its backing tree item.
	 * @param index Index owned by this tree's model.
	 * @returns The item stored in the index, or `null` for an invalid, foreign or unsuitable index.
	 */
	itemFromIndex(index: CModelIndex): CTreeWidgetItem | null {
		return this.#m_treeModel.itemFromIndex(index);
	}

	/**
	 * Builds a model index from the item's position among its siblings.
	 * @param item Tree item to locate.
	 * @param column Zero-based column, defaulting to zero.
	 * @returns Index for the item and column, or an invalid index if the position cannot be resolved.
	 */
	indexFromItem(item: CTreeWidgetItem,
		column: number = 0): CModelIndex {
		return this.#m_treeModel.indexFromItem(item, column);
	}
}