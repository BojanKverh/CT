export enum CDropAction {
	IgnoreAction = 0,
	CopyAction = 1 << 0,
	MoveAction = 1 << 1,
	LinkAction = 1 << 2
}