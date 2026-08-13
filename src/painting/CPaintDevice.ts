import type { CPaintEngine } from "./CPaintEngine.js";

export abstract class CPaintDevice {
    abstract width(): number;
    abstract height(): number;

    abstract paintEngine(): CPaintEngine;
}