import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BrowserMultiFormatReader } from '@zxing/browser';

const API_URL = import.meta.env.VITE_API_URL ?? '';
axios.defaults.withCredentials = true;

interface Product {
    id: number;
    name: string;
}

interface InventoryItem {
    id: number;
    product: Product;
    stockType: string;
    unit: string;
    barcode: string | null;
}

// 清單裡的一筆
interface ScanEntry {
    item: InventoryItem;
    quantity: number;
}

type ScanMode = 'scan' | 'batch';

function ScanPanel() {
    const [panelMode, setPanelMode] = useState<ScanMode>('scan');

    // ===== 掃碼狀態 =====
    const [barcode, setBarcode] = useState('');
    const [message, setMessage] = useState('');
    const [scanning, setScanning] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const readerRef = useRef<BrowserMultiFormatReader | null>(null);
    const hasScannedRef = useRef(false);
    const controlsRef = useRef<any>(null);

    // ===== 累積清單 =====
    const [entries, setEntries] = useState<ScanEntry[]>([]);
    const [carrier, setCarrier] = useState('');
    const [operator, setOperator] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ===== 簡易建檔表單 =====
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [quickAddBarcode, setQuickAddBarcode] = useState('');
    const [quickAddName, setQuickAddName] = useState('');
    const [quickAddManufacturerId, setQuickAddManufacturerId] = useState<number | null>(null);
    const [manufacturers, setManufacturers] = useState<{ id: number; name: string }[]>([]);

    // ===== 相機操作 =====
    const stopScan = () => {
        if (controlsRef.current) {
            controlsRef.current.stop();
            controlsRef.current = null;
        }
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        readerRef.current = null;
        setScanning(false);
    };

    const startScan = async () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        readerRef.current = null;
        hasScannedRef.current = false;
        setScanning(true);
        setMessage('');

        setTimeout(async () => {
            if (!videoRef.current) return;
            const reader = new BrowserMultiFormatReader();
            readerRef.current = reader;
            try {
                const controls = await reader.decodeFromVideoDevice(
                    undefined,
                    videoRef.current,
                    (result) => {
                        if (hasScannedRef.current) return;
                        if (result) {
                            hasScannedRef.current = true;
                            const scannedBarcode = result.getText();
                            setBarcode(scannedBarcode);
                            stopScan();
                            searchByBarcode(scannedBarcode);
                        }
                    }
                );
                controlsRef.current = controls;
            } catch (e) {
                setMessage('無法開啟相機，請確認瀏覽器權限');
                setScanning(false);
            }
        }, 100);
    };

    useEffect(() => {
        return () => { stopScan(); };
    }, []);
    useEffect(() => {
        axios.get(`${API_URL}/api/manufacturers`).then(r => setManufacturers(r.data));
    }, []);
    // ===== 條碼查詢 → 加入清單 =====
    const searchByBarcode = async (code: string) => {
        if (!code.trim()) return;
        try {
            const res = await axios.get(`${API_URL}/api/inventory/items/barcode/${code}`);
            const foundItem: InventoryItem = res.data;
            setMessage('');
            setBarcode('');

            // 同一商品已在清單 → 數量 +1
            setEntries(prev => {
                const existing = prev.find(e => e.item.id === foundItem.id);
                if (existing) {
                    return prev.map(e =>
                        e.item.id === foundItem.id
                            ? { ...e, quantity: e.quantity + 1 }
                            : e
                    );
                }
                return [...prev, { item: foundItem, quantity: 1 }];
            });
        } catch {
            setQuickAddBarcode(code);
            setQuickAddName('');
            setQuickAddManufacturerId(null);
            setShowQuickAdd(true);
            setMessage('');
        }
    };

    const handleSearch = () => {
        searchByBarcode(barcode);
    };

    // 清單數量調整
    const updateQuantity = (itemId: number, val: string) => {
        const n = parseInt(val, 10);
        if (isNaN(n) || n < 1) return;
        setEntries(prev => prev.map(e =>
            e.item.id === itemId ? { ...e, quantity: n } : e
        ));
    };

    // 清單移除
    const removeEntry = (itemId: number) => {
        setEntries(prev => prev.filter(e => e.item.id !== itemId));
    };

    // ===== 送出（呼叫 batch API）=====
    const handleSubmit = async () => {
        if (!operator.trim()) { setMessage('請輸入操作者姓名'); return; }
        if (entries.length === 0) { setMessage('清單是空的'); return; }
        setIsSubmitting(true);
        try {
            await axios.post(`${API_URL}/api/inventory/transactions/batch`, {
                operatedBy: operator,
                items: entries.map(e => ({
                    itemId: e.item.id,
                    quantity: e.quantity,
                    note: carrier || null,
                })),
            });
            setMessage('✓ 入庫完成');
            setEntries([]);
            setCarrier('');
        } catch (err: any) {
            setMessage(err.response?.data || '送出失敗');
        } finally {
            setIsSubmitting(false);
        }
    };
    const handleQuickAdd = async () => {
        if (!quickAddName.trim()) { setMessage('請輸入商品名稱'); return; }
        try {
            const params = new URLSearchParams({ name: quickAddName });
            if (quickAddManufacturerId) params.append('manufacturerId', String(quickAddManufacturerId));
            await axios.post(`${API_URL}/api/products/pending?${params}`);
            setMessage('✓ 已暫時建檔，待CS確認');
            setShowQuickAdd(false);
            setBarcode('');
        } catch {
            setMessage('建檔失敗');
        }
    };
    // ===== 共用樣式 =====
    const s = {
        wrap: { padding: '24px', maxWidth: '520px', margin: '0 auto', fontFamily: "'IBM Plex Sans JP', 'Noto Sans TC', sans-serif", fontSize: '14px', color: '#1e2740' } as React.CSSProperties,
        label: { display: 'block', marginBottom: '6px', fontSize: '12px', color: '#5a6480', fontWeight: 500 } as React.CSSProperties,
        input: { width: '100%', padding: '10px 12px', borderRadius: '7px', border: '1px solid #d0d7e8', fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' } as React.CSSProperties,
        btnPrimary: { padding: '10px 16px', backgroundColor: '#4a78c4', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 } as React.CSSProperties,
        btnOutline: (active: boolean, color = '#4a78c4') => ({ flex: 1, padding: '10px', borderRadius: '7px', border: `2px solid ${active ? color : '#d0d7e8'}`, backgroundColor: active ? color + '18' : '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: active ? 600 : 400, color: active ? color : '#5a6480' }) as React.CSSProperties,
    };

    return (
        <div style={s.wrap}>

            {/* ===== ヘッダー ===== */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>掃碼入庫</h2>
                <button
                    onClick={() => setPanelMode(panelMode === 'scan' ? 'batch' : 'scan')}
                    style={{
                        padding: '6px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                        border: `2px solid ${panelMode === 'batch' ? '#2980b9' : '#d0d7e8'}`,
                        backgroundColor: panelMode === 'batch' ? '#eaf3fb' : '#fff',
                        color: panelMode === 'batch' ? '#2980b9' : '#5a6480',
                    }}
                >
                    📦 批次入庫
                </button>
            </div>

            {/* ===== 批次入庫モード（佔位） ===== */}
            {panelMode === 'batch' && (
                <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: '#f0f3f8', borderRadius: '10px', color: '#96a0b8', fontSize: '13px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>🚧</div>
                    視情況增加新功能！
                </div>
            )}

            {/* ===== 掃碼入庫モード ===== */}
            {panelMode === 'scan' && (
                <>
                    {/* 條碼輸入 */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={s.label}>條碼</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                style={{ ...s.input, flex: 1 }}
                                value={barcode}
                                onChange={e => setBarcode(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                placeholder="輸入或掃描條碼"
                            />
                            {barcode && (
                                <button
                                    onClick={() => { setBarcode(''); setMessage(''); }}
                                    style={{ padding: '10px 12px', backgroundColor: '#fff', color: '#999', border: '1px solid #d0d7e8', borderRadius: '7px', cursor: 'pointer' }}
                                >✕</button>
                            )}
                            <button onClick={handleSearch} style={s.btnPrimary}>查詢</button>
                        </div>
                    </div>

                    {/* 相機 */}
                    {!scanning ? (
                        <button
                            onClick={startScan}
                            style={{ width: '100%', padding: '10px', marginBottom: '16px', backgroundColor: '#fff', color: '#4a78c4', border: '2px solid #4a78c4', borderRadius: '7px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
                        >
                            📷 開啟相機掃碼
                        </button>
                    ) : (
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ position: 'relative', width: '100%', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#000' }}>
                                <video ref={videoRef} style={{ width: '100%', display: 'block' }} />
                                <div style={{ position: 'absolute', top: '50%', left: '10%', right: '10%', height: '2px', backgroundColor: '#e74c3c', boxShadow: '0 0 6px rgba(231,76,60,0.8)', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                            </div>
                            <button onClick={stopScan} style={{ width: '100%', padding: '10px', marginTop: '8px', backgroundColor: '#fff', color: '#e74c3c', border: '2px solid #e74c3c', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' }}>
                                取消掃碼
                            </button>
                        </div>
                    )}

                    {/* 訊息 */}
                    {message && (
                        <div style={{ color: message.startsWith('✓') ? '#27ae60' : '#e74c3c', fontSize: '13px', marginBottom: '12px' }}>
                            {message}
                        </div>
                    )}
                    {/* 簡易建檔表單 */}
                    {showQuickAdd && (
                        <div style={{ backgroundColor: '#fffbea', border: '1px solid #f0c040', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: '#7a5c00' }}>
                                ⚠ 找不到此條碼，是否暫時建檔？
                            </div>
                            <div style={{ fontSize: '11px', color: '#96a0b8', marginBottom: '8px' }}>條碼：{quickAddBarcode}</div>
                            <div style={{ marginBottom: '10px' }}>
                                <label style={s.label}>商品名稱</label>
                                <input style={s.input} value={quickAddName} onChange={e => setQuickAddName(e.target.value)} placeholder="從外箱確認後輸入" />
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={s.label}>廠商</label>
                                <select style={{ ...s.input }} value={quickAddManufacturerId ?? ''} onChange={e => setQuickAddManufacturerId(e.target.value ? Number(e.target.value) : null)}>
                                    <option value="">不確定</option>
                                    {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => setShowQuickAdd(false)} style={{ ...s.btnOutline(false), flex: 1 }}>取消</button>
                                <button onClick={handleQuickAdd} style={{ ...s.btnPrimary, flex: 1 }}>暫時建檔</button>
                            </div>
                        </div>
                    )}
                    {/* ===== 累積清單 ===== */}
                    {entries.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '12px', color: '#5a6480', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                入庫清單（{entries.length} 筆）
                            </div>
                            <div style={{ backgroundColor: '#fff', border: '1px solid #d0d7e8', borderRadius: '8px', overflow: 'hidden' }}>
                                {entries.map((entry, idx) => (
                                    <div
                                        key={entry.item.id}
                                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: idx < entries.length - 1 ? '1px solid #e8ecf4' : 'none' }}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 500, fontSize: '13px' }}>{entry.item.product.name}</div>
                                            <div style={{ fontSize: '11px', color: '#96a0b8', marginTop: '2px' }}>{entry.item.unit}</div>
                                        </div>
                                        <input
                                            type="number"
                                            min="1"
                                            value={entry.quantity}
                                            onChange={e => updateQuantity(entry.item.id, e.target.value)}
                                            style={{ width: '60px', padding: '5px 8px', border: '1px solid #d0d7e8', borderRadius: '6px', fontSize: '13px', textAlign: 'center', fontFamily: 'monospace' }}
                                        />
                                        <span style={{ fontSize: '12px', color: '#96a0b8' }}>{entry.item.unit}</span>
                                        <button
                                            onClick={() => removeEntry(entry.item.id)}
                                            style={{ width: '28px', height: '28px', border: '1px solid #d0d7e8', borderRadius: '6px', backgroundColor: 'transparent', color: '#c0392b', cursor: 'pointer', fontSize: '12px' }}
                                        >✕</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 運送公司・操作者・送出（清單有內容時才顯示）*/}
                    {entries.length > 0 && (
                        <>
                            {/* 運送公司 */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={s.label}>運送公司</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {['ヤマト運輸', '佐川急便', '福山通運'].map(c => (
                                        <button key={c} onClick={() => setCarrier(carrier === c ? '' : c)} style={s.btnOutline(carrier === c)}>
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 操作者 */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={s.label}>操作者</label>
                                <input
                                    style={s.input}
                                    placeholder="姓名"
                                    value={operator}
                                    onChange={e => setOperator(e.target.value)}
                                />
                            </div>

                            {/* 送出 */}
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                style={{ ...s.btnPrimary, width: '100%', padding: '12px', fontSize: '14px', opacity: isSubmitting ? 0.7 : 1 }}
                            >
                                {isSubmitting ? '送出中…' : `確認入庫（${entries.length} 筆）`}
                            </button>
                        </>
                    )}
                </>
            )}
        </div>
    );
}

export default ScanPanel;