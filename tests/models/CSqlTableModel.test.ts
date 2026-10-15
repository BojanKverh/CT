import { describe, expect, test, vi } from "vitest";

import { COrientation } from "../../src/gui/COrientation.js";
import { CSortOrder } from "../../src/gui/CSortOrder.js";
import { CSqlEditStrategy } from "../../src/models/CSqlEditStrategy.js";
import { CSqlError } from "../../src/models/CSqlError.js";
import { CSqlFilterOperator } from "../../src/models/CSqlFilter.js";
import {
	CSqlTableAdapter,
	type CSqlRow,
	type CSqlSelectRequest,
	type CSqlSelectResult
} from "../../src/models/CSqlTableAdapter.js";
import { CSqlTableModel } from "../../src/models/CSqlTableModel.js";

class TestSqlAdapter extends CSqlTableAdapter {
	rows: CSqlRow[] = [
		{ id: 1, name: "Alice", age: 30 },
		{ id: 2, name: "Bob", age: 42 }
	];

	readonly selectCall = vi.fn();
	readonly insertCall = vi.fn();
	readonly updateCall = vi.fn();
	readonly removeCall = vi.fn();

	failSelect = false;
	failUpdate = false;
	failInsert = false;
	failRemove = false;

	override async select(request: CSqlSelectRequest): Promise<CSqlSelectResult> {
		this.selectCall(request);
		if (this.failSelect)
			throw new Error("select failed");
		return {
			rows: this.rows
				.slice(request.offset, request.offset + request.limit)
				.map(row => ({ ...row })),
			totalRowCount: this.rows.length
		};
	}

	override async insert(
		table: string,
		values: Readonly<CSqlRow>
	): Promise<CSqlRow> {
		this.insertCall(table, values);
		if (this.failInsert)
			throw new Error("insert failed");

		const row = { id: 3, ...values };
		this.rows.push(row);
		return { ...row };
	}

	override async update(
		table: string,
		primaryKeyColumn: string,
		primaryKey: unknown,
		values: Readonly<CSqlRow>
	): Promise<void> {
		this.updateCall(table, primaryKeyColumn, primaryKey, values);
		if (this.failUpdate)
			throw new Error("update failed");

		const row = this.rows.find(item =>
			item[primaryKeyColumn] === primaryKey);
		if (row !== undefined)
			Object.assign(row, values);
	}

	override async remove(
		table: string,
		primaryKeyColumn: string,
		primaryKey: unknown
	): Promise<void> {
		this.removeCall(table, primaryKeyColumn, primaryKey);
		if (this.failRemove)
			throw new Error("remove failed");

		this.rows = this.rows.filter(row =>
			row[primaryKeyColumn] !== primaryKey);
	}
}

function createModel(adapter = new TestSqlAdapter()): CSqlTableModel {
	const model = new CSqlTableModel(adapter);
	model.setTable("employees");
	model.setPrimaryKey("id");
	model.setColumns(["id", "name", "age"]);
	return model;
}

describe("CSqlTableModel", () => {
	test("select loads table rows", async () => {
		const adapter = new TestSqlAdapter();
		const model = createModel(adapter);

		expect(await model.select()).toBe(true);

		expect(adapter.selectCall).toHaveBeenCalledWith({
			table: "employees",
			columns: ["id", "name", "age"],
			offset: 0,
			limit: 100
		});
		expect(model.rowCount()).toBe(2);
		expect(model.columnCount()).toBe(3);
		expect(model.data(model.index(0, 1))).toBe("Alice");
		expect(model.data(model.index(1, 2))).toBe(42);
		expect(model.totalRowCount()).toBe(2);
		expect(model.canFetchMore()).toBe(false);
	});

	test("fetchMore appends the next block of rows", async () => {
		const adapter = new TestSqlAdapter();
		adapter.rows.push({ id: 3, name: "Carol", age: 35 });
		const model = createModel(adapter);
		model.setFetchSize(2);

		await model.select();

		expect(model.rowCount()).toBe(2);
		expect(model.totalRowCount()).toBe(3);
		expect(model.canFetchMore()).toBe(true);

		expect(await model.fetchMore()).toBe(true);

		expect(adapter.selectCall).toHaveBeenLastCalledWith({
			table: "employees",
			columns: ["id", "name", "age"],
			offset: 2,
			limit: 2
		});
		expect(model.rowCount()).toBe(3);
		expect(model.data(model.index(2, 1))).toBe("Carol");
		expect(model.canFetchMore()).toBe(false);
		expect(await model.fetchMore()).toBe(false);
	});

	test("setFetchSize ignores invalid values", () => {
		const model = createModel();

		model.setFetchSize(25);
		model.setFetchSize(0);
		model.setFetchSize(2.5);

		expect(model.fetchSize()).toBe(25);
	});

	test("select infers columns when none were configured", async () => {
		const model = new CSqlTableModel(new TestSqlAdapter());
		model.setTable("employees");

		await model.select();

		expect(model.columns()).toEqual(["id", "name", "age"]);
		expect(model.columnCount()).toBe(3);
	});

	test("select emits loading state changes", async () => {
		const model = createModel();
		const states: boolean[] = [];
		model.loadingChanged.connect(loading => states.push(loading));

		await model.select();

		expect(states).toEqual([true, false]);
		expect(model.isLoading()).toBe(false);
	});

	test("reports select errors", async () => {
		const adapter = new TestSqlAdapter();
		adapter.failSelect = true;
		const model = createModel(adapter);
		const errors: CSqlError[] = [];
		model.errorOccurred.connect(error => errors.push(error));

		expect(await model.select()).toBe(false);

		expect(model.lastError()?.operation).toBe("select");
		expect(model.lastError()?.message).toBe("select failed");
		expect(errors).toHaveLength(1);
	});

	test("exposes column labels and vertical row numbers", async () => {
		const model = createModel();
		model.setColumnHeader("name", "Employee");
		await model.select();

		expect(model.headerData(1, COrientation.Horizontal)).toBe("Employee");
		expect(model.headerData(2, COrientation.Horizontal)).toBe("age");
		expect(model.headerData(0, COrientation.Vertical)).toBe(1);
	});

	test("primary key cells are not editable", async () => {
		const model = createModel();
		await model.select();

		expect(model.isEditable(model.index(0, 0))).toBe(false);
		expect(model.isEditable(model.index(0, 1))).toBe(true);
		expect(model.setItemData(model.index(0, 0), 99)).toBe(false);
	});

	test("OnFieldChange updates the adapter automatically", async () => {
		const adapter = new TestSqlAdapter();
		const model = createModel(adapter);
		await model.select();
		const submitted = vi.fn();
		model.dataSubmitted.connect(submitted);

		expect(model.setItemData(model.index(0, 1), "Alicia")).toBe(true);
		expect(model.data(model.index(0, 1))).toBe("Alicia");

		await model.whenIdle();

		expect(adapter.updateCall).toHaveBeenCalledWith(
			"employees",
			"id",
			1,
			{ name: "Alicia" }
		);
		expect(adapter.rows[0]?.name).toBe("Alicia");
		expect(submitted).toHaveBeenCalledOnce();
	});

	test("OnFieldChange restores data after an update error", async () => {
		const adapter = new TestSqlAdapter();
		const model = createModel(adapter);
		await model.select();
		adapter.failUpdate = true;

		model.setItemData(model.index(0, 1), "Alicia");
		await model.whenIdle();

		expect(model.data(model.index(0, 1))).toBe("Alice");
		expect(model.lastError()?.operation).toBe("update");
	});

	test("OnManualSubmit keeps changes local until submitAll", async () => {
		const adapter = new TestSqlAdapter();
		const model = createModel(adapter);
		model.setEditStrategy(CSqlEditStrategy.OnManualSubmit);
		await model.select();

		model.setItemData(model.index(0, 1), "Alicia");
		model.setItemData(model.index(0, 2), 31);

		expect(adapter.updateCall).not.toHaveBeenCalled();
		expect(await model.submitAll()).toBe(true);
		expect(adapter.updateCall).toHaveBeenCalledWith(
			"employees",
			"id",
			1,
			{ name: "Alicia", age: 31 }
		);
	});

	test("revertAll discards changes that were not submitted", async () => {
		const model = createModel();
		model.setEditStrategy(CSqlEditStrategy.OnManualSubmit);
		await model.select();

		model.setItemData(model.index(0, 1), "Alicia");
		model.revertAll();

		expect(model.data(model.index(0, 1))).toBe("Alice");
	});

	test("OnRowChange submits the previous row", async () => {
		const adapter = new TestSqlAdapter();
		const model = createModel(adapter);
		model.setEditStrategy(CSqlEditStrategy.OnRowChange);
		await model.select();

		model.setItemData(model.index(0, 1), "Alicia");
		expect(adapter.updateCall).not.toHaveBeenCalled();

		model.setItemData(model.index(1, 1), "Robert");
		await model.whenIdle();

		expect(adapter.updateCall).toHaveBeenCalledWith(
			"employees",
			"id",
			1,
			{ name: "Alicia" }
		);
		expect(adapter.updateCall).not.toHaveBeenCalledWith(
			"employees",
			"id",
			2,
			{ name: "Robert" }
		);
	});

	test("submitRow writes one pending row", async () => {
		const adapter = new TestSqlAdapter();
		const model = createModel(adapter);
		model.setEditStrategy(CSqlEditStrategy.OnRowChange);
		await model.select();
		model.setItemData(model.index(1, 2), 43);

		expect(await model.submitRow(1)).toBe(true);

		expect(adapter.updateCall).toHaveBeenCalledWith(
			"employees",
			"id",
			2,
			{ age: 43 }
		);
	});

	test("insertRecord appends the row returned by the adapter", async () => {
		const adapter = new TestSqlAdapter();
		const model = createModel(adapter);
		await model.select();

		expect(await model.insertRecord({ name: "Carol", age: 35 })).toBe(true);

		expect(adapter.insertCall).toHaveBeenCalledWith(
			"employees",
			{ name: "Carol", age: 35 }
		);
		expect(model.rowCount()).toBe(3);
		expect(model.data(model.index(2, 0))).toBe(3);
		expect(model.data(model.index(2, 1))).toBe("Carol");
	});

	test("removeRow removes a record by primary key", async () => {
		const adapter = new TestSqlAdapter();
		const model = createModel(adapter);
		await model.select();

		expect(await model.removeRow(0)).toBe(true);

		expect(adapter.removeCall).toHaveBeenCalledWith(
			"employees",
			"id",
			1
		);
		expect(model.rowCount()).toBe(1);
		expect(model.data(model.index(0, 1))).toBe("Bob");
	});

	test("operations fail cleanly when no table was selected", async () => {
		const model = new CSqlTableModel(new TestSqlAdapter());

		expect(await model.select()).toBe(false);
		expect(model.lastError()?.message).toBe("No SQL table has been selected.");
	});

	test("sort reloads the first page using the selected SQL column", async () => {
		const adapter = new TestSqlAdapter();
		const model = createModel(adapter);
		await model.select();
		adapter.selectCall.mockClear();

		model.sort(1, CSortOrder.DescendingOrder);
		await model.whenIdle();

		expect(model.sortColumn()).toBe(1);
		expect(model.sortOrder()).toBe(CSortOrder.DescendingOrder);
		expect(adapter.selectCall).toHaveBeenCalledWith({
			table: "employees",
			columns: ["id", "name", "age"],
			offset: 0,
			limit: 100,
			sortColumn: "name",
			sortOrder: CSortOrder.DescendingOrder
		});
	});

	test("setFilter reloads the first page and clearFilter removes it", async () => {
		const adapter = new TestSqlAdapter();
		const model = createModel(adapter);
		await model.select();

		model.setFilter({
			column: "name",
			operator: CSqlFilterOperator.StartsWith,
			value: "A"
		});
		await model.whenIdle();

		expect(model.filters()).toEqual([{
			column: "name",
			operator: CSqlFilterOperator.StartsWith,
			value: "A"
		}]);
		expect(adapter.selectCall).toHaveBeenLastCalledWith({
			table: "employees",
			columns: ["id", "name", "age"],
			offset: 0,
			limit: 100,
			filters: [{
				column: "name",
				operator: CSqlFilterOperator.StartsWith,
				value: "A"
			}]
		});

		model.clearFilter();
		await model.whenIdle();
		expect(model.filters()).toEqual([]);
		expect(adapter.selectCall).toHaveBeenLastCalledWith({
			table: "employees",
			columns: ["id", "name", "age"],
			offset: 0,
			limit: 100
		});
	});

	test("setFilters copies the supplied filter objects", async () => {
		const model = createModel();
		await model.select();
		const filter = {
			column: "age",
			operator: CSqlFilterOperator.GreaterThan,
			value: 30
		};

		model.setFilters([filter]);
		filter.value = 99;
		await model.whenIdle();

		expect(model.filters()[0]?.value).toBe(30);
	});
});
