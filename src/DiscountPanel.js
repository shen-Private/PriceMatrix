import { useState, useEffect } from 'react';
import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

// DiscountPanel = 折扣查詢面板
// 佈局：左右分割
// 左側：搜尋輸入 + 分類篩選
// 右側：折扣清單表格

function DiscountPanel() {

    // === 左側狀態 ===
    const [searchText, setSearchText] = useState('');       // 搜尋框文字
    const [categories, setCategories] = useState([]);       // 分類列表（從後端拿）
    const [selectedCategory, setSelectedCategory] = useState(''); // 選中的分類

    // === 右側狀態 ===
    const [discounts, setDiscounts] = useState([]);         // 折扣清單
    const [editingId, setEditingId] = useState(null);        // 正在編輯的折扣ID
    const [editingValue, setEditingValue] = useState('');    // 輸入框的值
    const [savingId, setSavingId] = useState(null); // 正在儲存中的折扣ID
    const [currentCustomerId, setCurrentCustomerId] = useState(null);    // 控制新增表單的顯示/隱藏
    const [showAddForm, setShowAddForm] = useState(false);    // 新增表單的輸入值
    const [toast, setToast] = useState(null); // { message: '...', type: 'success' | 'error' }
    const [isLoading, setIsLoading] = useState(false);
    const [newDiscount, setNewDiscount] = useState({
        productName: '',
        categoryId: '',
        discountRatio: ''
    });
    // Toast 提示：顯示後 2 秒自動消失
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 2000);
    };
    // === 啟動時：載入分類列表 ===
    useEffect(() => {
        axios.get(API_URL + '/api/categories')
            .then(response => {
                setCategories(response.data);
            })
            .catch(error => {
                console.error('分類載入失敗：', error);
            });
    }, []);
    const handleSearch = async () => {
        if (!searchText.trim()) return;

        setIsLoading(true);

        try {
            const customerRes = await axios.get(`${API_URL}/api/customers/search?name=${searchText}`);
            const customers = customerRes.data;

            if (customers.length === 0) {
                setDiscounts(null);
                return;
            }

            const customerId = customers[0].id;
            setCurrentCustomerId(customerId);

            const categoryParam = selectedCategory ? `&categoryId=${selectedCategory}` : '';
            const discountRes = await axios.get(`${API_URL}/api/discounts/customer/${customerId}?${categoryParam}`);
            setDiscounts(discountRes.data);

        } catch (error) {
            console.error('搜尋失敗：', error);
        } finally {
            setIsLoading(false);
        }
    };
    // 刪除折扣記錄
    const handleDelete = async (id) => {
        if (!window.confirm('確定要刪除這筆折扣嗎？')) return;

        try {
            await axios.delete(`${API_URL}/api/discounts/${id}`);
            setDiscounts(discounts.filter(d => d.id !== id));
            showToast('刪除成功');
        } catch (error) {
            showToast('刪除失敗', 'error');
        }
    };
    // 送出新增請求
    const handleCreate = async () => {
        // 組合要送給後端的資料
        try {
            const payload = {
                customer: { id: currentCustomerId },
                product: { name: newDiscount.productName, category: { id: newDiscount.categoryId } },
                discountRatio: parseFloat(newDiscount.discountRatio) / 100
            };
            const response = await axios.post(API_URL + '/api/categories', payload);
            setDiscounts([...discounts, response.data]);// 把新記錄加到畫面上
            // 關閉表單，清空輸入
            setShowAddForm(false);
            setNewDiscount({ productName: '', categoryId: '', discountRatio: '' });
            showToast('新增成功');
        } catch (error) {
            showToast('新增失敗', 'error');
        }
    };

    // === 儲存修改後的折扣率 ===
    const handleSave = async (discountId) => {
        const newRatio = editingValue / 100;

        setSavingId(discountId); // 開始儲存，記住是哪一筆
        setEditingId(null); // ← 加這行，立刻切回顯示模式
        // 模擬延遲（測試用）
        await new Promise(resolve => setTimeout(resolve, 500));
        axios.put(`${API_URL}/api/discounts/${discountId}`, {
            discountRatio: newRatio
        })
            .then(() => {
                setDiscounts(discounts.map(d =>
                    d.id === discountId
                        ? { ...d, discountRatio: newRatio }
                        : d
                ));
                setEditingId(null);
                setSavingId(null); // 儲存完成，清除
            })
            .catch(error => {
                console.error('儲存失敗：', error);
                showToast('儲存失敗', 'error');
                setSavingId(null);
            });
    };

    return (
        // 最外層：左右分割容器
        <div style={{ display: 'flex', gap: '24px', padding: '24px' }}>

            {/* ====== 左側面板 ====== */}
            <div style={{ width: '280px', flexShrink: 0 }}>
                <h3>搜尋條件</h3>

                {/* 客戶搜尋框 */}
                <div style={{ marginBottom: '16px' }}>
                    <label>客戶名稱</label>
                    <br />
                    <input
                        type="text"
                        placeholder="輸入客戶名稱..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        style={{ width: '100%', padding: '6px', marginTop: '4px' }}
                    />
                </div>

                {/* 分類篩選下拉 */}
                <div style={{ marginBottom: '16px' }}>
                    <label>商品分類</label>
                    <br />
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        style={{ width: '100%', padding: '6px', marginTop: '4px' }}
                    >
                        <option value="">全部分類</option>
                        {categories.map(category => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* 搜尋按鈕 */}
                <button
                    onClick={handleSearch}
                    disabled={isLoading}
                    style={{ width: '100%', padding: '8px', opacity: isLoading ? 0.6 : 1 }}
                >
                    {isLoading ? '搜尋中...' : '搜尋'}
                </button>
            </div>

            {/* ====== 右側面板 ====== */}
            <div style={{ flex: 1 }}>
                <h3>折扣清單</h3>

                {/* 折扣表格 */}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f0f0f0' }}>
                            <th style={thStyle}>商品名稱</th>
                            <th style={thStyle}>分類</th>
                            <th style={thStyle}>折扣率</th>
                            <th style={thStyle}>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {discounts === null ? (
                            // 找不到客戶
                            <tr>
                                <td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: '#e53e3e' }}>
                                    找不到客戶，請確認名稱是否正確
                                </td>
                            </tr>
                        ) : discounts.length === 0 ? (
                            // 還沒搜尋
                            <tr>
                                <td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: '#999' }}>
                                    請輸入客戶名稱後點擊搜尋
                                </td>
                            </tr>
                        ) : (
                            // 有資料
                            discounts.map(discount => (
                                <tr key={discount.id}>
                                    <td style={tdStyle}>{discount.product.name}</td>
                                    <td style={tdStyle}>{discount.product.category.name}</td>
                                    <td style={tdStyle}>
                                        {editingId === discount.id ? (
                                            // 編輯模式：顯示輸入框
                                            <input
                                                type="number"
                                                value={editingValue}
                                                onChange={(e) => setEditingValue(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSave(discount.id)}
                                                onBlur={() => setEditingId(null)}  // 點別處取消編輯
                                                autoFocus
                                                style={{ width: '60px', padding: '2px 4px' }}
                                            />
                                        ) : (
                                            // 顯示模式：點擊進入編輯
                                            <span
                                                onClick={() => {
                                                    setEditingId(discount.id);
                                                    setEditingValue(Math.round(discount.discountRatio * 100));
                                                }}
                                                style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                title="點擊編輯"
                                            >
                                                {savingId === discount.id ? '儲存中...' : `${Math.round(discount.discountRatio * 100)}折`}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <button onClick={() => handleDelete(discount.id)}>
                                            刪除
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                {/* 新增按鈕 */}
                {!showAddForm && (
                    <button onClick={() => setShowAddForm(true)}>
                        + 新增
                    </button>
                )}

                {/* 新增表單 */}
                {showAddForm && (
                    <div style={{ marginTop: '12px', padding: '12px', border: '1px solid #ddd' }}>
                        <div>
                            <label>商品名稱：</label>
                            <input
                                value={newDiscount.productName}
                                onChange={e => setNewDiscount({ ...newDiscount, productName: e.target.value })}
                            />
                        </div>
                        <div style={{ marginTop: '8px' }}>
                            <label>分類：</label>
                            <select
                                value={newDiscount.categoryId}
                                onChange={e => setNewDiscount({ ...newDiscount, categoryId: e.target.value })}
                            >
                                <option value="">請選擇分類</option>
                                {/* categories 是已有的分類清單 */}
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ marginTop: '8px' }}>
                            <label>折扣率：</label>
                            <input
                                value={newDiscount.discountRatio}
                                onChange={e => setNewDiscount({ ...newDiscount, discountRatio: e.target.value })}
                                placeholder="例：80（代表八折）"
                            />
                        </div>
                        <div style={{ marginTop: '12px' }}>
                            <button onClick={handleCreate}>確認新增</button>
                            <button onClick={() => setShowAddForm(false)} style={{ marginLeft: '8px' }}>取消</button>
                        </div>
                    </div>
                )}
            </div>
            {/* Toast 提示框 */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    padding: '12px 20px',
                    borderRadius: '6px',
                    backgroundColor: toast.type === 'error' ? '#e53e3e' : '#38a169',
                    color: 'white',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    zIndex: 9999
                }}>
                    {toast.message}
                </div>
            )}
        </div>
    );
}

// 表格樣式（抽出來避免重複）
const thStyle = {
    padding: '8px 12px',
    textAlign: 'left',
    borderBottom: '2px solid #ddd'
};

const tdStyle = {
    padding: '8px 12px',
    borderBottom: '1px solid #eee'
};

export default DiscountPanel;