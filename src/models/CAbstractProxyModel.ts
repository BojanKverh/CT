import type { CUndoStack } from "../core/CUndoStack.js";
import { COrientation } from "../gui/COrientation.js";
import { CAbstractItemModel, type CItemTextEdit, type CItemTextEditError } from "./CAbstractItemModel.js";
import { CModelIndex } from "./CModelIndex.js";

/**
 * Base class for models that expose a transformed view of another model.
 */
export abstract class CAbstractProxyModel extends CAbstractItemModel {
	#m_sourceModel: CAbstractItemModel | null = null;
	#m_disconnectSourceSignals: Array<() => void> = [];

	/**
	 * Looks up the model currently backing this proxy.
	 * @returns The source model, or `null` when detached.
	 */
	sourceModel(): CAbstractItemModel | null {
		return this.#m_sourceModel;
	}

	/**
	 * Replaces source signal connections, invokes the source-change hook and emits a reset. Passing the current source or the proxy itself has no effect.
	 * @param sourceModel Model to wrap, or `null` to detach.
	 */
	setSourceModel(sourceModel: CAbstractItemModel | null): void {
		if (sourceModel === this || sourceModel === this.#m_sourceModel)
			return;

		const oldSourceModel = this.#m_sourceModel;
		this.#disconnectSourceModel();
		this.#m_sourceModel = sourceModel;

		if (sourceModel !== null)
			this.#connectSourceModel(sourceModel);

		this.sourceModelChanged(oldSourceModel, sourceModel);
		this.resetModel();
	}

	/**
	 * Converts an index in the proxy's coordinate system to a source index.
	 * @param proxyIndex Index owned by this proxy.
	 * @returns The corresponding source index, or an invalid index if there is no mapping.
	 */
	abstract mapToSource(proxyIndex: CModelIndex): CModelIndex;

	/**
	 * Converts an index in the source's coordinate system to a proxy index.
	 * @param sourceIndex Index owned by the source model.
	 * @returns The corresponding proxy index, or an invalid index if there is no mapping.
	 */
	abstract mapFromSource(sourceIndex: CModelIndex): CModelIndex;

	/**
	 * Reads the source value after validating the proxy index and its mapping.
	 * @param index Index owned by this proxy.
	 * @returns The source value, or `null` when the mapping is unavailable.
	 */
	override data(index: CModelIndex): unknown {
		const sourceIndex = this.#sourceIndex(index);

		return sourceIndex.isValid() && this.#m_sourceModel !== null
			? this.#m_sourceModel.data(sourceIndex)
			: null;
	}

	/**
	 * Forwards an edit to the source cell after validating the mapping.
	 * @param index Index owned by this proxy.
	 * @param value Proposed source value.
	 * @returns The source's acceptance result, or `false` when the mapping is unavailable.
	 */
	override setItemData(index: CModelIndex, value: unknown): boolean {
		const sourceIndex = this.#sourceIndex(index);

		return sourceIndex.isValid() && this.#m_sourceModel !== null
			? this.#m_sourceModel.setItemData(sourceIndex, value)
			: false;
	}

    /**
     * Queries the attached source model's support for batched text edits.
     * @returns `true` if a source is attached and supports the operation.
     */
    override supportsTextEdits(): boolean {
        return this.#m_sourceModel?.supportsTextEdits() ?? false;
    }

    /**
     * Exposes the edit history of the attached source model.
     * @returns The source's undo stack, or `null` if no source or history is available.
     */
    override undoStack(): CUndoStack | null {
        return this.#m_sourceModel?.undoStack() ?? null;
    }

    /**
     * Maps every target to the source and forwards the batch only if all target indexes are valid.
     * @param edits Batch of proxy indexes and replacement text.
     * @returns The source result, or an error for the first unmappable edit or an absent source. A `null` result indicates acceptance.
     */
    override applyTextEdits(edits: readonly CItemTextEdit[]): CItemTextEditError | null {
        const source = this.#m_sourceModel;
        if (source === null) return super.applyTextEdits(edits);

        const mapped: CItemTextEdit[] = [];
        for (const [editIndex, edit] of edits.entries()) {
            const index = this.#sourceIndex(edit.index);
            if (!index.isValid()) return { editIndex, message: "Cell no longer exists." };
            mapped.push({ index, text: edit.text });
        }
        return source.applyTextEdits(mapped);
    }

	/**
	 * Checks whether the mapped source item permits edits.
	 * @param index Index owned by this proxy.
	 * @returns The source's editable flag, or `false` when the mapping is unavailable.
	 */
	override isEditable(index: CModelIndex): boolean {
		const sourceIndex = this.#sourceIndex(index);

		return sourceIndex.isValid() && this.#m_sourceModel !== null
			? this.#m_sourceModel.isEditable(sourceIndex)
			: false;
	}

	/**
	 * Requests header data from the source for the same section and orientation.
	 * @param section Zero-based header section.
	 * @param orientation Horizontal or vertical header orientation.
	 * @returns The source's header value, or `null` if unavailable.
	 */
	override headerData(
		section: number,
		orientation: COrientation
	): string | number | null {
		return this.#m_sourceModel?.headerData(section, orientation) ?? null;
	}

	/**
	 * Provides a hook after the new source is installed and before the proxy emits a reset. The base implementation does nothing.
	 * @param _oldSourceModel Previously attached model, or `null`.
	 * @param _newSourceModel Newly attached model, or `null`.
	 */
	protected sourceModelChanged(
		_oldSourceModel: CAbstractItemModel | null,
		_newSourceModel: CAbstractItemModel | null
	): void {
	}

	/**
	 * Maps the source change's endpoints and emits a proxy data change when both map to valid proxy indexes.
	 * @param topLeft Upper-left source index in the change range.
	 * @param bottomRight Lower-right source index in the change range.
	 */
	protected sourceDataChanged(
		topLeft: CModelIndex,
		bottomRight: CModelIndex
	): void {
		const proxyTopLeft = this.mapFromSource(topLeft);
		const proxyBottomRight = this.mapFromSource(bottomRight);

		if (proxyTopLeft.isValid() && proxyBottomRight.isValid())
			this.emitDataChanged(proxyTopLeft, proxyBottomRight);
	}

	/** Emits a proxy reset in response to a source reset. */
	protected sourceModelReset(): void {
		this.resetModel();
	}

	/** Emits a proxy reset when the source rearranges its indexes. */
	protected sourceLayoutChanged(): void {
		this.resetModel();
	}

	#sourceIndex(index: CModelIndex): CModelIndex {
		if (!index.isValid() || index.model() !== this ||
			this.#m_sourceModel === null)
			return new CModelIndex();

		const sourceIndex = this.mapToSource(index);

		return sourceIndex.isValid() &&
			sourceIndex.model() === this.#m_sourceModel
			? sourceIndex
			: new CModelIndex();
	}

	#connectSourceModel(sourceModel: CAbstractItemModel): void {
		this.#m_disconnectSourceSignals.push(
			sourceModel.dataChanged.connect((topLeft, bottomRight) => {
				this.sourceDataChanged(topLeft, bottomRight);
			})
		);

		this.#m_disconnectSourceSignals.push(
			sourceModel.modelReset.connect(() => {
				this.sourceModelReset();
			})
		);

		this.#m_disconnectSourceSignals.push(
			sourceModel.layoutChanged.connect(() => {
				this.sourceLayoutChanged();
			})
		);
	}

	#disconnectSourceModel(): void {
		for (const disconnect of this.#m_disconnectSourceSignals)
			disconnect();

		this.#m_disconnectSourceSignals = [];
	}
}
