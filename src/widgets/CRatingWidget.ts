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
    /**
     * Reads the committed rating.
     * @returns Integer rating from zero to the maximum.
     */
    value(): number { return this.#value; }
    /**
     * Reads the configured star count.
     * @returns Maximum rating and number of visible star slots.
     */
    maximum(): number { return this.#maximum; }
    /**
     * Reads the rating currently displayed.
     * @returns Hovered star rating while previewing, otherwise the committed value.
     */
    previewValue(): number { return this.#preview < 0 ? this.#value : this.#preview; }
    /**
     * Checks whether the user may change the rating by mouse or keyboard.
     * @returns `true` if user interaction cannot change the rating.
     */
    isReadOnly(): boolean { return this.#readOnly; }
    /**
     * Reads the requested size before fitting stars into the widget.
     * @returns Preferred star size in logical pixels.
     */
    starSize(): number { return this.#starSize; }
    /**
     * Reads the requested gap before scaling the row to fit.
     * @returns Preferred gap between stars in logical pixels.
     */
    spacing(): number { return this.#spacing; }
    /**
     * Updates the committed rating and emits `valueChanged` when it changes.
     * @param value Finite rating, rounded down and clamped between zero and the maximum.
     */
    setValue(value: number): void {
        const next = Math.max(0, Math.min(this.#maximum, this.#integer(value)));
        if (next === this.#value) return;
        this.#value = next; this.update(); this.valueChanged.emit(next);
    }
    /**
     * Changes the star count, cancels preview and clamps the committed rating to the new range.
     * @param maximum Finite star count, rounded down and clamped to 1 through 100.
     */
    setMaximum(maximum: number): void {
        const next = Math.max(1, Math.min(100, this.#integer(maximum)));
        if (next === this.#maximum) return;
        this.#maximum = next; this.#cancel();
        this.setValue(this.#value); this.updateGeometry(); this.update();
    }
    /**
     * Enables or disables user editing, cancels a preview and updates keyboard focus eligibility.
     * @param readOnly `true` to suppress user edits while still permitting programmatic updates.
     */
    setReadOnly(readOnly: boolean): void {
        if (readOnly === this.#readOnly) return;
        this.#readOnly = readOnly; this.#cancel();
        if (readOnly && this.hasFocus()) this.clearFocus();
        this.setFocusPolicy(readOnly ? CFocusPolicy.NoFocus : CFocusPolicy.StrongFocus);
        this.update();
    }
    /**
     * Changes the preferred star size and refreshes layout geometry.
     * @param size Finite size in logical pixels, rounded down and clamped to 8 through 128.
     */
    setStarSize(size: number): void {
        const next = Math.max(8, Math.min(128, this.#integer(size)));
        if (next === this.#starSize) return;
        this.#starSize = next; this.#cancel(); this.updateGeometry(); this.update();
    }
    /**
     * Changes the preferred gap between stars and refreshes layout geometry.
     * @param spacing Finite gap in logical pixels, rounded down and clamped to 0 through 32.
     */
    setSpacing(spacing: number): void {
        const next = Math.max(0, Math.min(32, this.#integer(spacing)));
        if (next === this.#spacing) return;
        this.#spacing = next; this.#cancel(); this.updateGeometry(); this.update();
    }
    #integer(value: number): number {
        if (!Number.isFinite(value)) throw new RangeError("Rating properties must be finite numbers.");
        return Math.floor(value);
    }
    /**
     * Measures the row at its unscaled star size and spacing, including padding.
     * @returns Preferred widget dimensions in logical pixels.
     */
    override sizeHint(): CSize {
        return new CSize(this.#maximum * this.#starSize + (this.#maximum - 1) * this.#spacing + 8,
            this.#starSize + 8);
    }
    /**
     * Computes the position of a star after scaling the row to fit the widget.
     * @param index Zero-based integer star index.
     * @returns A new rectangle in widget coordinates, or `null` for an invalid index.
     */
    starRect(index: number): CRect | null {
        if (!Number.isInteger(index) || index < 0 || index >= this.#maximum) return null;
        const natural = this.#maximum * this.#starSize + (this.#maximum - 1) * this.#spacing;
        const scale = Math.max(0, Math.min(1, (this.width() - 8) / natural, (this.height() - 8) / this.#starSize));
        const size = this.#starSize * scale, gap = this.#spacing * scale;
        return new CRect(4 + index * (size + gap), (this.height() - size) / 2, size, size);
    }
    /**
     * Moves or resizes the widget and cancels the current preview when the dimensions change.
     * @param x Horizontal position in parent coordinates.
     * @param y Vertical position in parent coordinates.
     * @param width New width in logical pixels.
     * @param height New height in logical pixels.
     */
    override setGeometry(x: number, y: number, width: number, height: number): void {
        if (width !== this.width() || height !== this.height()) this.#cancel();
        super.setGeometry(x, y, width, height);
    }
    /**
     * Changes whether the widget handles input. Disabling cancels preview and pending presses.
     * @param enabled Whether to enable input.
     */
    override setEnabled(enabled: boolean): void {
        if (!enabled) this.#cancel();
        super.setEnabled(enabled);
    }
    /** Cancels preview and pending presses before hiding the widget. */
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
    /**
     * Previews the star under the pointer or clears the preview when no star is hit. Read-only widgets ignore movement.
     * @param event Mouse movement event with local pointer coordinates.
     */
    protected override mouseMoveEvent(event: CMouseEvent): void {
        if (this.#readOnly) { event.ignore(); return; }
        this.#preview = this.#hit(event); event.accept(); this.update();
    }
    /**
     * Updates the preview using the entry position, as for mouse movement.
     * @param event Pointer entry event with local coordinates.
     */
    protected override mouseEnterEvent(event: CMouseEvent): void { this.mouseMoveEvent(event); }
    /**
     * Clears the hover preview and requests repainting.
     * @param event Pointer exit event.
     */
    protected override mouseLeaveEvent(event: CMouseEvent): void {
        this.#preview = -1; event.accept(); this.update();
    }
    /**
     * Records whether a left-button press began on a star and updates the preview. Read-only or other-button presses are ignored.
     * @param event Mouse event with the button and pointer coordinates local to the widget.
     */
    protected override mousePressEvent(event: CMouseEvent): void {
        if (this.#readOnly || event.button() !== CMouseButton.LeftButton) { event.ignore(); return; }
        const hit = this.#hit(event);
        this.#pressed = hit >= 0; this.#preview = hit;
        event.accept(); this.update();
    }
    /**
     * Commits the star under the release when a left-button press began on a star. Read-only or other-button releases are ignored.
     * @param event Mouse event with the button and pointer coordinates local to the widget.
     */
    protected override mouseReleaseEvent(event: CMouseEvent): void {
        if (this.#readOnly || event.button() !== CMouseButton.LeftButton) { event.ignore(); return; }
        const pressed = this.#pressed; this.#pressed = false;
        const hit = this.#hit(event); this.#preview = hit;
        event.accept(); this.update();
        if (pressed && hit >= 0) this.setValue(hit);
    }
    /**
     * Cancels preview and pending presses before forwarding focus exit.
     * @param event Focus exit event.
     */
    protected override focusOutEvent(event: CFocusEvent): void { this.#cancel(); super.focusOutEvent(event); }
    /**
     * Adjusts the rating on arrow keys, clears it on Home, Delete or Backspace, and sets it to the maximum on End. Escape cancels the preview. Read-only mode and Ctrl, Meta or Alt combinations are ignored.
     * @param event Keyboard event containing the key and modifier state.
     */
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
    /**
     * Draws the star row through the active style using each scaled star rectangle and the committed and preview ratings.
     * @param painter Painter in the rating widget's local coordinates.
     */
    protected override paintEvent(painter: CPainter): void {
        const option = new CStyleOptionRatingWidget(); option.initFrom(this);
        option.value = this.#value; option.previewValue = this.previewValue();
        option.readOnly = this.#readOnly;
        option.starRects = Array.from({ length: this.#maximum }, (_, index) => this.starRect(index)!);
        this.style().drawRatingWidget(painter, option);
    }
}
