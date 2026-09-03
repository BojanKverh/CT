import { CAbstractItemModel } from "./CAbstractItemModel.js";
import { CModelIndex } from "./CModelIndex.js";

export abstract class CAbstractTableModel extends CAbstractItemModel {
	override parentIndex(_index: CModelIndex): CModelIndex {
		return new CModelIndex();
	}
}