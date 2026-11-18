import { CAbstractItemModel } from "../models/CAbstractItemModel.js";
import { CModelIndex } from "../models/CModelIndex.js";
import { CSqlRelationalTableModel } from "../models/CSqlRelationalTableModel.js";
import { CEvent } from "../events/CEvent.js";
import { CRect } from "../geometry/CRect.js";
import { CPainter } from "../painting/CPainter.js";
import { CAbstractItemDelegate } from "./CAbstractItemDelegate.js";
import { CComboBox } from "./CComboBox.js";
import { CComboBoxItemDelegate } from "./CComboBoxItemDelegate.js";
import { CItemDelegate } from "./CItemDelegate.js";
import { CWidget } from "./CWidget.js";

type EditorDelegate = {
	delegate: CAbstractItemDelegate;
	relationColumn: number | null;
};

/** Uses combo-box editors for relations and line editors for other columns. */
export class CSqlRelationalDelegate extends CAbstractItemDelegate {
	#m_defaultDelegate = new CItemDelegate(this);
	#m_editorDelegates = new WeakMap<CWidget, EditorDelegate>();

	constructor() {
		super();
		this.#forwardSignals(this.#m_defaultDelegate);
	}

	/**
	 * Forwards custom cell drawing to the default item delegate.
	 * @param painter Painter for the cell.
	 * @param rect Cell bounds in view coordinates.
	 * @param index Model index supplying the cell value.
	 * @param widget View widget supplying rendering context.
	 * @returns `true` if the default delegate drew the cell.
	 */
	override paint(
		painter: CPainter,
		rect: CRect,
		index: CModelIndex,
		widget: CWidget
	): boolean {
		return this.#m_defaultDelegate.paint(painter, rect, index, widget);
	}

	/**
	 * Forwards inline input handling to the default delegate.
	 * @param event Input event to handle.
	 * @param model Model containing the cell.
	 * @param index Target cell index.
	 * @param rect Cell bounds used for hit testing.
	 * @returns `true` if the default delegate handled the event.
	 */
	override editorEvent(
		event: CEvent,
		model: CAbstractItemModel,
		index: CModelIndex,
		rect: CRect
	): boolean {
		return this.#m_defaultDelegate.editorEvent(
			event,
			model,
			index,
			rect
		);
	}

	/**
	 * Creates a combo box containing relation display values for a relational column. Other cells use the default editor delegate.
	 * @param parent Widget that will own the editor.
	 * @param index Model index supplying the cell and its relation column.
	 * @returns New editor, or `null` if the default delegate handles the cell inline.
	 */
	override createEditor(parent: CWidget, index: CModelIndex): CWidget | null {
		const model = index.model();
		if (!(model instanceof CSqlRelationalTableModel)
			|| model.relation(index.column()) === null) {
			const editor = this.#m_defaultDelegate.createEditor(parent, index);
			if (editor !== null) {
				this.#m_editorDelegates.set(editor, {
					delegate: this.#m_defaultDelegate,
					relationColumn: null
				});
			}
			return editor;
		}

		const delegate = new CComboBoxItemDelegate(
			model.relationDisplayValues(index.column())
		);
		this.#forwardSignals(delegate);
		const editor = delegate.createEditor(parent, index);
		this.#m_editorDelegates.set(editor, {
			delegate,
			relationColumn: index.column()
		});
		return editor;
	}

	/**
	 * Populates the registered editor with the value through the editor's creating delegate.
	 * @param editor Editor widget created for the cell.
	 * @param index Model index supplying the initial value.
	 */
	override setEditorData(editor: CWidget, index: CModelIndex): void {
		this.#m_editorDelegates.get(editor)?.delegate
			.setEditorData(editor, index);
	}

	/**
	 * Writes the editor's value or relation key back to the target cell when the editor is applicable.
	 * @param editor Editor containing the edited value.
	 * @param model Model to update.
	 * @param index Index receiving the edited value.
	 */
	override setModelData(
		editor: CWidget,
		model: CAbstractItemModel,
		index: CModelIndex
	): void {
		const entry = this.#m_editorDelegates.get(editor);
		if (entry === undefined)
			return;

		if (entry.relationColumn !== null
			&& model instanceof CSqlRelationalTableModel
			&& editor instanceof CComboBox
			&& editor.currentIndex() >= 0) {
			model.setItemData(
				index,
				model.relationKeyAt(
					entry.relationColumn,
					editor.currentIndex()
				)
			);
			return;
		}

		entry.delegate.setModelData(editor, model, index);
	}

	/**
	 * Notifies the delegate that created the editor so it can perform its post-show behavior.
	 * @param editor Editor being shown.
	 * @param index Model index of the edited cell.
	 */
	override editorShown(editor: CWidget, index: CModelIndex): void {
		this.#m_editorDelegates.get(editor)?.delegate
			.editorShown(editor, index);
	}

	#forwardSignals(delegate: CAbstractItemDelegate): void {
		delegate.commitData.connect(editor => this.commitData.emit(editor));
		delegate.closeEditor.connect(editor => this.closeEditor.emit(editor));
	}
}
