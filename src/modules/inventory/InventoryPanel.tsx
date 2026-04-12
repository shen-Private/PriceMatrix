import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import styles from './InventoryPanel.module.css';
import shared from '../../styles/shared.module.css';
import React from 'react';
import { useAuth } from '../../AuthContext';
import { useSearchParams } from 'react-router-dom';
const API_URL = import.meta.env.VITE_API_URL ?? '';
axios.defaults.withCredentials = true;
// ===== 型定義 =====
interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  category: Category;
  manufacturer: { id: number; name: string } | null;
}

type StockType = 'internal' | 'outsource_infinite' | 'outsource_warehouse' | 'outsource_dropship';

interface InventoryItem {
  id: number;
  product: Product;
  stockType: StockType;
  unit: string;
  safetyStock: number | null;
  isActive: boolean;
}

interface InventoryStock {
  id: number;
  itemId: number;
  quantity: number;
  lastUpdatedAt: string;
}

interface ItemWithStock {
  item: InventoryItem;
  stock: InventoryStock | null;
  latestInquiry: InquiryLog | null;
}

interface InquiryLog {
  id: number;
  itemId: number;
  confirmedAt: string;
  confirmedBy: string;
  quantity: number | null;
  note: string | null;
}

interface Toast {
  message: string;
  type: 'success' | 'error';
}

interface RecentTransaction {
  id: number;
  transactionType: string;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  operatedBy: string;
  operatedAt: string;
  batchId: string | null;
  note: string | null;
  item: {
    id: number;
    product: { id: number; name: string; category: { id: number; name: string } };
    unit: string;
  };
}

// ===== 定数 =====
const STOCK_TYPE_LABEL: Record<StockType, string> = {
  internal: '自社在庫',
  outsource_infinite: '外注常備',
  outsource_warehouse: '外注倉庫',
  outsource_dropship: '外注直送',
};

const STOCK_TYPE_COLOR: Record<StockType, string> = {
  internal: '#2ecc71',
  outsource_infinite: '#3498db',
  outsource_warehouse: '#f39c12',
  outsource_dropship: '#9b59b6',
};

// ===== メインコンポーネント =====
function InventoryPanel() {
  const [items, setItems] = useState<ItemWithStock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState<StockType | ''>('');
  const [filterManufacturer, setFilterManufacturer] = useState<number | null>(null);
  const [manufacturers, setManufacturers] = useState<{ id: number; name: string }[]>([]);
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');
  const { can } = useAuth();
  const canSetSafetyStock = can('set_safety_stock');

  const [editingSafetyId, setEditingSafetyId] = useState<number | null>(null);
  const [editingSafetyValue, setEditingSafetyValue] = useState('');
  const [savingSafetyId, setSavingSafetyId] = useState<number | null>(null);
  // メーカー情報追加
  const [showInquiryForm, setShowInquiryForm] = useState<number | null>(null); // item.id
  const [newInquiry, setNewInquiry] = useState({ confirmedBy: '', quantity: '', note: '' });

  // メーカー情報履歴
  const [inquiryHistory, setInquiryHistory] = useState<Record<number, InquiryLog[]>>({});
  const [expandedInquiry, setExpandedInquiry] = useState<number | null>(null); // item.id

  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ===== モード切替：overview / stocktake =====
  type PanelMode = 'overview' | 'stocktake';
  const [mode, setMode] = useState<PanelMode>('overview');

  const switchMode = (next: PanelMode) => {
    setMode(next);
    if (next === 'stocktake') loadRecentTransactions();
  };
  const [filterCategory, setFilterCategory] = useState<string>('');
  // ===== 棚卸モード =====
  const [stocktakeValues, setStocktakeValues] = useState<Record<number, string>>({});
  const [stocktakeOperator, setStocktakeOperator] = useState('');
  const [isSubmittingStocktake, setIsSubmittingStocktake] = useState(false);

  // ===== 最近の入庫記録（棚卸サイドバー用）=====
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);

  const loadRecentTransactions = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/inventory/transactions/recent?days=7&limit=10`);
      setRecentTransactions(res.data);
    } catch {
      // サイレント失敗
    }
  };



  const showToast = (message: string, type: Toast['type'] = 'success') => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  // ===== 在庫一覧読み込み =====
  const loadItems = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/inventory/items/overview`);
      setItems(res.data);
    } catch (err) {
      showToast('読み込みに失敗しました', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);
  useEffect(() => {
    axios.get(`${API_URL}/api/manufacturers`)
      .then(res => setManufacturers(res.data))
      .catch(() => { });
  }, []);
  // ===== メーカー情報追加 =====
  const handleAddInquiry = async (itemId: number) => {
    try {
      await axios.post(`${API_URL}/api/inventory/inquiries`, {
        itemId,
        confirmedBy: newInquiry.confirmedBy,
        quantity: newInquiry.quantity ? parseInt(newInquiry.quantity) : null,
        note: newInquiry.note || null,
      });
      showToast('情報を記録しました');
      setShowInquiryForm(null);
      setNewInquiry({ confirmedBy: '', quantity: '', note: '' });
      loadItems(); // 再読み込み、latestInquiry を更新
    } catch (err) {
      showToast('記録に失敗しました', 'error');
    }
  };

  // ===== メーカー情報履歴読み込み =====
  const handleToggleInquiryHistory = async (itemId: number) => {
    if (expandedInquiry === itemId) {
      setExpandedInquiry(null);
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/api/inventory/inquiries/item/${itemId}`);
      setInquiryHistory(prev => ({ ...prev, [itemId]: res.data }));
      setExpandedInquiry(itemId);
    } catch (err) {
      showToast('履歴の読み込みに失敗しました', 'error');
    }
  };

  const startEditSafety = (item: InventoryItem) => {
    setEditingSafetyId(item.id);
    setEditingSafetyValue(item.safetyStock !== null ? item.safetyStock.toString() : '');
  };

  const handleSaveSafety = async (item: InventoryItem) => {
    const val = editingSafetyValue === '' ? null : parseInt(editingSafetyValue, 10);
    if (val !== null && (isNaN(val) || val < 0)) { showToast('0以上の整数を入力してください', 'error'); return; }
    setSavingSafetyId(item.id);
    setEditingSafetyId(null);
    try {
      await axios.put(`${API_URL}/api/inventory/items/${item.id}`, {
        stockType: item.stockType, unit: item.unit, safetyStock: val,
      });
      setItems(prev => prev.map(row =>
        row.item.id === item.id ? { ...row, item: { ...row.item, safetyStock: val } } : row
      ));
      showToast(val !== null ? `安全在庫を ${val} ${item.unit} に設定しました` : '安全在庫をクリアしました');
    } catch (err) { showToast('保存に失敗しました', 'error'); }
    finally { setSavingSafetyId(null); }
  };

  // ===== 棚卸送信 =====
  const handleSubmitStocktake = async () => {
    if (!stocktakeOperator.trim()) { showToast('担当者名を入力してください', 'error'); return; }
    const entries = Object.entries(stocktakeValues).filter(([, v]) => v !== '');
    if (entries.length === 0) { showToast('棚卸数量が入力されていません', 'error'); return; }
    setIsSubmittingStocktake(true);
    try {
      for (const [itemId, val] of entries) {
        const actualQty = parseInt(val, 10);
        if (isNaN(actualQty) || actualQty < 0) continue;
        await axios.post(`${API_URL}/api/inventory/transactions/adjust`, {
          itemId: parseInt(itemId),
          actualQuantity: actualQty,
          operatedBy: stocktakeOperator,
          note: '棚卸調整',
        });
      }
      showToast(`棚卸完了、${entries.length} 件を処理しました`);
      setStocktakeValues({});
      setStocktakeOperator('');
      setMode('overview');
      loadItems();
    } catch (err) {
      showToast('棚卸の送信に失敗しました', 'error');
    } finally {
      setIsSubmittingStocktake(false);
    }
  };



  // ===== フィルター =====
  const filteredItems = items.filter(i => {
    if (filterType && i.item.stockType !== filterType) return false;
    if (filterManufacturer && i.item.product?.manufacturer?.id !== filterManufacturer) return false;
    if (filterCategory && i.item.product?.category?.name !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!i.item.product?.name?.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  // ===== 在庫状況表示 =====
  const renderStockStatus = (row: ItemWithStock) => {
    const { item, stock, latestInquiry } = row;

    switch (item.stockType) {
      case 'internal':
      case 'outsource_warehouse': {
        const qty = stock?.quantity ?? 0;
        const isLow = item.safetyStock !== null && qty <= item.safetyStock;
        const label = item.stockType === 'outsource_warehouse' ? `${qty} ${item.unit}（概算）` : `${qty} ${item.unit}`;
        return (
          <span className={isLow ? styles.stockLow : styles.stockNormal}>
            {isLow && '⚠ '}
            {label}
          </span>
        );
      }
      case 'outsource_infinite':
        return <span className={styles.stockInfinite}>常備品</span>;

      case 'outsource_dropship':
        if (!latestInquiry) return <span className={styles.stockNoData}>情報なし</span>;
        const dateStr = new Date(latestInquiry.confirmedAt).toLocaleDateString('ja-JP');
        return (
          <span className={styles.stockDropship}>
            {latestInquiry.quantity !== null ? `${latestInquiry.quantity} ${item.unit}` : '不明'}
            <span className={styles.stockDropshipDate}>（{dateStr} 確認）</span>
          </span>
        );
    }
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('ja-JP');
  const colSpan = canSetSafetyStock ? 6 : 5;

  return (
    <div className={shared.root}>

      <header className={shared.header}>
        <div className={shared.headerLogo}>
          <div className={shared.headerLogoMark}>PM</div>
          PriceMatrix
        </div>
        <div className={shared.headerRight}>
          <div className={shared.headerSystemLabel}>在庫管理</div>
          <button
            className={shared.btnSearch}
            style={{ width: 'auto', padding: '6px 14px', backgroundColor: mode === 'stocktake' ? '#e67e22' : undefined, borderColor: mode === 'stocktake' ? '#e67e22' : undefined }}
            onClick={() => switchMode(mode === 'stocktake' ? 'overview' : 'stocktake')}
          >
            📋 棚卸モード
          </button>
          <button
            className={shared.btnSearch}
            style={{ width: 'auto', padding: '6px 14px' }}
            onClick={() => window.location.href = '/inventory/scan'}
          >
            📷 バーコードスキャン
          </button>
        </div>
      </header>

      <div className={shared.layout}>
        <aside className={shared.sidebar}>

          {/* ===== 棚卸モード：最近の入庫記録 ===== */}
          {mode === 'stocktake' && (
            <div>
              <div className={shared.sectionLabel}>直近の入庫（7日間）</div>
              {recentTransactions.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#96a0b8', padding: '8px 0' }}>記録なし</div>
              ) : (
                recentTransactions.map(tx => {
                  const isAdjust = tx.transactionType === 'ADJUST';
                  const sign = tx.quantity >= 0 ? '+' : '';
                  const color = tx.quantity > 0 ? '#27ae60' : tx.quantity < 0 ? '#e74c3c' : '#96a0b8';
                  const date = new Date(tx.operatedAt).toLocaleDateString('ja-JP');
                  return (
                    <div key={tx.id} style={{ padding: '8px 10px', borderRadius: '7px', border: '1px solid #d0d7e8', backgroundColor: '#f8f9fd', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#1e2740' }}>{tx.item.product.name}</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color, fontFamily: 'monospace' }}>
                          {isAdjust ? `${sign}${tx.quantity}` : `+${tx.quantity}`} {tx.item.unit}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#96a0b8' }}>{date}</span>
                        <span style={{ fontSize: '11px', color: '#96a0b8' }}>
                          {isAdjust ? '棚卸' : (tx.batchId ? 'バッチ' : '入庫')}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ===== 通常モード：フィルター条件 ===== */}
          {mode === 'overview' && (
            <div>
              <div className={shared.sectionLabel}>フィルター</div>

              {/* すべて */}
              <div
                className={shared.statItem}
                onClick={() => setFilterType('')}
                style={{
                  cursor: 'pointer',
                  backgroundColor: filterType === '' ? '#5a6480' + '22' : undefined,
                  border: filterType === '' ? '1.5px solid #5a6480' : '1.5px solid transparent',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  marginBottom: '6px',
                  transition: 'all 0.15s',
                }}
              >
                <span
                  className={shared.filterDot}
                  style={{ backgroundColor: '#5a6480' }}
                />
                <span
                  className={shared.statLabel}
                  style={{
                    fontWeight: filterType === '' ? 600 : undefined,
                    color: filterType === '' ? '#5a6480' : undefined,
                  }}
                >
                  すべて
                </span>
              </div>

              {(Object.keys(STOCK_TYPE_LABEL) as StockType[]).map(k => {
                const isSelected = filterType === k;
                return (
                  <div
                    key={k}
                    className={shared.statItem}
                    onClick={() => setFilterType(isSelected ? '' : k as StockType)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isSelected ? STOCK_TYPE_COLOR[k] + '22' : undefined,
                      border: isSelected ? `1.5px solid ${STOCK_TYPE_COLOR[k]}` : '1.5px solid transparent',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      marginBottom: '6px',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span
                      className={shared.filterDot}
                      style={{ backgroundColor: STOCK_TYPE_COLOR[k] }}
                    />
                    <span
                      className={shared.statLabel}
                      style={{
                        fontWeight: isSelected ? 600 : undefined,
                        color: isSelected ? STOCK_TYPE_COLOR[k] : undefined,
                      }}
                    >
                      {STOCK_TYPE_LABEL[k]}
                    </span>
                  </div>
                );
              })}
              <div className={shared.sectionLabel} style={{ marginTop: '16px' }}>メーカー</div>

              {/* すべて */}
              <div
                className={shared.statItem}
                onClick={() => setFilterManufacturer(null)}
                style={{
                  cursor: 'pointer',
                  backgroundColor: filterManufacturer === null ? '#5a648022' : undefined,
                  border: filterManufacturer === null ? '1.5px solid #5a6480' : '1.5px solid transparent',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  marginBottom: '6px',
                  transition: 'all 0.15s',
                }}
              >
                <span className={shared.statLabel} style={{ fontWeight: filterManufacturer === null ? 600 : undefined }}>
                  すべて
                </span>
              </div>
              {manufacturers.map(m => (
                <div
                  key={m.id}
                  className={shared.statItem}
                  onClick={() => setFilterManufacturer(filterManufacturer === m.id ? null : m.id)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: filterManufacturer === m.id ? '#5a648022' : undefined,
                    border: filterManufacturer === m.id ? '1.5px solid #5a6480' : '1.5px solid transparent',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    marginBottom: '6px',
                    transition: 'all 0.15s',
                  }}
                >
                  <span className={shared.statLabel}
                    style={{ fontWeight: filterManufacturer === m.id ? 600 : undefined }}>
                    {m.name}
                  </span>
                </div>
              ))}
              <button
                className={shared.btnSearch}
                onClick={() => {
                  if (window.confirm('サーバーからデータを再読み込みしますか？')) {
                    loadItems();
                    setFilterManufacturer(null);
                    setFilterCategory('');
                    setFilterType('');
                  }
                }}
                disabled={isLoading}
                style={{ marginTop: '12px' }}
              >
                {isLoading ? '読み込み中…' : '更新'}
              </button>
            </div>
          )}
        </aside>

        <main className={shared.main}>

          {/* ===== 棚卸モード ===== */}
          {mode === 'stocktake' && (
            <div>
              <div className={shared.mainTitle}>📋 棚卸モード</div>
              <div className={shared.mainSubtitle}>
                実際の棚卸数量を入力すると、システムが差異を自動計算して ADJUST として記録します。
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0' }}>
                <label style={{ fontSize: '13px', color: '#5a6480', whiteSpace: 'nowrap' }}>担当者</label>
                <input
                  className={shared.formInput}
                  style={{ width: '160px' }}
                  placeholder="氏名"
                  value={stocktakeOperator}
                  onChange={e => setStocktakeOperator(e.target.value)}
                />
              </div>
              <div className={shared.tableWrap}>
                <table className={shared.table}>
                  <thead>
                    <tr>
                      <th className={shared.th}>商品</th>
                      <th className={shared.th}>カテゴリ</th>
                      <th className={shared.th}>メーカー</th>
                      <th className={shared.th}>現在庫</th>
                      <th className={shared.th}>実数（棚卸）</th>
                      <th className={shared.th}>差異</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items
                      .filter(r => r.item.stockType === 'internal' || r.item.stockType === 'outsource_warehouse')
                      .map((row, idx, arr) => {
                        const { item, stock } = row;
                        const current = stock?.quantity ?? 0;
                        const inputVal = stocktakeValues[item.id] ?? '';
                        const actual = inputVal !== '' ? parseInt(inputVal, 10) : null;
                        const diff = actual !== null && !isNaN(actual) ? actual - current : null;
                        const isLast = idx === arr.length - 1;
                        const tdClass = isLast ? shared.tdLast : shared.td;
                        return (
                          <tr key={item.id}>
                            <td className={tdClass}>{item.product.name}</td>
                            <td className={tdClass}><span className={shared.badge}>{item.product.category?.name ?? '—'}</span></td>
                            <td className={tdClass}>
                              {item.product.manufacturer?.name ?? '—'}
                            </td>
                            <td className={tdClass}>{current} {item.unit}</td>
                            <td className={tdClass}>
                              <input
                                type="number"
                                min="0"
                                className={styles.safetyInput}
                                placeholder="—"
                                value={inputVal}
                                onChange={e => setStocktakeValues(prev => ({ ...prev, [item.id]: e.target.value }))}
                              />
                              <span style={{ marginLeft: '4px', fontSize: '12px', color: '#96a0b8' }}>{item.unit}</span>
                            </td>
                            <td className={tdClass}>
                              {diff !== null && !isNaN(diff) && (
                                <span style={{ fontWeight: 600, color: diff > 0 ? '#27ae60' : diff < 0 ? '#e74c3c' : '#96a0b8' }}>
                                  {diff > 0 ? `+${diff}` : diff === 0 ? '±0' : `${diff}`}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button
                  className={shared.btnConfirm}
                  onClick={handleSubmitStocktake}
                  disabled={isSubmittingStocktake}
                >
                  {isSubmittingStocktake ? '送信中…' : '棚卸を確定する'}
                </button>
                <button
                  className={shared.btnConfirm}
                  style={{ backgroundColor: 'transparent', color: '#5a6480', boxShadow: 'none', border: '1px solid #d0d7e8' }}
                  onClick={() => { setMode('overview'); setStocktakeValues({}); setStocktakeOperator(''); }}
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}



          {/* ===== 在庫一覧（デフォルト）===== */}
          {mode === 'overview' && (<div>
            <div>
              <div className={shared.mainTitle}>在庫一覧</div>
              <div className={shared.mainSubtitle}>
                ⚠ 外注直送の数量はメーカー申告による参考値です。電話での確認が必要です
              </div>
            </div>
            {/* カテゴリタブ */}
            <div className={styles.categoryTabs}>
              <button
                className={filterCategory === '' ? styles.categoryTabActive : styles.categoryTab}
                onClick={() => setFilterCategory('')}
              >すべて</button>
              {[...new Set(items.map(i => i.item.product?.category?.name).filter(Boolean))].map(cat => (
                <button
                  key={cat}
                  className={filterCategory === cat ? styles.categoryTabActive : styles.categoryTab}
                  onClick={() => setFilterCategory(cat!)}
                >{cat}</button>
              ))}
            </div>
            <div className={shared.tableWrap}>
              <table className={shared.table}>
                <thead>
                  <tr>
                    <th className={shared.th}>商品</th>
                    <th className={shared.th}>カテゴリ</th>
                    <th className={shared.th}>メーカー</th>
                    <th className={shared.th}>形態</th>
                    <th className={shared.th}>在庫状況</th>
                    {canSetSafetyStock && <th className={shared.th}>安全在庫</th>}
                    <th className={shared.th}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={colSpan} className={shared.td} style={{ textAlign: 'center', color: '#96a0b8', padding: '32px' }}>
                        {isLoading ? '読み込み中…' : 'データなし'}
                      </td>
                    </tr>
                  )}

                  {filteredItems.map((row, idx) => {
                    const { item } = row;
                    const isLast = idx === filteredItems.length - 1;
                    const tdClass = isLast ? shared.tdLast : shared.td;
                    const isDropship = item.stockType === 'outsource_dropship';
                    const isExpanded = expandedInquiry === item.id;
                    const isEditingSafety = editingSafetyId === item.id;
                    const isSavingSafety = savingSafetyId === item.id;

                    return (
                      <React.Fragment key={item.id}>
                        <tr style={{ backgroundColor: isExpanded ? '#f8f9fd' : 'transparent' }}>
                          <td className={tdClass}>
                            <div style={{ fontWeight: 500 }}>{item.product.name}</div>
                          </td>
                          <td className={tdClass}>
                            <span className={shared.badge}>{item.product.category?.name ?? '—'}</span>
                          </td>
                          <td className={tdClass}>
                            {item.product.manufacturer?.name ?? '—'}
                          </td>
                          <td className={tdClass}>
                            {/* 形態バッジ：色は動的なので inline style を保持 */}
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '5px',
                              fontSize: '12px', color: STOCK_TYPE_COLOR[item.stockType]
                            }}>
                              <span style={{
                                width: '8px', height: '8px', borderRadius: '50%',
                                backgroundColor: STOCK_TYPE_COLOR[item.stockType]
                              }} />
                              {STOCK_TYPE_LABEL[item.stockType]}
                            </span>
                          </td>
                          <td className={tdClass}>
                            {renderStockStatus(row)}
                          </td>
                          {canSetSafetyStock && (
                            <td className={tdClass}>
                              {(item.stockType === 'internal' || item.stockType === 'outsource_warehouse') ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {isEditingSafety ? (
                                    <>
                                      <input
                                        type="number"
                                        min="0"
                                        value={editingSafetyValue}
                                        onChange={e => setEditingSafetyValue(e.target.value)}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') handleSaveSafety(item);
                                          if (e.key === 'Escape') setEditingSafetyId(null);
                                        }}
                                        autoFocus
                                        className={styles.safetyInput}
                                      />
                                      <span className={styles.safetyUnit}>{item.unit}</span>
                                      <button className={shared.btnConfirm} onClick={() => handleSaveSafety(item)}>確定</button>
                                      <button
                                        className={shared.btnIcon}
                                        style={{ color: '#c0392b', borderColor: '#e8b4b0' }}
                                        onClick={() => setEditingSafetyId(null)}
                                      >✕</button>
                                    </>
                                  ) : (
                                    <span
                                      onClick={() => startEditSafety(item)}
                                      title="クリックして安全在庫下限を設定"
                                      className={item.safetyStock !== null ? styles.safetyDisplay : styles.safetyDisplayEmpty}
                                    >
                                      {isSavingSafety ? '…' : item.safetyStock !== null ? `${item.safetyStock} ${item.unit}` : '— クリックして設定'}
                                      {!isSavingSafety && <span className={styles.safetyEditIcon}>✎</span>}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className={styles.safetyNA}>—</span>
                              )}
                            </td>
                          )}
                          <td className={tdClass}>
                            {isDropship && (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  className={shared.btnIcon}
                                  title="情報を追加"
                                  onClick={() => setShowInquiryForm(showInquiryForm === item.id ? null : item.id)}
                                >＋</button>
                                <button
                                  className={shared.btnIcon}
                                  title="履歴を表示"
                                  style={{ color: isExpanded ? '#4a78c4' : undefined }}
                                  onClick={() => handleToggleInquiryHistory(item.id)}
                                >≡</button>
                              </div>
                            )}
                          </td>
                        </tr>

                        {/* メーカー情報追加フォーム */}
                        {isDropship && showInquiryForm === item.id && (
                          <tr key={`form-${item.id}`}>
                            <td colSpan={colSpan} className={styles.inquiryFormCell}>
                              <div className={styles.inquiryFormRow}>
                                <div className={styles.inquiryFormField}>
                                  <label className={shared.formLabel}>確認者</label>
                                  <input
                                    className={shared.formInput}
                                    style={{ width: '100px' }}
                                    placeholder="氏名"
                                    value={newInquiry.confirmedBy}
                                    onChange={e => setNewInquiry({ ...newInquiry, confirmedBy: e.target.value })}
                                  />
                                </div>
                                <div className={styles.inquiryFormField}>
                                  <label className={shared.formLabel}>数量（空白可）</label>
                                  <input
                                    className={shared.formInput}
                                    style={{ width: '80px' }}
                                    type="number"
                                    placeholder="—"
                                    value={newInquiry.quantity}
                                    onChange={e => setNewInquiry({ ...newInquiry, quantity: e.target.value })}
                                  />
                                </div>
                                <div className={styles.inquiryFormField}>
                                  <label className={shared.formLabel}>備考</label>
                                  <input
                                    className={shared.formInput}
                                    style={{ width: '180px' }}
                                    placeholder="例：月末入荷予定"
                                    value={newInquiry.note}
                                    onChange={e => setNewInquiry({ ...newInquiry, note: e.target.value })}
                                  />
                                </div>
                                <div className={styles.inquiryFormActions}>
                                  <button
                                    className={shared.btnConfirm}
                                    onClick={() => handleAddInquiry(item.id)}
                                    disabled={!newInquiry.confirmedBy}
                                  >記録</button>
                                  <button
                                    className={shared.btnConfirm}
                                    style={{ backgroundColor: 'transparent', color: '#5a6480', boxShadow: 'none', border: '1px solid #d0d7e8' }}
                                    onClick={() => { setShowInquiryForm(null); setNewInquiry({ confirmedBy: '', quantity: '', note: '' }); }}
                                  >キャンセル</button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* メーカー情報履歴 */}
                        {isDropship && isExpanded && (
                          <tr key={`history-${item.id}`}>
                            <td colSpan={colSpan} className={styles.inquiryHistoryCell}>
                              <div className={styles.inquiryHistoryTitle}>メーカー情報履歴</div>
                              {(inquiryHistory[item.id] || []).length === 0 ? (
                                <div className={styles.inquiryHistoryEmpty}>記録なし</div>
                              ) : (
                                (inquiryHistory[item.id] || []).map(log => (
                                  <div key={log.id} className={styles.inquiryLogRow}>
                                    <span className={styles.inquiryLogDate}>{fmt(log.confirmedAt)}</span>
                                    <span className={styles.inquiryLogName}>{log.confirmedBy}</span>
                                    <span className={styles.inquiryLogQty}>
                                      {log.quantity !== null ? `${log.quantity} ${item.unit}` : '不明'}
                                    </span>
                                    {log.note && <span className={styles.inquiryLogNote}>{log.note}</span>}
                                  </div>
                                ))
                              )}
                            </td>
                          </tr>
                        )}

                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>)}
        </main>
      </div>

      {toast && (
        <div className={`${shared.toast} ${toast.type === 'error' ? shared.toastError : shared.toastSuccess}`}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.message}
        </div>
      )}
    </div>
  );
}

export default InventoryPanel;