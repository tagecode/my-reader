import * as pdfjs from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { getPdfjsDocumentOptions } from '@/lib/pdfjsConfig'
import { ensurePdfjsChineseFonts } from '@/lib/pdfjsFonts'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker

const MAX_COVER_WIDTH = 480

/** 将 PDF 第一页渲染为 JPEG，用作书库封面缩略图 */
export async function renderPdfCoverJpeg(
  source: { kind: 'data'; data: Uint8Array } | { kind: 'url'; url: string },
): Promise<Uint8Array | null> {
  await ensurePdfjsChineseFonts()

  const task = pdfjs.getDocument(getPdfjsDocumentOptions(source))
  const doc = await task.promise

  try {
    if (doc.numPages === 0) return null

    const page = await doc.getPage(1)
    const baseViewport = page.getViewport({ scale: 1 })
    const scale = Math.min(2, MAX_COVER_WIDTH / baseViewport.width)
    const viewport = page.getViewport({ scale: Math.max(0.1, scale) })

    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    await page.render({ canvasContext: ctx, viewport, canvas }).promise

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.82)
    })
    if (!blob) return null

    return new Uint8Array(await blob.arrayBuffer())
  } finally {
    doc.destroy()
  }
}
