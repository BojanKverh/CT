import { CPixmap } from "./CPixmap.js";

export abstract class CPaintEngine {
    abstract save(): void;
    abstract restore(): void;

    abstract translate(x: number, y: number): void;

    abstract fillRect(
        x: number,
        y: number,
        width: number,
        height: number
    ): void;

    abstract strokeRect(
        x: number,
        y: number,
        width: number,
        height: number
    ): void;

    abstract clearRect(
        x: number,
        y: number,
        width: number,
        height: number
    ): void;

    abstract setFillStyle(style: string): void;
    abstract setStrokeStyle(style: string): void;
    abstract setLineWidth(width: number): void;
    abstract textWidth(text: string): number;

    abstract clipRect(x: number, y: number, width: number,
		height: number): void;

    abstract font() : string;
    abstract setFont(font: string): void;
    abstract textAlign() : CanvasTextAlign;
    abstract setTextAlign(align: CanvasTextAlign) : void;
    abstract setTextBaseline(baseline: CanvasTextBaseline): void;
    abstract textBaseline() : CanvasTextBaseline;
    abstract drawLine(x1: number, y1: number, x2: number, y2: number): void;
    abstract drawText(text: string, x: number, y: number): void;
    abstract drawPixmap(pixmap: CPixmap, x: number, y: number, w: number, h: number): void;
    abstract drawEllipse(x: number, y: number, w: number, h: number): void;
    abstract fillEllipse(x: number, y: number, w: number, h: number): void;
    abstract drawRect(x: number, y: number, w: number, h: number): void;
    abstract drawRoundedRect(x: number, y: number, w: number, h: number, r: number | number[] ): void;
}