import { CAbstractItemModel } from "./CAbstractItemModel.js";
import { CModelIndex } from "./CModelIndex.js";

/**
 * Convenience base class for flat table models.
 */
export abstract class CAbstractTableModel extends CAbstractItemModel {
	/** Returns an invalid parent index because table models are flat. */
	override parentIndex(_index: CModelIndex): CModelIndex {
		return new CModelIndex();
	}

	override setItemData(_index: CModelIndex, _value: unknown): boolean {
    	return false;
	}

	override isEditable(_index: CModelIndex): boolean {
        return false;
    }
}
