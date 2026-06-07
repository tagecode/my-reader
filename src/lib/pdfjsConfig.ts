import * as pdfjs from 'pdfjs-dist'

export type PdfDocumentSource =
  | { kind: 'data'; data: Uint8Array }
  | { kind: 'url'; url: string }

/** pdf.js 需要 CMap / 标准字体 / wasm，否则中文 PDF 会缺字 */
export function getPdfjsDocumentOptions(
  source: PdfDocumentSource,
): Parameters<typeof pdfjs.getDocument>[0] {
  const base = new URL(import.meta.env.BASE_URL, window.location.href)

  const shared = {
    cMapUrl: new URL('pdfjs/cmaps/', base).href,
    cMapPacked: true,
    standardFontDataUrl: new URL('pdfjs/standard_fonts/', base).href,
    wasmUrl: new URL('pdfjs/wasm/', base).href,
    useSystemFonts: true,
    disableRange: false,
    disableStream: false,
  }

  if (source.kind === 'url') {
    return {
      ...shared,
      url: source.url,
    }
  }

  return {
    ...shared,
    data: source.data,
  }
}
