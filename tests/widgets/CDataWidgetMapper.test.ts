import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CAbstractTableModel } from "../../src/models/CAbstractTableModel.js";
import { CModelIndex } from "../../src/models/CModelIndex.js";
import { CCheckBox } from "../../src/widgets/CCheckBox.js";
import { CComboBox } from "../../src/widgets/CComboBox.js";
import {
	CDataWidgetMapper,
	CDataWidgetMapperSubmitPolicy
} from "../../src/widgets/CDataWidgetMapper.js";
import { CDateEdit } from "../../src/widgets/CDateEdit.js";
import { CDateTimeEdit } from "../../src/widgets/CDateTimeEdit.js";
import { CDoubleSpinBox } from "../../src/widgets/CDoubleSpinBox.js";
import { CLineEdit } from "../../src/widgets/CLineEdit.js";
import { CSpinBox } from "../../src/widgets/CSpinBox.js";
import { CTimeEdit } from "../../src/widgets/CTimeEdit.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

class MapperModel extends CAbstractTableModel {
	rows: unknown[][] = [
		["Alice", 30, 12.5, "Developer", true,
			new Date(2026, 0, 2, 8, 30, 0)],
		["Bob", 42, 18.75, "Manager", false,
			new Date(2027, 3, 5, 14, 45, 10)]
	];

	override rowCount(): number { return this.rows.length; }
	override columnCount(): number { return this.rows[0]?.length ?? 0; }
	override data(index: CModelIndex): unknown {
		return index.isValid() ? this.rows[index.row()]?.[index.column()] : null;
	}
	override isEditable(): boolean { return true; }
	override setItemData(index: CModelIndex, value: unknown): boolean {
		const row = this.rows[index.row()];
		if (!index.isValid() || row === undefined)
			return false;
		row[index.column()] = value;
		this.emitDataChanged(index, index);
		return true;
	}

	change(row: number, column: number, value: unknown): void {
		this.setItemData(this.index(row, column), value);
	}

	resetRows(rows: unknown[][]): void {
		this.rows = rows;
		this.resetModel();
	}
}

describe("CDataWidgetMapper", () => {
	beforeEach(() => { new CApplication(createTestCanvas()); });
	afterEach(() => {
		if (CApplication.exists()) CApplication.instance().destroy();
	});

	test("starts without a model or current row", () => {
		const mapper = new CDataWidgetMapper();
		expect(mapper.model()).toBeNull();
		expect(mapper.currentIndex()).toBe(-1);
		expect(mapper.submitPolicy()).toBe(CDataWidgetMapperSubmitPolicy.AutoSubmit);
	});

	test("maps widgets to sections and populates the current row", () => {
		const model = new MapperModel();
		const mapper = new CDataWidgetMapper();
		const name = new CLineEdit();
		const age = new CSpinBox();
		const active = new CCheckBox();

		mapper.setModel(model);
		mapper.addMapping(name, 0);
		mapper.addMapping(age, 1);
		mapper.addMapping(active, 4);
		mapper.toFirst();

		expect(name.text()).toBe("Alice");
		expect(age.value()).toBe(30);
		expect(active.isChecked()).toBe(true);
		expect(mapper.mappedSection(age)).toBe(1);
		expect(mapper.mappedWidgetAt(4)).toBe(active);
	});

	test("navigates between model rows", () => {
		const model = new MapperModel();
		const mapper = new CDataWidgetMapper();
		const name = new CLineEdit();
		mapper.setModel(model);
		mapper.addMapping(name, 0);

		mapper.toFirst();
		expect(name.text()).toBe("Alice");
		mapper.toNext();
		expect(name.text()).toBe("Bob");
		mapper.toPrevious();
		expect(name.text()).toBe("Alice");
		mapper.toLast();
		expect(mapper.currentIndex()).toBe(1);
	});

	test("emits currentIndexChanged only for a changed valid row", () => {
		const mapper = new CDataWidgetMapper();
		const changed = vi.fn();
		mapper.currentIndexChanged.connect(changed);
		mapper.setModel(new MapperModel());
		mapper.toFirst();
		mapper.toFirst();
		mapper.setCurrentIndex(99);
		expect(changed).toHaveBeenCalledTimes(1);
		expect(changed).toHaveBeenLastCalledWith(0);
	});

	test("sets the current row from a model index", () => {
		const model = new MapperModel();
		const mapper = new CDataWidgetMapper();
		const name = new CLineEdit();
		mapper.setModel(model);
		mapper.addMapping(name, 0);

		mapper.setCurrentModelIndex(model.index(1, 3));

		expect(mapper.currentIndex()).toBe(1);
		expect(name.text()).toBe("Bob");
	});

	test("ignores invalid and foreign model indexes", () => {
		const model = new MapperModel();
		const mapper = new CDataWidgetMapper();
		mapper.setModel(model);
		mapper.toFirst();

		mapper.setCurrentModelIndex(new CModelIndex());
		mapper.setCurrentModelIndex(new MapperModel().index(1, 0));

		expect(mapper.currentIndex()).toBe(0);
	});

	test("auto submit writes widget changes to the model", () => {
		const model = new MapperModel();
		const mapper = new CDataWidgetMapper();
		const name = new CLineEdit();
		const age = new CSpinBox();
		const active = new CCheckBox();
		mapper.setModel(model);
		mapper.addMapping(name, 0);
		mapper.addMapping(age, 1);
		mapper.addMapping(active, 4);
		mapper.toFirst();

		name.setText("Alicia");
		name.editingFinished.emit();
		age.setValue(31);
		active.setChecked(false);

		expect(model.rows[0]?.slice(0, 2)).toEqual(["Alicia", 31]);
		expect(model.rows[0]?.[4]).toBe(false);
	});

	test("manual submit delays changes and revert restores model data", () => {
		const model = new MapperModel();
		const mapper = new CDataWidgetMapper();
		const name = new CLineEdit();
		mapper.setModel(model);
		mapper.addMapping(name, 0);
		mapper.toFirst();
		mapper.setSubmitPolicy(CDataWidgetMapperSubmitPolicy.ManualSubmit);

		name.setText("Alicia");
		name.editingFinished.emit();
		expect(model.rows[0]?.[0]).toBe("Alice");
		mapper.revert();
		expect(name.text()).toBe("Alice");

		name.setText("Alicia");
		expect(mapper.submit()).toBe(true);
		expect(model.rows[0]?.[0]).toBe("Alicia");
	});

	test("auto submit saves pending line edit text before navigation", () => {
		const model = new MapperModel();
		const mapper = new CDataWidgetMapper();
		const name = new CLineEdit();
		mapper.setModel(model);
		mapper.addMapping(name, 0);
		mapper.toFirst();
		name.setText("Alicia");
		mapper.toNext();
		expect(model.rows[0]?.[0]).toBe("Alicia");
		expect(name.text()).toBe("Bob");
	});

	test("supports combo box and double spin box mappings", () => {
		const model = new MapperModel();
		const mapper = new CDataWidgetMapper();
		const salary = new CDoubleSpinBox();
		const occupation = new CComboBox();
		occupation.addItems(["Developer", "Manager"]);
		mapper.setModel(model);
		mapper.addMapping(salary, 2);
		mapper.addMapping(occupation, 3);
		mapper.toLast();
		expect(salary.value()).toBe(18.75);
		expect(occupation.currentText()).toBe("Manager");

		occupation.setCurrentIndex(0);
		occupation.activated.emit(0);
		expect(model.rows[1]?.[3]).toBe("Developer");
	});

	test("supports date, time and date-time mappings", () => {
		const model = new MapperModel();
		const mapper = new CDataWidgetMapper();
		const date = new CDateEdit();
		const time = new CTimeEdit();
		const dateTime = new CDateTimeEdit();
		mapper.setModel(model);
		mapper.addMapping(date, 5);
		mapper.addMapping(time, 5);
		mapper.addMapping(dateTime, 5);
		mapper.toFirst();

		expect(date.date().getDate()).toBe(2);
		expect(time.time().getHours()).toBe(8);
		expect(dateTime.dateTime().getFullYear()).toBe(2026);
	});

	test("updates a mapped widget when current model data changes", () => {
		const model = new MapperModel();
		const mapper = new CDataWidgetMapper();
		const name = new CLineEdit();
		mapper.setModel(model);
		mapper.addMapping(name, 0);
		mapper.toFirst();
		model.change(0, 0, "Alicia");
		expect(name.text()).toBe("Alicia");
		model.change(1, 0, "Robert");
		expect(name.text()).toBe("Alicia");
	});

	test("normalizes the current row after a model reset", () => {
		const model = new MapperModel();
		const mapper = new CDataWidgetMapper();
		const name = new CLineEdit();
		mapper.setModel(model);
		mapper.addMapping(name, 0);
		mapper.toLast();
		model.resetRows([["Only row"]]);
		expect(mapper.currentIndex()).toBe(0);
		expect(name.text()).toBe("Only row");
	});

	test("removeMapping and clearMapping stop automatic submission", () => {
		const model = new MapperModel();
		const mapper = new CDataWidgetMapper();
		const name = new CLineEdit();
		mapper.setModel(model);
		mapper.addMapping(name, 0);
		mapper.toFirst();
		mapper.removeMapping(name);
		name.setText("Ignored");
		name.editingFinished.emit();
		expect(model.rows[0]?.[0]).toBe("Alice");
		mapper.addMapping(name, 0);
		mapper.clearMapping();
		expect(mapper.mappedSection(name)).toBe(-1);
	});

	test("rejects invalid sections and unsupported widgets", () => {
		const mapper = new CDataWidgetMapper();
		expect(() => mapper.addMapping(new CLineEdit(), -1)).toThrow(RangeError);
		expect(() => mapper.addMapping(new CWidget(), 0)).toThrow(TypeError);
	});
});
