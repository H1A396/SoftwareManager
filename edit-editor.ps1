$file = $args[0]
$content = Get-Content $file -Raw

$content = $content -replace 'pick 3717120 fix: 修复中文路径计算大小问题，更新 v1.2.0 版本', 'reword 3717120 fix: 修复中文路径计算大小问题，更新 v1.2.0 版本'
$content = $content -replace 'pick 787d8d5 feat: 新增软件文件夹大小计算功能 - 新增计算软件大小按钮，支持批量计算本地安装软件的文件夹大小 - 使用 PowerShell 命令高效计算，结果与 Windows 系统一致 - 智能缓存已计算的软件大小，避免重复计算 - 在软件卡片中显示文件夹大小和文件数量 - 更新 README.md 添加 v1.2.0 更新日志', 'reword 787d8d5 feat: 新增软件文件夹大小计算功能 - 新增计算软件大小按钮，支持批量计算本地安装软件的文件夹大小 - 使用 PowerShell 命令高效计算，结果与 Windows 系统一致 - 智能缓存已计算的软件大小，避免重复计算 - 在软件卡片中显示文件夹大小和文件数量 - 更新 README.md 添加 v1.2.0 更新日志'

$content | Set-Content $file -NoNewline
