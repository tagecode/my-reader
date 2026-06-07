import type { TocItem } from '@/types/reader-navigation'

export interface FlatTocItem {
  key: string
  href: string
  label: string
  depth: number
}

/** 将嵌套目录展平，供虚拟列表渲染 */
export function flattenToc(items: TocItem[], depth = 0, prefix = ''): FlatTocItem[] {
  const result: FlatTocItem[] = []
  items.forEach((item, index) => {
    const key = `${prefix}${depth}-${index}-${item.href}`
    result.push({
      key,
      href: item.href,
      label: item.label,
      depth,
    })
    if (item.subitems?.length) {
      result.push(...flattenToc(item.subitems, depth + 1, `${key}/`))
    }
  })
  return result
}

/** 按关键词过滤目录（保留匹配项） */
export function filterFlatToc(items: FlatTocItem[], query: string): FlatTocItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter((item) => {
    const label = item.label?.toLowerCase() ?? ''
    return label.includes(q) || item.href.toLowerCase().includes(q)
  })
}

/** 超过此数量时显示目录搜索框 */
export const TOC_SEARCH_THRESHOLD = 50
