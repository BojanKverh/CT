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
	AutoSubmit,
	ManualSubmit
}

type CMapping = {
	widget: CWidget;
	section: number;
};

/** Maps columns from one model row onto editor widgets. */
export class CDataWidgetMapper extends CObject {
	readonly currentIndexChanged = new CSignal<[number]>();
	/** Emitted when submission encounters the first invalid mapping. */
	readonly validationFailed = new CSignal<[CWidget, number]>();

	#m_model: CAbstractItemModel | null = null;
	#m_mappings: CMapping[] = [];
	#m_currentIndex = -1;
	#m_submitPolicy = CDataWidgetMapperSubmitPolicy.AutoSubmit;
	#m_updatingWidgets = false;
	#m_submitting = false;

	/**
	 * Reads the model supplying the mapped rows.
	 * @returns The attached model, or `null` if detached.
	 */
	model(): CAbstractItemModel | null {
		return this.#m_model;
	}

	/**
	 * Replaces the mapped model, resets the current row and listens for changes in the new model. A detached mapper clears widget values.
	 * @param model Model to attach, or `null` to detach.
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
	 * Reads when mapped widget edits are submitted.
	 * @returns `AutoSubmit` or `ManualSubmit`.
	 */
	submitPolicy(): CDataWidgetMapperSubmitPolicy {
		return this.#m_submitPolicy;
	}

	/**
	 * Changes when edits are written to the model.
	 * @param policy Submission policy to use for subsequent edits and navigation.
	 */
	setSubmitPolicy(policy: CDataWidgetMapperSubmitPolicy): void {
		this.#m_submitPolicy = policy;
	}

	/**
	 * Maps a supported editor to a model column and populates it from the current row. Replaces any existing mapping for that widget.
	 * @param widget Supported editor widget, such as a line edit, check box, combo box or numeric editor.
	 * @param section Nonnegative integer model column. Invalid sections throw `RangeError` and unsupported widgets throw `TypeError`.
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
	 * Stops synchronizing a widget by removing its mapping.
	 * @param widget Widget whose mapping should be removed.
	 */
	removeMapping(widget: CWidget): void {
		this.#m_mappings = this.#m_mappings.filter(
			mapping => mapping.widget !== widget
		);
	}

	/** Removes every widget-to-column mapping. */
	clearMapping(): void {
		this.#m_mappings = [];
	}

	/**
	 * Looks up the model column assigned to a widget.
	 * @param widget Mapped widget to look up.
	 * @returns Zero-based column, or `-1` if the widget is not mapped.
	 */
	mappedSection(widget: CWidget): number {
		return this.#m_mappings.find(mapping => mapping.widget === widget)
			?.section ?? -1;
	}

	/**
	 * Finds the first widget assigned to a model column.
	 * @param section Zero-based model column.
	 * @returns The first matching widget, or `null` if no widget is mapped to the column.
	 */
	mappedWidgetAt(section: number): CWidget | null {
		return this.#m_mappings.find(mapping => mapping.section === section)
			?.widget ?? null;
	}

	/**
	 * Reads the row currently displayed by the mapped widgets.
	 * @returns Zero-based model row, or `-1` if none is active.
	 */
	currentIndex(): number {
		return this.#m_currentIndex;
	}

	/**
	 * Selects a row and populates mapped widgets. In auto-submit mode, a failed submission of the previous row prevents navigation.
	 * @param index Zero-based row within the attached model.
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

	/**
	 * Selects the row of a valid index owned by the attached model using the normal submission rules.
	 * @param index Index in the attached model. Its column is ignored.
	 */
	setCurrentModelIndex(index: CModelIndex): void {
		if (!index.isValid() || index.model() !== this.#m_model)
			return;

		this.setCurrentIndex(index.row());
	}

	/** Attempts to navigate to the first row using the current submission policy. */
	toFirst(): void { this.setCurrentIndex(0); }
	/** Attempts to navigate to the last row of the attached model using the current submission policy. */
	toLast(): void {
		if (this.#m_model !== null)
			this.setCurrentIndex(this.#m_model.rowCount() - 1);
	}
	/** Attempts to move one row forward. When no row is active, starts at the first row. */
	toNext(): void { this.setCurrentIndex(this.#m_currentIndex + 1); }
	/** Attempts to move one row backward, leaving the first row selected at the lower boundary. */
	toPrevious(): void { this.setCurrentIndex(this.#m_currentIndex - 1); }

	/**
	 * Validates mapped widgets and writes their values to the current model row. Writes stop on the first rejected item and widgets are then repopulated from the model.
	 * @returns `true` if every write was accepted, or `false` if no row is active, validation fails or the model refuses a write.
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

	/** Repopulates mapped widgets from the model's current row, discarding unsubmitted widget edits. */
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
