import { ipcRenderer } from 'electron'

/**
 * 检查版本更新
 */
export function checkUpdate() {
  console.log('检查版本更新')
  ipcRenderer.invoke('check-update')
}
