import { CTextEdit } from "./CTextEdit.js";
import { CWidget } from "./CWidget.js";

/**
 * A read-only text viewer.
 *
 * CTextBrowser intentionally reuses CTextEdit's scrolling, selection and
 * clipboard support. Rich-text and hyperlink navigation can be layered on
 * top later without duplicating the text-view implementation.
 */
export class CTextBrowser extends CTextEdit {
	constructor(parent: CWidget | null = null) {
		super(parent);
		super.setReadOnly(true);
	}

	override setReadOnly(_readOnly: boolean = true): void {
		super.setReadOnly(true);
	}

	override canUndo(): boolean {
		return false;
	}

	override canRedo(): boolean {
		return false;
	}

	override undo(): void {
		// A text browser is not user-editable.
	}

	override redo(): void {
		// A text browser is not user-editable.
	}
}
