/** @module GUI/CFrameStyle */
/**
 * Defines the geometric shape of a frame.
 */
export enum CFrameShape {
    /**
    * Paint no enclosing border around the content.
    */
    NoFrame,
    /**
    * Paint a rectangular outline on all four sides.
    */
    Box,
    /**
    * Paint a panel edge around the content.
    */
    Panel,
    /**
    * Paint a horizontal dividing rule.
    */
    HLine,
    /**
    * Paint a vertical dividing rule.
    */
    VLine
}

/**
 * Defines the visual shadow style of a frame.
 */
export enum CFrameShadow {
    /**
    * Paint a flat edge without relief shading.
    */
    Plain,
    /**
    * Use edge shading that makes the frame appear elevated.
    */
    Raised,
    /**
    * The control is pressed or sunken.
    */
    Sunken
}
