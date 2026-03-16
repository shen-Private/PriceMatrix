import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './QuotePanel.module.css';

const API = import.meta.env.VITE_API_URL ?? '';

interface Customer { id: number; name: string; }
interface Product { id: number; name: string; basePrice: number; }
interface QuoteItem { productId: number; quantity: number; unitPrice: number; }

interface QuoteItemDetail {
    id: number;
    product: { id: number; name: string; basePrice: number };
    quantity: number;
    unitPrice: number;
}

interface Quote {
    id: number;
    customer: { id: number; name: string };
    items: QuoteItemDetail[];
    status: string;
    note: string;
    createdBy: string;
    createdAt: string;
    parentQuote?: { id: number };
}
const statusLabel: Record<string, string> = {
    DRAFT: '草稿', SENT: '已送出', CONVERTED: '已轉訂單', CANCELLED: '已取消'
};

const statusColor: Record<string, string> = {
    DRAFT: '#96a0b8', SENT: '#4a78c4', CONVERTED: '#2a9d6e', CANCELLED: '#e05c5c'
};

const QuotePanel: React.FC = () => {
    const [view, setView] = useState<'list' | 'create'>('list');
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [customerId, setCustomerId] = useState<number | ''>('');
    const [note, setNote] = useState('');
    const [items, setItems] = useState<QuoteItem[]>([{ productId: 0, quantity: 1, unitPrice: 0 }]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const loadQuotes = () => {
        axios.get(`${API}/api/quotes`).then(res => setQuotes(res.data));
    };

    useEffect(() => {
        loadQuotes();
        axios.get(`${API}/api/customers`).then(res => setCustomers(res.data));
        axios.get(`${API}/api/products`).then(res => setProducts(res.data));
    }, []);

    const handleProductChange = (index: number, productId: number) => {
        const product = products.find(p => p.id === productId);
        const updated = [...items];
        updated[index].productId = productId;
        updated[index].unitPrice = product?.basePrice ?? 0;
        setItems(updated);
    };

    const handleAddItem = () => setItems([...items, { productId: 0, quantity: 1, unitPrice: 0 }]);
    const handleRemoveItem = (index: number) => setItems(items.filter((_, i) => i !== index));
    const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const handleSubmit = async () => {
        if (!customerId) return alert('請選擇客戶');
        if (editingId) {
            await axios.put(`${API}/api/quotes/${editingId}`, { customerId, note, items });
        } else {
            await axios.post(`${API}/api/quotes`, { customerId, note, items });
        }
        setView('list');
        setCustomerId('');
        setNote('');
        setItems([{ productId: 0, quantity: 1, unitPrice: 0 }]);
        setEditingId(null);
        loadQuotes();
    };
    const handleEdit = (q: Quote) => {
        setCustomerId(q.customer.id);
        setNote(q.note ?? '');
        setItems(q.items.map(i => ({
            productId: i.product.id,
            quantity: i.quantity,
            unitPrice: i.unitPrice
        })));
        setEditingId(q.id);
        setView('create');
    };

    const handleRevise = async (id: number) => {
        await axios.post(`${API}/api/quotes/${id}/revise`);
        loadQuotes();
    };
    const handleStatusChange = async (id: number, status: string) => {
        await axios.patch(`${API}/api/quotes/${id}/status`, { status });
        loadQuotes();
    };

    return (
        <div className={styles.root}>
            <div className={styles.main}>
                {/* 頁籤切換 */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div className={styles.mainTitle}>報價單</div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                        <button
                            className={view === 'list' ? styles.btnPrimary : styles.btnSecondary}
                            onClick={() => setView('list')}
                        >列表</button>
                        <button
                            className={view === 'create' ? styles.btnPrimary : styles.btnSecondary}
                            onClick={() => setView('create')}
                        >＋ 建立報價單</button>
                    </div>
                </div>

                {/* 列表 */}
                {view === 'list' && (
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.th}>#</th>
                                    <th className={styles.th}>客戶</th>
                                    <th className={styles.th}>商品數</th>
                                    <th className={styles.th}>合計</th>
                                    <th className={styles.th}>狀態</th>
                                    <th className={styles.th}>建立時間</th>
                                    <th className={styles.th}>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quotes.map(q => {
                                    const qTotal = q.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
                                    return (
                                        <tr key={q.id}>
                                            <td className={styles.td}>
                                                {q.id}
                                                {q.parentQuote && (
                                                    <span style={{ fontSize: '11px', color: '#96a0b8', marginLeft: '6px' }}>
                                                        ← #{q.parentQuote.id}
                                                    </span>
                                                )}
                                            </td>
                                            <td className={styles.td}>{q.customer.name}</td>
                                            <td className={styles.td}>{q.items.length} 項</td>
                                            <td className={styles.td} style={{ fontFamily: 'monospace' }}>
                                                ¥{qTotal.toLocaleString()}
                                            </td>
                                            <td className={styles.td}>
                                                <span style={{
                                                    padding: '2px 10px', borderRadius: '12px', fontSize: '12px',
                                                    fontWeight: 600, backgroundColor: `${statusColor[q.status]}20`,
                                                    color: statusColor[q.status]
                                                }}>
                                                    {statusLabel[q.status] ?? q.status}
                                                </span>
                                            </td>
                                            <td className={styles.td} style={{ color: '#96a0b8', fontSize: '12px' }}>
                                                {new Date(q.createdAt).toLocaleDateString('zh-TW')}
                                            </td>
                                            <td className={styles.td}>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    {q.status === 'DRAFT' && (
                                                        <button
                                                            className={styles.btnIcon}
                                                            onClick={() => handleEdit(q)}
                                                            title="編輯"
                                                        >✏️</button>
                                                    )}
                                                    {q.status === 'DRAFT' && (
                                                        <button
                                                            className={styles.btnIcon}
                                                            onClick={() => handleStatusChange(q.id, 'SENT')}
                                                            title="送出"
                                                        >📤</button>
                                                    )}
                                                    {q.status === 'SENT' && (
                                                        <button
                                                            className={styles.btnIcon}
                                                            onClick={() => handleRevise(q.id)}
                                                            title="建立修正版"
                                                        >📝</button>
                                                    )}
                                                    {q.status === 'SENT' && (
                                                        <button
                                                            className={styles.btnIcon}
                                                            onClick={() => handleStatusChange(q.id, 'CONVERTED')}
                                                            title="確認成立"
                                                        >✅</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* 建立報價單 */}
                {view === 'create' && (
                    <>
                        <div className={styles.card}>
                            <div className={styles.sectionLabel}>客戶資訊</div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>客戶</label>
                                <select className={styles.formSelect} value={customerId}
                                    onChange={e => setCustomerId(Number(e.target.value))}>
                                    <option value="">-- 選擇客戶 --</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>備註</label>
                                <input className={styles.formInput} value={note}
                                    onChange={e => setNote(e.target.value)} placeholder="選填" />
                            </div>
                        </div>

                        <div className={styles.tableWrap}>
                            <div className={styles.sectionLabel} style={{ padding: '12px 16px 0' }}>商品明細</div>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th className={styles.th}>商品</th>
                                        <th className={styles.th}>數量</th>
                                        <th className={styles.th}>單價</th>
                                        <th className={styles.th}>小計</th>
                                        <th className={styles.th}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={index}>
                                            <td className={styles.td}>
                                                <select className={styles.itemSelect} value={item.productId}
                                                    onChange={e => handleProductChange(index, Number(e.target.value))}>
                                                    <option value={0}>-- 選擇商品 --</option>
                                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </td>
                                            <td className={styles.td}>
                                                <input type="number" className={styles.itemInput} value={item.quantity}
                                                    style={{ width: '80px' }}
                                                    onChange={e => {
                                                        const updated = [...items];
                                                        updated[index].quantity = Number(e.target.value);
                                                        setItems(updated);
                                                    }} />
                                            </td>
                                            <td className={styles.td}>
                                                <input type="number" className={styles.itemInput} value={item.unitPrice}
                                                    style={{ width: '100px' }}
                                                    onChange={e => {
                                                        const updated = [...items];
                                                        updated[index].unitPrice = Number(e.target.value);
                                                        setItems(updated);
                                                    }} />
                                            </td>
                                            <td className={styles.td}>¥{(item.quantity * item.unitPrice).toLocaleString()}</td>
                                            <td className={styles.td}>
                                                <button className={styles.btnIcon} onClick={() => handleRemoveItem(index)}>✕</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className={styles.btnAddRow} onClick={handleAddItem}>＋ 新增商品</div>
                            <div className={styles.totalRow}>
                                合計 <span className={styles.totalAmount}>¥{total.toLocaleString()}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button className={styles.btnPrimary} onClick={handleSubmit}>建立報價單</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default QuotePanel;