import { describe, expect, test } from "vitest";
import { CEvent, CEventType } from "../../src/events/CEvent";

describe("CEvent", () => {
    test("stores event type", () => {
        const event = new CEvent(CEventType.MousePress);

        expect(event.type()).toBe(CEventType.MousePress);
    });

    test("is accepted by default", () => {
        const event = new CEvent(CEventType.MousePress);

        expect(event.isAccepted()).toBe(true);
    });

    test("can be ignored", () => {
        const event = new CEvent(CEventType.MousePress);

        event.ignore();

        expect(event.isAccepted()).toBe(false);
    });

    test("can be accepted again after being ignored", () => {
        const event = new CEvent(CEventType.MousePress);

        event.ignore();
        event.accept();

        expect(event.isAccepted()).toBe(true);
    });

    test("accepting an already accepted event keeps it accepted", () => {
        const event = new CEvent(CEventType.MousePress);

        event.accept();

        expect(event.isAccepted()).toBe(true);
    });

    test("ignoring an already ignored event keeps it ignored", () => {
        const event = new CEvent(CEventType.MousePress);

        event.ignore();
        event.ignore();

        expect(event.isAccepted()).toBe(false);
    });
});