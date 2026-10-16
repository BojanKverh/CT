import { CSignal } from "../core/CSignal.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CRect } from "../geometry/CRect.js";
import { CAbstractItemModel } from "../models/CAbstractItemModel.js";
import { CModelIndex } from "../models/CModelIndex.js";
import { CPainter } from "../painting/CPainter.js";
import { CAbstractItemDelegate } from "./CAbstractItemDelegate.js";
import { CDateTimeEdit } from "./CDateTimeEdit.js";
import { CWidget } from "./CWidget.js";

class CDateTimeItemDelegateEditor extends CDateTimeEdit {
	readonly accepted = new CSignal<[]>();
	readonly canceled = new CSignal<[]>();

	override setFocus(): void {
		this.dateLineEdit().setFocus();
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

/** Item delegate that edits model values with a date-time editor. */
export class CDateTimeItemDelegate extends CAbstractItemDelegate {
	#m_dateDisplayFormat = "dd.MM.yyyy";
	#m_timeDisplayFormat = "HH:mm";

	dateDisplayFormat(): string { return this.#m_dateDisplayFormat; }
	setDateDisplayFormat(format: string): void { this.#m_dateDisplayFormat = format; }
	timeDisplayFormat(): string { return this.#m_timeDisplayFormat; }
	setTimeDisplayFormat(format: string): void { this.#m_timeDisplayFormat = format; }

	displayText(dateTime: Date): string {
		const hour24 = dateTime.getHours();
		const hour12 = hour24 % 12 || 12;
		const values: Record<string, string> = {
			yyyy: dateTime.getFullYear().toString().padStart(4, "0"),
			yy: (dateTime.getFullYear() % 100).toString().padStart(2, "0"),
			MM: (dateTime.getMonth() + 1).toString().padStart(2, "0"),
			M: (dateTime.getMonth() + 1).toString(),
			dd: dateTime.getDate().toString().padStart(2, "0"),
			d: dateTime.getDate().toString(),
			HH: hour24.toString().padStart(2, "0"), H: hour24.toString(),
			hh: hour12.toString().padStart(2, "0"), h: hour12.toString(),
			mm: dateTime.getMinutes().toString().padStart(2, "0"),
			m: dateTime.getMinutes().toString(),
			ss: dateTime.getSeconds().toString().padStart(2, "0"),
			s: dateTime.getSeconds().toString(),
			AP: hour24 < 12 ? "AM" : "PM", ap: hour24 < 12 ? "am" : "pm"
		};
		const format = (pattern: string, expression: RegExp): string =>
			(pattern.match(expression) ?? [])
				.map(token => values[token] ?? token).join("");
		return `${format(this.#m_dateDisplayFormat, /yyyy|yy|MM|M|dd|d|./g)} ${
			format(this.#m_timeDisplayFormat, /HH|H|hh|h|mm|m|ss|s|AP|ap|./g)
		}`;
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
		const editor = new CDateTimeItemDelegateEditor(parent);
		editor.setDateDisplayFormat(this.#m_dateDisplayFormat);
		editor.setTimeDisplayFormat(this.#m_timeDisplayFormat);
		editor.setFocusPolicy(CFocusPolicy.StrongFocus);
		editor.accepted.connect(() => {
			this.commitData.emit(editor);
			this.closeEditor.emit(editor);
		});
		editor.canceled.connect(() => this.closeEditor.emit(editor));
		return editor;
	}

	override setEditorData(editor: CWidget, index: CModelIndex): void {
		if (!(editor instanceof CDateTimeEdit))
			return;

		const value = index.model()?.data(index);
		if (value instanceof Date && !Number.isNaN(value.getTime()))
			editor.setDateTime(value);
	}

	override setModelData(
		editor: CWidget,
		model: CAbstractItemModel,
		index: CModelIndex
	): void {
		if (editor instanceof CDateTimeEdit)
			model.setItemData(index, editor.dateTime());
	}
}
