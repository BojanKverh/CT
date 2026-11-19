/** @module GUI/CToolButtonStyle */
/**
 * Defines how a tool button displays its icon and text.
 */
export enum CToolButtonStyle {
    /**
    * Paint a graphic and omit the caption.
    */
    IconOnly,
    /**
    * Paint a caption and omit the graphic.
    */
    TextOnly,
    /**
    * Lay out the caption horizontally beside the graphic.
    */
    TextBesideIcon,
    /**
    * Lay out the caption vertically below the graphic.
    */
    TextUnderIcon
}
