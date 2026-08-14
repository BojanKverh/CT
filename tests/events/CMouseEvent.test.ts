import { describe, expect, test } from "vitest";
import { CEventType } from "../../src/events/CEvent";
import {
    CMouseButton,
    CMouseEvent
} from "../../src/events/CMouseEvent";

describe("CMouseEvent", () => {
    test("stores mouse press event type", () => {
        const event = new CMouseEvent(
            CEventType.MousePress,
            10,
            20,
            CMouseButton.LeftButton
        );

        expect(event.type()).toBe(CEventType.MousePress);
    });

    test("stores mouse release event type", () => {
        const event = new CMouseEvent(
            CEventType.MouseRelease,
            10,
            20,
            CMouseButton.LeftButton
        );

        expect(event.type()).toBe(CEventType.MouseRelease);
    });

    test("stores mouse move event type", () => {
        const event = new CMouseEvent(
            CEventType.MouseMove,
            10,
            20,
            CMouseButton.NoButton
        );

        expect(event.type()).toBe(CEventType.MouseMove);
    });

    test("stores local mouse position", () => {
        const event = new CMouseEvent(
            CEventType.MousePress,
            42,
            73,
            CMouseButton.LeftButton
        );

        expect(event.x()).toBe(42);
        expect(event.y()).toBe(73);
    });

    test("stores left mouse button", () => {
        const event = new CMouseEvent(
            CEventType.MousePress,
            0,
            0,
            CMouseButton.LeftButton
        );

        expect(event.button()).toBe(CMouseButton.LeftButton);
    });

    test("stores middle mouse button", () => {
        const event = new CMouseEvent(
            CEventType.MousePress,
            0,
            0,
            CMouseButton.MiddleButton
        );

        expect(event.button()).toBe(CMouseButton.MiddleButton);
    });

    test("stores right mouse button", () => {
        const event = new CMouseEvent(
            CEventType.MousePress,
            0,
            0,
            CMouseButton.RightButton
        );

        expect(event.button()).toBe(CMouseButton.RightButton);
    });

    test("stores no mouse button", () => {
        const event = new CMouseEvent(
            CEventType.MouseMove,
            0,
            0,
            CMouseButton.NoButton
        );

        expect(event.button()).toBe(CMouseButton.NoButton);
    });

    test("is accepted by default", () => {
        const event = new CMouseEvent(
            CEventType.MousePress,
            10,
            20,
            CMouseButton.LeftButton
        );

        expect(event.isAccepted()).toBe(true);
    });

    test("inherits accepted state handling from CEvent", () => {
        const event = new CMouseEvent(
            CEventType.MousePress,
            10,
            20,
            CMouseButton.LeftButton
        );

        event.ignore();
        expect(event.isAccepted()).toBe(false);

        event.accept();
        expect(event.isAccepted()).toBe(true);
    });
});