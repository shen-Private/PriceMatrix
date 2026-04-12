import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import shared from '../../styles/shared.module.css';
import styles from './DiscountPanel.module.css';
const API_URL = import.meta.env.VITE_API_URL ?? '';
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

// Audit Log の型
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

  // ── 一括変更 state ────────────────────────────────
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
      .catch(err => console.error('カテゴリ読み込み失敗：', err));
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
      showToast('検索に失敗しました', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCandidate = (candidate: Customer) => {
    if (currentCustomer) {
      const confirmed = window.confirm(
        `取引先を切り替えますか？\n現在：${currentCustomer.name}\n切り替え先：${candidate.name}`
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
      showToast('割引の読み込みに失敗しました', 'error');
    }
  };

  const startEdit = (discount: Discount) => {
    setEditingId(discount.id);
    setEditingValue(Math.round(discount.discountRatio * 100).toString());
  };

  const handleSave = async (discountId: number) => {
    const val = parseInt(editingValue, 10);
    if (isNaN(val) || val < 1 || val > 100) {
      showToast('1〜100の数値を入力してください', 'error');
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
      showToast(`割引率を ${val}% に更新しました`);
      if (auditPanelDiscountId === discountId) {
        loadAuditLogs(discountId);
      }
    } catch (err) {
      showToast('保存に失敗しました', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('この割引を削除してよろしいですか？')) return;
    try {
      await axios.delete(`${API_URL}/api/discounts/${id}`);
      setDiscounts(prev => (prev ?? []).filter(d => d.id !== id));
      setSelectedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      if (auditPanelDiscountId === id) setAuditPanelDiscountId(null);
      showToast('削除しました');
    } catch (err) {
      showToast('削除に失敗しました', 'error');
    }
  };

  const handleShowAddForm = async () => {
    if (!currentCustomer) return;
    try {
      const res = await axios.get(`${API_URL}/api/products/available?customerId=${currentCustomer.id}`);
      setAvailableProducts(res.data);
      setShowAddForm(true);
    } catch (err) {
      showToast('商品の読み込みに失敗しました', 'error');
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
      showToast('追加しました');
    } catch (err) {
      showToast('追加に失敗しました', 'error');
    }
  };

  // ── 一括変更 handlers ─────────────────────────────

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
      showToast('1〜100の数値を入力してください', 'error');
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
      showToast(`${selectedIds.size} 件の割引率を ${val}% に更新しました`);
      setSelectedIds(new Set());
      setBatchValue('');
    } catch (err) {
      showToast('一括変更に失敗しました', 'error');
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
      showToast('履歴の読み込みに失敗しました', 'error');
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

  // action の日本語対応
  const actionLabel: Record<string, string> = {
    CREATE: '追加',
    UPDATE: '変更',
    BATCH_UPDATE: '一括変更',
    DELETE: '削除',
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
    <div className={shared.root}>

      <header className={shared.header}>
        <div className={shared.headerLogo}>
          <div className={shared.headerLogoMark}>PM</div>
          PriceMatrix
        </div>
        <div className={shared.headerSystemLabel}>割引管理</div>
      </header>

      <div className={shared.layout}>
        <aside className={shared.sidebar}>

          <div>
            <div className={shared.sectionLabel}>検索条件</div>
            <div className={shared.formGroup}>
              <label className={shared.formLabel}>取引先名</label>
              <input
                className={shared.formInput}
                type="text"
                placeholder="取引先名を入力…"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className={shared.formGroup}>
              <label className={shared.formLabel}>商品カテゴリ</label>
              <select
                className={shared.formSelect}
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
              >
                <option value="">すべてのカテゴリ</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <button
              className={shared.btnSearch}
              onClick={handleSearch}
              disabled={isLoading}
            >
              {isLoading ? '検索中…' : '検索'}
            </button>
          </div>

          {!isCustomerSelected && customerCandidates.length > 0 && (
            <div>
              <div className={shared.sectionLabel}>
                検索結果（{customerCandidates.length} 件）
              </div>
              {customerCandidates.map(c => (
                <div
                  key={c.id}
                  className={styles.candidateItem}
                  onClick={() => handleSelectCandidate(c)}
                >
                  <div className={shared.candidateAvatar}>{c.name.charAt(0)}</div>
                  <div>
                    <div className={shared.candidateName}>{c.name}</div>
                    <div className={shared.candidateId}>ID #{c.id}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {currentCustomer && (
            <div>
              <div className={shared.sectionLabel}>選択中の取引先</div>
              <div className={shared.customerChip}>
                <div className={shared.customerAvatar}>{currentCustomer.name.charAt(0)}</div>
                <div>
                  <div className={shared.customerName}>{currentCustomer.name}</div>
                  <div className={shared.customerMeta}>
                    ID #{currentCustomer.id} · {validDiscounts.length} 件の割引
                  </div>
                </div>
              </div>
            </div>
          )}

          {validDiscounts.length > 0 && (
            <div>
              <div className={shared.sectionLabel}>検索結果サマリー</div>
              <div className={shared.statItem}>
                <span className={shared.statLabel}>表示件数</span>
                <span className={shared.statValue}>{validDiscounts.length}</span>
              </div>
              <div className={shared.statItem}>
                <span className={shared.statLabel}>平均割引率</span>
                <span className={shared.statValue}>{avgDiscount}%</span>
              </div>
              <div className={shared.statItem}>
                <span className={shared.statLabel}>最低割引率</span>
                <span className={shared.statValue}>{minDiscount}%</span>
              </div>
            </div>
          )}

          {isCustomerSelected && customerCandidates.length > 0 && (
            <div className={styles.sidebarSwitchSection}>
              <div className={shared.sectionLabel}>他の検索結果（クリックで切替）</div>
              {customerCandidates.map(c => (
                <div
                  key={c.id}
                  className={shared.candidateMiniItem}
                  onClick={() => handleSelectCandidate(c)}
                >
                  <div className={shared.candidateMiniAvatar}>{c.name.charAt(0)}</div>
                  <span className={shared.candidateMiniName}>{c.name}</span>
                  <span className={shared.candidateMiniId}>#{c.id}</span>
                  <span className={shared.candidateMiniArrow}>→</span>
                </div>
              ))}
            </div>
          )}

        </aside>

        <main className={shared.main}>
          <div>
            <div className={styles.mainTitle}>割引一覧</div>
            <div className={styles.mainSubtitle}>割引率をクリックして編集・Enter または確定ボタンで保存</div>
          </div>

          {/* ── 一括変更ツールバー ── */}
          {selectedIds.size > 0 && (
            <div className={styles.batchToolbar}>
              <span className={styles.batchToolbarCount}>{selectedIds.size} 件を選択中</span>
              <span className={styles.batchToolbarMuted}>一括設定</span>
              <input
                type="number" min="1" max="100"
                placeholder="割引率%"
                value={batchValue}
                onChange={e => setBatchValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleBatchSave()}
                className={styles.batchInput}
              />
              <span className={styles.batchToolbarMuted}>%</span>
              <button
                className={shared.btnConfirm}
                onClick={handleBatchSave}
                disabled={isBatchSaving}
              >
                {isBatchSaving ? '更新中…' : '適用'}
              </button>
              <button
                className={shared.btnConfirm}
                style={{ backgroundColor: 'transparent', color: '#5a6480', boxShadow: 'none', border: '1px solid #d0d7e8' }}
                onClick={() => { setSelectedIds(new Set()); setBatchValue(''); }}
              >
                選択解除
              </button>
            </div>
          )}

          {/* ── メインテーブル + Audit Log サイドパネル 並列 ── */}
          <div className={styles.tableAndAudit}>

            <div className={shared.tableWrap} style={{ flex: 1, minWidth: 0 }}>
              <table className={shared.table}>
                <thead>
                  <tr>
                    <th className={shared.th} style={{ width: '36px' }}>
                      {validDiscounts.length > 0 && (
                        <input
                          type="checkbox"
                          checked={selectedIds.size === validDiscounts.length && validDiscounts.length > 0}
                          onChange={toggleSelectAll}
                          title="すべて選択"
                        />  
                      )}
                    </th>
                    <th className={shared.th}>商品</th>
                    <th className={shared.th}>カテゴリ</th>
                    <th className={shared.th}>割引率</th>
                    <th className={shared.th}>定価 → 割引後</th>
                    <th className={shared.th}>操作</th>
                  </tr>
                </thead>
                <tbody>

                  {discounts === null && (
                    <tr>
                      <td colSpan={6} className={styles.td} style={{ textAlign: 'center', color: '#c0392b', padding: '32px' }}>
                        取引先が見つかりません。名前をご確認ください
                      </td>
                    </tr>
                  )}

                  {Array.isArray(discounts) && discounts.length === 0 && !currentCustomer && (
                    <tr>
                      <td colSpan={6} className={shared.td} style={{ textAlign: 'center', color: '#96a0b8', padding: '32px' }}>
                        {customerCandidates.length > 0
                          ? '← 左側から取引先を選択してください'
                          : '取引先名を入力して検索してください'}
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
                    const tdClass = isLastRow ? shared.tdLast : shared.td;

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
                                  className={shared.editInput}
                                  type="number" min="1" max="100"
                                  value={editingValue}
                                  onChange={e => setEditingValue(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleSave(discount.id);
                                    if (e.key === 'Escape') setEditingId(null);
                                  }}
                                  autoFocus
                                />
                                <button className={shared.btnConfirm} onClick={() => handleSave(discount.id)}>
                                  確定
                                  <span className={shared.btnConfirmShortcut}>Enter</span>
                                </button>
                                <button
                                  className={shared.btnIcon}
                                  style={{ color: '#c0392b', borderColor: '#e8b4b0' }}
                                  title="キャンセル"
                                  onClick={() => setEditingId(null)}
                                >✕</button>
                              </>
                            ) : (
                              <span
                                className={shared.discountValue}
                                onClick={() => startEdit(discount)}
                                title="クリックして編集"
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
                            <div className={shared.priceBreakdown}>
                              <span className={shared.priceOriginal}>¥{fmt(basePrice)}</span>
                              <span className={shared.priceArrow}>→</span>
                              <span className={shared.priceAfter}>¥{fmt(afterPrice)}</span>
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
                                  className={shared.btnIcon}
                                  title="変更履歴"
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
                                <button className={styles.btnIcon} title="削除" onClick={() => handleDelete(discount.id)}>✕</button>
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
                <div className={shared.tableFooter}>
                  {!showAddForm ? (
                    <button className={shared.btnAddRow} onClick={handleShowAddForm}>
                      <span className={styles.addFormPlusIcon}>＋</span>
                      割引を追加
                    </button>
                  ) : (
                    <div className={styles.addFormRow}>
                      <div className={styles.addFormField}>
                        <label className={shared.formLabel}>商品名</label>
                        <select
                          className={shared.formSelect}
                          style={{ width: '160px' }}
                          value={newDiscount.productId}
                          onChange={e => setNewDiscount({ ...newDiscount, productId: e.target.value })}
                        >
                          <option value="">選択してください</option>
                          {availableProducts.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.addFormField}>
                        <label className={shared.formLabel}>割引率（%）</label>
                        <input
                          className={shared.formInput}
                          style={{ width: '90px' }}
                          type="number" min="1" max="100"
                          placeholder="例：80"
                          value={newDiscount.discountRatio}
                          onChange={e => setNewDiscount({ ...newDiscount, discountRatio: e.target.value })}
                        />
                      </div>
                      <div className={styles.addFormActions}>
                        <button className={shared.btnConfirm} onClick={handleCreate}>追加する</button>
                        <button
                          className={shared.btnConfirm}
                          style={{ backgroundColor: 'transparent', color: '#5a6480', boxShadow: 'none', border: '1px solid #d0d7e8' }}
                          onClick={() => { setShowAddForm(false); setNewDiscount({ productId: '', discountRatio: '' }); }}
                        >キャンセル</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Audit Log サイドパネル ── */}
            {auditPanelDiscountId !== null && (
              <div className={styles.auditPanel}>
                <div className={styles.auditPanelHeader}>
                  <div>
                    <div className={styles.auditPanelTitle}>変更履歴</div>
                    {auditDiscount && (
                      <div className={styles.auditPanelProductName}>
                        {auditDiscount.product.name}
                      </div>
                    )}
                  </div>
                  <button
                    className={styles.auditPanelCloseBtn}
                    onClick={() => setAuditPanelDiscountId(null)}
                    title="閉じる"
                  >✕</button>
                </div>

                {isAuditLoading ? (
                  <div className={styles.auditPanelMessage}>読み込み中…</div>
                ) : auditLogs.length === 0 ? (
                  <div className={styles.auditPanelMessage}>変更履歴はありません</div>
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
                            <span className={styles.auditLogNewRatio}>{Math.round(log.newRatio * 100)}% に設定</span>
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