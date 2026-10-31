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

    /** Zero preserves normal size-policy-driven filling on both axes. */
    alignment(): CAlignment | 0 { return this.#alignment; }
    /** Call the containing layout's update() after changing an item directly. */
    setAlignment(alignment: CAlignment | 0): void { this.#alignment = alignment; }

	/**
	 * Returns the widget represented by this layout item, or `null` if the
	 * item does not represent a widget.
	 */
	abstract widget(): CWidget | null;

    /** Default geometry and sizing delegate to the represented widget. */
    sizeHint(): CSize { return this.widget()?.sizeHint() ?? new CSize(); }
    minimumSize(): CSize { return this.widget()?.minimumSize() ?? new CSize(); }
    maximumSize(): CSize { return this.widget()?.maximumSize() ?? new CSize(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER); }
    sizePolicy(): CSizePolicy { return this.widget()?.sizePolicy() ?? new CSizePolicy(); }
    geometry(): CRect { return this.widget()?.geometry() ?? new CRect(); }
    setGeometry(x: number, y: number, width: number, height: number): void {
        this.widget()?.setGeometry(x, y, width, height);
    }
}
