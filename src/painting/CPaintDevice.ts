import type { CPaintEngine } from "./CPaintEngine.js";

/** Abstract target that can be painted through a {@link CPaintEngine}. */
export abstract class CPaintDevice {
    /**
     * Reads the horizontal extent available for drawing.
     * @returns Device width in logical drawing units.
     */
    abstract width(): number;
    /**
     * Reads the vertical extent available for drawing.
     * @returns Device height in logical drawing units.
     */
    abstract height(): number;

    /**
     * Looks up the drawing backend for this device.
     * @returns Paint engine used to render to the device.
     */
    abstract paintEngine(): CPaintEngine;
}