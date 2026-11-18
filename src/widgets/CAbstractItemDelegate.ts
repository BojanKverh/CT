import { CObject } from "../core/CObject.js";
import { CSignal } from "../core/CSignal.js";
import { CEvent } from "../events/CEvent.js";
import { CRect } from "../geometry/CRect.js";
import { CAbstractItemModel } from "../models/CAbstractItemModel.js";
import { CModelIndex } from "../models/CModelIndex.js";
import { CPainter } from "../painting/CPainter.js";
import { CWidget } from "./CWidget.js";

/**
 * Abstract base class for item view editors.
 */
export abstract class CAbstractItemDelegate extends CObject {
	/** Emitted when an editor wants its value written to the model. */
	readonly commitData = new CSignal<[CWidget]>();

	/** Emitted when an editor wants to be closed. */
	readonly closeEditor = new CSignal<[CWidget]>();

	/**
	 * Provides the custom cell-drawing hook. The base implementation leaves drawing to the view.
	 * @param _painter Painter to use for the cell.
	 * @param _rect Cell bounds in view content coordinates.
	 * @param _index Model index supplying the cell value.
	 * @param _widget View widget supplying the visual context.
	 * @returns `false` in the base implementation, meaning the delegate did not paint the cell.
	 */
	paint(
		_painter: CPainter,
		_rect: CRect,
		_index: CModelIndex,
		_widget: CWidget
	): boolean {
		return false;
	}

	/**
	 * Provides the inline edit event hook. The base implementation leaves the event unhandled.
	 * @param _event Event offered to the cell.
	 * @param _model Model containing the cell.
	 * @param _index Index of the target cell.
	 * @param _rect Cell rectangle used for hit testing.
	 * @returns `false` in the base implementation.
	 */
	editorEvent(
		_event: CEvent,
		_model: CAbstractItemModel,
		_index: CModelIndex,
		_rect: CRect
	): boolean {
		return false;
	}

	/**
	 * Creates an editor for a model cell when this delegate supports a separate editor.
	 * @param parent Parent widget that will own the editor.
	 * @param index Model index of the cell to edit.
	 * @returns New editor widget, or `null` when the delegate supplies no editor.
	 */
	abstract createEditor(
		parent: CWidget,
		index: CModelIndex
	): CWidget | null;

	/**
	 * Loads the model value into an editor created by the delegate.
	 * @param editor Editor to populate.
	 * @param index Model index supplying the initial value.
	 */
	abstract setEditorData(
		editor: CWidget,
		index: CModelIndex
	): void;

	/**
	 * Writes the editor's current value to the model cell.
	 * @param editor Editor containing the edited value.
	 * @param model Model to update.
	 * @param index Index of the destination cell.
	 */
	abstract setModelData(
		editor: CWidget,
		model: CAbstractItemModel,
		index: CModelIndex
	): void;

	/**
	 * Provides a hook for post-show actions such as displaying an editor popup. The base implementation has no effect.
	 * @param _editor Editor just shown by the view.
	 * @param _index Index of the cell being edited.
	 */
	editorShown(_editor: CWidget, _index: CModelIndex): void {
	}

	/**
	 * Updates the editor geometry to match an item rectangle.
	 * @param editor Editor.
	 * @param rect Rectangle defining the bounds.
	 */
	updateEditorGeometry(editor: CWidget, rect: CRect): void {
		editor.setGeometry(
			rect.x(),
			rect.y(),
			rect.width(),
			rect.height()
		);
	}
}
