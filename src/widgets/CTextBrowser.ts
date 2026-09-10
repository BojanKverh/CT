import { CTextEdit } from "./CTextEdit.js";
import { CWidget } from "./CWidget.js";
import { CSignal } from "../core/CSignal.js";
import { CCursorShape } from "../gui/CCursorShape.js";
import {
	CMouseButton,
	type CMouseEvent
} from "../events/CMouseEvent.js";

/**
 * Read-only rich-text viewer built on CTextEdit's shared rich-text engine.
 *
 * CTextEdit owns the document, HTML parsing/serialization, layout,
 * painting and formatted hit testing.  CTextBrowser adds only permanent
 * read-only behaviour and hyperlink interaction.
 */
export class CTextBrowser extends CTextEdit {
	readonly anchorClicked = new CSignal<[string]>();

	#m_htmlMode = false;
	#m_htmlSource: string | null = null;
	#m_mousePressed = false;
	#m_pressedAnchor: string | null = null;
	#m_hoveredAnchor: string | null = null;

	constructor(parent: CWidget | null = null) {
		super(parent);
		super.setReadOnly(true);

		this.textChanged.connect(() => {
			if (this.#m_htmlMode)
				this.#m_htmlSource = null;
		});
	}

	override setReadOnly(_readOnly: boolean = true): void {
		super.setReadOnly(true);
	}

	override cursor(): CCursorShape {
		if (this.#m_hoveredAnchor !== null)
			return CCursorShape.PointingHand;

		return super.cursor();
	}

	override setPlainText(text: string): void {
		this.#m_htmlMode = false;
		this.#m_htmlSource = null;
		this.#clearAnchorInteraction();

		super.setPlainText(text);
		this.setCursorPosition(0);
	}

	override setHtml(html: string): void {
		this.#m_htmlMode = false;
		this.#m_htmlSource = null;
		this.#clearAnchorInteraction();

		super.setHtml(html);

		this.#m_htmlMode = true;
		this.#m_htmlSource = html;
		this.setCursorPosition(0);
	}

	override toHtml(): string {
		if (!this.#m_htmlMode)
			return "";

		return this.#m_htmlSource ?? super.toHtml();
	}

	override clear(): void {
		this.#m_htmlMode = false;
		this.#m_htmlSource = null;
		this.#clearAnchorInteraction();
		super.clear();
	}

	override canUndo(): boolean {
		return false;
	}

	override canRedo(): boolean {
		return false;
	}

	override undo(): void {
		// CTextBrowser is not user-editable.
	}

	override redo(): void {
		// CTextBrowser is not user-editable.
	}

	override handleMousePress(event: CMouseEvent): void {
		if (event.button() === CMouseButton.LeftButton) {
			this.#m_mousePressed = true;
			this.#m_pressedAnchor = this.#anchorAt(
				event.x(),
				event.y()
			);
		}

		super.handleMousePress(event);
	}

	override handleMouseMove(event: CMouseEvent): void {
		const hoveredAnchor = this.#anchorAt(
			event.x(),
			event.y()
		);

		if (hoveredAnchor !== this.#m_hoveredAnchor) {
			this.#m_hoveredAnchor = hoveredAnchor;
			this.widget()?.update();
		}

		if (this.#m_mousePressed) {
			super.handleMouseMove(event);
			return;
		}

		event.accept();
	}

	override handleMouseRelease(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			super.handleMouseRelease(event);
			return;
		}

		const wasPressed = this.#m_mousePressed;
		const pressedAnchor = this.#m_pressedAnchor;

		super.handleMouseRelease(event);

		this.#m_mousePressed = false;
		this.#m_pressedAnchor = null;

		if (!wasPressed || pressedAnchor === null)
			return;

		const releasedAnchor = this.#anchorAt(
			event.x(),
			event.y()
		);

		if (releasedAnchor === pressedAnchor && !this.hasSelection())
			this.anchorClicked.emit(pressedAnchor);
	}

	#anchorAt(x: number, y: number): string | null {
		return this.textCharFormatAt(x, y)?.anchorHref() ?? null;
	}

	#clearAnchorInteraction(): void {
		this.#m_mousePressed = false;
		this.#m_pressedAnchor = null;
		this.#m_hoveredAnchor = null;
	}
}
