/** @module GUI/CStyleOptionNavigationPath */
import { CRect } from "../geometry/CRect.js";
import { CStyleOption } from "./CStyleOption.js";

/** One visible path segment. Index -1 represents the overflow menu. */
export interface CNavigationPathSegment {
    /**
    * Position of this breadcrumb within the path item sequence.
    */
    index: number;
    /**
    * Caption painted for this breadcrumb.
    */
    text: string;
    /**
    * Breadcrumb bounds in navigation-widget local coordinates.
    */
    rect: CRect;
}

/** Geometry and interaction state for a navigation path. */
export class CStyleOptionNavigationPath extends CStyleOption {
    /** Segment snapshots used to paint captions, icons and availability. */
    segments: CNavigationPathSegment[] = [];
    /** Zero-based active segment index. */
    currentIndex = -1;
    /** Segment index receiving hover feedback, or -1. */
    hoveredIndex = -2;
    /** Segment index receiving pressed feedback, or -1. */
    pressedIndex = -2;
    /** Segment index receiving keyboard-focus feedback. */
    focusedIndex = -2;

    /**
    * Copies the paint options from other, or initializes the default appearance when other is null.
    */
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
