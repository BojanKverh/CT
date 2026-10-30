import { CPoint } from "./CPoint.js";

/**
 * Represents an axis-aligned rectangle defined by its position and size.
 *
 * The right and bottom edges are exclusive for point containment tests.
 */
export class CRect {
    #m_x: number;
    #m_y: number;
    #m_width: number;
    #m_height: number;

    /**
     * Creates a rectangle with the specified position and dimensions.
     *
     * @param x Horizontal coordinate of the left edge.
     * @param y Vertical coordinate of the top edge.
     * @param width Rectangle width.
     * @param height Rectangle height.
     */
    constructor(x = 0, y = 0, width = 0, height = 0) {
        this.#m_x = x;
        this.#m_y = y;
        this.#m_width = width;
        this.#m_height = height;
    }

    /** @returns The horizontal coordinate of the left edge. */
    x(): number {
        return this.#m_x;
    }

    /** @returns The vertical coordinate of the top edge. */
    y(): number {
        return this.#m_y;
    }

    /** @returns The rectangle width. */
    width(): number {
        return this.#m_width;
    }

    /** @returns The rectangle height. */
    height(): number {
        return this.#m_height;
    }

    /** @returns The horizontal coordinate immediately after the right edge. */
    right(): number {
        return this.#m_x + this.#m_width;
    }

    /** @returns The vertical coordinate immediately after the bottom edge. */
    bottom(): number {
        return this.#m_y + this.#m_height;
    }

    /**
     * Tests whether this rectangle has the same position and size as another rectangle.
     *
     * @param rect Rectangle to compare with.
     * @returns `true` if both rectangles have identical geometry; otherwise `false`.
     */
    equals(rect: CRect): boolean {
        return (this.x() === rect.x()) && (this.y() === rect.y()) &&
            (this.width() === rect.width()) && (this.height() === rect.height());
    }

    /**
     * Sets the rectangle position and dimensions.
     *
     * @param x Horizontal coordinate of the left edge.
     * @param y Vertical coordinate of the top edge.
     * @param width New rectangle width.
     * @param height New rectangle height.
     */
    setGeometry(x: number, y: number, width: number, height: number): void {
        this.#m_x = x;
        this.#m_y = y;
        this.#m_width = width;
        this.#m_height = height;
    }

    /**
     * Tests whether a point lies inside the rectangle.
     *
     * The left and top edges are included, while the right and bottom edges are excluded.
     *
     * @param point Point to test.
     * @returns `true` if the point is inside the rectangle; otherwise `false`.
     */
    contains(point: CPoint): boolean {
        return point.x() >= this.x()
            && point.x() < this.right()
            && point.y() >= this.y()
            && point.y() < this.bottom();
    }

    center(): CPoint {
        return new CPoint(
            this.#m_x + this.#m_width / 2,
            this.#m_y + this.#m_height / 2
        );
    }

    /**
     * Tests whether this rectangle overlaps another rectangle.
     *
     * Rectangles that only touch at an edge or corner are not considered intersecting.
     *
     * @param other Rectangle to test against.
     * @returns `true` if the rectangles overlap; otherwise `false`.
     */
    intersects(other: CRect): boolean {
        return this.#m_x < other.right()
            && this.right() > other.x()
            && this.#m_y < other.bottom()
            && this.bottom() > other.y();
    }

    /**
     * Returns the overlapping area of this rectangle and another rectangle.
     *
     * @param other Rectangle to intersect with.
     * @returns The intersection rectangle, or an empty rectangle if there is no overlap.
     */
    intersection(other: CRect): CRect {
        const left = Math.max(this.#m_x, other.x());
        const top = Math.max(this.#m_y, other.y());
        const right = Math.min(this.right(), other.right());
        const bottom = Math.min(this.bottom(), other.bottom());

        if (right <= left || bottom <= top)
            return new CRect();

        return new CRect(
            left,
            top,
            right - left,
            bottom - top
        );
    }
}
