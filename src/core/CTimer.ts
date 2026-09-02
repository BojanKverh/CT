import { CObject } from "./CObject.js";
import { CSignal } from "./CSignal.js";


export class CTimer extends CObject
{
	readonly timeout = new CSignal<[]>();

	#m_interval = 0;
	#m_singleShot = false;
	#m_timerId: ReturnType<typeof setTimeout> | null = null;
	#m_startedAt = 0;
	#m_generation = 0;

	constructor(parent: CObject | null = null)
	{
		super(parent);
	}

	interval(): number
	{
		return this.#m_interval;
	}

	setInterval(interval: number): void
	{
		interval = Math.max(0, interval);

		if (this.#m_interval === interval)
			return;

		this.#m_interval = interval;

		if (this.isActive())
			this.start();
	}

	isSingleShot(): boolean
	{
		return this.#m_singleShot;
	}

	setSingleShot(singleShot: boolean): void
	{
		this.#m_singleShot = singleShot;
	}

	isActive(): boolean
	{
		return this.#m_timerId !== null;
	}

	start(interval?: number): void
	{
		if (interval !== undefined)
			this.#m_interval = Math.max(0, interval);

		this.stop();

		const generation = this.#m_generation;

		this.#schedule(generation);
	}

	stop(): void
	{
		++this.#m_generation;

		if (this.#m_timerId !== null)
			clearTimeout(this.#m_timerId);

		this.#m_timerId = null;
		this.#m_startedAt = 0;
	}

	remainingTime(): number
	{
		if (!this.isActive())
			return -1;

		return Math.max(
			0,
			Math.ceil(
				this.#m_interval -
				(performance.now() - this.#m_startedAt)
			)
		);
	}

	static singleShot(
		interval: number,
		callback: () => void
	): void
	{
		setTimeout(
			callback,
			Math.max(0, interval)
		);
	}

	#schedule(generation: number): void
	{
		this.#m_startedAt = performance.now();

		this.#m_timerId = setTimeout(
			() =>
			{
				if (generation !== this.#m_generation)
					return;

				this.#m_timerId = null;
				this.#m_startedAt = 0;

				this.timeout.emit();

				if (
					generation === this.#m_generation &&
					!this.#m_singleShot
				)
					this.#schedule(generation);
			},
			this.#m_interval
		);
	}
}