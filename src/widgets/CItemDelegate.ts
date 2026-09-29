import { CSignal } from "../core/CSignal.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CAbstractItemModel } from "../models/CAbstractItemModel.js";
import { CModelIndex } from "../models/CModelIndex.js";
import { CAbstractItemDelegate } from "./CAbstractItemDelegate.js";
import { CLineEdit } from "./CLineEdit.js";
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

/**
 * Default item delegate using a line edit for editable values.
 */
export class CItemDelegate extends CAbstractItemDelegate {
	override createEditor(
		parent: CWidget,
		_index: CModelIndex
	): CWidget {
		const editor = new CItemDelegateLineEdit(parent);

		editor.accepted.connect(() => {
			this.commitData.emit(editor);
			this.closeEditor.emit(editor);
		});

		editor.canceled.connect(() => {
			this.closeEditor.emit(editor);
		});

		editor.editingFinished.connect(() => {
			this.commitData.emit(editor);
			this.closeEditor.emit(editor);
		});

		return editor;
	}

	override setEditorData(
		editor: CWidget,
		index: CModelIndex
	): void {
		if (!(editor instanceof CLineEdit))
			return;

		const value = index.model()?.data(index);
		editor.setText(
			value === null || value === undefined ? "" : String(value)
		);
	}

	override setModelData(
		editor: CWidget,
		model: CAbstractItemModel,
		index: CModelIndex
	): void {
		if (!(editor instanceof CLineEdit))
			return;

		model.setItemData(index, editor.text());
	}
}
