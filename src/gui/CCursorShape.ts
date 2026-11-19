/** @module GUI/CCursorShape */
/**
 * Defines cursor shapes supported by Canvas Toolkit.
 */
export enum CCursorShape {
    /**
    * Standard arrow cursor.
    */
    Arrow,
    /**
    * Two-sided horizontal pointer for dragging a vertical splitter handle.
    */
    SplitH,
    /**
    * Two-sided vertical pointer for dragging a horizontal splitter handle.
    */
    SplitV,
    /**
    * Pointing-hand cursor, typically used for links.
    */
    PointingHand,
    /**
    * I-beam cursor used for text editing.
    */
    IBeam,
    /**
    * Crosshair pointer for precise positioning on a drawing surface.
    */
    Cross,
    /**
    * Diagonal resize pointer running from top left to bottom right.
    */
    SizeFDiag,
    /**
    * Open-hand pointer indicating content that can be dragged.
    */
    Grab,
    /**
    * Closed-hand pointer indicating an active content drag.
    */
    Grabbing,
    /**
    * Not-allowed pointer indicating that the requested interaction is unavailable.
    */
    Disabled
}