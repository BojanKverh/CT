import { CRect } from "../geometry/CRect.js";
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
    #m_wordWrap = false;
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
        this.updateGeometry();
		this.update();
	}

    /** Returns the widget associated with this label. */
    buddy(): CWidget | null { return this.#m_buddy; }

    /** Associates an input widget; null restores literal ampersand text. */
    setBuddy(buddy: CWidget | null): void {
        if (this.#m_buddy === buddy) return;
        this.#m_buddy = buddy;
        this.updateGeometry();
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
        this.updateGeometry();
		this.update();
	}

    wordWrap(): boolean { return this.#m_wordWrap; }

    setWordWrap(enabled: boolean): void {
        if (this.#m_wordWrap === enabled) return;
        this.#m_wordWrap = enabled;
        const policy = this.sizePolicy();
        policy.setHeightForWidth(enabled);
        this.setSizePolicy(policy);
        this.updateGeometry();
        this.update();
    }

    override hasHeightForWidth(): boolean { return this.#m_wordWrap && this.#m_pixmap === null; }

    override heightForWidth(width: number): number {
        if (!this.hasHeightForWidth()) return -1;
        return this.#wrappedLines(width).length * this.fontMetrics().height() + 2 * CLabel.#VPADDING;
    }

    // Keep source offsets so mnemonic underlines follow wrapped text.
    #wrappedLines(width: number): Array<{ text: string; start: number }> {
        const text = this.displayText().replace(/\r\n?/g, "\n");
        const available = Math.max(0, width - 2 * CLabel.#HPADDING);
        const metrics = this.fontMetrics();
        const lines: Array<{ text: string; start: number }> = [];
        let offset = 0;
        for (const paragraph of text.split("\n")) {
            let rest = paragraph, start = offset;
            if (rest.length === 0) lines.push({ text: "", start });
            while (rest.length > 0) {
                let end = 0;
                for (const character of rest) {
                    const next = end + character.length;
                    if (end > 0 && metrics.textWidth(rest.slice(0, next)) > available) break;
                    end = next;
                }
                if (end < rest.length) {
                    const prefix = rest.slice(0, end);
                    const boundary = prefix.search(/\s+\S*$/u);
                    if (boundary > 0) end = boundary;
                }
                lines.push({ text: rest.slice(0, end), start });
                rest = rest.slice(end); start += end;
                const spaces = rest.match(/^[^\S\n]+/u)?.[0].length ?? 0;
                rest = rest.slice(spaces); start += spaces;
            }
            offset += paragraph.length + 1;
        }
        return lines;
    }

	/** Returns the preferred size of the widget. */
	override sizeHint(): CSize {
		return new CSize(
			Math.max(0, ...this.displayText().split(/\r?\n/).map(line => this.fontMetrics().textWidth(line))) + 2 * CLabel.#HPADDING,
			this.fontMetrics().height() * this.displayText().split(/\r?\n/).length + 2 * CLabel.#VPADDING
		);
	}

    /** Handles the paint event. */
    protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionLabel();
		option.initFromLabel(this);

        if (!this.hasHeightForWidth()) {
            this.style().drawLabel(painter, option);
            return;
        }
        const background = new CStyleOptionLabel(option);
        background.text = "";
        this.style().drawLabel(painter, background);
        const lines = this.#wrappedLines(this.width());
        const lineHeight = this.fontMetrics().height();
        const blockHeight = lines.length * lineHeight;
        const y = (this.#m_alignment & CAlignment.Bottom) !== 0 ? this.height() - CLabel.#VPADDING - blockHeight
            : (this.#m_alignment & CAlignment.VCenter) !== 0 ? (this.height() - blockHeight) / 2 : CLabel.#VPADDING;
        painter.save();
        painter.clipRect(this.rect());
        for (let i = 0; i < lines.length; ++i) {
            const line = lines[i]!;
            const lineOption = new CStyleOptionLabel(option);
            lineOption.text = line.text;
            lineOption.rect = new CRect(0, 0, Math.max(0, this.width() - 2 * CLabel.#HPADDING), lineHeight);
            lineOption.alignment = (this.#m_alignment & (CAlignment.Left | CAlignment.Right | CAlignment.HCenter)) | CAlignment.Top;
            if ("mnemonicIndex" in lineOption) {
                const index = this.mnemonicIndex() - line.start;
                lineOption.mnemonicIndex = index >= 0 && index < line.text.length ? index : -1;
            }
            painter.save();
            painter.translate(CLabel.#HPADDING, y + i * lineHeight);
            this.style().drawLabel(painter, lineOption);
            painter.restore();
        }
        painter.restore();
	}
}