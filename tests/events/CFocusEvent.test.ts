import { describe, expect, test } from "vitest";

import { CEventType } from "../../src/events/CEvent.js";
import { CFocusEvent } from "../../src/events/CFocusEvent.js";

describe("CFocusEvent", () => {
	test("stores focus in event type", () => {
		const event = new CFocusEvent(CEventType.FocusIn);

		expect(event.type()).toBe(CEventType.FocusIn);
	});

	test("stores focus out event type", () => {
		const event = new CFocusEvent(CEventType.FocusOut);

		expect(event.type()).toBe(CEventType.FocusOut);
	});

	test("is accepted by default", () => {
		const event = new CFocusEvent(CEventType.FocusIn);

		expect(event.isAccepted()).toBe(true);
	});

	test("can be ignored", () => {
		const event = new CFocusEvent(CEventType.FocusIn);

		event.ignore();

		expect(event.isAccepted()).toBe(false);
	});

	test("can be accepted again after being ignored", () => {
		const event = new CFocusEvent(CEventType.FocusIn);

		event.ignore();
		event.accept();

		expect(event.isAccepted()).toBe(true);
	});
});