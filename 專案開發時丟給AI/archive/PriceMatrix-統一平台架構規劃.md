# PriceMatrix 統一平台 架構規劃文件

**版本：** v1.0　**最後更新：** 2026-02-18

---

## 1. 專案概要

PriceMatrix 從最初的折扣管理工具（GAS 1.0）演進至今，已確立為一個可承載多個業務系統的統一平台。本文件記錄平台擴張的架構設計、各模組功能規劃、技術選型理由與開發優先順序。

### 1.1 平台定位

| 項目 | 說明 |
|------|------|
| 名稱 | PriceMatrix 統一平台 |
| 架構模式 | Monorepo — 前端共用、後端按職責分離 |
| 主要使用者 | 業務人員、管理員 |
| 開發性質 | 學習專案 × 實際業務需求 |
| 文件版本 | v1.0（2026-02-18） |

### 1.2 演進歷程

| 階段 | 工具 | 主要痛點 |
|------|------|----------|
| Excel 時代 | Microsoft Excel | 大量函數導致當機、作業屬人化 |
| GAS 1.0 | Google Sheets + Apps Script | 列數過大、預覽復原功能崩潰、功能不完整 |
| PriceMatrix 2.0 | Spring Boot + React + MySQL | 現階段主力，pricing 模組 95% 完成 |
| PriceMatrix 平台 | Monorepo 多模組 | 整合倉儲、業務支援、PDF 生成等系統 |

---

## 2. 整體架構（Monorepo 結構）

所有系統整合在單一 Monorepo 下，前端共用、後端按職責拆分為兩個服務。

### 2.1 目錄結構

```
PriceMatrix/
├── frontend/            ← React（所有模組共用同一個前端）
│   ├── src/
│   │   ├── modules/
│   │   │   ├── pricing/     ← 折扣管理頁面與元件
│   │   │   ├── inventory/   ← 倉儲系統頁面與元件
│   │   │   └── sales/       ← 業務支援頁面與元件
│   │   └── common/          ← 共用元件、Hook、工具函數
│   └── package.json
│
├── backend-java/        ← Spring Boot（商業邏輯 + API）
│   └── src/main/java/com/pricematrix/
│       ├── pricing/     ← 折扣模組（Controller/Service/Repository/Entity）
│       ├── inventory/   ← 倉儲模組
│       ├── sales/       ← 業務模組
│       └── common/      ← 共用設定、安全性、工具類
│
└── backend-pdf/         ← Node.js + Puppeteer（PDF 生成服務）
    ├── templates/       ← 見積書 HTML/CSS 模板
    └── server.js        ← 接收 Spring Boot 傳來的資料，輸出 PDF binary
```

### 2.2 服務間通訊

```
【前端】React
   ↓  HTTP / REST API
【後端-主】Spring Boot  ← 商業邏輯、資料驗證、資料庫存取
   ↓  HTTP（傳資料）
【後端-PDF】Node.js + Puppeteer  ← 接收資料 → 渲染 HTML → 輸出 PDF
   ↓  PDF binary
【後端-主】Spring Boot  ← 收到 PDF，回傳給前端
```

### 2.3 資料庫命名規則

所有模組共用同一個 MySQL 資料庫，使用 prefix 區分模組歸屬。

| 模組 | Prefix | Table 範例 |
|------|--------|------------|
| 折扣管理 | `pricing_` | pricing_customer、pricing_product、pricing_discount |
| 倉儲系統 | `inventory_` | inventory_item、inventory_stock、inventory_transaction |
| 業務支援 | `sales_` | sales_order、sales_customer、sales_report |
| 共用 | `common_` | common_user、common_audit_log |

> ⚠️ 現有 pricing 模組的 table 需在部署前加上 prefix（只需修改 Entity 的 `@Table(name="...")` 一行）。

---

## 3. 各模組功能說明

### 3.1 pricing — 折扣管理

PriceMatrix 的核心功能，也是目前最接近完成的模組。

| 功能 | 狀態 | 說明 |
|------|------|------|
| 客戶搜尋 | ✅ 完成 | 依名稱搜尋客戶，Enter 觸發 |
| 分類篩選 | ✅ 完成 | 下拉選單篩選商品分類 |
| 折扣清單顯示 | ✅ 完成 | 表格顯示客戶的所有折扣紀錄 |
| 折扣編輯（Inline） | ✅ 完成 | 點擊直接編輯，Enter 儲存 |
| 刪除確認 | ✅ 完成 | window.confirm() 防誤刪 |
| 新增折扣 | ✅ 完成 | 表單新增，UNIQUE 限制防重複 |
| Loading 狀態 | ✅ 完成 | 搜尋中按鈕 disable + 文字切換 |
| Toast 通知 | ✅ 完成 | 成功/失敗提示，2 秒自動消失 |
| 批次修改 | ⬜ 規劃中 | 一次修改多筆折扣（第二階段） |
| Audit Log | ⬜ 規劃中 | 追蹤誰在什麼時候改了什麼 |

### 3.2 inventory — 倉儲系統

掃碼進出貨、庫存管理，解決紙本記錄效率低落的問題。

| 功能 | 狀態 | 說明 |
|------|------|------|
商品管理✅ 後端完成InventoryItem CRUD + barcode 欄位，前端只有列表顯示，無新增/編輯 UI
掃碼入庫✅ 完成ScanPanel.tsx + ZXing + POST /api/inventory/transactions
掃碼出庫✅ 完成同上，IN/OUT 選擇已做
庫存查詢✅ 後端完成GET /api/inventory/items/overview，前端 InventoryPanel 顯示中
庫存異動歷史✅ 已在 InventoryPanel 實作
庫存警報✅ 完成

### 3.3 sales — 業務支援

提供業務人員日常工作所需的工具，包含日報、客戶管理、見積書（報價單）產出。

| 功能 | 狀態 | 說明 |
|------|------|------|
| 客戶管理 | ⬜ 規劃中 | 業務負責的客戶清單、聯絡資訊 |
| 日報填寫 | ⬜ 規劃中 | 業務每日活動記錄 |
| 見積書作成 | ⬜ 規劃中 | 依客戶折扣自動計算報價，輸出 PDF |
| 見積書歷史 | ⬜ 規劃中 | 過去報價的查詢與下載 |

> 📌 見積書功能需要 backend-pdf 服務支援，將在 backend-pdf 加入後開始開發。

---

## 4. 技術選型理由

### 4.1 前端：React + TypeScript + Storybook

| 技術 | 選用理由 |
|------|----------|
| React | 業界主流、組件化思維適合複雜 UI、生態系完整 |
| TypeScript | 強型別與後端 Java 思維一致、減少前後端溝通錯誤 |
| Storybook | 組件獨立開發與文件化、方便 UI 測試與維護 |

### 4.2 後端主服務：Java Spring Boot

| 技術 | 選用理由 |
|------|----------|
| Java | 強型別、編譯期抓錯、企業級標準 |
| Spring Boot | 完整的 DI / AOP / Security 生態、適合多模組架構 |
| Spring Data JPA | 簡化資料庫操作、Entity 對應 table 直觀 |

### 4.3 後端 PDF 服務：Node.js + Puppeteer

| 技術 | 選用理由 |
|------|----------|
| Node.js | 輕量、啟動快、適合單一職責的服務 |
| Puppeteer | HTML/CSS 模板轉 PDF，版面控制精準 |
| 為何獨立為服務 | 見積書版面複雜（動態行數、日文字型、日系格式細節）。用 Java 的 iText / JasperReports 維護成本高；HTML/CSS 模板可以直接在瀏覽器預覽，開發與調整更直覺。 |

### 4.4 資料庫：MySQL

| 技術 | 選用理由 |
|------|----------|
| MySQL | 成熟穩定、能處理百萬級資料 |
| 關聯式設計 | Customer × Product × Discount 的多對多關聯查詢 |
| Prefix 命名 | 單一 DB 支援多模組，降低部署複雜度 |

---

## 5. 開發優先順序

### Phase 1 — pricing 模組完成與部署

| 項目 | 說明 | 目標 |
|------|------|------|
| Table prefix 追加 | Entity @Table 加上 pricing_ prefix | 部署前完成 |
| GitHub 上傳 | 前端 + 後端推上 repository | 版本控制基礎 |
| Vercel 部署 | 前端 React 部署 | 可分享的展示網址 |
| Render 部署 | 後端 Spring Boot + 雲端 MySQL | 完整的線上環境 |
| TypeScript 遷移 | .js → .tsx，加上型別宣告 | 部署穩定後進行 |

### Phase 2 — inventory 模組

| 項目 | 說明 |
|------|------|
| DB 設計 | inventory_ prefix 的 table 規劃 |
| 後端 API | Spring Boot 新增 inventory package |
| 前端頁面 | React 新增 inventory module |
| 掃碼功能 | 研究 Web API 或整合外部掃碼器 |

### Phase 3 — backend-pdf 加入 + sales 模組

| 項目 | 說明 |
|------|------|
| backend-pdf 建立 | Node.js + Puppeteer 獨立服務 |
| 見積書模板設計 | HTML/CSS 日系格式、日文字型確認 |
| Spring Boot ↔ PDF 服務串接 | 資料傳遞、PDF binary 回傳 |
| sales 模組前後端 | 客戶管理、日報、見積書 UI |

### Phase 4（後期）— 體力測驗報告系統

同樣走 backend-pdf 的服務，等 sales 模組完成後再評估細節需求。

---

## 6. 設計原則與限制

### 6.1 防禦性設計

- 雙重驗證：前端 UX 層即時回饋 + 後端最終防線
- 不信任前端：所有資料在後端重新驗證
- 精確計算：金額使用 BigDecimal
- 併發安全：Transaction 事務 + Unique Index 防重複

### 6.2 可擴充性

- Monorepo 結構：新模組獨立開發不影響現有功能
- Table prefix：單一 DB 支援多模組，未來可按需拆庫
- PDF 服務獨立：可同時服務 sales、體力測驗等多個需求方
- 權限系統預留：DB 欄位先挖好洞，功能未來再展開

### 6.3 學習導向

- 無硬性 Deadline，理解比速度重要
- 每個功能先完成再解釋，逐步內化架構思維
- 從「寫功能」進化到「設計系統」

---

*慢慢來，比較快。理解了，才算學會。*

*PriceMatrix Platform · 2026*