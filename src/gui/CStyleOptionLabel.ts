/** @module GUI/CStyleOptionLabel */
import { CStyleOption } from "./CStyleOption.js";
import { CAlignment } from "../core/CAlignment.js";
import type { CPixmap } from "../painting/CPixmap.js";
import type { CLabel } from "../widgets/CLabel.js";

/**
 * Contains style information used to render a label.
 */
export class CStyleOptionLabel extends CStyleOption {
    /**
    * Caption painted by the style; an empty string draws no caption.
    */
    text = "";
    /** UTF-16 index of the mnemonic character, or -1. */
    mnemonicIndex = -1;
    /**
    * Combined horizontal and vertical CAlignment flags positioning the label content.
    */
    alignment = CAlignment.Left | CAlignment.VCenter;
    /**
    * Optional image painted by the label; null leaves the label without an image.
    */
    pixmap: CPixmap | null = null;

    /**
    * Copies the paint options from other, or initializes default appearance when other is null.
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