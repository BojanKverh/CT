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

	/** Returns the model represented by this proxy. */
	sourceModel(): CAbstractItemModel | null {
		return this.#m_sourceModel;
	}

	/** Sets the model represented by this proxy. */
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

	/** Maps an index owned by this proxy to its source-model index. */
	abstract mapToSource(proxyIndex: CModelIndex): CModelIndex;

	/** Maps a source-model index to its proxy-model index. */
	abstract mapFromSource(sourceIndex: CModelIndex): CModelIndex;

	/** Returns data from the mapped source index. */
	override data(index: CModelIndex): unknown {
		const sourceIndex = this.#sourceIndex(index);

		return sourceIndex.isValid() && this.#m_sourceModel !== null
			? this.#m_sourceModel.data(sourceIndex)
			: null;
	}

	/** Writes data through to the mapped source index. */
	override setItemData(index: CModelIndex, value: unknown): boolean {
		const sourceIndex = this.#sourceIndex(index);

		return sourceIndex.isValid() && this.#m_sourceModel !== null
			? this.#m_sourceModel.setItemData(sourceIndex, value)
			: false;
	}

    override supportsTextEdits(): boolean {
        return this.#m_sourceModel?.supportsTextEdits() ?? false;
    }

    override undoStack(): CUndoStack | null {
        return this.#m_sourceModel?.undoStack() ?? null;
    }

    /** Resolves all source indexes before any edit can rearrange the proxy. */
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

	/** Returns whether the mapped source index is editable. */
	override isEditable(index: CModelIndex): boolean {
		const sourceIndex = this.#sourceIndex(index);

		return sourceIndex.isValid() && this.#m_sourceModel !== null
			? this.#m_sourceModel.isEditable(sourceIndex)
			: false;
	}

	/** Returns header data from the source model. */
	override headerData(
		section: number,
		orientation: COrientation
	): string | number | null {
		return this.#m_sourceModel?.headerData(section, orientation) ?? null;
	}

	/** Called after the source model changes. */
	protected sourceModelChanged(
		_oldSourceModel: CAbstractItemModel | null,
		_newSourceModel: CAbstractItemModel | null
	): void {
	}

	/** Handles a source-model data change. */
	protected sourceDataChanged(
		topLeft: CModelIndex,
		bottomRight: CModelIndex
	): void {
		const proxyTopLeft = this.mapFromSource(topLeft);
		const proxyBottomRight = this.mapFromSource(bottomRight);

		if (proxyTopLeft.isValid() && proxyBottomRight.isValid())
			this.emitDataChanged(proxyTopLeft, proxyBottomRight);
	}

	/** Handles a reset of the source model. */
	protected sourceModelReset(): void {
		this.resetModel();
	}

	/** Handles a source-model layout change. */
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
