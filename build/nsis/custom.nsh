!macro customUninstall
    !define APPDATA_DIR "$APPDATA\软件管理器"
    
    IfFileExists "$APPDATA_DIR\*.*" 0 NoData
        MessageBox MB_YESNO|MB_ICONQUESTION "是否要删除软件管理器的用户数据？$\n$\n包括：软件数据、图标等$\n$\n注意：删除后无法恢复！" IDYES DeleteData IDNO NoData
        DeleteData:
            RMDir /r "$APPDATA_DIR"
    NoData:
!macroend
