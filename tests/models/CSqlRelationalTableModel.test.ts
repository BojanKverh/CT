import { describe, expect, test, vi } from "vitest";
import { CSqlRelation } from "../../src/models/CSqlRelation.js";
import { CSqlEditStrategy } from "../../src/models/CSqlEditStrategy.js";
import { CSqlRelationalTableModel } from "../../src/models/CSqlRelationalTableModel.js";
import { CMemorySqlTableAdapter } from "../../src/models/CMemorySqlTableAdapter.js";

function createModel(): CSqlRelationalTableModel {
	const adapter = new CMemorySqlTableAdapter({
		employees: [
			{ id: 1, name: "Alice", country_id: 2 },
			{ id: 2, name: "Bob", country_id: 1 },
			{ id: 3, name: "Carol", country_id: 99 }
		],
		countries: [
			{ id: 1, name: "Slovenia" },
			{ id: 2, name: "Austria" }
		]
	});
	const model = new CSqlRelationalTableModel(adapter);
	model.setTable("employees");
	model.setColumns(["id", "name", "country_id"]);
	model.setRelation(2, new CSqlRelation("countries", "id", "name"));
	return model;
}

describe("CSqlRelationalTableModel", () => {
	test("CSqlRelation exposes its definition", () => {
		const relation = new CSqlRelation("countries", "id", "name");

		expect(relation.tableName()).toBe("countries");
		expect(relation.indexColumn()).toBe("id");
		expect(relation.displayColumn()).toBe("name");
		expect(relation.isValid()).toBe(true);
	});

	test("select loads relation rows and displays labels", async () => {
		const model = createModel();

		expect(await model.select()).toBe(true);

		expect(model.data(model.index(0, 2))).toBe("Austria");
		expect(model.data(model.index(1, 2))).toBe("Slovenia");
		expect(model.rawData(model.index(0, 2))).toBe(2);
		expect(model.relationDisplayValues(2)).toEqual([
			"Slovenia", "Austria"
		]);
	});

	test("an unknown foreign key remains visible", async () => {
		const model = createModel();
		await model.select();

		expect(model.data(model.index(2, 2))).toBe(99);
	});

	test("display values are converted back to foreign keys", async () => {
		const model = createModel();
		model.setEditStrategy(CSqlEditStrategy.OnManualSubmit);
		await model.select();
		const index = model.index(0, 2);

		expect(model.setItemData(index, "Slovenia")).toBe(true);
		expect(model.rawData(index)).toBe(1);
		expect(model.data(index)).toBe("Slovenia");
	});

	test("unknown display values are rejected", async () => {
		const model = createModel();
		await model.select();
		const index = model.index(0, 2);

		expect(model.setItemData(index, "Atlantis")).toBe(false);
		expect(model.rawData(index)).toBe(2);
	});

	test("relation selection failures are reported", async () => {
		const model = createModel();
		model.setRelation(2, new CSqlRelation("missing", "id", "name"));
		const error = vi.fn();
		model.errorOccurred.connect(error);

		expect(await model.select()).toBe(false);
		expect(error).toHaveBeenCalledOnce();
	});
});
