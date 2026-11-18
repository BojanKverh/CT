import { CSignal } from "../core/CSignal.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import type { CFocusEvent } from "../events/CFocusEvent.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CCursorShape } from "../gui/CCursorShape.js";
import { CPaletteColorRole } from "../gui/CPalette.js";

type LabelLink = { url: string; start: number; end: number };
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
    #openExternalLinks = false;
    #hoveredLink = -1;
    #pressedLink = -1;
    #focusedLink = 0;
    #savedFocusPolicy: CFocusPolicy | null = null;
    readonly linkActivated = new CSignal<[string]>();
    #m_wordWrap = false;
    #m_buddy: CWidget | null = null;
	#m_alignment = CAlignment.Left | CAlignment.VCenter;
	#m_pixmap: CPixmap | null = null;

	static readonly #HPADDING: number = 6;
	static readonly #VPADDING: number = 3;
    static readonly #LINE_GAP = 2;


	/** Creates a new instance. */
	constructor(parent: CWidget | null = null)
	{
		/** Provides super behavior. */
		super(parent);
	}

	/**
	 * Reads the text.
	 * @returns The text.
	 */
	text(): string {
		return this.#m_text;
	}

	/**
	 * Changes the label text, refreshes link tracking and updates preferred geometry and painting.
	 * @param text Text to display. Supported link markup is parsed by the label.
	 */
	setText(text: string): void {
		/** Provides if behavior. */
		if (this.#m_text === text)
			return;

		this.#m_text = text; this.#syncLinks();
        this.updateGeometry();
		this.update();
	}

    /**
     * Reads whether activating a supported external link also opens it in the browser.
     * @returns `true` if automatic external-link opening is enabled.
     */
    openExternalLinks(): boolean { return this.#openExternalLinks; }
    /**
     * Also opens http(s), mailto and tel links in the browser. Defaults to false.
     * Link markup is a limited <a href="...">caption</a> subset, not arbitrary HTML.
     * linkActivated is emitted regardless of this setting, including internal URLs.
     * @param enabled Whether to enable the feature.
     */
    setOpenExternalLinks(enabled: boolean): void { this.#openExternalLinks = enabled; }
    #decode(text: string): string {
        return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity: string, code: string) => {
            if (code[0] !== "#") return ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0" } as Record<string, string>)[code.toLowerCase()] ?? entity;
            const number = code[1]?.toLowerCase() === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
            return Number.isInteger(number) && number > 0 && number <= 0x10ffff && !(number >= 0xd800 && number <= 0xdfff)
                ? String.fromCodePoint(number) : entity;
        });
    }
    #parsed(): { text: string; links: LabelLink[] } {
        const source = this.#m_text.replace(/\r\n?/g, "\n");
        const links: LabelLink[] = []; let text = "", offset = 0;
        const pattern = /<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi;
        for (const match of source.matchAll(pattern)) {
            const href = /(?:^|\s)href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i.exec(match[1]!);
            if (href === null) continue;
            text += source.slice(offset, match.index);
            const caption = this.#decode(match[2]!.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]*>/g, ""));
            const start = text.length; text += caption;
            const url = this.#decode(href[1] ?? href[2] ?? href[3] ?? "").trim();
            if (url && caption) links.push({ url, start, end: text.length });
            offset = match.index! + match[0].length;
        }
        text += source.slice(offset);
        return { text, links };
    }
    #syncLinks(): void {
        this.#pressedLink = this.#hoveredLink = -1; this.#focusedLink = 0;
        const linked = this.#m_pixmap === null && this.#parsed().links.length > 0;
        if (linked && this.#savedFocusPolicy === null) {
            this.#savedFocusPolicy = this.focusPolicy(); this.setFocusPolicy(CFocusPolicy.StrongFocus);
        } else if (!linked && this.#savedFocusPolicy !== null) {
            const policy = this.#savedFocusPolicy; this.#savedFocusPolicy = null; this.setFocusPolicy(policy);
        }
    }
    #linkLayout(): Array<{ text: string; start: number; x: number; y: number; height: number }> {
        const lines = this.#m_wordWrap ? this.#wrappedLines(this.width()) : this.#textLines();
        const height = this.fontMetrics().height();
        const block = this.#textBlockHeight(lines.length, height);
        const padded = this.#m_wordWrap || lines.length > 1;
        const paddingY = padded ? CLabel.#VPADDING : 0;
        const top = (this.#m_alignment & CAlignment.Bottom) !== 0 ? this.height() - paddingY - block
            : (this.#m_alignment & CAlignment.VCenter) !== 0 ? (this.height() - block) / 2 : paddingY;
        const paddingX = padded ? CLabel.#HPADDING : 0;
        return lines.map((line, i) => {
            const width = this.fontMetrics().textWidth(line.text);
            const x = (this.#m_alignment & CAlignment.Right) !== 0 ? this.width() - paddingX - width
                : (this.#m_alignment & CAlignment.HCenter) !== 0 ? (this.width() - width) / 2 : paddingX;
            return { ...line, x, y: top + i * (height + CLabel.#LINE_GAP), height };
        });
    }
    #linkFragments(): Array<{ index: number; rect: CRect }> {
        if (this.#m_pixmap !== null) return [];
        const links = this.#parsed().links, fragments: Array<{ index: number; rect: CRect }> = [];
        for (const line of this.#linkLayout()) links.forEach((link, index) => {
            const start = Math.max(0, link.start - line.start), end = Math.min(line.text.length, link.end - line.start);
            if (end <= start) return;
            const left = line.x + this.fontMetrics().textWidth(line.text.slice(0, start));
            const right = line.x + this.fontMetrics().textWidth(line.text.slice(0, end));
            fragments.push({ index, rect: new CRect(left, line.y, right - left, line.height) });
        });
        return fragments;
    }
    #hitLink(x: number, y: number): number {
        if (x < 0 || x >= this.width() || y < 0 || y >= this.height() || this.#m_pixmap !== null) return -1;
        return this.#linkFragments().find(({ rect: r }) => x >= r.x() && x < r.x() + r.width() && y >= r.y() && y < r.y() + r.height())?.index ?? -1;
    }
    /**
     * Hit-tests the parsed link text at a point in the label.
     * @param x Horizontal coordinate local to the label.
     * @param y Vertical coordinate local to the label.
     * @returns The link URL, or `null` when the point does not hit a link.
     */
    linkAt(x: number, y: number): string | null { return this.#parsed().links[this.#hitLink(x, y)]?.url ?? null; }
    /**
     * Sets the geometry. May update the pressed link, the hovered link.
     * @param x Horizontal position in parent coordinates.
     * @param y Vertical position in parent coordinates.
     * @param width Width in logical pixels.
     * @param height Height in logical pixels.
     */
    override setGeometry(x: number, y: number, width: number, height: number): void {
        this.#pressedLink = this.#hoveredLink = -1; super.setGeometry(x, y, width, height);
    }
    /**
     * Reads the cursor of the label.
     * @returns The cursor.
     */
    override cursor(): CCursorShape {
        return this.isEnabled() && this.#hoveredLink >= 0 ? CCursorShape.PointingHand : super.cursor();
    }
    #activateLink(index: number): void {
        if (!this.isEnabled() || !this.isVisible() || this.#m_pixmap !== null || this.inputBlocker() !== null) return;
        for (let owner: CWidget | null = this.parent(); owner !== null; owner = owner.parent())
            if (!owner.isVisible() || !owner.isEnabled()) return;
        const url = this.#parsed().links[index]?.url; if (!url) return;
        const open = this.#openExternalLinks;
        this.linkActivated.emit(url);
        if (open) {
            try {
                const resolved = new URL(url, document.baseURI);
                if (["http:", "https:", "mailto:", "tel:"].includes(resolved.protocol))
                    window.open(resolved.href, "_blank", "noopener,noreferrer");
            } catch { /* Invalid URLs still reach the application's linkActivated handler. */ }
        }
    }
    /**
     * Responds to a pointer button release for the label. May update the pressed link. May accept the event.
     * @param event Event for a pointer button release.
     */
    protected override mouseReleaseEvent(event: CMouseEvent): void {
        if (event.button() === CMouseButton.LeftButton && this.#pressedLink >= 0) {
            const index = this.#pressedLink; this.#pressedLink = -1; event.accept();
            if (index === this.#hitLink(event.x(), event.y())) this.#activateLink(index);
            return;
        }
        super.mouseReleaseEvent(event);
    }
    /**
     * Responds to pointer movement for the label. May update the hovered link. May request a repaint.
     * @param event Event for pointer movement.
     */
    protected override mouseMoveEvent(event: CMouseEvent): void {
        this.#hoveredLink = this.#hitLink(event.x(), event.y()); this.update(); super.mouseMoveEvent(event);
    }
    /**
     * Responds to pointer exit for the label. May update the hovered link. May request a repaint.
     * @param event Event for pointer exit.
     */
    protected override mouseLeaveEvent(event: CMouseEvent): void { this.#hoveredLink = -1; this.update(); super.mouseLeaveEvent(event); }
    /**
     * Responds to a key press for the label. May update the pressed link, the focused link. May accept the event and request a repaint.
     * @param event Event for a key press.
     */
    protected override keyPressEvent(event: CKeyEvent): void {
        const links = this.#parsed().links;
        if (this.#m_pixmap !== null || !links.length || event.ctrl() || event.alt() || event.meta()) { super.keyPressEvent(event); return; }
        if (["Enter", "Return"].includes(event.key())) { this.#activateLink(this.#focusedLink); event.accept(); return; }
        if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key())) {
            this.#pressedLink = -1;
            this.#focusedLink = event.key() === "Home" ? 0 : event.key() === "End" ? links.length - 1
                : (this.#focusedLink + (["ArrowRight", "ArrowDown"].includes(event.key()) ? 1 : links.length - 1)) % links.length;
            event.accept(); this.update(); return;
        }
        if (event.key() === "Escape") this.#pressedLink = -1;
        super.keyPressEvent(event);
    }
    /**
     * Responds to focus exit for the label. May update the pressed link. May request a repaint.
     * @param event Event for focus exit.
     */
    protected override focusOutEvent(event: CFocusEvent): void { this.#pressedLink = -1; this.update(); super.focusOutEvent(event); }
    /**
     * Sets the enabled. May update the pressed link, the hovered link.
     * @param enabled Whether to enable the feature.
     */
    override setEnabled(enabled: boolean): void { if (!enabled) this.#pressedLink = this.#hoveredLink = -1; super.setEnabled(enabled); }
    /**
     * Responds to the visibility change event for the label. May update the pressed link, the hovered link.
     */
    protected override visibilityChangeEvent(): void { this.#pressedLink = this.#hoveredLink = -1; }

    /**
     * Returns the widget associated with this label.
     * @returns The buddy.
     */
    buddy(): CWidget | null { return this.#m_buddy; }

    /**
     * Associates an input widget; null restores literal ampersand text.
     * @param buddy Buddy.
     */
    setBuddy(buddy: CWidget | null): void {
        if (this.#m_buddy === buddy) return;
        this.#m_buddy = buddy;
        this.updateGeometry();
        this.update();
    }

    /**
     * Visible text, with mnemonic markers removed when a buddy is set.
     * @returns The display text.
     */
    displayText(): string { return this.#mnemonicText().text; }

    /**
     * UTF-16 index of the character to underline, or -1.
     * @returns The mnemonic index.
     */
    mnemonicIndex(): number { return this.#mnemonicText().index; }

    /**
     * Character activated by Alt, or an empty string when there is none.
     * @returns The mnemonic.
     */
    mnemonic(): string {
        const { text, index } = this.#mnemonicText();
        return index < 0 ? "" : String.fromCodePoint(text.codePointAt(index)!);
    }

    /**
     * Requests keyboard focus for the label's buddy when the label is displaying text.
     * @returns `true` if a buddy acquired focus, or `false` if no eligible buddy can receive it.
     */
    activateBuddy(): boolean {
        return this.#m_pixmap === null && this.#m_buddy !== null
            && CApplication.instance().focusLabelBuddy(this, this.#m_buddy);
    }

    #mnemonicText(): { text: string; index: number } {
        const parsed = this.#parsed();
        if (this.#m_pixmap === null && parsed.links.length > 0) return { text: parsed.text, index: -1 };
        if (this.#m_buddy === null || this.#m_pixmap !== null)
            return { text: parsed.text, index: -1 };
        let text = "";
        let index = -1;
        for (let i = 0; i < parsed.text.length; ++i) {
            const character = parsed.text[i]!;
            if (character !== "&" || i + 1 === parsed.text.length) {
                text += character;
            } else if (parsed.text[i + 1] === "&") {
                text += "&";
                ++i;
            } else {
                if (index < 0) index = text.length;
                // The following character is appended on the next iteration.
            }
        }
        return { text, index };
    }

    /**
     * Responds to a pointer button press for the label. May update the pressed link, the focused link. May request focus and accept the event and request a repaint.
     * @param event Event for a pointer button press.
     */
    protected override mousePressEvent(event: CMouseEvent): void {
        if (event.button() === CMouseButton.LeftButton) {
            this.#pressedLink = this.#hitLink(event.x(), event.y());
            if (this.#pressedLink >= 0) {
                this.#focusedLink = this.#pressedLink; this.setFocus(); event.accept(); this.update(); return;
            }
        }
        if (event.button() === CMouseButton.LeftButton && this.activateBuddy()) {
            event.accept();
            return;
        }
        super.mousePressEvent(event);
    }

    /**
     * Releases resources held by the label.
     */
    override destroy(): void {
        this.#m_buddy = null;
        super.destroy();
    }

	/**
	 * Reads the alignment.
	 * @returns The alignment.
	 */
	alignment(): CAlignment {
		return this.#m_alignment;
	}

	/**
	 * Sets the alignment.
	 * @param alignment Alignment flags to apply.
	 */
	setAlignment(alignment: CAlignment): void {
		/** Provides if behavior. */
		if (this.#m_alignment === alignment)
			return;

		this.#m_alignment = alignment; this.#pressedLink = this.#hoveredLink = -1;
		this.update();
	}

	/**
	 * Reads the pixmap.
	 * @returns The pixmap.
	 */
	pixmap(): CPixmap | null {
		return this.#m_pixmap;
	}

	/**
	 * Sets the pixmap.
	 * @param pixmap Pixmap.
	 */
	setPixmap(pixmap: CPixmap | null): void {
		/** Provides if behavior. */
		if (this.#m_pixmap === pixmap)
			return;
		this.#m_pixmap = pixmap; this.#syncLinks();
        this.updateGeometry();
		this.update();
	}

    /**
     * Reads whether label text can wrap onto multiple lines.
     * @returns `true` if word wrapping is enabled.
     */
    wordWrap(): boolean { return this.#m_wordWrap; }

    /**
     * Sets the word wrap. May update the word wrap, the pressed link, the hovered link. May refresh layout geometry and request a repaint.
     * @param enabled Whether to enable the feature.
     */
    setWordWrap(enabled: boolean): void {
        if (this.#m_wordWrap === enabled) return;
        this.#m_wordWrap = enabled; this.#pressedLink = this.#hoveredLink = -1;
        const policy = this.sizePolicy();
        policy.setHeightForWidth(enabled);
        this.setSizePolicy(policy);
        this.updateGeometry();
        this.update();
    }

    /**
     * Checks whether the label has height for width.
     * @returns `true` if the label has height for width, otherwise `false`.
     */
    override hasHeightForWidth(): boolean { return this.#m_wordWrap && this.#m_pixmap === null; }

    /**
     * Measures the wrapped text block and adds vertical padding.
     * @param width Available width in logical pixels.
     * @returns Preferred wrapped height, or `-1` if height does not depend on width.
     */
    override heightForWidth(width: number): number {
        if (!this.hasHeightForWidth()) return -1;
        return this.#textBlockHeight(this.#wrappedLines(width).length) + 2 * CLabel.#VPADDING;
    }

    #textBlockHeight(lines: number, lineHeight = this.fontMetrics().height()): number {
        return lines * lineHeight + Math.max(0, lines - 1) * CLabel.#LINE_GAP;
    }

    #textLines(): Array<{ text: string; start: number }> {
        const parts = this.displayText().split(/(\r\n|\r|\n)/);
        const lines: Array<{ text: string; start: number }> = [];
        let start = 0;
        for (let i = 0; i < parts.length; i += 2) {
            const text = parts[i]!;
            lines.push({ text, start });
            start += text.length + (parts[i + 1]?.length ?? 0);
        }
        return lines;
    }

    // Keep source offsets so mnemonic underlines follow wrapped text.
    #wrappedLines(width: number): Array<{ text: string; start: number }> {
        const available = Math.max(0, width - 2 * CLabel.#HPADDING);
        const metrics = this.fontMetrics();
        const lines: Array<{ text: string; start: number }> = [];
        for (const paragraph of this.#textLines()) {
            let rest = paragraph.text, start = paragraph.start;
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
        }
        return lines;
    }

	/**
	 * Returns the preferred size of the widget.
	 * @returns A new `CSize`.
	 */
	override sizeHint(): CSize {
        const lines = this.#textLines();
        return new CSize(
            Math.max(0, ...lines.map(line => this.fontMetrics().textWidth(line.text))) + 2 * CLabel.#HPADDING,
            this.#textBlockHeight(lines.length) + 2 * CLabel.#VPADDING
        );
	}

    #paintLinks(painter: CPainter, option: CStyleOptionLabel): void {
        const background = new CStyleOptionLabel(option); background.text = ""; this.style().drawLabel(painter, background);
        const links = this.#parsed().links, metrics = this.fontMetrics();
        painter.save();
        try {
            painter.clipRect(this.rect()); painter.setFont(this.font()); painter.setTextAlign("left"); painter.setTextBaseline("top"); painter.setLineWidth(1);
            for (const line of this.#linkLayout()) {
                const boundaries = new Set([0, line.text.length]);
                for (const link of links) { boundaries.add(Math.max(0, Math.min(line.text.length, link.start - line.start))); boundaries.add(Math.max(0, Math.min(line.text.length, link.end - line.start))); }
                const points = [...boundaries].sort((a, b) => a - b);
                for (let i = 1; i < points.length; ++i) {
                    const start = points[i - 1]!, end = points[i]!; if (end <= start) continue;
                    const link = links.findIndex(item => line.start + start >= item.start && line.start + start < item.end);
                    painter.setPen(this.palette().color(!this.isEnabled() ? CPaletteColorRole.DisabledText : link >= 0 ? CPaletteColorRole.Link : CPaletteColorRole.Text).toCss());
                    const x = line.x + metrics.textWidth(line.text.slice(0, start)), right = line.x + metrics.textWidth(line.text.slice(0, end));
                    painter.drawText(line.text.slice(start, end), x, line.y);
                    if (link >= 0) {
                        painter.drawLine(x, line.y + line.height - 1, right, line.y + line.height - 1);
                        if (this.hasFocus() && this.isEnabled() && link === this.#focusedLink)
                            painter.strokeRect(new CRect(x + 0.5, line.y + 0.5, Math.max(0, right - x - 1), Math.max(0, line.height - 1)));
                    }
                }
            }
        } finally { painter.restore(); }
    }

    /**
     * Draws the label through the supplied painter.
     * @param painter Painter for the current drawing operation.
     */
    protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionLabel();
		option.initFromLabel(this);

        if (this.#m_pixmap === null && this.#parsed().links.length > 0) {
            this.#paintLinks(painter, option); return;
        }
        if (!this.hasHeightForWidth() && (option.pixmap !== null || !/[\r\n]/.test(option.text))) {
            this.style().drawLabel(painter, option);
            return;
        }
        const background = new CStyleOptionLabel(option);
        background.text = "";
        this.style().drawLabel(painter, background);
        const lines = this.hasHeightForWidth() ? this.#wrappedLines(this.width()) : this.#textLines();
        const lineHeight = this.fontMetrics().height();
        const blockHeight = this.#textBlockHeight(lines.length, lineHeight);
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
            painter.translate(CLabel.#HPADDING, y + i * (lineHeight + CLabel.#LINE_GAP));
            this.style().drawLabel(painter, lineOption);
            painter.restore();
        }
        painter.restore();
	}
}