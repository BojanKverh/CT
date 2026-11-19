/** @module GUI/CFocusPolicy */
/**
 * Defines how a widget can receive keyboard focus.
 */
export enum CFocusPolicy {
    /**
    * Exclude the widget from mouse-click and Tab focus acquisition.
    */
    NoFocus = 0,
    /**
    * Allow keyboard focus through Tab traversal.
    */
    TabFocus = 1 << 0,
    /**
    * Allow keyboard focus after an accepted mouse press.
    */
    ClickFocus = 1 << 1,
    /**
    * Combine Tab traversal and mouse-click focus acquisition.
    */
    StrongFocus = TabFocus | ClickFocus,
    /**
    * Combine Tab, click and accepted-wheel focus acquisition.
    */
    WheelFocus = StrongFocus | (1 << 2)
}