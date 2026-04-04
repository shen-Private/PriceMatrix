# Improvement 模組 — 設計決策文件

**日期：** 2026-04-02

---

## 1. 背景與目的

前公司每個月每人都要提交一份業務改善提案，但公司只評價短期效應，中長期改善完全沒辦法追蹤。此模組的目的是建立一個完整的改善提案追蹤系統，解決以下問題：

- 中長期改善有地方被記錄和追蹤，不會因短期看不到成果就被遺忘
- 協作成員可以明確記錄，不再只能填一個人的名字
- 取代 Excel 填寫，所有提案集中在系統內管理

---

## 2. 業務流程

```
建立提案（DRAFT）
    ↓ 送審
等待主管審核（PENDING_REVIEW）
    ↓ 核准 / 拒絕
執行中（ACTIVE）/ 拒絕（REJECTED）
    ↓ 每個 milestone 執行 + 提交頻測報告
全部 milestone 完成
    ↓
提案完成（COMPLETED）
```

---

## 3. 設計決策

| 決策項目 | 結論 | 理由 |
|------|------|------|
| 提案者 | 任何人都可以提 | 不限制角色 |
| 代表者 | 只有一個人 | 每月最優改善獎表彰用 |
| 協作成員 | 可多人 | 解決前公司只能填一個名字的問題 |
| 截止日期 | 每月固定要提 | `due_date` 欄位記錄當月截止日 |
| 主管審核 | 需要，核准才生效 | 送出後進入 PENDING_REVIEW，主管核准才變 ACTIVE |
| 效果衡量 | 填數字 + 單位 | before / after_goal / actual + unit（例：60分鐘→30分鐘） |
| 可見性 | 全公司都看得到 | 比前公司月會才公開更透明，大家可以互相參考 |
| 通知功能 | **Backlog，暫不實作** | 見下方說明 |
| DB 歸屬 | 同一個 DB，`improvement_` prefix | 公司規模小，分開 DB 複雜度遠大於好處 |
| 附件 | 先做連結（LINK），預留 UPLOAD | 避免現在接 S3 拖慢開發，`source_type` 欄位預留升級空間 |

---

## 4. 通知功能暫不實作的理由

通知系統有兩種主要做法：

**站內通知（Bell Icon）：** 後端寫通知紀錄到 DB，前端定期輪詢，Header 顯示未讀數。純自製，不需第三方，但前端要持續輪詢。

**Email 通知：** 呼叫第三方服務（SendGrid / Resend），有垃圾郵件風險。

**暫不實作的理由：**
- 公司只有 20-30 人，主管直接在系統審核列表集中處理即可
- 核心功能尚未穩定，先把流程做完再加通知
- 增加的複雜度現在不值得

**替代方案：** 做「審核列表」頁面讓主管集中看待審核的提案，功能等價但實作簡單。

---

## 5. DB 設計

```sql
-- 改善提案主體
improvement_proposal
├── id
├── title                   提案標題
├── description             現狀描述
├── goal                    預期效果
├── metric_before           改善前數字（例：60）
├── metric_after_goal       目標數字（例：30）
├── metric_unit             單位（例：分鐘、件、円）
├── metric_actual           實際達成數字（完成後填）
├── proposer                代表者帳號
├── status                  DRAFT / PENDING_REVIEW / ACTIVE / COMPLETED / REJECTED / CANCELLED
├── reviewed_by             審核主管帳號
├── reviewed_at
├── review_comment          核准或拒絕理由
├── submitted_at            送審時間
├── due_date                當月截止日
├── created_at
└── updated_at

-- 協作成員（多人）
improvement_member
├── id
├── proposal_id             FK → improvement_proposal
└── username

-- 階段目標
improvement_milestone
├── id
├── proposal_id             FK → improvement_proposal
├── title                   這階段要做什麼
├── order                   第幾階段
├── target_date             預計完成日
├── status                  PENDING / IN_PROGRESS / DONE
├── completed_at            實際完成日
└── completed_by            誰標記完成

-- 中間頻測報告
improvement_report
├── id
├── milestone_id            FK → improvement_milestone
├── note                    這次測試結果
├── reported_by
└── reported_at

-- 附件
improvement_attachment
├── id
├── report_id               FK → improvement_report
├── file_url
├── file_name
├── source_type             LINK（現在）/ UPLOAD（未來）
└── uploaded_at
```

---

## 6. 狀態流轉

```
DRAFT → PENDING_REVIEW → ACTIVE → COMPLETED
                       ↘ REJECTED
DRAFT → CANCELLED
ACTIVE → CANCELLED
```

---

## 7. 前端功能清單

| 功能 | 說明 |
|------|------|
| 提案列表 | 全公司都看得到，可篩選狀態/月份 |
| 建立提案 | 填寫表單取代 Excel |
| 審核列表 | 主管專用，看所有 PENDING_REVIEW 的提案 |
| 提案詳情 | milestone 進度 + 頻測報告時間軸 |
| 頻測報告填寫 | 每個 milestone 可提交報告 + 附件連結 |
| 標記完成 | milestone 執行者自己標記 DONE |

---

## 8. 技術 Backlog

| 項目 | 說明 |
|------|------|
| 通知功能 | 站內通知（Bell Icon）或 Email，核心功能穩定後再加 |
| 附件上傳 | 接 S3 或類似服務，現在先用連結 |

---

*PriceMatrix · Improvement 模組設計決策 · 2026-04-02*
