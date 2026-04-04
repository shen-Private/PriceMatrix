# PriceMatrix — 專案狀態

**最後更新：** 2026-02-21

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
| 資料庫 | MySQL（本地）/ PostgreSQL（Render） |
| 架構 | API-First，前後端完全分離 |

---

## 專案結構現況

### 後端
```
pricematrix-backend/src/main/java/com/pricematrix/pricematrix/
├── entity/
│   ├── Customer.java
│   ├── Category.java
│   ├── Discount.java
│   └── Product.java
├── repository/
│   ├── CategoryRepository.java
│   ├── CustomerRepository.java
│   ├── DiscountRepository.java
│   └── ProductRepository.java
├── service/
│   ├── CategoryService.java
│   ├── CustomerService.java
│   ├── DiscountService.java
│   └── ProductService.java
├── controller/
│   ├── CategoryController.java
│   ├── CustomerController.java
│   ├── DiscountController.java
│   └── ProductController.java
└── PricematrixApplication.java
```

### 前端
```
pricematrix/src/
├── DiscountPanel.js    ✅
├── stories/
│   └── DiscountPanel.stories.js  ✅
└── App.js
```

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
