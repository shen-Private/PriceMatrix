import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BrowserMultiFormatReader } from '@zxing/browser';
import shared from '../../styles/shared.module.css';
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

// リストの1件
interface ScanEntry {
    item: InventoryItem;
    quantity: number;
}

type ScanMode = 'scan' | 'batch';

function ScanPanel() {
    const [panelMode, setPanelMode] = useState<ScanMode>('scan');

    // ===== スキャン状態 =====
    const [barcode, setBarcode] = useState('');
    const [message, setMessage] = useState('');
    const [scanning, setScanning] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const readerRef = useRef<BrowserMultiFormatReader | null>(null);
    const hasScannedRef = useRef(false);
    const controlsRef = useRef<any>(null);

    // ===== 入庫リスト =====
    const [entries, setEntries] = useState<ScanEntry[]>([]);
    const [carrier, setCarrier] = useState('');
    const [operator, setOperator] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ===== 仮登録フォーム =====
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [quickAddBarcode, setQuickAddBarcode] = useState('');
    const [quickAddName, setQuickAddName] = useState('');
    const [quickAddManufacturerId, setQuickAddManufacturerId] = useState<number | null>(null);
    const [manufacturers, setManufacturers] = useState<{ id: number; name: string }[]>([]);

    // ===== カメラ操作 =====
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
                setMessage('カメラを起動できません。ブラウザの権限を確認してください');
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
    // ===== バーコード検索 → リストに追加 =====
    const searchByBarcode = async (code: string) => {
        if (!code.trim()) return;
        try {
            const res = await axios.get(`${API_URL}/api/inventory/items/barcode/${code}`);
            const foundItem: InventoryItem = res.data;
            setMessage('');
            setBarcode('');

            // 同一商品がリストにある → 数量 +1
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

    // リスト数量調整
    const updateQuantity = (itemId: number, val: string) => {
        const n = parseInt(val, 10);
        if (isNaN(n) || n < 1) return;
        setEntries(prev => prev.map(e =>
            e.item.id === itemId ? { ...e, quantity: n } : e
        ));
    };

    // リストから削除
    const removeEntry = (itemId: number) => {
        setEntries(prev => prev.filter(e => e.item.id !== itemId));
    };

    // ===== 送信（batch API 呼び出し）=====
    const handleSubmit = async () => {
        if (!operator.trim()) { setMessage('担当者名を入力してください'); return; }
        if (entries.length === 0) { setMessage('リストが空です'); return; }
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
            setMessage('✓ 入庫完了');
            setEntries([]);
            setCarrier('');
        } catch (err: any) {
            setMessage(err.response?.data || '送信に失敗しました');
        } finally {
            setIsSubmitting(false);
        }
    };
    const handleQuickAdd = async () => {
        if (!quickAddName.trim()) { setMessage('商品名を入力してください'); return; }
        try {
            // Step 1：pending product を作成
            const params = new URLSearchParams({ name: quickAddName });
            if (quickAddManufacturerId) params.append('manufacturerId', String(quickAddManufacturerId));
            const productRes = await axios.post(`${API_URL}/api/products/pending?${params}`);
            const productId = productRes.data.id;

            // Step 2：inventory_item を作成（barcode 付き）
            const itemParams = new URLSearchParams({
                productId: String(productId),
                barcode: quickAddBarcode
            });
            await axios.post(`${API_URL}/api/inventory/items/pending?${itemParams}`);

            setMessage('✓ 仮登録しました。CS確認後に本登録されます');
            setShowQuickAdd(false);
            setBarcode('');
        } catch {
            setMessage('登録に失敗しました');
        }
    };
    // ===== 共通スタイル =====
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
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>バーコードスキャン入庫</h2>
                <button
                    onClick={() => setPanelMode(panelMode === 'scan' ? 'batch' : 'scan')}
                    style={{
                        padding: '6px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                        border: `2px solid ${panelMode === 'batch' ? '#2980b9' : '#d0d7e8'}`,
                        backgroundColor: panelMode === 'batch' ? '#eaf3fb' : '#fff',
                        color: panelMode === 'batch' ? '#2980b9' : '#5a6480',
                    }}
                >
                    📦 一括入庫
                </button>
            </div>

            {/* ===== 一括入庫モード（プレースホルダー）===== */}
            {panelMode === 'batch' && (
                <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: '#f0f3f8', borderRadius: '10px', color: '#96a0b8', fontSize: '13px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>🚧</div>
                    今後追加予定の機能です！
                </div>
            )}

            {/* ===== スキャン入庫モード ===== */}
            {panelMode === 'scan' && (
                <>
                    {/* バーコード入力 */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={s.label}>バーコード</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                style={{ ...s.input, flex: 1 }}
                                value={barcode}
                                onChange={e => setBarcode(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                placeholder="バーコードを入力またはスキャン"
                            />
                            {barcode && (
                                <button
                                    onClick={() => { setBarcode(''); setMessage(''); }}
                                    style={{ padding: '10px 12px', backgroundColor: '#fff', color: '#999', border: '1px solid #d0d7e8', borderRadius: '7px', cursor: 'pointer' }}
                                >✕</button>
                            )}
                            <button onClick={handleSearch} style={s.btnPrimary}>検索</button>
                        </div>
                    </div>

                    {/* カメラ */}
                    {!scanning ? (
                        <button
                            onClick={startScan}
                            style={{ width: '100%', padding: '10px', marginBottom: '16px', backgroundColor: '#fff', color: '#4a78c4', border: '2px solid #4a78c4', borderRadius: '7px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
                        >
                            📷 カメラでスキャン
                        </button>
                    ) : (
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ position: 'relative', width: '100%', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#000' }}>
                                <video ref={videoRef} style={{ width: '100%', display: 'block' }} />
                                <div style={{ position: 'absolute', top: '50%', left: '10%', right: '10%', height: '2px', backgroundColor: '#e74c3c', boxShadow: '0 0 6px rgba(231,76,60,0.8)', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                            </div>
                            <button onClick={stopScan} style={{ width: '100%', padding: '10px', marginTop: '8px', backgroundColor: '#fff', color: '#e74c3c', border: '2px solid #e74c3c', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' }}>
                                キャンセル
                            </button>
                        </div>
                    )}

                    {/* メッセージ */}
                    {message && (
                        <div style={{ color: message.startsWith('✓') ? '#27ae60' : '#e74c3c', fontSize: '13px', marginBottom: '12px' }}>
                            {message}
                        </div>
                    )}
                    {/* 仮登録フォーム */}
                    {showQuickAdd && (
                        <div style={{ backgroundColor: '#fffbea', border: '1px solid #f0c040', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: '#7a5c00' }}>
                                ⚠ このバーコードは未登録です。仮登録しますか？
                            </div>
                            <div style={{ fontSize: '11px', color: '#96a0b8', marginBottom: '8px' }}>バーコード：{quickAddBarcode}</div>
                            <div style={{ marginBottom: '10px' }}>
                                <label style={s.label}>商品名</label>
                                <input style={s.input} value={quickAddName} onChange={e => setQuickAddName(e.target.value)} placeholder="外箱を確認して入力" />
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={s.label}>メーカー</label>
                                <select style={{ ...s.input }} value={quickAddManufacturerId ?? ''} onChange={e => setQuickAddManufacturerId(e.target.value ? Number(e.target.value) : null)}>
                                    <option value="">不明</option>
                                    {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => setShowQuickAdd(false)} style={{ ...s.btnOutline(false), flex: 1 }}>キャンセル</button>
                                <button onClick={handleQuickAdd} style={{ ...s.btnPrimary, flex: 1 }}>仮登録する</button>
                            </div>
                        </div>
                    )}
                    {/* ===== 入庫リスト ===== */}
                    {entries.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '12px', color: '#5a6480', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                入庫リスト（{entries.length} 件）
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

                    {/* 運送会社・担当者・送信（リストに内容がある場合のみ表示）*/}
                    {entries.length > 0 && (
                        <>
                            {/* 運送会社 */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={s.label}>運送会社</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {['ヤマト運輸', '佐川急便', '福山通運'].map(c => (
                                        <button key={c} onClick={() => setCarrier(carrier === c ? '' : c)} style={s.btnOutline(carrier === c)}>
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 担当者 */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={s.label}>担当者</label>
                                <input
                                    style={s.input}
                                    placeholder="氏名"
                                    value={operator}
                                    onChange={e => setOperator(e.target.value)}
                                />
                            </div>

                            {/* 送信 */}
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                style={{ ...s.btnPrimary, width: '100%', padding: '12px', fontSize: '14px', opacity: isSubmitting ? 0.7 : 1 }}
                            >
                                {isSubmitting ? '送信中…' : `入庫を確定する（${entries.length} 件）`}
                            </button>
                        </>
                    )}
                </>
            )}
        </div>
    );
}

export default ScanPanel;