import { CSignal } from "../core/CSignal.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import { CSize } from "../geometry/CSize.js";
import { CPainter } from "../painting/CPainter.js";
import { CToolButton } from "./CToolButton.js";
import { CWidget } from "./CWidget.js";
import { CRect } from "../geometry/CRect.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";

export class CCalendarWidget extends CWidget
{
	readonly selectionChanged = new CSignal<[]>();
	readonly clicked = new CSignal<[Date]>();
	readonly activated = new CSignal<[Date]>();
	readonly currentPageChanged = new CSignal<[number, number]>();

	#m_selectedDate = CCalendarWidget.#today();
	#m_minimumDate = new Date(1752, 8, 14);
	#m_maximumDate = new Date(9999, 11, 31);
    #m_hoverDate: Date | null = null;

	#m_shownYear = this.#m_selectedDate.getFullYear();
	#m_shownMonth = this.#m_selectedDate.getMonth();

	#m_previousButton: CToolButton;
	#m_nextButton: CToolButton;

	constructor(parent: CWidget | null = null)
	{
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

	selectedDate(): Date
	{
		return new Date(this.#m_selectedDate);
	}

	setSelectedDate(date: Date): void
	{
		const value = this.#normalizedDate(date);
		const clamped = this.#clampDate(value);

		if (this.#sameDate(clamped, this.#m_selectedDate))
			return;

		const pageChanged =
			clamped.getFullYear() !== this.#m_shownYear ||
			clamped.getMonth() !== this.#m_shownMonth;

		this.#m_selectedDate = clamped;
		this.#m_shownYear = clamped.getFullYear();
		this.#m_shownMonth = clamped.getMonth();

		this.selectionChanged.emit();

		if (pageChanged) {
			this.currentPageChanged.emit(this.#m_shownYear, this.#m_shownMonth + 1);
		}

		this.update();
	}

	minimumDate(): Date
	{
		return new Date(this.#m_minimumDate);
	}

	setMinimumDate(date: Date): void
	{
		const value = this.#normalizedDate(date);

		if (value.getTime() > this.#m_maximumDate.getTime())
			return;

		if (this.#sameDate(value, this.#m_minimumDate))
			return;

		this.#m_minimumDate = value;

		if (this.#m_selectedDate.getTime() < value.getTime())
			this.setSelectedDate(value);

		this.update();
	}

	maximumDate(): Date
	{
		return new Date(this.#m_maximumDate);
	}

	setMaximumDate(date: Date): void
	{
		const value = this.#normalizedDate(date);

		if (value.getTime() < this.#m_minimumDate.getTime())
			return;

		if (this.#sameDate(value, this.#m_maximumDate))
			return;

		this.#m_maximumDate = value;

		if (this.#m_selectedDate.getTime() > value.getTime())
			this.setSelectedDate(value);

		this.update();
	}

	yearShown(): number
	{
		return this.#m_shownYear;
	}

	monthShown(): number
	{
		return this.#m_shownMonth + 1;
	}

	showNextMonth(): void
	{
		let year = this.#m_shownYear;
		let month = this.#m_shownMonth + 1;

		if (month > 11) {
			month = 0;
			++year;
		}

		this.#setCurrentPageInternal(year, month);
	}

	showPreviousMonth(): void
	{
		let year = this.#m_shownYear;
		let month = this.#m_shownMonth - 1;

		if (month < 0) {
			month = 11;
			--year;
		}

		this.#setCurrentPageInternal(year, month);
	}

	showNextYear(): void
	{
		this.#setCurrentPageInternal(
			this.#m_shownYear + 1,
			this.#m_shownMonth
		);
	}

	showPreviousYear(): void
	{
		this.#setCurrentPageInternal(
			this.#m_shownYear - 1,
			this.#m_shownMonth
		);
	}

	setCurrentPage(year: number, month: number): void
	{
		if (month < 1 || month > 12)
			return;

		this.#setCurrentPageInternal(year, month - 1);
	}

	override sizeHint(): CSize
	{
		return new CSize(240, 200);
	}

	override setGeometry(x: number, y: number, width: number, height: number): void
	{
		super.setGeometry(x, y, width, height);
		this.#updateButtonGeometry();
	}

	protected override mouseReleaseEvent(event: CMouseEvent): void
	{
       if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

        const date = this.#dateAt(event.pos().x(), event.pos().y());
		if (date === null) {
			event.ignore();
			return;
		}
        
		if (!this.#dateEnabled(date)) {
			event.ignore();
			return;
		}
        
		const pageChanged =
			date.getFullYear() !== this.#m_shownYear ||
			date.getMonth() !== this.#m_shownMonth;

		const selectionChanged = !this.#sameDate(date, this.#m_selectedDate);

        this.clicked.emit(new Date(date));
		if (selectionChanged) {
			this.#m_shownYear = date.getFullYear();
		    this.#m_shownMonth = date.getMonth();
            this.setSelectedDate(date);
        }
        
        if (pageChanged) {
            this.currentPageChanged.emit(date.getFullYear(), date.getMonth() + 1);
		}
        
		event.accept();
		this.update();
	}

    protected override mouseMoveEvent(event: CMouseEvent): void {
        const pos = event.pos();
        const date = this.#dateAt(pos.x(), pos.y());
        if (date !== this.#m_hoverDate) {
            this.#m_hoverDate = date;
            this.update();
        }
        event.accept();
    }

    protected override mouseLeaveEvent(event: CMouseEvent): void {
        if (this.#m_hoverDate === null) {
            event.ignore();
        }   else {
            this.#m_hoverDate = null;
            this.update();
            event.accept();
        }
    }

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

			if (selected) {
				painter.setBrush(palette.color(CPaletteColorRole.Highlight).toCss());
				painter.fillRect(new CRect(x, y, cellWidth, cellHeight));
			}   else if (hovered && enabled) {
                painter.setBrush(palette.color(CPaletteColorRole.Hover).toCss());
				painter.fillRect(new CRect(x, y, cellWidth, cellHeight));
            }

			let role = CPaletteColorRole.Text;
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

		if (x < 0 || x >= this.width())
			return null;

		if (y < startY || y >= this.height())
			return null;

		const cellWidth = this.width() / 7;
		const cellHeight = this.#dayAreaHeight() / 6;

		const column = Math.floor(x / cellWidth);
		const row = Math.floor((y - startY) / cellHeight);

		if (column < 0 || column > 6)
			return null;

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
		if (year < 1 || year > 9999)
			return;

		const pageStart = new Date(year, month, 1);
		const pageEnd = new Date(year, month + 1, 0);

		if (pageEnd.getTime() < this.#m_minimumDate.getTime())
			return;

		if (pageStart.getTime() > this.#m_maximumDate.getTime())
			return;

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
		if (date.getTime() < this.#m_minimumDate.getTime())
			return new Date(this.#m_minimumDate);

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