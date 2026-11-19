/** @module Models/CSqlFilter */
/** Comparison operation used by SQL table adapters. */
export enum CSqlFilterOperator {
    /**
    * Match values equal to the filter operand.
    */
    Equal = "eq",
    /**
    * Match values different from the filter operand.
    */
    NotEqual = "ne",
    /**
    * Match values strictly below the filter operand.
    */
    LessThan = "lt",
    /**
    * Match values at or below the filter operand.
    */
    LessThanOrEqual = "lte",
    /**
    * Match values strictly above the filter operand.
    */
    GreaterThan = "gt",
    /**
    * Match values at or above the filter operand.
    */
    GreaterThanOrEqual = "gte",
    /**
    * Match text containing the operand as a substring.
    */
    Contains = "contains",
    /**
    * Match text beginning with the operand.
    */
    StartsWith = "startsWith",
    /**
    * Match text ending with the operand.
    */
    EndsWith = "endsWith"
}

/** One server-side filter applied by CSqlTableModel. */
export interface CSqlFilter {
    /**
    * Backend column name to compare.
    */
    column: string;
    /**
    * Comparison operation applied to the column and operand.
    */
    operator: CSqlFilterOperator;
    /**
    * Operand supplied to the adapter for comparison.
    */
    value: unknown;
    /**
    * Whether text comparisons distinguish letter case, subject to adapter support.
    */
    caseSensitive?: boolean;
}
