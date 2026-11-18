import { CAlignment } from "../core/CAlignment.js";
import { CSize } from "../geometry/CSize.js";
import { CLayout } from "./CLayout.js";
import type { CLayoutItem } from "./CLayoutItem.js";

type FlowCell = { item: CLayoutItem; width: number; height: number };
type FlowRow = { cells: FlowCell[]; width: number; height: number };

/** Left-to-right flow layout with wrapping and width-dependent height.
 * Preferred widths are retained; an oversized item shrinks only to its policy minimum.
 * Empty stretch items are ignored. Rows never distribute spare width to their items.
 */
export class CFlowLayout extends CLayout {
    #horizontalSpacing: number | null = null;
    #verticalSpacing: number | null = null;
    #rowAlignment = CAlignment.Left;
    #updating = false;
    #lastSizing = "";

    /**
     * Reads the gap between items in a row.
     * @returns The horizontal override or base spacing, in logical pixels.
     */
    horizontalSpacing(): number { return this.#horizontalSpacing ?? this.spacing(); }
    /**
     * Reads the gap between wrapped rows.
     * @returns The vertical override or base spacing, in logical pixels.
     */
    verticalSpacing(): number { return this.#verticalSpacing ?? this.spacing(); }
    /**
     * Reads the alignment used for each row within the content width.
     * @returns `Left`, `HCenter` or `Right`.
     */
    rowAlignment(): CAlignment { return this.#rowAlignment; }
    /**
     * Sets the spacing on both axes and clears independent overrides.
     * @param spacing Finite gap in logical pixels. Fractional values are rounded down and negative values become zero.
     */
    override setSpacing(spacing: number): void {
        const next = this.#spacing(spacing);
        this.#horizontalSpacing = this.#verticalSpacing = null;
        if (this.spacing() === next) this.update(); else super.setSpacing(next);
    }
    /**
     * Overrides the gap between items in a row and updates the layout if the effective gap changes.
     * @param spacing Finite gap in logical pixels, rounded down and clamped to zero.
     */
    setHorizontalSpacing(spacing: number): void {
        const next = this.#spacing(spacing);
        if (next === this.horizontalSpacing()) return;
        this.#horizontalSpacing = next; this.update();
    }
    /**
     * Overrides the gap between wrapped rows and updates the layout if the effective gap changes.
     * @param spacing Finite gap in logical pixels, rounded down and clamped to zero.
     */
    setVerticalSpacing(spacing: number): void {
        const next = this.#spacing(spacing);
        if (next === this.verticalSpacing()) return;
        this.#verticalSpacing = next; this.update();
    }
    #spacing(value: number): number {
        if (!Number.isFinite(value)) throw new RangeError("Flow spacing must be finite.");
        return Math.max(0, Math.floor(value));
    }
    /**
     * Sets row placement and updates the geometry. Unsupported flags throw `RangeError`.
     * @param alignment Exactly `Left`, `HCenter` or `Right`.
     */
    setRowAlignment(alignment: CAlignment): void {
        if (![CAlignment.Left, CAlignment.HCenter, CAlignment.Right].includes(alignment))
            throw new RangeError("Row alignment must be Left, HCenter or Right.");
        if (alignment === this.#rowAlignment) return;
        this.#rowAlignment = alignment; this.update();
    }
    /**
     * Indicates that wrapping depends on the allocated width.
     * @returns Always `true`.
     */
    override hasHeightForWidth(): boolean { return true; }
    #visibleItems(): CLayoutItem[] {
        return this.items().filter(item => {
            const widget = item.widget();
            if (widget !== null) return widget.isVisible();
            const hint = item.sizeHint();
            return hint.width() > 0 || hint.height() > 0;
        });
    }
    /**
     * Measures eligible items on one unwrapped row.
     * @returns Preferred unwrapped size including margins and horizontal gaps.
     */
    override sizeHint(): CSize {
        const margins = this.contentsMargins(), items = this.#visibleItems();
        let width = 0, height = 0;
        for (const item of items) {
            const w = CLayout.layoutItemAxisBounds(item, true).preferred;
            width += w;
            height = Math.max(height, CLayout.layoutItemAxisBounds(item, false, w).preferred);
        }
        width += Math.max(0, items.length - 1) * this.horizontalSpacing();
        return new CSize(width + margins.left + margins.right, height + margins.top + margins.bottom);
    }
    #plan(width: number): { rows: FlowRow[]; height: number; available: number } {
        const m = this.contentsMargins();
        const available = Math.max(0, (Number.isFinite(width) ? width : 0) - m.left - m.right);
        const rows: FlowRow[] = [];
        let row: FlowRow = { cells: [], width: 0, height: 0 };
        for (const item of this.#visibleItems()) {
            const bounds = CLayout.layoutItemAxisBounds(item, true);
            const w = Math.max(bounds.minimum, Math.min(bounds.preferred, available));
            const h = CLayout.layoutItemAxisBounds(item, false, w).preferred;
            const gap = row.cells.length === 0 ? 0 : this.horizontalSpacing();
            if (row.cells.length > 0 && row.width + gap + w > available + 1e-9) {
                rows.push(row); row = { cells: [], width: 0, height: 0 };
            }
            if (row.cells.length > 0) row.width += this.horizontalSpacing();
            row.cells.push({ item, width: w, height: h });
            row.width += w; row.height = Math.max(row.height, h);
        }
        if (row.cells.length > 0) rows.push(row);
        return { rows, available, height: m.top + m.bottom + rows.reduce((sum, r) => sum + r.height, 0)
            + Math.max(0, rows.length - 1) * this.verticalSpacing() };
    }
    /**
     * Measures the rows needed to fit the items at the supplied width.
     * @param width Outer width in logical pixels. Nonfinite values are treated as zero.
     * @returns Wrapped height including margins and row gaps.
     */
    override heightForWidth(width: number): number { return this.#plan(width).height; }
    /**
     * Counts nonempty rows after wrapping the eligible items.
     * @param width Outer width in logical pixels. Defaults to the parent's contents width or the preferred unwrapped width.
     * @returns Number of nonempty rows.
     */
    rowCount(width = this.parentWidget()?.contentsRect().width() ?? this.sizeHint().width()): number {
        return this.#plan(width).rows.length;
    }
    /** Wraps eligible items into rows using the parent contents width, aligns the rows and applies their geometry. Notifies the parent when sizing requirements change. */
    override update(): void {
        const parent = this.parentWidget();
        if (parent === null || this.#updating) return;
        this.#updating = true;
        const contents = parent.contentsRect();
        try {
            const plan = this.#plan(contents.width()), m = this.contentsMargins();
            let y = contents.y() + m.top;
            for (const row of plan.rows) {
                const extra = Math.max(0, plan.available - row.width);
                let x = contents.x() + m.left + (this.#rowAlignment === CAlignment.Right ? extra
                    : this.#rowAlignment === CAlignment.HCenter ? extra / 2 : 0);
                for (const cell of row.cells) {
                    CLayout.setAlignedItemGeometry(cell.item, x, y, cell.width, row.height);
                    x += cell.width + this.horizontalSpacing();
                }
                y += row.height + this.verticalSpacing();
            }
            // Inform enclosing layouts only when size requirements change.
            const hint = this.sizeHint();
            const sizing = `${hint.width()}:${hint.height()}:${plan.height}`;
            if (sizing !== this.#lastSizing) { this.#lastSizing = sizing; parent.updateGeometry(); }
        } finally { this.#updating = false; }
        // An enclosing layout may have changed our width during notification.
        if (parent.contentsRect().width() !== contents.width()) this.update();
    }
}
