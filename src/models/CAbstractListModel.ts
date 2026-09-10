import { CAbstractItemModel } from "./CAbstractItemModel.js";
import { CModelIndex } from "./CModelIndex.js";

/**
 * Convenience base class for flat, single-column list models.
 */
export abstract class CAbstractListModel extends CAbstractItemModel {
	/** Returns one because list models contain a single column. */
	override columnCount(_parent = new CModelIndex()): number {
		return 1;
	}

	/** Returns an invalid parent index because list models are flat. */
	override parentIndex(_index: CModelIndex): CModelIndex {
		return new CModelIndex();
	}
}
