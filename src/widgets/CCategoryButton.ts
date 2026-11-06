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
    count(): number { return this.#items.length; }
    currentIndex(): number { return this.#current; }
    currentText(): string { return this.itemText(this.#current); }
    itemText(index: number): string { return this.#items[index]?.text ?? ""; }
    itemIcon(index: number): CIcon | null { return this.#items[index]?.icon ?? null; }
    isItemEnabled(index: number): boolean { return this.#items[index]?.enabled ?? false; }
    addItem(text: string, icon: CIcon | null = null): number { return this.insertItem(this.count(), text, icon); }
    addItems(texts: readonly string[]): void { for (const text of texts) this.addItem(text); }
    /** Returns -1 for an invalid insertion index. */
    insertItem(index: number, text: string, icon: CIcon | null = null): number {
        if (!Number.isInteger(index) || index < 0 || index > this.count()) return -1;
        this.#cancel(); this.#items.splice(index, 0, { text, icon, enabled: true });
        const next = this.#current >= index ? this.#current + 1 : this.#current < 0 ? index : this.#current;
        this.#select(next); this.updateGeometry(); return index;
    }
    removeItem(index: number): void {
        if (!this.#items[index]) return;
        this.#cancel(); this.#items.splice(index, 1);
        let next = this.#current;
        if (next > index) --next;
        else if (next === index) next = this.#nextEnabled(index - 1, 1);
        this.#select(next, this.#current === index); this.updateGeometry(); this.update();
    }
    clear(): void { this.#cancel(); this.#items = []; this.#select(-1); this.updateGeometry(); this.update(); }
    setItemText(index: number, text: string): void {
        const item = this.#items[index]; if (!item || item.text === text) return;
        this.#cancel(); item.text = text; this.updateGeometry(); this.update();
    }
    setItemIcon(index: number, icon: CIcon | null): void {
        const item = this.#items[index]; if (!item || item.icon === icon) return;
        this.#cancel(); item.icon = icon; this.updateGeometry(); this.update();
    }
    /** Disabling the current segment selects the next enabled one, or -1 if none remain. */
    setItemEnabled(index: number, enabled: boolean): void {
        const item = this.#items[index]; if (!item || item.enabled === enabled) return;
        this.#cancel(); item.enabled = enabled;
        if (!enabled && this.#current === index) this.#select(this.#nextEnabled(index, 1));
        else if (enabled && this.#current < 0) this.#select(index);
        this.update();
    }
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
    override sizeHint(): CSize {
        return new CSize(this.#widths().reduce((sum, width) => sum + width, 0),
            Math.max(32, Math.ceil(new CFontMetrics(this.font()).height()) + 12));
    }
    /** Segments share surplus width; when squeezed they shrink proportionally. */
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
    override setEnabled(enabled: boolean): void { if (!enabled) this.#cancel(); super.setEnabled(enabled); }
    override setFont(font: CFont, _propagate = false): void { super.setFont(font, false); this.#cancel(); this.updateGeometry(); }
    override setGeometry(x: number, y: number, w: number, h: number): void {
        this.#cancel(); super.setGeometry(x, y, w, h);
    }
    protected override visibilityChangeEvent(): void { this.#cancel(); }
    protected override focusOutEvent(event: CFocusEvent): void { this.#cancel(); super.focusOutEvent(event); }
    protected override mousePressEvent(event: CMouseEvent): void {
        if (event.button() !== CMouseButton.LeftButton) { event.ignore(); return; }
        this.#keyboardPress = false; this.#pressed = this.#hit(event.x(), event.y());
        if (this.#pressed >= 0) this.setFocus(); event.accept(); this.update();
    }
    protected override mouseReleaseEvent(event: CMouseEvent): void {
        if (event.button() !== CMouseButton.LeftButton) { event.ignore(); return; }
        const index = !this.#keyboardPress && this.#pressed === this.#hit(event.x(), event.y()) ? this.#pressed : -1;
        this.#pressed = -1; this.#keyboardPress = false; event.accept(); this.update(); if (index >= 0) this.#activate(index);
    }
    protected override mouseMoveEvent(event: CMouseEvent): void { this.#hovered = this.#hit(event.x(), event.y()); event.accept(); this.update(); }
    protected override mouseLeaveEvent(event: CMouseEvent): void { this.#hovered = -1; event.accept(); this.update(); }
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
    protected override keyReleaseEvent(event: CKeyEvent): void {
        if (event.key() !== " ") { event.ignore(); return; }
        const index = this.#keyboardPress ? this.#pressed : -1;
        this.#pressed = -1; this.#keyboardPress = false; event.accept(); this.update();
        if (index >= 0 && !event.ctrl() && !event.alt() && !event.meta()) this.#activate(index);
    }
    protected override paintEvent(painter: CPainter): void {
        const option = new CStyleOptionCategoryButton(); option.initFrom(this);
        option.segments = this.#items.map((item, index) => ({ ...item, rect: this.segmentRect(index) ?? new CRect(0, 0, 0, 0) }));
        option.currentIndex = this.#current; option.hoveredIndex = this.#hovered; option.pressedIndex = this.#pressed;
        this.style().drawCategoryButton(painter, option);
    }
}
