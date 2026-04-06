const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function getConfigDir() {
    let configDir;
    
    if (app.isPackaged) {
        configDir = path.join(app.getPath('userData'), 'config');
    } else {
        configDir = path.join(__dirname, 'config');
    }
    
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    
    return configDir;
}

function getDataFilePath() {
    return path.join(getConfigDir(), 'softwareData.json');
}

function getTagHistoryFilePath() {
    return path.join(getConfigDir(), 'tagHistory.json');
}

function getIconsDir() {
    let iconsDir;
    
    if (app.isPackaged) {
        iconsDir = path.join(app.getPath('userData'), 'icons');
    } else {
        iconsDir = path.join(__dirname, 'resources', 'icons');
    }
    
    if (!fs.existsSync(iconsDir)) {
        fs.mkdirSync(iconsDir, { recursive: true });
    }
    
    return iconsDir;
}

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function extractExeIcon(exePath, iconFileName) {
    const iconsDir = getIconsDir();
    const iconPath = path.join(iconsDir, iconFileName + '.png');
    
    if (fs.existsSync(iconPath)) {
        return iconPath;
    }
    
    const psScript = `
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$exePath = "${exePath.replace(/\\/g, '\\\\')}"
$iconPath = "${iconPath.replace(/\\/g, '\\\\')}"

try {
    $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($exePath)
    if ($icon -ne $null) {
        $bitmap = $icon.ToBitmap()
        $bitmap.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $icon.Dispose()
        $bitmap.Dispose()
        Write-Output "success"
    } else {
        Write-Output "failed"
    }
} catch {
    Write-Output "error"
}
`;
    
    const tempPsPath = path.join(iconsDir, 'temp_extract.ps1');
    fs.writeFileSync(tempPsPath, psScript, 'utf8');
    
    try {
        await execAsync(`powershell -ExecutionPolicy Bypass -File "${tempPsPath}"`);
        fs.unlinkSync(tempPsPath);
        
        if (fs.existsSync(iconPath)) {
            return iconPath;
        }
        return null;
    } catch (error) {
        if (fs.existsSync(tempPsPath)) {
            fs.unlinkSync(tempPsPath);
        }
        return null;
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        /* 软件窗口默认尺寸：宽度1200px，高度675px（16:9比例） */
        width: 1200,
        height: 760,
        /* 软件窗口最小尺寸：宽度800px，高度450px（16:9比例） */
        minWidth: 800,
        minHeight: 450,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        title: '软件管理器',
        icon: path.join(__dirname, 'ICO_SoftwareManager.ico')
    });

    mainWindow.loadFile('index.html');

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.handle('select-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: '所有文件', extensions: ['*'] }
        ]
    });

    if (result.canceled) {
        return null;
    }

    return result.filePaths[0];
});

ipcMain.handle('extract-icon', async (event, exePath, softwareId) => {
    try {
        if (!exePath || !exePath.toLowerCase().endsWith('.exe')) {
            return { success: false, message: 'Not an exe file' };
        }
        
        if (!fs.existsSync(exePath)) {
            return { success: false, message: 'File not found' };
        }
        
        const iconFileName = `icon_${softwareId}`;
        const iconPath = await extractExeIcon(exePath, iconFileName);
        
        if (iconPath) {
            return { success: true, iconPath: iconPath };
        } else {
            return { success: false, message: 'Failed to extract icon' };
        }
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('get-icon-path', async (event, softwareId) => {
    const iconsDir = getIconsDir();
    const iconPath = path.join(iconsDir, `icon_${softwareId}.png`);
    
    if (fs.existsSync(iconPath)) {
        return iconPath;
    }
    return null;
});

ipcMain.handle('select-md-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Markdown 文件', extensions: ['md', 'markdown', 'txt'] },
            { name: '所有文件', extensions: ['*'] }
        ]
    });

    if (result.canceled) {
        return null;
    }

    return result.filePaths[0];
});

ipcMain.handle('open-folder', async (event, filePath) => {
    try {
        if (!filePath) {
            return { success: false, message: 'Path is empty' };
        }

        if (!fs.existsSync(filePath)) {
            return { success: false, message: 'File not found: ' + filePath };
        }

        const stats = fs.statSync(filePath);
        let folderPath;

        if (stats.isDirectory()) {
            folderPath = filePath;
        } else {
            folderPath = path.dirname(filePath);
        }

        await shell.openPath(folderPath);
        return { success: true, message: 'Folder opened' };
    } catch (error) {
        return { success: false, message: 'Failed to open folder: ' + error.message };
    }
});

ipcMain.handle('open-external', async (event, url) => {
    try {
        await shell.openExternal(url);
        return { success: true };
    } catch (error) {
        return { success: false, message: '打开链接失败：' + error.message };
    }
});

ipcMain.handle('get-config-dir', async () => {
    return getConfigDir();
});

ipcMain.handle('save-data', async (event, data) => {
    try {
        const filePath = getDataFilePath();
        console.log('保存数据到:', filePath);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        console.log('数据保存成功');
        return { success: true };
    } catch (error) {
        console.error('保存数据失败:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle('load-data', async () => {
    try {
        const filePath = getDataFilePath();
        console.log('从路径加载数据:', filePath);
        if (!fs.existsSync(filePath)) {
            console.log('数据文件不存在，返回空数组');
            return { success: true, data: [] };
        }
        const data = fs.readFileSync(filePath, 'utf8');
        console.log('数据加载成功');
        return { success: true, data: JSON.parse(data) };
    } catch (error) {
        console.error('加载数据失败:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle('export-data', async (event) => {
    try {
        const defaultPath = path.join(getConfigDir(), `软件数据备份_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`);
        const result = await dialog.showSaveDialog(mainWindow, {
            defaultPath: defaultPath,
            filters: [
                { name: 'JSON 文件', extensions: ['json'] },
                { name: '所有文件', extensions: ['*'] }
            ]
        });
        
        if (result.canceled) {
            return { success: false, canceled: true };
        }
        
        return { success: true, filePath: result.filePath };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
    try {
        fs.writeFileSync(filePath, content, 'utf8');
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('read-file', async (event, filePath) => {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return { success: true, content: content };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('import-data', async () => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            defaultPath: getConfigDir(),
            properties: ['openFile'],
            filters: [
                { name: 'JSON 文件', extensions: ['json'] },
                { name: '所有文件', extensions: ['*'] }
            ]
        });
        
        if (result.canceled) {
            return { success: false, canceled: true };
        }
        
        return { success: true, filePath: result.filePaths[0] };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('clear-all-data', async () => {
    try {
        const configDir = getConfigDir();
        const iconsDir = getIconsDir();
        
        let deletedFiles = [];
        
        const dataFile = getDataFilePath();
        if (fs.existsSync(dataFile)) {
            fs.unlinkSync(dataFile);
            deletedFiles.push('软件数据');
        }
        
        const tagHistoryFile = getTagHistoryFilePath();
        if (fs.existsSync(tagHistoryFile)) {
            fs.unlinkSync(tagHistoryFile);
            deletedFiles.push('标签历史');
        }
        
        if (fs.existsSync(iconsDir)) {
            const files = fs.readdirSync(iconsDir);
            files.forEach(file => {
                const filePath = path.join(iconsDir, file);
                fs.unlinkSync(filePath);
            });
            fs.rmdirSync(iconsDir);
            deletedFiles.push('图标文件');
        }
        
        if (fs.existsSync(configDir)) {
            const files = fs.readdirSync(configDir);
            if (files.length === 0) {
                fs.rmdirSync(configDir);
            }
        }
        
        return { success: true, deletedFiles };
    } catch (error) {
        console.error('清除数据失败:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle('save-tag-history', async (event, data) => {
    try {
        const filePath = getTagHistoryFilePath();
        console.log('保存标签历史到:', filePath);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        console.log('标签历史保存成功');
        return { success: true };
    } catch (error) {
        console.error('保存标签历史失败:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle('load-tag-history', async () => {
    try {
        const filePath = getTagHistoryFilePath();
        console.log('从路径加载标签历史:', filePath);
        if (!fs.existsSync(filePath)) {
            console.log('标签历史文件不存在，返回空对象');
            return { success: true, data: {} };
        }
        const data = fs.readFileSync(filePath, 'utf8');
        console.log('标签历史加载成功');
        return { success: true, data: JSON.parse(data) };
    } catch (error) {
        console.error('加载标签历史失败:', error);
        return { success: false, message: error.message };
    }
});

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
}

async function calculateFolderSizeWithPowerShell(folderPath) {
    const psScript = `
$ErrorActionPreference = 'SilentlyContinue'
$path = "${folderPath.replace(/\\/g, '\\\\')}"

$files = Get-ChildItem -Path $path -Recurse -File -Force
$totalSize = ($files | Measure-Object -Property Length -Sum).Sum
$fileCount = $files.Count

$result = @{
    totalSize = $totalSize
    fileCount = $fileCount
}

$result | ConvertTo-Json -Compress
`;
    
    const tempPsPath = path.join(getIconsDir(), 'temp_folder_size.ps1');
    fs.writeFileSync(tempPsPath, psScript, 'utf8');
    
    try {
        const { stdout } = await execAsync(
            `powershell -ExecutionPolicy Bypass -File "${tempPsPath}"`,
            { maxBuffer: 1024 * 1024 * 10 }
        );
        fs.unlinkSync(tempPsPath);
        
        const result = JSON.parse(stdout.trim());
        return {
            totalSize: result.totalSize || 0,
            fileCount: result.fileCount || 0
        };
    } catch (error) {
        if (fs.existsSync(tempPsPath)) {
            fs.unlinkSync(tempPsPath);
        }
        throw error;
    }
}

ipcMain.handle('calculate-folder-size', async (event, filePath) => {
    try {
        if (!filePath) {
            return { success: false, message: 'Path is empty' };
        }

        if (!fs.existsSync(filePath)) {
            return { success: false, message: 'File not found' };
        }

        const stats = fs.statSync(filePath);
        let folderPath;

        if (stats.isDirectory()) {
            folderPath = filePath;
        } else {
            folderPath = path.dirname(filePath);
        }

        event.sender.send('folder-size-progress', { status: 'calculating' });

        const result = await calculateFolderSizeWithPowerShell(folderPath);

        return { 
            success: true, 
            folderPath: folderPath,
            totalSize: result.totalSize,
            fileCount: result.fileCount,
            formattedSize: formatFileSize(result.totalSize)
        };
    } catch (error) {
        return { success: false, message: error.message };
    }
});
