import { CRect } from "../geometry/CRect.js";
import { CStyleOption } from "./CStyleOption.js";

/** Geometry and rating state passed to the style renderer. */
export class CStyleOptionRatingWidget extends CStyleOption {
    value = 0;
    previewValue = 0;
    readOnly = false;
    starRects: CRect[] = [];
    constructor(other: CStyleOptionRatingWidget | null = null) {
        super(other);
        if (other === null) return;
        this.value = other.value; this.previewValue = other.previewValue; this.readOnly = other.readOnly;
        this.starRects = other.starRects.map(r => new CRect(r.x(), r.y(), r.width(), r.height()));
    }
}
