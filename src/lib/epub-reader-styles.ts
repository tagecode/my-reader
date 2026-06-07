export type ReaderTheme = 'light' | 'dark'

function getThemeColors() {
  const style = getComputedStyle(document.documentElement)
  return {
    background: style.getPropertyValue('--background').trim() || 'white',
    foreground: style.getPropertyValue('--foreground').trim() || 'black',
  }
}

/** foliate-js 注入样式：夜间模式强制正文可读，并与应用主题色对齐 */
export function buildEpubReaderStyles(theme: ReaderTheme): string {
  const { background, foreground } = getThemeColors()
  const colorScheme = theme === 'dark' ? 'dark' : 'light'

  const darkTextOverrides =
    theme === 'dark'
      ? `
    body, p, div, span, li, dt, dd, h1, h2, h3, h4, h5, h6,
    td, th, blockquote, pre, figcaption, label, legend, em, strong, b, i {
      color: ${foreground} !important;
      background-color: transparent !important;
    }
    a:link {
      color: color-mix(in oklch, ${foreground} 80%, oklch(0.72 0.12 240)) !important;
    }
  `
      : ''

  return `
    @namespace epub "http://www.idpf.org/2007/ops";
    html {
      color-scheme: ${colorScheme};
      --theme-bg-color: ${background};
    }
    ${darkTextOverrides}
  `
}
