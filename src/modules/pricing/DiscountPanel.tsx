import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import styles from './DiscountPanel.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

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

  const validDiscounts = Array.isArray(discounts) ? discounts : [];
  const avgDiscount = validDiscounts.length > 0
    ? Math.round(validDiscounts.reduce((s, d) => s + d.discountRatio * 100, 0) / validDiscounts.length)
    : null;
  const minDiscount = validDiscounts.length > 0
    ? Math.min(...validDiscounts.map(d => Math.round(d.discountRatio * 100)))
    : null;
  const fmt = (n: number) => Number(n).toLocaleString();

  const isCustomerSelected = currentCustomer !== null;

  return (
    <div className={styles.root}>

      <header className={styles.header}>
        <div className={styles.headerLogo}>
          <div className={styles.headerLogoMark}>PM</div>
          PriceMatrix
        </div>
        <div style={{ fontSize: '13px', color: '#5a6480' }}>折扣管理</div>
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
            <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #e8ecf4' }}>
              <div className={styles.sectionLabel}>其他搜尋結果（點擊切換）</div>
              {customerCandidates.map(c => (
                <div
                  key={c.id}
                  className={styles.candidateMiniItem}
                  onClick={() => handleSelectCandidate(c)}
                >
                  <div className={styles.candidateMiniAvatar}>{c.name.charAt(0)}</div>
                  <span className={styles.candidateMiniName}>{c.name}</span>
                  <span style={{ fontSize: '11px', color: '#96a0b8', marginLeft: 'auto' }}>#{c.id}</span>
                  <span style={{ fontSize: '12px', color: '#4a78c4', marginLeft: '4px' }}>→</span>
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

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
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
                    <td colSpan={5} className={styles.td} style={{ textAlign: 'center', color: '#c0392b', padding: '32px' }}>
                      找不到客戶，請確認名稱是否正確
                    </td>
                  </tr>
                )}

                {Array.isArray(discounts) && discounts.length === 0 && !currentCustomer && (
                  <tr>
                    <td colSpan={5} className={styles.td} style={{ textAlign: 'center', color: '#96a0b8', padding: '32px' }}>
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
                  const pct = Math.round(discount.discountRatio * 100);
                  const basePrice = discount.product.basePrice;
                  const afterPrice = basePrice ? Math.round(basePrice * discount.discountRatio) : null;
                  const tdClass = isLastRow ? styles.tdLast : styles.td;

                  return (
                    <tr key={discount.id} style={{
                      backgroundColor: isEditing ? '#eef2fb' : 'transparent',
                      outline: isEditing ? '2px solid #4a78c4' : 'none',
                      outlineOffset: '-2px',
                      transition: 'background 0.12s',
                    }}>
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
                          <span style={{ color: '#96a0b8', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td className={tdClass}>
                        {!isEditing && (
                          <button className={styles.btnIcon} title="刪除" onClick={() => handleDelete(discount.id)}>✕</button>
                        )}
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
                    <span style={{
                      width: '20px', height: '20px', borderRadius: '4px',
                      border: '1px dashed #c2cade', display: 'inline-flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: '14px',
                    }}>＋</span>
                    新增折扣
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', padding: '4px 0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                    <div style={{ display: 'flex', gap: '8px' }}>
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