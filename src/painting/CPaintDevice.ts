/** @module Painting/CPaintDevice */
import type { CPaintEngine } from "./CPaintEngine.js";

/** Abstract target that can be painted through a {@link CPaintEngine}. */
export abstract class CPaintDevice {
    /** Returns the device width in pixels. */
    abstract width(): number;
    /** Returns the device height in pixels. */
    abstract height(): number;

    /** Returns the paint engine used to render onto this device. */
    abstract paintEngine(): CPaintEngine;
}