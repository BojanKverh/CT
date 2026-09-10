import { CWidget } from "./CWidget.js";
import { CSplitterHandle } from "./CSplitterHandle.js";
import { COrientation } from "../gui/COrientation.js";
import { CSignal } from "../core/CSignal.js";
import { CSize } from "../geometry/CSize.js";

interface CSplitterItem
{
	widget: CWidget;
	size: number;
	stretch: number;
	collapsible: boolean | null;
}

/** Implements the splitter widget. */
export class CSplitter extends CWidget
{
	#m_orientation: COrientation;
	#m_items: CSplitterItem[] = [];
	#m_handles: Array<CSplitterHandle | null> = [];
	#m_childrenCollapsible = true;

	/** Public splitter moved member. */
	readonly splitterMoved = new CSignal<[number, number]>();

	/** Creates a new instance. */
	constructor(
		orientation = COrientation.Horizontal,
		parent: CWidget | null = null
	) {
		/** Provides super behavior. */
		super(parent);

		this.#m_orientation = orientation;
	}

	/** Provides orientation behavior. */
	orientation(): COrientation
	{
		return this.#m_orientation;
	}

	/** Sets the orientation. */
	setOrientation(orientation: COrientation): void
	{
		/** Provides if behavior. */
		if (this.#m_orientation === orientation)
			return;

		this.#m_orientation = orientation;

		/** Provides for behavior. */
		for (const handle of this.#m_handles)
			handle?.setOrientation(orientation);

		this.#relayout(true);
	}

	/** Adds widget. */
	addWidget(widget: CWidget): void
	{
		this.insertWidget(this.#m_items.length, widget);
	}

	/** Inserts widget. */
	insertWidget(index: number, widget: CWidget): void
	{
		const oldIndex = this.indexOf(widget);

		/** Provides if behavior. */
		if (oldIndex !== -1) {
			this.#m_items.splice(oldIndex, 1);

			/** Provides if behavior. */
			if (oldIndex < index)
				--index;
		}

		index = Math.max(0, Math.min(index, this.#m_items.length));

		widget.setParent(this);

		this.#m_items.splice(index, 0, {
			widget,
			size: this.#preferredSize(widget),
			stretch: 1,
			collapsible: null
		});

		this.#rebuildHandles();
		this.#relayout(true);
	}

	/** Provides replace widget behavior. */
	replaceWidget(index: number, widget: CWidget): CWidget | null
	{
		/** Provides if behavior. */
		if (index < 0 || index >= this.#m_items.length)
			return null;

		const item = this.#m_items[index]!;
		const oldWidget = item.widget;
		const existingIndex = this.indexOf(widget);

		/** Provides if behavior. */
		if (existingIndex !== -1 && existingIndex !== index)
			return null;

		widget.setParent(this);

		item.widget = widget;
		oldWidget.setParent(null);

		this.#relayout(false);
		return oldWidget;
	}

	/** Provides count behavior. */
	count(): number
	{
		return this.#m_items.length;
	}

	/** Provides widget behavior. */
	widget(index: number): CWidget | null
	{
		return this.#m_items[index]?.widget ?? null;
	}

	/** Provides index of behavior. */
	indexOf(widget: CWidget): number
	{
		return this.#m_items.findIndex(item => item.widget === widget);
	}

	/** Provides handle behavior. */
	handle(index: number): CSplitterHandle | null
	{
		return this.#m_handles[index] ?? null;
	}

	/** Provides handle width behavior. */
	handleWidth(): number
	{
		return this.style().splitterHandleWidth()
	}

	/** Provides children collapsible behavior. */
	childrenCollapsible(): boolean
	{
		return this.#m_childrenCollapsible;
	}

	/** Sets the children collapsible. */
	setChildrenCollapsible(collapsible: boolean): void
	{
		this.#m_childrenCollapsible = collapsible;
	}

	/** Returns whether the collapsible condition is active. */
	isCollapsible(index: number): boolean
	{
		const item = this.#m_items[index];

		/** Provides if behavior. */
		if (item === undefined)
			return false;

		return item.collapsible ?? this.#m_childrenCollapsible;
	}

	/** Sets the collapsible. */
	setCollapsible(index: number, collapsible: boolean): void
	{
		const item = this.#m_items[index];

		/** Provides if behavior. */
		if (item === undefined)
			return;

		item.collapsible = collapsible;
	}

	/** Provides sizes behavior. */
	sizes(): number[]
	{
		return this.#m_items.map(item => item.size);
	}

	/** Sets the sizes. */
	setSizes(sizes: number[]): void
	{
		/** Provides for behavior. */
		for (let i = 0; i < this.#m_items.length; ++i) {
			const item = this.#m_items[i]!;
			const requested = Math.max(0, sizes[i] ?? 0);

			item.size = this.#clampSize(i, requested);
		}

		this.#fitToAvailable();
		this.#applyGeometry();
	}

	/** Sets the stretch factor. */
	setStretchFactor(index: number, stretch: number): void
	{
		const item = this.#m_items[index];

		/** Provides if behavior. */
		if (item === undefined)
			return;

		item.stretch = Math.max(0, stretch);
	}

	/** Provides move splitter behavior. */
	moveSplitter(pos: number, index: number): void
	{
		/** Provides if behavior. */
		if (index <= 0 || index >= this.#m_items.length)
			return;

		const current = this.#handlePosition(index);
		let delta = pos - current;

		/** Provides if behavior. */
		if (delta === 0)
			return;

		/** Provides if behavior. */
		if (delta > 0)
			delta = this.#moveRight(index, delta);
		else
			delta = -this.#moveLeft(index, -delta);

		/** Provides if behavior. */
		if (delta === 0)
			return;

		this.#applyGeometry();

		this.splitterMoved.emit(
			this.#handlePosition(index),
			index
		);
	}

	/** Provides closest legal position behavior. */
	closestLegalPosition(pos: number, index: number): number
	{
		/** Provides if behavior. */
		if (index <= 0 || index >= this.#m_items.length)
			return 0;

		const current = this.#handlePosition(index);
		const delta = pos - current;

		/** Provides if behavior. */
		if (delta > 0) {
			const amount = Math.min(
				this.#growCapacity(0, index - 1),
				this.#shrinkCapacity(index, this.#m_items.length - 1)
			);

			return current + Math.min(delta, amount);
		}

		const amount = Math.min(
			this.#shrinkCapacity(0, index - 1),
			this.#growCapacity(index, this.#m_items.length - 1)
		);

		return current - Math.min(-delta, amount);
	}

	/** Returns the preferred size of the widget. */
	override sizeHint(): CSize
	{
		const count = this.#m_items.length;

		/** Provides if behavior. */
		if (count === 0)
			return new CSize(0, 0);

		const handles = Math.max(0, count - 1) * this.handleWidth();

		/** Provides if behavior. */
		if (this.#m_orientation === COrientation.Horizontal) {
			let width = handles;
			let height = 0;

			/** Provides for behavior. */
			for (const item of this.#m_items) {
				const hint = item.widget.sizeHint();

				width += Math.max(
					hint.width(),
					item.widget.minimumSize().width()
				);

				height = Math.max(
					height,
					Math.max(
						hint.height(),
						item.widget.minimumSize().height()
					)
				);
			}

			return new CSize(width, height);
		}

		let width = 0;
		let height = handles;

		/** Provides for behavior. */
		for (const item of this.#m_items) {
			const hint = item.widget.sizeHint();

			width = Math.max(
				width,
				Math.max(
					hint.width(),
					item.widget.minimumSize().width()
				)
			);

			height += Math.max(
				hint.height(),
				item.widget.minimumSize().height()
			);
		}

		return new CSize(width, height);
	}

	/** Sets the geometry. */
	override setGeometry(
		x: number,
		y: number,
		width: number,
		height: number
	): void
	{
		const oldLength = this.#availableLength();

		super.setGeometry(x, y, width, height);

		const newLength = this.#availableLength();

		/** Provides if behavior. */
		if (oldLength !== newLength)
			this.#relayout(true);
		else
			this.#applyGeometry();
	}

	/** Handles child visibility changed behavior. */
	protected override childVisibilityChanged(child: CWidget): void
	{
		super.childVisibilityChanged(child);

		/** Provides if behavior. */
		if (this.indexOf(child) !== -1)
			this.#relayout(true);
	}

	#rebuildHandles(): void
	{
		/** Provides for behavior. */
		for (const handle of this.#m_handles)
			handle?.destroy();

		this.#m_handles = new Array<CSplitterHandle | null>(
			this.#m_items.length
		).fill(null);

		/** Provides for behavior. */
		for (let i = 1; i < this.#m_items.length; ++i)
			this.#m_handles[i] = new CSplitterHandle(
				this.#m_orientation,
				this,
				i
			);
	}

	#relayout(scale: boolean): void
	{
		/** Provides if behavior. */
		if (this.#m_items.length === 0)
			return;

		/** Provides if behavior. */
		if (scale)
			this.#fitToAvailable();

		this.#applyGeometry();
	}

	#fitToAvailable(): void
	{
		const available = this.#availableLength();

		/** Provides if behavior. */
		if (available <= 0) {
			/** Provides for behavior. */
			for (const item of this.#m_items)
				item.size = 0;

			return;
		}

		let current = 0;

		/** Provides for behavior. */
		for (const item of this.#m_items)
			current += item.size;

		/** Provides if behavior. */
		if (current === available)
			return;

		const source = this.#m_items.map((item, index) => {
			/** Provides if behavior. */
			if (item.size > 0)
				return item.size;

			const preferred = this.#preferredSize(item.widget);

			/** Provides if behavior. */
			if (preferred > 0)
				return preferred;

			return item.stretch > 0 ? item.stretch : 1;
		});

		const sizes = new Array<number>(this.#m_items.length).fill(0);
		const remaining = new Set<number>();

		/** Provides for behavior. */
		for (let i = 0; i < this.#m_items.length; ++i)
			remaining.add(i);

		let remainingSpace = available;

		/** Provides while behavior. */
		while (remaining.size > 0) {
			let totalWeight = 0;

			/** Provides for behavior. */
			for (const index of remaining)
				totalWeight += source[index]!;

			/** Provides if behavior. */
			if (totalWeight <= 0)
				totalWeight = remaining.size;

			let changed = false;

			/** Provides for behavior. */
			for (const index of [...remaining]) {
				const weight = source[index]! > 0
					? source[index]!
					: 1;

				const proposed =
					remainingSpace * weight / totalWeight;

				const minimum = this.#minimumSize(index);
				const maximum = this.#maximumSize(index);

				/** Provides if behavior. */
				if (proposed < minimum) {
					sizes[index] = minimum;
					remainingSpace -= minimum;
					remaining.delete(index);
					changed = true;
				} else if (proposed > maximum) {
					sizes[index] = maximum;
					remainingSpace -= maximum;
					remaining.delete(index);
					changed = true;
				}
			}

			/** Provides if behavior. */
			if (remaining.size === 0)
				break;

			/** Provides if behavior. */
			if (!changed) {
				totalWeight = 0;

				/** Provides for behavior. */
				for (const index of remaining)
					totalWeight += source[index]! > 0
						? source[index]!
						: 1;

				/** Provides for behavior. */
				for (const index of remaining) {
					const weight = source[index]! > 0
						? source[index]!
						: 1;

					sizes[index] =
						remainingSpace * weight / totalWeight;
				}

				break;
			}

			remainingSpace = Math.max(0, remainingSpace);
		}

		/** Provides for behavior. */
		for (let i = 0; i < this.#m_items.length; ++i)
			this.#m_items[i]!.size = Math.max(0, sizes[i]!);

		this.#fixRounding(available);
	}

	#fixRounding(available: number): void
	{
		let total = this.#m_items.reduce(
			(sum, item) => sum + item.size,
			0
		);

		let difference = available - total;

		/** Provides for behavior. */
		for (
			let i = this.#m_items.length - 1;
			i >= 0 && Math.abs(difference) > 0.0001;
			--i
		) {
			const item = this.#m_items[i]!;
			const minimum = this.#minimumSize(i);
			const maximum = this.#maximumSize(i);

			/** Provides if behavior. */
			if (difference > 0) {
				const amount = Math.min(
					difference,
					maximum - item.size
				);

				item.size += amount;
				difference -= amount;
			} else {
				const amount = Math.min(
					-difference,
					item.size - minimum
				);

				item.size -= amount;
				difference += amount;
			}
		}

		total = this.#m_items.reduce(
			(sum, item) => sum + item.size,
			0
		);

		/** Provides if behavior. */
		if (Math.abs(available - total) < 0.0001)
			return;
	}

	#applyGeometry(): void
	{
		let pos = 0;

		/** Provides for behavior. */
		for (let i = 0; i < this.#m_items.length; ++i) {
			const item = this.#m_items[i]!;

			/** Provides if behavior. */
			if (i > 0) {
				const handle = this.#m_handles[i];

				/** Provides if behavior. */
				if (handle !== undefined && handle !== null) {
					/** Provides if behavior. */
					if (this.#m_orientation === COrientation.Horizontal)
						handle.setGeometry(pos, 0, this.handleWidth(),
							this.height());
					else
						handle.setGeometry(0, pos, this.width(), this.handleWidth());

					pos += this.handleWidth();
				}
			}

			/** Provides if behavior. */
			if (this.#m_orientation === COrientation.Horizontal)
				item.widget.setGeometry(
					pos,
					0,
					item.size,
					this.height()
				);
			else
				item.widget.setGeometry(
					0,
					pos,
					this.width(),
					item.size
				);

			pos += item.size;
		}

		this.update();
	}

	#moveRight(index: number, amount: number): number
	{
		const maximum = Math.min(
			amount,
			this.#growCapacity(0, index - 1),
			this.#shrinkCapacity(index, this.#m_items.length - 1)
		);

		/** Provides if behavior. */
		if (maximum <= 0)
			return 0;

		this.#growBackward(index - 1, maximum);
		this.#shrinkForward(index, maximum);

		return maximum;
	}

	#moveLeft(index: number, amount: number): number
	{
		const maximum = Math.min(
			amount,
			this.#shrinkCapacity(0, index - 1),
			this.#growCapacity(index, this.#m_items.length - 1)
		);

		/** Provides if behavior. */
		if (maximum <= 0)
			return 0;

		this.#shrinkBackward(index - 1, maximum);
		this.#growForward(index, maximum);

		return maximum;
	}

	#growBackward(index: number, amount: number): void
	{
		/** Provides for behavior. */
		for (let i = index; i >= 0 && amount > 0; --i) {
			const item = this.#m_items[i]!;
			const capacity = this.#maximumSize(i) - item.size;
			const value = Math.min(amount, capacity);

			item.size += value;
			amount -= value;
		}
	}

	#growForward(index: number, amount: number): void
	{
		/** Provides for behavior. */
		for (
			let i = index;
			i < this.#m_items.length && amount > 0;
			++i
		) {
			const item = this.#m_items[i]!;
			const capacity = this.#maximumSize(i) - item.size;
			const value = Math.min(amount, capacity);

			item.size += value;
			amount -= value;
		}
	}

	#shrinkBackward(index: number, amount: number): void
	{
		/** Provides for behavior. */
		for (let i = index; i >= 0 && amount > 0; --i) {
			const item = this.#m_items[i]!;
			const minimum = this.#minimumSize(i);
			const capacity = item.size - minimum;
			const value = Math.min(amount, capacity);

			item.size -= value;
			amount -= value;
		}
	}

	#shrinkForward(index: number, amount: number): void
	{
		/** Provides for behavior. */
		for (
			let i = index;
			i < this.#m_items.length && amount > 0;
			++i
		) {
			const item = this.#m_items[i]!;
			const minimum = this.#minimumSize(i);
			const capacity = item.size - minimum;
			const value = Math.min(amount, capacity);

			item.size -= value;
			amount -= value;
		}
	}

	#growCapacity(first: number, last: number): number
	{
		let result = 0;

		/** Provides for behavior. */
		for (let i = first; i <= last; ++i)
			result += Math.max(
				0,
				this.#maximumSize(i) - this.#m_items[i]!.size
			);

		return result;
	}

	#shrinkCapacity(first: number, last: number): number
	{
		let result = 0;

		/** Provides for behavior. */
		for (let i = first; i <= last; ++i)
			result += Math.max(
				0,
				this.#m_items[i]!.size - this.#minimumSize(i)
			);

		return result;
	}

	#handlePosition(index: number): number
	{
		let pos = 0;

		/** Provides for behavior. */
		for (let i = 0; i < index; ++i)
			pos += this.#m_items[i]!.size;

		pos += Math.max(0, index - 1) * this.handleWidth();

		return pos;
	}

	#availableLength(): number
	{
		const length =
			this.#m_orientation === COrientation.Horizontal
				? this.width()
				: this.height();

		const handles =
			Math.max(0, this.#m_items.length - 1) * this.handleWidth();

		return Math.max(0, length - handles);
	}

	#preferredSize(widget: CWidget): number
	{
		const hint = widget.sizeHint();

		/** Provides if behavior. */
		if (this.#m_orientation === COrientation.Horizontal)
			return Math.max(
				widget.minimumSize().width(),
				Math.min(
					widget.maximumSize().width(),
					hint.width()
				)
			);

		return Math.max(
			widget.minimumSize().height(),
			Math.min(
				widget.maximumSize().height(),
				hint.height()
			)
		);
	}

	#minimumSize(index: number): number
	{
		const widget = this.#m_items[index]?.widget;

		/** Provides if behavior. */
		if (widget === undefined)
			return 0;

		return this.#m_orientation === COrientation.Horizontal
			? widget.minimumSize().width()
			: widget.minimumSize().height();
	}

	#maximumSize(index: number): number
	{
		const widget = this.#m_items[index]!.widget;

		/** Provides if behavior. */
		if (this.#m_orientation === COrientation.Horizontal)
			return widget.maximumSize().width();

		return widget.maximumSize().height();
	}

	#clampSize(index: number, size: number): number
	{
		return Math.max(
			this.#minimumSize(index),
			Math.min(this.#maximumSize(index), size)
		);
	}
}