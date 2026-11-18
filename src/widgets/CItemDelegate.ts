import { CSignal } from "../core/CSignal.js";
import { CObject } from "../core/CObject.js";
import { CEvent, CEventType } from "../events/CEvent.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CRect } from "../geometry/CRect.js";
import { CAbstractItemModel } from "../models/CAbstractItemModel.js";
import { CModelIndex } from "../models/CModelIndex.js";
import { CPainter } from "../painting/CPainter.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CStyleOptionCheckBox } from "../gui/CStyleOptionCheckBox.js";
import { CAbstractItemDelegate } from "./CAbstractItemDelegate.js";
import { CCheckBox } from "./CCheckBox.js";
import { CDateEdit } from "./CDateEdit.js";
import { CDoubleSpinBox } from "./CDoubleSpinBox.js";
import { CLineEdit } from "./CLineEdit.js";
import { CSpinBox } from "./CSpinBox.js";
import { CWidget } from "./CWidget.js";

class CItemDelegateLineEdit extends CLineEdit {
	readonly accepted = new CSignal<[]>();
	readonly canceled = new CSignal<[]>();

	/**
	 * Responds to a key press for the item delegate line edit. May accept the event. May emit `accepted`, `canceled`.
	 * @param event Event for a key press.
	 */
	protected override keyPressEvent(event: CKeyEvent): void {
    	if (event.key() === "Enter") {
        	event.accept();
        	this.accepted.emit();
        	return;
    	}

    	if (event.key() === "Escape") {
        	event.accept();
        	this.canceled.emit();
        	return;
    	}

    	if (event.key() === "ArrowUp" || event.key() === "ArrowDown") {
        	event.accept();
        	return;
    	}

    	super.keyPressEvent(event);
	}
}

class CItemDelegateSpinBox extends CSpinBox {
	readonly accepted = new CSignal<[]>();
	readonly canceled = new CSignal<[]>();

	/**
	 * Responds to a key press for the item delegate spin box. May accept the event. May emit `accepted`, `canceled`.
	 * @param event Event for a key press.
	 */
	protected override keyPressEvent(event: CKeyEvent): void {
		if (event.key() === "Enter") {
			super.keyPressEvent(event);
			this.accepted.emit();
			return;
		}

		if (event.key() === "Escape") {
			event.accept();
			this.canceled.emit();
			return;
		}

		super.keyPressEvent(event);
	}
}

class CItemDelegateDoubleSpinBox extends CDoubleSpinBox {
	readonly accepted = new CSignal<[]>();
	readonly canceled = new CSignal<[]>();

	/**
	 * Responds to a key press for the item delegate double spin box. May accept the event. May emit `accepted`, `canceled`.
	 * @param event Event for a key press.
	 */
	protected override keyPressEvent(event: CKeyEvent): void {
		if (event.key() === "Enter") {
			super.keyPressEvent(event);
			this.accepted.emit();
			return;
		}

		if (event.key() === "Escape") {
			event.accept();
			this.canceled.emit();
			return;
		}

		super.keyPressEvent(event);
	}
}

class CItemDelegateDateEdit extends CDateEdit {
	readonly accepted = new CSignal<[]>();
	readonly canceled = new CSignal<[]>();

	/**
	 * Sets the focus.
	 */
	override setFocus(): void {
		this.lineEdit().setFocus();
	}

	/**
	 * Responds to a key press for the item delegate date edit. May accept the event. May emit `accepted`, `canceled`.
	 * @param event Event for a key press.
	 */
	protected override keyPressEvent(event: CKeyEvent): void {
		if (event.key() === "Enter") {
			event.accept();
			this.accepted.emit();
			return;
		}

		if (event.key() === "Escape") {
			event.accept();
			this.canceled.emit();
			return;
		}

		super.keyPressEvent(event);
	}
}

/**
 * Default item delegate choosing an editor from the model value type.
 */
export class CItemDelegate extends CAbstractItemDelegate {
	#m_checkBox = new CCheckBox();

	constructor(parent: CObject | null = null) {
		super(parent);
		this.#m_checkBox.hide();
	}

	/**
	 * Releases resources held by the item delegate.
	 */
	override destroy(): void {
		this.#m_checkBox.destroy();
		super.destroy();
	}

	/**
	 * Draws a checkbox for a Boolean cell.
	 * @param painter Painter for drawing the cell.
	 * @param rect Cell bounds in the view.
	 * @param index Model index supplying the Boolean value.
	 * @param widget View widget supplying the visual context.
	 * @returns `true` if a checkbox was drawn, or `false` if the value is not Boolean.
	 */
	override paint(
		painter: CPainter,
		rect: CRect,
		index: CModelIndex,
		widget: CWidget
	): boolean {
		const value = index.model()?.data(index);

		if (typeof value !== "boolean")
			return false;

		const checkRect = this.#checkRect(rect);
		this.#m_checkBox.setGeometry(
			0,
			0,
			checkRect.width(),
			checkRect.height()
		);
		this.#m_checkBox.setChecked(value);
		this.#m_checkBox.setEnabled(index.model()?.isEditable(index) ?? false);

		const option = new CStyleOptionCheckBox();
		option.initFromCheckBox(this.#m_checkBox);
		painter.save();
		painter.translate(checkRect.x(), checkRect.y());
		widget.style().drawCheckBox(painter, option);
		painter.restore();

		return true;
	}

	/**
	 * Toggles an editable Boolean cell on a left-button press inside the checkbox or a Space key press.
	 * @param event Input event to test.
	 * @param model Model to update.
	 * @param index Index of the target cell.
	 * @param rect Cell bounds used for the checkbox hit test.
	 * @returns `true` if the model accepted the toggle and the event was accepted.
	 */
	override editorEvent(
		event: CEvent,
		model: CAbstractItemModel,
		index: CModelIndex,
		rect: CRect
	): boolean {
		const value = model.data(index);

		if (typeof value !== "boolean" || !model.isEditable(index))
			return false;

		const mouseToggle = event instanceof CMouseEvent
			&& event.type() === CEventType.MousePress
			&& event.button() === CMouseButton.LeftButton
			&& this.#checkRect(rect).contains(event.pos());
		const keyToggle = event instanceof CKeyEvent
			&& event.type() === CEventType.KeyPress
			&& event.key() === " ";

		if (!mouseToggle && !keyToggle)
			return false;

		if (!model.setItemData(index, !value))
			return false;

		event.accept();
		return true;
	}

	/**
	 * Chooses an editor based on the cell value. Valid dates use a date editor, finite numbers use an integer or decimal spin box, and other editable values use a line edit.
	 * @param parent Widget that will own the editor.
	 * @param index Model index supplying the cell value.
	 * @returns New editor, or `null` for a Boolean cell edited inline.
	 */
	override createEditor(
		parent: CWidget,
		index: CModelIndex
	): CWidget | null {
		const value = index.model()?.data(index);

		if (typeof value === "boolean")
			return null;

		let editor: CItemDelegateLineEdit
			| CItemDelegateSpinBox
			| CItemDelegateDoubleSpinBox
			| CItemDelegateDateEdit;

		if (value instanceof Date && !Number.isNaN(value.getTime())) {
			editor = new CItemDelegateDateEdit(parent);
			editor.setFocusPolicy(CFocusPolicy.StrongFocus);
		} else if (typeof value === "number" && Number.isFinite(value)) {
			if (Number.isInteger(value)) {
				editor = new CItemDelegateSpinBox(parent);
				editor.setRange(
					Number.MIN_SAFE_INTEGER,
					Number.MAX_SAFE_INTEGER
				);
			} else {
				editor = new CItemDelegateDoubleSpinBox(parent);
				editor.setDecimals(Math.max(2, this.#decimalPlaces(value)));
				editor.setRange(-Number.MAX_VALUE, Number.MAX_VALUE);
			}
			editor.setFocusPolicy(CFocusPolicy.StrongFocus);
		} else {
			editor = new CItemDelegateLineEdit(parent);
		}

		editor.accepted.connect(() => {
			this.commitData.emit(editor);
			this.closeEditor.emit(editor);
		});

		editor.canceled.connect(() => {
			this.closeEditor.emit(editor);
		});

		if (editor instanceof CLineEdit) {
			editor.editingFinished.connect(() => {
				this.commitData.emit(editor);
				this.closeEditor.emit(editor);
			});
		}

		return editor;
	}

	/**
	 * Populates the matching editor with the cell value converted for the editor type.
	 * @param editor Editor widget created for the cell.
	 * @param index Model index supplying the initial value.
	 */
	override setEditorData(
		editor: CWidget,
		index: CModelIndex
	): void {
		const value = index.model()?.data(index);

		if (editor instanceof CDateEdit) {
			if (value instanceof Date && !Number.isNaN(value.getTime()))
				editor.setDate(value);
			return;
		}

		if (editor instanceof CSpinBox) {
			if (typeof value === "number" && Number.isFinite(value))
				editor.setValue(Math.trunc(value));
			return;
		}

		if (editor instanceof CDoubleSpinBox) {
			if (typeof value === "number" && Number.isFinite(value))
				editor.setValue(value);
			return;
		}

		if (editor instanceof CLineEdit) {
			editor.setText(
				value === null || value === undefined ? "" : String(value)
			);
		}
	}

	/**
	 * Writes the editor's value appropriate to the editor back to the target cell when the editor is applicable.
	 * @param editor Editor containing the edited value.
	 * @param model Model to update.
	 * @param index Index receiving the edited value.
	 */
	override setModelData(
		editor: CWidget,
		model: CAbstractItemModel,
		index: CModelIndex
	): void {
		if (editor instanceof CDateEdit)
			model.setItemData(index, editor.date());
		else if (editor instanceof CSpinBox)
			model.setItemData(index, editor.value());
		else if (editor instanceof CDoubleSpinBox)
			model.setItemData(index, editor.value());
		else if (editor instanceof CLineEdit)
			model.setItemData(index, editor.text());
	}

	#decimalPlaces(value: number): number {
		const [coefficient, exponentText] = value.toString().toLowerCase().split("e");
		const exponent = Number(exponentText ?? 0);
		const fractionLength = coefficient?.split(".")[1]?.length ?? 0;
		return Math.max(0, Math.min(100, fractionLength - exponent));
	}

	#checkRect(rect: CRect): CRect {
		const size = Math.max(
			0,
			Math.min(14, rect.width() - 4, rect.height() - 4)
		);

		return new CRect(
			rect.x() + (rect.width() - size) / 2,
			rect.y() + (rect.height() - size) / 2,
			size,
			size
		);
	}
}
