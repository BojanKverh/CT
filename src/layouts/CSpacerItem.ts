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

    /** Changes preferred size and policies. Call the containing layout's update() afterwards. */
    changeSize(width: number, height: number,
        horizontal = CSizePolicyType.Minimum, vertical = CSizePolicyType.Minimum): void {
        this.#width = Number.isFinite(width) ? Math.max(0, width) : 0;
        this.#height = Number.isFinite(height) ? Math.max(0, height) : 0;
        this.#policy = new CSizePolicy(horizontal, vertical);
    }

    override sizeHint(): CSize { return new CSize(this.#width, this.#height); }
    override sizePolicy(): CSizePolicy { return new CSizePolicy(this.#policy); }
    override minimumSize(): CSize {
        return new CSize(CSizePolicy.canShrink(this.#policy.horizontalPolicy()) ? 0 : this.#width,
            CSizePolicy.canShrink(this.#policy.verticalPolicy()) ? 0 : this.#height);
    }
    override maximumSize(): CSize {
        return new CSize(CSizePolicy.canGrow(this.#policy.horizontalPolicy()) ? Number.MAX_SAFE_INTEGER : this.#width,
            CSizePolicy.canGrow(this.#policy.verticalPolicy()) ? Number.MAX_SAFE_INTEGER : this.#height);
    }
    override geometry(): CRect {
        return new CRect(this.#geometry.x(), this.#geometry.y(), this.#geometry.width(), this.#geometry.height());
    }
    override setGeometry(x: number, y: number, width: number, height: number): void {
        this.#geometry = new CRect(x, y, width, height);
    }
}
