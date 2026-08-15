export function createTestWindow(): Window {
	const listeners = new Map<
		string,
		EventListenerOrEventListenerObject[]
	>();

	return {
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
			const list = listeners.get(event.type) ?? [];

			for (const listener of list) {
				if (typeof listener === "function")
					listener(event);
				else
					listener.handleEvent(event);
			}

			return true;
		}
	} as unknown as Window;
}