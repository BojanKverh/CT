import { vi } from "vitest";

export function createTestCanvas(width = 800, height = 600): HTMLCanvasElement {
    const listeners = new Map<
        string,
        EventListenerOrEventListenerObject[]
    >();

    const capturedPointers = new Set<number>();

    const context = {
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),

        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        clearRect: vi.fn(),
        beginPath: vi.fn(),
	    rect: vi.fn(),
	    clip: vi.fn(),
	    fillText: vi.fn(),

	    font: "",
	    textAlign: "start",
	    textBaseline: "alphabetic",
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1,
    	measureText: (text: string) => ({
			width: text.length * 8,
			actualBoundingBoxAscent: 10,
			actualBoundingBoxDescent: 3
		}),
    } as unknown as CanvasRenderingContext2D;

    return {
        width,
        height,

        style: {
			cursor: ""
		},

        getContext: (type: string) => {
            if (type === "2d")
                return context;

            return null;
        },

        getBoundingClientRect: () => ({
            x: 0,
            y: 0,
            left: 0,
            top: 0,
            right: width,
            bottom: height,
            width,
            height,
            toJSON: () => ({})
        }),

        setPointerCapture: (pointerId: number): void =>
		{
			capturedPointers.add(pointerId);
		},

		releasePointerCapture: (pointerId: number): void =>
		{
			capturedPointers.delete(pointerId);
		},

		hasPointerCapture: (pointerId: number): boolean =>
		{
			return capturedPointers.has(pointerId);
		},

        addEventListener: (
            type: string,
            listener: EventListenerOrEventListenerObject
        ) => {
            let list = listeners.get(type);

            if (list === undefined) {
                list = [];
                listeners.set(type, list);
            }

            list.push(listener);
        },

        removeEventListener: (
            type: string,
            listener: EventListenerOrEventListenerObject
        ) => {
            const list = listeners.get(type);

            if (list === undefined)
                return;

            const index = list.indexOf(listener);

            if (index !== -1)
                list.splice(index, 1);
        },

        dispatchEvent: (event: Event): boolean => {
            const list = listeners.get(event.type);

            if (list === undefined)
                return true;

            for (const listener of list) {
                if (typeof listener === "function")
                    listener(event);
                else
                    listener.handleEvent(event);
            }

            return true;
        }
    } as unknown as HTMLCanvasElement;
}