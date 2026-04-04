# PriceMatrix — DB 架構決策文件

**版本：** v2.0　　**最後更新：** 2026-03-05

---

## 1. 整體方針

### 1.1 命名規則

所有 table 使用模組 prefix 區分歸屬，共用同一個 PostgreSQL DB。

| 模組 | Prefix | 說明 |
|------|--------|------|
| 折扣管理 | `pricing_` | 已建立 |
| 倉儲系統 | `inventory_` | 已建立 |
| 業務支援 + CRM | `sales_` | Phase 3 建立 |
| 改善提案 | `improvement_` | Phase 4 建立 |
| 共用 | `common_` | common_user 等共用資源 |

### 1.2 pricing 模組 Table 欄位清單

#### pricing_categories

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| name | VARCHAR(100) | NOT NULL | 分類名稱 |

#### pricing_customers

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| name | VARCHAR(100) | NOT NULL | 客戶名稱 |
| email | VARCHAR(150) | NULLABLE | 聯絡信箱 |

#### pricing_products

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| name | VARCHAR(100) | NOT NULL | 商品名稱 |
| base_price | DECIMAL | NOT NULL | 定價（原價） |
| category_id | BIGINT | FK → pricing_categories | 所屬分類 |

#### pricing_discounts

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| customer_id | BIGINT | FK → pricing_customers, NOT NULL | |
| product_id | BIGINT | FK → pricing_products, NOT NULL | |
| discount_ratio | DECIMAL | NOT NULL | 折扣率（1.0 = 原價） |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

#### pricing_discount_audit_log

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| discount_id | BIGINT | FK → pricing_discounts | |
| action | ENUM | NOT NULL | CREATE / UPDATE / BATCH_UPDATE |
| old_value | DECIMAL | NULLABLE | 修改前的折扣率 |
| new_value | DECIMAL | NOT NULL | 修改後的折扣率 |
| operated_by | VARCHAR(100) | NOT NULL | |
| operated_at | TIMESTAMP | NOT NULL | |

---

## 2. inventory 模組 DB 設計

### 2.1 庫存形態（stock_type）

| stock_type | 業務名稱 | 庫存在哪 | 數量可信度 |
|------------|----------|----------|------------|
| `internal` | 自社庫存 | 我方倉庫 | 高（掃碼管理） |
| `outsource_infinite` | 委外常備 | 廠商倉庫 | 不追蹤（視為無限） |
| `outsource_warehouse` | 委外經倉 | 先到我方倉庫再出貨 | 中（估算） |
| `outsource_dropship` | 委外直送 | 全程在廠商，直送客人 | 低（廠商情報參考值） |

### 2.2 商品管理方針

**決策：inventory_item 透過 FK 引用 pricing_products，不另建商品主表。**

理由：同一個物理商品不應該在兩張表各存一筆。`pricing_products` 負責「報價資訊」，`inventory_item` 負責「倉儲管理方式」，職責分離。

```
pricing_products（商品主表）
    ↑ FK（product_id）
inventory_item（倉儲擴充資訊）
    ↑ FK（item_id）
inventory_stock（庫存快照）
inventory_transaction（進出貨紀錄）
outsource_inquiry_log（廠商情報）
```

### 2.3 Table 設計

#### inventory_item

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| product_id | BIGINT | FK → pricing_products, NOT NULL | |
| stock_type | ENUM | NOT NULL | 四種形態 |
| unit | VARCHAR(50) | NOT NULL | 計量單位（箱/個/kg） |
| safety_stock | INT | DEFAULT 0, NULLABLE | 安全庫存下限 |
| is_active | BOOLEAN | DEFAULT TRUE | 停用後不出現在操作清單 |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

#### inventory_stock

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| item_id | BIGINT | FK → inventory_item | |
| quantity | INT | NOT NULL, DEFAULT 0 | 目前庫存數量 |
| last_updated_at | TIMESTAMP | NOT NULL | |

#### inventory_transaction

只 INSERT 不 UPDATE，稽核安全。

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| item_id | BIGINT | FK → inventory_item | |
| transaction_type | ENUM | NOT NULL | IN / OUT / ADJUST |
| quantity | INT | NOT NULL | 異動數量（正數） |
| quantity_before | INT | NOT NULL | 異動前庫存（稽核用） |
| quantity_after | INT | NOT NULL | 異動後庫存（稽核用） |
| batch_id | VARCHAR(30) | NULLABLE | 批次群組 ID，格式：BATCH-20260220-001 |
| note | VARCHAR(500) | NULLABLE | |
| operated_by | VARCHAR(100) | NOT NULL | 未來接 common_user 改為 FK |
| operated_at | TIMESTAMP | NOT NULL | |

#### outsource_inquiry_log

只 INSERT 不修改，保留完整變化歷史。

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| item_id | BIGINT | FK → inventory_item | |
| confirmed_at | TIMESTAMP | NOT NULL | 確認日期 |
| confirmed_by | VARCHAR(100) | NOT NULL | |
| quantity | INT | NULLABLE | NULL = 問了但不確定 |
| note | VARCHAR(500) | NULLABLE | |

---

## 3. sales 模組 DB 設計（Phase 3）

### 3.1 流程說明

```
sales_prospect（潛在客戶）
└── sales_contact_log（電話跟進紀錄）
    ↓ 成交
pricing_customers（正式客戶）
    ↓
sales_quote（報價單）
    ↓ 按「確認成立」
sales_order（正式訂單）
    ↓
sales_shipment（出貨批次）
└── sales_shipment_item
    └── → inventory_transaction（OUT）
```

### 3.2 CRM Table 設計

#### sales_prospect（潛在客戶）

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| name | VARCHAR(100) | NOT NULL | |
| phone | VARCHAR(50) | NULLABLE | |
| note | VARCHAR(500) | NULLABLE | |
| status | ENUM | NOT NULL | NEW / CONTACTING / WON / LOST |
| won_at | TIMESTAMP | NULLABLE | 成交時間戳，轉換當下寫入 |
| customer_id | BIGINT | FK → pricing_customers, NULLABLE | 成交後指向哪個客戶 |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

#### sales_contact_log（聯絡紀錄）

新客戶和現有客戶共用同一張表，`prospect_id` 和 `customer_id` 只填其中一個。

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| prospect_id | BIGINT | FK → sales_prospect, NULLABLE | 新客戶用 |
| customer_id | BIGINT | FK → pricing_customers, NULLABLE | 現有客戶用 |
| type | ENUM | NOT NULL | NEW_CLIENT / NEW_PRODUCT_PITCH / FOLLOW_UP |
| contacted_at | TIMESTAMP | NOT NULL | 聯絡時間 |
| result | ENUM | NOT NULL | PENDING / OK / NO |
| note | VARCHAR(500) | NULLABLE | 對方說了什麼、為什麼OK或不OK |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

> ⚠️ 潛在客戶成交後，舊的 `sales_contact_log` 紀錄保留在 `prospect_id` 下，歷史不動。透過 `sales_prospect.won_at` 可知道什麼時候轉換為正式客戶。

### 3.3 訂單 Table 設計

#### sales_quote（報價單）

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| customer_id | BIGINT | FK → pricing_customers, NOT NULL | |
| status | ENUM | NOT NULL | DRAFT / SENT / CONVERTED / CANCELLED |
| note | VARCHAR(500) | NULLABLE | |
| created_by | VARCHAR(100) | NOT NULL | |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

#### sales_quote_item（報價單明細）

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| quote_id | BIGINT | FK → sales_quote, NOT NULL | |
| product_id | BIGINT | FK → pricing_products, NOT NULL | |
| quantity | INT | NOT NULL | |
| unit_price | DECIMAL | NOT NULL | 當時報價（快照，不隨後續修改變動） |

#### sales_order（正式訂單）

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| quote_id | BIGINT | FK → sales_quote, NULLABLE | 從報價單轉來時填入 |
| customer_id | BIGINT | FK → pricing_customers, NOT NULL | |
| status | ENUM | NOT NULL | RECEIVED / PREPARING / SHIPPED / DELIVERED |
| confirmed_at | TIMESTAMP | NOT NULL | 按「確認成立」的時間 |
| created_by | VARCHAR(100) | NOT NULL | |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

#### sales_order_item（訂單明細）

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| order_id | BIGINT | FK → sales_order, NOT NULL | |
| product_id | BIGINT | FK → pricing_products, NOT NULL | |
| quantity | INT | NOT NULL | |
| unit_price | DECIMAL | NOT NULL | 成交價格快照 |

#### sales_shipment（出貨批次）

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| order_id | BIGINT | FK → sales_order, NOT NULL | |
| status | ENUM | NOT NULL | PLANNED / SHIPPED / DELIVERED |
| planned_at | TIMESTAMP | NULLABLE | 預計出貨日 |
| shipped_at | TIMESTAMP | NULLABLE | 實際出貨日 |
| note | VARCHAR(500) | NULLABLE | |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

#### sales_shipment_item（出貨批次明細）

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| shipment_id | BIGINT | FK → sales_shipment, NOT NULL | |
| product_id | BIGINT | FK → pricing_products, NOT NULL | |
| quantity | INT | NOT NULL | 這批實際出幾個 |

---

## 4. improvement 模組 DB 設計（Phase 4）

### 4.1 功能定位

改善提案的完整追蹤系統。解決 Slack 無法留存長期公告、無法追蹤階段進度的問題。

### 4.2 Table 設計

#### improvement_proposal（改善提案）

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| title | VARCHAR(200) | NOT NULL | |
| proposer_id | BIGINT | FK → common_user | |
| status | ENUM | NOT NULL | DRAFT / ACTIVE / COMPLETED / CANCELLED |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

#### improvement_milestone（階段目標）

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| proposal_id | BIGINT | FK → improvement_proposal | |
| title | VARCHAR(200) | NOT NULL | 這個階段要做什麼 |
| target_date | DATE | NULLABLE | 預計完成日 |
| status | ENUM | NOT NULL | PENDING / IN_PROGRESS / DONE |
| order | INT | NOT NULL | 第幾階段 |
| created_at | TIMESTAMP | NOT NULL | |

#### improvement_report（中間頻測報告）

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| milestone_id | BIGINT | FK → improvement_milestone | |
| reported_by | BIGINT | FK → common_user | |
| note | TEXT | NULLABLE | 文字說明 |
| reported_at | TIMESTAMP | NOT NULL | |
| created_at | TIMESTAMP | NOT NULL | |

#### improvement_attachment（附件）

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| report_id | BIGINT | FK → improvement_report | |
| file_url | VARCHAR(500) | NOT NULL | 上傳後的檔案路徑 |
| file_name | VARCHAR(200) | NOT NULL | 原始檔名 |
| uploaded_at | TIMESTAMP | NOT NULL | |

---

## 5. 各模組關聯圖

```
【pricing 模組】
pricing_customers ◄────────────────────────────────────┐
pricing_categories                                      │ FK
pricing_products ◄──────────────────────────────────┐  │
pricing_discounts                                    │  │
pricing_discount_audit_log                           │  │
                                                     │  │
【inventory 模組】                                   │  │
inventory_item ──────────────────────────────────────┘  │
    ↑ FK（item_id）                                      │
    ├── inventory_stock                                  │
    ├── inventory_transaction                            │
    └── outsource_inquiry_log                            │
                                                         │
【sales 模組】（Phase 3）                               │
sales_prospect ──────────────────────────────────────►  │
    └── sales_contact_log ◄── pricing_customers ────────┘
                                    │
                             sales_quote
                             sales_quote_item → pricing_products
                                    │
                             sales_order
                             sales_order_item → pricing_products
                                    │
                             sales_shipment
                             sales_shipment_item → pricing_products
                                    │
                             inventory_transaction（OUT）

【improvement 模組】（Phase 4）
improvement_proposal（common_user）
└── improvement_milestone
    └── improvement_report（common_user）
        └── improvement_attachment
```

---

## 6. 設計原則

### 稽核安全性
- `inventory_transaction` 和 `outsource_inquiry_log` 只 INSERT，絕不 UPDATE 或 DELETE
- 每筆異動記錄 `quantity_before` / `quantity_after`
- `pricing_discount_audit_log` 記錄所有折扣變更

### 誠實顯示不確定性
- 委外直送的數字加上確認日期與「需電話確認」提示
- `outsource_warehouse` 的估算庫存加上「估算值」標示

### 歷史保留原則
- 潛在客戶成交後，聯絡紀錄繼續掛在 `prospect_id`，不搬移
- 報價單轉訂單後，報價單狀態改為 CONVERTED，資料保留

### 擴充預留
- `operated_by` 暫時用字串，未來接 `common_user` 表後改為 FK
- `transaction_type` ENUM 預留 ADJUST，支援未來盤點修正
- AI 接口：各模組 API 完成後統一在 `/api/ai/` 開放唯讀 endpoint

---

*慢慢來，比較快。理解了，才算學會。*

*PriceMatrix Platform · DB 架構決策文件 v2.0 · 2026-03-05*
