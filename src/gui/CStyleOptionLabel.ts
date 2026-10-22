import { CStyleOption } from "./CStyleOption.js";
import { CAlignment } from "../core/CAlignment.js";
import type { CPixmap } from "../painting/CPixmap.js";
import type { CLabel } from "../widgets/CLabel.js";

/**
 * Contains style information used to render a label.
 */
export class CStyleOptionLabel extends CStyleOption {
		/**
	 * Returns or updates the text value.
	 */
text = "";
    /** UTF-16 index of the mnemonic character, or -1. */
    mnemonicIndex = -1;
		/**
	 * Returns or updates the alignment value.
	 */
alignment = CAlignment.Left | CAlignment.VCenter;
		/**
	 * Returns the best matching pixmap for the requested size, mode, and state.
	 */
pixmap: CPixmap | null = null;

		/**
	 * Creates a new CStyleOptionLabel instance.
	 *
	 * @param other Other.
	 */
constructor(other: CStyleOptionLabel | null = null) {
		super(other);

		if (other) {
			this.text = other.text;
            this.mnemonicIndex = other.mnemonicIndex;
			this.alignment = other.alignment;
			this.pixmap = other.pixmap;
		}
	}

		/**
	 * Initializes this style option from the specified label.
	 *
	 * @param label Label.
	 */
initFromLabel(label: CLabel): void {
		this.initFrom(label);

		this.text = label.displayText();
        this.mnemonicIndex = label.mnemonicIndex();
		this.alignment = label.alignment();
		this.pixmap = label.pixmap();
	}
}