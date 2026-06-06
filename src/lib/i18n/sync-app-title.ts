/** 同步浏览器标签页标题与 Electron 窗口标题。 */
export function applyAppTitle(title: string): void {
  document.title = title
  void window.electronAPI?.setWindowTitle(title)
}
