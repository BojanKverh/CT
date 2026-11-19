/** @module Widgets/CDataWidgetMapper */
import { CObject } from "../core/CObject.js";
import { CSignal } from "../core/CSignal.js";
import { CAbstractItemModel } from "../models/CAbstractItemModel.js";
import { CModelIndex } from "../models/CModelIndex.js";
import { CValidatorState } from "../util/CValidator.js";
import { CCheckBox } from "./CCheckBox.js";
import { CComboBox } from "./CComboBox.js";
import { CDateEdit } from "./CDateEdit.js";
import { CDateTimeEdit } from "./CDateTimeEdit.js";
import { CDoubleSpinBox } from "./CDoubleSpinBox.js";
import { CLineEdit } from "./CLineEdit.js";
import { CNumberEdit } from "./CNumberEdit.js";
import { CSpinBox } from "./CSpinBox.js";
import { CTimeEdit } from "./CTimeEdit.js";
import { CWidget } from "./CWidget.js";

/** Determines when mapped widget values are written to the model. */
export enum CDataWidgetMapperSubmitPolicy {
    /**
    * Write mapped editor changes to the model automatically.
    */
    AutoSubmit,
    /**
    * Keep editor changes pending until submit() is requested.
    */
    ManualSubmit
}

type CMapping = {
	widget: CWidget;
	section: number;
};

/** Maps columns from one model row onto editor widgets.
 *
 * @example
 * Given an existing application, parent widget and editable model whose column 0 contains names, map an editor before selecting a row. ManualSubmit writes to the model only when submit() is called; backend persistence, if any, is a separate model operation.
 * ```ts
 * import {
 *     CAbstractItemModel, CWidget, CDataWidgetMapper, CDataWidgetMapperSubmitPolicy, CLineEdit, CPushButton
 * } from "canvas-toolkit-lib";
 *
 * function createMappedEditor(parent: CWidget, model: CAbstractItemModel) {
 *     const nameEdit = new CLineEdit(parent);
 *     const mapper = new CDataWidgetMapper(parent);
 *     mapper.setModel(model);
 *     mapper.setSubmitPolicy(CDataWidgetMapperSubmitPolicy.ManualSubmit);
 *     mapper.addMapping(nameEdit, 0);
 *     mapper.toFirst();
 *     const apply = new CPushButton(parent);
 *     apply.setText("Apply");
 *     apply.clicked.connect(() => {
 *         if (!mapper.submit()) console.warn("The row could not be updated");
 *     });
 *     return { mapper, nameEdit, apply };
 * }
 * ```
 */
export class CDataWidgetMapper extends CObject {
    /**
    * Emitted with the current index after navigation or programmatic selection changes it.
    * @group Signals
    */
    readonly currentIndexChanged = new CSignal<[number]>();
    /**
    * Emitted when submission encounters the first invalid mapping.
    * @group Signals
    */
    readonly validationFailed = new CSignal<[CWidget, number]>();

	#m_model: CAbstractItemModel | null = null;
	#m_mappings: CMapping[] = [];
	#m_currentIndex = -1;
	#m_submitPolicy = CDataWidgetMapperSubmitPolicy.AutoSubmit;
	#m_updatingWidgets = false;
	#m_submitting = false;

    /**
    * Model providing item data for this component.
    * The initial value is `null`.
    */
    model(): CAbstractItemModel | null {
		return this.#m_model;
	}

    /**
    * Connects a model and resets the current row to -1. Null clears mapped widgets. Subsequent model updates refresh mappings for the active row.
    */
    setModel(model: CAbstractItemModel | null): void {
		if (model === this.#m_model)
			return;

		this.#m_model = model;
		const previousIndex = this.#m_currentIndex;
		this.#m_currentIndex = -1;
		if (previousIndex !== -1)
			this.currentIndexChanged.emit(-1);

		if (model === null) {
			this.#clearWidgets();
			return;
		}

		model.dataChanged.connect((topLeft, bottomRight) => {
			if (this.#m_model !== model || this.#m_submitting
				|| this.#m_currentIndex < 0
				|| this.#m_currentIndex < topLeft.row()
				|| this.#m_currentIndex > bottomRight.row())
				return;

			for (const mapping of this.#m_mappings) {
				if (mapping.section >= topLeft.column()
					&& mapping.section <= bottomRight.column())
					this.#populateMapping(mapping);
			}
		});

		model.modelReset.connect(() => {
			if (this.#m_model !== model)
				return;
			this.#normalizeCurrentIndex();
		});
		model.rowsInserted.connect(() => {
			if (this.#m_model === model)
				this.#normalizeCurrentIndex();
		});
		model.rowsRemoved.connect(() => {
			if (this.#m_model === model)
				this.#normalizeCurrentIndex();
		});
		model.layoutChanged.connect(() => {
			if (this.#m_model === model)
				this.#populateWidgets();
		});
	}

    /**
    * Returns when widget edits are submitted. Defaults to AutoSubmit.
    */
    submitPolicy(): CDataWidgetMapperSubmitPolicy {
		return this.#m_submitPolicy;
	}

    /**
    * Chooses automatic or explicit submission of editor changes.
    */
    setSubmitPolicy(policy: CDataWidgetMapperSubmitPolicy): void {
		this.#m_submitPolicy = policy;
	}

    /**
    * Maps an editor to a zero-based model column. Supported widget types are populated from the mapper's current row.
    */
    addMapping(widget: CWidget, section: number): void {
		if (!Number.isInteger(section) || section < 0)
			throw new RangeError("The mapped section must be a non-negative integer.");
		if (!this.#supportsWidget(widget))
			throw new TypeError("The widget type is not supported by CDataWidgetMapper.");

		this.removeMapping(widget);
		const mapping = { widget, section };
		this.#m_mappings.push(mapping);
		this.#connectWidget(mapping);
		this.#populateMapping(mapping);
	}

    /**
    * Removes the association for an editor without destroying the widget.
    */
    removeMapping(widget: CWidget): void {
		this.#m_mappings = this.#m_mappings.filter(
			mapping => mapping.widget !== widget
		);
	}

    /**
    * Removes all editor-to-column associations.
    */
    clearMapping(): void {
		this.#m_mappings = [];
	}

    /**
    * Returns the model column mapped to an editor, or -1 when unmapped.
    */
    mappedSection(widget: CWidget): number {
		return this.#m_mappings.find(mapping => mapping.widget === widget)
			?.section ?? -1;
	}

    /**
    * Returns the first editor mapped to the requested model column, or null.
    */
    mappedWidgetAt(section: number): CWidget | null {
		return this.#m_mappings.find(mapping => mapping.section === section)
			?.widget ?? null;
	}

    /**
    * Zero-based current item index.
    * The initial value is `-1`.
    */
    currentIndex(): number {
		return this.#m_currentIndex;
	}

    /**
    * Selects a valid model row, honoring submit policy before populating mapped widgets. Invalid row requests are ignored.
    */
    setCurrentIndex(index: number): void {
		const model = this.#m_model;
		if (model === null || index < 0 || index >= model.rowCount())
			return;
		if (index !== this.#m_currentIndex
			&& this.#m_submitPolicy === CDataWidgetMapperSubmitPolicy.AutoSubmit
			&& this.#m_currentIndex >= 0)
			if (!this.submit())
				return;
		this.#setCurrentIndex(index);
	}

    /** Sets the current row from an index belonging to the mapped model. */
    setCurrentModelIndex(index: CModelIndex): void {
		if (!index.isValid() || index.model() !== this.#m_model)
			return;

		this.setCurrentIndex(index.row());
	}

    /**
    * Selects row zero through setCurrentIndex().
    */
    toFirst(): void { this.setCurrentIndex(0); }
    /**
    * Selects the final model row when a model is installed.
    */
    toLast(): void {
		if (this.#m_model !== null)
			this.setCurrentIndex(this.#m_model.rowCount() - 1);
	}
    /**
    * Attempts to select the row after currentIndex().
    */
    toNext(): void { this.setCurrentIndex(this.#m_currentIndex + 1); }
    /**
    * Attempts to select the row before currentIndex().
    */
    toPrevious(): void { this.setCurrentIndex(this.#m_currentIndex - 1); }

    /**
    * Validates mapped editors and writes them to the active row. Returns false for unavailable rows, invalid input or rejected model edits.
    */
    submit(): boolean {
		const model = this.#m_model;
		if (model === null || this.#m_currentIndex < 0)
			return false;

		if (!this.#validateMappings())
			return false;

		const values = this.#m_mappings.map(mapping => ({
			mapping,
			value: this.#widgetValue(mapping.widget)
		}));
		this.#m_submitting = true;
		let accepted = true;
		try {
			for (const { mapping, value } of values) {
				const index = model.index(this.#m_currentIndex, mapping.section);
				if (!index.isValid() || !model.setItemData(index, value)) {
					accepted = false;
					break;
				}
			}
		} finally {
			this.#m_submitting = false;
		}
		this.#populateWidgets();
		return accepted;
	}

    /**
    * Reloads active-row values from the model into mapped editors.
    */
    revert(): void {
		this.#populateWidgets();
	}

	#setCurrentIndex(index: number): void {
		if (index === this.#m_currentIndex) {
			this.#populateWidgets();
			return;
		}
		this.#m_currentIndex = index;
		this.#populateWidgets();
		this.currentIndexChanged.emit(index);
	}

	#normalizeCurrentIndex(): void {
		const count = this.#m_model?.rowCount() ?? 0;
		if (count === 0) {
			this.#setCurrentIndex(-1);
			this.#clearWidgets();
		} else if (this.#m_currentIndex >= count)
			this.#setCurrentIndex(count - 1);
		else
			this.#populateWidgets();
	}

	#populateWidgets(): void {
		for (const mapping of this.#m_mappings)
			this.#populateMapping(mapping);
	}

	#populateMapping(mapping: CMapping): void {
		const model = this.#m_model;
		if (model === null || this.#m_currentIndex < 0)
			return;
		const index = model.index(this.#m_currentIndex, mapping.section);
		if (!index.isValid())
			return;

		this.#m_updatingWidgets = true;
		this.#setWidgetValue(mapping.widget, model.data(index));
		this.#m_updatingWidgets = false;
	}

	#clearWidgets(): void {
		this.#m_updatingWidgets = true;
		for (const mapping of this.#m_mappings)
			this.#setWidgetValue(mapping.widget, null);
		this.#m_updatingWidgets = false;
	}

	#connectWidget(mapping: CMapping): void {
		const submit = (): void => {
			if (this.#m_updatingWidgets
				|| this.#m_submitPolicy !== CDataWidgetMapperSubmitPolicy.AutoSubmit
				|| !this.#m_mappings.includes(mapping))
				return;
			this.#submitMapping(mapping);
		};
		const widget = mapping.widget;
		if (widget instanceof CNumberEdit) {
			widget.editingFinished.connect(submit);
		} else if (widget instanceof CLineEdit) {
			widget.editingFinished.connect(submit);
			widget.textChanged.connect(() => {
				if (this.#m_mappings.includes(mapping)
					&& widget.hasValidationError()
					&& this.#hasAcceptableInput(widget))
					widget.setValidationError(false);
			});
		} else if (widget instanceof CComboBox)
			widget.activated.connect(submit);
		else if (widget instanceof CCheckBox)
			widget.toggled.connect(submit);
		else if (widget instanceof CSpinBox || widget instanceof CDoubleSpinBox)
			widget.valueChanged.connect(submit);
		else if (widget instanceof CDateTimeEdit)
			widget.dateTimeChanged.connect(submit);
		else if (widget instanceof CDateEdit)
			widget.dateChanged.connect(submit);
		else if (widget instanceof CTimeEdit)
			widget.timeChanged.connect(submit);
	}

	#submitMapping(mapping: CMapping): boolean {
		const model = this.#m_model;
		if (model === null || this.#m_currentIndex < 0)
			return false;
		if (!this.#hasAcceptableInput(mapping.widget)) {
			this.#reportValidationFailure(mapping);
			return false;
		}
		if (mapping.widget instanceof CLineEdit)
			mapping.widget.setValidationError(false);
		const index = model.index(this.#m_currentIndex, mapping.section);
		if (!index.isValid())
			return false;
		this.#m_submitting = true;
		let accepted = false;
		try {
			accepted = model.setItemData(index, this.#widgetValue(mapping.widget));
		} finally {
			this.#m_submitting = false;
		}
		if (accepted)
			this.#populateMapping(mapping);
		return accepted;
	}

	#supportsWidget(widget: CWidget): boolean {
		return widget instanceof CLineEdit || widget instanceof CSpinBox
			|| widget instanceof CDoubleSpinBox || widget instanceof CComboBox
			|| widget instanceof CCheckBox || widget instanceof CDateEdit
			|| widget instanceof CTimeEdit || widget instanceof CDateTimeEdit;
	}

	#hasAcceptableInput(widget: CWidget): boolean {
		if (widget instanceof CNumberEdit)
			return widget.commit();
		if (!(widget instanceof CLineEdit))
			return true;

		const validator = widget.validator();
		if (validator === null)
			return true;
		if (typeof validator === "function")
			return validator(widget.text());

		return validator.validate(widget.text())
			=== CValidatorState.Acceptable;
	}

	#validateMappings(): boolean {
		let firstInvalid: CMapping | null = null;

		for (const mapping of this.#m_mappings) {
			const acceptable = this.#hasAcceptableInput(mapping.widget);
			if (mapping.widget instanceof CLineEdit)
				mapping.widget.setValidationError(!acceptable);
			if (!acceptable && firstInvalid === null)
				firstInvalid = mapping;
		}

		if (firstInvalid === null)
			return true;

		this.#reportValidationFailure(firstInvalid);
		return false;
	}

	#reportValidationFailure(mapping: CMapping): void {
		if (mapping.widget instanceof CLineEdit)
			mapping.widget.setValidationError(true);
		mapping.widget.setFocus();
		this.validationFailed.emit(mapping.widget, mapping.section);
	}

	#setWidgetValue(widget: CWidget, value: unknown): void {
		if (widget instanceof CNumberEdit) {
			const number = Number(value);
			widget.setValue(Number.isFinite(number) ? number : 0);
		} else if (widget instanceof CLineEdit)
			widget.setText(value === null || value === undefined ? "" : String(value));
		else if (widget instanceof CSpinBox)
			widget.setValue(typeof value === "number" ? value : Number(value) || 0);
		else if (widget instanceof CDoubleSpinBox)
			widget.setValue(typeof value === "number" ? value : Number(value) || 0);
		else if (widget instanceof CComboBox) {
			widget.setCurrentIndex(-1);
			widget.setCurrentText(value === null || value === undefined ? "" : String(value));
		} else if (widget instanceof CCheckBox)
			widget.setChecked(Boolean(value));
		else if (value instanceof Date && !Number.isNaN(value.getTime())) {
			if (widget instanceof CDateTimeEdit)
				widget.setDateTime(value);
			else if (widget instanceof CDateEdit)
				widget.setDate(value);
			else if (widget instanceof CTimeEdit)
				widget.setTime(value);
		}
	}

	#widgetValue(widget: CWidget): unknown {
		if (widget instanceof CNumberEdit) return widget.value();
		if (widget instanceof CLineEdit) return widget.text();
		if (widget instanceof CSpinBox || widget instanceof CDoubleSpinBox)
			return widget.value();
		if (widget instanceof CComboBox) return widget.currentText();
		if (widget instanceof CCheckBox) return widget.isChecked();
		if (widget instanceof CDateTimeEdit) return widget.dateTime();
		if (widget instanceof CDateEdit) return widget.date();
		if (widget instanceof CTimeEdit) return widget.time();
		return null;
	}
}
