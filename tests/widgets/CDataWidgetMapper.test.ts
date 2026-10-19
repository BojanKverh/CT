import { CNumberEdit } from "../../src/widgets/CNumberEdit.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CAbstractTableModel } from "../../src/models/CAbstractTableModel.js";
import { CModelIndex } from "../../src/models/CModelIndex.js";
import { CIntValidator } from "../../src/util/CIntValidator.js";
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

	test("manual submit rejects non-acceptable line edit input before writing", () => {
		const model = new MapperModel();
		const mapper = new CDataWidgetMapper();
		const name = new CLineEdit();
		const age = new CLineEdit();
		age.setValidator(new CIntValidator(0, 120));
		mapper.setModel(model);
		mapper.addMapping(name, 0);
		mapper.addMapping(age, 1);
		mapper.toFirst();
		mapper.setSubmitPolicy(CDataWidgetMapperSubmitPolicy.ManualSubmit);

		name.setText("Alicia");
		age.setText("-");

		expect(mapper.submit()).toBe(false);
		expect(model.rows[0]?.[0]).toBe("Alice");
		expect(model.rows[0]?.[1]).toBe(30);
		expect(name.text()).toBe("Alicia");
		expect(age.text()).toBe("-");
	});

	test("auto submit keeps the current row when pending input is invalid", () => {
		const model = new MapperModel();
		const mapper = new CDataWidgetMapper();
		const age = new CLineEdit();
		age.setValidator(new CIntValidator(0, 120));
		mapper.setModel(model);
		mapper.addMapping(age, 1);
		mapper.toFirst();
		age.setText("150");

		mapper.toNext();

		expect(mapper.currentIndex()).toBe(0);
		expect(model.rows[0]?.[1]).toBe(30);
		expect(age.text()).toBe("150");
	});

	test("validation failure marks and focuses the first invalid editor", () => {
		const model = new MapperModel();
		const mapper = new CDataWidgetMapper();
		const first = new CLineEdit();
		const second = new CLineEdit();
		const failed = vi.fn();
		first.setValidator(new CIntValidator(0, 120));
		second.setValidator(new CIntValidator(0, 120));
		mapper.setModel(model);
		mapper.addMapping(first, 1);
		mapper.addMapping(second, 2);
		mapper.toFirst();
		mapper.setSubmitPolicy(CDataWidgetMapperSubmitPolicy.ManualSubmit);
		mapper.validationFailed.connect(failed);
		first.setText("-");
		second.setText("999");

		expect(mapper.submit()).toBe(false);
		expect(first.hasValidationError()).toBe(true);
		expect(second.hasValidationError()).toBe(true);
		expect(first.hasFocus()).toBe(true);
		expect(failed).toHaveBeenCalledOnce();
		expect(failed).toHaveBeenCalledWith(first, 1);
	});

	test("editing invalid text to an acceptable value clears its marker", () => {
		const model = new MapperModel();
		const mapper = new CDataWidgetMapper();
		const age = new CLineEdit();
		age.setValidator(new CIntValidator(0, 120));
		mapper.setModel(model);
		mapper.addMapping(age, 1);
		mapper.toFirst();
		mapper.setSubmitPolicy(CDataWidgetMapperSubmitPolicy.ManualSubmit);
		age.setText("-");
		expect(mapper.submit()).toBe(false);
		expect(age.hasValidationError()).toBe(true);

		age.setText("32");

		expect(age.hasValidationError()).toBe(false);
	});

	test("supports function validators when submitting", () => {
		const model = new MapperModel();
		const mapper = new CDataWidgetMapper();
		const name = new CLineEdit();
		name.setValidator(text => text.length >= 3);
		mapper.setModel(model);
		mapper.addMapping(name, 0);
		mapper.toFirst();
		mapper.setSubmitPolicy(CDataWidgetMapperSubmitPolicy.ManualSubmit);
		name.setText("Al");

		expect(mapper.submit()).toBe(false);
		expect(model.rows[0]?.[0]).toBe("Alice");
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
    describe("number expression mapping", () => {
        function setup(policy = CDataWidgetMapperSubmitPolicy.ManualSubmit) {
            const model = new MapperModel();
            const mapper = new CDataWidgetMapper();
            const edit = new CNumberEdit();
            edit.resize(180, 28);
            mapper.setSubmitPolicy(policy);
            mapper.setModel(model);
            mapper.addMapping(edit, 1);
            mapper.toFirst();
            return { model, mapper, edit };
        }
        function draft(edit: CNumberEdit, text: string): void {
            edit.setFocus(); edit.selectAll(); edit.insert(text);
        }
        test("populates a number rather than treating the widget as a line edit", () => {
            const { mapper, edit } = setup();
            expect(edit.value()).toBe(30);
            expect(edit.expression()).toBe("30");
            mapper.toNext();
            expect(edit.value()).toBe(42);
        });
        test("submits a formula as a numeric result", () => {
            const { model, mapper, edit } = setup();
            draft(edit, "(60+40)*1.22");
            expect(model.rows[0]?.[1]).toBe(30);
            expect(mapper.submit()).toBe(true);
            expect(model.rows[0]?.[1]).toBe(122);
            expect(typeof model.rows[0]?.[1]).toBe("number");
            expect(edit.expression()).toBe("122");
        });
        test("display precision does not round the submitted result", () => {
            const { model, mapper, edit } = setup();
            edit.setDecimals(2);
            draft(edit, "1/3");
            expect(mapper.submit()).toBe(true);
            expect(model.rows[0]?.[1]).toBe(1/3);
        });
        test("manual submission rejects invalid arithmetic and focuses the editor", () => {
            const { model, mapper, edit } = setup();
            draft(edit, "1/0");
            const failed = vi.fn();
            mapper.validationFailed.connect(failed);
            expect(mapper.submit()).toBe(false);
            expect(model.rows[0]?.[1]).toBe(30);
            expect(edit.expression()).toBe("1/0");
            expect(edit.hasValidationError()).toBe(true);
            expect(edit.hasFocus()).toBe(true);
            expect(failed).toHaveBeenCalledExactlyOnceWith(edit, 1);
        });
        test("rejects every mapping before writing any fields", () => {
            const { model, mapper, edit } = setup();
            const name = new CLineEdit();
            mapper.clearMapping();
            mapper.addMapping(name, 0);
            mapper.addMapping(edit, 1);
            name.setText("Alicia");
            draft(edit, "2+");
            expect(mapper.submit()).toBe(false);
            expect(model.rows[0]?.[0]).toBe("Alice");
            expect(model.rows[0]?.[1]).toBe(30);
        });
        test("correcting an invalid expression allows a later submit", () => {
            const { model, mapper, edit } = setup();
            draft(edit, "2+");
            expect(mapper.submit()).toBe(false);
            draft(edit, "2+3");
            expect(mapper.submit()).toBe(true);
            expect(model.rows[0]?.[1]).toBe(5);
            expect(edit.hasValidationError()).toBe(false);
        });
        test("AutoSubmit commits on Enter", () => {
            const { model, edit } = setup(CDataWidgetMapperSubmitPolicy.AutoSubmit);
            draft(edit, "6*7");
            edit.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
            expect(model.rows[0]?.[1]).toBe(42);
        });
        test("AutoSubmit commits when focus moves to another widget", () => {
            const { model, edit } = setup(CDataWidgetMapperSubmitPolicy.AutoSubmit);
            draft(edit, "10*3,5");
            const other = new CLineEdit();
            other.setFocus();
            expect(model.rows[0]?.[1]).toBe(35);
        });
        test("AutoSubmit does not submit each intermediate numeric value", () => {
            const { model, edit } = setup(CDataWidgetMapperSubmitPolicy.AutoSubmit);
            draft(edit, "2+3");
            edit.commit();
            expect(edit.value()).toBe(5);
            expect(model.rows[0]?.[1]).toBe(30);
            edit.editingFinished.emit();
            expect(model.rows[0]?.[1]).toBe(5);
        });
        test("AutoSubmit prevents row navigation with invalid arithmetic", () => {
            const { model, mapper, edit } = setup(CDataWidgetMapperSubmitPolicy.AutoSubmit);
            draft(edit, "1/0");
            mapper.toNext();
            expect(mapper.currentIndex()).toBe(0);
            expect(model.rows[0]?.[1]).toBe(30);
            expect(edit.expression()).toBe("1/0");
        });
        test("AutoSubmit saves a valid formula before row navigation", () => {
            const { model, mapper, edit } = setup(CDataWidgetMapperSubmitPolicy.AutoSubmit);
            draft(edit, "6*7");
            mapper.toNext();
            expect(model.rows[0]?.[1]).toBe(42);
            expect(mapper.currentIndex()).toBe(1);
            expect(edit.expression()).toBe("42");
        });
        test("manual Enter does not write until submit is called", () => {
            const { model, mapper, edit } = setup();
            draft(edit, "6*7");
            edit.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
            expect(model.rows[0]?.[1]).toBe(30);
            expect(mapper.submit()).toBe(true);
            expect(model.rows[0]?.[1]).toBe(42);
        });
        test("revert discards a formula and clears its error", () => {
            const { mapper, edit } = setup();
            draft(edit, "1/0");
            expect(mapper.submit()).toBe(false);
            mapper.revert();
            expect(edit.expression()).toBe("30");
            expect(edit.value()).toBe(30);
            expect(edit.hasValidationError()).toBe(false);
        });
        test("external numeric data changes update the number editor", () => {
            const { model, edit } = setup();
            model.change(0, 1, 12.75);
            expect(edit.value()).toBe(12.75);
            expect(edit.expression()).toBe("12.75");
        });
        test("clearing the model resets a number editor to zero", () => {
            const { mapper, edit } = setup();
            mapper.setModel(null);
            expect(edit.value()).toBe(0);
            expect(edit.expression()).toBe("0");
            expect(edit.hasValidationError()).toBe(false);
        });
        test("removing a mapping stops automatic number submissions", () => {
            const { model, mapper, edit } = setup(CDataWidgetMapperSubmitPolicy.AutoSubmit);
            mapper.removeMapping(edit);
            draft(edit, "6*7");
            edit.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
            expect(model.rows[0]?.[1]).toBe(30);
        });
    });
});
