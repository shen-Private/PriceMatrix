import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../AuthContext';
import React from 'react';
const API = import.meta.env.VITE_API_URL ?? '';

interface Prospect {
    id: number;
    companyName: string;
    contactName: string;
    phone: string;
    email: string;
    address: string;
    source: string;
    assignedTo: string;
    status: string;
}

interface ContactLog {
    id: number;
    prospectId: number;
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

const emptyProspect = (): Omit<Prospect, 'id'> => ({
    companyName: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    source: 'WALK_IN',
    assignedTo: '',
    status: 'ACTIVE',
});

export default function ProspectPanel() {
    const { can } = useAuth();
    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editTarget, setEditTarget] = useState<Prospect | null>(null);
    const [form, setForm] = useState(emptyProspect());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [contactLogs, setContactLogs] = useState<Record<number, ContactLog[]>>({});
    const [logForm, setLogForm] = useState<ContactLogForm>(emptyLog());
    const [logLoading, setLogLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'timeline' | 'logs'>('timeline');

    const fetchProspects = async () => {
        const res = await axios.get(`${API}/api/prospects`);
        setProspects(res.data);
    };

    useEffect(() => { fetchProspects(); }, []);

    const fetchContactLogs = async (prospectId: number) => {
        const res = await axios.get(`${API}/api/contact-logs/prospect/${prospectId}`);
        setContactLogs(prev => ({ ...prev, [prospectId]: res.data }));
    };

    const toggleExpand = (prospectId: number) => {
        if (expandedId === prospectId) {
            setExpandedId(null);
        } else {
            setExpandedId(prospectId);
            fetchContactLogs(prospectId);
            setLogForm(emptyLog());
            setActiveTab('timeline');
        }
    };

    const handleAddLog = async (prospectId: number) => {
        setLogLoading(true);
        try {
            await axios.post(`${API}/api/contact-logs`, {
                ...logForm,
                prospectId,
                contactedAt: new Date(logForm.contactedAt).toISOString().slice(0, 19),
            });
            fetchContactLogs(prospectId);
            setLogForm(emptyLog());
        } catch {
            setError('追加に失敗しました');
        } finally {
            setLogLoading(false);
        }
    };

    const openCreate = () => {
        setEditTarget(null);
        setForm(emptyProspect());
        setError('');
        setShowForm(true);
    };

    const openEdit = (p: Prospect) => {
        setEditTarget(p);
        setForm({
            companyName: p.companyName,
            contactName: p.contactName ?? '',
            phone: p.phone ?? '',
            email: p.email ?? '',
            address: p.address ?? '',
            source: p.source,
            assignedTo: p.assignedTo ?? '',
            status: p.status,
        });
        setError('');
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.companyName.trim()) { setError('会社名は必須です'); return; }
        setLoading(true);
        try {
            if (editTarget && form.status === 'CONVERTED') {
                // 正式顧客へ転換
                await axios.post(`${API}/api/customers/convert/${editTarget.id}`);
            } else if (editTarget) {
                await axios.put(`${API}/api/prospects/${editTarget.id}`, form);
            } else {
                await axios.post(`${API}/api/prospects`, form);
            }
            setShowForm(false);
            fetchProspects();
        } catch (e: any) {
            setError(e.response?.data?.message ?? '保存に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
            {/* タイトル行 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#2c3554', margin: 0 }}>見込み客</h2>
                {can('view_customers') && (
                    <button onClick={openCreate} style={btnStyle('#4a78c4', '#fff')}>
                        ＋ 見込み客を追加
                    </button>
                )}
            </div>

            {/* 一覧 */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f4f6fb', color: '#5a6480' }}>
                        {['会社名', '担当者', '電話', '来源', '担当営業', 'ステータス', ''].map(h => (
                            <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {prospects.map(p => (
                        <React.Fragment key={p.id}>
                            <tr
                                onClick={() => toggleExpand(p.id)}
                                style={{ borderBottom: '1px solid #eef0f7', cursor: 'pointer', backgroundColor: expandedId === p.id ? '#f8f9fd' : '#fff' }}
                            >
                                <td style={td()}>{p.companyName}</td>
                                <td style={td()}>{p.contactName ?? '—'}</td>
                                <td style={td()}>{p.phone ?? '—'}</td>
                                <td style={td()}><span style={tagStyle(sourceColor(p.source))}>{sourceLabel(p.source)}</span></td>
                                <td style={td()}>{p.assignedTo ?? '—'}</td>
                                <td style={td()}><span style={tagStyle(statusColor(p.status))}>{statusLabel(p.status)}</span></td>
                                <td style={td()}>
                                    {p.status !== 'CONVERTED' && (
                                        <button
                                            onClick={e => { e.stopPropagation(); openEdit(p); }}
                                            style={btnStyle('#f4f6fb', '#5a6480')}>
                                            編集
                                        </button>
                                    )}
                                </td>
                            </tr>

                            {/* 展開行 */}
                            {expandedId === p.id && (

                                <tr>
                                    <td colSpan={7} style={{ backgroundColor: '#f8f9fd', padding: '0' }}>
                                        <div style={{ padding: '16px 24px' }}>
                                            {/* タブ */}
                                            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                                {(['timeline', 'logs'] as const).map(tab => (
                                                    <button key={tab} onClick={() => setActiveTab(tab)}
                                                        style={tabStyle(activeTab === tab)}>
                                                        {tab === 'timeline' ? 'タイムライン' : 'コンタクト履歴'}
                                                    </button>
                                                ))}
                                            </div>

                                            <div style={{ display: 'flex', gap: '24px' }}>
                                                {/* 左側コンテンツ */}
                                                <div style={{ flex: 1 }}>
                                                    {(() => {
                                                        const logs = contactLogs[p.id] ?? [];
                                                        if (activeTab === 'timeline' || activeTab === 'logs') {
                                                            if (logs.length === 0) return <div style={{ color: '#aaa', fontSize: '13px' }}>記録がありません</div>;
                                                            return logs.map(log => (
                                                                <div key={log.id} style={{ display: 'flex', gap: '12px', marginBottom: '12px', fontSize: '13px' }}>
                                                                    <div style={{ color: '#8a93b0', minWidth: '72px' }}>
                                                                        {new Date(log.contactedAt).toLocaleDateString('ja-JP')}
                                                                    </div>
                                                                    <span style={tagStyle(typeColor(log.type))}>{typeLabel(log.type)}</span>
                                                                    <span style={tagStyle(resultColor(log.result))}>{resultLabel(log.result)}</span>
                                                                    <div style={{ color: '#2c3554' }}>{log.note}</div>
                                                                </div>
                                                            ));
                                                        }
                                                    })()}
                                                </div>

                                                {/* 右側：追加フォーム（コンタクト履歴タブのみ表示） */}
                                                {activeTab === 'logs' && p.status !== 'CONVERTED' && (
                                                    <div style={{ width: '280px', borderLeft: '1px solid #dde3f0', paddingLeft: '24px' }}>
                                                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#2c3554', marginBottom: '12px' }}>記録を追加</div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            <Field label="コンタクト方法">
                                                                <select style={inputStyle} value={logForm.type}
                                                                    onChange={e => setLogForm(f => ({ ...f, type: e.target.value }))}>
                                                                    <option value="VISIT">訪問</option>
                                                                    <option value="PHONE">電話</option>
                                                                    <option value="EMAIL">メール</option>
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
                                                            <button onClick={() => handleAddLog(p.id)} disabled={logLoading}
                                                                style={{ ...btnStyle('#4a78c4', '#fff'), marginTop: '4px' }}>
                                                                {logLoading ? '保存中...' : '追加'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
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
                            {editTarget ? '見込み客を編集' : '見込み客を追加'}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <Field label="会社名 *">
                                <input style={inputStyle} value={form.companyName}
                                    onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} />
                            </Field>
                            <Field label="担当者">
                                <input style={inputStyle} value={form.contactName}
                                    onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} />
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
                            <Field label="来源">
                                <select style={inputStyle} value={form.source}
                                    onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                                    <option value="WALK_IN">飛び込み</option>
                                    <option value="EVENT">展示会／イベント</option>
                                    <option value="REFERRAL">顧客紹介</option>
                                    <option value="OTHER">その他</option>
                                </select>
                            </Field>
                            <Field label="担当営業">
                                <input style={inputStyle} value={form.assignedTo}
                                    onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} />
                            </Field>
                            {editTarget && (
                                <Field label="ステータス">
                                    <select style={inputStyle} value={form.status}
                                        onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                        <option value="ACTIVE">開拓中</option>
                                        <option value="CONVERTED">成約</option>
                                        <option value="DROPPED">見送り</option>
                                    </select>
                                </Field>
                            )}
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
        </div>
    );
}

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

const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
    backgroundColor: active ? '#4a78c4' : '#f4f6fb',
    color: active ? '#fff' : '#5a6480', fontSize: '13px', fontWeight: 600,
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

const typeLabel = (type: string) => ({ VISIT: '訪問', PHONE: '電話', EMAIL: 'メール', OTHER: 'その他' }[type] ?? type);
const resultLabel = (result: string) => ({ PENDING: 'フォロー待ち', OK: 'ポジティブ', NO: 'ネガティブ' }[result] ?? result);
const typeColor = (type: string) => ({ VISIT: '#e8f0fe', PHONE: '#e6f4ea', EMAIL: '#fff8e1', OTHER: '#f3e8fd' }[type] ?? '#f4f6fb');
const resultColor = (result: string) => ({ PENDING: '#fff8e1', OK: '#e6f4ea', NO: '#fce8e6' }[result] ?? '#f4f6fb');
const tagStyle = (bg: string): React.CSSProperties => ({
    fontSize: '11px', padding: '2px 6px', borderRadius: '4px',
    backgroundColor: bg, color: '#2c3554', fontWeight: 600,
});
const sourceLabel = (s: string) => ({ WALK_IN: '飛び込み', EVENT: '展示会／イベント', REFERRAL: '顧客紹介', OTHER: 'その他' }[s] ?? s);
const sourceColor = (s: string) => ({ WALK_IN: '#e8f0fe', EVENT: '#e6f4ea', REFERRAL: '#fff8e1', OTHER: '#f3e8fd' }[s] ?? '#f4f6fb');
const statusLabel = (s: string) => ({ ACTIVE: '開拓中', CONVERTED: '成約', DROPPED: '見送り' }[s] ?? s);
const statusColor = (s: string) => ({ ACTIVE: '#e8f0fe', CONVERTED: '#e6f4ea', DROPPED: '#fce8e6' }[s] ?? '#f4f6fb');