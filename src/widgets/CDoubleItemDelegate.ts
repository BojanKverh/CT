import { CSignal } from "../core/CSignal.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CAbstractItemModel } from "../models/CAbstractItemModel.js";
import { CModelIndex } from "../models/CModelIndex.js";
import { CAbstractItemDelegate } from "./CAbstractItemDelegate.js";
import { CDoubleSpinBox } from "./CDoubleSpinBox.js";
import { CWidget } from "./CWidget.js";

class CDoubleItemDelegateSpinBox extends CDoubleSpinBox {
	readonly accepted = new CSignal<[]>();
	readonly canceled = new CSignal<[]>();

	/**
	 * Responds to a key press for the double item delegate spin box. May accept the event. May emit `accepted`, `canceled`.
	 * @param event Event for a key press.
	 */
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
	 * Reads the minimum.
	 * @returns The minimum.
	 */
	minimum(): number {
		return this.#m_minimum;
	}

	/**
	 * Reads the maximum.
	 * @returns The maximum.
	 */
	maximum(): number {
		return this.#m_maximum;
	}

	/**
	 * Reads the single step.
	 * @returns The single step.
	 */
	singleStep(): number {
		return this.#m_singleStep;
	}

	/**
	 * Reads the decimals.
	 * @returns The decimals.
	 */
	decimals(): number {
		return this.#m_decimals;
	}

	/**
	 * Sets the minimum.
	 * @param minimum Minimum.
	 */
	setMinimum(minimum: number): void {
		this.setRange(minimum, this.#m_maximum);
	}

	/**
	 * Sets the maximum.
	 * @param maximum Maximum.
	 */
	setMaximum(maximum: number): void {
		this.setRange(this.#m_minimum, maximum);
	}

	/**
	 * Sets the range. The implementation checks whether `minimum` is finite and checks whether `maximum` is finite. May update the minimum, the maximum.
	 * @param minimum Minimum.
	 * @param maximum Maximum.
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
	 * Sets the single step. The implementation checks whether `step` is finite.
	 * @param step Step.
	 */
	setSingleStep(step: number): void {
		if (Number.isFinite(step))
			this.#m_singleStep = Math.max(0, step);
	}

	/**
	 * Sets the decimals. The implementation checks whether `decimals` is finite.
	 * @param decimals Decimals.
	 */
	setDecimals(decimals: number): void {
		if (Number.isFinite(decimals))
			this.#m_decimals = Math.max(0, Math.min(100, Math.trunc(decimals)));
	}

	/**
	 * Creates a decimal spin box using the configured bounds, precision and step and connects its acceptance and cancellation to the delegate's editing signals.
	 * @param parent Widget that will own the editor.
	 * @param _index Model index of the edited cell. The initial cell value is applied separately by `setEditorData()`.
	 * @returns The new editor widget.
	 */
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

	/**
	 * Populates decimal spin box with the cell value converted to a finite number.
	 * @param editor Editor widget created for the cell.
	 * @param index Model index supplying the initial value.
	 */
	override setEditorData(editor: CWidget, index: CModelIndex): void {
		if (!(editor instanceof CDoubleSpinBox))
			return;

		const value = Number(index.model()?.data(index));
		if (Number.isFinite(value))
			editor.setValue(value);
	}

	/**
	 * Writes the editor's numeric value back to the target cell when the editor is applicable.
	 * @param editor Editor containing the edited value.
	 * @param model Model to update.
	 * @param index Index receiving the edited value.
	 */
	override setModelData(
		editor: CWidget,
		model: CAbstractItemModel,
		index: CModelIndex
	): void {
		if (editor instanceof CDoubleSpinBox)
			model.setItemData(index, editor.value());
	}
}
