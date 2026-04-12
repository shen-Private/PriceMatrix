import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

type StockType = 'internal' | 'outsource_infinite' | 'outsource_warehouse' | 'outsource_dropship';

const stockTypeLabels: Record<StockType, string> = {
    internal: '自社在庫',
    outsource_infinite: '外注常備',
    outsource_warehouse: '外注倉庫',
    outsource_dropship: '外注直送',
};

interface Category { id: number; name: string; }
interface Manufacturer { id: number; name: string; }

const defaultForm = {
    productName: '',
    basePrice: '',
    categoryId: '',
    manufacturerId: '',
    stockType: 'internal' as StockType,
    barcode: '',
    unit: '',
    safetyStock: '',
};

function ProductMasterPanel() {
    const [form, setForm] = useState(defaultForm);
    const [categories, setCategories] = useState<Category[]>([]);
    const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [pendingProducts, setPendingProducts] = useState<any[]>([]);
    const [confirmingId, setConfirmingId] = useState<number | null>(null);
    const [editingPending, setEditingPending] = useState<number | null>(null);
    const [pendingForm, setPendingForm] = useState({
        name: '',
        basePrice: '',
        categoryId: '',
        stockType: 'internal' as StockType,
        unit: '',
        safetyStock: '',
    });
    useEffect(() => {
        axios.get(`${API_URL}/api/categories`).then(r => setCategories(r.data)).catch(() => { });
        axios.get(`${API_URL}/api/manufacturers`).then(r => setManufacturers(r.data)).catch(() => { });
        axios.get(`${API_URL}/api/products/pending`).then(r => setPendingProducts(r.data)).catch(() => { });
    }, []);
    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 2500);
    };

    const handleSubmit = async () => {
        if (!form.productName || !form.basePrice || !form.categoryId || !form.unit) {
            showToast('必須項目を入力してください', 'error');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_URL}/api/inventory/items`, {
                productName: form.productName,
                basePrice: parseFloat(form.basePrice),
                categoryId: parseInt(form.categoryId),
                manufacturerId: form.manufacturerId ? parseInt(form.manufacturerId) : null,
                stockType: form.stockType,
                barcode: form.barcode || null,
                unit: form.unit,
                safetyStock: form.safetyStock ? parseInt(form.safetyStock) : null,
            });
            showToast('商品を追加しました', 'success');
            setForm(defaultForm);
        } catch {
            showToast('追加に失敗しました', 'error');
        } finally {
            setLoading(false);
        }
    };
    const handleConfirm = async (id: number) => {
        if (!pendingForm.basePrice || !pendingForm.categoryId || !pendingForm.unit) {
            showToast('必須項目を入力してください', 'error');
            return;
        }
        setConfirmingId(id);
        try {
            // 1. pricing_products を更新
            await axios.put(`${API_URL}/api/products/${id}`, {
                name: pendingForm.name,
                basePrice: parseFloat(pendingForm.basePrice),
                categoryId: parseInt(pendingForm.categoryId),
            });
            // 2. inventory_item を作成
            await axios.post(`${API_URL}/api/inventory/items`, {
                productName: pendingForm.name,
                basePrice: parseFloat(pendingForm.basePrice),
                categoryId: parseInt(pendingForm.categoryId),
                manufacturerId: pendingProducts.find(p => p.id === id)?.manufacturer?.id ?? null,
                stockType: pendingForm.stockType,
                unit: pendingForm.unit,
                safetyStock: pendingForm.safetyStock ? parseInt(pendingForm.safetyStock) : null,
            });
            // 3. confirm status
            await axios.put(`${API_URL}/api/products/${id}/confirm`);
            setPendingProducts(prev => prev.filter(p => p.id !== id));
            setEditingPending(null);
            showToast('商品を確認・登録しました', 'success');
        } catch {
            showToast('確認に失敗しました', 'error');
        } finally {
            setConfirmingId(null);
        }
    };
    const field = (label: string, required: boolean, children: React.ReactNode) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: '#5a6480' }}>
                {label}{required && <span style={{ color: '#e05c5c' }}> *</span>}
            </label>
            {children}
        </div>
    );

    const inputStyle = {
        padding: '10px 14px', borderRadius: '8px',
        border: '1px solid #dde3f0', fontSize: '14px', outline: 'none',
    };

    return (
        <div style={{ maxWidth: '560px', margin: '40px auto', padding: '0 24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#2c3554', marginBottom: '24px' }}>
                商品マスタ管理
            </h2>
            {pendingProducts.length > 0 && (
                <div style={{ backgroundColor: '#fffbea', border: '1px solid #f0c040', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#7a5c00', marginBottom: '12px' }}>
                        ⚠ 確認待ち商品（{pendingProducts.length} 件）
                    </div>
                    {pendingProducts.map(p => (
                        <div key={p.id} style={{ padding: '10px 0', borderBottom: '1px solid #f0e090' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{p.name}</div>
                                    <div style={{ fontSize: '11px', color: '#96a0b8', marginTop: '2px' }}>
                                        {p.manufacturer?.name ?? 'メーカー未設定'}
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setEditingPending(editingPending === p.id ? null : p.id);
                                        setPendingForm({ name: p.name, basePrice: '', categoryId: '', stockType: 'internal', unit: '', safetyStock: '' });
                                    }}
                                    style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #4a78c4', backgroundColor: '#fff', color: '#4a78c4', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    {editingPending === p.id ? '閉じる' : '情報を入力'}
                                </button>
                            </div>

                            {editingPending === p.id && (
                                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {field('商品名', true,
                                        <input style={inputStyle} value={pendingForm.name}
                                            onChange={e => setPendingForm(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="商品名" />
                                    )}
                                    {field('定価', true,
                                        <input style={inputStyle} type="number" value={pendingForm.basePrice}
                                            onChange={e => setPendingForm(prev => ({ ...prev, basePrice: e.target.value }))}
                                            placeholder="例：1200" />
                                    )}
                                    {field('カテゴリ', true,
                                        <select style={inputStyle} value={pendingForm.categoryId}
                                            onChange={e => setPendingForm(prev => ({ ...prev, categoryId: e.target.value }))}>
                                            <option value="">カテゴリを選択</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    )}
                                    {field('在庫形態', true,
                                        <select style={inputStyle} value={pendingForm.stockType}
                                            onChange={e => setPendingForm(prev => ({ ...prev, stockType: e.target.value as StockType }))}>
                                            {Object.entries(stockTypeLabels).map(([v, l]) =>
                                                <option key={v} value={v}>{l}</option>
                                            )}
                                        </select>
                                    )}
                                    {field('単位', true,
                                        <input style={inputStyle} value={pendingForm.unit}
                                            onChange={e => setPendingForm(prev => ({ ...prev, unit: e.target.value }))}
                                            placeholder="例：個 / 箱" />
                                    )}
                                    {field('安全在庫', false,
                                        <input style={inputStyle} type="number" value={pendingForm.safetyStock}
                                            onChange={e => setPendingForm(prev => ({ ...prev, safetyStock: e.target.value }))}
                                            placeholder="任意" />
                                    )}
                                    <button
                                        onClick={() => handleConfirm(p.id)}
                                        disabled={confirmingId === p.id}
                                        style={{ padding: '10px', borderRadius: '6px', border: 'none', backgroundColor: '#4a78c4', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: confirmingId === p.id ? 0.7 : 1 }}
                                    >
                                        {confirmingId === p.id ? '確認中...' : '確認・登録する'}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <div style={{
                backgroundColor: '#fff', borderRadius: '12px', padding: '28px',
                boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                display: 'flex', flexDirection: 'column', gap: '18px',
            }}>

                {field('商品名', true,
                    <input style={inputStyle} value={form.productName}
                        onChange={e => setForm(p => ({ ...p, productName: e.target.value }))}
                        placeholder="例：Canon PG-245" />
                )}

                {field('定価', true,
                    <input style={inputStyle} type="number" value={form.basePrice}
                        onChange={e => setForm(p => ({ ...p, basePrice: e.target.value }))}
                        placeholder="例：1200" />
                )}

                {field('カテゴリ', true,
                    <select style={inputStyle} value={form.categoryId}
                        onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}>
                        <option value="">カテゴリを選択</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                )}

                {field('メーカー', false,
                    <select style={inputStyle} value={form.manufacturerId}
                        onChange={e => setForm(p => ({ ...p, manufacturerId: e.target.value }))}>
                        <option value="">メーカーを選択（任意）</option>
                        {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                )}

                {field('在庫形態', true,
                    <select style={inputStyle} value={form.stockType}
                        onChange={e => setForm(p => ({ ...p, stockType: e.target.value as StockType }))}>
                        {Object.entries(stockTypeLabels).map(([v, l]) =>
                            <option key={v} value={v}>{l}</option>
                        )}
                    </select>
                )}

                {field('バーコード', false,
                    <input style={inputStyle} value={form.barcode}
                        onChange={e => setForm(p => ({ ...p, barcode: e.target.value }))}
                        placeholder="任意" />
                )}

                {field('単位', true,
                    <input style={inputStyle} value={form.unit}
                        onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                        placeholder="例：個 / 箱 / 本" />
                )}

                {field('安全在庫', false,
                    <input style={inputStyle} type="number" value={form.safetyStock}
                        onChange={e => setForm(p => ({ ...p, safetyStock: e.target.value }))}
                        placeholder="任意" />
                )}

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{
                        marginTop: '8px', padding: '12px', borderRadius: '8px', border: 'none',
                        backgroundColor: '#4a78c4', color: '#fff', fontSize: '14px',
                        fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                    }}
                >
                    {loading ? '追加中...' : '商品を追加'}
                </button>
            </div>

            {toast && (
                <div style={{
                    position: 'fixed', bottom: '24px', right: '24px',
                    backgroundColor: toast.type === 'success' ? '#4caf82' : '#e05c5c',
                    color: '#fff', padding: '12px 20px', borderRadius: '8px',
                    fontSize: '13px', fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}>
                    {toast.message}
                </div>
            )}
        </div>
    );
}

export default ProductMasterPanel;