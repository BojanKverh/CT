import { describe, expect, test } from "vitest";
import { CDragLeaveEvent } from "../../src/events/CDragLeaveEvent.js";
import { CEventType } from "../../src/events/CEvent.js";

describe("CDragLeaveEvent", () => {
	test("has DragLeave event type", () => {
		const event = new CDragLeaveEvent();

		expect(event.type()).toBe(CEventType.DragLeave);
	});

	test("can be ignored", () => {
		const event = new CDragLeaveEvent();

		event.ignore();

		expect(event.isAccepted()).toBe(false);
	});

	test("can be accepted", () => {
		const event = new CDragLeaveEvent();

		event.accept();

		expect(event.isAccepted()).toBe(true);
	});
});