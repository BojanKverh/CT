import { CRect } from "../geometry/CRect.js";
import type { CIcon } from "./CIcon.js";
import { CStyleOption } from "./CStyleOption.js";

export interface CCategoryButtonSegment {
    text: string;
    icon: CIcon | null;
    enabled: boolean;
    rect: CRect;
}

/** Snapshot of the segments and the composite control's interaction state. */
export class CStyleOptionCategoryButton extends CStyleOption {
    segments: CCategoryButtonSegment[] = [];
    currentIndex = -1;
    hoveredIndex = -1;
    pressedIndex = -1;
    constructor(other: CStyleOptionCategoryButton | null = null) {
        super(other);
        if (other === null) return;
        this.segments = other.segments.map(item => ({ ...item,
            rect: new CRect(item.rect.x(), item.rect.y(), item.rect.width(), item.rect.height()) }));
        this.currentIndex = other.currentIndex; this.hoveredIndex = other.hoveredIndex; this.pressedIndex = other.pressedIndex;
    }
}
