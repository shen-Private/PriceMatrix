import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import styles from './InventoryPanel.module.css';
import React from 'react';
import { useAuth } from '../../AuthContext';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

// ===== 型別定義 =====
interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  category: Category;
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

// ===== 常數 =====
const STOCK_TYPE_LABEL: Record<StockType, string> = {
  internal: '自社庫存',
  outsource_infinite: '委外常備',
  outsource_warehouse: '委外經倉',
  outsource_dropship: '委外直送',
};

const STOCK_TYPE_COLOR: Record<StockType, string> = {
  internal: '#2ecc71',
  outsource_infinite: '#3498db',
  outsource_warehouse: '#f39c12',
  outsource_dropship: '#9b59b6',
};

// ===== 主元件 =====
function InventoryPanel() {
  const [items, setItems] = useState<ItemWithStock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState<StockType | ''>('');
  const { can } = useAuth();
  const canSetSafetyStock = can('set_safety_stock');

  const [editingSafetyId, setEditingSafetyId] = useState<number | null>(null);
  const [editingSafetyValue, setEditingSafetyValue] = useState('');
  const [savingSafetyId, setSavingSafetyId] = useState<number | null>(null);
  // 廠商情報新增
  const [showInquiryForm, setShowInquiryForm] = useState<number | null>(null); // item.id
  const [newInquiry, setNewInquiry] = useState({ confirmedBy: '', quantity: '', note: '' });

  // 廠商情報歷史
  const [inquiryHistory, setInquiryHistory] = useState<Record<number, InquiryLog[]>>({});
  const [expandedInquiry, setExpandedInquiry] = useState<number | null>(null); // item.id

  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  // ===== 載入庫存總覽 =====
  const loadItems = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/inventory/items/overview`);
      setItems(res.data);
    } catch (err) {
      showToast('載入失敗', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  // ===== 新增廠商情報 =====
  const handleAddInquiry = async (itemId: number) => {
    try {
      await axios.post(`${API_URL}/api/inventory/inquiries`, {
        itemId,
        confirmedBy: newInquiry.confirmedBy,
        quantity: newInquiry.quantity ? parseInt(newInquiry.quantity) : null,
        note: newInquiry.note || null,
      });
      showToast('情報已記錄');
      setShowInquiryForm(null);
      setNewInquiry({ confirmedBy: '', quantity: '', note: '' });
      loadItems(); // 重新載入，更新 latestInquiry
    } catch (err) {
      showToast('記錄失敗', 'error');
    }
  };

  // ===== 載入廠商情報歷史 =====
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
      showToast('歷史載入失敗', 'error');
    }
  };

  const startEditSafety = (item: InventoryItem) => {
    setEditingSafetyId(item.id);
    setEditingSafetyValue(item.safetyStock !== null ? item.safetyStock.toString() : '');
  };

  const handleSaveSafety = async (item: InventoryItem) => {
    const val = editingSafetyValue === '' ? null : parseInt(editingSafetyValue, 10);
    if (val !== null && (isNaN(val) || val < 0)) { showToast('請輸入 0 以上的整數', 'error'); return; }
    setSavingSafetyId(item.id);
    setEditingSafetyId(null);
    try {
      await axios.put(`${API_URL}/api/inventory/items/${item.id}`, {
        stockType: item.stockType, unit: item.unit, safetyStock: val,
      });
      setItems(prev => prev.map(row =>
        row.item.id === item.id ? { ...row, item: { ...row.item, safetyStock: val } } : row
      ));
      showToast(val !== null ? `安全庫存設為 ${val} ${item.unit}` : '安全庫存已清除');
    } catch (err) { showToast('儲存失敗', 'error'); }
    finally { setSavingSafetyId(null); }
  };

  // ===== 過濾 =====
  const filteredItems = filterType
    ? items.filter(i => i.item.stockType === filterType)
    : items;

  // ===== 庫存狀態顯示 =====
  const renderStockStatus = (row: ItemWithStock) => {
    const { item, stock, latestInquiry } = row;

    switch (item.stockType) {
      case 'internal':
      case 'outsource_warehouse': {
        const qty = stock?.quantity ?? 0;
        const isLow = item.safetyStock !== null && qty <= item.safetyStock;
        const label = item.stockType === 'outsource_warehouse' ? `${qty} ${item.unit}（估算）` : `${qty} ${item.unit}`;
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
        if (!latestInquiry) return <span className={styles.stockNoData}>尚無情報</span>;
        const dateStr = new Date(latestInquiry.confirmedAt).toLocaleDateString('ja-JP');
        return (
          <span className={styles.stockDropship}>
            {latestInquiry.quantity !== null ? `${latestInquiry.quantity} ${item.unit}` : '不確定'}
            <span className={styles.stockDropshipDate}>（{dateStr} 確認）</span>
          </span>
        );
    }
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('ja-JP');
  const colSpan = canSetSafetyStock ? 6 : 5;

  return (
    <div className={styles.root}>

      <header className={styles.header}>
        <div className={styles.headerLogo}>
          <div className={styles.headerLogoMark}>PM</div>
          PriceMatrix
        </div>
        <div className={styles.headerRight}>
          <div className={styles.headerSystemLabel}>倉儲系統</div>
          <button
            className={styles.btnSearch}
            style={{ width: 'auto', padding: '6px 14px' }}
            onClick={() => window.location.href = '/inventory/scan'}
          >
            📷 掃碼入出庫
          </button>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div>
            <div className={styles.sectionLabel}>篩選條件</div>

            {/* 全部 */}
            <div
              className={styles.statItem}
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
                className={styles.filterDot}
                style={{ backgroundColor: '#5a6480' }}
              />
              <span
                className={styles.statLabel}
                style={{
                  fontWeight: filterType === '' ? 600 : undefined,
                  color: filterType === '' ? '#5a6480' : undefined,
                }}
              >
                全部
              </span>
            </div>

            {(Object.keys(STOCK_TYPE_LABEL) as StockType[]).map(k => {
              const isSelected = filterType === k;
              return (
                <div
                  key={k}
                  className={styles.statItem}
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
                    className={styles.filterDot}
                    style={{ backgroundColor: STOCK_TYPE_COLOR[k] }}
                  />
                  <span
                    className={styles.statLabel}
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

            <button
              className={styles.btnSearch}
              onClick={() => {
                if (window.confirm('重新從伺服器載入資料？')) {
                  loadItems();
                }
              }}
              disabled={isLoading}
              style={{ marginTop: '12px' }}
            >
              {isLoading ? '載入中…' : '重新整理'}
            </button>
          </div>
        </aside>

        <main className={styles.main}>庫存狀況
          <div>
            <div className={styles.mainTitle}>庫存總覽</div>
            <div className={styles.mainSubtitle}>
              ⚠ 委外直送數量為廠商告知的參考值，需電話確認
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>商品</th>
                  <th className={styles.th}>分類</th>
                  <th className={styles.th}>形態</th>
                  <th className={styles.th}>庫存狀況</th>
                  {canSetSafetyStock && <th className={styles.th}>安全庫存</th>}
                  <th className={styles.th}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={colSpan} className={styles.td} style={{ textAlign: 'center', color: '#96a0b8', padding: '32px' }}>
                      {isLoading ? '載入中…' : '無資料'}
                    </td>
                  </tr>
                )}

                {filteredItems.map((row, idx) => {
                  const { item } = row;
                  const isLast = idx === filteredItems.length - 1;
                  const tdClass = isLast ? styles.tdLast : styles.td;
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
                          <span className={styles.badge}>{item.product.category.name}</span>
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
                                    <button className={styles.btnConfirm} onClick={() => handleSaveSafety(item)}>確認</button>
                                    <button
                                      className={styles.btnIcon}
                                      style={{ color: '#c0392b', borderColor: '#e8b4b0' }}
                                      onClick={() => setEditingSafetyId(null)}
                                    >✕</button>
                                  </>
                                ) : (
                                  <span
                                    onClick={() => startEditSafety(item)}
                                    title="點擊設定安全庫存下限"
                                    className={item.safetyStock !== null ? styles.safetyDisplay : styles.safetyDisplayEmpty}
                                  >
                                    {isSavingSafety ? '…' : item.safetyStock !== null ? `${item.safetyStock} ${item.unit}` : '— 點擊設定'}
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
                                className={styles.btnIcon}
                                title="新增情報"
                                onClick={() => setShowInquiryForm(showInquiryForm === item.id ? null : item.id)}
                              >＋</button>
                              <button
                                className={styles.btnIcon}
                                title="查看歷史"
                                style={{ color: isExpanded ? '#4a78c4' : undefined }}
                                onClick={() => handleToggleInquiryHistory(item.id)}
                              >≡</button>
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* 新增廠商情報表單 */}
                      {isDropship && showInquiryForm === item.id && (
                        <tr key={`form-${item.id}`}>
                          <td colSpan={colSpan} className={styles.inquiryFormCell}>
                            <div className={styles.inquiryFormRow}>
                              <div className={styles.inquiryFormField}>
                                <label className={styles.formLabel}>確認者</label>
                                <input
                                  className={styles.formInput}
                                  style={{ width: '100px' }}
                                  placeholder="姓名"
                                  value={newInquiry.confirmedBy}
                                  onChange={e => setNewInquiry({ ...newInquiry, confirmedBy: e.target.value })}
                                />
                              </div>
                              <div className={styles.inquiryFormField}>
                                <label className={styles.formLabel}>數量（可空白）</label>
                                <input
                                  className={styles.formInput}
                                  style={{ width: '80px' }}
                                  type="number"
                                  placeholder="—"
                                  value={newInquiry.quantity}
                                  onChange={e => setNewInquiry({ ...newInquiry, quantity: e.target.value })}
                                />
                              </div>
                              <div className={styles.inquiryFormField}>
                                <label className={styles.formLabel}>備註</label>
                                <input
                                  className={styles.formInput}
                                  style={{ width: '180px' }}
                                  placeholder="例：月末補貨"
                                  value={newInquiry.note}
                                  onChange={e => setNewInquiry({ ...newInquiry, note: e.target.value })}
                                />
                              </div>
                              <div className={styles.inquiryFormActions}>
                                <button
                                  className={styles.btnConfirm}
                                  onClick={() => handleAddInquiry(item.id)}
                                  disabled={!newInquiry.confirmedBy}
                                >記錄</button>
                                <button
                                  className={styles.btnConfirm}
                                  style={{ backgroundColor: 'transparent', color: '#5a6480', boxShadow: 'none', border: '1px solid #d0d7e8' }}
                                  onClick={() => { setShowInquiryForm(null); setNewInquiry({ confirmedBy: '', quantity: '', note: '' }); }}
                                >取消</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* 廠商情報歷史 */}
                      {isDropship && isExpanded && (
                        <tr key={`history-${item.id}`}>
                          <td colSpan={colSpan} className={styles.inquiryHistoryCell}>
                            <div className={styles.inquiryHistoryTitle}>廠商情報歷史</div>
                            {(inquiryHistory[item.id] || []).length === 0 ? (
                              <div className={styles.inquiryHistoryEmpty}>尚無記錄</div>
                            ) : (
                              (inquiryHistory[item.id] || []).map(log => (
                                <div key={log.id} className={styles.inquiryLogRow}>
                                  <span className={styles.inquiryLogDate}>{fmt(log.confirmedAt)}</span>
                                  <span className={styles.inquiryLogName}>{log.confirmedBy}</span>
                                  <span className={styles.inquiryLogQty}>
                                    {log.quantity !== null ? `${log.quantity} ${item.unit}` : '不確定'}
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

export default InventoryPanel;
