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

	/**
	 * Responds to a key press for the combo box item delegate editor. May accept the event. May emit `canceled`, `accepted`.
	 * @param event Event for a key press.
	 */
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

	/**
	 * Returns a copy of the available items.
	 * @returns The items.
	 */
	items(): readonly string[] {
		return [...this.#m_items];
	}

	/**
	 * Replaces all available items.
	 * @param items Items.
	 */
	setItems(items: readonly string[]): void {
		this.#m_items = [...items];
	}

	/**
	 * Adds a choice to the list used to populate future editors.
	 * @param text Display text for the new choice.
	 */
	addItem(text: string): void {
		this.#m_items.push(text);
	}

	/**
	 * Returns whether editors accept arbitrary text.
	 * @returns `true` if the combo box item delegate is editable, otherwise `false`.
	 */
	isEditable(): boolean {
		return this.#m_editable;
	}

	/**
	 * Sets whether editors accept arbitrary text.
	 * @param editable Editable flag.
	 */
	setEditable(editable: boolean): void {
		this.#m_editable = editable;
	}

	/**
	 * Creates a combo-box editor with the configured choices and editability and connects its acceptance and cancellation to the delegate's editing signals.
	 * @param parent Widget that will own the editor.
	 * @param _index Model index of the edited cell. The initial cell value is applied separately by `setEditorData()`.
	 * @returns The new editor widget.
	 */
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

	/**
	 * Populates combo box with the cell value converted to text.
	 * @param editor Editor widget created for the cell.
	 * @param index Model index supplying the initial value.
	 */
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

	/**
	 * Opens the choice popup when the combo box is first shown as an editor.
	 * @param editor Newly shown editor widget.
	 * @param _index Index of the edited item. The popup does not depend on the index.
	 */
	override editorShown(editor: CWidget, _index: CModelIndex): void {
		if (editor instanceof CComboBox)
			editor.showPopup();
	}

	/**
	 * Writes the editor's current text back to the target cell when the editor is applicable.
	 * @param editor Editor containing the edited value.
	 * @param model Model to update.
	 * @param index Index receiving the edited value.
	 */
	override setModelData(
		editor: CWidget,
		model: CAbstractItemModel,
		index: CModelIndex
	): void {
		if (editor instanceof CComboBox)
			model.setItemData(index, editor.currentText());
	}
}
