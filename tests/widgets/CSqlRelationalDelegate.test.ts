import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { CRect } from "../../src/geometry/CRect.js";
import { CSqlRelation } from "../../src/models/CSqlRelation.js";
import { CSqlEditStrategy } from "../../src/models/CSqlEditStrategy.js";
import { CSqlRelationalTableModel } from "../../src/models/CSqlRelationalTableModel.js";
import { CMemorySqlTableAdapter } from "../../src/models/CMemorySqlTableAdapter.js";
import { CComboBox } from "../../src/widgets/CComboBox.js";
import { CLineEdit } from "../../src/widgets/CLineEdit.js";
import { CSqlRelationalDelegate } from "../../src/widgets/CSqlRelationalDelegate.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

async function createModel(): Promise<CSqlRelationalTableModel> {
	const model = new CSqlRelationalTableModel(new CMemorySqlTableAdapter({
		employees: [{ id: 1, name: "Alice", country_id: 2, active: true }],
		countries: [
			{ id: 1, name: "Slovenia" },
			{ id: 2, name: "Austria" }
		]
	}));
	model.setTable("employees");
	model.setColumns(["id", "name", "country_id", "active"]);
	model.setRelation(2, new CSqlRelation("countries", "id", "name"));
	model.setEditStrategy(CSqlEditStrategy.OnManualSubmit);
	await model.select();
	return model;
}

describe("CSqlRelationalDelegate", () => {
	beforeEach(() => new CApplication(createTestCanvas()));
	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("creates a combo box containing related display values", async () => {
		const model = await createModel();
		const index = model.index(0, 2);
		const delegate = new CSqlRelationalDelegate();
		const editor = delegate.createEditor(new CWidget(), index);

		expect(editor).toBeInstanceOf(CComboBox);
		expect((editor as CComboBox).count()).toBe(2);
		delegate.setEditorData(editor!, index);
		expect((editor as CComboBox).currentText()).toBe("Austria");
	});

	test("writes the selected relation key to the model", async () => {
		const model = await createModel();
		const index = model.index(0, 2);
		const delegate = new CSqlRelationalDelegate();
		const editor = delegate.createEditor(new CWidget(), index) as CComboBox;
		editor.setCurrentIndex(0);

		delegate.setModelData(editor, model, index);

		expect(model.rawData(index)).toBe(1);
		expect(model.data(index)).toBe("Slovenia");
	});

	test("uses a line editor for ordinary columns", async () => {
		const model = await createModel();
		const index = model.index(0, 1);
		const delegate = new CSqlRelationalDelegate();

		expect(delegate.createEditor(new CWidget(), index))
			.toBeInstanceOf(CLineEdit);
	});

	test("opens the relation popup when editing starts", async () => {
		const model = await createModel();
		const index = model.index(0, 2);
		const delegate = new CSqlRelationalDelegate();
		const editor = delegate.createEditor(new CWidget(), index)!;
		delegate.setEditorData(editor, index);

		delegate.editorShown(editor, index);

		expect((editor as CComboBox).popup().isOpen()).toBe(true);
	});

	test("preserves default boolean checkbox interaction", async () => {
		const model = await createModel();
		const index = model.index(0, 3);
		const delegate = new CSqlRelationalDelegate();
		const event = new CMouseEvent(
			CEventType.MousePress,
			50,
			15,
			CMouseButton.LeftButton
		);

		const handled = delegate.editorEvent(
			event,
			model,
			index,
			new CRect(0, 0, 100, 30)
		);

		expect(handled).toBe(true);
		expect(event.isAccepted()).toBe(true);
		expect(model.data(index)).toBe(false);
	});
});
