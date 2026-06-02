export function toMyReaderUrl(filePath: string): string {
  return `myreader://open?path=${encodeURIComponent(filePath)}`
}
