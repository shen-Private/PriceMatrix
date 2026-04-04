# PriceMatrix — DB 架構決策文件

**版本：** v4.0　　**最後更新：** 2026-03-29

---

## 1. 整體方針

### 1.1 命名規則

| 模組 | Prefix | 說明 |
|------|--------|------|
| 折扣管理 | `pricing_` | 已建立 |
| 倉儲系統 | `inventory_` | 已建立 |
| 業務支援 + CRM | `sales_` | 已建立 |
| 改善提案 | `improvement_` | Phase 4 建立 |
| 共用 | `common_` | common_users 等共用資源 |

---

### 1.2 pricing 模組 Table 欄位清單

#### pricing_customers

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| name | VARCHAR(100) | NOT NULL | 公司名稱 |
| email | VARCHAR(150) | NULLABLE | 聯絡信箱 |
| phone | VARCHAR(50) | NULLABLE | 聯絡電話 |
| address | VARCHAR(300) | NULLABLE | 公司地址 |
| contact_person | VARCHAR(100) | NULLABLE | 主要聯絡窗口姓名 |
| note | VARCHAR(500) | NULLABLE | 備註 |
| parent_id | BIGINT | FK → pricing_customers, NULLABLE | 上層公司 FK，用於同公司多事務所 |
| assigned_to | VARCHAR(100) | NULLABLE | 負責業務帳號（待加） |
| active | BOOLEAN | NOT NULL, DEFAULT TRUE | 停用/啟用 |
| created_at | TIMESTAMP | NOT NULL | 建立時間 |
| updated_at | TIMESTAMP | NOT NULL | 更新時間 |

> **assigned_to 設計說明：** 業務離職時只需改此欄位，不需 copy 資料，歷史紀錄完整保留。

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

#### pricing_discount_audit_logs

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| discount_id | BIGINT | FK → pricing_discounts | |
| action | VARCHAR | NOT NULL | CREATE / UPDATE / BATCH_UPDATE |
| old_ratio | DECIMAL | NULLABLE | 修改前的折扣率 |
| new_ratio | DECIMAL | NOT NULL | 修改後的折扣率 |
| operated_by | VARCHAR(100) | NOT NULL | 登入帳號（從 JWT 取得） |
| operated_at | TIMESTAMP | NOT NULL | |

> **注意：** 通用 audit log 待 CRM 模組完成後統一設計，屆時此表可能遷移合併。

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

## 3. sales 模組 DB 設計

### 3.1 業務流程

```
sales_prospect（潛在客戶）← 待做
└── sales_contact_log（聯絡紀錄）← prospect_id 欄位待加
    ↓ 成交（方案B：手動補齊資料後建立）
pricing_customers（正式客戶）
    ↓
sales_quote（報價單）
    ↓ 按「確認成立」
sales_order（正式訂單）
    ↓
sales_shipment（出貨批次）
```

### 3.2 新增客戶權限

| 角色 | 新增客戶 |
|------|----------|
| admin | ✅ 可以 |
| sales（業務） | ✅ 可以 |
| CS | ❌ 不給 |
| warehouse（倉庫） | ❌ 不給 |

### 3.3 CRM Table 設計

#### sales_contact_log（已建立）

現有客戶和潛在客戶共用同一張表，`prospect_id` 欄位待加。

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| customer_id | BIGINT | FK → pricing_customers, NULLABLE | 現有客戶用 |
| prospect_id | BIGINT | FK → sales_prospect, NULLABLE | 潛在客戶用（待加） |
| type | VARCHAR(20) | NOT NULL | VISIT / PHONE / EMAIL / QUOTE / OTHER |
| contacted_at | TIMESTAMP | NOT NULL | 聯絡時間 |
| result | VARCHAR(20) | NOT NULL | PENDING / OK / NO |
| note | VARCHAR(500) | NULLABLE | 對方說了什麼、你說了什麼 |
| next_action | VARCHAR(500) | NULLABLE | 下次行動（AI 分析用） |
| created_by | VARCHAR(100) | NOT NULL | 登入帳號 |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

> **type 設計決策：** 以「互動方式」區分，不用「目的」區分，業務填寫更直覺。拜訪方向（客戶來訪或去客戶公司）都算 VISIT，note 補充即可。

#### sales_prospect（潛在客戶，待建立）

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| name | VARCHAR(100) | NOT NULL | |
| phone | VARCHAR(50) | NULLABLE | |
| note | VARCHAR(500) | NULLABLE | |
| status | VARCHAR(20) | NOT NULL | NEW / CONTACTING / WON / LOST |
| won_at | TIMESTAMP | NULLABLE | 成交時間戳 |
| customer_id | BIGINT | FK → pricing_customers, NULLABLE | 成交後指向哪個客戶 |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

### 3.4 訂單 Table 設計

#### sales_quote（報價單）

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| customer_id | BIGINT | FK → pricing_customers, NOT NULL | |
| status | VARCHAR(20) | NOT NULL | DRAFT / SENT / CONVERTED / CANCELLED |
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
| product_name | VARCHAR(200) | NULLABLE | 商品名稱快照 |
| base_price | DECIMAL | NULLABLE | 定價快照 |
| quantity | INT | NOT NULL | |
| unit_price | DECIMAL | NOT NULL | 當時報價快照 |

> **快照欄位說明：** `product_name` / `base_price` 在建立報價單時寫入，之後商品資料異動不影響歷史報價。舊資料（快照欄位加入前）此兩欄為 NULL，屬正常現象。

#### sales_order（正式訂單）

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| quote_id | BIGINT | FK → sales_quote, NULLABLE | 從報價單轉來時填入 |
| customer_id | BIGINT | FK → pricing_customers, NOT NULL | |
| status | VARCHAR(20) | NOT NULL | RECEIVED / PREPARING / SHIPPED / DELIVERED |
| confirmed_at | TIMESTAMP | NOT NULL | 按「確認成立」的時間 |
| created_by | VARCHAR(100) | NOT NULL | |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

#### sales_shipment（出貨批次）

| 欄位 | 型別 | 限制 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO | |
| order_id | BIGINT | FK → sales_order, NOT NULL | |
| carrier | VARCHAR(100) | NULLABLE | ヤマト運輸 / 佐川急便 / 福山通運 |
| tracking_number | VARCHAR(100) | NULLABLE | 追蹤號碼 |
| status | VARCHAR(20) | NOT NULL | PLANNED / SHIPPED / DELIVERED |
| shipped_at | TIMESTAMP | NULLABLE | 實際出貨日 |
| note | VARCHAR(500) | NULLABLE | |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

---

## 4. improvement 模組 DB 設計（Phase 4）

（待規劃）

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
| 歷史保留 | 報價單轉訂單後資料保留；快照欄位確保歷史報價不受商品資料異動影響 |
| 軟刪除 | 客戶停用用 `active` 欄位，不硬刪除，保留 FK 完整性 |
| 擔當歸屬 | `assigned_to` 存在客戶資料上，不跟帳號綁死，離職交接只需改欄位 |
| 誠實顯示不確定性 | 委外直送數字加上確認日期與「需電話確認」提示 |
| AI 接口 | 唯讀 `/api/ai/` endpoint，供 LLM 分析，不允許寫入 |

---

*慢慢來，比較快。理解了，才算學會。*

*PriceMatrix Platform · DB 架構決策文件 v4.0 · 2026-03-29*
