/** @module Models/CSqlRelationalTableModel */
import { CModelIndex } from "./CModelIndex.js";
import { CSqlRelation } from "./CSqlRelation.js";
import type { CSqlRow } from "./CSqlTableAdapter.js";
import { CSqlTableAdapter } from "./CSqlTableAdapter.js";
import { CSqlTableModel } from "./CSqlTableModel.js";

/** SQL table model that displays foreign keys through related tables.
 *
 * @example
 * ```ts
 * const adapter = new CMemorySqlTableAdapter({
 *     employees: [{ id: 1, department_id: 10 }],
 *     departments: [{ id: 10, name: "Engineering" }]
 * });
 * const model = new CSqlRelationalTableModel(adapter);
 * model.setTable("employees");
 * model.setColumns(["id", "department_id"]);
 * model.setRelation(1, new CSqlRelation("departments", "id", "name"));
 * if (await model.select()) view.setModel(model);
 * ```
 */
export class CSqlRelationalTableModel extends CSqlTableModel {
    /** Maximum related-record batch size used while resolving relation labels. */
    static readonly RelationFetchSize = 1000;

	#m_relations = new Map<number, CSqlRelation>();
	#m_relationRows = new Map<number, CSqlRow[]>();

    /**
    * Connects the base table model to an adapter; relations are configured before select().
    * @param adapter Backend used for asynchronous table reads and writes.
    */
    constructor(adapter: CSqlTableAdapter) {
		super(adapter);
	}

    /** Assigns or removes the relation for a model column. */
    setRelation(column: number, relation: CSqlRelation | null): void {
		if (!Number.isInteger(column) || column < 0)
			return;

		if (relation === null || !relation.isValid()) {
			this.#m_relations.delete(column);
			this.#m_relationRows.delete(column);
		} else {
			this.#m_relations.set(column, relation);
			this.#m_relationRows.delete(column);
		}
		this.resetModel();
	}

    /** Returns the relation assigned to a column. */
    relation(column: number): CSqlRelation | null {
		return this.#m_relations.get(column) ?? null;
	}

    /** Returns independent copies of the loaded records for a relation. */
    relationRows(column: number): readonly CSqlRow[] {
		return (this.#m_relationRows.get(column) ?? [])
			.map(row => ({ ...row }));
	}

    /** Returns display values in the same order as relationRows(). */
    relationDisplayValues(column: number): string[] {
		const relation = this.relation(column);
		if (relation === null)
			return [];

		return (this.#m_relationRows.get(column) ?? []).map(row =>
			String(row[relation.displayColumn()] ?? ""));
	}

    /** Returns a relation key by its loaded row position. */
    relationKeyAt(column: number, row: number): unknown {
		const relation = this.relation(column);
		if (relation === null)
			return undefined;

		return this.#m_relationRows.get(column)?.[row]?.[
			relation.indexColumn()
		];
	}

    /** Returns the unformatted value stored by CSqlTableModel. */
    rawData(index: CModelIndex): unknown {
		return super.data(index);
	}

	override data(index: CModelIndex): unknown {
		const value = super.data(index);
		const relation = this.relation(index.column());
		if (relation === null || value === null || value === undefined)
			return value;

		const related = (this.#m_relationRows.get(index.column()) ?? [])
			.find(row => Object.is(row[relation.indexColumn()], value));
		return related?.[relation.displayColumn()] ?? value;
	}

	override setItemData(index: CModelIndex, value: unknown): boolean {
		const relation = this.relation(index.column());
		if (relation === null || value === null || value === undefined)
			return super.setItemData(index, value);

		const rows = this.#m_relationRows.get(index.column()) ?? [];
		const keyMatch = rows.find(row =>
			Object.is(row[relation.indexColumn()], value));
		if (keyMatch !== undefined)
			return super.setItemData(index, value);

		const displayMatch = rows.find(row =>
			Object.is(row[relation.displayColumn()], value)
			|| String(row[relation.displayColumn()] ?? "") === String(value));
		if (displayMatch === undefined)
			return false;

		return super.setItemData(
			index,
			displayMatch[relation.indexColumn()]
		);
	}

    /** Loads the main table and all configured relation tables. */
    override async select(): Promise<boolean> {
		if (!await super.select())
			return false;

		try {
			for (const [column, relation] of this.#m_relations)
				this.#m_relationRows.set(column, await this.#loadRelation(relation));
			this.resetModel();
			return true;
		} catch (error) {
			this.reportError("select", error);
			return false;
		}
	}

	async #loadRelation(relation: CSqlRelation): Promise<CSqlRow[]> {
		const rows: CSqlRow[] = [];
		let totalRowCount = 0;

		do {
			const result = await this.adapter().select({
				table: relation.tableName(),
				columns: [relation.indexColumn(), relation.displayColumn()],
				offset: rows.length,
				limit: CSqlRelationalTableModel.RelationFetchSize
			});
			rows.push(...result.rows.map(row => ({ ...row })));
			totalRowCount = Math.max(result.totalRowCount, rows.length);
			if (result.rows.length === 0)
				break;
		} while (rows.length < totalRowCount);

		return rows;
	}
}
