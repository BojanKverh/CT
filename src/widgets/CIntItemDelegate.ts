import { CSignal } from "../core/CSignal.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CAbstractItemModel } from "../models/CAbstractItemModel.js";
import { CModelIndex } from "../models/CModelIndex.js";
import { CAbstractItemDelegate } from "./CAbstractItemDelegate.js";
import { CSpinBox } from "./CSpinBox.js";
import { CWidget } from "./CWidget.js";

class CIntItemDelegateSpinBox extends CSpinBox {
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

/** Item delegate using a spin box for integer values. */
export class CIntItemDelegate extends CAbstractItemDelegate {
	#m_minimum = 0;
	#m_maximum = 100;
	#m_singleStep = 1;

	minimum(): number {
		return this.#m_minimum;
	}

	maximum(): number {
		return this.#m_maximum;
	}

	singleStep(): number {
		return this.#m_singleStep;
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

		minimum = Math.trunc(minimum);
		maximum = Math.trunc(maximum);
		if (minimum > maximum)
			maximum = minimum;

		this.#m_minimum = minimum;
		this.#m_maximum = maximum;
	}

	setSingleStep(step: number): void {
		if (Number.isFinite(step))
			this.#m_singleStep = Math.max(0, Math.trunc(step));
	}

	override createEditor(
		parent: CWidget,
		_index: CModelIndex
	): CWidget {
		const editor = new CIntItemDelegateSpinBox(parent);
		editor.setFocusPolicy(CFocusPolicy.StrongFocus);
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
		if (!(editor instanceof CSpinBox))
			return;

		const value = Number(index.model()?.data(index));
		if (Number.isFinite(value))
			editor.setValue(Math.trunc(value));
	}

	override setModelData(
		editor: CWidget,
		model: CAbstractItemModel,
		index: CModelIndex
	): void {
		if (editor instanceof CSpinBox)
			model.setItemData(index, editor.value());
	}
}
