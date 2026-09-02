import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CDateEdit } from "../../src/widgets/CDateEdit.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";


describe("CDateEdit", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has sensible default size", () => {
		const edit = new CDateEdit();

		expect(edit.sizeHint().width()).toBe(120);
		expect(edit.sizeHint().height()).toBe(30);
	});

	test("uses current date by default", () => {
		const now = new Date();
		const edit = new CDateEdit();
		const date = edit.date();

		expect(date.getFullYear()).toBe(now.getFullYear());
		expect(date.getMonth()).toBe(now.getMonth());
		expect(date.getDate()).toBe(now.getDate());
	});

	test("date returns a copy", () => {
		const edit = new CDateEdit();

		edit.setDate(new Date(2026, 4, 14));

		const date = edit.date();
		date.setDate(20);

		expect(edit.date().getDate()).toBe(14);
	});

	test("setDate sets date", () => {
		const edit = new CDateEdit();

		edit.setDate(new Date(2025, 4, 14));

		expect(edit.date().getFullYear()).toBe(2025);
		expect(edit.date().getMonth()).toBe(4);
		expect(edit.date().getDate()).toBe(14);
	});

	test("setDate normalizes time", () => {
		const edit = new CDateEdit();

		edit.setDate(
			new Date(2025, 4, 14, 15, 30, 45)
		);

		expect(edit.date().getHours()).toBe(0);
		expect(edit.date().getMinutes()).toBe(0);
		expect(edit.date().getSeconds()).toBe(0);
	});

	test("setDate ignores invalid date", () => {
		const edit = new CDateEdit();
		const original = edit.date();

		edit.setDate(new Date(Number.NaN));

		expect(edit.date().getTime()).toBe(original.getTime());
	});

	test("setDate updates line edit text", () => {
		const edit = new CDateEdit();

		edit.setDate(new Date(2025, 4, 14));

		expect(edit.lineEdit().text()).toBe("14.05.2025");
	});

	test("line edit is read only", () => {
		const edit = new CDateEdit();

		expect(edit.lineEdit().isReadOnly()).toBe(true);
	});

	test("default display format is dd.MM.yyyy", () => {
		const edit = new CDateEdit();

		expect(edit.displayFormat()).toBe("dd.MM.yyyy");
	});

	test("setDisplayFormat changes displayed date", () => {
		const edit = new CDateEdit();

		edit.setDate(new Date(2025, 4, 14));
		edit.setDisplayFormat("yyyy-MM-dd");

		expect(edit.displayFormat()).toBe("yyyy-MM-dd");
		expect(edit.lineEdit().text()).toBe("2025-05-14");
	});

	test("display format supports non padded fields", () => {
		const edit = new CDateEdit();

		edit.setDate(new Date(2025, 4, 4));
		edit.setDisplayFormat("d.M.yyyy");

		expect(edit.lineEdit().text()).toBe("4.5.2025");
	});

	test("display format supports two digit year", () => {
		const edit = new CDateEdit();

		edit.setDate(new Date(2025, 4, 14));
		edit.setDisplayFormat("dd.MM.yy");

		expect(edit.lineEdit().text()).toBe("14.05.25");
	});

	test("dateChanged is emitted when date changes", () => {
		const edit = new CDateEdit();
		let date: Date | null = null;

		edit.dateChanged.connect(value => {
			date = value;
		});

		edit.setDate(new Date(2025, 4, 14));

		expect(date).not.toBeNull();
		expect(date!.getFullYear()).toBe(2025);
		expect(date!.getMonth()).toBe(4);
		expect(date!.getDate()).toBe(14);
	});

	test("dateChanged is not emitted for same date", () => {
		const edit = new CDateEdit();
		let count = 0;

		edit.setDate(new Date(2025, 4, 14));

		edit.dateChanged.connect(() => {
			++count;
		});

		edit.setDate(new Date(2025, 4, 14, 18, 30));

		expect(count).toBe(0);
	});

	test("dateChanged emits a copy", () => {
		const edit = new CDateEdit();
		let emitted: Date | null = null;

		edit.dateChanged.connect(date => {
			emitted = date;
		});

		edit.setDate(new Date(2025, 4, 14));

		emitted!.setDate(20);

		expect(edit.date().getDate()).toBe(14);
	});

	test("has default minimum date", () => {
		const edit = new CDateEdit();
		const date = edit.minimumDate();

		expect(date.getFullYear()).toBe(1752);
		expect(date.getMonth()).toBe(8);
		expect(date.getDate()).toBe(14);
	});

	test("has default maximum date", () => {
		const edit = new CDateEdit();
		const date = edit.maximumDate();

		expect(date.getFullYear()).toBe(9999);
		expect(date.getMonth()).toBe(11);
		expect(date.getDate()).toBe(31);
	});

	test("minimumDate returns a copy", () => {
		const edit = new CDateEdit();

		edit.setMinimumDate(new Date(2000, 0, 1));

		const date = edit.minimumDate();
		date.setFullYear(2010);

		expect(edit.minimumDate().getFullYear()).toBe(2000);
	});

	test("maximumDate returns a copy", () => {
		const edit = new CDateEdit();

		edit.setMaximumDate(new Date(2030, 11, 31));

		const date = edit.maximumDate();
		date.setFullYear(2020);

		expect(edit.maximumDate().getFullYear()).toBe(2030);
	});

	test("setMinimumDate sets minimum date", () => {
		const edit = new CDateEdit();

		edit.setMinimumDate(new Date(2020, 0, 1));

		expect(edit.minimumDate().getFullYear()).toBe(2020);
		expect(edit.minimumDate().getMonth()).toBe(0);
		expect(edit.minimumDate().getDate()).toBe(1);
	});

	test("setMaximumDate sets maximum date", () => {
		const edit = new CDateEdit();

		edit.setMaximumDate(new Date(2030, 11, 31));

		expect(edit.maximumDate().getFullYear()).toBe(2030);
		expect(edit.maximumDate().getMonth()).toBe(11);
		expect(edit.maximumDate().getDate()).toBe(31);
	});

	test("minimum date is synchronized with calendar", () => {
		const edit = new CDateEdit();

		edit.setMinimumDate(new Date(2020, 0, 1));

		const date = edit.calendarWidget().minimumDate();

		expect(date.getFullYear()).toBe(2020);
		expect(date.getMonth()).toBe(0);
		expect(date.getDate()).toBe(1);
	});

	test("maximum date is synchronized with calendar", () => {
		const edit = new CDateEdit();

		edit.setMaximumDate(new Date(2030, 11, 31));

		const date = edit.calendarWidget().maximumDate();

		expect(date.getFullYear()).toBe(2030);
		expect(date.getMonth()).toBe(11);
		expect(date.getDate()).toBe(31);
	});

	test("setDate clamps to minimum date", () => {
		const edit = new CDateEdit();

		edit.setMinimumDate(new Date(2020, 0, 1));
		edit.setDate(new Date(2010, 0, 1));

		expect(edit.date().getFullYear()).toBe(2020);
		expect(edit.date().getMonth()).toBe(0);
		expect(edit.date().getDate()).toBe(1);
	});

	test("setDate clamps to maximum date", () => {
		const edit = new CDateEdit();

		edit.setMaximumDate(new Date(2030, 11, 31));
		edit.setDate(new Date(2040, 0, 1));

		expect(edit.date().getFullYear()).toBe(2030);
		expect(edit.date().getMonth()).toBe(11);
		expect(edit.date().getDate()).toBe(31);
	});

	test("raising minimum date clamps current date", () => {
		const edit = new CDateEdit();

		edit.setDate(new Date(2025, 4, 14));
		edit.setMinimumDate(new Date(2026, 0, 1));

		expect(edit.date().getFullYear()).toBe(2026);
		expect(edit.date().getMonth()).toBe(0);
		expect(edit.date().getDate()).toBe(1);
	});

	test("lowering maximum date clamps current date", () => {
		const edit = new CDateEdit();

		edit.setDate(new Date(2025, 4, 14));
		edit.setMaximumDate(new Date(2024, 11, 31));

		expect(edit.date().getFullYear()).toBe(2024);
		expect(edit.date().getMonth()).toBe(11);
		expect(edit.date().getDate()).toBe(31);
	});

	test("minimum date above maximum is ignored", () => {
		const edit = new CDateEdit();
		const original = edit.minimumDate();

		edit.setMinimumDate(new Date(10000, 0, 1));

		expect(edit.minimumDate().getTime()).toBe(
			original.getTime()
		);
	});

	test("maximum date below minimum is ignored", () => {
		const edit = new CDateEdit();
		const original = edit.maximumDate();

		edit.setMaximumDate(new Date(1700, 0, 1));

		expect(edit.maximumDate().getTime()).toBe(
			original.getTime()
		);
	});

	test("calendar popup is enabled by default", () => {
		const edit = new CDateEdit();

		expect(edit.calendarPopup()).toBe(true);
	});

	test("setCalendarPopup changes popup state", () => {
		const edit = new CDateEdit();

		edit.setCalendarPopup(false);

		expect(edit.calendarPopup()).toBe(false);

		edit.setCalendarPopup(true);

		expect(edit.calendarPopup()).toBe(true);
	});

	test("line edit fills widget when calendar popup is disabled", () => {
		const edit = new CDateEdit();

		edit.resize(150, 30);
		edit.setCalendarPopup(false);

		expect(edit.lineEdit().width()).toBe(150);
		expect(edit.lineEdit().height()).toBe(30);
	});

	test("line edit leaves room for popup button", () => {
		const edit = new CDateEdit();

		edit.resize(150, 30);

		expect(edit.lineEdit().width()).toBe(
			150 - CDateEdit.ButtonWidth
		);
		expect(edit.lineEdit().height()).toBe(30);
	});

	test("showPopup opens popup", () => {
		const edit = new CDateEdit();

		expect(
			CApplication.instance().popupWidgets().length
		).toBe(0);

		edit.showPopup();

		expect(
			CApplication.instance().popupWidgets().length
		).toBe(1);
	});

	test("hidePopup closes popup", () => {
		const edit = new CDateEdit();

		edit.showPopup();
		edit.hidePopup();

		expect(
			CApplication.instance().popupWidgets().length
		).toBe(0);
	});

	test("showPopup does nothing when popup is disabled", () => {
		const edit = new CDateEdit();

		edit.setCalendarPopup(false);
		edit.showPopup();

		expect(
			CApplication.instance().popupWidgets().length
		).toBe(0);
	});

	test("disabling calendar popup closes open popup", () => {
		const edit = new CDateEdit();

		edit.showPopup();

		expect(
			CApplication.instance().popupWidgets().length
		).toBe(1);

		edit.setCalendarPopup(false);

		expect(
			CApplication.instance().popupWidgets().length
		).toBe(0);
	});

	test("showPopup synchronizes calendar date", () => {
		const edit = new CDateEdit();

		edit.setDate(new Date(2025, 4, 14));

		edit.calendarWidget().setSelectedDate(
			new Date(2026, 0, 1)
		);

		edit.showPopup();

		const date = edit.calendarWidget().selectedDate();

		expect(date.getFullYear()).toBe(2025);
		expect(date.getMonth()).toBe(4);
		expect(date.getDate()).toBe(14);
	});

	test("calendar click changes date", () => {
		const edit = new CDateEdit();

		edit.calendarWidget().clicked.emit(
			new Date(2025, 4, 14)
		);

		expect(edit.date().getFullYear()).toBe(2025);
		expect(edit.date().getMonth()).toBe(4);
		expect(edit.date().getDate()).toBe(14);
	});

	test("calendar click closes popup", () => {
		const edit = new CDateEdit();

		edit.showPopup();

		expect(
			CApplication.instance().popupWidgets().length
		).toBe(1);

		edit.calendarWidget().clicked.emit(
			new Date(2025, 4, 14)
		);

		expect(
			CApplication.instance().popupWidgets().length
		).toBe(0);
	});

	test("calendar click emits dateChanged", () => {
		const edit = new CDateEdit();
		let count = 0;

		edit.dateChanged.connect(() => {
			++count;
		});

		edit.calendarWidget().clicked.emit(
			new Date(2025, 4, 14)
		);

		expect(count).toBe(1);
	});

	test("calendarWidget returns same calendar", () => {
		const edit = new CDateEdit();

		expect(edit.calendarWidget()).toBe(
			edit.calendarWidget()
		);
	});

	test("line edit has no current section initially", () =>
	{
		const edit = new CDateEdit();

		expect(edit.lineEdit().currentSection()).toBe(-1);
		expect(edit.lineEdit().hasSelection()).toBe(false);
	});

	test("default format creates day month and year sections", () =>
	{
		const edit = new CDateEdit();

		edit.setDate(new Date(2026, 8, 2));

		expect(edit.lineEdit().sections()).toEqual([
			{ start: 0, length: 2 },
			{ start: 3, length: 2 },
			{ start: 6, length: 4 }
		]);
	});

	test("yyyy-MM-dd format creates sections in display order", () =>
	{
		const edit = new CDateEdit();

		edit.setDate(new Date(2026, 8, 2));
		edit.setDisplayFormat("yyyy-MM-dd");

		expect(edit.lineEdit().sections()).toEqual([
			{ start: 0, length: 4 },
			{ start: 5, length: 2 },
			{ start: 8, length: 2 }
		]);
	});

	test("variable length format creates correct section positions", () =>
	{
		const edit = new CDateEdit();

		edit.setDate(new Date(2026, 8, 2));
		edit.setDisplayFormat("d.M.yyyy");

		expect(edit.lineEdit().text()).toBe("2.9.2026");

		expect(edit.lineEdit().sections()).toEqual([
			{ start: 0, length: 1 },
			{ start: 2, length: 1 },
			{ start: 4, length: 4 }
		]);
	});

	test("stepUp increments selected day", () =>
	{
		const edit = new CDateEdit();

		edit.setDate(new Date(2026, 4, 14));
		edit.lineEdit().setCurrentSection(0);

		edit.stepUp();

		expect(edit.date().getFullYear()).toBe(2026);
		expect(edit.date().getMonth()).toBe(4);
		expect(edit.date().getDate()).toBe(15);
	});

	test("stepDown decrements selected day", () =>
	{
		const edit = new CDateEdit();

		edit.setDate(new Date(2026, 4, 14));
		edit.lineEdit().setCurrentSection(0);

		edit.stepDown();

		expect(edit.date().getFullYear()).toBe(2026);
		expect(edit.date().getMonth()).toBe(4);
		expect(edit.date().getDate()).toBe(13);
	});

	test("day wraps from last day to first day of same month", () =>
	{
		const edit = new CDateEdit();

		edit.setDate(new Date(2026, 3, 30));
		edit.lineEdit().setCurrentSection(0);

		edit.stepUp();

		expect(edit.date().getFullYear()).toBe(2026);
		expect(edit.date().getMonth()).toBe(3);
		expect(edit.date().getDate()).toBe(1);
	});

	test("day wraps from first day to last day of same month", () =>
	{
		const edit = new CDateEdit();

		edit.setDate(new Date(2026, 3, 1));
		edit.lineEdit().setCurrentSection(0);

		edit.stepDown();

		expect(edit.date().getFullYear()).toBe(2026);
		expect(edit.date().getMonth()).toBe(3);
		expect(edit.date().getDate()).toBe(30);
	});

	test("February day wrapping respects leap year", () =>
	{
		const edit = new CDateEdit();

		edit.setDate(new Date(2024, 1, 29));
		edit.lineEdit().setCurrentSection(0);

		edit.stepUp();

		expect(edit.date().getFullYear()).toBe(2024);
		expect(edit.date().getMonth()).toBe(1);
		expect(edit.date().getDate()).toBe(1);
	});

	test("month increment preserves ordinary day", () =>
	{
		const edit = new CDateEdit();

		edit.setDate(new Date(2026, 0, 15));
		edit.lineEdit().setCurrentSection(1);

		edit.stepUp();

		expect(edit.date().getFullYear()).toBe(2026);
		expect(edit.date().getMonth()).toBe(1);
		expect(edit.date().getDate()).toBe(15);
	});

	test("month decrement preserves ordinary day", () =>
	{
		const edit = new CDateEdit();

		edit.setDate(new Date(2026, 2, 15));
		edit.lineEdit().setCurrentSection(1);

		edit.stepDown();

		expect(edit.date().getFullYear()).toBe(2026);
		expect(edit.date().getMonth()).toBe(1);
		expect(edit.date().getDate()).toBe(15);
	});

	test("month increment keeps last-day semantics", () =>
	{
		const edit = new CDateEdit();

		edit.setDate(new Date(2026, 0, 31));
		edit.lineEdit().setCurrentSection(1);

		edit.stepUp();

		expect(edit.date().getFullYear()).toBe(2026);
		expect(edit.date().getMonth()).toBe(1);
		expect(edit.date().getDate()).toBe(28);

		edit.stepUp();

		expect(edit.date().getFullYear()).toBe(2026);
		expect(edit.date().getMonth()).toBe(2);
		expect(edit.date().getDate()).toBe(31);
	});

	test("month decrement keeps last-day semantics", () =>
	{
		const edit = new CDateEdit();

		edit.setDate(new Date(2026, 2, 31));
		edit.lineEdit().setCurrentSection(1);

		edit.stepDown();

		expect(edit.date().getFullYear()).toBe(2026);
		expect(edit.date().getMonth()).toBe(1);
		expect(edit.date().getDate()).toBe(28);

		edit.stepDown();

		expect(edit.date().getFullYear()).toBe(2026);
		expect(edit.date().getMonth()).toBe(0);
		expect(edit.date().getDate()).toBe(31);
	});

	test("month stepping clamps non-last day when necessary", () =>
	{
		const edit = new CDateEdit();

		edit.setDate(new Date(2026, 0, 30));
		edit.lineEdit().setCurrentSection(1);

		edit.stepUp();

		expect(edit.date().getFullYear()).toBe(2026);
		expect(edit.date().getMonth()).toBe(1);
		expect(edit.date().getDate()).toBe(28);
	});

	test("month stepping respects leap year", () =>
	{
		const edit = new CDateEdit();

		edit.setDate(new Date(2024, 0, 31));
		edit.lineEdit().setCurrentSection(1);

		edit.stepUp();

		expect(edit.date().getFullYear()).toBe(2024);
		expect(edit.date().getMonth()).toBe(1);
		expect(edit.date().getDate()).toBe(29);

		edit.stepUp();

		expect(edit.date().getFullYear()).toBe(2024);
		expect(edit.date().getMonth()).toBe(2);
		expect(edit.date().getDate()).toBe(31);
	});

	test("month wraps December to January without changing year", () =>
	{
		const edit = new CDateEdit();

		edit.setDate(new Date(2026, 11, 31));
		edit.lineEdit().setCurrentSection(1);

		edit.stepUp();

		expect(edit.date().getFullYear()).toBe(2026);
		expect(edit.date().getMonth()).toBe(0);
		expect(edit.date().getDate()).toBe(31);
	});

	test("month wraps January to December without changing year", () =>
	{
		const edit = new CDateEdit();

		edit.setDate(new Date(2026, 0, 15));
		edit.lineEdit().setCurrentSection(1);

		edit.stepDown();

		expect(edit.date().getFullYear()).toBe(2026);
		expect(edit.date().getMonth()).toBe(11);
		expect(edit.date().getDate()).toBe(15);
	});

	test("year increment preserves ordinary date", () =>
	{
		const edit = new CDateEdit();

		edit.setDate(new Date(2026, 4, 14));
		edit.lineEdit().setCurrentSection(2);

		edit.stepUp();

		expect(edit.date().getFullYear()).toBe(2027);
		expect(edit.date().getMonth()).toBe(4);
		expect(edit.date().getDate()).toBe(14);
	});

	test("year decrement preserves ordinary date", () =>
	{
		const edit = new CDateEdit();

		edit.setDate(new Date(2026, 4, 14));
		edit.lineEdit().setCurrentSection(2);

		edit.stepDown();

		expect(edit.date().getFullYear()).toBe(2025);
		expect(edit.date().getMonth()).toBe(4);
		expect(edit.date().getDate()).toBe(14);
	});

	test("year stepping clamps leap day", () =>
	{
		const edit = new CDateEdit();

		edit.setDate(new Date(2024, 1, 29));
		edit.lineEdit().setCurrentSection(2);

		edit.stepUp();

		expect(edit.date().getFullYear()).toBe(2025);
		expect(edit.date().getMonth()).toBe(1);
		expect(edit.date().getDate()).toBe(28);
	});

	test("stepping keeps current section selected", () =>
	{
		const edit = new CDateEdit();

		edit.setDate(new Date(2026, 0, 31));
		edit.lineEdit().setCurrentSection(1);

		edit.stepUp();

		expect(edit.lineEdit().currentSection()).toBe(1);
		expect(edit.lineEdit().hasSelection()).toBe(true);
	});

	test("stepUp does nothing without selected section", () =>
	{
		const edit = new CDateEdit();

		edit.setDate(new Date(2026, 4, 14));

		edit.stepUp();

		expect(edit.date().getFullYear()).toBe(2026);
		expect(edit.date().getMonth()).toBe(4);
		expect(edit.date().getDate()).toBe(14);
	});

	test("step outside minimum date is rejected", () =>
	{
		const edit = new CDateEdit();

		edit.setMinimumDate(new Date(2026, 4, 14));
		edit.setDate(new Date(2026, 4, 14));
		edit.lineEdit().setCurrentSection(0);

		edit.stepDown();

		expect(edit.date().getFullYear()).toBe(2026);
		expect(edit.date().getMonth()).toBe(4);
		expect(edit.date().getDate()).toBe(14);
	});

	test("step outside maximum date is rejected", () =>
	{
		const edit = new CDateEdit();

		edit.setMaximumDate(new Date(2026, 4, 14));
		edit.setDate(new Date(2026, 4, 14));
		edit.lineEdit().setCurrentSection(0);

		edit.stepUp();

		expect(edit.date().getFullYear()).toBe(2026);
		expect(edit.date().getMonth()).toBe(4);
		expect(edit.date().getDate()).toBe(14);
	});

	test("stepping emits dateChanged once", () =>
	{
		const edit = new CDateEdit();
		const changed = vi.fn();

		edit.setDate(new Date(2026, 4, 14));
		edit.lineEdit().setCurrentSection(0);
		edit.dateChanged.connect(changed);

		edit.stepUp();

		expect(changed).toHaveBeenCalledTimes(1);

		const date = changed.mock.calls[0]?.[0];

		expect(date.getFullYear()).toBe(2026);
		expect(date.getMonth()).toBe(4);
		expect(date.getDate()).toBe(15);
	});

	test("rejected step does not emit dateChanged", () =>
	{
		const edit = new CDateEdit();
		const changed = vi.fn();

		edit.setMaximumDate(new Date(2026, 4, 14));
		edit.setDate(new Date(2026, 4, 14));
		edit.lineEdit().setCurrentSection(0);
		edit.dateChanged.connect(changed);

		edit.stepUp();

		expect(changed).not.toHaveBeenCalled();
	});
});