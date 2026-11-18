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

	/**
	 * Sets the focus.
	 */
	override setFocus(): void {
		this.lineEdit().setFocus();
	}

	/**
	 * Responds to a key press for the time item delegate editor. May accept the event. May emit `accepted`, `canceled`.
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

/** Item delegate that edits model values with a time editor. */
export class CTimeItemDelegate extends CAbstractItemDelegate {
	#m_displayFormat = "HH:mm";

	/**
	 * Reads the display format.
	 * @returns The display format.
	 */
	displayFormat(): string {
		return this.#m_displayFormat;
	}

	/**
	 * Sets the display format.
	 * @param format Format.
	 */
	setDisplayFormat(format: string): void {
		this.#m_displayFormat = format;
	}

	/**
	 * Formats the time components using the configured tokens, including a period marker when requested.
	 * @param time Date whose local time should be formatted.
	 * @returns Formatted time text.
	 */
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

	/**
	 * Draws a formatted time from a valid Date value.
	 * @param painter Painter for drawing the cell text.
	 * @param rect Cell bounds in the view.
	 * @param index Model index supplying the Date value.
	 * @param _widget View widget supplied by the caller. This delegate does not use it.
	 * @returns `true` if text was drawn, or `false` if the cell has no valid Date.
	 */
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

	/**
	 * Creates a time editor using the configured display format and connects its acceptance and cancellation to the delegate's editing signals.
	 * @param parent Widget that will own the editor.
	 * @param _index Model index of the edited cell. The initial cell value is applied separately by `setEditorData()`.
	 * @returns The new editor widget.
	 */
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

	/**
	 * Populates time editor with the valid Date stored in the cell.
	 * @param editor Editor widget created for the cell.
	 * @param index Model index supplying the initial value.
	 */
	override setEditorData(editor: CWidget, index: CModelIndex): void {
		if (!(editor instanceof CTimeEdit))
			return;

		const value = index.model()?.data(index);
		if (value instanceof Date && !Number.isNaN(value.getTime()))
			editor.setTime(value);
	}

	/**
	 * Writes the editor's time back to the target cell when the editor is applicable.
	 * @param editor Editor containing the edited value.
	 * @param model Model to update.
	 * @param index Index receiving the edited value.
	 */
	override setModelData(
		editor: CWidget,
		model: CAbstractItemModel,
		index: CModelIndex
	): void {
		if (editor instanceof CTimeEdit)
			model.setItemData(index, editor.time());
	}
}
