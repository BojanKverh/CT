import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CFocusEvent } from "../../src/events/CFocusEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { CSectionLineEdit } from "../../src/widgets/CSectionLineEdit.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";


describe("CSectionLineEdit", () =>
{
	beforeEach(() =>
	{
		new CApplication(createTestCanvas());
	});

	afterEach(() =>
	{
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("is read only by default", () =>
	{
		const edit = new CSectionLineEdit();

		expect(edit.isReadOnly()).toBe(true);
	});

	test("has no sections by default", () =>
	{
		const edit = new CSectionLineEdit();

		expect(edit.sections()).toEqual([]);
		expect(edit.currentSection()).toBe(-1);
	});

	test("setSections stores sections", () =>
	{
		const edit = new CSectionLineEdit();

		edit.setText("12:34");
		edit.setSections([
			{ start: 0, length: 2 },
			{ start: 3, length: 2 }
		]);

		expect(edit.sections()).toEqual([
			{ start: 0, length: 2 },
			{ start: 3, length: 2 }
		]);
	});

	test("sections returns a copy", () =>
	{
		const edit = new CSectionLineEdit();

		edit.setText("12:34");
		edit.setSections([
			{ start: 0, length: 2 }
		]);

		const sections = edit.sections();

		(sections[0] as { start: number }).start = 10;

		expect(edit.sections()[0]!.start).toBe(0);
	});

	test("no section selected until focus", () =>
	{
		const edit = new CSectionLineEdit();

		edit.setText("12:34");
		edit.setSections([
			{ start: 0, length: 2 },
			{ start: 3, length: 2 }
		]);

		expect(edit.currentSection()).toBe(-1);
	});

	test("current section is selected", () =>
	{
		const edit = new CSectionLineEdit();

		edit.setText("12:34");
		edit.setSections([
			{ start: 0, length: 2 },
			{ start: 3, length: 2 }
		]);
        edit.setCurrentSection(0);

		expect(edit.selectionStart()).toBe(0);
		expect(edit.selectionEnd()).toBe(2);
		expect(edit.selectedText()).toBe("12");
	});

	test("setCurrentSection changes selection", () =>
	{
		const edit = new CSectionLineEdit();

		edit.setText("12:34");
		edit.setSections([
			{ start: 0, length: 2 },
			{ start: 3, length: 2 }
		]);

		edit.setCurrentSection(1);

		expect(edit.currentSection()).toBe(1);
		expect(edit.selectionStart()).toBe(3);
		expect(edit.selectionEnd()).toBe(5);
		expect(edit.selectedText()).toBe("34");
	});

	test("setCurrentSection emits sectionChanged", () =>
	{
		const edit = new CSectionLineEdit();
		const changed = vi.fn();

		edit.setText("12:34");
		edit.setSections([
			{ start: 0, length: 2 },
			{ start: 3, length: 2 }
		]);

		edit.sectionChanged.connect(changed);

		edit.setCurrentSection(1);

		expect(changed).toHaveBeenCalledTimes(1);
		expect(changed).toHaveBeenCalledWith(1);
	});

	test("setting same current section does not emit", () =>
	{
		const edit = new CSectionLineEdit();
		const changed = vi.fn();

		edit.setText("12:34");
		edit.setSections([
			{ start: 0, length: 2 },
			{ start: 3, length: 2 }
		]);

        edit.setCurrentSection(0);
		edit.sectionChanged.connect(changed);

		edit.setCurrentSection(0);

		expect(changed).not.toHaveBeenCalled();
	});

	test("invalid current section is ignored", () =>
	{
		const edit = new CSectionLineEdit();

		edit.setText("12:34");
		edit.setSections([
			{ start: 0, length: 2 },
			{ start: 3, length: 2 }
		]);

		edit.setCurrentSection(5);

		expect(edit.currentSection()).toBe(-1);
	});

	test("empty sections clear selection", () =>
	{
		const edit = new CSectionLineEdit();

		edit.setText("12:34");
		edit.setSections([
			{ start: 0, length: 2 }
		]);

		edit.setSections([]);

		expect(edit.currentSection()).toBe(-1);
		expect(edit.hasSelection()).toBe(false);
	});

	test("ArrowRight selects next section", () =>
	{
		const edit = new CSectionLineEdit();

		edit.setText("12:34:56");
		edit.setSections([
			{ start: 0, length: 2 },
			{ start: 3, length: 2 },
            { start: 6, length: 2 }
		]);

        edit.setCurrentSection(1);

		edit.event(new CKeyEvent(CEventType.KeyPress, "ArrowRight", false, false, false, false));
		expect(edit.currentSection()).toBe(2);
	});

	test("ArrowRight wraps to first section", () =>
	{
		const edit = new CSectionLineEdit();

		edit.setText("12:34:56");
		edit.setSections([
			{ start: 0, length: 2 },
			{ start: 3, length: 2 },
            { start: 6, length: 2 }
		]);

		edit.setCurrentSection(2);

		edit.event(new CKeyEvent(CEventType.KeyPress, "ArrowRight", false, false, false, false));

		expect(edit.currentSection()).toBe(0);
	});

    test("ArrowLeft selects previous section", () =>
	{
		const edit = new CSectionLineEdit();

		edit.setText("12:34:56");
		edit.setSections([
			{ start: 0, length: 2 },
			{ start: 3, length: 2 },
            { start: 6, length: 2 }
		]);

        edit.setCurrentSection(1);

		edit.event(new CKeyEvent(CEventType.KeyPress, "ArrowLeft", false, false, false, false));
		expect(edit.currentSection()).toBe(0);
	});

	test("ArrowLeft wraps to last section", () =>
	{
		const edit = new CSectionLineEdit();

		edit.setText("12:34:56");
		edit.setSections([
			{ start: 0, length: 2 },
			{ start: 3, length: 2 },
            { start: 6, length: 2 }
		]);

        edit.setCurrentSection(0);
		edit.event(new CKeyEvent(CEventType.KeyPress, "ArrowLeft", false, false, false, false));
		expect(edit.currentSection()).toBe(2);
	});

	test("ArrowUp emits positive step request", () =>
	{
		const edit = new CSectionLineEdit();
		const step = vi.fn();

		edit.setText("12:34:56");
		edit.setSections([
			{ start: 0, length: 2 },
			{ start: 3, length: 2 },
            { start: 6, length: 2 }
		]);

        edit.setCurrentSection(0);
		edit.stepRequested.connect(step);

		edit.event(new CKeyEvent(CEventType.KeyPress, "ArrowUp", false, false, false, false));

		expect(step).toHaveBeenCalledTimes(1);
		expect(step).toHaveBeenCalledWith(0, 1);
	});

	test("ArrowDown emits negative step request", () =>
	{
		const edit = new CSectionLineEdit();
		const step = vi.fn();

		edit.setText("12:34");
		edit.setSections([
			{ start: 0, length: 2 },
			{ start: 3, length: 2 }
		]);

		edit.setCurrentSection(1);
		edit.stepRequested.connect(step);

		edit.event(
			new CKeyEvent(
				CEventType.KeyPress,
				"ArrowDown",
				false,
				false,
				false,
				false
			)
		);

		expect(step).toHaveBeenCalledWith(1, -1);
	});

	test("click selects section under mouse", () =>
	{
		const edit = new CSectionLineEdit();

		edit.setGeometry(0, 0, 100, 30);
		edit.setText("12:34");
		edit.setSections([
			{ start: 0, length: 2 },
			{ start: 3, length: 2 }
		]);

		const event = new CMouseEvent(CEventType.MousePress, 30, 15, CMouseButton.LeftButton);

		edit.event(event);

		expect(edit.currentSection()).toBe(1);
	});

	test("click outside sections does not change section", () =>
	{
		const edit = new CSectionLineEdit();

		edit.setGeometry(0, 0, 120, 30);
		edit.setText("12:34:56");
		edit.setSections([
			{ start: 0, length: 2 },
			{ start: 3, length: 2 },
            { start: 6, length: 2 }
		]);

		const event = new CMouseEvent(CEventType.MousePress, 105, 15, CMouseButton.LeftButton);

		edit.event(event);

		expect(edit.currentSection()).toBe(-1);
		expect(event.isAccepted()).toBe(false);
	});

	test("focus out clears section selection", () =>
	{
		const edit = new CSectionLineEdit();

		edit.setText("12:34:56");
		edit.setSections([
			{ start: 0, length: 2 },
			{ start: 3, length: 2 },
            { start: 6, length: 2 }
		]);
        edit.setCurrentSection(0);

		expect(edit.hasSelection()).toBe(true);

		edit.event(
			new CFocusEvent(CEventType.FocusOut)
		);

		expect(edit.hasSelection()).toBe(false);
	});
});