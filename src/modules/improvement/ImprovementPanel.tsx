import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../AuthContext';
import React from 'react';
import shared from '../../styles/shared.module.css';
const API = import.meta.env.VITE_API_URL ?? '';

// ── Interfaces ────────────────────────────────────────────

interface Member {
    id: number;
    username: string;
}

interface Report {
    id: number;
    note: string;
    reportedBy: string;
    reportedAt: string;
    attachments: Attachment[];
}

interface Attachment {
    id: number;
    fileUrl: string;
    fileName: string;
    sourceType: string;
}

interface Milestone {
    id: number;
    title: string;
    orderIndex: number;
    targetDate: string;
    status: string;
    completedAt: string;
    completedBy: string;
    reports: Report[];
}

interface Proposal {
    id: number;
    title: string;
    description: string;
    goal: string;
    metricBefore: number;
    metricAfterGoal: number;
    metricUnit: string;
    metricActual: number;
    proposer: string;
    status: string;
    reviewedBy: string;
    reviewedAt: string;
    reviewComment: string;
    submittedAt: string;
    dueDate: string;
    createdAt: string;
    members: Member[];
    milestones: Milestone[];
}

interface ProposalForm {
    title: string;
    description: string;
    goal: string;
    metricBefore: string;
    metricAfterGoal: string;
    metricUnit: string;
    dueDate: string;
    members: string[]; // usernames
}

const emptyForm = (): ProposalForm => ({
    title: '',
    description: '',
    goal: '',
    metricBefore: '',
    metricAfterGoal: '',
    metricUnit: '',
    dueDate: '',
    members: [],
});

// ── Component ─────────────────────────────────────────────

export default function ImprovementPanel() {
    const { can } = useAuth();
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'detail' | 'milestones'>('detail');

    // 提案の新規作成／編集
    const [showForm, setShowForm] = useState(false);
    const [editTarget, setEditTarget] = useState<Proposal | null>(null);
    const [form, setForm] = useState<ProposalForm>(emptyForm());
    const [memberInput, setMemberInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // 承認モーダル（管理者用）
    const [reviewTarget, setReviewTarget] = useState<Proposal | null>(null);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewLoading, setReviewLoading] = useState(false);

    // マイルストーン追加
    const [milestoneForm, setMilestoneForm] = useState({ title: '', targetDate: '' });
    const [milestoneLoading, setMilestoneLoading] = useState(false);

    // 進捗レポート追加
    const [reportForms, setReportForms] = useState<Record<number, { note: string; url: string; urlName: string }>>({});
    const [reportLoading, setReportLoading] = useState(false);

    // ── Fetch ──────────────────────────────────────────────

    const fetchProposals = async () => {
        const res = await axios.get(`${API}/api/improvements`);
        setProposals(res.data);
    };

    useEffect(() => { fetchProposals(); }, []);

    // ── Filter ─────────────────────────────────────────────

    const filtered = filterStatus === 'ALL'
        ? proposals
        : proposals.filter(p => p.status === filterStatus);

    // ── Expand ─────────────────────────────────────────────

    const toggleExpand = (id: number) => {
        if (expandedId === id) {
            setExpandedId(null);
        } else {
            setExpandedId(id);
            setActiveTab('detail');
        }
    };

    // ── 提案 CRUD ──────────────────────────────────────────

    const openCreate = () => {
        setEditTarget(null);
        setForm(emptyForm());
        setMemberInput('');
        setError('');
        setShowForm(true);
    };

    const openEdit = (p: Proposal) => {
        setEditTarget(p);
        setForm({
            title: p.title ?? '',
            description: p.description ?? '',
            goal: p.goal ?? '',
            metricBefore: p.metricBefore?.toString() ?? '',
            metricAfterGoal: p.metricAfterGoal?.toString() ?? '',
            metricUnit: p.metricUnit ?? '',
            dueDate: p.dueDate ?? '',
            members: p.members?.map(m => m.username) ?? [],
        });
        setMemberInput('');
        setError('');
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.title.trim()) { setError('提案タイトルは必須です'); return; }
        setLoading(true);
        try {
            const payload = {
                ...form,
                metricBefore: form.metricBefore ? Number(form.metricBefore) : null,
                metricAfterGoal: form.metricAfterGoal ? Number(form.metricAfterGoal) : null,
            };
            if (editTarget) {
                await axios.put(`${API}/api/improvements/${editTarget.id}`, payload);
            } else {
                await axios.post(`${API}/api/improvements`, payload);
            }
            setShowForm(false);
            fetchProposals();
        } catch (e: any) {
            setError(e.response?.data?.message ?? '保存に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const addMember = () => {
        const u = memberInput.trim();
        if (u && !form.members.includes(u)) {
            setForm(f => ({ ...f, members: [...f.members, u] }));
        }
        setMemberInput('');
    };

    const removeMember = (username: string) => {
        setForm(f => ({ ...f, members: f.members.filter(m => m !== username) }));
    };

    // ── ステータス遷移 ─────────────────────────────────────

    const handleSubmit = async (id: number) => {
        await axios.post(`${API}/api/improvements/${id}/submit`);
        fetchProposals();
    };

    const handleCancel = async (id: number) => {
        if (!window.confirm('この提案を取り下げますか？')) return;
        await axios.post(`${API}/api/improvements/${id}/cancel`);
        fetchProposals();
    };

    const handleReview = async (approved: boolean) => {
        if (!reviewTarget) return;
        setReviewLoading(true);
        try {
            await axios.post(`${API}/api/improvements/${reviewTarget.id}/review`, {
                approved,
                comment: reviewComment,
            });
            setReviewTarget(null);
            setReviewComment('');
            fetchProposals();
        } finally {
            setReviewLoading(false);
        }
    };

    // ── Milestone ──────────────────────────────────────────

    const handleAddMilestone = async (proposalId: number, currentCount: number) => {
        if (!milestoneForm.title.trim()) return;
        setMilestoneLoading(true);
        try {
            await axios.post(`${API}/api/improvements/${proposalId}/milestones`, {
                title: milestoneForm.title,
                orderIndex: currentCount + 1,
                targetDate: milestoneForm.targetDate || null,
            });
            setMilestoneForm({ title: '', targetDate: '' });
            fetchProposals();
        } finally {
            setMilestoneLoading(false);
        }
    };

    const handleCompleteMilestone = async (milestoneId: number) => {
        if (!window.confirm('このマイルストーンを完了としてマークしますか？')) return;
        await axios.post(`${API}/api/improvements/milestones/${milestoneId}/complete`);
        fetchProposals();
    };

    // ── Report ─────────────────────────────────────────────

    const handleAddReport = async (milestoneId: number) => {
        const rf = reportForms[milestoneId];
        if (!rf?.note?.trim()) return;
        setReportLoading(true);
        try {
            await axios.post(`${API}/api/improvements/milestones/${milestoneId}/reports`, {
                note: rf.note,
                attachmentUrls: rf.url ? [rf.url] : [],
                attachmentNames: rf.urlName ? [rf.urlName] : [],
            });
            setReportForms(prev => ({ ...prev, [milestoneId]: { note: '', url: '', urlName: '' } }));
            fetchProposals();
        } finally {
            setReportLoading(false);
        }
    };

    // ── Render ─────────────────────────────────────────────

    return (
        <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
            {/* タイトル行 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#2c3554', margin: 0 }}>改善提案</h2>
                <button onClick={openCreate} style={btnStyle('#4a78c4', '#fff')}>
                    ＋ 新規提案
                </button>
            </div>

            {/* ステータスフィルター */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {['ALL', 'DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'COMPLETED', 'REJECTED', 'CANCELLED'].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                        style={tabStyle(filterStatus === s)}>
                        {statusLabel(s)}
                    </button>
                ))}
            </div>

            {/* 提案一覧 */}
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f4f6fb' }}>
                        <th style={th()}>提案タイトル</th>
                        <th style={th()}>担当者</th>
                        <th style={th()}>期限日</th>
                        <th style={th()}>ステータス</th>
                        <th style={th()}>操作</th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.map(p => (
                        <React.Fragment key={p.id}>
                            <tr style={{ borderBottom: '1px solid #eef0f6', cursor: 'pointer' }}
                                onClick={() => toggleExpand(p.id)}>
                                <td style={td()}>{p.title}</td>
                                <td style={td()}>{p.proposer}</td>
                                <td style={{ ...td(), color: '#96a0b8', fontSize: '12px' }}>{p.dueDate ?? '—'}</td>
                                <td style={td()}>
                                    <span style={tagStyle(statusColor(p.status))}>
                                        {statusLabel(p.status)}
                                    </span>
                                </td>
                                <td style={td()} onClick={e => e.stopPropagation()}>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        {/* 下書き：編集・申請・取り下げ可 */}
                                        {p.status === 'DRAFT' && (
                                            <>
                                                <button onClick={() => openEdit(p)} style={btnStyle('#f4f6fb', '#5a6480')}>編集</button>
                                                <button onClick={() => handleSubmit(p.id)} style={btnStyle('#4a78c4', '#fff')}>申請</button>
                                                <button onClick={() => handleCancel(p.id)} style={btnStyle('#fff0f0', '#e05c5c')}>取り下げ</button>
                                            </>
                                        )}
                                        {p.status === 'PENDING_REVIEW' && can('manage_users') && (
                                            <button onClick={() => { setReviewTarget(p); setReviewComment(''); }}
                                                style={btnStyle('#fff8e1', '#b45309')}>承認審査</button>
                                        )}
                                        {/* 実行中：取り下げ可 */}
                                        {p.status === 'ACTIVE' && (
                                            <button onClick={() => handleCancel(p.id)} style={btnStyle('#fff0f0', '#e05c5c')}>取り下げ</button>
                                        )}
                                    </div>
                                </td>
                            </tr>

                            {/* 展開行 */}
                            {expandedId === p.id && (
                                <tr>
                                    <td colSpan={5} style={{ backgroundColor: '#f9fafd', padding: '16px 20px' }}>
                                        {/* タブ */}
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                            <button style={tabStyle(activeTab === 'detail')} onClick={() => setActiveTab('detail')}>提案内容</button>
                                            <button style={tabStyle(activeTab === 'milestones')} onClick={() => setActiveTab('milestones')}>実行フェーズ</button>
                                        </div>

                                        {/* 提案内容タブ */}
                                        {activeTab === 'detail' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <InfoRow label="現状説明" value={p.description} />
                                                <InfoRow label="期待効果" value={p.goal} />
                                                <div style={{ display: 'flex', gap: '24px' }}>
                                                    <InfoRow label="改善前" value={p.metricBefore != null ? `${p.metricBefore} ${p.metricUnit ?? ''}` : '—'} />
                                                    <InfoRow label="目標値" value={p.metricAfterGoal != null ? `${p.metricAfterGoal} ${p.metricUnit ?? ''}` : '—'} />
                                                    <InfoRow label="実績値" value={p.metricActual != null ? `${p.metricActual} ${p.metricUnit ?? ''}` : '—'} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '12px', color: '#5a6480', fontWeight: 600, marginBottom: '6px' }}>協力メンバー</div>
                                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                        {p.members?.length > 0
                                                            ? p.members.map(m => (
                                                                <span key={m.id} style={tagStyle('#e8f0fe')}>{m.username}</span>
                                                            ))
                                                            : <span style={{ fontSize: '13px', color: '#96a0b8' }}>なし</span>
                                                        }
                                                    </div>
                                                </div>
                                                {p.reviewComment && (
                                                    <InfoRow label="審査コメント" value={p.reviewComment} />
                                                )}
                                            </div>
                                        )}

                                        {/* 実行フェーズタブ */}
                                        {activeTab === 'milestones' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                {p.milestones?.map(m => (
                                                    <div key={m.id} style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '14px 16px', border: '1px solid #eef0f6' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#2c3554' }}>
                                                                    {m.orderIndex}. {m.title}
                                                                </span>
                                                                <span style={tagStyle(milestoneStatusColor(m.status))}>
                                                                    {milestoneStatusLabel(m.status)}
                                                                </span>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                {m.targetDate && (
                                                                    <span style={{ fontSize: '12px', color: '#96a0b8' }}>目標：{m.targetDate}</span>
                                                                )}
                                                                {m.status !== 'DONE' && p.status === 'ACTIVE' && (
                                                                    <button onClick={() => handleCompleteMilestone(m.id)}
                                                                        style={btnStyle('#e6f4ea', '#1a7f37')}>完了にする</button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* 進捗レポート一覧 */}
                                                        {m.reports?.length > 0 && (
                                                            <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                {m.reports.map(r => (
                                                                    <div key={r.id} style={{ fontSize: '12px', color: '#5a6480', backgroundColor: '#f4f6fb', borderRadius: '6px', padding: '8px 10px' }}>
                                                                        <div style={{ color: '#2c3554', marginBottom: '2px' }}>{r.note}</div>
                                                                        <div style={{ color: '#96a0b8' }}>{r.reportedBy} · {new Date(r.reportedAt).toLocaleDateString('ja-JP')}</div>
                                                                        {r.attachments?.map(a => (
                                                                            <a key={a.id} href={a.fileUrl} target="_blank" rel="noreferrer"
                                                                                style={{ color: '#4a78c4', fontSize: '11px' }}>
                                                                                📎 {a.fileName || a.fileUrl}
                                                                            </a>
                                                                        ))}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* 進捗レポート追加 */}
                                                        {p.status === 'ACTIVE' && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                <textarea
                                                                    placeholder="今回の進捗を記入してください..."
                                                                    style={{ ...inputStyle, height: '56px', resize: 'vertical' }}
                                                                    value={reportForms[m.id]?.note ?? ''}
                                                                    onChange={e => setReportForms(prev => ({ ...prev, [m.id]: { ...prev[m.id], note: e.target.value } }))}
                                                                />
                                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                                    <input placeholder="添付リンク URL（任意）" style={inputStyle}
                                                                        value={reportForms[m.id]?.url ?? ''}
                                                                        onChange={e => setReportForms(prev => ({ ...prev, [m.id]: { ...prev[m.id], url: e.target.value } }))}
                                                                    />
                                                                    <input placeholder="リンク名称（任意）" style={inputStyle}
                                                                        value={reportForms[m.id]?.urlName ?? ''}
                                                                        onChange={e => setReportForms(prev => ({ ...prev, [m.id]: { ...prev[m.id], urlName: e.target.value } }))}
                                                                    />
                                                                </div>
                                                                <button onClick={() => handleAddReport(m.id)} disabled={reportLoading}
                                                                    style={{ ...btnStyle('#4a78c4', '#fff'), alignSelf: 'flex-start' }}>
                                                                    {reportLoading ? '保存中...' : '進捗レポートを追加'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}

                                                {/* マイルストーン追加（ACTIVE 状態のみ）*/}
                                                {p.status === 'ACTIVE' && (
                                                    <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '14px 16px', border: '1px dashed #c5d0e8' }}>
                                                        <div style={{ fontSize: '12px', color: '#5a6480', fontWeight: 600, marginBottom: '8px' }}>実行フェーズを追加</div>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <input placeholder="フェーズ名" style={inputStyle}
                                                                value={milestoneForm.title}
                                                                onChange={e => setMilestoneForm(f => ({ ...f, title: e.target.value }))} />
                                                            <input type="date" style={inputStyle}
                                                                value={milestoneForm.targetDate}
                                                                onChange={e => setMilestoneForm(f => ({ ...f, targetDate: e.target.value }))} />
                                                            <button onClick={() => handleAddMilestone(p.id, p.milestones?.length ?? 0)}
                                                                disabled={milestoneLoading} style={btnStyle('#4a78c4', '#fff')}>
                                                                追加
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
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
                            {editTarget ? '提案を編集' : '新規提案'}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <Field label="提案タイトル *">
                                <input style={inputStyle} value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                            </Field>
                            <Field label="現状説明">
                                <textarea style={{ ...inputStyle, height: '64px', resize: 'vertical' }}
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                            </Field>
                            <Field label="期待効果">
                                <textarea style={{ ...inputStyle, height: '64px', resize: 'vertical' }}
                                    value={form.goal}
                                    onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} />
                            </Field>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <Field label="改善前の数値">
                                    <input style={inputStyle} type="number" value={form.metricBefore}
                                        onChange={e => setForm(f => ({ ...f, metricBefore: e.target.value }))} />
                                </Field>
                                <Field label="目標値">
                                    <input style={inputStyle} type="number" value={form.metricAfterGoal}
                                        onChange={e => setForm(f => ({ ...f, metricAfterGoal: e.target.value }))} />
                                </Field>
                                <Field label="単位">
                                    <input style={inputStyle} placeholder="分 / 件 / 円" value={form.metricUnit}
                                        onChange={e => setForm(f => ({ ...f, metricUnit: e.target.value }))} />
                                </Field>
                            </div>
                            <Field label="期限日">
                                <input style={inputStyle} type="date" value={form.dueDate}
                                    onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                            </Field>
                            <Field label="協力メンバー">
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <input style={inputStyle} placeholder="ユーザー名を入力" value={memberInput}
                                        onChange={e => setMemberInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addMember()} />
                                    <button onClick={addMember} style={btnStyle('#f4f6fb', '#5a6480')}>追加</button>
                                </div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                                    {form.members.map(m => (
                                        <span key={m} style={{ ...tagStyle('#e8f0fe'), cursor: 'pointer' }}
                                            onClick={() => removeMember(m)}>
                                            {m} ✕
                                        </span>
                                    ))}
                                </div>
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

            {/* 承認審査モーダル */}
            {reviewTarget && (
                <div style={overlayStyle}>
                    <div style={{ ...modalStyle, width: '420px' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#2c3554' }}>提案を審査</h3>
                        <div style={{ fontSize: '13px', color: '#5a6480', marginBottom: '12px' }}>
                            《{reviewTarget.title}》— {reviewTarget.proposer}
                        </div>
                        <Field label="審査コメント（任意）">
                            <textarea style={{ ...inputStyle, height: '80px', resize: 'vertical' }}
                                value={reviewComment}
                                onChange={e => setReviewComment(e.target.value)} />
                        </Field>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                            <button onClick={() => setReviewTarget(null)} style={btnStyle('#f4f6fb', '#5a6480')}>キャンセル</button>
                            <button onClick={() => handleReview(false)} disabled={reviewLoading} style={btnStyle('#fff0f0', '#e05c5c')}>
                                却下
                            </button>
                            <button onClick={() => handleReview(true)} disabled={reviewLoading} style={btnStyle('#4a78c4', '#fff')}>
                                承認
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Helper Components ─────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', color: '#5a6480', fontWeight: 600 }}>{label}</label>
            {children}
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
    return (
        <div>
            <div style={{ fontSize: '12px', color: '#5a6480', fontWeight: 600, marginBottom: '2px' }}>{label}</div>
            <div style={{ fontSize: '13px', color: '#2c3554' }}>{value || '—'}</div>
        </div>
    );
}

// ── Styles ────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: '6px',
    border: '1px solid #dde3f0', fontSize: '13px', outline: 'none', width: '100%',
    boxSizing: 'border-box',
};

const td = (): React.CSSProperties => ({ padding: '10px 12px', color: '#2c3554' });
const th = (): React.CSSProperties => ({ padding: '10px 12px', color: '#5a6480', fontSize: '12px', fontWeight: 600, textAlign: 'left' });

const btnStyle = (bg: string, color: string): React.CSSProperties => ({
    padding: '7px 16px', borderRadius: '6px', border: 'none',
    backgroundColor: bg, color, fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
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
    width: '520px', maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
};

const tagStyle = (bg: string): React.CSSProperties => ({
    fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
    backgroundColor: bg, color: '#2c3554', fontWeight: 600,
});

// ── Label / Color Maps ────────────────────────────────────

const statusLabel = (s: string) => ({
    ALL: 'すべて', DRAFT: '下書き', PENDING_REVIEW: '承認待ち',
    ACTIVE: '実行中', COMPLETED: '完了', REJECTED: '却下', CANCELLED: '取り下げ',
}[s] ?? s);

const statusColor = (s: string) => ({
    DRAFT: '#f4f6fb', PENDING_REVIEW: '#fff8e1', ACTIVE: '#e8f0fe',
    COMPLETED: '#e6f4ea', REJECTED: '#fce8e6', CANCELLED: '#f4f6fb',
}[s] ?? '#f4f6fb');

const milestoneStatusLabel = (s: string) => ({ PENDING: '未着手', IN_PROGRESS: '進行中', DONE: '完了' }[s] ?? s);
const milestoneStatusColor = (s: string) => ({ PENDING: '#f4f6fb', IN_PROGRESS: '#e8f0fe', DONE: '#e6f4ea' }[s] ?? '#f4f6fb');