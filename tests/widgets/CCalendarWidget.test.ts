import {
	afterEach,
	beforeEach,
	describe,
	expect,
	test
} from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import {
	CMouseButton,
	CMouseEvent
} from "../../src/events/CMouseEvent.js";
import { CCalendarWidget } from "../../src/widgets/CCalendarWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";


describe("CCalendarWidget", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("sizeHint returns default calendar size", () => {
		const calendar = new CCalendarWidget();

		expect(calendar.sizeHint().width()).toBe(240);
		expect(calendar.sizeHint().height()).toBe(200);
	});

	test("selectedDate returns a copy", () => {
		const calendar = new CCalendarWidget();

		calendar.setSelectedDate(new Date(2026, 8, 2));

		const date = calendar.selectedDate();
		date.setDate(20);

		expect(calendar.selectedDate().getDate()).toBe(2);
	});

	test("setSelectedDate copies supplied date", () => {
		const calendar = new CCalendarWidget();
		const date = new Date(2026, 8, 2);

		calendar.setSelectedDate(date);
		date.setDate(20);

		expect(calendar.selectedDate().getDate()).toBe(2);
	});

	test("setSelectedDate changes selected date", () => {
		const calendar = new CCalendarWidget();

		calendar.setSelectedDate(new Date(2026, 8, 2));

		const date = calendar.selectedDate();

		expect(date.getFullYear()).toBe(2026);
		expect(date.getMonth()).toBe(8);
		expect(date.getDate()).toBe(2);
	});

	test("setSelectedDate changes current page", () => {
		const calendar = new CCalendarWidget();

		calendar.setSelectedDate(new Date(2026, 8, 2));

		expect(calendar.yearShown()).toBe(2026);
		expect(calendar.monthShown()).toBe(9);
	});

	test("monthShown uses months from 1 to 12", () => {
		const calendar = new CCalendarWidget();

		calendar.setSelectedDate(new Date(2026, 0, 15));
		expect(calendar.monthShown()).toBe(1);

		calendar.setSelectedDate(new Date(2026, 11, 15));
		expect(calendar.monthShown()).toBe(12);
	});

	test("setSelectedDate emits selectionChanged", () => {
		const calendar = new CCalendarWidget();
		let count = 0;

		calendar.setSelectedDate(new Date(2026, 8, 2));

		calendar.selectionChanged.connect(() => {
			++count;
		});

		calendar.setSelectedDate(new Date(2026, 8, 3));

		expect(count).toBe(1);
	});

	test("setting same selected date does not emit selectionChanged", () => {
		const calendar = new CCalendarWidget();
		let count = 0;

		calendar.setSelectedDate(new Date(2026, 8, 2));

		calendar.selectionChanged.connect(() => {
			++count;
		});

		calendar.setSelectedDate(new Date(2026, 8, 2));

		expect(count).toBe(0);
	});

	test("setSelectedDate emits currentPageChanged when month changes", () => {
		const calendar = new CCalendarWidget();
		let year = 0;
		let month = 0;

		calendar.setSelectedDate(new Date(2026, 8, 2));

		calendar.currentPageChanged.connect((y, m) => {
			year = y;
			month = m;
		});

		calendar.setSelectedDate(new Date(2026, 9, 2));

		expect(year).toBe(2026);
		expect(month).toBe(10);
	});

	test("setSelectedDate does not emit currentPageChanged within same month", () => {
		const calendar = new CCalendarWidget();
		let count = 0;

		calendar.setSelectedDate(new Date(2026, 8, 2));

		calendar.currentPageChanged.connect(() => {
			++count;
		});

		calendar.setSelectedDate(new Date(2026, 8, 20));

		expect(count).toBe(0);
	});

	test("minimumDate returns a copy", () => {
		const calendar = new CCalendarWidget();

		calendar.setMinimumDate(new Date(2020, 0, 1));

		const date = calendar.minimumDate();
		date.setFullYear(2030);

		expect(calendar.minimumDate().getFullYear()).toBe(2020);
	});

	test("maximumDate returns a copy", () => {
		const calendar = new CCalendarWidget();

		calendar.setMaximumDate(new Date(2030, 11, 31));

		const date = calendar.maximumDate();
		date.setFullYear(2020);

		expect(calendar.maximumDate().getFullYear()).toBe(2030);
	});

	test("setMinimumDate copies supplied date", () => {
		const calendar = new CCalendarWidget();
		const date = new Date(2020, 0, 1);

		calendar.setMinimumDate(date);
		date.setFullYear(2030);

		expect(calendar.minimumDate().getFullYear()).toBe(2020);
	});

	test("setMaximumDate copies supplied date", () => {
		const calendar = new CCalendarWidget();
		const date = new Date(2030, 11, 31);

		calendar.setMaximumDate(date);
		date.setFullYear(2020);

		expect(calendar.maximumDate().getFullYear()).toBe(2030);
	});

	test("minimum date clamps selected date", () => {
		const calendar = new CCalendarWidget();

		calendar.setSelectedDate(new Date(2026, 7, 15));
		calendar.setMinimumDate(new Date(2026, 8, 1));

		const date = calendar.selectedDate();

		expect(date.getFullYear()).toBe(2026);
		expect(date.getMonth()).toBe(8);
		expect(date.getDate()).toBe(1);
	});

	test("maximum date clamps selected date", () => {
		const calendar = new CCalendarWidget();

		calendar.setSelectedDate(new Date(2026, 9, 15));
		calendar.setMaximumDate(new Date(2026, 8, 30));

		const date = calendar.selectedDate();

		expect(date.getFullYear()).toBe(2026);
		expect(date.getMonth()).toBe(8);
		expect(date.getDate()).toBe(30);
	});

	test("minimum date greater than maximum date is rejected", () => {
		const calendar = new CCalendarWidget();

		calendar.setMaximumDate(new Date(2026, 11, 31));
		calendar.setMinimumDate(new Date(2027, 0, 1));

		expect(calendar.minimumDate().getTime()).toBe(
			new Date(1752, 8, 14).getTime()
		);
	});

	test("maximum date smaller than minimum date is rejected", () => {
		const calendar = new CCalendarWidget();

		calendar.setMinimumDate(new Date(2026, 0, 1));
		calendar.setMaximumDate(new Date(2025, 11, 31));

		expect(calendar.maximumDate().getTime()).toBe(
			new Date(9999, 11, 31).getTime()
		);
	});

	test("showNextMonth advances one month", () => {
		const calendar = new CCalendarWidget();

		calendar.setCurrentPage(2026, 9);
		calendar.showNextMonth();

		expect(calendar.yearShown()).toBe(2026);
		expect(calendar.monthShown()).toBe(10);
	});

	test("showPreviousMonth goes back one month", () => {
		const calendar = new CCalendarWidget();

		calendar.setCurrentPage(2026, 9);
		calendar.showPreviousMonth();

		expect(calendar.yearShown()).toBe(2026);
		expect(calendar.monthShown()).toBe(8);
	});

	test("showNextMonth crosses year boundary", () => {
		const calendar = new CCalendarWidget();

		calendar.setCurrentPage(2026, 12);
		calendar.showNextMonth();

		expect(calendar.yearShown()).toBe(2027);
		expect(calendar.monthShown()).toBe(1);
	});

	test("showPreviousMonth crosses year boundary", () => {
		const calendar = new CCalendarWidget();

		calendar.setCurrentPage(2026, 1);
		calendar.showPreviousMonth();

		expect(calendar.yearShown()).toBe(2025);
		expect(calendar.monthShown()).toBe(12);
	});

	test("showNextYear advances one year", () => {
		const calendar = new CCalendarWidget();

		calendar.setCurrentPage(2026, 9);
		calendar.showNextYear();

		expect(calendar.yearShown()).toBe(2027);
		expect(calendar.monthShown()).toBe(9);
	});

	test("showPreviousYear goes back one year", () => {
		const calendar = new CCalendarWidget();

		calendar.setCurrentPage(2026, 9);
		calendar.showPreviousYear();

		expect(calendar.yearShown()).toBe(2025);
		expect(calendar.monthShown()).toBe(9);
	});

	test("setCurrentPage emits currentPageChanged", () => {
		const calendar = new CCalendarWidget();
		let year = 0;
		let month = 0;

        calendar.setCurrentPage(2025, 1);
		calendar.currentPageChanged.connect((y, m) => {
			year = y;
			month = m;
		});

		calendar.setCurrentPage(2026, 9);

		expect(year).toBe(2026);
		expect(month).toBe(9);
	});

	test("setting same current page does not emit currentPageChanged", () => {
		const calendar = new CCalendarWidget();
		let count = 0;

		calendar.setCurrentPage(2026, 9);

		calendar.currentPageChanged.connect(() => {
			++count;
		});

		calendar.setCurrentPage(2026, 9);

		expect(count).toBe(0);
	});

	test("setCurrentPage rejects invalid month", () => {
		const calendar = new CCalendarWidget();

		calendar.setCurrentPage(2026, 9);

		calendar.setCurrentPage(2026, 0);
		expect(calendar.monthShown()).toBe(9);

		calendar.setCurrentPage(2026, 13);
		expect(calendar.monthShown()).toBe(9);
	});

	test("navigation does not move before minimum date page", () => {
		const calendar = new CCalendarWidget();

		calendar.setMinimumDate(new Date(2026, 8, 15));
		calendar.setCurrentPage(2026, 9);
		calendar.showPreviousMonth();

		expect(calendar.yearShown()).toBe(2026);
		expect(calendar.monthShown()).toBe(9);
	});

	test("navigation does not move beyond maximum date page", () => {
		const calendar = new CCalendarWidget();

		calendar.setMaximumDate(new Date(2026, 9, 10));
		calendar.setCurrentPage(2026, 10);
		calendar.showNextMonth();

		expect(calendar.yearShown()).toBe(2026);
		expect(calendar.monthShown()).toBe(10);
	});

	test("supports leap day", () => {
		const calendar = new CCalendarWidget();

		calendar.setSelectedDate(new Date(2024, 1, 29));

		const date = calendar.selectedDate();

		expect(date.getFullYear()).toBe(2024);
		expect(date.getMonth()).toBe(1);
		expect(date.getDate()).toBe(29);
	});

	test("click selects date", () => {
		const calendar = new CCalendarWidget();

		calendar.setGeometry(0, 0, 280, 240);
		calendar.setCurrentPage(2026, 9);

		calendar.event(
			new CMouseEvent(
				CEventType.MouseRelease,
				100,
				72,
				CMouseButton.LeftButton
			)
		);

		const date = calendar.selectedDate();

		expect(date.getFullYear()).toBe(2026);
		expect(date.getMonth()).toBe(8);
		expect(date.getDate()).toBe(2);
	});

	test("click emits clicked signal", () => {
		const calendar = new CCalendarWidget();
		let clickedDate: Date | null = null;

		calendar.setGeometry(0, 0, 240, 200);
		calendar.setCurrentPage(2026, 9);

		calendar.clicked.connect(date => {
			clickedDate = date;
		});
		calendar.event(new CMouseEvent(CEventType.MouseRelease, 100, 72, CMouseButton.LeftButton));

		expect(clickedDate).not.toBeNull();
		expect(clickedDate!.getFullYear()).toBe(2026);
		expect(clickedDate!.getMonth()).toBe(8);
		expect(clickedDate!.getDate()).toBe(2);
	});

	test("clicked signal receives a date copy", () => {
		const calendar = new CCalendarWidget();

		calendar.setGeometry(0, 0, 240, 200);
		calendar.setCurrentPage(2026, 9);

		calendar.clicked.connect(date => {
			date.setDate(20);
		});

		calendar.event(new CMouseEvent( CEventType.MouseRelease, 100, 72, CMouseButton.LeftButton));
		expect(calendar.selectedDate().getDate()).toBe(2);
	});

	test("clicking selected date does not emit selectionChanged", () => {
		const calendar = new CCalendarWidget();
		let count = 0;

		calendar.setGeometry(0, 0, 240, 200);
		calendar.setSelectedDate(new Date(2026, 8, 2));

		calendar.selectionChanged.connect(() => {
			++count;
		});

		calendar.event(
			new CMouseEvent(
				CEventType.MouseRelease,
				100,
				72,
				CMouseButton.LeftButton
			)
		);

		expect(count).toBe(0);
	});

	test("clicking selected date still emits clicked", () => {
		const calendar = new CCalendarWidget();
		let count = 0;

		calendar.setGeometry(0, 0, 240, 200);
		calendar.setSelectedDate(new Date(2026, 8, 2));

		calendar.clicked.connect(() => {
			++count;
		});

		calendar.event(
			new CMouseEvent(
				CEventType.MouseRelease,
				100,
				72,
				CMouseButton.LeftButton
			)
		);

		expect(count).toBe(1);
	});

	test("clicking previous month day switches to previous month", () => {
		const calendar = new CCalendarWidget();

		calendar.setGeometry(0, 0, 240, 200);
		calendar.setCurrentPage(2026, 9);

		calendar.event(
			new CMouseEvent(
				CEventType.MouseRelease,
				20,
				72,
				CMouseButton.LeftButton
			)
		);

		const date = calendar.selectedDate();

		expect(date.getFullYear()).toBe(2026);
		expect(date.getMonth()).toBe(7);
		expect(date.getDate()).toBe(31);

		expect(calendar.yearShown()).toBe(2026);
		expect(calendar.monthShown()).toBe(8);
	});

	test("previous month overflow click emits new page", () => {
		const calendar = new CCalendarWidget();
		let year = 0;
		let month = 0;

		calendar.setGeometry(0, 0, 240, 200);
		calendar.setCurrentPage(2026, 9);

		calendar.currentPageChanged.connect((y, m) => {
			year = y;
			month = m;
		});

		calendar.event(new CMouseEvent( CEventType.MouseRelease, 20, 72, CMouseButton.LeftButton));

		expect(year).toBe(2026);
		expect(month).toBe(8);
	});

	test("clicking next month day switches to next month", () => {
		const calendar = new CCalendarWidget();

		calendar.setGeometry(0, 0, 240, 200);
		calendar.setCurrentPage(2026, 8);

		calendar.event(new CMouseEvent(CEventType.MouseRelease, 50, 185, CMouseButton.LeftButton));

		const date = calendar.selectedDate();

		expect(date.getFullYear()).toBe(2026);
		expect(date.getMonth()).toBe(8);
		expect(date.getDate()).toBe(1);

		expect(calendar.yearShown()).toBe(2026);
		expect(calendar.monthShown()).toBe(9);
	});

	test("next month overflow click emits new page", () => {
		const calendar = new CCalendarWidget();
		let year = 0;
		let month = 0;

		calendar.setGeometry(0, 0, 240, 200);
		calendar.setCurrentPage(2026, 8);

		calendar.currentPageChanged.connect((y, m) => {
			year = y;
			month = m;
		});

		calendar.event(
			new CMouseEvent(
				CEventType.MouseRelease,
				50,
				185,
				CMouseButton.LeftButton
			)
		);

		expect(year).toBe(2026);
		expect(month).toBe(9);
	});

	test("overflow click emits selectionChanged only once", () => {
		const calendar = new CCalendarWidget();
		let count = 0;

		calendar.setGeometry(0, 0, 240, 200);
		calendar.setSelectedDate(new Date(2026, 8, 2));

		calendar.selectionChanged.connect(() => {
			++count;
		});

		calendar.event(new CMouseEvent(CEventType.MouseRelease, 20, 72, CMouseButton.LeftButton));
		expect(count).toBe(1);
	});

	test("overflow click emits signals in expected order", () => {
		const calendar = new CCalendarWidget();
		const signals: string[] = [];

		calendar.setGeometry(0, 0, 240, 200);
		calendar.setSelectedDate(new Date(2026, 8, 2));

		calendar.currentPageChanged.connect(() => {
			signals.push("page");
		});

		calendar.selectionChanged.connect(() => {
			signals.push("selection");
		});

		calendar.clicked.connect(() => {
			signals.push("clicked");
		});

		calendar.event(
			new CMouseEvent(
				CEventType.MouseRelease,
				20,
				72,
				CMouseButton.LeftButton
			)
		);

		expect(signals).toEqual([
			"clicked",
            "selection",
            "page"
		]);
	});

	test("disabled date cannot be selected", () => {
		const calendar = new CCalendarWidget();

		calendar.setGeometry(0, 0, 240, 200);
		calendar.setSelectedDate(new Date(2026, 8, 15));
		calendar.setMinimumDate(new Date(2026, 8, 10));

		calendar.event(
			new CMouseEvent(
				CEventType.MouseRelease,
				100,
				72,
				CMouseButton.LeftButton
			)
		);

		expect(calendar.selectedDate().getDate()).toBe(15);
	});

	test("disabled date does not emit clicked", () => {
		const calendar = new CCalendarWidget();
		let count = 0;

		calendar.setGeometry(0, 0, 240, 200);
		calendar.setSelectedDate(new Date(2026, 8, 15));
		calendar.setMinimumDate(new Date(2026, 8, 10));

		calendar.clicked.connect(() => {
			++count;
		});

		calendar.event(
			new CMouseEvent(
				CEventType.MouseRelease,
				100,
				72,
				CMouseButton.LeftButton
			)
		);

		expect(count).toBe(0);
	});

	test("right mouse release does not select date", () => {
		const calendar = new CCalendarWidget();

		calendar.setGeometry(0, 0, 240, 200);
		calendar.setSelectedDate(new Date(2026, 8, 15));

		calendar.event(
			new CMouseEvent(
				CEventType.MouseRelease,
				100,
				72,
				CMouseButton.RightButton
			)
		);

		expect(calendar.selectedDate().getDate()).toBe(15);
	});

	test("click outside day area does not select date", () => {
		const calendar = new CCalendarWidget();

		calendar.setGeometry(0, 0, 240, 200);
		calendar.setSelectedDate(new Date(2026, 8, 15));

		calendar.event(
			new CMouseEvent(
				CEventType.MouseRelease,
				140,
				20,
				CMouseButton.LeftButton
			)
		);

		expect(calendar.selectedDate().getDate()).toBe(15);
	});

	test("mouse move over day is accepted", () => {
		const calendar = new CCalendarWidget();

		calendar.setGeometry(0, 0, 240, 200);

		const result = calendar.event(
			new CMouseEvent(
				CEventType.MouseMove,
				100,
				72,
				CMouseButton.NoButton
			)
		);

		expect(result).toBe(true);
	});

	test("mouse leave clears hover state", () => {
		const calendar = new CCalendarWidget();

		calendar.setGeometry(0, 0, 240, 200);

		calendar.event(
			new CMouseEvent(
				CEventType.MouseMove,
				100,
				72,
				CMouseButton.NoButton
			)
		);

		const result = calendar.event(
			new CMouseEvent(
				CEventType.MouseLeave,
				0,
				0,
				CMouseButton.NoButton
			)
		);

		expect(result).toBe(true);
	});
});