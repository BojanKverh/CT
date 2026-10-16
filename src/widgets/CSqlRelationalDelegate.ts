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

	override paint(
		painter: CPainter,
		rect: CRect,
		index: CModelIndex,
		widget: CWidget
	): boolean {
		return this.#m_defaultDelegate.paint(painter, rect, index, widget);
	}

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

	override setEditorData(editor: CWidget, index: CModelIndex): void {
		this.#m_editorDelegates.get(editor)?.delegate
			.setEditorData(editor, index);
	}

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

	override editorShown(editor: CWidget, index: CModelIndex): void {
		this.#m_editorDelegates.get(editor)?.delegate
			.editorShown(editor, index);
	}

	#forwardSignals(delegate: CAbstractItemDelegate): void {
		delegate.commitData.connect(editor => this.commitData.emit(editor));
		delegate.closeEditor.connect(editor => this.closeEditor.emit(editor));
	}
}
