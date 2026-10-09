import { describe, expect, test } from "vitest";

import { COrientation } from "../../src/gui/COrientation.js";
import { CSortOrder } from "../../src/gui/CSortOrder.js";
import { CAbstractTableModel } from "../../src/models/CAbstractTableModel.js";
import { CModelIndex } from "../../src/models/CModelIndex.js";
import { CSortFilterProxyModel } from "../../src/models/CSortFilterProxyModel.js";

class TestTableModel extends CAbstractTableModel {
	#m_rows: unknown[][] = [
		["Carol", "Italy", 10, new Date(2026, 0, 1)],
		["alice", "Slovenia", 2, new Date(2024, 0, 1)],
		["Bob", "Austria", 100, new Date(2025, 0, 1)],
		["David", null, null, null]
	];

	override rowCount(): number {
		return this.#m_rows.length;
	}

	override columnCount(): number {
		return this.#m_rows[0]?.length ?? 0;
	}

	override data(index: CModelIndex): unknown {
		return index.isValid()
			? this.#m_rows[index.row()]?.[index.column()] ?? null
			: null;
	}

	override isEditable(index: CModelIndex): boolean {
		return index.isValid();
	}

	override setItemData(index: CModelIndex, value: unknown): boolean {
		const row = this.#m_rows[index.row()];
		if (!index.isValid() || row === undefined)
			return false;

		row[index.column()] = value;
		this.emitDataChanged(index, index);
		return true;
	}

	override headerData(
		section: number,
		orientation: COrientation
	): string | number | null {
		return orientation === COrientation.Horizontal
			? ["Name", "Country", "Score", "Date"][section] ?? null
			: section + 1;
	}

	reset(): void {
		this.resetModel();
	}

	replaceRows(rows: unknown[][]): void {
		this.#m_rows = rows;
		this.resetModel();
	}

	changeLayout(): void {
		const indexes: CModelIndex[] = [];
		for (let row = 0; row < this.rowCount(); row++) {
			for (let column = 0; column < this.columnCount(); column++)
				indexes.push(this.index(row, column));
		}
		this.beginLayoutChange();
		this.endLayoutChange(indexes, indexes);
	}
}

function names(proxy: CSortFilterProxyModel): unknown[] {
	const result: unknown[] = [];
	for (let row = 0; row < proxy.rowCount(); row++)
		result.push(proxy.data(proxy.index(row, 0)));
	return result;
}

describe("CSortFilterProxyModel", () => {
	test("constructs empty with default settings", () => {
		const proxy = new CSortFilterProxyModel();

		expect(proxy.rowCount()).toBe(0);
		expect(proxy.columnCount()).toBe(0);
		expect(proxy.filterFixedString()).toBe("");
		expect(proxy.filterKeyColumn()).toBe(-1);
		expect(proxy.isFilterCaseSensitive()).toBe(false);
		expect(proxy.isSortCaseSensitive()).toBe(false);
		expect(proxy.sortColumn()).toBe(-1);
		expect(proxy.sortOrder()).toBe(CSortOrder.AscendingOrder);
		expect(proxy.dynamicSortFilter()).toBe(true);
	});

	test("exposes all source rows and columns by default", () => {
		const proxy = new CSortFilterProxyModel();
		proxy.setSourceModel(new TestTableModel());

		expect(proxy.rowCount()).toBe(4);
		expect(proxy.columnCount()).toBe(4);
		expect(names(proxy)).toEqual(["Carol", "alice", "Bob", "David"]);
	});

	test("maps indexes in both directions", () => {
		const source = new TestTableModel();
		const proxy = new CSortFilterProxyModel();
		proxy.setSourceModel(source);
		const proxyIndex = proxy.index(2, 1);
		const sourceIndex = proxy.mapToSource(proxyIndex);

		expect(sourceIndex.equals(source.index(2, 1))).toBe(true);
		expect(proxy.mapFromSource(sourceIndex).equals(proxyIndex)).toBe(true);
	});

	test("rejects indexes from unrelated models", () => {
		const source = new TestTableModel();
		const other = new TestTableModel();
		const proxy = new CSortFilterProxyModel();
		proxy.setSourceModel(source);

		expect(proxy.mapToSource(source.index(0, 0)).isValid()).toBe(false);
		expect(proxy.mapFromSource(other.index(0, 0)).isValid()).toBe(false);
	});

	test("filters case-insensitively across all columns", () => {
		const proxy = new CSortFilterProxyModel();
		proxy.setSourceModel(new TestTableModel());

		proxy.setFilterFixedString("ALI");

		expect(names(proxy)).toEqual(["alice"]);
	});

	test("filters only the selected key column", () => {
		const proxy = new CSortFilterProxyModel();
		proxy.setSourceModel(new TestTableModel());
		proxy.setFilterKeyColumn(1);

		proxy.setFilterFixedString("a");

		expect(names(proxy)).toEqual(["Carol", "alice", "Bob"]);
	});

	test("case-sensitive filtering distinguishes letter case", () => {
		const proxy = new CSortFilterProxyModel();
		proxy.setSourceModel(new TestTableModel());
		proxy.setFilterKeyColumn(0);
		proxy.setFilterCaseSensitive(true);

		proxy.setFilterFixedString("A");

		expect(names(proxy)).toEqual([]);
	});

	test("clearing the filter restores all rows", () => {
		const proxy = new CSortFilterProxyModel();
		proxy.setSourceModel(new TestTableModel());
		proxy.setFilterFixedString("alice");

		proxy.setFilterFixedString("");

		expect(proxy.rowCount()).toBe(4);
	});

	test("sorts text in ascending and descending order", () => {
		const proxy = new CSortFilterProxyModel();
		proxy.setSourceModel(new TestTableModel());

		proxy.sort(0, CSortOrder.AscendingOrder);
		expect(names(proxy)).toEqual(["alice", "Bob", "Carol", "David"]);

		proxy.sort(0, CSortOrder.DescendingOrder);
		expect(names(proxy)).toEqual(["David", "Carol", "Bob", "alice"]);
	});

	test("supports case-sensitive text sorting", () => {
		const proxy = new CSortFilterProxyModel();
		proxy.setSourceModel(new TestTableModel());
		proxy.setSortCaseSensitive(true);

		proxy.sort(0);

		expect(proxy.isSortCaseSensitive()).toBe(true);
		expect(names(proxy)).toHaveLength(4);
	});

	test("sorts numbers numerically", () => {
		const proxy = new CSortFilterProxyModel();
		proxy.setSourceModel(new TestTableModel());

		proxy.sort(2);

		expect(names(proxy)).toEqual(["alice", "Carol", "Bob", "David"]);
	});

	test("sorts dates chronologically", () => {
		const proxy = new CSortFilterProxyModel();
		proxy.setSourceModel(new TestTableModel());

		proxy.sort(3);

		expect(names(proxy)).toEqual(["alice", "Bob", "Carol", "David"]);
	});

	test("keeps empty values last in descending order", () => {
		const proxy = new CSortFilterProxyModel();
		proxy.setSourceModel(new TestTableModel());

		proxy.sort(2, CSortOrder.DescendingOrder);

		expect(names(proxy)).toEqual(["Bob", "Carol", "alice", "David"]);
	});

	test("sorting does not modify the source model", () => {
		const source = new TestTableModel();
		const proxy = new CSortFilterProxyModel();
		proxy.setSourceModel(source);

		proxy.sort(0);

		expect(source.data(source.index(0, 0))).toBe("Carol");
		expect(source.data(source.index(1, 0))).toBe("alice");
	});

	test("sorting by minus one restores source row order", () => {
		const proxy = new CSortFilterProxyModel();
		proxy.setSourceModel(new TestTableModel());
		proxy.sort(0);

		proxy.sort(-1);

		expect(names(proxy)).toEqual(["Carol", "alice", "Bob", "David"]);
	});

	test("maps filtered and sorted rows to their source rows", () => {
		const source = new TestTableModel();
		const proxy = new CSortFilterProxyModel();
		proxy.setSourceModel(source);
		proxy.setFilterKeyColumn(1);
		proxy.setFilterFixedString("a");
		proxy.sort(0);

		expect(proxy.mapToSource(proxy.index(0, 0)).row()).toBe(1);
		expect(proxy.mapToSource(proxy.index(1, 0)).row()).toBe(2);
		expect(proxy.mapToSource(proxy.index(2, 0)).row()).toBe(0);
		expect(proxy.mapFromSource(source.index(3, 0)).isValid()).toBe(false);
	});

	test("writes data through to the mapped source row", () => {
		const source = new TestTableModel();
		const proxy = new CSortFilterProxyModel();
		proxy.setSourceModel(source);
		proxy.sort(0);
		const bobProxyIndex = proxy.index(1, 0);

		expect(proxy.setItemData(bobProxyIndex, "Bobby")).toBe(true);
		expect(source.data(source.index(2, 0))).toBe("Bobby");
	});

	test("maps horizontal and vertical header data", () => {
		const proxy = new CSortFilterProxyModel();
		proxy.setSourceModel(new TestTableModel());
		proxy.sort(0);

		expect(proxy.headerData(1, COrientation.Horizontal)).toBe("Country");
		expect(proxy.headerData(0, COrientation.Vertical)).toBe(2);
	});

	test("source data changes dynamically update filtering", () => {
		const source = new TestTableModel();
		const proxy = new CSortFilterProxyModel();
		proxy.setSourceModel(source);
		proxy.setFilterKeyColumn(0);
		proxy.setFilterFixedString("alice");

		source.setItemData(source.index(0, 0), "Alice Cooper");

		expect(names(proxy)).toEqual(["Alice Cooper", "alice"]);
	});

	test("source data changes dynamically update sorting", () => {
		const source = new TestTableModel();
		const proxy = new CSortFilterProxyModel();
		proxy.setSourceModel(source);
		proxy.sort(0);

		source.setItemData(source.index(0, 0), "Aaron");

		expect(names(proxy)).toEqual(["Aaron", "alice", "Bob", "David"]);
		expect(proxy.mapToSource(proxy.index(0, 0)).row()).toBe(0);
	});

	test("rows dynamically enter and leave the filtered result", () => {
		const source = new TestTableModel();
		const proxy = new CSortFilterProxyModel();
		proxy.setSourceModel(source);
		proxy.setFilterKeyColumn(1);
		proxy.setFilterFixedString("slovenia");

		source.setItemData(source.index(0, 1), "Slovenia");
		expect(names(proxy)).toEqual(["Carol", "alice"]);

		source.setItemData(source.index(1, 1), "Croatia");
		expect(names(proxy)).toEqual(["Carol"]);
	});

	test("source reset rebuilds the proxy from replacement rows", () => {
		const source = new TestTableModel();
		const proxy = new CSortFilterProxyModel();
		proxy.setSourceModel(source);
		proxy.setFilterKeyColumn(1);
		proxy.setFilterFixedString("italy");

		source.replaceRows([
			["Eva", "Spain", 20, new Date(2023, 0, 1)],
			["Marco", "Italy", 30, new Date(2022, 0, 1)]
		]);

		expect(names(proxy)).toEqual(["Marco"]);
		expect(proxy.mapToSource(proxy.index(0, 0)).row()).toBe(1);
	});

	test("replacing the source model disconnects the old source", () => {
		const oldSource = new TestTableModel();
		const newSource = new TestTableModel();
		const proxy = new CSortFilterProxyModel();
		proxy.setSourceModel(oldSource);
		proxy.setSourceModel(newSource);
		let resetCount = 0;
		proxy.modelReset.connect(() => resetCount++);

		oldSource.setItemData(oldSource.index(0, 0), "Changed old row");
		oldSource.reset();

		expect(resetCount).toBe(0);
		expect(names(proxy)).toEqual(["Carol", "alice", "Bob", "David"]);
	});

	test("disabled dynamic sorting forwards data changes without rebuilding", () => {
		const source = new TestTableModel();
		const proxy = new CSortFilterProxyModel();
		proxy.setSourceModel(source);
		proxy.setFilterKeyColumn(0);
		proxy.setFilterFixedString("alice");
		proxy.setDynamicSortFilter(false);
		let changedCount = 0;
		proxy.dataChanged.connect(() => changedCount++);

		source.setItemData(source.index(1, 0), "Changed");

		expect(proxy.rowCount()).toBe(1);
		expect(proxy.data(proxy.index(0, 0))).toBe("Changed");
		expect(changedCount).toBe(1);
	});

	test("invalidate rebuilds a non-dynamic proxy", () => {
		const source = new TestTableModel();
		const proxy = new CSortFilterProxyModel();
		proxy.setSourceModel(source);
		proxy.setFilterKeyColumn(0);
		proxy.setFilterFixedString("alice");
		proxy.setDynamicSortFilter(false);
		source.setItemData(source.index(1, 0), "Changed");

		proxy.invalidate();

		expect(proxy.rowCount()).toBe(0);
	});

	test("source reset and layout change rebuild the proxy", () => {
		const source = new TestTableModel();
		const proxy = new CSortFilterProxyModel();
		proxy.setSourceModel(source);
		let resetCount = 0;
		proxy.modelReset.connect(() => resetCount++);

		source.reset();
		source.changeLayout();

		expect(resetCount).toBe(2);
		expect(proxy.rowCount()).toBe(4);
	});
});
