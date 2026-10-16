import { CSignal } from "../core/CSignal.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CRect } from "../geometry/CRect.js";
import { CAbstractItemModel } from "../models/CAbstractItemModel.js";
import { CModelIndex } from "../models/CModelIndex.js";
import { CPainter } from "../painting/CPainter.js";
import { CAbstractItemDelegate } from "./CAbstractItemDelegate.js";
import { CTimeEdit } from "./CTimeEdit.js";
import { CWidget } from "./CWidget.js";

class CTimeItemDelegateEditor extends CTimeEdit {
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
			event.accept();
			this.canceled.emit();
			return;
		}

		super.keyPressEvent(event);
	}
}

/** Item delegate that edits model values with a time editor. */
export class CTimeItemDelegate extends CAbstractItemDelegate {
	#m_displayFormat = "HH:mm";

	displayFormat(): string {
		return this.#m_displayFormat;
	}

	setDisplayFormat(format: string): void {
		this.#m_displayFormat = format;
	}

	displayText(time: Date): string {
		const hour24 = time.getHours();
		const hour12 = hour24 % 12 || 12;
		const values: Record<string, string> = {
			HH: hour24.toString().padStart(2, "0"), H: hour24.toString(),
			hh: hour12.toString().padStart(2, "0"), h: hour12.toString(),
			mm: time.getMinutes().toString().padStart(2, "0"),
			m: time.getMinutes().toString(),
			ss: time.getSeconds().toString().padStart(2, "0"),
			s: time.getSeconds().toString(),
			AP: hour24 < 12 ? "AM" : "PM", ap: hour24 < 12 ? "am" : "pm"
		};
		return (this.#m_displayFormat.match(/HH|H|hh|h|mm|m|ss|s|AP|ap|./g) ?? [])
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
		const editor = new CTimeItemDelegateEditor(parent);
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
		if (!(editor instanceof CTimeEdit))
			return;

		const value = index.model()?.data(index);
		if (value instanceof Date && !Number.isNaN(value.getTime()))
			editor.setTime(value);
	}

	override setModelData(
		editor: CWidget,
		model: CAbstractItemModel,
		index: CModelIndex
	): void {
		if (editor instanceof CTimeEdit)
			model.setItemData(index, editor.time());
	}
}
