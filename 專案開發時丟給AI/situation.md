# PriceMatrix — 專案狀態

**最後更新：** 2026-03-02

---

## 本地路徑

| 端 | 路徑 |
|----|------|
| 後端 | `C:\Users\vcd52\IdeaProjects\pricematrix-backend\pricematrix` |
| 前端 | `C:\Users\vcd52\IdeaProjects\pricematrix` |

---

## 技術棧

| 層 | 技術 |
|----|------|
| 前端 | React + TypeScript + Storybook |
| 後端 | Java Spring Boot |
| 資料庫 | PostgreSQL（本地 + Render） |
| 架構 | API-First，前後端完全分離 |

---

## 專案結構現況

### 後端
```
pricematrix-backend/src/main/java/com/pricematrix/pricematrix/
├── pricing/
│   ├── entity/
│   │   ├── Customer.java
│   │   ├── Category.java
│   │   ├── Discount.java
│   │   └── Product.java
│   ├── repository/
│   │   ├── CategoryRepository.java
│   │   ├── CustomerRepository.java
│   │   ├── DiscountRepository.java
│   │   └── ProductRepository.java
│   ├── service/
│   │   ├── CategoryService.java
│   │   ├── CustomerService.java
│   │   ├── DiscountService.java
│   │   └── ProductService.java
│   └── controller/
│       ├── CategoryController.java
│       ├── CustomerController.java
│       ├── DiscountController.java
│       └── ProductController.java
├── inventory/
│   ├── entity/
│   │   ├── InventoryItem.java        ← barcode 欄位已加
│   │   ├── InventoryStock.java
│   │   ├── InventoryTransaction.java
│   │   └── OutsourceInquiryLog.java
│   ├── repository/
│   │   ├── InventoryItemRepository.java     ← findByBarcode 已加
│   │   ├── InventoryStockRepository.java
│   │   ├── InventoryTransactionRepository.java
│   │   └── OutsourceInquiryLogRepository.java
│   ├── service/
│   │   ├── InventoryItemService.java
│   │   ├── InventoryStockService.java
│   │   ├── InventoryTransactionService.java
│   │   └── OutsourceInquiryLogService.java
│   └── controller/
│       ├── InventoryItemController.java     ← /barcode/{barcode} 已加
│       ├── InventoryStockController.java
│       ├── InventoryTransactionController.java
│       └── OutsourceInquiryLogController.java
└── PricematrixApplication.java
```

### 前端
```
pricematrix/src/
├── modules/
│   ├── pricing/
│   │   ├── DiscountPanel.js
│   │   └── DiscountPanel.module.css
│   ├── inventory/
│   │   ├── InventoryPanel.tsx        ← Header 加掃碼按鈕
│   │   ├── InventoryPanel.module.css
│   │   └── ScanPanel.tsx             ← 掃碼入出庫頁面（ZXing 完成）
│   └── test/
│       └── Practice.jsx
├── App.tsx                           ← /pricing、/inventory、/inventory/scan、/test
├── index.css
└── index.js
```

---

## API 清單（已完成）

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | /api/inventory/items | 所有商品 |
| GET | /api/inventory/items/{id} | 單一商品 |
| GET | /api/inventory/items/barcode/{barcode} | 條碼查商品 |
| GET | /api/inventory/items/overview | 庫存總覽（含stock、inquiry） |
| POST | /api/inventory/transactions | 入出庫交易 |
| POST | /api/inventory/inquiries | 新增廠商情報 |
| GET | /api/inventory/inquiries/item/{id} | 廠商情報歷史 |

⚠️ GET /api/inventory/transactions（歷史查詢）未確認是否已實作

---

## 掃碼功能現況

- ✅ 手機相機掃碼（ZXing）：iOS + Android 瀏覽器可用
- ✅ controls.stop() 修正 decode loop 殘留問題
- ✅ 紅線 viewfinder、條碼輸入清除按鈕
- ✅ 掃碼後 → 查商品 → 選入/出庫 → 選運送公司 → 送出
- 運送公司：ヤマト運輸 / 佐川急便 / 福山通運（暫存在 note 欄位）

---

## 待辦事項

| 優先 | 項目 |
|------|------|
| 🔴 高 | Render 雲端同步（barcode 欄位、inventory 4 張表）← 到期 2026-03-20 |
| 🔴 高 | 確認 GET /api/inventory/transactions 後端是否已有 |
| 🟡 中 | 交易歷史查詢介面（前端） |
| 🟡 中 | Header 導航（pricing ↔ inventory 切換） |
| 🟢 低 | 權限分級（operatedBy 目前寫死「倉庫人員」） |

---

## 注意事項

- Render PostgreSQL 到期日：**2026-03-20**
- `application-local.properties` 不要 push
- 本地 psql 連線：`"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d pricematrix`
- 開發日：只帶最新日誌 + 相關檔案
- 對話變長會變慢，適時開新對話

---

## 目標架構（完整資料流）

```
【前端】
1. 使用者動作（View/Component）
   ↓
2. 狀態管理（Store/Action）
   ↓ HTTP 請求（跨網路）
【後端】
3. Controller
   ↓
4. Service
   ↓
5. Repository（Mapper/DAO）
   ↓
6. Entity（Model）
   ↓
【資料庫】
```

---

## 背景參數

- 地點：日本（沖繩）
- 經歷：2017 赴日 → 2019 東京語校 → 2023 山梨縣立大畢業 → 2025 山梨縣中小企業 → 2026 沖繩駐點外包
- 用途：校準回覆深度與術語，非業務資訊
