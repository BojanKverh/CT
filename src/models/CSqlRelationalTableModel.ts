import { CModelIndex } from "./CModelIndex.js";
import { CSqlRelation } from "./CSqlRelation.js";
import type { CSqlRow } from "./CSqlTableAdapter.js";
import { CSqlTableAdapter } from "./CSqlTableAdapter.js";
import { CSqlTableModel } from "./CSqlTableModel.js";

/** SQL table model that displays foreign keys through related tables. */
export class CSqlRelationalTableModel extends CSqlTableModel {
	static readonly RelationFetchSize = 1000;

	#m_relations = new Map<number, CSqlRelation>();
	#m_relationRows = new Map<number, CSqlRow[]>();

	constructor(adapter: CSqlTableAdapter) {
		super(adapter);
	}

	/**
	 * Sets or removes a relation, invalidates that column's lookup rows and emits a reset. Call `select()` to load lookup data.
	 * @param column Nonnegative integer model-column index.
	 * @param relation Relation to assign, or `null` or an invalid relation to remove it.
	 */
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

	/**
	 * Looks up the relation configured for a column.
	 * @param column Zero-based model column.
	 * @returns The relation, or `null` if unset.
	 */
	relation(column: number): CSqlRelation | null {
		return this.#m_relations.get(column) ?? null;
	}

	/**
	 * Reads the cached lookup records for a column.
	 * @param column Zero-based model column.
	 * @returns Shallow copies of the loaded lookup records, or an empty array.
	 */
	relationRows(column: number): readonly CSqlRow[] {
		return (this.#m_relationRows.get(column) ?? [])
			.map(row => ({ ...row }));
	}

	/**
	 * Converts cached display values to strings in lookup row order.
	 * @param column Zero-based model column.
	 * @returns Display strings with empty strings for missing values, or an empty array when no lookup is loaded.
	 */
	relationDisplayValues(column: number): string[] {
		const relation = this.relation(column);
		if (relation === null)
			return [];

		return (this.#m_relationRows.get(column) ?? []).map(row =>
			String(row[relation.displayColumn()] ?? ""));
	}

	/**
	 * Reads the foreign-key value at a loaded lookup position.
	 * @param column Zero-based model column with a relation.
	 * @param row Zero-based row in the lookup cache.
	 * @returns The stored key, or `undefined` if unavailable.
	 */
	relationKeyAt(column: number, row: number): unknown {
		const relation = this.relation(column);
		if (relation === null)
			return undefined;

		return this.#m_relationRows.get(column)?.[row]?.[
			relation.indexColumn()
		];
	}

	/**
	 * Reads the underlying cell without applying a relation lookup.
	 * @param index Index in this model.
	 * @returns Raw cell value, or `null` for a missing value.
	 */
	rawData(index: CModelIndex): unknown {
		return super.data(index);
	}

	/**
	 * Replaces a stored foreign key with its display value when a matching lookup row supplies one.
	 * @param index Index in this model.
	 * @returns The display value, or the raw cell value when no display value is available.
	 */
	override data(index: CModelIndex): unknown {
		const value = super.data(index);
		const relation = this.relation(index.column());
		if (relation === null || value === null || value === undefined)
			return value;

		const related = (this.#m_relationRows.get(index.column()) ?? [])
			.find(row => Object.is(row[relation.indexColumn()], value));
		return related?.[relation.displayColumn()] ?? value;
	}

	/**
	 * Resolves a relation edit to a stored key. It prefers an exact key match before looking for a matching display value.
	 * @param index Target index in this model.
	 * @param value Raw key or display value. Nullish values are forwarded directly.
	 * @returns `true` if the base model accepts the edit, or `false` if the value cannot be resolved or the cell rejects it.
	 */
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

	/**
	 * Loads the first page of the main table, then loads each configured relation in pages and emits another reset on success.
	 * @returns A promise resolving to `true` only if the main load and all relation loads succeed.
	 */
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
