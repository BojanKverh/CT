import { CObject } from "./CObject.js";
import { CSignal } from "./CSignal.js";


/**
 * Provides single-shot and repeating timer functionality.
 */
export class CTimer extends CObject
{
/**
 * Emitted when the timer interval expires.
 */
	readonly timeout = new CSignal<[]>();

	#m_interval = 0;
	#m_singleShot = false;
	#m_timerId: ReturnType<typeof setTimeout> | null = null;
	#m_startedAt = 0;
	#m_generation = 0;

/**
 * Creates a timer.
 * @param parent Parent object, or `null` for no parent.
 */
	constructor(parent: CObject | null = null)
	{
		super(parent);
	}

/**
 * Returns the timer interval in milliseconds.
 * @returns Timer interval in milliseconds.
 */
	interval(): number
	{
		return this.#m_interval;
	}

/**
 * Sets the timer interval. An active timer is restarted with the new interval.
 * @param interval Interval in milliseconds. Negative values are clamped to zero.
 */
	setInterval(interval: number): void
	{
		interval = Math.max(0, interval);

		if (this.#m_interval === interval)
			return;

		this.#m_interval = interval;

		if (this.isActive())
			this.start();
	}

/**
 * Returns whether the timer fires only once.
 * @returns `true` for a single-shot timer; otherwise `false`.
 */
	isSingleShot(): boolean
	{
		return this.#m_singleShot;
	}

/**
 * Sets whether the timer fires only once.
 * @param singleShot `true` for single-shot operation; `false` for repeating operation.
 */
	setSingleShot(singleShot: boolean): void
	{
		this.#m_singleShot = singleShot;
	}

/**
 * Returns whether the timer is currently active.
 * @returns `true` if the timer is active.
 */
	isActive(): boolean
	{
		return this.#m_timerId !== null;
	}

/**
 * Starts or restarts the timer.
 * @param interval Optional interval in milliseconds to use before starting.
 */
	start(interval?: number): void
	{
		if (interval !== undefined)
			this.#m_interval = Math.max(0, interval);

		this.stop();

		const generation = this.#m_generation;

		this.#schedule(generation);
	}

/**
 * Stops the timer.
 */
	stop(): void
	{
		++this.#m_generation;

		if (this.#m_timerId !== null)
			clearTimeout(this.#m_timerId);

		this.#m_timerId = null;
		this.#m_startedAt = 0;
	}

/**
 * Returns the approximate time remaining until the next timeout.
 * @returns Remaining milliseconds, or `-1` if the timer is inactive.
 */
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

/**
 * Schedules a callback to run once after the specified interval.
 * @param interval Delay in milliseconds. Negative values are clamped to zero.
 * @param callback Function to invoke after the delay.
 */
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