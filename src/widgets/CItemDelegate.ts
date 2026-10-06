import { CSignal } from "../core/CSignal.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CAbstractItemModel } from "../models/CAbstractItemModel.js";
import { CModelIndex } from "../models/CModelIndex.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CAbstractItemDelegate } from "./CAbstractItemDelegate.js";
import { CDoubleSpinBox } from "./CDoubleSpinBox.js";
import { CLineEdit } from "./CLineEdit.js";
import { CSpinBox } from "./CSpinBox.js";
import { CWidget } from "./CWidget.js";

class CItemDelegateLineEdit extends CLineEdit {
	readonly accepted = new CSignal<[]>();
	readonly canceled = new CSignal<[]>();

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

/**
 * Default item delegate choosing an editor from the model value type.
 */
export class CItemDelegate extends CAbstractItemDelegate {
	override createEditor(
		parent: CWidget,
		index: CModelIndex
	): CWidget {
		const value = index.model()?.data(index);
		let editor: CItemDelegateLineEdit
			| CItemDelegateSpinBox
			| CItemDelegateDoubleSpinBox;

		if (typeof value === "number" && Number.isFinite(value)) {
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

	override setEditorData(
		editor: CWidget,
		index: CModelIndex
	): void {
		const value = index.model()?.data(index);

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

	override setModelData(
		editor: CWidget,
		model: CAbstractItemModel,
		index: CModelIndex
	): void {
		if (editor instanceof CSpinBox)
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
}
