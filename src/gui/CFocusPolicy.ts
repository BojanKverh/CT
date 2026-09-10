/**
 * Defines how a widget can receive keyboard focus.
 */
export enum CFocusPolicy {
		/**
	 * No focus.
	 */
NoFocus = 0,
		/**
	 * Tab focus.
	 */
TabFocus = 1 << 0,
		/**
	 * Click focus.
	 */
ClickFocus = 1 << 1,
		/**
	 * Strong focus.
	 */
StrongFocus = TabFocus | ClickFocus,
		/**
	 * Wheel focus.
	 */
WheelFocus = StrongFocus | (1 << 2)
}