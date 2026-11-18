import { CBoxLayoutItem } from "./CBoxLayoutItem.js";
import { CSize } from "../geometry/CSize.js";
import { CRect } from "../geometry/CRect.js";
import { CSizePolicy, CSizePolicyType } from "../geometry/CSizePolicy.js";

/** Empty layout space; no widget, painting, focus, or application is required. */
export class CSpacerItem extends CBoxLayoutItem {
    #width = 0;
    #height = 0;
    #policy = new CSizePolicy();
    #geometry = new CRect();

    constructor(width: number, height: number,
        horizontal = CSizePolicyType.Minimum, vertical = CSizePolicyType.Minimum) {
        super(null);
        this.changeSize(width, height, horizontal, vertical);
    }

    /**
     * Changes the spacer's preferred dimensions and axis policies. Call the owning layout's `update()` afterwards.
     * @param width Preferred width in logical pixels. Negative or nonfinite values become zero.
     * @param height Preferred height in logical pixels. Negative or nonfinite values become zero.
     * @param horizontal Horizontal size policy. Defaults to `Minimum`.
     * @param vertical Vertical size policy. Defaults to `Minimum`.
     */
    changeSize(width: number, height: number,
        horizontal = CSizePolicyType.Minimum, vertical = CSizePolicyType.Minimum): void {
        this.#width = Number.isFinite(width) ? Math.max(0, width) : 0;
        this.#height = Number.isFinite(height) ? Math.max(0, height) : 0;
        this.#policy = new CSizePolicy(horizontal, vertical);
    }

    /**
     * Reads the configured spacer dimensions.
     * @returns A new size containing the preferred width and height.
     */
    override sizeHint(): CSize { return new CSize(this.#width, this.#height); }
    /**
     * Reads the spacer's horizontal and vertical sizing preferences.
     * @returns An independent copy of the current policy.
     */
    override sizePolicy(): CSizePolicy { return new CSizePolicy(this.#policy); }
    /**
     * Computes the lower size bound for each axis.
     * @returns A new size with zero for axes that can shrink, and the preferred dimension otherwise.
     */
    override minimumSize(): CSize {
        return new CSize(CSizePolicy.canShrink(this.#policy.horizontalPolicy()) ? 0 : this.#width,
            CSizePolicy.canShrink(this.#policy.verticalPolicy()) ? 0 : this.#height);
    }
    /**
     * Computes the upper size bound for each axis.
     * @returns A new size with `Number.MAX_SAFE_INTEGER` for axes that can grow, and the preferred dimension otherwise.
     */
    override maximumSize(): CSize {
        return new CSize(CSizePolicy.canGrow(this.#policy.horizontalPolicy()) ? Number.MAX_SAFE_INTEGER : this.#width,
            CSizePolicy.canGrow(this.#policy.verticalPolicy()) ? Number.MAX_SAFE_INTEGER : this.#height);
    }
    /**
     * Reads the rectangle most recently assigned by the layout.
     * @returns An independent copy of the spacer bounds.
     */
    override geometry(): CRect {
        return new CRect(this.#geometry.x(), this.#geometry.y(), this.#geometry.width(), this.#geometry.height());
    }
    /**
     * Records the spacer's allocated rectangle without updating a widget.
     * @param x Horizontal position in layout coordinates.
     * @param y Vertical position in layout coordinates.
     * @param width Allocated width in logical pixels.
     * @param height Allocated height in logical pixels.
     */
    override setGeometry(x: number, y: number, width: number, height: number): void {
        this.#geometry = new CRect(x, y, width, height);
    }
}
