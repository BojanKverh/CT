/** @module Widgets/CDoubleItemDelegate */
import { CSignal } from "../core/CSignal.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CAbstractItemModel } from "../models/CAbstractItemModel.js";
import { CModelIndex } from "../models/CModelIndex.js";
import { CAbstractItemDelegate } from "./CAbstractItemDelegate.js";
import { CDoubleSpinBox } from "./CDoubleSpinBox.js";
import { CWidget } from "./CWidget.js";

class CDoubleItemDelegateSpinBox extends CDoubleSpinBox {
    /**
    * Emitted after the dialog's accept action completes.
    * @group Signals
    */
    readonly accepted = new CSignal<[]>();
    /**
    * Emitted when Escape cancels editor interaction; the delegate can close without committing.
    * @group Signals
    */
    readonly canceled = new CSignal<[]>();

	protected override keyPressEvent(event: CKeyEvent): void {
		if (event.key() === "Enter") {
			super.keyPressEvent(event);
			this.accepted.emit();
			return;
		}

		if (event.key() === "Escape") {
			event.accept();
			this.canceled.emit();
			return;
		}

		super.keyPressEvent(event);
	}
}

/** Item delegate using a double spin box for floating-point values. */
export class CDoubleItemDelegate extends CAbstractItemDelegate {
	#m_minimum = 0;
	#m_maximum = 99.99;
	#m_singleStep = 1;
	#m_decimals = 2;

    /**
    * Lower permitted value.
    * The initial value is `0`.
    */
    minimum(): number {
		return this.#m_minimum;
	}

    /**
    * Upper permitted value.
    * The initial value is `99.99`.
    */
    maximum(): number {
		return this.#m_maximum;
	}

    /**
    * Increment used for a single keyboard or step-button action.
    * The initial value is `1`.
    */
    singleStep(): number {
		return this.#m_singleStep;
	}

    /**
    * Number of decimal places used to format the numeric value.
    * The initial value is `2`.
    */
    decimals(): number {
		return this.#m_decimals;
	}

    /**
    * Sets the lower bound used by editors created for model cells.
    */
    setMinimum(minimum: number): void {
		this.setRange(minimum, this.#m_maximum);
	}

    /**
    * Sets the upper bound used by editors created for model cells.
    */
    setMaximum(maximum: number): void {
		this.setRange(this.#m_minimum, maximum);
	}

    /**
    * Configures inclusive numeric bounds applied to created cell editors.
    */
    setRange(minimum: number, maximum: number): void {
		if (!Number.isFinite(minimum) || !Number.isFinite(maximum))
			return;

		if (minimum > maximum)
			maximum = minimum;

		this.#m_minimum = minimum;
		this.#m_maximum = maximum;
	}

    /**
    * Configures the increment used by step controls in created editors.
    */
    setSingleStep(step: number): void {
		if (Number.isFinite(step))
			this.#m_singleStep = Math.max(0, step);
	}

    /**
    * Configures decimal precision for created editors and formatted numeric values.
    */
    setDecimals(decimals: number): void {
		if (Number.isFinite(decimals))
			this.#m_decimals = Math.max(0, Math.min(100, Math.trunc(decimals)));
	}

	override createEditor(
		parent: CWidget,
		_index: CModelIndex
	): CWidget {
		const editor = new CDoubleItemDelegateSpinBox(parent);
		editor.setFocusPolicy(CFocusPolicy.StrongFocus);
		editor.setDecimals(this.#m_decimals);
		editor.setRange(this.#m_minimum, this.#m_maximum);
		editor.setSingleStep(this.#m_singleStep);

		editor.accepted.connect(() => {
			this.commitData.emit(editor);
			this.closeEditor.emit(editor);
		});

		editor.canceled.connect(() => {
			this.closeEditor.emit(editor);
		});

		return editor;
	}

	override setEditorData(editor: CWidget, index: CModelIndex): void {
		if (!(editor instanceof CDoubleSpinBox))
			return;

		const value = Number(index.model()?.data(index));
		if (Number.isFinite(value))
			editor.setValue(value);
	}

	override setModelData(
		editor: CWidget,
		model: CAbstractItemModel,
		index: CModelIndex
	): void {
		if (editor instanceof CDoubleSpinBox)
			model.setItemData(index, editor.value());
	}
}
