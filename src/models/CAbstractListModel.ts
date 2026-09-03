import { CAbstractItemModel } from "./CAbstractItemModel.js";
import { CModelIndex } from "./CModelIndex.js";

export abstract class CAbstractListModel extends CAbstractItemModel {
	override columnCount(_parent = new CModelIndex()): number {
		return 1;
	}

	override parentIndex(_index: CModelIndex): CModelIndex {
		return new CModelIndex();
	}
}