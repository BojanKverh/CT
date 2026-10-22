import { CApplication } from "../core/CApplication.js";
import { CMouseButton, type CMouseEvent } from "../events/CMouseEvent.js";
import { CFrame } from "./CFrame.js";
import { CPainter } from "../painting/CPainter.js";
import { CAlignment } from "../core/CAlignment.js";
import { CPixmap } from "../painting/CPixmap.js";
import { CSize } from "../geometry/CSize.js";
import { CWidget } from "./CWidget.js";
import { CStyleOptionLabel } from "../gui/CStyleOptionLabel.js";

/** Implements the label widget. */
export class CLabel extends CFrame {
	#m_text = "";
    #m_buddy: CWidget | null = null;
	#m_alignment = CAlignment.Left | CAlignment.VCenter;
	#m_pixmap: CPixmap | null = null;

	static readonly #HPADDING: number = 6;
	static readonly #VPADDING: number = 3;


	/** Creates a new instance. */
	constructor(parent: CWidget | null = null)
	{
		/** Provides super behavior. */
		super(parent);
	}

	/** Provides text behavior. */
	text(): string {
		return this.#m_text;
	}

	/** Sets the text. */
	setText(text: string): void {
		/** Provides if behavior. */
		if (this.#m_text === text)
			return;

		this.#m_text = text;
		this.update();
	}

    /** Returns the widget associated with this label. */
    buddy(): CWidget | null { return this.#m_buddy; }

    /** Associates an input widget; null restores literal ampersand text. */
    setBuddy(buddy: CWidget | null): void {
        if (this.#m_buddy === buddy) return;
        this.#m_buddy = buddy;
        this.update();
    }

    /** Visible text, with mnemonic markers removed when a buddy is set. */
    displayText(): string { return this.#mnemonicText().text; }

    /** UTF-16 index of the character to underline, or -1. */
    mnemonicIndex(): number { return this.#mnemonicText().index; }

    /** Character activated by Alt, or an empty string when there is none. */
    mnemonic(): string {
        const { text, index } = this.#mnemonicText();
        return index < 0 ? "" : String.fromCodePoint(text.codePointAt(index)!);
    }

    /** Focuses the buddy if both widgets are available in the active scope. */
    activateBuddy(): boolean {
        return this.#m_pixmap === null && this.#m_buddy !== null
            && CApplication.instance().focusLabelBuddy(this, this.#m_buddy);
    }

    #mnemonicText(): { text: string; index: number } {
        if (this.#m_buddy === null || this.#m_pixmap !== null)
            return { text: this.#m_text, index: -1 };
        let text = "";
        let index = -1;
        for (let i = 0; i < this.#m_text.length; ++i) {
            const character = this.#m_text[i]!;
            if (character !== "&" || i + 1 === this.#m_text.length) {
                text += character;
            } else if (this.#m_text[i + 1] === "&") {
                text += "&";
                ++i;
            } else {
                if (index < 0) index = text.length;
                // The following character is appended on the next iteration.
            }
        }
        return { text, index };
    }

    protected override mousePressEvent(event: CMouseEvent): void {
        if (event.button() === CMouseButton.LeftButton && this.activateBuddy()) {
            event.accept();
            return;
        }
        super.mousePressEvent(event);
    }

    override destroy(): void {
        this.#m_buddy = null;
        super.destroy();
    }

	/** Provides alignment behavior. */
	alignment(): CAlignment {
		return this.#m_alignment;
	}

	/** Sets the alignment. */
	setAlignment(alignment: CAlignment): void {
		/** Provides if behavior. */
		if (this.#m_alignment === alignment)
			return;

		this.#m_alignment = alignment;
		this.update();
	}

	/** Provides pixmap behavior. */
	pixmap(): CPixmap | null {
		return this.#m_pixmap;
	}

	/** Sets the pixmap. */
	setPixmap(pixmap: CPixmap | null): void {
		/** Provides if behavior. */
		if (this.#m_pixmap === pixmap)
			return;
		this.#m_pixmap = pixmap;
		this.update();
	}

	/** Returns the preferred size of the widget. */
	override sizeHint(): CSize {
		return new CSize(
			this.fontMetrics().textWidth(this.displayText()) + 2 * CLabel.#HPADDING,
			this.fontMetrics().height() + 2 * CLabel.#VPADDING
		);
	}

    /** Handles the paint event. */
    protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionLabel();
		option.initFromLabel(this);

		this.style().drawLabel(painter, option);
	}
}