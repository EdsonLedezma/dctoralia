import { readFile } from "node:fs/promises";
import path from "node:path";
import type PDFDocument from "pdfkit";
import {
  clinicalFieldLabel,
  clinicalPdfSections,
  parseClinicalPdfSnapshot,
  printableClinicalValue,
} from "./pdf-content";

export class PdfDependencyError extends Error {}
export class PdfSizeError extends Error {}
const MAX_PDF_BYTES = 20 * 1024 * 1024;
const MAX_PDF_PAGES = 500;

export async function buildClinicalPdf(input: unknown): Promise<Buffer> {
  const snapshot = parseClinicalPdfSnapshot(input);
  let dependencies;
  try {
    dependencies = await Promise.all([
      import("pdfkit"),
      import("svg-to-pdfkit"),
    ]);
  } catch {
    throw new PdfDependencyError(
      "Instala las dependencias PDFKit para habilitar la exportación PDF.",
    );
  }
  const [pdf, svg] = dependencies;
  const logo = await readFile(
    path.join(process.cwd(), "public", "dopilot-logo.svg"),
    "utf8",
  );
  const doc = new pdf.default({
    size: "A4",
    margins: { top: 100, bottom: 60, left: 48, right: 48 },
    bufferPages: true,
    compress: true,
    info: {
      Title: "Expediente clínico",
      Author: "Dopilot",
      Creator: "Dopilot",
      Subject: "Resumen clínico confidencial del paciente",
    },
  });
  const chunks: Buffer[] = [];
  let byteCount = 0;
  const result = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: unknown) => {
      if (!Buffer.isBuffer(chunk)) {
        reject(new Error("Salida PDF inválida."));
        doc.destroy();
        return;
      }
      byteCount += chunk.length;
      if (byteCount > MAX_PDF_BYTES) {
        reject(new PdfSizeError("El PDF supera el tamaño permitido."));
        doc.destroy();
        return;
      }
      chunks.push(chunk);
    });
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  // Attach a rejection handler immediately, including synchronous layout failures.
  void result.catch(() => undefined);
  const width = doc.page.width - 96;
  let pageCount = 1;
  const addPage = () => {
    if (++pageCount > MAX_PDF_PAGES)
      throw new PdfSizeError("El expediente supera el límite de páginas.");
    doc.addPage();
    doc.y = 100;
  };
  const room = (height: number) => {
    if (doc.y + height > doc.page.height - 60) addPage();
  };
  const write = (
    text: string,
    options: {
      bold?: boolean;
      size?: number;
      color?: string;
      indent?: number;
    } = {},
  ) => {
    const indent = options.indent ?? 0;
    doc
      .font(options.bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(options.size ?? 9.5)
      .fillColor(options.color ?? "#27272a");
    // Paragraph wrapping is delegated to PDFKit; long notes flow onto new pages.
    const height = doc.heightOfString(text, {
      width: width - indent,
      lineGap: 3,
    });
    if (pageCount + Math.ceil(height / (doc.page.height - 160)) > MAX_PDF_PAGES)
      throw new PdfSizeError("El expediente supera el límite de páginas.");
    if (height < doc.page.height - 160) room(height + 5);
    doc.text(text || "No registrado", 48 + indent, doc.y, {
      width: width - indent,
      lineGap: 3,
      paragraphGap: 3,
    });
    doc.y += 4;
    pageCount = Math.max(pageCount, doc.bufferedPageRange().count);
    if (pageCount > MAX_PDF_PAGES)
      throw new PdfSizeError("El expediente supera el límite de páginas.");
  };
  try {
    doc.y = 112;
    write("Expediente clínico", { bold: true, size: 23 });
    write(snapshot.patient.user.name, { bold: true, size: 15 });
    const birth = snapshot.patient.birthDate
      ? snapshot.patient.birthDate.slice(0, 10)
      : "No registrada";
    write(
      `Nacimiento: ${birth}   ·   Género: ${snapshot.patient.gender ?? "No registrado"}`,
      { color: "#606068" },
    );
    write(`Referencia del paciente: ${snapshot.patient.id}`, {
      size: 8,
      color: "#606068",
    });
    write(
      "Alcance: información de este paciente atendida por el profesional y consultorio autorizados. Los documentos adjuntos se describen; sus archivos originales no se incluyen.",
      { size: 9, color: "#606068" },
    );
    doc.y += 12;
    for (const section of clinicalPdfSections(snapshot)) {
      room(65);
      doc
        .strokeColor("#dedee3")
        .lineWidth(0.6)
        .moveTo(48, doc.y)
        .lineTo(doc.page.width - 48, doc.y)
        .stroke();
      doc.y += 14;
      write(`${section.title} (${section.rows.length})`, {
        bold: true,
        size: 13,
      });
      if (!section.rows.length)
        write(section.empty ?? "Sin registros en este alcance.", {
          color: "#606068",
        });
      for (const [index, row] of section.rows.entries()) {
        room(45);
        write(`Registro ${index + 1}`, { bold: true, size: 10 });
        for (const [key, value] of Object.entries(row)) {
          if (
            value === null ||
            value === "" ||
            (Array.isArray(value) && !value.length)
          )
            continue;
          write(clinicalFieldLabel(key), {
            bold: true,
            size: 8.5,
            color: "#606068",
            indent: 8,
          });
          write(printableClinicalValue(value, key), { indent: 8 });
        }
        doc.y += 10;
      }
      doc.y += 10;
    }
    const range = doc.bufferedPageRange();
    for (let page = range.start; page < range.start + range.count; page++) {
      doc.switchToPage(page);
      decorate(
        doc,
        logo,
        svg.default,
        page + 1,
        range.count,
        snapshot.generatedAt,
        snapshot.patient.user.name,
      );
    }
    doc.end();
    return await result;
  } catch (error) {
    doc.destroy(
      error instanceof Error ? error : new Error("No se pudo preparar el PDF."),
    );
    throw error;
  }
}
function decorate(
  doc: PDFDocument,
  logo: string,
  svg: (
    document: PDFDocument,
    svg: string,
    x: number,
    y: number,
    options: { width: number; height: number },
  ) => void,
  page: number,
  total: number,
  generatedAt: string,
  patientName: string,
) {
  doc.save();
  svg(doc, logo, 48, 28, { width: 104, height: 41 });
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#606068")
    .text("EXPEDIENTE CLÍNICO · CONFIDENCIAL", 200, 40, {
      width: doc.page.width - 248,
      align: "right",
      lineBreak: false,
    });
  doc
    .strokeColor("#dedee3")
    .lineWidth(0.6)
    .moveTo(48, 82)
    .lineTo(doc.page.width - 48, 82)
    .stroke();
  const bottomMargin = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  const footerY = doc.page.height - 38;
  doc
    .strokeColor("#dedee3")
    .moveTo(48, footerY - 10)
    .lineTo(doc.page.width - 48, footerY - 10)
    .stroke();
  const date = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(new Date(generatedAt));
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor("#606068")
    .text(`Dopilot · ${patientName.slice(0, 55)} · ${date}`, 48, footerY, {
      width: doc.page.width - 190,
      lineBreak: false,
    });
  doc.text(`${page} / ${total}`, doc.page.width - 125, footerY, {
    width: 77,
    align: "right",
    lineBreak: false,
  });
  doc.page.margins.bottom = bottomMargin;
  doc.restore();
}
