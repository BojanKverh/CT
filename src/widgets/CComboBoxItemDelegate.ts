import { CSignal } from "../core/CSignal.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CAbstractItemModel } from "../models/CAbstractItemModel.js";
import { CModelIndex } from "../models/CModelIndex.js";
import { CAbstractItemDelegate } from "./CAbstractItemDelegate.js";
import { CComboBox } from "./CComboBox.js";
import { CWidget } from "./CWidget.js";

class CComboBoxItemDelegateEditor extends CComboBox {
	readonly accepted = new CSignal<[]>();
	readonly canceled = new CSignal<[]>();

	protected override keyPressEvent(event: CKeyEvent): void {
		if (event.key() === "Escape") {
			this.hidePopup();
			event.accept();
			this.canceled.emit();
			return;
		}

		if (event.key() === "Enter") {
			event.accept();
			if (this.popup().isOpen()) {
				this.activatePopupItem();
				return;
			}

			this.accepted.emit();
			return;
		}

		super.keyPressEvent(event);
	}
}

/** Item delegate using a combo box with a predefined set of values. */
export class CComboBoxItemDelegate extends CAbstractItemDelegate {
	#m_items: string[] = [];
	#m_editable = false;

	/** Creates a combo-box delegate with optional initial items. */
	constructor(items: readonly string[] = []) {
		super();
		this.#m_items = [...items];
	}

	/** Returns a copy of the available items. */
	items(): readonly string[] {
		return [...this.#m_items];
	}

	/** Replaces all available items. */
	setItems(items: readonly string[]): void {
		this.#m_items = [...items];
	}

	/** Adds an available item. */
	addItem(text: string): void {
		this.#m_items.push(text);
	}

	/** Returns whether editors accept arbitrary text. */
	isEditable(): boolean {
		return this.#m_editable;
	}

	/** Sets whether editors accept arbitrary text. */
	setEditable(editable: boolean): void {
		this.#m_editable = editable;
	}

	override createEditor(
		parent: CWidget,
		_index: CModelIndex
	): CWidget {
		const editor = new CComboBoxItemDelegateEditor(parent);
		editor.setFocusPolicy(CFocusPolicy.StrongFocus);
		editor.listWidget().setFocusPolicy(CFocusPolicy.StrongFocus);
		editor.addItems(this.#m_items);
		editor.setEditable(this.#m_editable);

		editor.accepted.connect(() => {
			this.commitData.emit(editor);
			this.closeEditor.emit(editor);
		});

		editor.canceled.connect(() => {
			this.closeEditor.emit(editor);
		});

		editor.activated.connect(() => {
			this.commitData.emit(editor);
			this.closeEditor.emit(editor);
		});

		return editor;
	}

	override setEditorData(editor: CWidget, index: CModelIndex): void {
		if (!(editor instanceof CComboBox))
			return;

		const value = index.model()?.data(index);
		const text = value === null || value === undefined ? "" : String(value);
		const itemIndex = editor.findText(text);

		if (itemIndex >= 0) {
			editor.setCurrentIndex(itemIndex);
			return;
		}

		if (editor.isEditable()) {
			editor.setCurrentIndex(-1);
			editor.setCurrentText(text);
			return;
		}

		editor.setCurrentIndex(-1);
		editor.lineEdit().setText(text);
	}

	override editorShown(editor: CWidget, _index: CModelIndex): void {
		if (editor instanceof CComboBox)
			editor.showPopup();
	}

	override setModelData(
		editor: CWidget,
		model: CAbstractItemModel,
		index: CModelIndex
	): void {
		if (editor instanceof CComboBox)
			model.setItemData(index, editor.currentText());
	}
}
