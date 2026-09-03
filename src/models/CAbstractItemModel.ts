import { CObject } from "../core/CObject.js";
import { CSignal } from "../core/CSignal.js";
import { CModelIndex } from "./CModelIndex.js";
import { COrientation } from "../gui/COrientation.js";

export abstract class CAbstractItemModel extends CObject {
	readonly dataChanged =
		new CSignal<[CModelIndex, CModelIndex]>();

	readonly modelReset = new CSignal<[]>();

	constructor(parent: CObject | null = null) {
		super(parent);
	}

	abstract rowCount(parent?: CModelIndex): number;

	abstract columnCount(parent?: CModelIndex): number;

	abstract data(index: CModelIndex): unknown;

	index(row: number, column: number,
		parent = new CModelIndex()): CModelIndex {
		if (row < 0 || column < 0)
			return new CModelIndex();

		if (row >= this.rowCount(parent) ||
			column >= this.columnCount(parent))
			return new CModelIndex();

		return this.createIndex(row, column);
	}

	parentIndex(_index: CModelIndex): CModelIndex {
		return new CModelIndex();
	}

	headerData(section: number, _orientation: COrientation): string | number | null {
		return section + 1;
	}

	protected createIndex(row: number, column: number,
		data: unknown = null): CModelIndex {
		return new CModelIndex(row, column, data, this);
	}

	protected emitDataChanged(
		topLeft: CModelIndex,
		bottomRight: CModelIndex
	): void {
		this.dataChanged.emit(topLeft, bottomRight);
	}

	protected resetModel(): void {
		this.modelReset.emit();
	}
}