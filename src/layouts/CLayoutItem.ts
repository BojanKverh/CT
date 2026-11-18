import { CAlignment } from "../core/CAlignment.js";
import { CSize } from "../geometry/CSize.js";
import { CSizePolicy } from "../geometry/CSizePolicy.js";
import { CRect } from "../geometry/CRect.js";
import type { CWidget } from "../widgets/CWidget.js";

/**
 * Abstract base class for items managed by a layout.
 */
export abstract class CLayoutItem {
    #alignment: CAlignment | 0 = 0;

    /**
     * Reads how the item is aligned within its allocated cell.
     * @returns The alignment flags, or zero for size-policy-driven filling on both axes.
     */
    alignment(): CAlignment | 0 { return this.#alignment; }
    /**
     * Stores alignment flags. Call the owning layout's `update()` after changing an item directly.
     * @param alignment Alignment flags, or zero for normal filling.
     */
    setAlignment(alignment: CAlignment | 0): void { this.#alignment = alignment; }

	/**
	 * Looks up the widget represented by this item.
	 * @returns The represented widget, or `null` for a non-widget item.
	 */
	abstract widget(): CWidget | null;

    /**
     * Reads the preferred size of the represented widget.
     * @returns The widget's preferred size, or a new zero size when there is no widget.
     */
    sizeHint(): CSize { return this.widget()?.sizeHint() ?? new CSize(); }
    /**
     * Reads the represented widget's minimum size.
     * @returns The widget's minimum size, or a new zero size when there is no widget.
     */
    minimumSize(): CSize { return this.widget()?.minimumSize() ?? new CSize(); }
    /**
     * Reads the represented widget's maximum size.
     * @returns The widget's maximum size, or a new size with both dimensions set to `Number.MAX_SAFE_INTEGER` when there is no widget.
     */
    maximumSize(): CSize { return this.widget()?.maximumSize() ?? new CSize(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER); }
    /**
     * Reads the represented widget's sizing preferences.
     * @returns The widget's policy, or a new default policy when there is no widget.
     */
    sizePolicy(): CSizePolicy { return this.widget()?.sizePolicy() ?? new CSizePolicy(); }
    /**
     * Reads the represented widget's bounds.
     * @returns A rectangle in the widget's parent coordinate system, or a new empty rectangle when there is no widget.
     */
    geometry(): CRect { return this.widget()?.geometry() ?? new CRect(); }
    /**
     * Applies the allocated bounds to the represented widget if there is one.
     * @param x Horizontal position in parent coordinates.
     * @param y Vertical position in parent coordinates.
     * @param width Allocated width in logical pixels.
     * @param height Allocated height in logical pixels.
     */
    setGeometry(x: number, y: number, width: number, height: number): void {
        this.widget()?.setGeometry(x, y, width, height);
    }
}
