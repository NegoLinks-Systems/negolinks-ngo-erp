// The PDF, Word, Excel and QR libraries are large. They are loaded on demand so
// that opening a module page does not download a document engine the visitor may
// never use — this matters on the low-bandwidth connections our field teams work
// from. Each generator imports what it needs at the moment it is called.
// Type-only imports are erased at build time, so they add nothing to the bundle.
import type { Paragraph as DocxParagraph, Table as DocxTable } from 'docx'
import { BRAND, env } from '@/constants'
import { downloadBlob, formatDate } from '@/lib/utils'
import type { Organization } from '@/types'

/**
 * Every customer-facing artefact in the suite is produced here so branding,
 * numbering, verification codes and footers stay identical across products.
 */

export interface DocumentMeta {
  title: string
  documentNumber: string
  date?: string
  verificationCode: string
  preparedBy?: string
  subtitle?: string
}

export interface TableBlock {
  kind: 'table'
  heading?: string
  columns: string[]
  rows: (string | number)[][]
}

export interface TextBlock {
  kind: 'text'
  heading?: string
  body: string
}

export interface KeyValueBlock {
  kind: 'keyvalue'
  heading?: string
  pairs: [string, string][]
}

export type DocumentBlock = TableBlock | TextBlock | KeyValueBlock

const ACCENT: [number, number, number] = [124, 58, 237]
const INK: [number, number, number] = [24, 24, 40]
const MUTED: [number, number, number] = [110, 110, 135]

const verificationUrl = (code: string): string => `${env.verifyBaseUrl}/${code}`

/* ------------------------------------------------------------------- PDF */

export const generatePdf = async (
  org: Organization,
  meta: DocumentMeta,
  blocks: DocumentBlock[],
): Promise<Blob> => {
  const [{ default: jsPDF }, { default: autoTable }, { default: QRCode }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    import('qrcode'),
  ])

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 42
  let cursor = 46

  // Letterhead
  doc.setFillColor(...ACCENT)
  doc.rect(0, 0, pageWidth, 6, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...INK)
  doc.text(org.name || 'Organization', margin, cursor)

  cursor += 14
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...MUTED)
  const contactLine = [org.address, org.city, org.state, org.country].filter(Boolean).join(', ')
  if (contactLine) {
    doc.text(contactLine, margin, cursor)
    cursor += 11
  }
  const reachLine = [org.phone, org.email, org.website].filter(Boolean).join('  •  ')
  if (reachLine) {
    doc.text(reachLine, margin, cursor)
    cursor += 11
  }
  if (org.registration_number) {
    doc.text(`RC/Registration: ${org.registration_number}`, margin, cursor)
    cursor += 11
  }

  // QR verification block, top-right
  try {
    const qr = await QRCode.toDataURL(verificationUrl(meta.verificationCode), { margin: 0, width: 160 })
    doc.addImage(qr, 'PNG', pageWidth - margin - 62, 34, 62, 62)
    doc.setFontSize(6.5)
    doc.setTextColor(...MUTED)
    doc.text('Scan to verify', pageWidth - margin - 62, 106)
  } catch {
    // QR generation must never block document delivery.
  }

  cursor += 6
  doc.setDrawColor(...ACCENT)
  doc.setLineWidth(1)
  doc.line(margin, cursor, pageWidth - margin, cursor)
  cursor += 22

  // Title block
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...INK)
  doc.text(meta.title.toUpperCase(), margin, cursor)
  cursor += 15
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  doc.text(
    `Document No: ${meta.documentNumber}    |    Date: ${meta.date ?? formatDate(new Date())}${
      meta.preparedBy ? `    |    Prepared by: ${meta.preparedBy}` : ''
    }`,
    margin,
    cursor,
  )
  cursor += 10
  if (meta.subtitle) {
    doc.text(meta.subtitle, margin, cursor)
    cursor += 10
  }
  cursor += 8

  const ensureSpace = (needed: number): void => {
    if (cursor + needed > doc.internal.pageSize.getHeight() - 96) {
      doc.addPage()
      cursor = 56
    }
  }

  blocks.forEach((block) => {
    if (block.heading) {
      ensureSpace(30)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10.5)
      doc.setTextColor(...ACCENT)
      doc.text(block.heading.toUpperCase(), margin, cursor)
      cursor += 14
    }

    if (block.kind === 'text') {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(...INK)
      const paragraphs = block.body.split('\n').filter((line) => line.trim().length)
      paragraphs.forEach((paragraph) => {
        const wrapped = doc.splitTextToSize(paragraph, pageWidth - margin * 2) as string[]
        ensureSpace(wrapped.length * 12 + 6)
        doc.text(wrapped, margin, cursor)
        cursor += wrapped.length * 12 + 6
      })
      cursor += 6
    }

    if (block.kind === 'keyvalue') {
      doc.setFontSize(9.5)
      block.pairs.forEach(([key, value]) => {
        ensureSpace(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...MUTED)
        doc.text(`${key}:`, margin, cursor)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...INK)
        const wrapped = doc.splitTextToSize(String(value), pageWidth - margin * 2 - 150) as string[]
        doc.text(wrapped, margin + 150, cursor)
        cursor += Math.max(14, wrapped.length * 12)
      })
      cursor += 8
    }

    if (block.kind === 'table') {
      ensureSpace(60)
      autoTable(doc, {
        startY: cursor,
        head: [block.columns],
        body: block.rows.map((row) => row.map((cell) => String(cell ?? ''))),
        margin: { left: margin, right: margin },
        styles: { fontSize: 8.2, cellPadding: 5, textColor: INK, lineColor: [225, 225, 235] },
        headStyles: { fillColor: ACCENT, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 246, 255] },
        theme: 'grid',
      })
      const table = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      cursor = (table?.finalY ?? cursor) + 20
    }
  })

  // Signature and stamp panel
  ensureSpace(96)
  cursor += 10
  doc.setDrawColor(210, 210, 225)
  doc.setLineWidth(0.6)
  doc.line(margin, cursor + 34, margin + 170, cursor + 34)
  doc.line(pageWidth - margin - 170, cursor + 34, pageWidth - margin, cursor + 34)
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text('Authorized Signature', margin, cursor + 46)
  doc.text('Official Stamp', pageWidth - margin - 170, cursor + 46)

  // Footer on every page
  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    const height = doc.internal.pageSize.getHeight()
    doc.setDrawColor(225, 225, 235)
    doc.setLineWidth(0.5)
    doc.line(margin, height - 46, pageWidth - margin, height - 46)
    doc.setFontSize(7.5)
    doc.setTextColor(...MUTED)
    doc.text(`Powered by ${BRAND.suite}`, margin, height - 32)
    doc.text(
      `Verification: ${meta.verificationCode}  •  Generated ${formatDate(new Date(), true)}`,
      margin,
      height - 22,
    )
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, height - 32, { align: 'right' })
  }

  return doc.output('blob')
}

/* ------------------------------------------------------------------ DOCX */

export const generateDocx = async (
  org: Organization,
  meta: DocumentMeta,
  blocks: DocumentBlock[],
): Promise<Blob> => {
  const {
    Document, Packer, Paragraph, HeadingLevel, TextRun,
    AlignmentType, Table, TableRow, TableCell, WidthType,
  } = await import('docx')

  const children: (DocxParagraph | DocxTable)[] = [
    new Paragraph({
      children: [new TextRun({ text: org.name || 'Organization', bold: true, size: 32, color: '12121F' })],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: [org.address, org.city, org.state, org.country].filter(Boolean).join(', '),
          size: 18,
          color: '6E6E87',
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: [org.phone, org.email, org.website].filter(Boolean).join('  |  '),
          size: 18,
          color: '6E6E87',
        }),
      ],
    }),
    new Paragraph({ text: '' }),
    new Paragraph({ text: meta.title.toUpperCase(), heading: HeadingLevel.HEADING_1 }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Document No: ${meta.documentNumber}  |  Date: ${meta.date ?? formatDate(new Date())}`,
          size: 18,
          color: '6E6E87',
        }),
      ],
    }),
    new Paragraph({ text: '' }),
  ]

  blocks.forEach((block) => {
    if (block.heading) {
      children.push(new Paragraph({ text: block.heading, heading: HeadingLevel.HEADING_2 }))
    }
    if (block.kind === 'text') {
      block.body
        .split('\n')
        .filter((line) => line.trim().length)
        .forEach((line) => children.push(new Paragraph({ children: [new TextRun({ text: line, size: 21 })] })))
      children.push(new Paragraph({ text: '' }))
    }
    if (block.kind === 'keyvalue') {
      block.pairs.forEach(([key, value]) =>
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${key}: `, bold: true, size: 21 }),
              new TextRun({ text: String(value), size: 21 }),
            ],
          }),
        ),
      )
      children.push(new Paragraph({ text: '' }))
    }
    if (block.kind === 'table') {
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: block.columns.map(
                (column) =>
                  new TableCell({
                    shading: { fill: '7C3AED' },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: column, bold: true, color: 'FFFFFF', size: 18 })],
                      }),
                    ],
                  }),
              ),
            }),
            ...block.rows.map(
              (row) =>
                new TableRow({
                  children: row.map(
                    (cell) =>
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: String(cell ?? ''), size: 18 })] })],
                      }),
                  ),
                }),
            ),
          ],
        }),
      )
      children.push(new Paragraph({ text: '' }))
    }
  })

  children.push(
    new Paragraph({ text: '' }),
    new Paragraph({ children: [new TextRun({ text: '_______________________          _______________________', size: 20 })] }),
    new Paragraph({ children: [new TextRun({ text: 'Authorized Signature                      Official Stamp', size: 18, color: '6E6E87' })] }),
    new Paragraph({ text: '' }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Powered by ${BRAND.suite}  |  Verification: ${meta.verificationCode}`,
          size: 16,
          color: '8A8AA3',
        }),
      ],
    }),
  )

  const doc = new Document({ sections: [{ properties: {}, children }] })
  return Packer.toBlob(doc)
}

/* -------------------------------------------------------------- XLSX/CSV */

export const generateXlsx = async (
  sheets: { name: string; columns: string[]; rows: (string | number)[][] }[],
): Promise<Blob> => {
  const XLSX = await import('xlsx')
  const workbook = XLSX.utils.book_new()
  sheets.forEach((sheet) => {
    const worksheet = XLSX.utils.aoa_to_sheet([sheet.columns, ...sheet.rows])
    worksheet['!cols'] = sheet.columns.map((column) => ({ wch: Math.max(14, column.length + 4) }))
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31))
  })
  const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  return new Blob([output], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export const generateCsv = (columns: string[], rows: (string | number)[][]): Blob => {
  const escape = (value: string | number): string => {
    const text = String(value ?? '')
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const content = [columns.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))].join('\n')
  return new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' })
}

export const generateJson = (rows: unknown[]): Blob =>
  new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' })

/* ------------------------------------------------------------ downloads */

export const downloadPdf = async (
  org: Organization,
  meta: DocumentMeta,
  blocks: DocumentBlock[],
): Promise<void> => {
  const blob = await generatePdf(org, meta, blocks)
  downloadBlob(blob, `${meta.documentNumber.replace(/[^\w-]/g, '-')}.pdf`)
}

export const downloadDocx = async (
  org: Organization,
  meta: DocumentMeta,
  blocks: DocumentBlock[],
): Promise<void> => {
  const blob = await generateDocx(org, meta, blocks)
  downloadBlob(blob, `${meta.documentNumber.replace(/[^\w-]/g, '-')}.docx`)
}

export const downloadXlsx = async (
  name: string,
  sheets: { name: string; columns: string[]; rows: (string | number)[][] }[],
): Promise<void> => downloadBlob(await generateXlsx(sheets), `${name}.xlsx`)

export const downloadCsv = (name: string, columns: string[], rows: (string | number)[][]): void =>
  downloadBlob(generateCsv(columns, rows), `${name}.csv`)

export const downloadJson = (name: string, rows: unknown[]): void =>
  downloadBlob(generateJson(rows), `${name}.json`)

/** Public verification code, printed and encoded in the QR block. */
export const makeVerificationCode = (): string =>
  `NGO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
