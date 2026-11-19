/** @module Core/CAlignment */
/**
 * Specifies horizontal and vertical alignment flags.
 *
 * Values may be combined as bit flags where appropriate.
 */
export enum CAlignment {
    /** Aligns content to the left edge. */
    Left = 0x0001,
    /** Aligns content to the right edge. */
    Right = 0x0002,
    /** Centers content horizontally. */
    HCenter = 0x0004,
    /** Aligns content to the top edge. */
    Top = 0x0010,
    /** Aligns content to the bottom edge. */
    Bottom = 0x0020,
    /** Centers content vertically. */
    VCenter = 0x0040,
    /** Centers content horizontally and vertically. */
    Center = HCenter | VCenter
}
