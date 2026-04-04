# PriceMatrix — DB 架構決策文件

**版本：** v3.0　　**最後更新：** 2026-03-16

---

## 1. 整體方針

### 1.1 命名規則

| 模組 | Prefix | 說明 |
|------|--------|------|
| 折扣管理 | `pricing_` | 已建立 |
| 倉儲系統 | `inventory_` | 已建立 |
| 業務支援 + CRM | `sales_` | Phase 3 建立 |
| 改善提案 | `improvement_` | Phase 4 建立 |
| 共用 | `common_` | common_user 等共用資源 |

---

### 1.2 pricing 模組 Table 欄位清單

#### pricing_customers（2026-03-16 更新）

> ⚠ 本次更新：新增 phone / address / contact_person / note / parent_id / created_at / updated_at

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| name | VARCHAR(100) | NOT NULL | 公司名稱 |
| email | VARCHAR(150) | NULLABLE | 聯絡信箱 |
| phone | VARCHAR(50) | NULLABLE | 聯絡電話（本次新增） |
| address | VARCHAR(300) | NULLABLE | 公司地址（本次新增） |
| contact_person | VARCHAR(100) | NULLABLE | 主要聯絡窗口姓名（本次新增） |
| note | VARCHAR(500) | NULLABLE | 備註（本次新增） |
| parent_id | BIGINT | FK → pricing_customers, NULLABLE | 上層公司 FK，用於同公司多事務所（本次新增） |
| created_at | TIMESTAMP | NOT NULL | 建立時間（本次新增） |
| updated_at | TIMESTAMP | NOT NULL | 更新時間（本次新增） |

> **parent_id 設計說明：** 同一間公司旗下多個事務所，各自是一筆 customer，透過 parent_id 指向同一個上層公司。沒有 parent_id 的代表獨立客戶或上層公司本身。

#### pricing_categories

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| name | VARCHAR(100) | NOT NULL | 分類名稱 |

#### pricing_products

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| name | VARCHAR(100) | NOT NULL | 商品名稱 |
| base_price | DECIMAL | NOT NULL | 定價（原價） |
| category_id | BIGINT | FK → pricing_categories | 所屬分類 |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'active' | active / pending |
| manufacturer_id | BIGINT | FK → manufacturers | 廠商 |

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
| active | BOOLEAN | DEFAULT TRUE | 停用後不出現在操作清單 |
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
| batch_id | VARCHAR(30) | NULLABLE | 批次群組 ID |
| note | VARCHAR(500) | NULLABLE | |
| operated_by | VARCHAR(100) | NOT NULL | |
| operated_at | TIMESTAMP | NOT NULL | |

#### outsource_inquiry_log

只 INSERT 不修改，保留完整變化歷史。

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| item_id | BIGINT | FK → inventory_item | |
| confirmed_at | TIMESTAMP | NOT NULL | |
| confirmed_by | VARCHAR(100) | NOT NULL | |
| quantity | INT | NULLABLE | NULL = 問了但不確定 |
| note | VARCHAR(500) | NULLABLE | |

---

## 3. sales 模組 DB 設計（Phase 3）

### 3.1 業務流程

```
sales_prospect（潛在客戶）
└── sales_contact_log（電話跟進紀錄）
    ↓ 成交（方案B：手動補齊資料後建立）
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

### 3.2 新增客戶權限

| 角色 | 新增客戶 |
|------|----------|
| admin | ✅ 可以 |
| sales（業務） | ✅ 可以 |
| CS | ❌ 不給 |
| warehouse（倉庫） | ❌ 不給 |

### 3.3 CRM Table 設計

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

#### sales_contact_log（聯絡紀錄 / 日報活動記錄）

新客戶和現有客戶共用同一張表，`prospect_id` 和 `customer_id` 只填其中一個。

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| prospect_id | BIGINT | FK → sales_prospect, NULLABLE | 新客戶用 |
| customer_id | BIGINT | FK → pricing_customers, NULLABLE | 現有客戶用 |
| type | ENUM | NOT NULL | NEW_CLIENT / NEW_PRODUCT_PITCH / FOLLOW_UP |
| contacted_at | TIMESTAMP | NOT NULL | 聯絡時間 |
| result | ENUM | NOT NULL | PENDING / OK / NO |
| note | VARCHAR(500) | NULLABLE | 對方說了什麼、你說了什麼 |
| next_action | VARCHAR(500) | NULLABLE | 下次行動（AI 分析用） |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

> `next_action`：業務填「下次要做什麼」，AI 可用來自動整理本週待跟進清單。

### 3.4 訂單 Table 設計

#### sales_quote（報價單）

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| customer_id | BIGINT | FK → pricing_customers, NOT NULL | |
| status | ENUM | NOT NULL | DRAFT / SENT / CONVERTED / CANCELLED |
| note | VARCHAR(500) | NULLABLE | |
| parent_quote_id | BIGINT | FK → sales_quote, NULLABLE | 修正版來源 |
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
| unit_price | DECIMAL | NOT NULL | 當時報價快照 |

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

（與 v2.0 相同，無變更，請參照 v2.0 文件）

---

## 5. AI 接口預留

| Endpoint | 說明 |
|----------|------|
| `GET /api/ai/customers/{id}/timeline` | 某客戶的完整活動時間軸 |
| `GET /api/ai/sales/daily-summary` | 今日所有業務的日報內容 |

**原則：** 唯讀，不允許寫入。欄位名稱語意清楚，關聯資料盡量一次回傳。

---

## 6. 設計原則

| 原則 | 說明 |
|------|------|
| 稽核安全性 | `inventory_transaction` 和 `outsource_inquiry_log` 只 INSERT，絕不 UPDATE / DELETE |
| 歷史保留 | 潛在客戶成交後聯絡紀錄保留在 `prospect_id`；報價單轉訂單後資料保留 |
| 誠實顯示不確定性 | 委外直送數字加上確認日期與「需電話確認」提示 |
| 擴充預留 | `operated_by` 暫時用字串，未來接 `common_user` 表後改為 FK |
| AI 接口 | 唯讀 `/api/ai/` endpoint，供 LLM 分析，不允許寫入 |

---

*慢慢來，比較快。理解了，才算學會。*

*PriceMatrix Platform · DB 架構決策文件 v3.0 · 2026-03-16*
