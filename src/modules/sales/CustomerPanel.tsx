import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../AuthContext';
import React from 'react';
import { useSearchParams } from 'react-router-dom';
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
  active: boolean;
  prospectId: number | null;
  assignedTo: string | null;
}
interface User {
  id: number;
  username: string;
  role: string;
  isActive: boolean;
}
interface ContactLog {
  id: number;
  customerId: number;
  type: string;
  contactedAt: string;
  result: string;
  note: string;
  nextAction: string;
  createdBy: string;
}

interface ContactLogForm {
  type: string;
  contactedAt: string;
  result: string;
  note: string;
  nextAction: string;
}

const emptyLog = (): ContactLogForm => ({
  type: 'PHONE',
  contactedAt: new Date().toISOString().slice(0, 16),
  result: 'PENDING',
  note: '',
  nextAction: '',
});
const empty = (): Omit<Customer, 'id'> => ({
  name: '', email: '', phone: '', address: '',
  contactPerson: '', note: '', parent: null,
  active: true,
  prospectId: null,
  assignedTo: '',
});

export default function CustomerPanel() {
  const { can } = useAuth();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [form, setForm] = useState(empty());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deactivateTarget, setDeactivateTarget] = useState<Customer | null>(null);
  const [deactivateInput, setDeactivateInput] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [contactLogs, setContactLogs] = useState<Record<number, ContactLog[]>>({});
  const [logForm, setLogForm] = useState<ContactLogForm>(emptyLog());
  const [logLoading, setLogLoading] = useState(false);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [salesUsers, setSalesUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'timeline' | 'quotes' | 'orders' | 'logs' | 'prospect'>('timeline');
  const fetchCustomers = async () => {
    const res = await axios.get(`${API}/api/customers`);
    setCustomers(res.data);
  };
  const filteredCustomers = customers.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.contactPerson?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  });
  useEffect(() => { fetchCustomers(); }, []);
  const fetchContactLogs = async (customerId: number) => {
    const res = await axios.get(`${API}/api/contact-logs/customer/${customerId}`);
    setContactLogs(prev => ({ ...prev, [customerId]: res.data }));
  };
  useEffect(() => {
    fetchCustomers();
    axios.get(`${API}/api/quotes`).then(res => setQuotes(res.data));
    axios.get(`${API}/api/orders`).then(res => setOrders(res.data));
    axios.get(`${API}/api/admin/users`).then(res => {
      setSalesUsers(res.data.filter((u: User) =>
        (u.role === 'sales' || u.role === 'admin') && u.isActive
      ));
    });
  }, []);
  const toggleExpand = (customerId: number) => {
    if (expandedId === customerId) {
      setExpandedId(null);
    } else {
      setExpandedId(customerId);
      fetchContactLogs(customerId);
      setLogForm(emptyLog());
    }
  };

  const handleAddLog = async (customerId: number) => {
    setLogLoading(true);
    try {
      await axios.post(`${API}/api/contact-logs`, {
        ...logForm,
        customerId,
        contactedAt: new Date(logForm.contactedAt).toISOString().slice(0, 19),
      });
      fetchContactLogs(customerId);
      setLogForm(emptyLog());
    } catch {
      setError('追加に失敗しました');
    } finally {
      setLogLoading(false);
    }
  };
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
      prospectId: c.prospectId, assignedTo: c.assignedTo ?? '',
    });
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('顧客名は必須です'); return; }
    setLoading(true);
    try {
      const payload = {
        ...form,
        // parent は id のみバックエンドへ送信
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
      setError(e.response?.data?.message ?? '保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    if (deactivateInput !== deactivateTarget.name) {
      setError('顧客名が正しくありません');
      return;
    }
    try {
      await axios.patch(`${API}/api/customers/${deactivateTarget.id}/deactivate`);
      setDeactivateTarget(null);
      setDeactivateInput('');
      fetchCustomers();
    } catch {
      setError('無効化に失敗しました');
    }
  };
  const handleActivate = async (c: Customer) => {
    if (!window.confirm(`「${c.name}」を有効化しますか？`)) return;
    try {
      await axios.patch(`${API}/api/customers/${c.id}/status`, { isActive: true });
      fetchCustomers();
    } catch {
      setError('有効化に失敗しました');
    }
  };
  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
      {/* タイトル行 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#2c3554', margin: 0 }}>顧客管理</h2>
        {can('view_customers') && (
          <button onClick={openCreate} style={btnStyle('#4a78c4', '#fff')}>
            ＋ 顧客を追加
          </button>
        )}
      </div>
      <input
        type="text"
        placeholder="顧客名・担当者・メール・電話番号で検索..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #dde3f0', fontSize: '13px', width: '280px' }}
      />
      {/* 顧客一覧 */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f6fb', color: '#5a6480' }}>
            {['顧客名', '担当者', '電話', 'Email', '住所', '所属グループ', ''].map(h => (
              <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredCustomers.map(c => (
            <React.Fragment key={c.id}>
              <tr
                style={{ borderBottom: '1px solid #eef0f6', backgroundColor: c.active ? undefined : '#f9f9f9', opacity: c.active ? 1 : 0.6, cursor: 'pointer' }}
                onClick={() => toggleExpand(c.id)}
              >
                <td style={td()}>{c.name}</td>
                <td style={td()}>{c.contactPerson || '—'}</td>
                <td style={td()}>{c.phone || '—'}</td>
                <td style={td()}>{c.email || '—'}</td>
                <td style={td()}>{c.address || '—'}</td>
                <td style={td()}>{c.parent?.name || '—'}</td>
                <td style={td()} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {can('view_customers') && (
                      <button onClick={() => openEdit(c)} style={btnStyle('#f0f5ff', '#4a78c4')}>編集</button>
                    )}
                    {can('deactivate_customer') && (
                      <button onClick={() => {
                        if (c.active) {
                          setDeactivateTarget(c); setDeactivateInput(''); setError('');
                        } else {
                          handleActivate(c);
                        }
                      }} style={btnStyle(c.active ? '#fff0f0' : '#f0f5ff', c.active ? '#e05c5c' : '#4a78c4')}>
                        {c.active ? '無効化' : '有効化'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>

              {/* 展開行：タイムライン＋追加フォーム */}
              {expandedId === c.id && (
                <tr>
                  <td colSpan={7} style={{ backgroundColor: '#f8faff', padding: '16px 24px', borderBottom: '2px solid #dde3f0' }}>
                    <div style={{ display: 'flex', gap: '32px' }}>

                      {/* 左側：タイムライン */}
                      <div style={{ flex: 1 }}>
                        {/* タブ切替 */}
                        {(() => {
                          const customerQuotes = quotes.filter(q => q.customer?.id === c.id);
                          const customerOrders = orders.filter(o => o.customer?.id === c.id);
                          const customerLogs = contactLogs[c.id] ?? [];
                          const timelineItems = [
                            ...customerQuotes.map(q => ({ type: 'quote' as const, date: q.createdAt, data: q })),
                            ...customerOrders.map(o => ({ type: 'order' as const, date: o.createdAt, data: o })),
                            ...customerLogs.map(l => ({ type: 'log' as const, date: l.contactedAt, data: l })),
                          ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                          return (
                            <>
                              <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                                {([
                                  ['timeline', 'タイムライン'],
                                  ['quotes', '見積書'],
                                  ['orders', '受注'],
                                  ['logs', 'コンタクト履歴'],
                                  ...(c.prospectId ? [['prospect', '開発履歴']] : []),
                                ] as ['timeline' | 'quotes' | 'orders' | 'logs' | 'prospect', string][]).map(([key, label]) => (
                                  <button key={key} onClick={() => setActiveTab(key)}
                                    style={{
                                      padding: '5px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                                      backgroundColor: activeTab === key ? '#4a78c4' : '#f4f6fb',
                                      color: activeTab === key ? '#fff' : '#5a6480'
                                    }}>
                                    {label}
                                  </button>
                                ))}
                              </div>

                              {activeTab === 'timeline' && (
                                <div>
                                  {timelineItems.length === 0 ? (
                                    <div style={{ fontSize: '12px', color: '#96a0b8' }}>記録がありません</div>
                                  ) : timelineItems.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '12px', marginBottom: '10px', fontSize: '12px' }}>
                                      <span style={{ color: '#96a0b8', whiteSpace: 'nowrap', paddingTop: '2px' }}>
                                        {new Date(item.date).toLocaleDateString('ja-JP')}
                                      </span>
                                      {item.type === 'quote' && <>
                                        <span style={tagStyle('#e8f0fe')}>見積</span>
                                        <span style={{ color: '#4a78c4', fontWeight: 600 }}>Q#{item.data.id}</span>
                                        <span style={tagStyle(statusColor(item.data.status))}>{statusLabel(item.data.status)}</span>
                                        <span style={{ color: '#5a6480' }}>¥{item.data.items?.reduce((s: number, i: any) => s + i.quantity * i.unitPrice, 0).toLocaleString()}</span>
                                      </>}
                                      {item.type === 'order' && <>
                                        <span style={tagStyle('#e6f4ea')}>受注</span>
                                        <span style={{ color: '#4a78c4', fontWeight: 600 }}>#{item.data.id}</span>
                                        <span style={tagStyle(orderStatusColor(item.data.status))}>{orderStatusLabel(item.data.status)}</span>
                                      </>}
                                      {item.type === 'log' && <>
                                        <span style={tagStyle(typeColor(item.data.type))}>{typeLabel(item.data.type)}</span>
                                        <span style={tagStyle(resultColor(item.data.result))}>{resultLabel(item.data.result)}</span>
                                        <span style={{ color: '#2c3554' }}>{item.data.note}</span>
                                      </>}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {activeTab === 'quotes' && (
                                <div>
                                  {customerQuotes.length === 0 ? (
                                    <div style={{ fontSize: '12px', color: '#96a0b8' }}>見積書がありません</div>
                                  ) : customerQuotes.map(q => (
                                    <div key={q.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '6px', fontSize: '12px' }}>
                                      <span style={{ color: '#96a0b8' }}>{new Date(q.createdAt).toLocaleDateString('ja-JP')}</span>
                                      <span style={{ color: '#4a78c4', fontWeight: 600 }}>Q#{q.id}</span>
                                      <span style={tagStyle(statusColor(q.status))}>{statusLabel(q.status)}</span>
                                      <span style={{ color: '#5a6480' }}>¥{q.items?.reduce((s: number, i: any) => s + i.quantity * i.unitPrice, 0).toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {activeTab === 'orders' && (
                                <div>
                                  {customerOrders.length === 0 ? (
                                    <div style={{ fontSize: '12px', color: '#96a0b8' }}>受注がありません</div>
                                  ) : customerOrders.map(o => (
                                    <div key={o.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '6px', fontSize: '12px' }}>
                                      <span style={{ color: '#96a0b8' }}>{new Date(o.createdAt).toLocaleDateString('ja-JP')}</span>
                                      <span style={{ color: '#4a78c4', fontWeight: 600 }}>#{o.id}</span>
                                      <span style={tagStyle(orderStatusColor(o.status))}>{orderStatusLabel(o.status)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {activeTab === 'logs' && (
                                <div>
                                  {customerLogs.length === 0 ? (
                                    <div style={{ fontSize: '12px', color: '#96a0b8' }}>記録がありません</div>
                                  ) : customerLogs.map(log => (
                                    <div key={log.id} style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                      <div style={{ fontSize: '11px', color: '#96a0b8', whiteSpace: 'nowrap', paddingTop: '2px' }}>
                                        {new Date(log.contactedAt).toLocaleDateString('ja-JP')}
                                      </div>
                                      <div>
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '2px' }}>
                                          <span style={tagStyle(typeColor(log.type))}>{typeLabel(log.type)}</span>
                                          <span style={tagStyle(resultColor(log.result))}>{resultLabel(log.result)}</span>
                                          <span style={{ fontSize: '11px', color: '#96a0b8' }}>{log.createdBy}</span>
                                        </div>
                                        {log.note && <div style={{ fontSize: '12px', color: '#2c3554' }}>{log.note}</div>}
                                        {log.nextAction && <div style={{ fontSize: '11px', color: '#7a85a0', marginTop: '2px' }}>→ {log.nextAction}</div>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {activeTab === 'prospect' && (
                                <ProspectHistory prospectId={c.prospectId!} />
                              )}
                            </>
                          );
                        })()}
                      </div>

                      {/* 右側：追加フォーム */}
                      <div style={{ width: '280px', borderLeft: '1px solid #dde3f0', paddingLeft: '24px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#2c3554', marginBottom: '12px' }}>記録を追加</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <Field label="コンタクト方法">
                            <select style={inputStyle} value={logForm.type}
                              onChange={e => setLogForm(f => ({ ...f, type: e.target.value }))}>
                              <option value="VISIT">訪問</option>
                              <option value="PHONE">電話</option>
                              <option value="EMAIL">メール</option>
                              <option value="QUOTE">見積</option>
                              <option value="OTHER">その他</option>
                            </select>
                          </Field>
                          <Field label="日時">
                            <input style={inputStyle} type="datetime-local" value={logForm.contactedAt}
                              onChange={e => setLogForm(f => ({ ...f, contactedAt: e.target.value }))} />
                          </Field>
                          <Field label="結果">
                            <select style={inputStyle} value={logForm.result}
                              onChange={e => setLogForm(f => ({ ...f, result: e.target.value }))}>
                              <option value="PENDING">フォロー待ち</option>
                              <option value="OK">ポジティブ</option>
                              <option value="NO">ネガティブ</option>
                            </select>
                          </Field>
                          <Field label="内容">
                            <textarea style={{ ...inputStyle, height: '60px', resize: 'vertical' }}
                              value={logForm.note}
                              onChange={e => setLogForm(f => ({ ...f, note: e.target.value }))} />
                          </Field>
                          <Field label="次のアクション">
                            <input style={inputStyle} value={logForm.nextAction}
                              onChange={e => setLogForm(f => ({ ...f, nextAction: e.target.value }))} />
                          </Field>
                          <button
                            onClick={() => handleAddLog(c.id)}
                            disabled={logLoading}
                            style={{ ...btnStyle('#4a78c4', '#fff'), marginTop: '4px' }}>
                            {logLoading ? '保存中...' : '追加'}
                          </button>
                        </div>
                      </div>

                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {/* 新規作成／編集モーダル */}
      {showForm && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ margin: '0 0 20px', fontSize: '16px', color: '#2c3554' }}>
              {editTarget ? '顧客を編集' : '顧客を追加'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Field label="顧客名 *">
                <input style={inputStyle} value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </Field>
              <Field label="担当者">
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
              <Field label="住所">
                <input style={inputStyle} value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </Field>
              <Field label="所属グループ">
                <select style={inputStyle}
                  value={form.parent?.id ?? ''}
                  onChange={e => {
                    const id = Number(e.target.value);
                    const found = customers.find(c => c.id === id) ?? null;
                    setForm(f => ({ ...f, parent: found ? { id: found.id, name: found.name } : null }));
                  }}>
                  <option value="">なし</option>
                  {customers
                    .filter(c => c.id !== editTarget?.id) // 自分自身は親に設定不可
                    .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="担当営業">
                <select style={inputStyle} value={form.assignedTo ?? ''}
                  onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}>
                  <option value="">未割当</option>
                  {salesUsers.map(u => (
                    <option key={u.id} value={u.username}>{u.username}</option>
                  ))}
                </select>
              </Field>
              <Field label="備考">
                <textarea style={{ ...inputStyle, height: '72px', resize: 'vertical' }}
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
              </Field>
            </div>

            {error && <div style={{ color: '#e05c5c', fontSize: '12px', marginTop: '8px' }}>{error}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setShowForm(false)} style={btnStyle('#f4f6fb', '#5a6480')}>キャンセル</button>
              <button onClick={handleSave} disabled={loading} style={btnStyle('#4a78c4', '#fff')}>
                {loading ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>

      )}
      {/* 無効化確認モーダル */}
      {deactivateTarget && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, width: '400px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#2c3554' }}>顧客を無効化</h3>
            <p style={{ fontSize: '13px', color: '#5a6480', marginBottom: '16px' }}>
              無効化するとこの顧客は一覧から非表示になります。<br />
              確認のため顧客名 <strong style={{ color: '#2c3554' }}>{deactivateTarget.name}</strong> を入力してください。
            </p>
            <input
              style={inputStyle}
              placeholder="顧客名を入力"
              value={deactivateInput}
              onChange={e => { setDeactivateInput(e.target.value); setError(''); }}
            />
            {error && <div style={{ color: '#e05c5c', fontSize: '12px', marginTop: '8px' }}>{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setDeactivateTarget(null)} style={btnStyle('#f4f6fb', '#5a6480')}>キャンセル</button>
              <button onClick={handleDeactivate} style={btnStyle('#e05c5c', '#fff')}>無効化を確定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- サブコンポーネント＆スタイル ---
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
const typeLabel = (type: string) => ({ VISIT: '訪問', PHONE: '電話', EMAIL: 'メール', QUOTE: '見積', OTHER: 'その他' }[type] ?? type);
const resultLabel = (result: string) => ({ PENDING: 'フォロー待ち', OK: 'ポジティブ', NO: 'ネガティブ' }[result] ?? result);
const typeColor = (type: string) => ({ VISIT: '#e8f0fe', PHONE: '#e6f4ea', EMAIL: '#fff8e1', QUOTE: '#fce8e6', OTHER: '#f3e8fd' }[type] ?? '#f4f6fb');
const resultColor = (result: string) => ({ PENDING: '#fff8e1', OK: '#e6f4ea', NO: '#fce8e6' }[result] ?? '#f4f6fb');

const tagStyle = (bg: string): React.CSSProperties => ({
  fontSize: '11px', padding: '2px 6px', borderRadius: '4px',
  backgroundColor: bg, color: '#2c3554', fontWeight: 600,
});
const statusLabel = (s: string) => ({ DRAFT: '下書き', SENT: '送付済み', CONVERTED: '受注済み', CANCELLED: 'キャンセル' }[s] ?? s);
const statusColor = (s: string) => ({ DRAFT: '#f4f6fb', SENT: '#e8f0fe', CONVERTED: '#e6f4ea', CANCELLED: '#fce8e6' }[s] ?? '#f4f6fb');
const orderStatusLabel = (s: string) => ({ RECEIVED: '受注', PREPARING: '準備中', SHIPPED: '出荷済み', DELIVERED: '納品済み' }[s] ?? s);
const orderStatusColor = (s: string) => ({ RECEIVED: '#f4f6fb', PREPARING: '#fff8e1', SHIPPED: '#e8f0fe', DELIVERED: '#e6f4ea' }[s] ?? '#f4f6fb');
function ProspectHistory({ prospectId }: { prospectId: number }) {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => {
    axios.get(`${API}/api/contact-logs/prospect/${prospectId}`)
      .then(res => setLogs(res.data));
  }, [prospectId]);
  if (logs.length === 0) return <div style={{ fontSize: '12px', color: '#96a0b8' }}>開発記録がありません</div>;
  return (
    <div>
      {logs.map(log => (
        <div key={log.id} style={{ display: 'flex', gap: '12px', marginBottom: '10px', fontSize: '12px' }}>
          <span style={{ color: '#96a0b8', whiteSpace: 'nowrap' }}>
            {new Date(log.contactedAt).toLocaleDateString('ja-JP')}
          </span>
          <span style={tagStyle(typeColor(log.type))}>{typeLabel(log.type)}</span>
          <span style={tagStyle(resultColor(log.result))}>{resultLabel(log.result)}</span>
          <span style={{ color: '#2c3554' }}>{log.note}</span>
        </div>
      ))}
    </div>
  );
}