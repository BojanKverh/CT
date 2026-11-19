/** @module GUI/CStyleOptionCategoryButton */
import { CRect } from "../geometry/CRect.js";
import type { CIcon } from "./CIcon.js";
import { CStyleOption } from "./CStyleOption.js";

/**
 * Caption, optional graphic, input state and local bounds for a category-button segment.
 */
export interface CCategoryButtonSegment {
    /**
    * Caption painted within the segment.
    */
    text: string;
    /**
    * Optional graphic displayed with the segment caption.
    */
    icon: CIcon | null;
    /**
    * Whether the segment accepts activation.
    */
    enabled: boolean;
    /**
    * Segment bounds in the owning button local coordinates.
    */
    rect: CRect;
}

/** Snapshot of the segments and the composite control's interaction state. */
export class CStyleOptionCategoryButton extends CStyleOption {
    /** Segment snapshots used to paint captions, icons and availability. */
    segments: CCategoryButtonSegment[] = [];
    /** Zero-based active segment index. */
    currentIndex = -1;
    /** Segment index receiving hover feedback, or -1. */
    hoveredIndex = -1;
    /** Segment index receiving pressed feedback, or -1. */
    pressedIndex = -1;
    /**
    * Copies the paint options from other, or initializes the default appearance when other is null.
    */
    constructor(other: CStyleOptionCategoryButton | null = null) {
        super(other);
        if (other === null) return;
        this.segments = other.segments.map(item => ({ ...item,
            rect: new CRect(item.rect.x(), item.rect.y(), item.rect.width(), item.rect.height()) }));
        this.currentIndex = other.currentIndex; this.hoveredIndex = other.hoveredIndex; this.pressedIndex = other.pressedIndex;
    }
}
