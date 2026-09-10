import { CTextCharFormat } from "./CTextCharFormat.js";

/**
 * Describes a formatted range in a text document.
 */
export type CTextFormatRange = {
		/**
	 * The start value.
	 */
start: number;
		/**
	 * Returns the number of characters in the document.
	 */
length: number;
		/**
	 * The format value.
	 */
format: CTextCharFormat;
};

type CMutableTextFormatRange = {
		/**
	 * The start value.
	 */
start: number;
		/**
	 * The end value.
	 */
end: number;
		/**
	 * The format value.
	 */
format: CTextCharFormat;
};

/**
 * Stores plain text together with character-format ranges.
 */
export class CTextDocument {
	#m_text = "";
	#m_ranges: CMutableTextFormatRange[] = [];

		/**
	 * Creates a new CTextDocument instance.
	 *
	 * @param text Text.
	 */
constructor(text = "") {
		this.setPlainText(text);
	}

		/**
	 * Returns the document contents as plain text.
	 *
	 * @returns The resulting value.
	 */
toPlainText(): string {
		return this.#m_text;
	}

		/**
	 * Returns the number of characters in the document.
	 *
	 * @returns The resulting value.
	 */
length(): number {
		return this.#m_text.length;
	}

		/**
	 * Creates an independent copy of this object.
	 *
	 * @returns The resulting value.
	 */
clone(): CTextDocument {
		const document = new CTextDocument();

		document.#m_text = this.#m_text;
		document.#m_ranges = this.#m_ranges.map(range =>
			this.#cloneRange(range)
		);

		return document;
	}

		/**
	 * Replaces the document contents with plain text.
	 *
	 * @param text Text.
	 */
setPlainText(text: string): void {
		this.#m_text = text;
		this.#m_ranges = text.length === 0
			? []
			: [{
				start: 0,
				end: text.length,
				format: new CTextCharFormat()
			}];
	}

		/**
	 * Clears the current contents.
	 */
clear(): void {
		this.#m_text = "";
		this.#m_ranges = [];
	}

		/**
	 * Returns the character-format ranges in the document.
	 *
	 * @returns The resulting value.
	 */
formatRanges(): readonly CTextFormatRange[] {
		return this.#m_ranges.map(range => ({
			start: range.start,
			length: range.end - range.start,
			format: range.format.clone()
		}));
	}

		/**
	 * Returns the character format at the specified position.
	 *
	 * @param position Position.
	 *
	 * @returns The resulting value.
	 */
charFormatAt(position: number): CTextCharFormat {
		if (position < 0 || position > this.#m_text.length)
			throw new RangeError("Text position is out of range.");

		if (this.#m_ranges.length === 0)
			return new CTextCharFormat();

		if (position === this.#m_text.length)
			return this.#m_ranges[this.#m_ranges.length - 1]!.format.clone();

		const range = this.#m_ranges.find(item =>
			position >= item.start && position < item.end
		);

		return range?.format.clone() ?? new CTextCharFormat();
	}

		/**
	 * Inserts text at the specified position.
	 *
	 * @param position Position.
	 * @param text Text.
	 * @param format Format.
	 */
insert(
		position: number,
		text: string,
		format: CTextCharFormat | null = null
	): void {
		this.#checkPosition(position);

		if (text.length === 0)
			return;

		const insertionFormat = format?.clone()
			?? this.#insertionFormatAt(position);

		this.#m_text = this.#m_text.slice(0, position)
			+ text
			+ this.#m_text.slice(position);

		const amount = text.length;
		const ranges: CMutableTextFormatRange[] = [];

		for (const range of this.#m_ranges) {
			if (range.end <= position) {
				ranges.push(this.#cloneRange(range));
				continue;
			}

			if (range.start >= position) {
				ranges.push({
					start: range.start + amount,
					end: range.end + amount,
					format: range.format.clone()
				});
				continue;
			}

			ranges.push({
				start: range.start,
				end: position,
				format: range.format.clone()
			});
			ranges.push({
				start: position + amount,
				end: range.end + amount,
				format: range.format.clone()
			});
		}

		ranges.push({
			start: position,
			end: position + amount,
			format: insertionFormat
		});

		this.#m_ranges = this.#normalize(ranges);
	}

		/**
	 * Removes a range of text from the document.
	 *
	 * @param start Start.
	 * @param length Length.
	 */
remove(start: number, length: number): void {
		this.#checkRange(start, length);

		if (length === 0)
			return;

		const end = start + length;
		this.#m_text = this.#m_text.slice(0, start)
			+ this.#m_text.slice(end);

		const ranges: CMutableTextFormatRange[] = [];

		for (const range of this.#m_ranges) {
			if (range.end <= start) {
				ranges.push(this.#cloneRange(range));
				continue;
			}

			if (range.start >= end) {
				ranges.push({
					start: range.start - length,
					end: range.end - length,
					format: range.format.clone()
				});
				continue;
			}

			if (range.start < start) {
				ranges.push({
					start: range.start,
					end: start,
					format: range.format.clone()
				});
			}

			if (range.end > end) {
				ranges.push({
					start,
					end: range.end - length,
					format: range.format.clone()
				});
			}
		}

		this.#m_ranges = this.#normalize(ranges);
	}

		/**
	 * Applies a character format to a range of text.
	 *
	 * @param start Start.
	 * @param length Length.
	 * @param format Format.
	 */
setCharFormat(
		start: number,
		length: number,
		format: CTextCharFormat
	): void {
		this.#checkRange(start, length);

		if (length === 0)
			return;

		const end = start + length;
		const ranges: CMutableTextFormatRange[] = [];

		for (const range of this.#m_ranges) {
			if (range.end <= start || range.start >= end) {
				ranges.push(this.#cloneRange(range));
				continue;
			}

			if (range.start < start) {
				ranges.push({
					start: range.start,
					end: start,
					format: range.format.clone()
				});
			}

			ranges.push({
				start: Math.max(range.start, start),
				end: Math.min(range.end, end),
				format: format.clone()
			});

			if (range.end > end) {
				ranges.push({
					start: end,
					end: range.end,
					format: range.format.clone()
				});
			}
		}

		this.#m_ranges = this.#normalize(ranges);
	}

	#insertionFormatAt(position: number): CTextCharFormat {
		if (this.#m_ranges.length === 0)
			return new CTextCharFormat();

		if (position > 0)
			return this.charFormatAt(position - 1);

		return this.charFormatAt(0);
	}

	#checkPosition(position: number): void {
		if (!Number.isInteger(position)
			|| position < 0
			|| position > this.#m_text.length)
			throw new RangeError("Text position is out of range.");
	}

	#checkRange(start: number, length: number): void {
		if (!Number.isInteger(start)
			|| !Number.isInteger(length)
			|| start < 0
			|| length < 0
			|| start + length > this.#m_text.length)
			throw new RangeError("Text range is out of range.");
	}

	#cloneRange(range: CMutableTextFormatRange): CMutableTextFormatRange {
		return {
			start: range.start,
			end: range.end,
			format: range.format.clone()
		};
	}

	#normalize(
		ranges: CMutableTextFormatRange[]
	): CMutableTextFormatRange[] {
		const sorted = ranges
			.filter(range => range.end > range.start)
			.sort((a, b) => a.start - b.start);

		const result: CMutableTextFormatRange[] = [];

		for (const range of sorted) {
			const previous = result[result.length - 1];

			if (previous !== undefined
				&& previous.end === range.start
				&& previous.format.equals(range.format)) {
				previous.end = range.end;
				continue;
			}

			result.push(this.#cloneRange(range));
		}

		return result;
	}
}
