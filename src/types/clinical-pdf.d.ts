/** Minimal Node PDFKit API used by the clinical report. Kept strict without runtime shims. */
declare module "pdfkit" {
  import { Readable } from "node:stream";
  export default class PDFDocument extends Readable {
    constructor(options?: {
      size?: string;
      margins?: { top: number; bottom: number; left: number; right: number };
      bufferPages?: boolean;
      compress?: boolean;
      info?: {
        Title?: string;
        Author?: string;
        Subject?: string;
        Creator?: string;
      };
    });
    y: number;
    x: number;
    page: {
      width: number;
      height: number;
      margins: { top: number; bottom: number; left: number; right: number };
    };
    font(name: string): this;
    fontSize(size: number): this;
    fillColor(color: string): this;
    strokeColor(color: string): this;
    lineWidth(width: number): this;
    moveTo(x: number, y: number): this;
    lineTo(x: number, y: number): this;
    stroke(): this;
    roundedRect(
      x: number,
      y: number,
      width: number,
      height: number,
      radius: number,
    ): this;
    fill(color?: string): this;
    text(
      text: string,
      x?: number,
      y?: number,
      options?: {
        width?: number;
        align?: "left" | "center" | "right";
        lineBreak?: boolean;
        lineGap?: number;
        paragraphGap?: number;
        continued?: boolean;
      },
    ): this;
    heightOfString(
      text: string,
      options?: { width?: number; lineGap?: number },
    ): number;
    moveDown(lines?: number): this;
    addPage(): this;
    save(): this;
    restore(): this;
    bufferedPageRange(): { start: number; count: number };
    switchToPage(index: number): this;
    end(): void;
  }
}
declare module "svg-to-pdfkit" {
  import type PDFDocument from "pdfkit";
  export default function SVGtoPDF(
    document: PDFDocument,
    svg: string,
    x: number,
    y: number,
    options?: {
      width?: number;
      height?: number;
      preserveAspectRatio?: string;
      assumePt?: boolean;
    },
  ): void;
}
