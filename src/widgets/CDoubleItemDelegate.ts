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

	minimum(): number {
		return this.#m_minimum;
	}

	maximum(): number {
		return this.#m_maximum;
	}

	singleStep(): number {
		return this.#m_singleStep;
	}

	decimals(): number {
		return this.#m_decimals;
	}

	setMinimum(minimum: number): void {
		this.setRange(minimum, this.#m_maximum);
	}

	setMaximum(maximum: number): void {
		this.setRange(this.#m_minimum, maximum);
	}

	setRange(minimum: number, maximum: number): void {
		if (!Number.isFinite(minimum) || !Number.isFinite(maximum))
			return;

		if (minimum > maximum)
			maximum = minimum;

		this.#m_minimum = minimum;
		this.#m_maximum = maximum;
	}

	setSingleStep(step: number): void {
		if (Number.isFinite(step))
			this.#m_singleStep = Math.max(0, step);
	}

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
