import {afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CLineEdit } from "../../src/widgets/CLineEdit.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";
import { CMouseEvent, CMouseButton } from "../../src/index.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CFontMetrics } from "../../src/gui/CFontMetrics.js";

describe("CLineEdit", () => {
	beforeEach(() => {
		Object.defineProperty(globalThis, "window", {
			value: createTestWindow(),
			writable: true,
			configurable: true
		});

		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has empty text by default", () => {
		const edit = new CLineEdit();

		expect(edit.text()).toBe("");
	});

	test("has cursor at zero by default", () => {
		const edit = new CLineEdit();

		expect(edit.cursorPosition()).toBe(0);
	});

	test("sets text", () => {
		const edit = new CLineEdit();

		edit.setText("Hello");

		expect(edit.text()).toBe("Hello");
	});

	test("moves cursor to end when setting text", () => {
		const edit = new CLineEdit();

		edit.setText("Hello");

		expect(edit.cursorPosition()).toBe(5);
	});

	test("emits textChanged when text changes", () => {
		const edit = new CLineEdit();
		const slot = vi.fn();

		edit.textChanged.connect(slot);

		edit.setText("Hello");

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith("Hello");
	});

	test("does not emit textChanged when text is unchanged", () => {
		const edit = new CLineEdit();
		const slot = vi.fn();

		edit.setText("Hello");
		edit.textChanged.connect(slot);

		edit.setText("Hello");

		expect(slot).not.toHaveBeenCalled();
	});

	test("sets cursor position", () => {
		const edit = new CLineEdit();
		edit.setText("Hello");

		edit.setCursorPosition(2);

		expect(edit.cursorPosition()).toBe(2);
	});

	test("clamps cursor position below zero", () => {
		const edit = new CLineEdit();
		edit.setText("Hello");

		edit.setCursorPosition(-10);

		expect(edit.cursorPosition()).toBe(0);
	});

	test("clamps cursor position beyond text length", () => {
		const edit = new CLineEdit();
		edit.setText("Hello");

		edit.setCursorPosition(100);

		expect(edit.cursorPosition()).toBe(5);
	});

	test("inserts text at cursor position", () => {
		const edit = new CLineEdit();
		edit.setText("Hello");
		edit.setCursorPosition(2);

		edit.insert("XY");

		expect(edit.text()).toBe("HeXYllo");
	});

	test("moves cursor after inserted text", () => {
		const edit = new CLineEdit();
		edit.setText("Hello");
		edit.setCursorPosition(2);

		edit.insert("XY");

		expect(edit.cursorPosition()).toBe(4);
	});

	test("inserts text at beginning", () => {
		const edit = new CLineEdit();
		edit.setText("World");
		edit.setCursorPosition(0);

		edit.insert("Hello ");

		expect(edit.text()).toBe("Hello World");
		expect(edit.cursorPosition()).toBe(6);
	});

	test("inserts text at end", () => {
		const edit = new CLineEdit();
		edit.setText("Hello");

		edit.insert(" World");

		expect(edit.text()).toBe("Hello World");
		expect(edit.cursorPosition()).toBe(11);
	});

	test("emits textChanged when text is inserted", () => {
		const edit = new CLineEdit();
		edit.setText("Hello");
		edit.setCursorPosition(2);

		const slot = vi.fn();
		edit.textChanged.connect(slot);

		edit.insert("XY");

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith("HeXYllo");
	});

	test("inserting empty text does nothing", () => {
		const edit = new CLineEdit();
		edit.setText("Hello");
		edit.setCursorPosition(2);

		const slot = vi.fn();
		edit.textChanged.connect(slot);

		edit.insert("");

		expect(edit.text()).toBe("Hello");
		expect(edit.cursorPosition()).toBe(2);
		expect(slot).not.toHaveBeenCalled();
	});

    test("moves cursor near beginning when clicking near start", () => {
	    const edit = new CLineEdit();
	    edit.resize(200, 30);
	    edit.setText("Hello");
    	const event = new CMouseEvent(CEventType.MousePress, 5, 15, CMouseButton.LeftButton);
    	edit.event(event);
    	expect(edit.cursorPosition()).toBe(0);
	    expect(event.isAccepted()).toBe(true);
    });

    test("moves cursor to end when clicking past text", () => {
	    const edit = new CLineEdit();
	    edit.resize(200, 30);
	    edit.setText("Hello");
	    const event = new CMouseEvent(CEventType.MousePress, 180, 15, CMouseButton.LeftButton);
    	edit.event(event);
    	expect(edit.cursorPosition()).toBe(5);
	    expect(event.isAccepted()).toBe(true);
    });

    test("moves cursor to nearest character position", () => {
	    const edit = new CLineEdit();
	    edit.resize(200, 30);
	    edit.setText("Hello");
    	const fm = new CFontMetrics(edit.font());
    	const before = fm.textWidth("He");
	    const after = fm.textWidth("Hel");
	    const x = 5 + (before + after) / 2 + 1;
    	const event = new CMouseEvent(CEventType.MousePress, x, 15, CMouseButton.LeftButton);
    	edit.event(event);
    	expect(edit.cursorPosition()).toBe(3);
    });

    test("clicking left half of character places cursor before it", () => {
	    const edit = new CLineEdit();
	    edit.resize(200, 30);
	    edit.setText("Hello");
	    const fm = new CFontMetrics(edit.font());
    	const left = fm.textWidth("He");
	    const right = fm.textWidth("Hel");
	    const middle = (left + right) / 2;
    	const event = new CMouseEvent(CEventType.MousePress, 4 + middle - 1,
	        15, CMouseButton.LeftButton
	    );
    	edit.event(event);
    	expect(edit.cursorPosition()).toBe(2);
    });

    test("clicking right half of character places cursor after it", () => {
	    const edit = new CLineEdit();
	    edit.resize(200, 30);
	    edit.setText("Hello");
    	const metrics = new CFontMetrics(edit.font());
    	const left = metrics.textWidth("He");
	    const right = metrics.textWidth("Hel");
	    const middle = (left + right) / 2;
    	const event = new CMouseEvent(CEventType.MousePress, 4 + middle + 1,
		    15, CMouseButton.LeftButton
	    );
    	edit.event(event);
    	expect(edit.cursorPosition()).toBe(3);
    });

    test("ignores non-left mouse press", () => {
	    const edit = new CLineEdit();
	    edit.setText("Hello");
    	const originalPosition = edit.cursorPosition();
    	const event = new CMouseEvent(CEventType.MousePress, 5, 15, CMouseButton.RightButton);
    	edit.event(event);
    	expect(edit.cursorPosition()).toBe(originalPosition);
	    expect(event.isAccepted()).toBe(false);
    });
});