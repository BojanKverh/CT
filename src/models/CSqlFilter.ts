/** Comparison operation used by SQL table adapters. */
export enum CSqlFilterOperator {
	Equal = "eq",
	NotEqual = "ne",
	LessThan = "lt",
	LessThanOrEqual = "lte",
	GreaterThan = "gt",
	GreaterThanOrEqual = "gte",
	Contains = "contains",
	StartsWith = "startsWith",
	EndsWith = "endsWith"
}

/** One server-side filter applied by CSqlTableModel. */
export interface CSqlFilter {
	column: string;
	operator: CSqlFilterOperator;
	value: unknown;
	caseSensitive?: boolean;
}
