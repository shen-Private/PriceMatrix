import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './QuotePanel.module.css';
import shared from '../../styles/shared.module.css';
import { useSearchParams } from 'react-router-dom';
const API = import.meta.env.VITE_API_URL ?? '';

interface Customer { id: number; name: string; }
interface Product { id: number; name: string; basePrice: number; }
interface QuoteItem { productId: number; quantity: number; unitPrice: number; basePrice: number; }

interface QuoteItemDetail {
    id: number;
    productId: number;
    productName: string;
    basePrice: number;
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
    DRAFT: '下書き', SENT: '送付済み', CONVERTED: '受注済み', CANCELLED: 'キャンセル'
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
    const [items, setItems] = useState<QuoteItem[]>([{ productId: 0, quantity: 1, unitPrice: 0, basePrice: 0 }]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [searchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');
    const filteredQuotes = quotes.filter(q => {
        if (!searchQuery.trim()) return true;
        return String(q.id).includes(searchQuery.trim());
    });
    const loadQuotes = () => {
        axios.get(`${API}/api/quotes`).then(res => setQuotes(res.data));
    };

    useEffect(() => {
        loadQuotes();
        axios.get(`${API}/api/customers`).then(res => setCustomers(res.data));
        axios.get(`${API}/api/products`).then(res => setProducts(res.data));
    }, []);

    const handleProductChange = async (index: number, productId: number) => {
        const updated = [...items];
        updated[index].productId = productId;
        const product = products.find(p => p.id === productId);
        updated[index].basePrice = product?.basePrice ?? 0;
        // 顧客と商品が両方選択されていれば割引を取得
        if (customerId && productId) {
            try {
                const res = await axios.get(`${API}/api/discounts/customer/${customerId}/product/${productId}`);
                const discount = res.data; // { discountRatio: 0.8 }
                const product = products.find(p => p.id === productId);
                updated[index].unitPrice = Math.round((product?.basePrice ?? 0) * discount.discountRatio);
            } catch {
                // 割引設定なし → 定価を使用
                const product = products.find(p => p.id === productId);
                updated[index].unitPrice = product?.basePrice ?? 0;
            }
        } else {
            const product = products.find(p => p.id === productId);
            updated[index].unitPrice = product?.basePrice ?? 0;
        }

        setItems(updated);
    };

    const handleRemoveItem = (index: number) => setItems(items.filter((_, i) => i !== index));
    const handleAddItem = () => setItems([...items, { productId: 0, quantity: 1, unitPrice: 0, basePrice: 0 }]);
    const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const handleSubmit = async () => {
        if (!customerId) return alert('顧客を選択してください');
        if (editingId) {
            await axios.put(`${API}/api/quotes/${editingId}`, { customerId, note, items });
        } else {
            await axios.post(`${API}/api/quotes`, { customerId, note, items });
        }
        setView('list');
        setCustomerId('');
        setNote('');
        setItems([{ productId: 0, quantity: 1, unitPrice: 0, basePrice: 0 }]);
        setEditingId(null);
        loadQuotes();
    };
    const handleEdit = (q: Quote) => {
        setCustomerId(q.customer.id);
        setNote(q.note ?? '');
        setItems(q.items.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            basePrice: i.basePrice
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
    const handleConvert = async (id: number) => {
        if (!window.confirm('この見積書を確定して受注を作成しますか？')) return;
        await axios.post(`${API}/api/orders/from-quote/${id}`);
        loadQuotes();
    };
    return (
        <div className={shared.root}>
            <div className={shared.main}>
                {/* タブ切替 */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div className={shared.mainTitle}>見積書</div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                        <button
                            className={view === 'list' ? styles.btnPrimary : styles.btnSecondary}
                            onClick={() => setView('list')}
                        >一覧</button>
                        <button
                            className={view === 'create' ? styles.btnPrimary : styles.btnSecondary}
                            onClick={() => setView('create')}
                        >＋ 見積書を作成</button>
                    </div>
                </div>

                {/* 一覧 */}
                {view === 'list' && (
                    <div className={shared.tableWrap}>
                        <table className={shared.table}>
                            <thead>
                                <tr>
                                    <th className={shared.th}>#</th>
                                    <th className={shared.th}>顧客</th>
                                    <th className={shared.th}>商品数</th>
                                    <th className={shared.th}>合計</th>
                                    <th className={shared.th}>ステータス</th>
                                    <th className={shared.th}>作成日時</th>
                                    <th className={shared.th}>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredQuotes.map(q => {
                                    const qTotal = q.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
                                    return (
                                        <tr key={q.id}>
                                            <td className={shared.td}>
                                                {q.id}
                                                {q.parentQuote && (
                                                    <span style={{ fontSize: '11px', color: '#96a0b8', marginLeft: '6px' }}>
                                                        改訂元 Q#{q.parentQuote.id}
                                                    </span>
                                                )}
                                            </td>
                                            <td className={shared.td}>{q.customer.name}</td>
                                            <td className={shared.td}>{q.items.length} 点</td>
                                            <td className={shared.td} style={{ fontFamily: 'monospace' }}>
                                                ¥{qTotal.toLocaleString()}
                                            </td>
                                            <td className={shared.td}>
                                                <span style={{
                                                    padding: '2px 10px', borderRadius: '12px', fontSize: '12px',
                                                    fontWeight: 600, backgroundColor: `${statusColor[q.status]}20`,
                                                    color: statusColor[q.status]
                                                }}>
                                                    {statusLabel[q.status] ?? q.status}
                                                </span>
                                            </td>
                                            <td className={shared.td} style={{ color: '#96a0b8', fontSize: '12px' }}>
                                                {new Date(q.createdAt).toLocaleDateString('ja-JP')}
                                            </td>
                                            <td className={shared.td}>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    {q.status === 'DRAFT' && (
                                                        <button
                                                            className={shared.btnIcon}
                                                            onClick={() => handleEdit(q)}
                                                            title="編集"
                                                        >✏️</button>
                                                    )}
                                                    {q.status === 'DRAFT' && (
                                                        <button
                                                            className={shared.btnIcon}
                                                            onClick={() => handleStatusChange(q.id, 'SENT')}
                                                            title="送付"
                                                        >📤</button>
                                                    )}
                                                    {q.status === 'SENT' && (
                                                        <button
                                                            className={shared.btnIcon}
                                                            onClick={() => handleRevise(q.id)}
                                                            title="改訂版を作成"
                                                        >📝</button>
                                                    )}
                                                    {q.status === 'SENT' && (
                                                        <button
                                                            className={shared.btnIcon}
                                                            onClick={() => handleConvert(q.id)}
                                                            title="受注確定"
                                                        >✅</button>
                                                    )}
                                                    {(q.status === 'SENT' || q.status === 'DRAFT') && (
                                                        <button
                                                            className={shared.btnIcon}
                                                            onClick={async () => {
                                                                const res = await axios.get(`/api/pdf/quote/${q.id}`, { responseType: 'blob' });
                                                                const url = URL.createObjectURL(res.data);
                                                                const a = document.createElement('a');
                                                                a.href = url;
                                                                a.download = `quote-${q.id}.pdf`;
                                                                a.click();
                                                                URL.revokeObjectURL(url);
                                                            }}
                                                            title="PDF ダウンロード"
                                                        >🖨️</button>
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

                {/* 見積書を作成 */}
                {view === 'create' && (
                    <>
                        <div className={styles.card}>
                            <div className={shared.sectionLabel}>顧客情報</div>
                            <div className={shared.formGroup}>
                                <label className={shared.formLabel}>顧客</label>
                                <select className={shared.formSelect} value={customerId}
                                    onChange={e => setCustomerId(Number(e.target.value))}>
                                    <option value="">-- 顧客を選択 --</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className={shared.formGroup}>
                                <label className={shared.formLabel}>備考</label>
                                <input className={shared.formInput} value={note}
                                    onChange={e => setNote(e.target.value)} placeholder="任意" />
                            </div>
                        </div>

                        <div className={shared.tableWrap}>
                            <div className={shared.sectionLabel} style={{ padding: '12px 16px 0' }}>商品明細</div>
                            <table className={shared.table}>
                                <thead>
                                    <tr>
                                        <th className={shared.th}>商品</th>
                                        <th className={shared.th}>数量</th>
                                        <th className={shared.th}>単価</th>
                                        <th className={shared.th}>小計</th>
                                        <th className={shared.th}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={index}>
                                            <td className={shared.td}>
                                                <select className={styles.itemSelect} value={item.productId}
                                                    onChange={e => handleProductChange(index, Number(e.target.value))}>
                                                    <option value={0}>-- 商品を選択 --</option>
                                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </td>
                                            <td className={shared.td}>
                                                <input type="number" className={styles.itemInput} value={item.quantity}
                                                    style={{ width: '80px' }}
                                                    onChange={e => {
                                                        const updated = [...items];
                                                        updated[index].quantity = Number(e.target.value);
                                                        setItems(updated);
                                                    }} />
                                            </td>
                                            <td className={shared.td}>
                                                {item.basePrice > 0 && item.unitPrice !== item.basePrice && (
                                                    <span style={{ textDecoration: 'line-through', color: '#96a0b8', fontSize: '12px', marginRight: '6px' }}>
                                                        ¥{item.basePrice.toLocaleString()}
                                                    </span>
                                                )}
                                                <input type="number" className={styles.itemInput} value={item.unitPrice}
                                                    style={{ width: '100px' }}
                                                    onChange={e => {
                                                        const updated = [...items];
                                                        updated[index].unitPrice = Number(e.target.value);
                                                        setItems(updated);
                                                    }} />
                                            </td>
                                            <td className={shared.td}>¥{(item.quantity * item.unitPrice).toLocaleString()}</td>
                                            <td className={shared.td}>
                                                <button className={shared.btnIcon} onClick={() => handleRemoveItem(index)}>✕</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className={shared.btnAddRow} onClick={handleAddItem}>＋ 商品を追加</div>
                            <div className={styles.totalRow}>
                                合計 <span className={styles.totalAmount}>¥{total.toLocaleString()}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button className={styles.btnPrimary} onClick={handleSubmit}>見積書を作成</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default QuotePanel;