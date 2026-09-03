export enum CFocusPolicy {
	NoFocus = 0,
	TabFocus = 1 << 0,
	ClickFocus = 1 << 1,
	StrongFocus = TabFocus | ClickFocus,
	WheelFocus = StrongFocus | (1 << 2)
}