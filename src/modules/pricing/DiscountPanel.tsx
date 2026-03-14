import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import styles from './DiscountPanel.module.css';

const API_URL = 'http://localhost:8080';

// ── 型別定義 ──────────────────────────────────────────
interface Category {
  id: number;
  name: string;
}

interface Customer {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  basePrice: number;
  category: Category;
}

interface Discount {
  id: number;
  discountRatio: number;
  product: Product;
}

interface Toast {
  message: string;
  type: 'success' | 'error';
}

// Audit Log 的型別
interface AuditLog {
  id: number;
  discountId: number;
  oldRatio: number | null;
  newRatio: number;
  action: string;
  operatedBy: string;
  operatedAt: string;
}
// ─────────────────────────────────────────────────────

function DiscountPanel() {

  const [searchText, setSearchText] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [customerCandidates, setCustomerCandidates] = useState<Customer[]>([]);
  const [discounts, setDiscounts] = useState<Discount[] | null>([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newDiscount, setNewDiscount] = useState({ productId: '', discountRatio: '' });
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);

  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 批次修改 state ────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchValue, setBatchValue] = useState('');
  const [isBatchSaving, setIsBatchSaving] = useState(false);

  // ── Audit Log state ───────────────────────────────
  const [auditPanelDiscountId, setAuditPanelDiscountId] = useState<number | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    axios.get(`${API_URL}/api/categories`)
      .then(res => setCategories(res.data))
      .catch(err => console.error('分類載入失敗：', err));
  }, []);

  const handleSearch = async () => {
    if (!searchText.trim()) return;
    setIsLoading(true);
    setEditingId(null);
    setShowAddForm(false);
    setCurrentCustomer(null);
    setCustomerCandidates([]);
    setDiscounts([]);
    setSelectedIds(new Set());
    setAuditPanelDiscountId(null);

    try {
      const customerRes = await axios.get(`${API_URL}/api/customers/search?name=${searchText}`);
      const customers: Customer[] = customerRes.data;

      if (customers.length === 0) {
        setDiscounts(null);
        return;
      }

      if (customers.length === 1) {
        await loadDiscounts(customers[0], []);
      } else {
        setCustomerCandidates(customers);
      }

    } catch (err) {
      showToast('搜尋失敗', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCandidate = (candidate: Customer) => {
    if (currentCustomer) {
      const confirmed = window.confirm(
        `確定切換客戶？\n目前：${currentCustomer.name}\n切換至：${candidate.name}`
      );
      if (!confirmed) return;
    }
    loadDiscounts(candidate, customerCandidates);
  };

  const loadDiscounts = async (customer: Customer, candidates: Customer[]) => {
    setCurrentCustomer(customer);
    setCustomerCandidates(candidates.filter(c => c.id !== customer.id));
    setEditingId(null);
    setShowAddForm(false);
    setSelectedIds(new Set());
    setAuditPanelDiscountId(null);

    const categoryParam = selectedCategory ? `&categoryId=${selectedCategory}` : '';
    try {
      const discountRes = await axios.get(`${API_URL}/api/discounts/customer/${customer.id}?${categoryParam}`);
      setDiscounts(discountRes.data);
    } catch (err) {
      showToast('折扣載入失敗', 'error');
    }
  };

  const startEdit = (discount: Discount) => {
    setEditingId(discount.id);
    setEditingValue(Math.round(discount.discountRatio * 100).toString());
  };

  const handleSave = async (discountId: number) => {
    const val = parseInt(editingValue, 10);
    if (isNaN(val) || val < 1 || val > 100) {
      showToast('請輸入 1 ~ 100 的數字', 'error');
      return;
    }
    const newRatio = val / 100;
    setSavingId(discountId);
    setEditingId(null);

    try {
      await axios.put(`${API_URL}/api/discounts/${discountId}`, { discountRatio: newRatio });
      setDiscounts(prev => (prev ?? []).map(d =>
        d.id === discountId ? { ...d, discountRatio: newRatio } : d
      ));
      showToast(`折扣已更新為 ${val}%`);
      if (auditPanelDiscountId === discountId) {
        loadAuditLogs(discountId);
      }
    } catch (err) {
      showToast('儲存失敗', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('確定要刪除這筆折扣嗎？')) return;
    try {
      await axios.delete(`${API_URL}/api/discounts/${id}`);
      setDiscounts(prev => (prev ?? []).filter(d => d.id !== id));
      setSelectedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      if (auditPanelDiscountId === id) setAuditPanelDiscountId(null);
      showToast('刪除成功');
    } catch (err) {
      showToast('刪除失敗', 'error');
    }
  };

  const handleShowAddForm = async () => {
    if (!currentCustomer) return;
    try {
      const res = await axios.get(`${API_URL}/api/products/available?customerId=${currentCustomer.id}`);
      setAvailableProducts(res.data);
      setShowAddForm(true);
    } catch (err) {
      showToast('載入商品失敗', 'error');
    }
  };

  const handleCreate = async () => {
    if (!currentCustomer) return;
    try {
      const payload = {
        customer: { id: currentCustomer.id },
        product: { id: newDiscount.productId },
        discountRatio: parseFloat(newDiscount.discountRatio) / 100
      };
      const res = await axios.post(`${API_URL}/api/discounts`, payload);
      setDiscounts(prev => [...(prev ?? []), res.data]);
      setShowAddForm(false);
      setNewDiscount({ productId: '', discountRatio: '' });
      showToast('新增成功');
    } catch (err) {
      showToast('新增失敗', 'error');
    }
  };

  // ── 批次修改 handlers ─────────────────────────────

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleSelectAll = () => {
    const validDiscounts = Array.isArray(discounts) ? discounts : [];
    if (selectedIds.size === validDiscounts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(validDiscounts.map(d => d.id)));
    }
  };

  const handleBatchSave = async () => {
    const val = parseInt(batchValue, 10);
    if (isNaN(val) || val < 1 || val > 100) {
      showToast('請輸入 1 ~ 100 的數字', 'error');
      return;
    }
    const newRatio = val / 100;

    const updates: Record<number, number> = {};
    selectedIds.forEach(id => { updates[id] = newRatio; });

    setIsBatchSaving(true);
    try {
      await axios.put(`${API_URL}/api/discounts/batch`, updates);
      setDiscounts(prev => (prev ?? []).map(d =>
        selectedIds.has(d.id) ? { ...d, discountRatio: newRatio } : d
      ));
      showToast(`已將 ${selectedIds.size} 筆折扣更新為 ${val}%`);
      setSelectedIds(new Set());
      setBatchValue('');
    } catch (err) {
      showToast('批次修改失敗', 'error');
    } finally {
      setIsBatchSaving(false);
    }
  };

  // ── Audit Log handlers ────────────────────────────

  const loadAuditLogs = async (discountId: number) => {
    setIsAuditLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/discounts/${discountId}/audit-logs`);
      setAuditLogs(res.data);
    } catch (err) {
      showToast('歷史載入失敗', 'error');
    } finally {
      setIsAuditLoading(false);
    }
  };

  const openAuditPanel = (discountId: number) => {
    if (auditPanelDiscountId === discountId) {
      setAuditPanelDiscountId(null);
      return;
    }
    setAuditPanelDiscountId(discountId);
    loadAuditLogs(discountId);
  };

  // action 的中文對應
  const actionLabel: Record<string, string> = {
    CREATE: '新增',
    UPDATE: '修改',
    BATCH_UPDATE: '批次修改',
    DELETE: '刪除',
  };

  // audit badge の class を action で決定
  const getAuditBadgeClass = (action: string) => {
    if (action === 'CREATE') return styles.auditLogActionCreate;
    if (action.includes('UPDATE')) return styles.auditLogActionUpdate;
    return styles.auditLogActionDelete;
  };

  const formatDateTime = (dt: string) => {
    const d = new Date(dt);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const validDiscounts = Array.isArray(discounts) ? discounts : [];
  const avgDiscount = validDiscounts.length > 0
    ? Math.round(validDiscounts.reduce((s, d) => s + d.discountRatio * 100, 0) / validDiscounts.length)
    : null;
  const minDiscount = validDiscounts.length > 0
    ? Math.min(...validDiscounts.map(d => Math.round(d.discountRatio * 100)))
    : null;
  const fmt = (n: number) => Number(n).toLocaleString();

  const isCustomerSelected = currentCustomer !== null;
  const auditDiscount = validDiscounts.find(d => d.id === auditPanelDiscountId);

  return (
    <div className={styles.root}>

      <header className={styles.header}>
        <div className={styles.headerLogo}>
          <div className={styles.headerLogoMark}>PM</div>
          PriceMatrix
        </div>
        <div className={styles.headerSystemLabel}>折扣管理</div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>

          <div>
            <div className={styles.sectionLabel}>搜尋條件</div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>客戶名稱</label>
              <input
                className={styles.formInput}
                type="text"
                placeholder="輸入客戶名稱…"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>商品分類</label>
              <select
                className={styles.formSelect}
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
              >
                <option value="">全部分類</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <button
              className={styles.btnSearch}
              onClick={handleSearch}
              disabled={isLoading}
            >
              {isLoading ? '搜尋中…' : '搜尋'}
            </button>
          </div>

          {!isCustomerSelected && customerCandidates.length > 0 && (
            <div>
              <div className={styles.sectionLabel}>
                搜尋結果（{customerCandidates.length} 筆）
              </div>
              {customerCandidates.map(c => (
                <div
                  key={c.id}
                  className={styles.candidateItem}
                  onClick={() => handleSelectCandidate(c)}
                >
                  <div className={styles.candidateAvatar}>{c.name.charAt(0)}</div>
                  <div>
                    <div className={styles.candidateName}>{c.name}</div>
                    <div className={styles.candidateId}>ID #{c.id}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {currentCustomer && (
            <div>
              <div className={styles.sectionLabel}>目前客戶</div>
              <div className={styles.customerChip}>
                <div className={styles.customerAvatar}>{currentCustomer.name.charAt(0)}</div>
                <div>
                  <div className={styles.customerName}>{currentCustomer.name}</div>
                  <div className={styles.customerMeta}>
                    ID #{currentCustomer.id} · {validDiscounts.length} 筆折扣
                  </div>
                </div>
              </div>
            </div>
          )}

          {validDiscounts.length > 0 && (
            <div>
              <div className={styles.sectionLabel}>本次查詢</div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>顯示筆數</span>
                <span className={styles.statValue}>{validDiscounts.length}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>平均折扣</span>
                <span className={styles.statValue}>{avgDiscount}%</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>最低折扣</span>
                <span className={styles.statValue}>{minDiscount}%</span>
              </div>
            </div>
          )}

          {isCustomerSelected && customerCandidates.length > 0 && (
            <div className={styles.sidebarSwitchSection}>
              <div className={styles.sectionLabel}>其他搜尋結果（點擊切換）</div>
              {customerCandidates.map(c => (
                <div
                  key={c.id}
                  className={styles.candidateMiniItem}
                  onClick={() => handleSelectCandidate(c)}
                >
                  <div className={styles.candidateMiniAvatar}>{c.name.charAt(0)}</div>
                  <span className={styles.candidateMiniName}>{c.name}</span>
                  <span className={styles.candidateMiniId}>#{c.id}</span>
                  <span className={styles.candidateMiniArrow}>→</span>
                </div>
              ))}
            </div>
          )}

        </aside>

        <main className={styles.main}>
          <div>
            <div className={styles.mainTitle}>折扣清單</div>
            <div className={styles.mainSubtitle}>點擊折扣率開始編輯・Enter 或按確認送出</div>
          </div>

          {/* ── 批次修改工具列 ── */}
          {selectedIds.size > 0 && (
            <div className={styles.batchToolbar}>
              <span className={styles.batchToolbarCount}>已選 {selectedIds.size} 筆</span>
              <span className={styles.batchToolbarMuted}>統一設定為</span>
              <input
                type="number" min="1" max="100"
                placeholder="折扣%"
                value={batchValue}
                onChange={e => setBatchValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleBatchSave()}
                className={styles.batchInput}
              />
              <span className={styles.batchToolbarMuted}>%</span>
              <button
                className={styles.btnConfirm}
                onClick={handleBatchSave}
                disabled={isBatchSaving}
              >
                {isBatchSaving ? '更新中…' : '套用'}
              </button>
              <button
                className={styles.btnConfirm}
                style={{ backgroundColor: 'transparent', color: '#5a6480', boxShadow: 'none', border: '1px solid #d0d7e8' }}
                onClick={() => { setSelectedIds(new Set()); setBatchValue(''); }}
              >
                取消選取
              </button>
            </div>
          )}

          {/* ── 主表格 + Audit Log 側欄 並排 ── */}
          <div className={styles.tableAndAudit}>

            <div className={styles.tableWrap} style={{ flex: 1, minWidth: 0 }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th} style={{ width: '36px' }}>
                      {validDiscounts.length > 0 && (
                        <input
                          type="checkbox"
                          checked={selectedIds.size === validDiscounts.length && validDiscounts.length > 0}
                          onChange={toggleSelectAll}
                          title="全選"
                        />
                      )}
                    </th>
                    <th className={styles.th}>商品</th>
                    <th className={styles.th}>分類</th>
                    <th className={styles.th}>折扣率</th>
                    <th className={styles.th}>原價 → 折後</th>
                    <th className={styles.th}>操作</th>
                  </tr>
                </thead>
                <tbody>

                  {discounts === null && (
                    <tr>
                      <td colSpan={6} className={styles.td} style={{ textAlign: 'center', color: '#c0392b', padding: '32px' }}>
                        找不到客戶，請確認名稱是否正確
                      </td>
                    </tr>
                  )}

                  {Array.isArray(discounts) && discounts.length === 0 && !currentCustomer && (
                    <tr>
                      <td colSpan={6} className={styles.td} style={{ textAlign: 'center', color: '#96a0b8', padding: '32px' }}>
                        {customerCandidates.length > 0
                          ? '← 請從左側選擇客戶'
                          : '請輸入客戶名稱後點擊搜尋'}
                      </td>
                    </tr>
                  )}

                  {Array.isArray(discounts) && discounts.map((discount, idx) => {
                    const isEditing = editingId === discount.id;
                    const isSaving = savingId === discount.id;
                    const isLastRow = idx === discounts.length - 1;
                    const isSelected = selectedIds.has(discount.id);
                    const isAuditOpen = auditPanelDiscountId === discount.id;
                    const pct = Math.round(discount.discountRatio * 100);
                    const basePrice = discount.product.basePrice;
                    const afterPrice = basePrice ? Math.round(basePrice * discount.discountRatio) : null;
                    const tdClass = isLastRow ? styles.tdLast : styles.td;

                    return (
                      <tr key={discount.id} style={{
                        // 動態背景色：isAuditOpen / isEditing / isSelected の三種類があるため inline を維持
                        backgroundColor: isAuditOpen ? '#f0f4fd' : isEditing ? '#eef2fb' : isSelected ? '#f5f8ff' : 'transparent',
                        outline: isEditing ? '2px solid #4a78c4' : 'none',
                        outlineOffset: '-2px',
                        transition: 'background 0.12s',
                      }}>
                        <td className={tdClass} style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(discount.id)}
                          />
                        </td>
                        <td className={tdClass}>
                          <div style={{ fontWeight: 500 }}>{discount.product.name}</div>
                        </td>
                        <td className={tdClass}>
                          <span className={styles.badge}>{discount.product.category.name}</span>
                        </td>
                        <td className={tdClass}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isEditing ? (
                              <>
                                <input
                                  className={styles.editInput}
                                  type="number" min="1" max="100"
                                  value={editingValue}
                                  onChange={e => setEditingValue(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleSave(discount.id);
                                    if (e.key === 'Escape') setEditingId(null);
                                  }}
                                  autoFocus
                                />
                                <button className={styles.btnConfirm} onClick={() => handleSave(discount.id)}>
                                  確認
                                  <span className={styles.btnConfirmShortcut}>Enter</span>
                                </button>
                                <button
                                  className={styles.btnIcon}
                                  style={{ color: '#c0392b', borderColor: '#e8b4b0' }}
                                  title="取消"
                                  onClick={() => setEditingId(null)}
                                >✕</button>
                              </>
                            ) : (
                              <span
                                className={styles.discountValue}
                                onClick={() => startEdit(discount)}
                                title="點擊編輯"
                              >
                                {isSaving ? '…' : `${pct}%`}
                                {!isSaving && (
                                  <span style={{ fontSize: '11px', marginLeft: '5px', opacity: 0.45 }}>✎</span>
                                )}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={tdClass}>
                          {afterPrice !== null ? (
                            <div className={styles.priceBreakdown}>
                              <span className={styles.priceOriginal}>¥{fmt(basePrice)}</span>
                              <span className={styles.priceArrow}>→</span>
                              <span className={styles.priceAfter}>¥{fmt(afterPrice)}</span>
                            </div>
                          ) : (
                            <span className={styles.noPriceCell}>—</span>
                          )}
                        </td>
                        <td className={tdClass}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {!isEditing && (
                              <>
                                <button
                                  className={styles.btnIcon}
                                  title="變更歷史"
                                  onClick={() => openAuditPanel(discount.id)}
                                  style={{
                                    // audit panel の開閉状態で色が変わるため inline を維持
                                    color: isAuditOpen ? '#4a78c4' : '#7a88a8',
                                    borderColor: isAuditOpen ? '#4a78c4' : undefined,
                                    backgroundColor: isAuditOpen ? '#e8eefb' : undefined,
                                  }}
                                >
                                  ☰
                                </button>
                                <button className={styles.btnIcon} title="刪除" onClick={() => handleDelete(discount.id)}>✕</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {Array.isArray(discounts) && currentCustomer && (
                <div className={styles.tableFooter}>
                  {!showAddForm ? (
                    <button className={styles.btnAddRow} onClick={handleShowAddForm}>
                      <span className={styles.addFormPlusIcon}>＋</span>
                      新增折扣
                    </button>
                  ) : (
                    <div className={styles.addFormRow}>
                      <div className={styles.addFormField}>
                        <label className={styles.formLabel}>商品名稱</label>
                        <select
                          className={styles.formSelect}
                          style={{ width: '160px' }}
                          value={newDiscount.productId}
                          onChange={e => setNewDiscount({ ...newDiscount, productId: e.target.value })}
                        >
                          <option value="">請選擇</option>
                          {availableProducts.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.addFormField}>
                        <label className={styles.formLabel}>折扣率（%）</label>
                        <input
                          className={styles.formInput}
                          style={{ width: '90px' }}
                          type="number" min="1" max="100"
                          placeholder="例：80"
                          value={newDiscount.discountRatio}
                          onChange={e => setNewDiscount({ ...newDiscount, discountRatio: e.target.value })}
                        />
                      </div>
                      <div className={styles.addFormActions}>
                        <button className={styles.btnConfirm} onClick={handleCreate}>確認新增</button>
                        <button
                          className={styles.btnConfirm}
                          style={{ backgroundColor: 'transparent', color: '#5a6480', boxShadow: 'none', border: '1px solid #d0d7e8' }}
                          onClick={() => { setShowAddForm(false); setNewDiscount({ productId: '', discountRatio: '' }); }}
                        >取消</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Audit Log 側欄 ── */}
            {auditPanelDiscountId !== null && (
              <div className={styles.auditPanel}>
                <div className={styles.auditPanelHeader}>
                  <div>
                    <div className={styles.auditPanelTitle}>變更歷史</div>
                    {auditDiscount && (
                      <div className={styles.auditPanelProductName}>
                        {auditDiscount.product.name}
                      </div>
                    )}
                  </div>
                  <button
                    className={styles.auditPanelCloseBtn}
                    onClick={() => setAuditPanelDiscountId(null)}
                    title="關閉"
                  >✕</button>
                </div>

                {isAuditLoading ? (
                  <div className={styles.auditPanelMessage}>載入中…</div>
                ) : auditLogs.length === 0 ? (
                  <div className={styles.auditPanelMessage}>尚無變更記錄</div>
                ) : (
                  <div className={styles.auditLogList}>
                    {auditLogs.map(log => (
                      <div key={log.id} className={styles.auditLogItem}>
                        <div className={styles.auditLogTop}>
                          {/* action badge：種別ごとの色は CSS class で管理 */}
                          <span className={`${styles.auditLogActionBadge} ${getAuditBadgeClass(log.action)}`}>
                            {actionLabel[log.action] ?? log.action}
                          </span>
                          <span className={styles.auditLogDate}>
                            {formatDateTime(log.operatedAt)}
                          </span>
                        </div>
                        <div className={styles.auditLogRatio}>
                          {log.oldRatio !== null ? (
                            <>
                              <span className={styles.auditLogOldRatio}>{Math.round(log.oldRatio * 100)}%</span>
                              <span className={styles.auditLogArrow}>→</span>
                              <span className={styles.auditLogNewRatio}>{Math.round(log.newRatio * 100)}%</span>
                            </>
                          ) : (
                            <span className={styles.auditLogNewRatio}>設為 {Math.round(log.newRatio * 100)}%</span>
                          )}
                        </div>
                        <div className={styles.auditLogOperator}>{log.operatedBy}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </main>
      </div>

      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.message}
        </div>
      )}
    </div>
  );
}

export default DiscountPanel;