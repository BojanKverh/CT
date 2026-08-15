export enum CAlignment {
	Left = 0x0001,
	Right = 0x0002,
	HCenter = 0x0004,

	Top = 0x0010,
	Bottom = 0x0020,
	VCenter = 0x0040,

	Center = HCenter | VCenter
}