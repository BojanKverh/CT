import { CTextEdit } from "./CTextEdit.js";

/**
 * A multiline plain-text editor sharing editing, selection, clipboard,
 * scrolling and undo/redo with CTextEdit.
 *
 * Character-format setters have no effect. setPlainText(), insert() and paste
 * preserve markup literally; inherited setHtml() imports only its text.
 * Use setFont() and setPalette() to style the entire widget.
 */
export class CPlainTextEdit extends CTextEdit {
	/**
	 * Reads the supports rich text of the plain text edit.
	 * @returns `false` in this implementation.
	 */
	protected override supportsRichText(): boolean {
		return false;
	}
}
