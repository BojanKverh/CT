import { CSignal } from "../core/CSignal.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CRect } from "../geometry/CRect.js";
import { CAbstractItemModel } from "../models/CAbstractItemModel.js";
import { CModelIndex } from "../models/CModelIndex.js";
import { CPainter } from "../painting/CPainter.js";
import { CAbstractItemDelegate } from "./CAbstractItemDelegate.js";
import { CDateEdit } from "./CDateEdit.js";
import { CWidget } from "./CWidget.js";

class CDateItemDelegateEditor extends CDateEdit {
	readonly accepted = new CSignal<[]>();
	readonly canceled = new CSignal<[]>();

	override setFocus(): void {
		this.lineEdit().setFocus();
	}

	protected override keyPressEvent(event: CKeyEvent): void {
		if (event.key() === "Enter") {
			event.accept();
			this.accepted.emit();
			return;
		}

		if (event.key() === "Escape") {
			this.hidePopup();
			event.accept();
			this.canceled.emit();
			return;
		}

		super.keyPressEvent(event);
	}
}

/** Item delegate that edits model values with a date editor. */
export class CDateItemDelegate extends CAbstractItemDelegate {
	#m_displayFormat = "dd.MM.yyyy";

	displayFormat(): string {
		return this.#m_displayFormat;
	}

	setDisplayFormat(format: string): void {
		this.#m_displayFormat = format;
	}

	displayText(date: Date): string {
		const values: Record<string, string> = {
			yyyy: date.getFullYear().toString().padStart(4, "0"),
			yy: (date.getFullYear() % 100).toString().padStart(2, "0"),
			MM: (date.getMonth() + 1).toString().padStart(2, "0"),
			M: (date.getMonth() + 1).toString(),
			dd: date.getDate().toString().padStart(2, "0"),
			d: date.getDate().toString()
		};
		return (this.#m_displayFormat.match(/yyyy|yy|MM|M|dd|d|./g) ?? [])
			.map(token => values[token] ?? token).join("");
	}

	override paint(
		painter: CPainter,
		rect: CRect,
		index: CModelIndex,
		_widget: CWidget
	): boolean {
		const value = index.model()?.data(index);
		if (!(value instanceof Date) || Number.isNaN(value.getTime()))
			return false;
		painter.drawText(this.displayText(value), rect.x() + 5,
			rect.y() + rect.height() / 2);
		return true;
	}

	override createEditor(parent: CWidget, _index: CModelIndex): CWidget {
		const editor = new CDateItemDelegateEditor(parent);
		editor.setDisplayFormat(this.#m_displayFormat);
		editor.setFocusPolicy(CFocusPolicy.StrongFocus);
		editor.accepted.connect(() => {
			this.commitData.emit(editor);
			this.closeEditor.emit(editor);
		});
		editor.canceled.connect(() => this.closeEditor.emit(editor));
		return editor;
	}

	override setEditorData(editor: CWidget, index: CModelIndex): void {
		if (!(editor instanceof CDateEdit))
			return;

		const value = index.model()?.data(index);
		if (value instanceof Date && !Number.isNaN(value.getTime()))
			editor.setDate(value);
	}

	override setModelData(
		editor: CWidget,
		model: CAbstractItemModel,
		index: CModelIndex
	): void {
		if (editor instanceof CDateEdit)
			model.setItemData(index, editor.date());
	}
}
