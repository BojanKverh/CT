import { describe, expect, test } from "vitest";

import { CMemorySqlTableAdapter } from
	"../../src/models/CMemorySqlTableAdapter.js";
import { CSqlTableModel } from "../../src/models/CSqlTableModel.js";
import { CSortOrder } from "../../src/gui/CSortOrder.js";
import { CSqlFilterOperator } from "../../src/models/CSqlFilter.js";

function createAdapter(): CMemorySqlTableAdapter {
	const adapter = new CMemorySqlTableAdapter({
		employees: [
			{ employee_id: 10, name: "Alice", age: 30 },
			{ employee_id: 20, name: "Bob", age: 42 },
			{ employee_id: 30, name: "Carol", age: 35 }
		]
	});
	adapter.setAutoIncrementColumn("employees", "employee_id");
	return adapter;
}

describe("CMemorySqlTableAdapter", () => {
	test("works as a CSqlTableModel backend", async () => {
		const adapter = createAdapter();
		const model = new CSqlTableModel(adapter);
		model.setTable("employees");
		model.setPrimaryKey("employee_id");
		model.setColumns(["employee_id", "name", "age"]);

		await model.select();
		model.setItemData(model.index(0, 1), "Alicia");
		await model.whenIdle();

		expect(adapter.rows("employees")[0]?.name).toBe("Alicia");
	});

	test("select returns a paginated result", async () => {
		const adapter = createAdapter();

		const result = await adapter.select({
			table: "employees",
			columns: [],
			offset: 1,
			limit: 1
		});

		expect(result.totalRowCount).toBe(3);
		expect(result.rows).toEqual([
			{ employee_id: 20, name: "Bob", age: 42 }
		]);
	});

	test("select returns only requested columns", async () => {
		const adapter = createAdapter();

		const result = await adapter.select({
			table: "employees",
			columns: ["employee_id", "name"],
			offset: 0,
			limit: 2
		});

		expect(result.rows).toEqual([
			{ employee_id: 10, name: "Alice" },
			{ employee_id: 20, name: "Bob" }
		]);
	});

	test("returned rows do not expose internal storage", async () => {
		const adapter = createAdapter();
		const result = await adapter.select({
			table: "employees",
			columns: [],
			offset: 0,
			limit: 1
		});

		result.rows[0]!.name = "Changed outside";

		expect(adapter.rows("employees")[0]?.name).toBe("Alice");
	});

	test("insert adds a row", async () => {
		const adapter = createAdapter();

		const inserted = await adapter.insert("employees", {
			employee_id: 40,
			name: "David",
			age: 51
		});

		expect(inserted).toEqual({
			employee_id: 40,
			name: "David",
			age: 51
		});
		expect(adapter.rows("employees")).toHaveLength(4);
	});

	test("insert generates a numeric id by default", async () => {
		const adapter = new CMemorySqlTableAdapter({
			people: [
				{ id: 2, name: "Alice" },
				{ id: 7, name: "Bob" }
			]
		});

		const inserted = await adapter.insert("people", { name: "Carol" });

		expect(inserted.id).toBe(8);
	});

	test("automatic ids can be disabled", async () => {
		const adapter = new CMemorySqlTableAdapter({ people: [] });
		adapter.setAutoIncrementColumn("people", null);

		const inserted = await adapter.insert("people", { name: "Alice" });

		expect(inserted).toEqual({ name: "Alice" });
	});

	test("update finds a row using the configured primary-key column", async () => {
		const adapter = createAdapter();

		await adapter.update(
			"employees",
			"employee_id",
			20,
			{ name: "Robert", age: 43 }
		);

		expect(adapter.rows("employees")[1]).toEqual({
			employee_id: 20,
			name: "Robert",
			age: 43
		});
	});

	test("update cannot replace the primary key", async () => {
		const adapter = createAdapter();

		await adapter.update(
			"employees",
			"employee_id",
			20,
			{ employee_id: 99, name: "Robert" }
		);

		expect(adapter.rows("employees")[1]?.employee_id).toBe(20);
	});

	test("remove deletes a row using its primary key", async () => {
		const adapter = createAdapter();

		await adapter.remove("employees", "employee_id", 20);

		expect(adapter.rows("employees").map(row => row.employee_id))
			.toEqual([10, 30]);
	});

	test("unknown tables reject operations", async () => {
		const adapter = createAdapter();

		await expect(adapter.select({
			table: "missing",
			columns: [],
			offset: 0,
			limit: 10
		})).rejects.toThrow("Table 'missing' does not exist.");
	});

	test("update and remove reject unknown records", async () => {
		const adapter = createAdapter();

		await expect(adapter.update(
			"employees",
			"employee_id",
			999,
			{ name: "Nobody" }
		)).rejects.toThrow("Record '999' was not found");

		await expect(adapter.remove(
			"employees",
			"employee_id",
			999
		)).rejects.toThrow("Record '999' was not found");
	});

	test("filters rows before pagination and reports the filtered total", async () => {
		const adapter = createAdapter();

		const result = await adapter.select({
			table: "employees",
			columns: [],
			offset: 0,
			limit: 10,
			filters: [{
				column: "age",
				operator: CSqlFilterOperator.GreaterThan,
				value: 30
			}]
		});

		expect(result.totalRowCount).toBe(2);
		expect(result.rows.map(row => row.name)).toEqual(["Bob", "Carol"]);
	});

	test("supports case-insensitive and case-sensitive text filters", async () => {
		const adapter = createAdapter();
		const insensitive = await adapter.select({
			table: "employees",
			columns: [],
			offset: 0,
			limit: 10,
			filters: [{
				column: "name",
				operator: CSqlFilterOperator.StartsWith,
				value: "a"
			}]
		});
		const sensitive = await adapter.select({
			table: "employees",
			columns: [],
			offset: 0,
			limit: 10,
			filters: [{
				column: "name",
				operator: CSqlFilterOperator.StartsWith,
				value: "a",
				caseSensitive: true
			}]
		});

		expect(insensitive.totalRowCount).toBe(1);
		expect(sensitive.totalRowCount).toBe(0);
	});

	test("sorts the complete filtered result before pagination", async () => {
		const adapter = createAdapter();

		const result = await adapter.select({
			table: "employees",
			columns: ["name", "age"],
			offset: 1,
			limit: 1,
			sortColumn: "age",
			sortOrder: CSortOrder.DescendingOrder
		});

		expect(result.totalRowCount).toBe(3);
		expect(result.rows).toEqual([{ name: "Carol", age: 35 }]);
	});
});
