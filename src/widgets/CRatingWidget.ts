import { CSignal } from "../core/CSignal.js";
import type { CFocusEvent } from "../events/CFocusEvent.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import { CMouseButton, type CMouseEvent } from "../events/CMouseEvent.js";
import { CPoint } from "../geometry/CPoint.js";
import { CRect } from "../geometry/CRect.js";
import { CSize } from "../geometry/CSize.js";
import { CSizePolicyType } from "../geometry/CSizePolicy.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CStyleOptionRatingWidget } from "../gui/CStyleOptionRatingWidget.js";
import type { CPainter } from "../painting/CPainter.js";
import { CWidget } from "./CWidget.js";

/** An integer star rating. Hover previews a value; releasing the mouse commits it. */
export class CRatingWidget extends CWidget {
    #maximum = 5;
    #value = 0;
    #preview = -1;
    #pressed = false;
    #readOnly = false;
    #starSize = 24;
    #spacing = 4;
    readonly valueChanged = new CSignal<[number]>();

    constructor(parent: CWidget | null = null) {
        super(parent);
        this.setFocusPolicy(CFocusPolicy.StrongFocus);
        this.setSizePolicy(CSizePolicyType.Preferred, CSizePolicyType.Fixed);
    }
    value(): number { return this.#value; }
    maximum(): number { return this.#maximum; }
    previewValue(): number { return this.#preview < 0 ? this.#value : this.#preview; }
    isReadOnly(): boolean { return this.#readOnly; }
    starSize(): number { return this.#starSize; }
    spacing(): number { return this.#spacing; }
    /** Values are rounded down and clamped to 0..maximum. Non-finite inputs throw. */
    setValue(value: number): void {
        const next = Math.max(0, Math.min(this.#maximum, this.#integer(value)));
        if (next === this.#value) return;
        this.#value = next; this.update(); this.valueChanged.emit(next);
    }
    /** Number of stars, normalized to an integer in 1..100. */
    setMaximum(maximum: number): void {
        const next = Math.max(1, Math.min(100, this.#integer(maximum)));
        if (next === this.#maximum) return;
        this.#maximum = next; this.#cancel();
        this.setValue(this.#value); this.updateGeometry(); this.update();
    }
    setReadOnly(readOnly: boolean): void {
        if (readOnly === this.#readOnly) return;
        this.#readOnly = readOnly; this.#cancel();
        if (readOnly && this.hasFocus()) this.clearFocus();
        this.setFocusPolicy(readOnly ? CFocusPolicy.NoFocus : CFocusPolicy.StrongFocus);
        this.update();
    }
    /** Preferred star size in logical pixels, normalized to 8..128. */
    setStarSize(size: number): void {
        const next = Math.max(8, Math.min(128, this.#integer(size)));
        if (next === this.#starSize) return;
        this.#starSize = next; this.#cancel(); this.updateGeometry(); this.update();
    }
    /** Gap in logical pixels, normalized to 0..32. */
    setSpacing(spacing: number): void {
        const next = Math.max(0, Math.min(32, this.#integer(spacing)));
        if (next === this.#spacing) return;
        this.#spacing = next; this.#cancel(); this.updateGeometry(); this.update();
    }
    #integer(value: number): number {
        if (!Number.isFinite(value)) throw new RangeError("Rating properties must be finite numbers.");
        return Math.floor(value);
    }
    override sizeHint(): CSize {
        return new CSize(this.#maximum * this.#starSize + (this.#maximum - 1) * this.#spacing + 8,
            this.#starSize + 8);
    }
    /** Returns the star's actual, possibly scaled rectangle, or null for an invalid index. */
    starRect(index: number): CRect | null {
        if (!Number.isInteger(index) || index < 0 || index >= this.#maximum) return null;
        const natural = this.#maximum * this.#starSize + (this.#maximum - 1) * this.#spacing;
        const scale = Math.max(0, Math.min(1, (this.width() - 8) / natural, (this.height() - 8) / this.#starSize));
        const size = this.#starSize * scale, gap = this.#spacing * scale;
        return new CRect(4 + index * (size + gap), (this.height() - size) / 2, size, size);
    }
    override setGeometry(x: number, y: number, width: number, height: number): void {
        if (width !== this.width() || height !== this.height()) this.#cancel();
        super.setGeometry(x, y, width, height);
    }
    override setEnabled(enabled: boolean): void {
        if (!enabled) this.#cancel();
        super.setEnabled(enabled);
    }
    override hide(): void { this.#cancel(); super.hide(); }
    #cancel(): void { this.#preview = -1; this.#pressed = false; this.update(); }
    #hit(event: CMouseEvent): number {
        const point = new CPoint(event.x(), event.y());
        for (let i = 0; i < this.#maximum; ++i) {
            const rect = this.starRect(i)!;
            if (rect.width() > 0 && rect.contains(point)) return i + 1;
        }
        return -1;
    }
    protected override mouseMoveEvent(event: CMouseEvent): void {
        if (this.#readOnly) { event.ignore(); return; }
        this.#preview = this.#hit(event); event.accept(); this.update();
    }
    protected override mouseEnterEvent(event: CMouseEvent): void { this.mouseMoveEvent(event); }
    protected override mouseLeaveEvent(event: CMouseEvent): void {
        this.#preview = -1; event.accept(); this.update();
    }
    protected override mousePressEvent(event: CMouseEvent): void {
        if (this.#readOnly || event.button() !== CMouseButton.LeftButton) { event.ignore(); return; }
        const hit = this.#hit(event);
        this.#pressed = hit >= 0; this.#preview = hit;
        event.accept(); this.update();
    }
    protected override mouseReleaseEvent(event: CMouseEvent): void {
        if (this.#readOnly || event.button() !== CMouseButton.LeftButton) { event.ignore(); return; }
        const pressed = this.#pressed; this.#pressed = false;
        const hit = this.#hit(event); this.#preview = hit;
        event.accept(); this.update();
        if (pressed && hit >= 0) this.setValue(hit);
    }
    protected override focusOutEvent(event: CFocusEvent): void { this.#cancel(); super.focusOutEvent(event); }
    protected override keyPressEvent(event: CKeyEvent): void {
        if (this.#readOnly || event.ctrl() || event.meta() || event.alt()) { event.ignore(); return; }
        let next: number;
        switch (event.key()) {
            case "ArrowRight": case "ArrowUp": next = this.#value + 1; break;
            case "ArrowLeft": case "ArrowDown": next = this.#value - 1; break;
            case "Home": case "Delete": case "Backspace": next = 0; break;
            case "End": next = this.#maximum; break;
            case "Escape": this.#cancel(); event.accept(); return;
            default: event.ignore(); return;
        }
        this.#cancel(); event.accept(); this.setValue(next);
    }
    protected override paintEvent(painter: CPainter): void {
        const option = new CStyleOptionRatingWidget(); option.initFrom(this);
        option.value = this.#value; option.previewValue = this.previewValue();
        option.readOnly = this.#readOnly;
        option.starRects = Array.from({ length: this.#maximum }, (_, index) => this.starRect(index)!);
        this.style().drawRatingWidget(painter, option);
    }
}
