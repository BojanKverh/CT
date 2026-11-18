import { CAbstractItemModel } from "./CAbstractItemModel.js";
import { CModelIndex } from "./CModelIndex.js";

/**
 * Convenience base class for flat table models.
 */
export abstract class CAbstractTableModel extends CAbstractItemModel {
	/**
	 * Reports that flat table items have no parent item.
	 * @param _index Table item index.
	 * @returns A new invalid index.
	 */
	override parentIndex(_index: CModelIndex): CModelIndex {
		return new CModelIndex();
	}

	/**
	 * Provides the edit hook for table subclasses. The base table is read-only.
	 * @param _index Index of the cell to edit.
	 * @param _value Proposed cell value.
	 * @returns Always `false` in the base implementation.
	 */
	override setItemData(_index: CModelIndex, _value: unknown): boolean {
    	return false;
	}

	/**
	 * Queries whether a table cell can be edited. Override this for an editable table.
	 * @param _index Cell index to inspect.
	 * @returns Always `false` in the base implementation.
	 */
	override isEditable(_index: CModelIndex): boolean {
        return false;
    }
}
