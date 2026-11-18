import { CSignal } from "../core/CSignal.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import type { CAbstractItemModel } from "../models/CAbstractItemModel.js";
import type { CModelIndex } from "../models/CModelIndex.js";
import { CAbstractItemDelegate } from "./CAbstractItemDelegate.js";
import { CNumberEdit } from "./CNumberEdit.js";
import type { CWidget } from "./CWidget.js";

class CNumberItemDelegateEditor extends CNumberEdit {
    readonly accepted = new CSignal<[]>();
    readonly canceled = new CSignal<[]>();

    /**
     * Responds to a key press for the number item delegate editor. May accept the event. May emit `canceled`, `accepted`.
     * @param event Event for a key press.
     */
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
     * Reads the decimals.
     * @returns The decimals.
     */
    decimals(): number { return this.#m_decimals; }

    /**
     * Maximum display precision; the model value is not rounded.
     * @param decimals Decimals.
     */
    setDecimals(decimals: number): void {
        if (Number.isFinite(decimals))
            this.#m_decimals = Math.max(0, Math.min(20, Math.trunc(decimals)));
    }

    /**
     * Creates a numeric expression editor with the configured decimal precision and connects its acceptance and cancellation to the delegate's editing signals.
     * @param parent Widget that will own the editor.
     * @param _index Model index of the edited cell. The initial cell value is applied separately by `setEditorData()`.
     * @returns The new editor widget.
     */
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

    /**
     * Populates expression editor with the cell value converted to a finite number.
     * @param editor Editor widget created for the cell.
     * @param index Model index supplying the initial value.
     */
    override setEditorData(editor: CWidget, index: CModelIndex): void {
        if (!(editor instanceof CNumberEdit)) return;
        const value = Number(index.model()?.data(index));
        if (Number.isFinite(value)) {
            editor.setValue(value);
            editor.selectAll();
        }
    }

    /**
     * Evaluates the pending expression and writes its numeric value only if evaluation succeeds.
     * @param editor Expression editor containing the edited value.
     * @param model Model to update.
     * @param index Index receiving the evaluated value.
     */
    override setModelData(editor: CWidget, model: CAbstractItemModel, index: CModelIndex): void {
        if (editor instanceof CNumberEdit && editor.commit())
            model.setItemData(index, editor.value());
    }
}
