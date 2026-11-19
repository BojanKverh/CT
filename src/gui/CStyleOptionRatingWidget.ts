/** @module GUI/CStyleOptionRatingWidget */
import { CRect } from "../geometry/CRect.js";
import { CStyleOption } from "./CStyleOption.js";

/** Geometry and rating state passed to the style renderer. */
export class CStyleOptionRatingWidget extends CStyleOption {
    /**
    * Numeric position within the configured range used for painting.
    */
    value = 0;
    /** Transient rating value shown during pointer preview. */
    previewValue = 0;
    /** Whether interaction may change the displayed value. */
    readOnly = false;
    /** Local rectangles occupied by the individual rating stars. */
    starRects: CRect[] = [];
    /**
    * Copies the paint options from other, or initializes the default appearance when other is null.
    */
    constructor(other: CStyleOptionRatingWidget | null = null) {
        super(other);
        if (other === null) return;
        this.value = other.value; this.previewValue = other.previewValue; this.readOnly = other.readOnly;
        this.starRects = other.starRects.map(r => new CRect(r.x(), r.y(), r.width(), r.height()));
    }
}
