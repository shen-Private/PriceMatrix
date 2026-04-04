# PriceMatrix — DB 架構決策文件

**版本：** v1.0　　**最後更新：** 2026-02-20

---

## 1. 整體方針

### 1.1 命名規則
所有 table 使用模組 prefix 區分歸屬，共用同一個 DB。

| 模組 | Prefix | 說明 |
|------|--------|------|
| 折扣管理 | `pricing_` | 現有 table 需補上 prefix（見 1.2） |
| 倉儲系統 | `inventory_` | 新建 |
| 業務支援 | `sales_` | 新建（Phase 3） |
| 共用 | `common_` | 未來擴充用（權限、稽核等） |

### 1.3 pricing 模組 Table 欄位清單

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

---

## 2. inventory 模組 DB 設計

### 2.1 庫存形態（stock_type）

inventory 模組最核心的架構決策。商品依庫存來源分為四種形態，決定後續所有行為。

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

#### inventory_item（倉儲商品擴充資訊）

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| product_id | BIGINT | FK → pricing_products, NOT NULL | |
| stock_type | ENUM | NOT NULL | 四種形態 |
| unit | VARCHAR(50) | NOT NULL | 計量單位（箱/個/kg） |
| safety_stock | INT | DEFAULT 0, NULLABLE | 安全庫存下限。`outsource_infinite` 和 `outsource_dropship` 允許 NULL |
| is_active | BOOLEAN | DEFAULT TRUE | 停用後不出現在操作清單，歷史保留 |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

#### inventory_stock（庫存快照）

適用於 `internal` 和 `outsource_warehouse`。用快照取代每次 SUM 異動紀錄，提升查詢效能。

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| item_id | BIGINT | FK → inventory_item | |
| quantity | INT | NOT NULL, DEFAULT 0 | 目前庫存數量 |
| last_updated_at | TIMESTAMP | NOT NULL | 最後異動時間 |

#### inventory_transaction（進出貨異動紀錄）

適用於 `internal` 和 `outsource_warehouse`。只 INSERT 不 UPDATE，稽核安全。

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| item_id | BIGINT | FK → inventory_item | |
| transaction_type | ENUM | NOT NULL | IN / OUT / ADJUST |
| quantity | INT | NOT NULL | 異動數量（正數） |
| quantity_before | INT | NOT NULL | 異動前庫存（稽核用） |
| quantity_after | INT | NOT NULL | 異動後庫存（稽核用） |
| batch_id | VARCHAR(30) | NULLABLE | 批次入庫群組 ID。NULL = 單品，有值 = 同批次 |
| note | VARCHAR(500) | NULLABLE | 備註 |
| operated_by | VARCHAR(100) | NOT NULL | 操作者（未來接 common_user 改為 FK） |
| operated_at | TIMESTAMP | NOT NULL | |

**batch_id 格式：** 流水號，例如 `BATCH-20260220-001`。人看得懂，查詢直覺。

**批次入庫作法：**
- 單品掃碼 → batch_id 不填（NULL）
- 批次入庫 → 前端產生一個流水號，同一批所有商品共用這個 ID

#### outsource_inquiry_log（委外直送廠商情報記錄）

適用於 `outsource_dropship`。只 INSERT 不修改，保留完整變化歷史。

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| item_id | BIGINT | FK → inventory_item | |
| confirmed_at | TIMESTAMP | NOT NULL | 確認日期（打電話或收到單子的時間） |
| confirmed_by | VARCHAR(100) | NOT NULL | 誰確認的 |
| quantity | INT | NULLABLE | 廠商告知的數量（NULL = 問了但不確定） |
| note | VARCHAR(500) | NULLABLE | 備註（例：月末可能追加、售完待補等） |

> ⚠️ 這張表的數字是「廠商上次告知的參考值」，不是我方庫存。顯示時必須附上確認日期，提醒業務資訊時效性。

---

## 3. sales 模組 DB 設計（Phase 3）

### 3.1 開發時機

**決策：Phase 3 到了再建，現在不預建。**

理由：sales 模組的細節需求尚未完全確認，過早建 table 可能之後要修改。

### 3.2 預計 Table 結構

| Table | 說明 |
|-------|------|
| `sales_order` | 訂單主表（客戶、日期、狀態） |
| `sales_order_item` | 訂單明細（商品、數量、折扣） |
| `sales_shipment` | 出貨紀錄（出貨日、預計到達、實際到達） |
| `sales_activity_log` | 銷售人員日誌 |

### 3.3 訂單狀態流程

```
RECEIVED → PREPARING → SHIPPED → DELIVERED
受注      → 出荷準備  → 出荷済み → 納品確認
```

倉庫人員在系統改狀態後，Spring Boot 透過 JavaMailSender 自動寄通知信給客戶。

### 3.4 訂單來源

目前訂單來源：電話、FAX、EC 網站。三種都需要 CS 手動輸入進系統。自動化目前不在規劃內。

### 3.5 與 inventory 的關聯

```
sales_order_item → inventory_item（確認 stock_type）
sales_shipment   → inventory_transaction（出庫時產生 OUT 紀錄）
```

`outsource_dropship` 商品不經過我方倉庫，出貨追蹤直接記錄在 `sales_shipment`，不連 `inventory_transaction`。

---

## 4. backend-pdf サービス

**backend-pdf 本身不需要自己的 table。**

職責：接收 Spring Boot 傳來的資料 → 渲染 HTML → 輸出 PDF binary。資料來源是 pricing 和 inventory，不存自己的東西。

---

## 5. 各模組關聯圖

```
【pricing 模組】
pricing_customers
pricing_categories
pricing_products ←────────────────────────────┐
pricing_discounts                              │ FK
    (customer_id → pricing_customers)          │
    (product_id → pricing_products)            │
                                               │
【inventory 模組】                             │
inventory_item ────────────────────────────────┘
    (product_id → pricing_products)
    ↑ FK（item_id）
    ├── inventory_stock
    ├── inventory_transaction（batch_id 流水號）
    └── outsource_inquiry_log

【sales 模組】（Phase 3）
sales_order
    ↑
sales_order_item → inventory_item
sales_shipment   → inventory_transaction
sales_activity_log
```

---

## 6. 設計原則

### 稽核安全性
- `inventory_transaction` 和 `outsource_inquiry_log` 只 INSERT，絕不 UPDATE 或 DELETE
- 每筆異動記錄 `quantity_before` / `quantity_after`

### 誠實顯示不確定性
- 委外直送的數字加上確認日期與「需電話確認」提示
- `outsource_warehouse` 的估算庫存加上「估算值」標示

### 擴充預留
- `operated_by` 暫時用字串，未來接 `common_user` 表後改為 FK
- `transaction_type` ENUM 預留 ADJUST，支援未來盤點修正
- `outsource_inquiry_log.quantity` 允許 NULL，對應「問了但不確定」的現實情況

---

*慢慢來，比較快。理解了，才算學會。*

*PriceMatrix Platform · DB 架構決策文件 v1.0 · 2026-02-20*