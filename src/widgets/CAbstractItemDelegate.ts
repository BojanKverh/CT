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

	/** Paints an item and returns whether the delegate handled it. */
	paint(
		_painter: CPainter,
		_rect: CRect,
		_index: CModelIndex,
		_widget: CWidget
	): boolean {
		return false;
	}

	/** Handles an item event and returns whether it was consumed. */
	editorEvent(
		_event: CEvent,
		_model: CAbstractItemModel,
		_index: CModelIndex,
		_rect: CRect
	): boolean {
		return false;
	}

	/**
	 * Creates an editor for an item.
	 *
	 * @param parent Parent widget for the editor.
	 * @param index Model index being edited.
	 */
	abstract createEditor(
		parent: CWidget,
		index: CModelIndex
	): CWidget | null;

	/**
	 * Copies model data into an editor.
	 */
	abstract setEditorData(
		editor: CWidget,
		index: CModelIndex
	): void;

	/**
	 * Writes editor data back to the model.
	 */
	abstract setModelData(
		editor: CWidget,
		model: CAbstractItemModel,
		index: CModelIndex
	): void;

	/**
	 * Updates the editor geometry to match an item rectangle.
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
