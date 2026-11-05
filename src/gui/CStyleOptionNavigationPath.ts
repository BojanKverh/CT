import { CRect } from "../geometry/CRect.js";
import { CStyleOption } from "./CStyleOption.js";

/** One visible path segment. Index -1 represents the overflow menu. */
export interface CNavigationPathSegment {
    index: number;
    text: string;
    rect: CRect;
}

/** Geometry and interaction state for a navigation path. */
export class CStyleOptionNavigationPath extends CStyleOption {
    segments: CNavigationPathSegment[] = [];
    currentIndex = -1;
    hoveredIndex = -2;
    pressedIndex = -2;
    focusedIndex = -2;

    constructor(other: CStyleOptionNavigationPath | null = null) {
        super(other);
        if (other === null) return;
        this.segments = other.segments.map(segment => ({ ...segment,
            rect: new CRect(segment.rect.x(), segment.rect.y(), segment.rect.width(), segment.rect.height()) }));
        this.currentIndex = other.currentIndex;
        this.hoveredIndex = other.hoveredIndex;
        this.pressedIndex = other.pressedIndex;
        this.focusedIndex = other.focusedIndex;
    }
}
