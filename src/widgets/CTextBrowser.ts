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
/** Implements the text browser widget. */
export class CTextBrowser extends CTextEdit {
	/** Public anchor clicked member. */
	readonly anchorClicked = new CSignal<[string]>();

	#m_htmlMode = false;
	#m_htmlSource: string | null = null;
	#m_mousePressed = false;
	#m_pressedAnchor: string | null = null;
	#m_hoveredAnchor: string | null = null;

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null) {
		/** Provides super behavior. */
		super(parent);
		super.setReadOnly(true);

		this.textChanged.connect(() => {
			/** Provides if behavior. */
			if (this.#m_htmlMode)
				this.#m_htmlSource = null;
		});
	}

	/** Sets the read only. */
	override setReadOnly(_readOnly: boolean = true): void {
		super.setReadOnly(true);
	}

	/** Provides cursor behavior. */
	override cursor(): CCursorShape {
		/** Provides if behavior. */
		if (this.#m_hoveredAnchor !== null)
			return CCursorShape.PointingHand;

		return super.cursor();
	}

	/** Sets the plain text. */
	override setPlainText(text: string): void {
		this.#m_htmlMode = false;
		this.#m_htmlSource = null;
		this.#clearAnchorInteraction();

		super.setPlainText(text);
		this.setCursorPosition(0);
	}

	/** Sets the html. */
	override setHtml(html: string): void {
		this.#m_htmlMode = false;
		this.#m_htmlSource = null;
		this.#clearAnchorInteraction();

		super.setHtml(html);

		this.#m_htmlMode = true;
		this.#m_htmlSource = html;
		this.setCursorPosition(0);
	}

	/** Provides to html behavior. */
	override toHtml(): string {
		/** Provides if behavior. */
		if (!this.#m_htmlMode)
			return "";

		return this.#m_htmlSource ?? super.toHtml();
	}

	/** Clears the current contents. */
	override clear(): void {
		this.#m_htmlMode = false;
		this.#m_htmlSource = null;
		this.#clearAnchorInteraction();
		super.clear();
	}

	/** Returns whether undo is currently possible. */
	override canUndo(): boolean {
		return false;
	}

	/** Returns whether redo is currently possible. */
	override canRedo(): boolean {
		return false;
	}

	/** Provides undo behavior. */
	override undo(): void {
		// CTextBrowser is not user-editable.
	}

	/** Provides redo behavior. */
	override redo(): void {
		// CTextBrowser is not user-editable.
	}

	/** Provides handle mouse press behavior. */
	override handleMousePress(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (event.button() === CMouseButton.LeftButton) {
			this.#m_mousePressed = true;
			this.#m_pressedAnchor = this.#anchorAt(
				event.x(),
				event.y()
			);
		}

		super.handleMousePress(event);
	}

	/** Provides handle mouse move behavior. */
	override handleMouseMove(event: CMouseEvent): void {
		const hoveredAnchor = this.#anchorAt(
			event.x(),
			event.y()
		);

		/** Provides if behavior. */
		if (hoveredAnchor !== this.#m_hoveredAnchor) {
			this.#m_hoveredAnchor = hoveredAnchor;
			this.widget()?.update();
		}

		/** Provides if behavior. */
		if (this.#m_mousePressed) {
			super.handleMouseMove(event);
			return;
		}

		event.accept();
	}

	/** Provides handle mouse release behavior. */
	override handleMouseRelease(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			super.handleMouseRelease(event);
			return;
		}

		const wasPressed = this.#m_mousePressed;
		const pressedAnchor = this.#m_pressedAnchor;

		super.handleMouseRelease(event);

		this.#m_mousePressed = false;
		this.#m_pressedAnchor = null;

		/** Provides if behavior. */
		if (!wasPressed || pressedAnchor === null)
			return;

		const releasedAnchor = this.#anchorAt(
			event.x(),
			event.y()
		);

		/** Provides if behavior. */
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
