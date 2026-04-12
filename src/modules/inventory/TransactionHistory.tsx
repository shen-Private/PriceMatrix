import { useState } from 'react';
import axios from 'axios';
import shared from '../../styles/shared.module.css';
const API_URL = import.meta.env.VITE_API_URL ?? '';

interface Transaction {
    id: number;
    item: { id: number; product: { name: string }; unit: string };
    transactionType: 'IN' | 'OUT';
    quantity: number;
    quantityBefore: number;
    quantityAfter: number;
    operatedBy: string;
    operatedAt: string;
    note: string | null;
}

function TransactionHistory() {
    const [itemId, setItemId] = useState('');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [message, setMessage] = useState('');

    const handleSearch = async () => {
        if (!itemId.trim()) return;
        try {
            const res = await axios.get(`${API_URL}/api/inventory/transactions/item/${itemId}`);
            setTransactions(res.data);
            setMessage(res.data.length === 0 ? '記録が見つかりません' : '');
        } catch {
            setMessage('検索に失敗しました');
            setTransactions([]);
        }
    };

    return (
        <div style={{ padding: '32px', maxWidth: '640px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '24px' }}>入出庫履歴</h2>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                <input
                    style={{ flex: 1, padding: '10px 12px', borderRadius: '7px', border: '1px solid #d0d7e8', fontSize: '14px' }}
                    value={itemId}
                    onChange={e => setItemId(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="商品 ID を入力"
                />
                <button
                    onClick={handleSearch}
                    style={{ padding: '10px 16px', backgroundColor: '#4a78c4', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer' }}
                >
                    検索
                </button>
            </div>

            {message && (
                <div style={{ color: '#e74c3c', fontSize: '13px', marginBottom: '16px' }}>{message}</div>
            )}

            {transactions.length > 0 && (
                <div>
                    <div style={{ fontSize: '13px', color: '#5a6480', marginBottom: '12px' }}>
                        {transactions[0].item.product.name}　全 {transactions.length} 件
                    </div>
                    {transactions.map(tx => (
                        <div key={tx.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '12px 16px', marginBottom: '8px',
                            borderRadius: '8px', backgroundColor: tx.transactionType === 'IN' ? '#eafaf1' : '#fdf0f0',
                            border: `1px solid ${tx.transactionType === 'IN' ? '#a9dfbf' : '#f5b7b1'}`
                        }}>
                            <div>
                                <span style={{ fontWeight: 600, color: tx.transactionType === 'IN' ? '#27ae60' : '#e74c3c' }}>
                                    {tx.transactionType === 'IN' ? '入庫' : '出庫'}
                                </span>
                                <span style={{ marginLeft: '12px', fontSize: '14px' }}>
                                    {tx.quantity} {tx.item.unit}
                                </span>
                                {tx.note && (
                                    <span style={{ marginLeft: '8px', fontSize: '12px', color: '#5a6480' }}>
                                        {tx.note}
                                    </span>
                                )}
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '12px', color: '#5a6480' }}>
                                <div>{tx.quantityBefore} → {tx.quantityAfter}</div>
                                <div>{new Date(tx.operatedAt).toLocaleString('ja-JP')}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default TransactionHistory;