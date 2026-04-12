import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
const API = import.meta.env.VITE_API_URL ?? '';

const CARRIERS = ['ヤマト運輸', '佐川急便', '福山通運'];

interface Customer { id: number; name: string; }
interface Quote { id: number; items: QuoteItem[]; }
interface QuoteItem {
    productId: number;
    productName: string;
    basePrice: number;
    quantity: number;
    unitPrice: number;
}
interface Shipment {
    id: number;
    carrier: string;
    trackingNumber: string;
    status: string;
    shippedAt: string | null;
    note: string;
}

interface Order {
    id: number;
    quote: Quote;
    customer: Customer;
    status: string;
    createdBy: string;
    createdAt: string;
}

const statusLabel: Record<string, string> = {
    PENDING: '出荷待ち', COMPLETED: '完了'
};
const statusColor: Record<string, string> = {
    PENDING: '#e08c2a', COMPLETED: '#2a9d6e'
};

export default function OrderPanel() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [shipments, setShipments] = useState<Record<number, Shipment[]>>({});
    const [searchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');
    const [expanded, setExpanded] = useState<number | null>(null);

    // 出荷伝票フォーム
    const [showShipForm, setShowShipForm] = useState<number | null>(null);
    const [carrier, setCarrier] = useState(CARRIERS[0]);
    const [trackingNumber, setTrackingNumber] = useState('');
    const [shipNote, setShipNote] = useState('');

    const loadOrders = async () => {
        const res = await axios.get(`${API}/api/orders`);
        setOrders(res.data);
    };

    useEffect(() => { loadOrders(); }, []);

    const toggleExpand = async (orderId: number) => {
        if (expanded === orderId) {
            setExpanded(null);
            return;
        }
        setExpanded(orderId);
        if (!shipments[orderId]) {
            const res = await axios.get(`${API}/api/orders/${orderId}/shipments`);
            setShipments(prev => ({ ...prev, [orderId]: res.data }));
        }
    };

    const handleCreateShipment = async (orderId: number) => {
        await axios.post(`${API}/api/orders/${orderId}/shipments`, {
            carrier, trackingNumber, note: shipNote,
        });
        // 出荷伝票を再取得
        const res = await axios.get(`${API}/api/orders/${orderId}/shipments`);
        setShipments(prev => ({ ...prev, [orderId]: res.data }));
        setShowShipForm(null);
        setTrackingNumber('');
        setShipNote('');
    };

    const handleConfirmShipment = async (shipmentId: number, orderId: number) => {
        await axios.patch(`${API}/api/orders/shipments/${shipmentId}/confirm`);
        const res = await axios.get(`${API}/api/orders/${orderId}/shipments`);
        setShipments(prev => ({ ...prev, [orderId]: res.data }));
        loadOrders(); // 受注ステータスが COMPLETED に変わる場合あり
    };
    const filteredOrders = orders.filter(o => {
        console.log('orders:', orders.length);
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            o.customer.name?.toLowerCase().includes(q) ||
            String(o.id).includes(q)
        );
    });
    return (

        <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#2c3554', marginBottom: '20px' }}>
                受注管理
            </h2>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f4f6fb', color: '#5a6480' }}>
                        {['#', '顧客', '商品数', '合計', 'ステータス', '作成日時', ''].map(h => (
                            <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                        ))}
                    </tr>

                </thead>
                <tbody>
                    {filteredOrders.map(o => {
                        const total = o.quote.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
                        const isExpanded = expanded === o.id;
                        return (
                            <React.Fragment key={o.id}>
                                <tr style={{ borderBottom: '1px solid #eef0f6' }}>
                                    <td style={td()}>
                                        {o.id}
                                        <span style={{ fontSize: '11px', color: '#96a0b8', marginLeft: '6px' }}>
                                            Q#{o.quote.id}
                                        </span>
                                    </td>
                                    <td style={td()}>{o.customer.name}</td>
                                    <td style={td()}>{o.quote.items.length} 点</td>
                                    <td style={td()}>¥{total.toLocaleString()}</td>
                                    <td style={td()}>
                                        <span style={{
                                            padding: '2px 10px', borderRadius: '12px', fontSize: '12px',
                                            fontWeight: 600,
                                            backgroundColor: `${statusColor[o.status]}20`,
                                            color: statusColor[o.status],
                                        }}>
                                            {statusLabel[o.status] ?? o.status}
                                        </span>
                                    </td>
                                    <td style={{ ...td(), color: '#96a0b8', fontSize: '12px' }}>
                                        {new Date(o.createdAt).toLocaleDateString('ja-JP')}
                                    </td>
                                    <td style={td()}>
                                        <button onClick={() => toggleExpand(o.id)} style={btnStyle('#f4f6fb', '#5a6480')}>
                                            {isExpanded ? '▲ 閉じる' : '▼ 出荷'}
                                        </button>
                                    </td>
                                </tr>

                                {isExpanded && (
                                    <tr>
                                        <td colSpan={7} style={{ backgroundColor: '#f8f9fd', padding: '16px 24px' }}>
                                            {/* 商品明細 */}
                                            <div style={{ marginBottom: '16px' }}>
                                                <div style={sectionLabel}>商品明細</div>
                                                <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                                                    <thead>
                                                        <tr style={{ color: '#5a6480' }}>
                                                            <th style={subTh()}>商品</th>
                                                            <th style={subTh()}>数量</th>
                                                            <th style={subTh()}>単価</th>
                                                            <th style={subTh()}>小計</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {o.quote.items.map((item, i) => (
                                                            <tr key={i}>
                                                                <td style={subTd()}>{item.productName}</td>
                                                                <td style={subTd()}>{item.quantity}</td>
                                                                <td style={subTd()}>¥{item.unitPrice.toLocaleString()}</td>
                                                                <td style={subTd()}>¥{(item.quantity * item.unitPrice).toLocaleString()}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* 出荷伝票一覧 */}
                                            <div style={{ marginBottom: '12px' }}>
                                                <div style={sectionLabel}>出荷伝票</div>
                                                {(shipments[o.id] ?? []).length === 0 ? (
                                                    <div style={{ color: '#96a0b8', fontSize: '12px', padding: '8px 0' }}>出荷伝票がありません</div>
                                                ) : (
                                                    <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                                                        <thead>
                                                            <tr style={{ color: '#5a6480' }}>
                                                                <th style={subTh()}>運送会社</th>
                                                                <th style={subTh()}>追跡番号</th>
                                                                <th style={subTh()}>ステータス</th>
                                                                <th style={subTh()}>出荷日時</th>
                                                                <th style={subTh()}></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {(shipments[o.id] ?? []).map(s => (
                                                                <tr key={s.id}>
                                                                    <td style={subTd()}>{s.carrier}</td>
                                                                    <td style={subTd()}>{s.trackingNumber || '—'}</td>
                                                                    <td style={subTd()}>
                                                                        <span style={{
                                                                            padding: '2px 8px', borderRadius: '10px', fontSize: '11px',
                                                                            fontWeight: 600,
                                                                            backgroundColor: s.status === 'SHIPPED' ? '#2a9d6e20' : '#e08c2a20',
                                                                            color: s.status === 'SHIPPED' ? '#2a9d6e' : '#e08c2a',
                                                                        }}>
                                                                            {s.status === 'SHIPPED' ? '出荷済み' : '準備中'}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ ...subTd(), color: '#96a0b8', fontSize: '12px' }}>
                                                                        {s.shippedAt ? new Date(s.shippedAt).toLocaleDateString('ja-JP') : '—'}
                                                                    </td>
                                                                    <td style={subTd()}>
                                                                        {s.status === 'PREPARING' && (
                                                                            <button
                                                                                onClick={() => handleConfirmShipment(s.id, o.id)}
                                                                                style={btnStyle('#4a78c4', '#fff')}
                                                                            >
                                                                                出荷確定
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                )}
                                            </div>

                                            {/* 出荷伝票作成フォーム */}
                                            {o.status === 'PENDING' && (
                                                showShipForm === o.id ? (
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <label style={formLabel}>運送会社</label>
                                                            <select value={carrier} onChange={e => setCarrier(e.target.value)} style={inputStyle}>
                                                                {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                                                            </select>
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <label style={formLabel}>追跡番号</label>
                                                            <input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)}
                                                                placeholder="任意" style={inputStyle} />
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <label style={formLabel}>備考</label>
                                                            <input value={shipNote} onChange={e => setShipNote(e.target.value)}
                                                                placeholder="任意" style={inputStyle} />
                                                        </div>
                                                        <button onClick={() => handleCreateShipment(o.id)} style={btnStyle('#4a78c4', '#fff')}>
                                                            出荷伝票を作成
                                                        </button>
                                                        <button onClick={() => setShowShipForm(null)} style={btnStyle('#f4f6fb', '#5a6480')}>
                                                            キャンセル
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setShowShipForm(o.id)} style={btnStyle('#f0f5ff', '#4a78c4')}>
                                                        ＋ 出荷伝票を作成
                                                    </button>
                                                )
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
    );
}

// --- スタイル ---
const td = (): React.CSSProperties => ({ padding: '10px 12px', color: '#2c3554' });
const subTh = (): React.CSSProperties => ({ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#5a6480' });
const subTd = (): React.CSSProperties => ({ padding: '6px 10px', color: '#2c3554' });
const sectionLabel: React.CSSProperties = { fontSize: '12px', fontWeight: 700, color: '#5a6480', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' };
const formLabel: React.CSSProperties = { fontSize: '12px', color: '#5a6480', fontWeight: 600 };
const inputStyle: React.CSSProperties = { padding: '7px 10px', borderRadius: '6px', border: '1px solid #dde3f0', fontSize: '13px' };
const btnStyle = (bg: string, color: string): React.CSSProperties => ({
    padding: '7px 14px', borderRadius: '6px', border: 'none',
    backgroundColor: bg, color, fontSize: '13px', fontWeight: 600, cursor: 'pointer',
});