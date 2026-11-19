# Model/View

A model owns records and describes their rows, columns and edit operations. A view paints those records, tracks a current cell and manages selection. This separation lets several views share one data source and lets a proxy reorder or filter data without rewriting the original records.

Use `CListWidget`, `CTreeWidget` or `CTableWidget` when an item-based container is sufficient. Use `CListView`, `CTreeView` or `CTableView` with a separate model when the application owns the records, needs another presentation of the same data or loads data through an adapter.

Create `CApplication` before constructing widgets. The examples receive existing parent widgets; add the returned views and editors to layouts. Every TypeScript block is independent.

## Understand model indexes

A `CModelIndex` belongs to a particular model and carries a zero-based row and column. An invalid index represents absence, such as no current cell. Test `isValid()` before reading coordinates, and use `model.index(row, column)` to obtain indexes for existing cells.

`isValid()` checks the index representation, not whether an old index still points to the same business record after a reload. Do not retain a row number as a record identity. Keep a stable application key, such as a person id, when an operation must survive sorting, filtering or replacement of the data.

## Implement an editable table

A flat table normally derives from `CAbstractTableModel`. Implement its dimensions and display data. To support editing, opt in through `isEditable()` and validate writes in `setItemData()`. The base model does not make cells writable automatically.

The following model keeps ids read-only and accepts nonempty names and cities. It rejects indexes from another model, changes its stored data before notifying views and emits nothing when an accepted value is unchanged.

```ts
import {
    CAbstractTableModel, CModelIndex, COrientation, CTableView, CWidget
} from "canvas-toolkit-lib";

type Person = { id: string; name: string; city: string };

export class PeopleModel extends CAbstractTableModel {
    #rows: Person[] = [
        { id: "p1", name: "Ada", city: "London" },
        { id: "p2", name: "Grace", city: "New York" }
    ];

    override rowCount(parent = new CModelIndex()): number {
        return parent.isValid() ? 0 : this.#rows.length;
    }
    override columnCount(parent = new CModelIndex()): number {
        return parent.isValid() ? 0 : 3;
    }
    override data(index: CModelIndex): string | null {
        if (!index.isValid() || index.model() !== this) return null;
        const row = this.#rows[index.row()];
        return row ? [row.id, row.name, row.city][index.column()] ?? null : null;
    }
    override headerData(section: number, orientation: COrientation): string | null {
        return orientation === COrientation.Horizontal
            ? ["Id", "Name", "City"][section] ?? null : String(section + 1);
    }
    override isEditable(index: CModelIndex): boolean {
        return index.isValid() && index.model() === this
            && this.#rows[index.row()] !== undefined
            && (index.column() === 1 || index.column() === 2);
    }
    override setItemData(index: CModelIndex, value: unknown): boolean {
        if (!this.isEditable(index) || typeof value !== "string") return false;
        const text = value.trim();
        if (!text) return false;
        const row = this.#rows[index.row()]!;
        const key = index.column() === 1 ? "name" : "city";
        if (row[key] === text) return true;
        row[key] = text;
        this.emitDataChanged(index, index);
        return true;
    }
    replaceRows(rows: readonly Person[]): void {
        this.#rows = rows.map(row => ({ ...row }));
        this.resetModel();
    }
}

function createPeopleView(parent: CWidget) {
    const model = new PeopleModel();
    const view = new CTableView(parent);
    view.setModel(model);
    return { model, view };
}
```

Returning `true` from `setItemData()` means the model accepted the value. It does not imply that a remote server persisted it. Notify through `emitDataChanged(topLeft, bottomRight)` for an inclusive range whose contents changed without changing the model shape.

`resetModel()` announces wholesale replacement of the data. Use it when previous indexes and selection can no longer be retained. For incremental insertion or removal, bracket the backing-data mutation with the corresponding `beginInsertRows()`/`endInsertRows()` or `beginRemoveRows()`/`endRemoveRows()` calls. Repainting a view alone does not tell its selection model or proxies that the row structure changed.

This small model deliberately omits paste batches and undo history. Those are separate capabilities: implement `applyTextEdits()` and provide `undoStack()` when the application needs them. Supporting one cell edit does not automatically support atomic paste or undo.

## Filter and sort through a proxy

`CSortFilterProxyModel` supports flat source models. Its default filter column is `-1`, which searches all columns. Fixed-string filtering and sorting are case insensitive by default. Choose a specific filter column when other fields, such as ids, should not influence matches.

This factory expects the three-column layout used above. Text changes update the city filter; sorting uses the name column. The source record order remains separate from the order shown by the view.

```ts
import {
    CAbstractItemModel, CLineEdit, CSortFilterProxyModel,
    CSortOrder, CTableView, CWidget
} from "canvas-toolkit-lib";

function createCityFilter(parent: CWidget, source: CAbstractItemModel) {
    const proxy = new CSortFilterProxyModel();
    proxy.setSourceModel(source);
    proxy.setFilterKeyColumn(2);
    proxy.sort(1, CSortOrder.AscendingOrder);
    const view = new CTableView(parent);
    view.setModel(proxy);
    const filter = new CLineEdit(parent);
    filter.setPlaceholderText("Filter cities");
    filter.textChanged.connect(text => proxy.setFilterFixedString(text));
    view.selectionModel()?.currentChanged.connect(index => {
        if (!index.isValid()) return;
        const original = proxy.mapToSource(index);
        if (original.isValid()) console.log(source.data(source.index(original.row(), 0)));
    });
    return { view, filter, proxy };
}
```

Indexes received from this view belong to the proxy. Always use `mapToSource()` before passing one to a source-model operation. In the opposite direction, `mapFromSource()` can return an invalid index because a source row is filtered out. Do not treat `proxyIndex.row()` as a source row number, even if both happen to match before sorting.

## Restore a current record after replacement

The current index and the set of selected indexes are separate. `setCurrentIndex()` changes the current cell; `select()` adds a cell to selection. `clearSelection()` does not clear the current index.

For restoration after a reload, retain the record id before reloading, then locate that id in the new source data and map it to the current presentation. This function assumes the view uses the supplied proxy and column 0 holds unique string ids. It clears the previous selection and selects the restored cell only if it remains visible.

```ts
import {
    CAbstractItemModel, CModelIndex, CSortFilterProxyModel, CTableView
} from "canvas-toolkit-lib";

function restoreCurrentById(
    view: CTableView, source: CAbstractItemModel,
    proxy: CSortFilterProxyModel, id: string
): void {
    let current = new CModelIndex();
    for (let row = 0; row < source.rowCount(); ++row) {
        if (source.data(source.index(row, 0)) === id) {
            current = proxy.mapFromSource(source.index(row, 0));
            break;
        }
    }
    const selection = view.selectionModel();
    if (!selection) return;
    selection.clearSelection();
    selection.setCurrentIndex(current);
    if (current.isValid()) selection.select(current);
}
```

If the record was deleted or filtered out, the function leaves no current cell and no selection. An application can instead reveal the record by changing its filter, but that should be an explicit interaction decision.

## Load related SQL tables and persist changes

`CSqlTableModel` delegates asynchronous storage operations to `CSqlTableAdapter`. The memory adapter makes this example usable without a server. `CSqlRelationalTableModel` resolves a stored foreign key through a related table: department id `10` is displayed as `Engineering`.

```ts
import {
    CMemorySqlTableAdapter, CSqlEditStrategy, CSqlRelation,
    CSqlRelationalTableModel, CTableView, CWidget
} from "canvas-toolkit-lib";

async function createEmployeeView(parent: CWidget) {
    const adapter = new CMemorySqlTableAdapter({
        employees: [{ id: 1, name: "Ada", department_id: 10 }],
        departments: [{ id: 10, title: "Engineering" }]
    });
    const model = new CSqlRelationalTableModel(adapter);
    model.setTable("employees");
    model.setColumns(["id", "name", "department_id"]);
    model.setEditStrategy(CSqlEditStrategy.OnManualSubmit);
    model.setRelation(2, new CSqlRelation("departments", "id", "title"));
    if (!await model.select()) throw new Error(String(model.lastError()));
    const view = new CTableView(parent);
    view.setModel(model);
    return { view, model };
}

async function persistEdits(model: CSqlRelationalTableModel): Promise<boolean> {
    if (await model.submitAll()) return true;
    console.error(model.lastError());
    return false;
}
```

`OnManualSubmit` retains accepted edits locally until `submitAll()`. Check the asynchronous boolean result and report `lastError()` or observe `errorOccurred`; a local edit and a completed adapter request are different stages. `revertAll()` discards pending local edits. Backend transactions, authentication and transport are the adapter responsibility.

Use `rawData(index)` when the application needs the stored foreign key rather than its displayed label. `relationRows()` supplies loaded related choices, and `relationKeyAt()` resolves a choice to its key. For larger SQL data sets, inspect `canFetchMore()` and request `fetchMore()` rather than assuming every record is already loaded. Keep long-running loads separate from painting and give users loading feedback or a local `CLoadingOverlay`.
