const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectFile: (fileType) => ipcRenderer.invoke('select-file', fileType),
    selectMdFile: () => ipcRenderer.invoke('select-md-file'),
    openFolder: (filePath) => ipcRenderer.invoke('open-folder', filePath),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    getConfigDir: () => ipcRenderer.invoke('get-config-dir'),
    saveData: (data) => ipcRenderer.invoke('save-data', data),
    loadData: () => ipcRenderer.invoke('load-data'),
    exportData: () => ipcRenderer.invoke('export-data'),
    importData: () => ipcRenderer.invoke('import-data'),
    writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    extractIcon: (exePath, softwareId) => ipcRenderer.invoke('extract-icon', exePath, softwareId),
    downloadFavicon: (faviconUrl, softwareId) => ipcRenderer.invoke('download-favicon', faviconUrl, softwareId),
    getIconPath: (softwareId) => ipcRenderer.invoke('get-icon-path', softwareId),
    clearAllData: () => ipcRenderer.invoke('clear-all-data'),
    saveTagHistory: (data) => ipcRenderer.invoke('save-tag-history', data),
    loadTagHistory: () => ipcRenderer.invoke('load-tag-history'),
    calculateFolderSize: (filePath) => ipcRenderer.invoke('calculate-folder-size', filePath)
});
