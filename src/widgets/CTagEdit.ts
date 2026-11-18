import { CSignal } from "../core/CSignal.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import { CMouseButton, type CMouseEvent } from "../events/CMouseEvent.js";
import { CPoint } from "../geometry/CPoint.js";
import { CRect } from "../geometry/CRect.js";
import { CSize } from "../geometry/CSize.js";
import { CSizePolicyType } from "../geometry/CSizePolicy.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import type { CFont } from "../gui/CFont.js";
import { CFontMetrics } from "../gui/CFontMetrics.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import { CStyleState } from "../gui/CStyleOption.js";
import { CStyleOptionTagEdit } from "../gui/CStyleOptionTagEdit.js";
import { CFlowLayout } from "../layouts/CFlowLayout.js";
import type { CPainter } from "../painting/CPainter.js";
import { CLineEdit } from "./CLineEdit.js";
import type { CCompleter } from "./CCompleter.js";
import { CWidget } from "./CWidget.js";

class TagLineEdit extends CLineEdit {
    constructor(parent: CWidget, private readonly removeLast: () => void) { super(parent); }
    /**
     * Reads the size hint of the tag line edit.
     * @returns A new `CSize`.
     */
    override sizeHint(): CSize {
        const fm = new CFontMetrics(this.font());
        return new CSize(Math.max(100, Math.min(240, fm.textWidth(this.text() || this.placeholderText()) + 24)),
            Math.max(28, Math.ceil(fm.height()) + 12));
    }
    /**
     * Responds to a key press for the tag line edit. May accept the event.
     * @param event Event for a key press.
     */
    protected override keyPressEvent(event: CKeyEvent): void {
        if (!this.isReadOnly() && this.text() === "" && event.key() === "Backspace"
            && !event.ctrl() && !event.alt() && !event.meta()) {
            this.removeLast(); event.accept(); return;
        }
        super.keyPressEvent(event);
    }
}

class TagChip extends CWidget {
    #hovered = false;
    #pressed = false;
    constructor(private readonly owner: CTagEdit, readonly text: string, private readonly remove: () => void) {
        super(owner); this.setSizePolicy(CSizePolicyType.Preferred, CSizePolicyType.Fixed);
    }
    /**
     * Reads the size hint of the tag chip.
     * @returns A new `CSize`.
     */
    override sizeHint(): CSize {
        const fm = new CFontMetrics(this.font());
        return new CSize(Math.ceil(fm.textWidth(this.text)) + 16 + (this.owner.isReadOnly() ? 0 : 24),
            Math.max(28, Math.ceil(fm.height()) + 12));
    }
    #hit(event: CMouseEvent): boolean {
        return !this.owner.isReadOnly() && this.owner.isEnabled()
            && new CRect(Math.max(0, this.width() - 24), 0, Math.min(24, this.width()), this.height())
                .contains(new CPoint(event.x(), event.y()));
    }
    /**
     * Responds to a pointer button press for the tag chip. May update the pressed. May request a repaint and accept or ignore the event depending on the input.
     * @param event Event for a pointer button press.
     */
    protected override mousePressEvent(event: CMouseEvent): void {
        if (event.button() !== CMouseButton.LeftButton || !this.owner.isEnabled()) { event.ignore(); return; }
        this.#pressed = this.#hit(event); this.owner.setFocus(); event.accept(); this.update();
    }
    /**
     * Responds to a pointer button release for the tag chip. May update the pressed. May request a repaint and accept or ignore the event depending on the input.
     * @param event Event for a pointer button release.
     */
    protected override mouseReleaseEvent(event: CMouseEvent): void {
        if (event.button() !== CMouseButton.LeftButton) { event.ignore(); return; }
        const remove = this.#pressed && this.#hit(event); this.#pressed = false;
        event.accept(); this.update(); if (remove) this.remove();
    }
    /**
     * Responds to pointer movement for the tag chip. May update the hovered. May accept the event and request a repaint.
     * @param event Event for pointer movement.
     */
    protected override mouseMoveEvent(event: CMouseEvent): void { this.#hovered = this.#hit(event); event.accept(); this.update(); }
    /**
     * Responds to pointer exit for the tag chip. May update the hovered. May accept the event and request a repaint.
     * @param event Event for pointer exit.
     */
    protected override mouseLeaveEvent(event: CMouseEvent): void { this.#hovered = false; event.accept(); this.update(); }
    /**
     * Draws the tag chip through the supplied painter.
     * @param painter Painter for the current drawing operation.
     */
    protected override paintEvent(painter: CPainter): void {
        const option = new CStyleOptionTagEdit(); option.initFrom(this);
        if (!this.owner.isEnabled()) option.state &= ~CStyleState.Enabled;
        option.text = this.text; option.readOnly = this.owner.isReadOnly();
        option.removeHovered = this.#hovered; option.removePressed = this.#pressed;
        this.style().drawTag(painter, option);
    }
}

/** Multi-tag editor. Tags are trimmed, single-line and unique (case-sensitive).
 * Enter commits, the remove glyph deletes a tag, and Backspace on empty input
 * deletes the last tag. Programmatic setters remain available in read-only mode.
 */
export class CTagEdit extends CWidget {
    #tags: string[] = [];
    #chips: TagChip[] = [];
    #editor: TagLineEdit;
    #flow = new CFlowLayout();
    #readOnly = false;
    #completer: CCompleter | null = null;
    #disconnectCompletion: (() => void) | null = null;
    #previousFilter: ((value: string) => boolean) | null = null;
    #tagFilter: ((value: string) => boolean) | null = null;
    readonly tagsChanged = new CSignal<[string[]]>();

    constructor(parent: CWidget | null = null) {
        super(parent);
        this.#editor = new TagLineEdit(this, () => {
            if (!this.#readOnly && this.isEnabled() && this.#tags.length > 0) this.removeTag(this.#tags[this.#tags.length - 1]!);
        });
        this.#editor.setPlaceholderText("Add a tag…"); this.#editor.setMinimumSize(60, 28);
        this.#editor.setSizePolicy(CSizePolicyType.Preferred, CSizePolicyType.Fixed);
        this.#editor.returnPressed.connect(() => { this.commit(); });
        this.#editor.textChanged.connect(() => this.#editor.updateGeometry());
        this.#flow.setContentsMargins(6, 6, 6, 6); this.#flow.setSpacing(6);
        this.#flow.addWidget(this.#editor); this.setLayout(this.#flow);
        this.setFocusPolicy(CFocusPolicy.StrongFocus); this.setFocusProxy(this.#editor);
    }
    /**
     * Reads the current normalized unique tags.
     * @returns A new array containing the tags in display order.
     */
    tags(): string[] { return [...this.#tags]; }
    /**
     * Counts the entries in the tag edit.
     * @returns The number of entries in the tags.
     */
    count(): number { return this.#tags.length; }
    /**
     * Reads the editor.
     * @returns The editor.
     */
    lineEdit(): CLineEdit { return this.#editor; }
    /**
     * Reads the completer.
     * @returns The completer.
     */
    completer(): CCompleter | null { return this.#completer; }
    /**
     * Borrows a completer; its original source and filter are retained.
     * @param completer Completer.
     */
    setCompleter(completer: CCompleter | null): void {
        if (completer === this.#completer) return;
        this.#disconnectCompletion?.(); this.#disconnectCompletion = null;
        this.#editor.setCompleter(null);
        if (this.#completer?.completionFilter() === this.#tagFilter)
            this.#completer.setCompletionFilter(this.#previousFilter);
        this.#completer = completer;
        this.#previousFilter = completer?.completionFilter() ?? null;
        const previous = this.#previousFilter;
        this.#tagFilter = value => (previous?.(value) ?? true)
            && !this.#tags.includes(this.#normalize(value));
        if (completer !== null) {
            completer.setCompletionFilter(this.#tagFilter);
            this.#editor.setCompleter(completer);
            this.#disconnectCompletion = completer.activated.connect(() => {
                if (completer.widget() === this.#editor) this.commit();
            });
        }
    }
    /**
     * Releases resources held by the tag edit.
     */
    override destroy(): void { this.setCompleter(null); super.destroy(); }
    /**
     * Checks whether the tag edit is read only.
     * @returns `true` if the tag edit is read only, otherwise `false`.
     */
    isReadOnly(): boolean { return this.#readOnly; }
    /**
     * Reads the hint shown in the tag entry field.
     * @returns The editor's current placeholder.
     */
    placeholderText(): string { return this.#editor.placeholderText(); }
    /**
     * Changes the hint shown by the tag entry field and refreshes its preferred size.
     * @param text Placeholder text for the entry field.
     */
    setPlaceholderText(text: string): void { this.#editor.setPlaceholderText(text); this.#editor.updateGeometry(); }
    #normalize(text: string): string { return text.replace(/[\r\n\t]+/g, " ").trim(); }
    /**
     * Normalizes tags, removes empty and duplicate entries, rebuilds the chips and emits `tagsChanged` when the list differs.
     * @param tags Tag text in the desired display order.
     */
    setTags(tags: readonly string[]): void {
        const next = [...new Set(tags.map(text => this.#normalize(text)).filter(text => text.length > 0))];
        if (next.length === this.#tags.length && next.every((text, i) => text === this.#tags[i])) return;
        this.#tags = next; this.#rebuild();
        if (this.#completer?.completionFilter() === this.#tagFilter)
            this.#completer.setCompletionFilter(this.#tagFilter); this.tagsChanged.emit(this.tags());
    }
    /**
     * Normalizes the supplied text and appends it if it is nonempty and unique.
     * @param text Text of the tag to add.
     * @returns `true` if the tag was appended, or `false` for empty or duplicate input after normalization.
     */
    addTag(text: string): boolean {
        const normalized = this.#normalize(text);
        if (!normalized || this.#tags.includes(normalized)) return false;
        this.setTags([...this.#tags, normalized]); return true;
    }
    /**
     * Removes the tag matching the normalized input.
     * @param text Text of the tag to remove.
     * @returns `true` if a matching tag was removed.
     */
    removeTag(text: string): boolean {
        const index = this.#tags.indexOf(this.#normalize(text));
        if (index < 0) return false;
        this.setTags(this.#tags.filter((_, i) => i !== index)); return true;
    }
    /**
     * Clears the contents of the tag edit.
     */
    clear(): void { this.setTags([]); this.#editor.setText(""); }
    /**
     * Tries to add the pending input as a tag. Nonempty input is cleared and the completion popup is dismissed even when it duplicates an existing tag.
     * @returns `true` if a new tag was added. Returns `false` for disabled, read-only, empty or duplicate input.
     */
    commit(): boolean {
        if (this.#readOnly || !this.isEnabled()) return false;
        const text = this.#normalize(this.#editor.text());
        if (!text) return false;
        const added = this.addTag(text); this.#editor.setText(""); this.#completer?.hidePopup(); return added;
    }
    /**
     * Sets the read only.
     * @param readOnly Read only flag.
     */
    setReadOnly(readOnly: boolean): void {
        if (this.#readOnly === readOnly) return;
        if (readOnly) this.#completer?.hidePopup();
        this.#readOnly = readOnly; this.#editor.setReadOnly(readOnly); this.#rebuild();
    }
    /**
     * Sets the enabled.
     * @param enabled Whether to enable the feature.
     */
    override setEnabled(enabled: boolean): void {
        if (!enabled) this.#completer?.hidePopup();
        super.setEnabled(enabled); this.#editor.setEnabled(enabled);
        for (const chip of this.#chips) chip.setEnabled(enabled);
    }
    /**
     * Updates the tag field and each chip's font, then reflows the contents.
     * @param font Font to apply to the tag control and its internal widgets.
     * @param _propagate Accepted for compatibility. The method always updates the internal tag widgets.
     */
    override setFont(font: CFont, _propagate = false): void {
        super.setFont(font, false); this.#editor.setFont(font);
        for (const chip of this.#chips) chip.setFont(font);
        this.#flow.update(); this.updateGeometry();
    }
    #rebuild(): void {
        this.#flow.clear();
        for (const chip of this.#chips) chip.destroy();
        this.#chips = this.#tags.map(text => {
            const chip = new TagChip(this, text, () => {
                if (!this.#readOnly && this.isEnabled()) this.removeTag(text);
            });
            chip.setEnabled(this.isEnabled()); this.#flow.addWidget(chip); return chip;
        });
        this.#flow.addWidget(this.#editor); this.updateGeometry(); this.update();
    }
    /**
     * Measures the wrapping tag layout at a preferred width between 200 and 480 logical pixels.
     * @returns Preferred width and the layout height at that width.
     */
    override sizeHint(): CSize {
        const width = Math.max(200, Math.min(480, this.#flow.sizeHint().width()));
        return new CSize(width, this.#flow.heightForWidth(width));
    }
    /**
     * Focuses the tag control on a left press and ignores other buttons.
     * @param event Mouse event with pointer coordinates local to the control.
     */
    protected override mousePressEvent(event: CMouseEvent): void {
        if (event.button() !== CMouseButton.LeftButton) { event.ignore(); return; }
        this.setFocus(); event.accept();
    }
    /**
     * Draws the tag edit through the supplied painter.
     * @param painter Painter for the current drawing operation.
     */
    protected override paintEvent(painter: CPainter): void {
        painter.setBrush(this.palette().color(CPaletteColorRole.Base).toCss()); painter.fillRect(this.rect());
        painter.setPen(this.palette().color(!this.isEnabled() ? CPaletteColorRole.DisabledText
            : this.hasFocus() ? CPaletteColorRole.Highlight : CPaletteColorRole.Mid).toCss());
        painter.strokeRect(new CRect(0.5, 0.5, Math.max(0, this.width() - 1), Math.max(0, this.height() - 1)));
    }
}
