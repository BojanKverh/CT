import { describe, expect, test } from "vitest";

import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";

describe("CKeyEvent", () => {
	test("stores key press event type", () => {
		const event = new CKeyEvent(
			CEventType.KeyPress, "Enter"
		);

		expect(event.type()).toBe(CEventType.KeyPress);
	});

	test("stores key release event type", () => {
		const event = new CKeyEvent(
			CEventType.KeyRelease, "Enter"
		);

		expect(event.type()).toBe(CEventType.KeyRelease);
	});

	test("stores key", () => {
		const event = new CKeyEvent(
			CEventType.KeyPress, "ArrowLeft"
		);

		expect(event.key()).toBe("ArrowLeft");
	});

	test("modifier keys are false by default", () => {
		const event = new CKeyEvent(
			CEventType.KeyPress, "A"
		);

		expect(event.ctrl()).toBe(false);
		expect(event.shift()).toBe(false);
		expect(event.alt()).toBe(false);
		expect(event.meta()).toBe(false);
	});

	test("stores modifier keys", () => {
		const event = new CKeyEvent(
			CEventType.KeyPress, "A",
			true, true, true, true
		);

		expect(event.ctrl()).toBe(true);
		expect(event.shift()).toBe(true);
		expect(event.alt()).toBe(true);
		expect(event.meta()).toBe(true);
	});

	test("is accepted by default", () => {
		const event = new CKeyEvent(
			CEventType.KeyPress, "Enter"
		);

		expect(event.isAccepted()).toBe(true);
	});

	test("inherits accepted state handling from CEvent", () => {
		const event = new CKeyEvent(
			CEventType.KeyPress, "Enter"
		);

		event.ignore();
		expect(event.isAccepted()).toBe(false);

		event.accept();
		expect(event.isAccepted()).toBe(true);
	});
});