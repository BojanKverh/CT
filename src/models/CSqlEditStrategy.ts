/** Determines when modified model data is submitted to its SQL adapter. */
export enum CSqlEditStrategy {
	/** Submit a field immediately after setItemData() accepts it. */
	OnFieldChange,

	/** Submit a dirty row when another row starts being edited. */
	OnRowChange,

	/** Keep all changes locally until submitAll() is called. */
	OnManualSubmit
}
