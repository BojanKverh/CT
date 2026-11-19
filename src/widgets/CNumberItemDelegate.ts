/** @module Widgets/CNumberItemDelegate */
import { CSignal } from "../core/CSignal.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import type { CAbstractItemModel } from "../models/CAbstractItemModel.js";
import type { CModelIndex } from "../models/CModelIndex.js";
import { CAbstractItemDelegate } from "./CAbstractItemDelegate.js";
import { CNumberEdit } from "./CNumberEdit.js";
import type { CWidget } from "./CWidget.js";

class CNumberItemDelegateEditor extends CNumberEdit {
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
        if (event.key() === "Escape") {
            event.accept();
            this.canceled.emit();
            return;
        }
        if (event.key() === "Enter" || event.key() === "Return") {
            super.keyPressEvent(event);
            // Invalid expressions show ERR and remain available for correction.
            if (!this.hasValidationError()) this.accepted.emit();
            return;
        }
        super.keyPressEvent(event);
    }
}

/**
 * Optional arithmetic editor for item views. Writes only the numeric result;
 * formulas are local to an editing session and are not stored in the model.
 */
export class CNumberItemDelegate extends CAbstractItemDelegate {
    #m_decimals = 2;

    /**
    * Number of decimal places used to format the numeric value.
    * The initial value is `2`.
    */
    decimals(): number { return this.#m_decimals; }

    /** Maximum display precision; the model value is not rounded. */
    setDecimals(decimals: number): void {
        if (Number.isFinite(decimals))
            this.#m_decimals = Math.max(0, Math.min(20, Math.trunc(decimals)));
    }

    override createEditor(parent: CWidget, _index: CModelIndex): CWidget {
        const editor = new CNumberItemDelegateEditor(parent);
        editor.setDecimals(this.#m_decimals);
        editor.accepted.connect(() => {
            this.commitData.emit(editor);
            this.closeEditor.emit(editor);
        });
        editor.canceled.connect(() => this.closeEditor.emit(editor));
        return editor;
    }

    override setEditorData(editor: CWidget, index: CModelIndex): void {
        if (!(editor instanceof CNumberEdit)) return;
        const value = Number(index.model()?.data(index));
        if (Number.isFinite(value)) {
            editor.setValue(value);
            editor.selectAll();
        }
    }

    override setModelData(editor: CWidget, model: CAbstractItemModel, index: CModelIndex): void {
        if (editor instanceof CNumberEdit && editor.commit())
            model.setItemData(index, editor.value());
    }
}
