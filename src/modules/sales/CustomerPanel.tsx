import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../AuthContext';

const API = import.meta.env.VITE_API_URL ?? '';

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  contactPerson: string;
  note: string;
  parent: { id: number; name: string } | null;
  active: boolean;  // 新增
}
const empty = (): Omit<Customer, 'id'> => ({
  name: '', email: '', phone: '', address: '',
  contactPerson: '', note: '', parent: null,
  active: true,  // 新增
});

export default function CustomerPanel() {
  const { can } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [form, setForm] = useState(empty());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deactivateTarget, setDeactivateTarget] = useState<Customer | null>(null);
  const [deactivateInput, setDeactivateInput] = useState('');
  const fetchCustomers = async () => {
    const res = await axios.get(`${API}/api/customers`);
    setCustomers(res.data);
  };

  useEffect(() => { fetchCustomers(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm(empty());
    setError('');
    setShowForm(true);
  };

  const openEdit = (c: Customer) => {
    setEditTarget(c);
    setForm({
      name: c.name, email: c.email ?? '', phone: c.phone ?? '',
      address: c.address ?? '', contactPerson: c.contactPerson ?? '',
      note: c.note ?? '', parent: c.parent, active: true,
    });
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('客戶名稱為必填'); return; }
    setLoading(true);
    try {
      const payload = {
        ...form,
        // parent 只傳 id 給後端
        parent: form.parent ? { id: form.parent.id } : null,
      };
      if (editTarget) {
        await axios.put(`${API}/api/customers/${editTarget.id}`, payload);
      } else {
        await axios.post(`${API}/api/customers`, payload);
      }
      setShowForm(false);
      fetchCustomers();
    } catch (e: any) {
      setError(e.response?.data?.message ?? '儲存失敗');
    } finally {
      setLoading(false);
    }
  };
  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    if (deactivateInput !== deactivateTarget.name) {
      setError('客戶名稱輸入不正確');
      return;
    }
    try {
      await axios.patch(`${API}/api/customers/${deactivateTarget.id}/deactivate`);
      setDeactivateTarget(null);
      setDeactivateInput('');
      fetchCustomers();
    } catch {
      setError('停用失敗');
    }
  };
  const handleActivate = async (c: Customer) => {
    if (!window.confirm(`確定要啟用「${c.name}」？`)) return;
    try {
      await axios.patch(`${API}/api/customers/${c.id}/status`, { isActive: true });
      fetchCustomers();
    } catch {
      setError('啟用失敗');
    }
  };
  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
      {/* 標題列 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#2c3554', margin: 0 }}>客戶管理</h2>
        {can('view_customers') && (
          <button onClick={openCreate} style={btnStyle('#4a78c4', '#fff')}>
            ＋ 新增客戶
          </button>
        )}
      </div>

      {/* 客戶列表 */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f6fb', color: '#5a6480' }}>
            {['客戶名稱', '聯絡人', '電話', 'Email', '地址', '上層客戶', ''].map(h => (
              <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {customers.map(c => (
            <tr key={c.id} style={{ borderBottom: '1px solid #eef0f6', backgroundColor: c.active ? undefined : '#f9f9f9', opacity: c.active ? 1 : 0.6 }}>
              <td style={td()}>{c.name}</td>
              <td style={td()}>{c.contactPerson || '—'}</td>
              <td style={td()}>{c.phone || '—'}</td>
              <td style={td()}>{c.email || '—'}</td>
              <td style={td()}>{c.address || '—'}</td>
              <td style={td()}>{c.parent?.name || '—'}</td>
              <td style={td()}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {can('view_customers') && (
                    <button onClick={() => openEdit(c)} style={btnStyle('#f0f5ff', '#4a78c4')}>
                      編輯
                    </button>
                  )}
                  {can('deactivate_customer') && (
                    <button onClick={() => {
                      if (c.active) {
                        setDeactivateTarget(c); setDeactivateInput(''); setError('');
                      } else {
                        handleActivate(c);
                      }
                    }} style={btnStyle(c.active ? '#fff0f0' : '#f0f5ff', c.active ? '#e05c5c' : '#4a78c4')}>
                      {c.active ? '停用' : '啟用'}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 新增/編輯 Modal */}
      {showForm && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ margin: '0 0 20px', fontSize: '16px', color: '#2c3554' }}>
              {editTarget ? '編輯客戶' : '新增客戶'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Field label="客戶名稱 *">
                <input style={inputStyle} value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </Field>
              <Field label="聯絡人">
                <input style={inputStyle} value={form.contactPerson}
                  onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} />
              </Field>
              <Field label="電話">
                <input style={inputStyle} value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </Field>
              <Field label="Email">
                <input style={inputStyle} value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </Field>
              <Field label="地址">
                <input style={inputStyle} value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </Field>
              <Field label="上層客戶">
                <select style={inputStyle}
                  value={form.parent?.id ?? ''}
                  onChange={e => {
                    const id = Number(e.target.value);
                    const found = customers.find(c => c.id === id) ?? null;
                    setForm(f => ({ ...f, parent: found ? { id: found.id, name: found.name } : null }));
                  }}>
                  <option value="">無</option>
                  {customers
                    .filter(c => c.id !== editTarget?.id) // 自己不能是自己的上層
                    .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="備註">
                <textarea style={{ ...inputStyle, height: '72px', resize: 'vertical' }}
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
              </Field>
            </div>

            {error && <div style={{ color: '#e05c5c', fontSize: '12px', marginTop: '8px' }}>{error}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setShowForm(false)} style={btnStyle('#f4f6fb', '#5a6480')}>取消</button>
              <button onClick={handleSave} disabled={loading} style={btnStyle('#4a78c4', '#fff')}>
                {loading ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>

      )}
      {/* 停用確認 Modal */}
      {deactivateTarget && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, width: '400px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#2c3554' }}>停用客戶</h3>
            <p style={{ fontSize: '13px', color: '#5a6480', marginBottom: '16px' }}>
              停用後此客戶將從列表中隱藏。<br />
              請輸入客戶名稱 <strong style={{ color: '#2c3554' }}>{deactivateTarget.name}</strong> 以確認。
            </p>
            <input
              style={inputStyle}
              placeholder="輸入客戶名稱"
              value={deactivateInput}
              onChange={e => { setDeactivateInput(e.target.value); setError(''); }}
            />
            {error && <div style={{ color: '#e05c5c', fontSize: '12px', marginTop: '8px' }}>{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setDeactivateTarget(null)} style={btnStyle('#f4f6fb', '#5a6480')}>取消</button>
              <button onClick={handleDeactivate} style={btnStyle('#e05c5c', '#fff')}>確認停用</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- 小元件 & 樣式 ---
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '12px', color: '#5a6480', fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: '6px',
  border: '1px solid #dde3f0', fontSize: '13px', outline: 'none', width: '100%',
  boxSizing: 'border-box',
};

const td = (): React.CSSProperties => ({ padding: '10px 12px', color: '#2c3554' });

const btnStyle = (bg: string, color: string): React.CSSProperties => ({
  padding: '7px 16px', borderRadius: '6px', border: 'none',
  backgroundColor: bg, color, fontSize: '13px', fontWeight: 600, cursor: 'pointer',
});

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff', borderRadius: '12px', padding: '28px',
  width: '480px', maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
};