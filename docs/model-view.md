# Model/View

Models supply data and indexes; views render them and handle selection. Start with `CListWidget`, `CTreeWidget` or `CTableWidget` for item-based data. Use their corresponding views when the application owns a separate model.

A `CModelIndex` identifies a row, column and model. Invalid indexes represent absence. Proxy indexes belong to the proxy and must be mapped before being passed to a source model.

## A small table model

```ts
class PeopleModel extends CAbstractTableModel {
    readonly rows = [["Ada", "London"], ["Grace", "New York"]];
    override rowCount(): number { return this.rows.length; }
    override columnCount(): number { return 2; }
    override data(index: CModelIndex): string | null {
        return index.isValid()
            ? this.rows[index.row()]?.[index.column()] ?? null
            : null;
    }
}
const people = new PeopleModel();
const view = new CTableView(parent);
view.setModel(people);
```

## Sorting and filtering

`CSortFilterProxyModel` supports flat models. Its default filter column is `-1`, meaning all columns. Fixed-string filtering and sorting are case insensitive by default.

```ts
const proxy = new CSortFilterProxyModel();
proxy.setSourceModel(people);
proxy.setFilterKeyColumn(1);
proxy.setFilterFixedString("London");
proxy.sort(0, CSortOrder.AscendingOrder);
view.setModel(proxy);
```

Map selected indexes before accessing source data.

```ts
const selected = view.selectionModel()?.currentIndex();
if (selected?.isValid()) {
    console.log(people.data(proxy.mapToSource(selected)));
}
```

`mapFromSource()` returns an invalid index for a filtered-out row. Do not use a proxy row number as a source row number.

## Related SQL tables

`CSqlTableModel` uses an asynchronous `CSqlTableAdapter`. The memory adapter supports an offline example. `CSqlRelationalTableModel` displays foreign keys through related labels.

```ts
const adapter = new CMemorySqlTableAdapter({
    employees: [{ id: 1, name: "Ada", department_id: 10 }],
    departments: [{ id: 10, title: "Engineering" }]
});
const model = new CSqlRelationalTableModel(adapter);
model.setTable("employees");
model.setColumns(["id", "name", "department_id"]);
model.setRelation(2, new CSqlRelation("departments", "id", "title"));
if (await model.select()) view.setModel(model);
```

The relation column displays `Engineering`. `rawData(index)` retrieves the stored key. `relationRows()` returns copies of loaded related records, and `relationKeyAt()` resolves a choice to its key.

SQL edits follow `CSqlEditStrategy`. Check asynchronous results and `lastError()` or `errorOccurred`. `select()` can load a first batch; `fetchMore()` loads more records. The adapter defines storage and transport behavior.
