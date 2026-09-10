import { CSignal } from "../core/CSignal.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import { CSize } from "../geometry/CSize.js";
import { CPainter } from "../painting/CPainter.js";
import { CToolButton } from "./CToolButton.js";
import { CWidget } from "./CWidget.js";
import { CRect } from "../geometry/CRect.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";

/** Implements the calendar widget widget. */
export class CCalendarWidget extends CWidget
{
	/** Signal emitted when selection changes. */
	readonly selectionChanged = new CSignal<[]>();
	/** Public clicked member. */
	readonly clicked = new CSignal<[Date]>();
	/** Public activated member. */
	readonly activated = new CSignal<[Date]>();
	/** Signal emitted when current page changes. */
	readonly currentPageChanged = new CSignal<[number, number]>();

	#m_selectedDate = CCalendarWidget.#today();
	#m_minimumDate = new Date(1752, 8, 14);
	#m_maximumDate = new Date(9999, 11, 31);
    #m_hoverDate: Date | null = null;

	#m_shownYear = this.#m_selectedDate.getFullYear();
	#m_shownMonth = this.#m_selectedDate.getMonth();

	#m_previousButton: CToolButton;
	#m_nextButton: CToolButton;

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null)
	{
		/** Provides super behavior. */
		super(parent);

		this.#m_previousButton = new CToolButton(this);
		this.#m_previousButton.setText("<");
        this.#m_previousButton.setAutoRepeat(400, 100);

		this.#m_nextButton = new CToolButton(this);
		this.#m_nextButton.setText(">");
        this.#m_nextButton.setAutoRepeat(400, 100);

		this.#m_previousButton.clicked.connect(() => {
			this.showPreviousMonth();
		});

		this.#m_nextButton.clicked.connect(() => {
			this.showNextMonth();
		});
        this.setFocusPolicy(CFocusPolicy.StrongFocus);
	}

	/** Returns the selected date. */
	selectedDate(): Date
	{
		return new Date(this.#m_selectedDate);
	}

	/** Sets the selected date. */
	setSelectedDate(date: Date): void
	{
		const value = this.#normalizedDate(date);
		const clamped = this.#clampDate(value);

		/** Provides if behavior. */
		if (this.#sameDate(clamped, this.#m_selectedDate))
			return;

		const pageChanged =
			clamped.getFullYear() !== this.#m_shownYear ||
			clamped.getMonth() !== this.#m_shownMonth;

		this.#m_selectedDate = clamped;
		this.#m_shownYear = clamped.getFullYear();
		this.#m_shownMonth = clamped.getMonth();

		this.selectionChanged.emit();

		/** Provides if behavior. */
		if (pageChanged) {
			this.currentPageChanged.emit(this.#m_shownYear, this.#m_shownMonth + 1);
		}

		this.update();
	}

	/** Returns the minimum date. */
	minimumDate(): Date
	{
		return new Date(this.#m_minimumDate);
	}

	/** Sets the minimum date. */
	setMinimumDate(date: Date): void
	{
		const value = this.#normalizedDate(date);

		/** Provides if behavior. */
		if (value.getTime() > this.#m_maximumDate.getTime())
			return;

		/** Provides if behavior. */
		if (this.#sameDate(value, this.#m_minimumDate))
			return;

		this.#m_minimumDate = value;

		/** Provides if behavior. */
		if (this.#m_selectedDate.getTime() < value.getTime())
			this.setSelectedDate(value);

		this.update();
	}

	/** Returns the maximum date. */
	maximumDate(): Date
	{
		return new Date(this.#m_maximumDate);
	}

	/** Sets the maximum date. */
	setMaximumDate(date: Date): void
	{
		const value = this.#normalizedDate(date);

		/** Provides if behavior. */
		if (value.getTime() < this.#m_minimumDate.getTime())
			return;

		/** Provides if behavior. */
		if (this.#sameDate(value, this.#m_maximumDate))
			return;

		this.#m_maximumDate = value;

		/** Provides if behavior. */
		if (this.#m_selectedDate.getTime() > value.getTime())
			this.setSelectedDate(value);

		this.update();
	}

	/** Provides year shown behavior. */
	yearShown(): number
	{
		return this.#m_shownYear;
	}

	/** Provides month shown behavior. */
	monthShown(): number
	{
		return this.#m_shownMonth + 1;
	}

	/** Shows next month. */
	showNextMonth(): void
	{
		let year = this.#m_shownYear;
		let month = this.#m_shownMonth + 1;

		/** Provides if behavior. */
		if (month > 11) {
			month = 0;
			++year;
		}

		this.#setCurrentPageInternal(year, month);
	}

	/** Shows previous month. */
	showPreviousMonth(): void
	{
		let year = this.#m_shownYear;
		let month = this.#m_shownMonth - 1;

		/** Provides if behavior. */
		if (month < 0) {
			month = 11;
			--year;
		}

		this.#setCurrentPageInternal(year, month);
	}

	/** Shows next year. */
	showNextYear(): void
	{
		this.#setCurrentPageInternal(
			this.#m_shownYear + 1,
			this.#m_shownMonth
		);
	}

	/** Shows previous year. */
	showPreviousYear(): void
	{
		this.#setCurrentPageInternal(
			this.#m_shownYear - 1,
			this.#m_shownMonth
		);
	}

	/** Sets the current page. */
	setCurrentPage(year: number, month: number): void
	{
		/** Provides if behavior. */
		if (month < 1 || month > 12)
			return;

		this.#setCurrentPageInternal(year, month - 1);
	}

	/** Returns the preferred size of the widget. */
	override sizeHint(): CSize
	{
		return new CSize(240, 200);
	}

	/** Sets the geometry. */
	override setGeometry(x: number, y: number, width: number, height: number): void
	{
		super.setGeometry(x, y, width, height);
		this.#updateButtonGeometry();
	}

	/** Handles the mouse release event. */
	protected override mouseReleaseEvent(event: CMouseEvent): void
	{
       /** Provides if behavior. */
       if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

        const date = this.#dateAt(event.pos().x(), event.pos().y());
		/** Provides if behavior. */
		if (date === null) {
			event.ignore();
			return;
		}
        
		/** Provides if behavior. */
		if (!this.#dateEnabled(date)) {
			event.ignore();
			return;
		}
        
		const pageChanged =
			date.getFullYear() !== this.#m_shownYear ||
			date.getMonth() !== this.#m_shownMonth;

		const selectionChanged = !this.#sameDate(date, this.#m_selectedDate);

        this.clicked.emit(new Date(date));
		/** Provides if behavior. */
		if (selectionChanged) {
			this.#m_shownYear = date.getFullYear();
		    this.#m_shownMonth = date.getMonth();
            this.setSelectedDate(date);
        }
        
        /** Provides if behavior. */
        if (pageChanged) {
            this.currentPageChanged.emit(date.getFullYear(), date.getMonth() + 1);
		}
        
		event.accept();
		this.update();
	}

    /** Handles the mouse move event. */
    protected override mouseMoveEvent(event: CMouseEvent): void {
        const pos = event.pos();
        const date = this.#dateAt(pos.x(), pos.y());
        /** Provides if behavior. */
        if (date !== this.#m_hoverDate) {
            this.#m_hoverDate = date;
            this.update();
        }
        event.accept();
    }

    /** Handles the mouse leave event. */
    protected override mouseLeaveEvent(event: CMouseEvent): void {
        /** Provides if behavior. */
        if (this.#m_hoverDate === null) {
            event.ignore();
        }   else {
            this.#m_hoverDate = null;
            this.update();
            event.accept();
        }
    }

	/** Handles the paint event. */
	protected override paintEvent(painter: CPainter): void
	{
		const palette = this.palette();

		painter.setFillStyle(
			palette.color(CPaletteColorRole.Base).toCss()
		);
		painter.fillRect(this.rect());

		this.#paintHeader(painter);
		this.#paintWeekDays(painter);
		this.#paintDays(painter);
	}

    #paintHeader(painter: CPainter): void
	{
		const palette = this.palette();
		const headerHeight = this.#headerHeight();

		painter.setFillStyle(
			palette.color(CPaletteColorRole.Button).toCss()
		);
		painter.fillRect(new CRect(0, 0, this.width(), headerHeight));

		painter.setFillStyle(
			palette.color(CPaletteColorRole.Text).toCss()
		);
		painter.setFont(this.font());
		painter.setTextAlign("center");
		painter.setTextBaseline("middle");

		painter.drawText(
			this.#monthTitle(),
			this.width() / 2,
			headerHeight / 2
		);
	}

	#paintWeekDays(painter: CPainter): void
	{
		const palette = this.palette();
		const names = [
			"Mon", "Tue", "Wed", "Thu",
			"Fri", "Sat", "Sun"
		];

		const y = this.#headerHeight();
		const height = this.#weekDayHeight();
		const width = this.width() / 7;

		painter.setFillStyle(
			palette.color(CPaletteColorRole.Window).toCss()
		);
		painter.fillRect(new CRect(0, y, this.width(), height));

		painter.setFillStyle(
			palette.color(CPaletteColorRole.Text).toCss()
		);
		painter.setFont(this.font());
		painter.setTextAlign("center");
		painter.setTextBaseline("middle");

		/** Provides for behavior. */
		for (let column = 0; column < 7; ++column) {
			painter.drawText(
				names[column]!,
				column * width + width / 2,
				y + height / 2
			);
		}
	}

	#paintDays(painter: CPainter): void
	{
		const palette = this.palette();
		const firstDate = this.#firstVisibleDate();
		const cellWidth = this.width() / 7;
		const cellHeight = this.#dayAreaHeight() / 6;
		const startY =
			this.#headerHeight() + this.#weekDayHeight();

		/** Provides for behavior. */
		for (let index = 0; index < 42; ++index) {
			const date = this.#addDays(firstDate, index);
			const row = Math.floor(index / 7);
			const column = index % 7;

			const x = column * cellWidth;
			const y = startY + row * cellHeight;

			const current =
				date.getMonth() === this.#m_shownMonth &&
				date.getFullYear() === this.#m_shownYear;

			const selected =
				this.#sameDate(date, this.#m_selectedDate);

			const enabled = this.#dateEnabled(date);
            const hovered = this.#sameDate(date, this.#m_hoverDate);

			/** Provides if behavior. */
			if (selected) {
				painter.setBrush(palette.color(CPaletteColorRole.Highlight).toCss());
				painter.fillRect(new CRect(x, y, cellWidth, cellHeight));
			}   else if (hovered && enabled) {
                painter.setBrush(palette.color(CPaletteColorRole.Hover).toCss());
				painter.fillRect(new CRect(x, y, cellWidth, cellHeight));
            }

			let role = CPaletteColorRole.Text;
			/** Provides if behavior. */
			if (!enabled)
				role = CPaletteColorRole.DisabledText;
			else if (selected)
				role = CPaletteColorRole.HighlightedText;
            else if (!current)
				role = CPaletteColorRole.DisabledText;

			painter.setPen(palette.color(role).toCss());
			painter.setFont(this.font());
			painter.setTextAlign("center");
			painter.setTextBaseline("middle");

			painter.drawText(
				/** Provides string behavior. */
				String(date.getDate()),
				x + cellWidth / 2,
				y + cellHeight / 2
			);
		}
	}

	#dateAt(x: number, y: number): Date | null
	{
		const startY =
			this.#headerHeight() + this.#weekDayHeight();

		/** Provides if behavior. */
		if (x < 0 || x >= this.width())
			return null;

		/** Provides if behavior. */
		if (y < startY || y >= this.height())
			return null;

		const cellWidth = this.width() / 7;
		const cellHeight = this.#dayAreaHeight() / 6;

		const column = Math.floor(x / cellWidth);
		const row = Math.floor((y - startY) / cellHeight);

		/** Provides if behavior. */
		if (column < 0 || column > 6)
			return null;

		/** Provides if behavior. */
		if (row < 0 || row > 5)
			return null;

		const index = row * 7 + column;

		return this.#addDays(
			this.#firstVisibleDate(),
			index
		);
	}

	#firstVisibleDate(): Date
	{
		const first = new Date(
			this.#m_shownYear,
			this.#m_shownMonth,
			1
		);

		const day = first.getDay();
		const mondayBasedDay = (day + 6) % 7;

		return this.#addDays(first, -mondayBasedDay);
	}

	#monthTitle(): string
	{
		const months = [
			"January",
			"February",
			"March",
			"April",
			"May",
			"June",
			"July",
			"August",
			"September",
			"October",
			"November",
			"December"
		];

		return `${months[this.#m_shownMonth]} ` +
			`${this.#m_shownYear}`;
	}

	#setCurrentPageInternal(year: number, month: number): void
	{
		/** Provides if behavior. */
		if (year < 1 || year > 9999)
			return;

		const pageStart = new Date(year, month, 1);
		const pageEnd = new Date(year, month + 1, 0);

		/** Provides if behavior. */
		if (pageEnd.getTime() < this.#m_minimumDate.getTime())
			return;

		/** Provides if behavior. */
		if (pageStart.getTime() > this.#m_maximumDate.getTime())
			return;

		/** Provides if behavior. */
		if (
			year === this.#m_shownYear &&
			month === this.#m_shownMonth
		)
			return;

		this.#m_shownYear = year;
		this.#m_shownMonth = month;

		this.currentPageChanged.emit(
			this.#m_shownYear,
			this.#m_shownMonth + 1
		);

		this.update();
	}

	#updateButtonGeometry(): void
	{
		const height = this.#headerHeight();
		const width = height;

		this.#m_previousButton.setGeometry(
			0,
			0,
			width,
			height
		);

		this.#m_nextButton.setGeometry(
			this.width() - width,
			0,
			width,
			height
		);
	}

	#dateEnabled(date: Date): boolean
	{
		const value = date.getTime();

		return value >= this.#m_minimumDate.getTime() &&
			value <= this.#m_maximumDate.getTime();
	}

	#clampDate(date: Date): Date
	{
		/** Provides if behavior. */
		if (date.getTime() < this.#m_minimumDate.getTime())
			return new Date(this.#m_minimumDate);

		/** Provides if behavior. */
		if (date.getTime() > this.#m_maximumDate.getTime())
			return new Date(this.#m_maximumDate);

		return new Date(date);
	}

	#normalizedDate(date: Date): Date
	{
		return new Date(
			date.getFullYear(),
			date.getMonth(),
			date.getDate()
		);
	}

	#sameDate(first: Date, second: Date | null): boolean
	{
        /** Provides if behavior. */
        if (second === null)
            return false;

		return first.getFullYear() === second.getFullYear() &&
			first.getMonth() === second.getMonth() &&
			first.getDate() === second.getDate();
	}

	#addDays(date: Date, days: number): Date
	{
		return new Date(
			date.getFullYear(),
			date.getMonth(),
			date.getDate() + days
		);
	}

	#headerHeight(): number
	{
		return 32;
	}

	#weekDayHeight(): number
	{
		return 24;
	}

	#dayAreaHeight(): number
	{
		return Math.max(
			0,
			this.height() -
				this.#headerHeight() -
				this.#weekDayHeight()
		);
	}

	static #today(): Date
	{
		const date = new Date();

		return new Date(
			date.getFullYear(),
			date.getMonth(),
			date.getDate()
		);
	}
}