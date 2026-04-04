# PriceMatrix 統一平台 架構規劃文件

**版本：** v2.0　**最後更新：** 2026-03-05

---

## 1. 專案概要

PriceMatrix 從最初的折扣管理工具（GAS 1.0）演進至今，已確立為一個可承載多個業務系統的統一平台。本文件記錄平台擴張的架構設計、各模組功能規劃、技術選型理由與開發優先順序。

### 1.1 平台定位

| 項目 | 說明 |
|------|------|
| 名稱 | PriceMatrix 統一平台 |
| 架構模式 | Monorepo — 前端共用、後端按職責分離 |
| 主要使用者 | 業務人員、倉庫人員、管理員、全公司（improvement 模組） |
| 開發性質 | 學習專案 × 實際業務需求 |
| 文件版本 | v2.0（2026-03-05） |

### 1.2 演進歷程

| 階段 | 工具 | 主要痛點 |
|------|------|----------|
| Excel 時代 | Microsoft Excel | 大量函數導致當機、作業屬人化 |
| GAS 1.0 | Google Sheets + Apps Script | 列數過大、預覽復原功能崩潰、功能不完整 |
| PriceMatrix 2.0 | Spring Boot + React + PostgreSQL | 現階段主力，pricing / inventory 模組完成 |
| PriceMatrix 平台 | Monorepo 多模組 | 整合倉儲、業務支援、CRM、改善提案、PDF 生成等系統 |

---

## 2. 整體架構（Monorepo 結構）

所有系統整合在單一 Monorepo 下，前端共用（improvement 模組除外）、後端按職責拆分為兩個服務。

### 2.1 目錄結構

```
PriceMatrix/
├── frontend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── pricing/        ← 折扣管理
│   │   │   ├── inventory/      ← 倉儲系統
│   │   │   ├── sales/          ← 業務支援 + CRM
│   │   │   └── improvement/    ← 改善提案（獨立 Header）
│   │   └── common/             ← 共用元件、Hook、工具函數
│   └── package.json
│
├── backend-java/
│   └── src/main/java/com/pricematrix/
│       ├── pricing/
│       ├── inventory/
│       ├── sales/
│       ├── improvement/
│       └── common/             ← 共用設定、安全性、工具類
│
└── backend-pdf/                ← Node.js + Puppeteer（PDF 生成服務）
    ├── templates/              ← 見積書 HTML/CSS 模板
    └── server.js
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

所有模組共用同一個 PostgreSQL 資料庫，使用 prefix 區分模組歸屬。

| 模組 | Prefix | 說明 |
|------|--------|------|
| 折扣管理 | `pricing_` | 已建立 |
| 倉儲系統 | `inventory_` | 已建立 |
| 業務支援 + CRM | `sales_` | Phase 3 建立 |
| 改善提案 | `improvement_` | Phase 4 建立 |
| 共用 | `common_` | common_user 等共用資源 |

### 2.4 AI 接口預留

各模組 API 完成後，統一在 `/api/ai/` 路由群開放唯讀 endpoint，供 AI 讀取資料進行分析。

**原則：**
- 唯讀，不允許寫入
- 欄位名稱語意清楚，避免縮寫
- 關聯資料盡量一次回傳，減少 AI 自行拼接
- 支援時間範圍參數（本月 / 上季 / 自訂區間）

**可應用情境：** 客戶流失預警、補貨時機預測、CRM 跟進建議、改善提案自動摘要等。

---

## 3. 各模組功能說明

### 3.1 pricing — 折扣管理

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
| 批次修改 | ✅ 完成 | 勾選多筆，統一設定折扣% |
| Audit Log | ✅ 完成 | 追蹤誰在什麼時候改了什麼 |

### 3.2 inventory — 倉儲系統

| 功能 | 狀態 | 說明 |
|------|------|------|
| 商品管理 | ✅ 後端完成 | InventoryItem CRUD + barcode 欄位 |
| 掃碼入庫 | ✅ 完成 | ScanPanel.tsx + ZXing |
| 掃碼出庫 | ✅ 完成 | IN/OUT 選擇 |
| 庫存查詢 | ✅ 完成 | InventoryPanel 顯示 |
| 庫存異動歷史 | ✅ 完成 | TransactionHistory.tsx |
| 庫存警報 | ✅ 完成 | ⚠ 標記低於安全庫存 |
| 安全庫存設定 | ✅ 完成 | CS / admin 才顯示欄位 |
| Header 導航 | ✅ 完成 | 全頁共用，依角色顯示 |
| 權限系統 | ✅ 完成 | admin / warehouse / sales / CS |

### 3.3 sales — 業務支援 + CRM

**業務流程：**

```
【新客戶】
sales_prospect → 多次電話跟進 → 成交 → pricing_customers

【現有客戶】
pricing_customers → 推新商品 / 接受訂單

【訂單流程】
電話接單 → 業務輸入報價單 → 客人確認 → 按「確認成立」→ 正式訂單 → 分批出貨
```

| 功能 | 狀態 | 說明 |
|------|------|------|
| 報價單建立 | ⬜ 規劃中 | 業務輸入，產出 PDF（需 backend-pdf） |
| 報價單轉訂單 | ⬜ 規劃中 | 按「確認成立」自動轉換 |
| 訂單管理 | ⬜ 規劃中 | 狀態追蹤 |
| 分批出貨計畫 | ⬜ 規劃中 | 業務建立，倉庫執行 |
| CRM — 潛在客戶 | ⬜ 規劃中 | 新客開發、電話跟進紀錄 |
| CRM — 現有客戶聯絡紀錄 | ⬜ 規劃中 | 推新商品、跟進歷史 |

> 📌 報價單 PDF 需要 backend-pdf 服務支援，將在 backend-pdf 加入後開始開發。
> 📌 CRM 直接整合在系統內，不串接第三方工具。

### 3.4 improvement — 改善提案管理

解決 Slack 的核心痛點：公告消失、無法追蹤階段進度、無法向上報告中間頻測結果。

**特性：**
- 獨立 Header，與其他模組分開進入
- 全公司可見
- 支援附件上傳（數據、照片）

| 功能 | 狀態 | 說明 |
|------|------|------|
| 提案建立 | ⬜ 規劃中 | 填寫改善目標 |
| 階段目標設定 | ⬜ 規劃中 | 拆分成多個里程碑 |
| 中間頻測報告 | ⬜ 規劃中 | 每個階段填寫進度、上傳附件 |
| 進度總覽 | ⬜ 規劃中 | 主管查看下屬所有提案狀態 |

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

### 4.4 資料庫：PostgreSQL

| 技術 | 選用理由 |
|------|----------|
| PostgreSQL | 成熟穩定、能處理百萬級資料 |
| 關聯式設計 | Customer × Product × Discount 的多對多關聯查詢 |
| Prefix 命名 | 單一 DB 支援多模組，降低部署複雜度 |

---

## 5. 開發優先順序

### Phase 1 — pricing 模組 ✅ 完成

### Phase 2 — inventory 模組 ✅ 完成

### Phase 3 — backend-pdf + sales 模組

| 項目 | 說明 |
|------|------|
| backend-pdf 建立 | Node.js + Puppeteer 獨立服務 |
| 見積書模板設計 | HTML/CSS 日系格式、日文字型確認 |
| Spring Boot ↔ PDF 服務串接 | 資料傳遞、PDF binary 回傳 |
| CRM（潛在客戶 + 聯絡紀錄） | 新客開發追蹤 |
| 報價單 → 訂單流程 | 含「確認成立」按鈕 |
| 分批出貨計畫 | 業務建立，倉庫執行 |

### Phase 4 — improvement 模組

| 項目 | 說明 |
|------|------|
| 改善提案 CRUD | 建立、編輯、停用 |
| 階段目標管理 | 里程碑設定與狀態追蹤 |
| 中間頻測報告 | 填寫進度 + 附件上傳 |
| 進度總覽 | 主管視角 |

### Phase 5（後期）— AI 接口 + 體力測驗報告系統

| 項目 | 說明 |
|------|------|
| `/api/ai/` 路由群整理 | 各模組唯讀 endpoint 統一包裝 |
| 體力測驗報告 | 同走 backend-pdf，細節待評估 |
| 登入系統 / JWT | 目前 hardcode 角色，後期接帳號 + 密碼 |

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
- AI 接口預留：唯讀 API 設計完成後可直接接入任何 LLM

### 6.3 學習導向

- 無硬性 Deadline，理解比速度重要
- 每個功能先完成再解釋，逐步內化架構思維
- 從「寫功能」進化到「設計系統」

---

*慢慢來，比較快。理解了，才算學會。*

*PriceMatrix Platform · 統一平台架構規劃 v2.0 · 2026-03-05*
