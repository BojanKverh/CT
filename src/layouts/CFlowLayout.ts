/** @module Layouts/CFlowLayout */
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
    * Returns the gap between items sharing a flow row.
    */
    horizontalSpacing(): number { return this.#horizontalSpacing ?? this.spacing(); }
    /**
    * Returns the gap between successive flow rows.
    */
    verticalSpacing(): number { return this.#verticalSpacing ?? this.spacing(); }
    /**
    * Returns the alignment applied to each packed flow row.
    */
    rowAlignment(): CAlignment { return this.#rowAlignment; }
    /** Sets both axes, replacing any independent spacing overrides. */
    override setSpacing(spacing: number): void {
        const next = this.#spacing(spacing);
        this.#horizontalSpacing = this.#verticalSpacing = null;
        if (this.spacing() === next) this.update(); else super.setSpacing(next);
    }
    /**
    * Changes item gaps along a flow row and refreshes layout.
    */
    setHorizontalSpacing(spacing: number): void {
        const next = this.#spacing(spacing);
        if (next === this.horizontalSpacing()) return;
        this.#horizontalSpacing = next; this.update();
    }
    /**
    * Changes gaps between flow rows and refreshes layout.
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
    * Changes alignment of packed items within each available row.
    */
    setRowAlignment(alignment: CAlignment): void {
        if (![CAlignment.Left, CAlignment.HCenter, CAlignment.Right].includes(alignment))
            throw new RangeError("Row alignment must be Left, HCenter or Right.");
        if (alignment === this.#rowAlignment) return;
        this.#rowAlignment = alignment; this.update();
    }
    override hasHeightForWidth(): boolean { return true; }
    #visibleItems(): CLayoutItem[] {
        return this.items().filter(item => {
            const widget = item.widget();
            if (widget !== null) return widget.isVisible();
            const hint = item.sizeHint();
            return hint.width() > 0 || hint.height() > 0;
        });
    }
    /** Preferred unwrapped size, including contents margins. */
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
    override heightForWidth(width: number): number { return this.#plan(width).height; }
    /** Number of nonempty rows at the given outer width. */
    rowCount(width = this.parentWidget()?.contentsRect().width() ?? this.sizeHint().width()): number {
        return this.#plan(width).rows.length;
    }
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
