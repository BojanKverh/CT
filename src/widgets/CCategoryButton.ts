import { CSignal } from "../core/CSignal.js";
import type { CFocusEvent } from "../events/CFocusEvent.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import { CMouseButton, type CMouseEvent } from "../events/CMouseEvent.js";
import { CRect } from "../geometry/CRect.js";
import { CSize } from "../geometry/CSize.js";
import { CSizePolicyType } from "../geometry/CSizePolicy.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import type { CFont } from "../gui/CFont.js";
import { CFontMetrics } from "../gui/CFontMetrics.js";
import type { CIcon } from "../gui/CIcon.js";
import { CStyleOptionCategoryButton } from "../gui/CStyleOptionCategoryButton.js";
import type { CPainter } from "../painting/CPainter.js";
import { CWidget } from "./CWidget.js";

type Segment = { text: string; icon: CIcon | null; enabled: boolean };

/** A single Tab stop with mutually exclusive segments. Arrows select immediately and wrap.
 * The first item is selected automatically. -1 explicitly clears the selection.
 * currentIndexChanged includes programmatic changes; activated reports user activation.
 */
export class CCategoryButton extends CWidget {
    #items: Segment[] = [];
    #current = -1;
    #hovered = -1;
    #pressed = -1;
    #keyboardPress = false;
    readonly currentIndexChanged = new CSignal<[number]>();
    readonly activated = new CSignal<[number]>();

    constructor(parent: CWidget | null = null) {
        super(parent); this.setFocusPolicy(CFocusPolicy.StrongFocus);
        this.setSizePolicy(CSizePolicyType.Preferred, CSizePolicyType.Fixed);
    }
    /**
     * Counts the entries in the category button.
     * @returns The number of entries in the items.
     */
    count(): number { return this.#items.length; }
    /**
     * Reads the current.
     * @returns The current.
     */
    currentIndex(): number { return this.#current; }
    /**
     * Reads the caption of the selected category.
     * @returns Current caption, or an empty string when no category is selected.
     */
    currentText(): string { return this.itemText(this.#current); }
    /**
     * Reads the caption for a segment.
     * @param index Zero-based segment index.
     * @returns Caption, or an empty string if the segment is absent.
     */
    itemText(index: number): string { return this.#items[index]?.text ?? ""; }
    /**
     * Reads the icon assigned to a segment.
     * @param index Zero-based segment index.
     * @returns Icon, or `null` when no icon or segment exists.
     */
    itemIcon(index: number): CIcon | null { return this.#items[index]?.icon ?? null; }
    /**
     * Checks whether the category button is item enabled.
     * @param index Zero-based item index.
     * @returns `true` if the category button is item enabled, otherwise `false`.
     */
    isItemEnabled(index: number): boolean { return this.#items[index]?.enabled ?? false; }
    /**
     * Appends an enabled category segment.
     * @param text Caption to display.
     * @param icon Optional icon, or `null` for no icon.
     * @returns Zero-based index of the new segment.
     */
    addItem(text: string, icon: CIcon | null = null): number { return this.insertItem(this.count(), text, icon); }
    /**
     * Adds the items.
     * @param texts Texts.
     */
    addItems(texts: readonly string[]): void { for (const text of texts) this.addItem(text); }
    /**
     * Inserts an enabled segment and adjusts the selected index to preserve the current item. Selects the new segment if none was active.
     * @param index Integer insertion position from zero through the current count.
     * @param text Text shown on the segment.
     * @param icon Optional icon, or `null` for text only.
     * @returns Inserted index, or `-1` when the position is invalid.
     */
    insertItem(index: number, text: string, icon: CIcon | null = null): number {
        if (!Number.isInteger(index) || index < 0 || index > this.count()) return -1;
        this.#cancel(); this.#items.splice(index, 0, { text, icon, enabled: true });
        const next = this.#current >= index ? this.#current + 1 : this.#current < 0 ? index : this.#current;
        this.#select(next); this.updateGeometry(); return index;
    }
    /**
     * Removes the item. May refresh layout geometry and request a repaint.
     * @param index Zero-based item index.
     */
    removeItem(index: number): void {
        if (!this.#items[index]) return;
        this.#cancel(); this.#items.splice(index, 1);
        let next = this.#current;
        if (next > index) --next;
        else if (next === index) next = this.#nextEnabled(index - 1, 1);
        this.#select(next, this.#current === index); this.updateGeometry(); this.update();
    }
    /**
     * Clears the contents of the category button. May refresh layout geometry and request a repaint.
     */
    clear(): void { this.#cancel(); this.#items = []; this.#select(-1); this.updateGeometry(); this.update(); }
    /**
     * Changes the segment caption and recalculates the preferred geometry.
     * @param index Zero-based segment index.
     * @param text New segment caption.
     */
    setItemText(index: number, text: string): void {
        const item = this.#items[index]; if (!item || item.text === text) return;
        this.#cancel(); item.text = text; this.updateGeometry(); this.update();
    }
    /**
     * Changes a segment icon, cancels pending interaction and refreshes the preferred geometry.
     * @param index Zero-based segment index.
     * @param icon New icon, or `null` to remove it.
     */
    setItemIcon(index: number, icon: CIcon | null): void {
        const item = this.#items[index]; if (!item || item.icon === icon) return;
        this.#cancel(); item.icon = icon; this.updateGeometry(); this.update();
    }
    /**
     * Disabling the current segment selects the next enabled one, or -1 if none remain.
     * @param index Zero-based item index.
     * @param enabled Whether to enable the feature.
     */
    setItemEnabled(index: number, enabled: boolean): void {
        const item = this.#items[index]; if (!item || item.enabled === enabled) return;
        this.#cancel(); item.enabled = enabled;
        if (!enabled && this.#current === index) this.#select(this.#nextEnabled(index, 1));
        else if (enabled && this.#current < 0) this.#select(index);
        this.update();
    }
    /**
     * Sets the current index. The implementation checks whether `index` is an integer.
     * @param index Zero-based item index.
     */
    setCurrentIndex(index: number): void {
        if (index !== -1 && (!Number.isInteger(index) || !this.isItemEnabled(index))) return;
        if (index === this.#current) return;
        this.#cancel(); this.#select(index);
    }
    #select(index: number, force = false): void {
        if (index === this.#current && !force) { this.update(); return; }
        this.#current = index; this.update(); this.currentIndexChanged.emit(index);
    }
    #nextEnabled(from: number, direction: number): number {
        for (let step = 1; step <= this.count(); ++step) {
            const index = ((from + step * direction) % this.count() + this.count()) % this.count();
            if (this.isItemEnabled(index)) return index;
        }
        return -1;
    }
    #widths(): number[] {
        const fm = new CFontMetrics(this.font());
        return this.#items.map(item => Math.max(36, Math.ceil(fm.textWidth(item.text)) + 24
            + (item.icon !== null && !item.icon.isNull() ? 16 + (item.text ? 6 : 0) : 0)));
    }
    /**
     * Measures the combined caption and icon widths and the required font height.
     * @returns Preferred segmented control size in logical pixels.
     */
    override sizeHint(): CSize {
        return new CSize(this.#widths().reduce((sum, width) => sum + width, 0),
            Math.max(32, Math.ceil(new CFontMetrics(this.font()).height()) + 12));
    }
    /**
     * Computes the laid-out bounds of a category segment for the widget's current size.
     * @param index Zero-based segment index.
     * @returns Rectangle in widget-local coordinates, or `null` for an absent segment or a widget with nonpositive dimensions.
     */
    segmentRect(index: number): CRect | null {
        if (!this.#items[index] || this.width() <= 0 || this.height() <= 0) return null;
        const widths = this.#widths(), natural = widths.reduce((a, b) => a + b, 0);
        const before = widths.slice(0, index).reduce((a, b) => a + b, 0);
        const edge = (sum: number, count: number): number => natural <= this.width()
            ? sum + (this.width() - natural) * count / widths.length : sum * this.width() / natural;
        const left = edge(before, index), right = edge(before + widths[index]!, index + 1);
        return new CRect(left, 0, Math.max(0, right - left), this.height());
    }
    #hit(x: number, y: number): number {
        if (x < 0 || y < 0 || x >= this.width() || y >= this.height()) return -1;
        for (let i = 0; i < this.count(); ++i) {
            const r = this.segmentRect(i);
            if (r !== null && x >= r.x() && x < r.x() + r.width()) return this.isItemEnabled(i) ? i : -1;
        }
        return -1;
    }
    #activate(index: number): void {
        if (!this.isItemEnabled(index) || this.inputBlocker() !== null) return;
        for (let owner: CWidget | null = this; owner !== null; owner = owner.parent())
            if (!owner.isVisible() || !owner.isEnabled()) return;
        this.#select(index); this.activated.emit(index);
    }
    #cancel(): void { this.#pressed = -1; this.#keyboardPress = false; this.#hovered = -1; this.update(); }
    /**
     * Sets the enabled.
     * @param enabled Whether to enable the feature.
     */
    override setEnabled(enabled: boolean): void { if (!enabled) this.#cancel(); super.setEnabled(enabled); }
    /**
     * Changes the control's font, cancels interaction and recalculates preferred geometry.
     * @param font Font used to measure and draw captions.
     * @param _propagate Accepted for compatibility. This method updates only the category control.
     */
    override setFont(font: CFont, _propagate = false): void { super.setFont(font, false); this.#cancel(); this.updateGeometry(); }
    /**
     * Sets the geometry.
     * @param x Horizontal position in parent coordinates.
     * @param y Vertical position in parent coordinates.
     * @param w Width in logical pixels.
     * @param h Height in logical pixels.
     */
    override setGeometry(x: number, y: number, w: number, h: number): void {
        this.#cancel(); super.setGeometry(x, y, w, h);
    }
    /**
     * Responds to the visibility change event for the category button.
     */
    protected override visibilityChangeEvent(): void { this.#cancel(); }
    /**
     * Responds to focus exit for the category button.
     * @param event Event for focus exit.
     */
    protected override focusOutEvent(event: CFocusEvent): void { this.#cancel(); super.focusOutEvent(event); }
    /**
     * Tracks a left press on a segment and requests focus when one is hit.
     * @param event Mouse event with pointer coordinates local to the control.
     */
    protected override mousePressEvent(event: CMouseEvent): void {
        if (event.button() !== CMouseButton.LeftButton) { event.ignore(); return; }
        this.#keyboardPress = false; this.#pressed = this.#hit(event.x(), event.y());
        if (this.#pressed >= 0) this.setFocus(); event.accept(); this.update();
    }
    /**
     * Activates a segment on a left release over the same segment that received the press.
     * @param event Mouse event with pointer coordinates local to the control.
     */
    protected override mouseReleaseEvent(event: CMouseEvent): void {
        if (event.button() !== CMouseButton.LeftButton) { event.ignore(); return; }
        const index = !this.#keyboardPress && this.#pressed === this.#hit(event.x(), event.y()) ? this.#pressed : -1;
        this.#pressed = -1; this.#keyboardPress = false; event.accept(); this.update(); if (index >= 0) this.#activate(index);
    }
    /**
     * Updates the hovered segment and repaints.
     * @param event Mouse event with pointer coordinates local to the control.
     */
    protected override mouseMoveEvent(event: CMouseEvent): void { this.#hovered = this.#hit(event.x(), event.y()); event.accept(); this.update(); }
    /**
     * Clears segment hover highlighting.
     * @param event Mouse event with pointer coordinates local to the control.
     */
    protected override mouseLeaveEvent(event: CMouseEvent): void { this.#hovered = -1; event.accept(); this.update(); }
    /**
     * Handles keyboard category navigation and activation, canceling any pending press on Escape.
     * @param event Keyboard event containing the key and modifiers.
     */
    protected override keyPressEvent(event: CKeyEvent): void {
        if (event.key() === "Escape") { this.#cancel(); event.accept(); return; }
        if (event.ctrl() || event.alt() || event.meta()) { event.ignore(); return; }
        let index: number;
        switch (event.key()) {
            case "ArrowRight": case "ArrowDown": index = this.#nextEnabled(this.#current, 1); break;
            case "ArrowLeft": case "ArrowUp": index = this.#nextEnabled(this.#current < 0 ? 0 : this.#current, -1); break;
            case "Home": index = this.#nextEnabled(-1, 1); break;
            case "End": index = this.#nextEnabled(0, -1); break;
            case "Enter": case "Return": this.#activate(this.#current); event.accept(); return;
            case " ":
                if (this.#pressed < 0) { this.#pressed = this.#current; this.#keyboardPress = true; }
                event.accept(); this.update(); return;
            default: event.ignore(); return;
        }
        this.#cancel(); if (index >= 0) this.#activate(index); event.accept();
    }
    /**
     * Activates the tracked keyboard segment on Space release without Ctrl, Alt or Meta.
     * @param event Keyboard event containing the key and modifiers.
     */
    protected override keyReleaseEvent(event: CKeyEvent): void {
        if (event.key() !== " ") { event.ignore(); return; }
        const index = this.#keyboardPress ? this.#pressed : -1;
        this.#pressed = -1; this.#keyboardPress = false; event.accept(); this.update();
        if (index >= 0 && !event.ctrl() && !event.alt() && !event.meta()) this.#activate(index);
    }
    /**
     * Draws the category button through the supplied painter.
     * @param painter Painter for the current drawing operation.
     */
    protected override paintEvent(painter: CPainter): void {
        const option = new CStyleOptionCategoryButton(); option.initFrom(this);
        option.segments = this.#items.map((item, index) => ({ ...item, rect: this.segmentRect(index) ?? new CRect(0, 0, 0, 0) }));
        option.currentIndex = this.#current; option.hoveredIndex = this.#hovered; option.pressedIndex = this.#pressed;
        this.style().drawCategoryButton(painter, option);
    }
}
