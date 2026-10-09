import { describe, expect, test } from "vitest";

import { COrientation } from "../../src/gui/COrientation.js";
import { CAbstractItemModel } from "../../src/models/CAbstractItemModel.js";
import { CAbstractListModel } from "../../src/models/CAbstractListModel.js";
import { CAbstractProxyModel } from "../../src/models/CAbstractProxyModel.js";
import { CModelIndex } from "../../src/models/CModelIndex.js";

class TestSourceModel extends CAbstractListModel {
	#m_data = ["A", "B", "C"];

	override rowCount(): number {
		return this.#m_data.length;
	}

	override data(index: CModelIndex): unknown {
		return index.isValid() ? this.#m_data[index.row()] ?? null : null;
	}

	override isEditable(index: CModelIndex): boolean {
		return index.isValid();
	}

	override setItemData(index: CModelIndex, value: unknown): boolean {
		if (!index.isValid() || index.model() !== this)
			return false;

		this.#m_data[index.row()] = String(value);
		this.emitDataChanged(index, index);
		return true;
	}

	override headerData(
		section: number,
		orientation: COrientation
	): string | number | null {
		return orientation === COrientation.Horizontal
			? "Value"
			: section + 10;
	}

	change(row: number, value: string): void {
		this.#m_data[row] = value;
		const index = this.index(row, 0);
		this.emitDataChanged(index, index);
	}

	reset(): void {
		this.resetModel();
	}

	changeLayout(): void {
		const indexes = this.#m_data.map((_value, row) =>
			this.index(row, 0));
		this.beginLayoutChange();
		this.endLayoutChange(indexes, indexes);
	}
}

class IdentityProxyModel extends CAbstractProxyModel {
	sourceChanges: Array<{
		oldModel: CAbstractItemModel | null;
		newModel: CAbstractItemModel | null;
	}> = [];

	override rowCount(): number {
		return this.sourceModel()?.rowCount() ?? 0;
	}

	override columnCount(): number {
		return this.sourceModel()?.columnCount() ?? 0;
	}

	override mapToSource(proxyIndex: CModelIndex): CModelIndex {
		if (!proxyIndex.isValid() || proxyIndex.model() !== this)
			return new CModelIndex();

		return this.sourceModel()?.index(
			proxyIndex.row(),
			proxyIndex.column()
		) ?? new CModelIndex();
	}

	override mapFromSource(sourceIndex: CModelIndex): CModelIndex {
		if (!sourceIndex.isValid() ||
			sourceIndex.model() !== this.sourceModel())
			return new CModelIndex();

		return this.index(sourceIndex.row(), sourceIndex.column());
	}

	protected override sourceModelChanged(
		oldModel: CAbstractItemModel | null,
		newModel: CAbstractItemModel | null
	): void {
		this.sourceChanges.push({ oldModel, newModel });
	}
}

describe("CAbstractProxyModel", () => {
	test("constructs without a source model", () => {
		const proxy = new IdentityProxyModel();

		expect(proxy.sourceModel()).toBeNull();
		expect(proxy.rowCount()).toBe(0);
		expect(proxy.columnCount()).toBe(0);
	});

	test("sets and clears the source model", () => {
		const proxy = new IdentityProxyModel();
		const source = new TestSourceModel();

		proxy.setSourceModel(source);
		expect(proxy.sourceModel()).toBe(source);
		expect(proxy.rowCount()).toBe(3);

		proxy.setSourceModel(null);
		expect(proxy.sourceModel()).toBeNull();
		expect(proxy.rowCount()).toBe(0);
	});

	test("source model changes reset the proxy", () => {
		const proxy = new IdentityProxyModel();
		const source = new TestSourceModel();
		let resetCount = 0;
		proxy.modelReset.connect(() => resetCount++);

		proxy.setSourceModel(source);
		proxy.setSourceModel(null);

		expect(resetCount).toBe(2);
		expect(proxy.sourceChanges).toEqual([
			{ oldModel: null, newModel: source },
			{ oldModel: source, newModel: null }
		]);
	});

	test("setting the same source model does nothing", () => {
		const proxy = new IdentityProxyModel();
		const source = new TestSourceModel();
		proxy.setSourceModel(source);
		let resetCount = 0;
		proxy.modelReset.connect(() => resetCount++);

		proxy.setSourceModel(source);

		expect(resetCount).toBe(0);
		expect(proxy.sourceChanges).toHaveLength(1);
	});

	test("cannot use itself as its source model", () => {
		const proxy = new IdentityProxyModel();

		proxy.setSourceModel(proxy);

		expect(proxy.sourceModel()).toBeNull();
	});

	test("maps valid indexes in both directions", () => {
		const proxy = new IdentityProxyModel();
		const source = new TestSourceModel();
		proxy.setSourceModel(source);
		const proxyIndex = proxy.index(1, 0);
		const sourceIndex = proxy.mapToSource(proxyIndex);

		expect(sourceIndex.model()).toBe(source);
		expect(sourceIndex.row()).toBe(1);
		expect(proxy.mapFromSource(sourceIndex).equals(proxyIndex)).toBe(true);
	});

	test("mapping rejects indexes owned by another model", () => {
		const proxy = new IdentityProxyModel();
		const source = new TestSourceModel();
		const other = new TestSourceModel();
		proxy.setSourceModel(source);

		expect(proxy.mapToSource(source.index(0, 0)).isValid()).toBe(false);
		expect(proxy.mapFromSource(other.index(0, 0)).isValid()).toBe(false);
	});

	test("reads data through the source model", () => {
		const proxy = new IdentityProxyModel();
		proxy.setSourceModel(new TestSourceModel());

		expect(proxy.data(proxy.index(1, 0))).toBe("B");
		expect(proxy.data(new CModelIndex())).toBeNull();
	});

	test("forwards editability and item data writes", () => {
		const proxy = new IdentityProxyModel();
		const source = new TestSourceModel();
		proxy.setSourceModel(source);
		const index = proxy.index(1, 0);

		expect(proxy.isEditable(index)).toBe(true);
		expect(proxy.setItemData(index, "Changed")).toBe(true);
		expect(source.data(source.index(1, 0))).toBe("Changed");
	});

	test("invalid indexes cannot be edited", () => {
		const proxy = new IdentityProxyModel();
		proxy.setSourceModel(new TestSourceModel());

		expect(proxy.isEditable(new CModelIndex())).toBe(false);
		expect(proxy.setItemData(new CModelIndex(), "X")).toBe(false);
	});

	test("forwards header data", () => {
		const proxy = new IdentityProxyModel();
		proxy.setSourceModel(new TestSourceModel());

		expect(proxy.headerData(0, COrientation.Horizontal)).toBe("Value");
		expect(proxy.headerData(2, COrientation.Vertical)).toBe(12);
	});

	test("maps source dataChanged to proxy indexes", () => {
		const proxy = new IdentityProxyModel();
		const source = new TestSourceModel();
		proxy.setSourceModel(source);
		let topLeft = new CModelIndex();
		let bottomRight = new CModelIndex();
		proxy.dataChanged.connect((top, bottom) => {
			topLeft = top;
			bottomRight = bottom;
		});

		source.change(1, "Changed");

		expect(topLeft.equals(proxy.index(1, 0))).toBe(true);
		expect(bottomRight.equals(proxy.index(1, 0))).toBe(true);
	});

	test("source reset resets the proxy", () => {
		const proxy = new IdentityProxyModel();
		const source = new TestSourceModel();
		proxy.setSourceModel(source);
		let resetCount = 0;
		proxy.modelReset.connect(() => resetCount++);

		source.reset();

		expect(resetCount).toBe(1);
	});

	test("source layout change resets the proxy", () => {
		const proxy = new IdentityProxyModel();
		const source = new TestSourceModel();
		proxy.setSourceModel(source);
		let resetCount = 0;
		proxy.modelReset.connect(() => resetCount++);

		source.changeLayout();

		expect(resetCount).toBe(1);
	});

	test("old source signals are disconnected", () => {
		const proxy = new IdentityProxyModel();
		const oldSource = new TestSourceModel();
		const newSource = new TestSourceModel();
		proxy.setSourceModel(oldSource);
		proxy.setSourceModel(newSource);
		let dataChangedCount = 0;
		let resetCount = 0;
		proxy.dataChanged.connect(() => dataChangedCount++);
		proxy.modelReset.connect(() => resetCount++);

		oldSource.change(0, "X");
		oldSource.reset();
		oldSource.changeLayout();

		expect(dataChangedCount).toBe(0);
		expect(resetCount).toBe(0);
	});
});
