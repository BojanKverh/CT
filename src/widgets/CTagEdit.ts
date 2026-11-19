/** @module Widgets/CTagEdit */
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
    override sizeHint(): CSize {
        const fm = new CFontMetrics(this.font());
        return new CSize(Math.max(100, Math.min(240, fm.textWidth(this.text() || this.placeholderText()) + 24)),
            Math.max(28, Math.ceil(fm.height()) + 12));
    }
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
    protected override mousePressEvent(event: CMouseEvent): void {
        if (event.button() !== CMouseButton.LeftButton || !this.owner.isEnabled()) { event.ignore(); return; }
        this.#pressed = this.#hit(event); this.owner.setFocus(); event.accept(); this.update();
    }
    protected override mouseReleaseEvent(event: CMouseEvent): void {
        if (event.button() !== CMouseButton.LeftButton) { event.ignore(); return; }
        const remove = this.#pressed && this.#hit(event); this.#pressed = false;
        event.accept(); this.update(); if (remove) this.remove();
    }
    protected override mouseMoveEvent(event: CMouseEvent): void { this.#hovered = this.#hit(event); event.accept(); this.update(); }
    protected override mouseLeaveEvent(event: CMouseEvent): void { this.#hovered = false; event.accept(); this.update(); }
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
 *
 * @example
 * With an existing application and parent widget, initialize tags before observing subsequent changes. Add the editor to the parent layout.
 * ```ts
 * import { CWidget, CTagEdit } from "canvas-toolkit-lib";
 *
 * function createTagEditor(parent: CWidget) {
 *     const tags = new CTagEdit(parent);
 *     tags.setPlaceholderText("Add a topic");
 *     tags.setTags(["TypeScript", "Canvas"]);
 *     tags.tagsChanged.connect(values => console.log(values));
 *     // Returns false because tags are unique and this tag already exists.
 *     const added = tags.addTag("Canvas");
 *     console.log(added);
 *     return tags;
 * }
 * ```
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
    /**
    * Emitted with the updated tag list after tags are added, removed or replaced.
    * @group Signals
    */
    readonly tagsChanged = new CSignal<[string[]]>();

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    * @param parent Owner of this object. Widget parents manage child lifetime and inherited state. Omit to use `null`.
    */
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
    * Returns a copy of the retained tag strings.
    */
    tags(): string[] { return [...this.#tags]; }
    /**
    * Returns the number of retained tags.
    */
    count(): number { return this.#tags.length; }
    /**
    * Returns the input used to type new tags.
    */
    lineEdit(): CLineEdit { return this.#editor; }
    /**
    * Returns the input's completion helper, or null.
    */
    completer(): CCompleter | null { return this.#completer; }
    /** Borrows a completer; its original source and filter are retained. */
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
    override destroy(): void { this.setCompleter(null); super.destroy(); }
    /**
    * Whether user edits are blocked.
    * The initial value is `false`.
    */
    isReadOnly(): boolean { return this.#readOnly; }
    /**
    * Returns the hint displayed by the new-tag input when empty.
    */
    placeholderText(): string { return this.#editor.placeholderText(); }
    /**
    * Changes the new-tag input's empty hint.
    */
    setPlaceholderText(text: string): void { this.#editor.setPlaceholderText(text); this.#editor.updateGeometry(); }
    #normalize(text: string): string { return text.replace(/[\r\n\t]+/g, " ").trim(); }
    /**
    * Replaces the tag collection using the control's tag-normalization rules.
    */
    setTags(tags: readonly string[]): void {
        const next = [...new Set(tags.map(text => this.#normalize(text)).filter(text => text.length > 0))];
        if (next.length === this.#tags.length && next.every((text, i) => text === this.#tags[i])) return;
        this.#tags = next; this.#rebuild();
        if (this.#completer?.completionFilter() === this.#tagFilter)
            this.#completer.setCompletionFilter(this.#tagFilter); this.tagsChanged.emit(this.tags());
    }
    /**
    * Adds a tag according to the control's normalization and duplicate rules.
    */
    addTag(text: string): boolean {
        const normalized = this.#normalize(text);
        if (!normalized || this.#tags.includes(normalized)) return false;
        this.setTags([...this.#tags, normalized]); return true;
    }
    /**
    * Removes a tag and refreshes chip layout and tag-change feedback.
    */
    removeTag(text: string): boolean {
        const index = this.#tags.indexOf(this.#normalize(text));
        if (index < 0) return false;
        this.setTags(this.#tags.filter((_, i) => i !== index)); return true;
    }
    /**
    * Removes retained tags and refreshes the input and chip layout.
    */
    clear(): void { this.setTags([]); this.#editor.setText(""); }
    /** Commits nonempty pending input; duplicate input is cleared but not added. */
    commit(): boolean {
        if (this.#readOnly || !this.isEnabled()) return false;
        const text = this.#normalize(this.#editor.text());
        if (!text) return false;
        const added = this.addTag(text); this.#editor.setText(""); this.#completer?.hidePopup(); return added;
    }
    /**
    * Controls whether users can add or remove tags.
    */
    setReadOnly(readOnly: boolean): void {
        if (this.#readOnly === readOnly) return;
        if (readOnly) this.#completer?.hidePopup();
        this.#readOnly = readOnly; this.#editor.setReadOnly(readOnly); this.#rebuild();
    }
    override setEnabled(enabled: boolean): void {
        if (!enabled) this.#completer?.hidePopup();
        super.setEnabled(enabled); this.#editor.setEnabled(enabled);
        for (const chip of this.#chips) chip.setEnabled(enabled);
    }
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
    override sizeHint(): CSize {
        const width = Math.max(200, Math.min(480, this.#flow.sizeHint().width()));
        return new CSize(width, this.#flow.heightForWidth(width));
    }
    protected override mousePressEvent(event: CMouseEvent): void {
        if (event.button() !== CMouseButton.LeftButton) { event.ignore(); return; }
        this.setFocus(); event.accept();
    }
    protected override paintEvent(painter: CPainter): void {
        painter.setBrush(this.palette().color(CPaletteColorRole.Base).toCss()); painter.fillRect(this.rect());
        painter.setPen(this.palette().color(!this.isEnabled() ? CPaletteColorRole.DisabledText
            : this.hasFocus() ? CPaletteColorRole.Highlight : CPaletteColorRole.Mid).toCss());
        painter.strokeRect(new CRect(0.5, 0.5, Math.max(0, this.width() - 1), Math.max(0, this.height() - 1)));
    }
}
