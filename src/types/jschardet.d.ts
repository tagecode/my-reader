declare module 'jschardet' {
  export function detect(buffer: Buffer | Uint8Array): {
    encoding: string
    confidence: number
  } | null
}
