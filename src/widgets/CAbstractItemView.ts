/** @module Widgets/CAbstractItemView */
import { CAbstractItemModel } from "../models/CAbstractItemModel.js";
import { CItemSelectionModel } from "../models/CItemSelectionModel.js";
import { CModelIndex } from "../models/CModelIndex.js";
import { CRect } from "../geometry/CRect.js";
import { CAbstractItemDelegate } from "./CAbstractItemDelegate.js";
import { CItemDelegate } from "./CItemDelegate.js";
import { CWidget } from "./CWidget.js";

/** Base for model-backed views, with selection, delegates and editor lifecycle handling. */
export abstract class CAbstractItemView extends CWidget {
	#m_model: CAbstractItemModel | null = null;
	#m_selectionModel: CItemSelectionModel | null = null;

	#m_itemDelegate: CAbstractItemDelegate;
	#m_rowDelegates = new Map<number, CAbstractItemDelegate>();
	#m_columnDelegates = new Map<number, CAbstractItemDelegate>();
	#m_connectedDelegates = new Set<CAbstractItemDelegate>();

	#m_editor: CWidget | null = null;
	#m_editorIndex = new CModelIndex();
	#m_editorDelegate: CAbstractItemDelegate | null = null;

	#m_disconnectDataChanged: (() => void) | null = null;
	#m_disconnectModelReset: (() => void) | null = null;
	#m_disconnectLayoutChanged: (() => void) | null = null;
	#m_disconnectRowsInserted: (() => void) | null = null;
	#m_disconnectRowsRemoved: (() => void) | null = null;

    /** Creates a new item view. */
    constructor(parent: CWidget | null = null) {
		super(parent);

		this.#m_itemDelegate = new CItemDelegate(this);
		this.#connectDelegate(this.#m_itemDelegate);
	}

	/**
 * Model providing item data for this component.
 * The initial value is `null`.
 */

    /**
    * Returns the data model installed on this view, or null.
    */
    model(): CAbstractItemModel | null {
		return this.#m_model;
	}

    /**
    * Connects the data model, creates the corresponding selection model and refreshes presentation and editing state.
    */
    setModel(model: CAbstractItemModel | null): void {
		if (this.#m_model === model)
			return;

		const oldModel = this.#m_model;

		this.#closeEditor();
		this.#disconnectModel();

		if (this.#m_selectionModel !== null) {
			this.#m_selectionModel.destroy();
			this.#m_selectionModel = null;
		}

		this.#m_model = model;

		if (model !== null) {
			this.#m_selectionModel = new CItemSelectionModel(model, this);

			this.#m_disconnectDataChanged =
				model.dataChanged.connect(() => {
					this.modelDataChanged();
				});

			this.#m_disconnectModelReset =
				model.modelReset.connect(() => {
					this.#closeEditor();
					this.#m_selectionModel?.clear();
					this.modelReset();
				});

			this.#m_disconnectLayoutChanged =
				model.layoutChanged.connect((oldIndexes, newIndexes) => {
					this.#m_selectionModel?.remapIndexes(
						oldIndexes,
						newIndexes
					);

					if (this.#m_editor !== null) {
						this.#m_editorIndex = this.#remapIndex(
							this.#m_editorIndex,
							oldIndexes,
							newIndexes
						);

						if (this.#m_editorIndex.isValid())
							this.updateEditorGeometry();
						else
							this.#closeEditor();
					}

					this.modelLayoutChanged();
				});

			this.#m_disconnectRowsInserted =
				model.rowsInserted.connect((parent, first, last) => {
					this.#remapRows(parent, first, last, true);
					this.modelRowsInserted(parent, first, last);
				});

			this.#m_disconnectRowsRemoved =
				model.rowsRemoved.connect((parent, first, last) => {
					this.#remapRows(parent, first, last, false);
					this.modelRowsRemoved(parent, first, last);
				});
		}

		this.modelChanged(oldModel, model);
	}

	/**
 * Object tracking current and selected model indexes.
 * The initial value is `null`.
 */

    /**
    * Returns the selection model associated with the installed data model, or null.
    */
    selectionModel(): CItemSelectionModel | null {
		return this.#m_selectionModel;
	}

    /**
    * Returns the keyboard-current model index, or an invalid index when no current item exists.
    */
    currentIndex(): CModelIndex {
		return this.#m_selectionModel?.currentIndex()
			?? new CModelIndex();
	}

    /**
    * Changes the keyboard-current item through the view's selection model.
    */
    setCurrentIndex(index: CModelIndex): void {
		if (this.#m_selectionModel === null)
			return;

		if (index.isValid() && index.model() !== this.#m_model)
			return;

		this.#m_selectionModel.setCurrentIndex(index);
		this.currentIndexChanged(index);
	}

    /**
    * Returns the default delegate used to paint or edit items.
    */
    itemDelegate(): CAbstractItemDelegate {
		return this.#m_itemDelegate;
	}

    /**
    * Replaces the default item-editing delegate.
    */
    setItemDelegate(delegate: CAbstractItemDelegate): void {
		if (this.#m_itemDelegate === delegate)
			return;

		this.#closeEditor();
		this.#m_itemDelegate = delegate;
		this.#connectDelegate(delegate);
	}

    /**
    * Assigns a delegate override for one model row.
    */
    setItemDelegateForRow(
		row: number,
		delegate: CAbstractItemDelegate | null
	): void {
		this.#closeEditor();

		if (delegate === null) {
			this.#m_rowDelegates.delete(row);
			return;
		}

		this.#m_rowDelegates.set(row, delegate);
		this.#connectDelegate(delegate);
	}

    /**
    * Assigns a delegate override for one model column.
    */
    setItemDelegateForColumn(
		column: number,
		delegate: CAbstractItemDelegate | null
	): void {
		this.#closeEditor();

		if (delegate === null) {
			this.#m_columnDelegates.delete(column);
			return;
		}

		this.#m_columnDelegates.set(column, delegate);
		this.#connectDelegate(delegate);
	}

    /**
    * Resolves an index-specific delegate using row and column overrides and the default delegate.
    */
    itemDelegateForIndex(index: CModelIndex): CAbstractItemDelegate {
		return this.#m_rowDelegates.get(index.row())
			?? this.#m_columnDelegates.get(index.column())
			?? this.#m_itemDelegate;
	}

    /**
    * Attempts to open an editor for a valid editable model index and returns whether editing began.
    */
    edit(index: CModelIndex): boolean {
		const model = this.#m_model;

		if (model === null
			|| !index.isValid()
			|| index.model() !== model
			|| !model.isEditable(index)) {
			return false;
		}

		if (this.#m_editor !== null) {
			if (this.#m_editorIndex.equals(index))
				return true;

			this.#commitEditor(this.#m_editor);
			this.#closeEditor();
		}

		const delegate = this.itemDelegateForIndex(index);
		const editor = delegate.createEditor(this.editorParent(), index);

		if (editor === null)
			return false;

		this.#m_editor = editor;
		this.#m_editorIndex = index;
		this.#m_editorDelegate = delegate;

		delegate.setEditorData(editor, index);
		delegate.updateEditorGeometry(editor, this.visualRect(index));
		editor.show();
		editor.setFocus();
		delegate.editorShown(editor, index);

		return true;
	}

    /** Returns the item rectangle in editor-parent coordinates. */
    abstract visualRect(index: CModelIndex): CRect;

    /** Returns the widget used as editor parent. */
    protected abstract editorParent(): CWidget;

    /**
    * Override to rebuild presentation after the associated model is replaced.
    */
    protected modelChanged(
		_oldModel: CAbstractItemModel | null,
		_newModel: CAbstractItemModel | null
	): void {
		this.update();
	}

    /**
    * Override to refresh presentation after model values change.
    */
    protected modelDataChanged(): void {
		this.update();
	}

    /**
    * Override to discard stale view state after a model reset.
    */
    protected modelReset(): void {
		this.update();
	}

    /**
    * Override to refresh item geometry after model ordering changes.
    */
    protected modelLayoutChanged(): void {
		this.update();
	}

    /**
    * Override to update presentation for an inserted row interval.
    */
    protected modelRowsInserted(
		_parent: CModelIndex,
		_first: number,
		_last: number
	): void {
		this.update();
	}

    /**
    * Override to update presentation for a removed row interval.
    */
    protected modelRowsRemoved(
		_parent: CModelIndex,
		_first: number,
		_last: number
	): void {
		this.update();
	}

    /**
    * Override to react after the view's keyboard-current index changes.
    */
    protected currentIndexChanged(index: CModelIndex): void {
		if (this.#m_editor !== null
			&& !this.#m_editorIndex.equals(index)) {
			this.#commitEditor(this.#m_editor);
			this.#closeEditor();
		}

		this.update();
	}

    /**
    * Override to release view-specific state after an item editor closes.
    */
    protected editorClosed(): void {
		this.update();
	}

    /**
    * Override to keep an active editor aligned with its model item's current rectangle.
    */
    protected updateEditorGeometry(): void {
		if (this.#m_editor === null
			|| this.#m_editorDelegate === null
			|| !this.#m_editorIndex.isValid()) {
			return;
		}

		this.#m_editorDelegate.updateEditorGeometry(
			this.#m_editor,
			this.visualRect(this.#m_editorIndex)
		);
	}

	#connectDelegate(delegate: CAbstractItemDelegate): void {
		if (this.#m_connectedDelegates.has(delegate))
			return;

		this.#m_connectedDelegates.add(delegate);

		delegate.commitData.connect(editor => {
			this.#commitEditor(editor);
		});

		delegate.closeEditor.connect(editor => {
			if (editor === this.#m_editor)
				this.#closeEditor();
		});
	}

	#commitEditor(editor: CWidget): void {
		if (editor !== this.#m_editor
			|| this.#m_model === null
			|| this.#m_editorDelegate === null
			|| !this.#m_editorIndex.isValid()) {
			return;
		}

		this.#m_editorDelegate.setModelData(
			editor,
			this.#m_model,
			this.#m_editorIndex
		);
	}

	#closeEditor(): void {
		const editor = this.#m_editor;

		if (editor === null)
			return;

		this.#m_editor = null;
		this.#m_editorIndex = new CModelIndex();
		this.#m_editorDelegate = null;

		editor.destroy();
		this.editorClosed();
	}

	#remapIndex(
		index: CModelIndex,
		oldIndexes: CModelIndex[],
		newIndexes: CModelIndex[]
	): CModelIndex {
		const position = oldIndexes.findIndex(old => old.equals(index));

		return position >= 0
			? newIndexes[position] ?? new CModelIndex()
			: index;
	}

	#remapRows(
		parent: CModelIndex,
		first: number,
		last: number,
		inserting: boolean
	): void {
		if (this.#m_model === null)
			return;

		const count = last - first + 1;
		const indexes = [
			...(this.#m_selectionModel?.indexesForRowChange() ?? []),
			this.currentIndex(),
			this.#m_editorIndex
		];
		const oldIndexes: CModelIndex[] = [];
		const newIndexes: CModelIndex[] = [];

		for (const index of indexes) {
			if (!index.isValid() || index.model() !== this.#m_model
				|| !this.#m_model.parentIndex(index).equals(parent)
				|| oldIndexes.some(existing => existing.equals(index))) {
				continue;
			}

			let newRow = index.row();
			if (inserting) {
				if (newRow < first)
					continue;
				newRow += count;
			} else if (newRow >= first && newRow <= last) {
				newRow = -1;
			} else if (newRow > last) {
				newRow -= count;
			} else {
				continue;
			}

			oldIndexes.push(index);
			newIndexes.push(newRow < 0
				? new CModelIndex()
				: this.#m_model.index(newRow, index.column(), parent));
		}

		this.#m_selectionModel?.remapIndexes(oldIndexes, newIndexes);
		if (this.#m_editor !== null) {
			this.#m_editorIndex = this.#remapIndex(
				this.#m_editorIndex,
				oldIndexes,
				newIndexes
			);
			if (this.#m_editorIndex.isValid())
				this.updateEditorGeometry();
			else
				this.#closeEditor();
		}

		if (!parent.isValid())
			this.#remapRowDelegates(first, last, inserting);
	}

	#remapRowDelegates(first: number, last: number, inserting: boolean): void {
		const count = last - first + 1;
		const remapped = new Map<number, CAbstractItemDelegate>();

		for (const [row, delegate] of this.#m_rowDelegates) {
			if (inserting)
				remapped.set(row >= first ? row + count : row, delegate);
			else if (row < first)
				remapped.set(row, delegate);
			else if (row > last)
				remapped.set(row - count, delegate);
		}
		this.#m_rowDelegates = remapped;
	}

	#disconnectModel(): void {
		if (this.#m_disconnectDataChanged !== null) {
			this.#m_disconnectDataChanged();
			this.#m_disconnectDataChanged = null;
		}

		if (this.#m_disconnectModelReset !== null) {
			this.#m_disconnectModelReset();
			this.#m_disconnectModelReset = null;
		}

		if (this.#m_disconnectLayoutChanged !== null) {
			this.#m_disconnectLayoutChanged();
			this.#m_disconnectLayoutChanged = null;
		}

		if (this.#m_disconnectRowsInserted !== null) {
			this.#m_disconnectRowsInserted();
			this.#m_disconnectRowsInserted = null;
		}

		if (this.#m_disconnectRowsRemoved !== null) {
			this.#m_disconnectRowsRemoved();
			this.#m_disconnectRowsRemoved = null;
		}
	}
}
