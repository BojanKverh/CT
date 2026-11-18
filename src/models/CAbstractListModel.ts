import { CAbstractItemModel } from "./CAbstractItemModel.js";
import { CModelIndex } from "./CModelIndex.js";

/**
 * Convenience base class for flat, single-column list models.
 */
export abstract class CAbstractListModel extends CAbstractItemModel {
	/**
	 * Reports the single column of a flat list.
	 * @param _parent Parent index. The implementation ignores it.
	 * @returns Always `1`.
	 */
	override columnCount(_parent = new CModelIndex()): number {
		return 1;
	}

	/**
	 * Reports that list items have no parent item.
	 * @param _index List item index.
	 * @returns A new invalid index.
	 */
	override parentIndex(_index: CModelIndex): CModelIndex {
		return new CModelIndex();
	}
}
