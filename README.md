# PriceMatrix 2.0

> 企業級折扣管理系統 | Enterprise Discount Management System

---

## 📖 專案簡介 | About

**繁體中文**

PriceMatrix 是一套為業務人員設計的折扣管理系統。  
前身是 Excel 試算表，後來升級為 Google Apps Script，但因資料量龐大（1,000 客戶 × 1,600 商品）導致效能瓶頸，因此重新以企業級架構打造 2.0 版本。

**English**

PriceMatrix is a discount management system designed for sales teams.  
It evolved from Excel spreadsheets → Google Apps Script → a full-stack enterprise application, built to handle 1,000+ customers and 1,600+ products efficiently.

---

## ✨ 功能 | Features

- 🔍 客戶折扣查詢 | Customer discount lookup
- ✏️ 單筆折扣編輯（Inline editing）| Inline discount editing
- ➕ 新增折扣記錄 | Add new discount records
- 🗑️ 刪除折扣記錄（含確認提示）| Delete with confirmation
- 🔔 操作結果 Toast 通知 | Toast notifications
- 📂 商品分類篩選 | Category filter
- ⏳ 搜尋中 Loading 狀態 | Loading state during search

---

## 🛠️ 技術棧 | Tech Stack

| 層級 | 技術 |
|------|------|
| 前端 Frontend | React, JavaScript |
| 元件文件 Component Docs | Storybook |
| HTTP 請求 | Axios |
| 後端 Backend | Java Spring Boot |
| 資料庫 Database | MySQL |

---

## 🏗️ 系統架構 | Architecture

```
前端 React (port 3000)
    ↓ HTTP Request
後端 Spring Boot (port 8080)
    ↓ JPA
MySQL 資料庫 (port 3306)
```

前後端完全分離 | Full separation of frontend and backend

---

## 🚀 本地啟動 | Local Setup

### 前端 Frontend

```bash
npm install
npm start
```

### 後端 Backend

請參考 [PriceMatrix-backend](https://github.com/shen-Private/PriceMatrix-backend)

---

## 📊 資料規模 | Data Scale

- 客戶數 Customers：1,000
- 商品數 Products：600 ~ 1,600
- 潛在折扣記錄 Potential discount records：最多 1,600,000 筆

---

## 📁 專案結構 | Project Structure

```
src/
├── App.js
├── DiscountPanel.js     # 折扣查詢與管理面板
├── CustomerSearch.js    # 客戶搜尋元件
└── stories/             # Storybook 元件文件
```

---

## 🎯 開發背景 | Background

這個專案同時是：
- 解決真實業務痛點的實用工具
- 從 WordPress 開發者轉型為全端工程師的學習歷程

This project serves as both a practical business tool and a learning journey transitioning from WordPress/CMS development to full-stack enterprise architecture.
