# Git & GitHub 學習筆記

## 基本概念
- Repository：被 Git 管理的資料夾
- Commit：版本快照
- Remote：遠端倉庫（GitHub）

## 常用指令
```bash
git status      # 查看狀態
git add .       # 加入變更
git commit -m   # 提交
git push        # 推送
```

## 兩種起手式
### Clone（從 GitHub 下載）
- 適用：GitHub 有，本地沒有
### Init（本地上傳）
- 適用：本地有檔案，要上傳

## 常見錯誤
- PowerShell 用 `Remove-Item`，不是 `rm`
- 不要在 repository 裡 clone
...
```