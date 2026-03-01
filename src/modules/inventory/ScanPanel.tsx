import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BrowserMultiFormatReader } from '@zxing/browser';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

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

function ScanPanel() {
    const [barcode, setBarcode] = useState('');
    const [foundItem, setFoundItem] = useState<InventoryItem | null>(null);
    const [quantity, setQuantity] = useState('');
    const [transactionType, setTransactionType] = useState<'in' | 'out'>('in');
    const [message, setMessage] = useState('');
    const [carrier, setCarrier] = useState('');

    // 相機掃碼相關
    const [scanning, setScanning] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const readerRef = useRef<BrowserMultiFormatReader | null>(null);
    const hasScannedRef = useRef(false); // 鎖：掃到一次後不再觸發

    // 關閉相機
    const stopScan = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        readerRef.current = null;
        setScanning(false);
    };

    // 開啟相機掃碼
    const startScan = async () => {
        hasScannedRef.current = false; // 重置鎖
        setScanning(true);
        setMessage('');

        setTimeout(async () => {
            if (!videoRef.current) return;

            const reader = new BrowserMultiFormatReader();
            readerRef.current = reader;

            try {
                await reader.decodeFromVideoDevice(
                    undefined,
                    videoRef.current,
                    (result, err) => {
                        // 已經掃過一次就不再處理
                        if (hasScannedRef.current) return;

                        if (result) {
                            hasScannedRef.current = true; // 上鎖
                            const scannedBarcode = result.getText();
                            setBarcode(scannedBarcode);
                            stopScan();
                            searchByBarcode(scannedBarcode);
                        }
                    }
                );
            } catch (e) {
                setMessage('無法開啟相機，請確認瀏覽器權限');
                setScanning(false);
            }
        }, 100);
    };

    // 離開頁面時清理
    useEffect(() => {
        return () => {
            stopScan();
        };
    }, []);

    // 抽出查詢邏輯（手動輸入 + 相機掃碼共用）
    const searchByBarcode = async (code: string) => {
        if (!code.trim()) return;
        try {
            const res = await axios.get(`${API_URL}/api/inventory/items/barcode/${code}`);
            setFoundItem(res.data);
            setMessage('');
        } catch {
            setFoundItem(null);
            setMessage('找不到此條碼的商品');
        }
    };

    const handleSearch = () => searchByBarcode(barcode);

    return (
        <div style={{ padding: '32px', maxWidth: '480px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '24px' }}>掃碼入出庫</h2>

            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#5a6480' }}>
                    條碼
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        style={{ flex: 1, padding: '10px 12px', borderRadius: '7px', border: '1px solid #d0d7e8', fontSize: '14px' }}
                        value={barcode}
                        onChange={e => setBarcode(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        placeholder="輸入或掃描條碼"
                        autoFocus
                    />
                    <button
                        onClick={handleSearch}
                        style={{ padding: '10px 16px', backgroundColor: '#4a78c4', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer' }}
                    >
                        查詢
                    </button>
                </div>
            </div>

            {!scanning ? (
                <button
                    onClick={startScan}
                    style={{
                        width: '100%', padding: '10px', marginBottom: '16px',
                        backgroundColor: '#fff', color: '#4a78c4',
                        border: '2px solid #4a78c4', borderRadius: '7px',
                        cursor: 'pointer', fontSize: '14px', fontWeight: 600
                    }}
                >
                    📷 開啟相機掃碼
                </button>
            ) : (
                <div style={{ marginBottom: '16px' }}>
                    <video
                        ref={videoRef}
                        style={{ width: '100%', borderRadius: '8px', backgroundColor: '#000' }}
                    />
                    <button
                        onClick={stopScan}
                        style={{
                            width: '100%', padding: '10px', marginTop: '8px',
                            backgroundColor: '#fff', color: '#e74c3c',
                            border: '2px solid #e74c3c', borderRadius: '7px',
                            cursor: 'pointer', fontSize: '14px'
                        }}
                    >
                        取消掃碼
                    </button>
                </div>
            )}

            {foundItem && (
                <div style={{ backgroundColor: '#f0f4ff', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{foundItem.product.name}</div>
                    <div style={{ fontSize: '12px', color: '#5a6480' }}>單位：{foundItem.unit}</div>
                </div>
            )}

            {message && (
                <div style={{
                    color: message.includes('成功') ? '#27ae60' : '#e74c3c',
                    fontSize: '13px', marginBottom: '16px'
                }}>
                    {message}
                </div>
            )}

            {foundItem && (
                <>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        <button
                            onClick={() => setTransactionType('in')}
                            style={{ flex: 1, padding: '10px', borderRadius: '7px', border: `2px solid ${transactionType === 'in' ? '#2ecc71' : '#d0d7e8'}`, backgroundColor: transactionType === 'in' ? '#eafaf1' : '#fff', cursor: 'pointer', fontWeight: 600 }}
                        >
                            入庫
                        </button>
                        <button
                            onClick={() => setTransactionType('out')}
                            style={{ flex: 1, padding: '10px', borderRadius: '7px', border: `2px solid ${transactionType === 'out' ? '#e74c3c' : '#d0d7e8'}`, backgroundColor: transactionType === 'out' ? '#fdf0f0' : '#fff', cursor: 'pointer', fontWeight: 600 }}
                        >
                            出庫
                        </button>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#5a6480' }}>數量</label>
                        <input
                            type="number"
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '7px', border: '1px solid #d0d7e8', fontSize: '14px' }}
                            value={quantity}
                            onChange={e => setQuantity(e.target.value)}
                            placeholder="輸入數量"
                        />
                    </div>

                    {transactionType === 'in' && (
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#5a6480' }}>運送公司</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {['ヤマト運輸', '佐川急便', '福山通運'].map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setCarrier(c)}
                                        style={{
                                            flex: 1, padding: '8px', borderRadius: '7px',
                                            border: `2px solid ${carrier === c ? '#4a78c4' : '#d0d7e8'}`,
                                            backgroundColor: carrier === c ? '#eef2fb' : '#fff',
                                            cursor: 'pointer', fontSize: '12px', fontWeight: carrier === c ? 600 : 400
                                        }}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        style={{ width: '100%', padding: '12px', backgroundColor: '#4a78c4', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                        onClick={async () => {
                            if (!foundItem || !quantity) return;
                            try {
                                await axios.post(`${API_URL}/api/inventory/transactions`, {
                                    itemId: foundItem.id,
                                    transactionType: transactionType === 'in' ? 'IN' : 'OUT',
                                    quantity: parseInt(quantity),
                                    operatedBy: '倉庫人員',
                                    note: transactionType === 'in' ? carrier : null,
                                });
                                setMessage(transactionType === 'in' ? '入庫成功' : '出庫成功');
                                setFoundItem(null);
                                setBarcode('');
                                setQuantity('');
                                setCarrier('');
                            } catch (err: any) {
                                setMessage(err.response?.data || '操作失敗');
                            }
                        }}
                    >
                        確認{transactionType === 'in' ? '入庫' : '出庫'}
                    </button>
                </>
            )}
        </div>
    );
}

export default ScanPanel;