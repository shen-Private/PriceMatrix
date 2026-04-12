import React, { useState } from 'react';

// ── データ定義 ────────────────────────────────────────────

interface HelpItem {
    text: string;
}

interface HelpSection {
    id: string;
    icon: string;
    title: string;
    color: string;
    items: HelpItem[];
}

const helpData: HelpSection[] = [
    {
        id: 'quote',
        icon: '📄',
        title: '見積書',
        color: '#4a78c4',
        items: [
            { text: '上部の「＋ 見積書を作成」ボタンから新規見積書を作成できます。' },
            { text: '顧客を選択すると、設定済みの割引率が自動で適用されます。' },
            { text: 'ステータスの流れ：下書き → 送付済み → 受注済み / キャンセル' },
            { text: '「📤」ボタンで見積書を送付済みにします。' },
            { text: '送付済みの見積書は「📝」ボタンで改訂版を作成できます。元の見積書番号が履歴として残ります。' },
            { text: '「✅」ボタンで受注確定し、受注管理に自動登録されます。' },
            { text: '「🖨️」ボタンでPDFをダウンロードできます（下書き・送付済みのみ）。' },
        ],
    },
    {
        id: 'order',
        icon: '📦',
        title: '受注管理',
        color: '#2a9d6e',
        items: [
            { text: '見積書から受注確定すると、自動でここに登録されます。' },
            { text: 'ステータスの流れ：出荷待ち → 完了' },
            { text: '「▼ 出荷」ボタンで受注の詳細と出荷伝票を確認できます。' },
            { text: '「＋ 出荷伝票を作成」から運送会社・追跡番号を入力して出荷伝票を登録します。' },
            { text: '「出荷確定」ボタンを押すと出荷済みになり、全伝票が出荷済みになると受注が「完了」になります。' },
        ],
    },
    {
        id: 'customer',
        icon: '🏢',
        title: '顧客管理',
        color: '#7c5cbf',
        items: [
            { text: '顧客名・担当者・メール・電話番号でリアルタイム検索できます。' },
            { text: '行をクリックすると、タイムライン・見積書・受注・コンタクト履歴を確認できます。' },
            { text: 'タイムラインでは見積書・受注・コンタクト記録を時系列でまとめて表示します。' },
            { text: '右側のフォームからコンタクト記録（訪問・電話・メール等）を追加できます。' },
            { text: '所属グループを設定することで、グループ企業の管理ができます。' },
            { text: '「無効化」すると一覧から非表示になります。確認のため顧客名の入力が必要です。' },
            { text: '見込み客から転換した顧客は「開発履歴」タブで過去の営業記録を確認できます。' },
        ],
    },
    {
        id: 'prospect',
        icon: '🔍',
        title: '見込み客',
        color: '#e08c2a',
        items: [
            { text: '成約前の潜在顧客を管理します。' },
            { text: 'ステータスの流れ：開拓中 → 成約（顧客へ転換）/ 見送り' },
            { text: '「コンタクト履歴」タブからアプローチ記録を追加できます。' },
            { text: '編集画面でステータスを「成約」にすると、顧客管理へ自動転換されます。過去のコンタクト履歴も引き継がれます。' },
            { text: '来源（飛び込み・展示会・紹介・その他）でルートを管理できます。' },
        ],
    },
    {
        id: 'improvement',
        icon: '💡',
        title: '改善提案',
        color: '#4a78c4',
        items: [
            { text: '業務改善のアイデアを提案・管理します。' },
            { text: 'ステータスの流れ：下書き → 承認待ち → 実行中 → 完了 / 却下' },
            { text: '「申請」ボタンで承認待ちに送ります。管理者が承認すると実行中になります。' },
            { text: '管理者は「承認審査」ボタンから承認・却下とコメントを入力できます。' },
            { text: '実行中の提案は「実行フェーズ」タブでマイルストーンを追加・管理できます。' },
            { text: 'マイルストーンごとに進捗レポートを記録できます。添付リンクも登録可能です。' },
            { text: '協力メンバーを追加することで、複数人で提案を管理できます。' },
        ],
    },
    {
        id: 'discount',
        icon: '🏷️',
        title: '割引管理',
        color: '#e05c5c',
        items: [
            { text: '顧客・商品の組み合わせごとに割引率を設定できます。' },
            { text: '見積書作成時に顧客と商品を選択すると、登録済みの割引率が自動で反映されます。' },
            { text: '割引率は0〜1の範囲で設定します（例：0.8 = 20%引き）。' },
            { text: '割引の変更・削除は管理者権限が必要です。' },
            { text: '変更履歴は監査ログで確認できます。' },
        ],
    },
    {
        id: 'inventory',
        icon: '📊',
        title: '在庫一覧',
        color: '#2a9d6e',
        items: [
            { text: '在庫管理のメイン画面です。全商品の在庫状況をまとめて確認できます。' },
            { text: '在庫形態は4種類：自社在庫・外注常備・外注倉庫・外注直送。左サイドバーでフィルタリングできます。' },
            { text: '自社在庫・外注倉庫は数量管理あり。外注常備は在庫切れなし扱いです。' },
            { text: '外注直送はメーカーへの問い合わせ結果を記録します。「＋」ボタンで情報を追加、「≡」ボタンで履歴を確認できます。' },
            { text: '安全在庫を設定すると、在庫数がその値を下回った際に⚠アラートが表示されます（管理者権限が必要）。' },
            { text: 'カテゴリタブ・メーカーフィルターを組み合わせて絞り込みができます。' },
        ],
    },
    {
        id: 'stocktake',
        icon: '📋',
        title: '棚卸モード',
        color: '#e67e22',
        items: [
            { text: '在庫一覧画面右上の「📋 棚卸モード」ボタンから切り替えます。' },
            { text: '自社在庫・外注倉庫の商品が一覧表示されます。実際に数えた数量を入力してください。' },
            { text: '入力すると「差異」列に現在庫との差分が自動計算されます（＋は増加、－は減少）。' },
            { text: '担当者名を入力して「棚卸を確定する」を押すと、差分が ADJUST 記録として保存されます。' },
            { text: '左サイドバーに直近7日間の入庫記録が表示され、棚卸の参考にできます。' },
        ],
    },
    {
        id: 'scan',
        icon: '📷',
        title: 'スキャン入庫',
        color: '#4a78c4',
        items: [
            { text: '在庫一覧画面右上の「📷 バーコードスキャン」ボタン、またはメニューから開きます。' },
            { text: '「カメラでスキャン」ボタンでスマートフォンのカメラが起動します。バーコードにかざすと自動で読み取ります。' },
            { text: 'バーコードを手入力して「検索」ボタンでも商品を追加できます。' },
            { text: '同じ商品を複数回スキャンすると数量が自動で加算されます。数量は一覧で直接編集できます。' },
            { text: '未登録のバーコードをスキャンした場合、商品名・メーカーを入力して仮登録できます。後でCSが本登録します。' },
            { text: '運送会社（ヤマト・佐川・福山）を選択し、担当者名を入力して「入庫を確定する」で完了です。' },
        ],
    },
    {
        id: 'product-master',
        icon: '🗂️',
        title: '商品マスタ',
        color: '#7c5cbf',
        items: [
            { text: '新しい商品を正式登録する画面です。商品名・定価・カテゴリ・単位は必須項目です。' },
            { text: '在庫形態を選択します：自社在庫 / 外注常備 / 外注倉庫 / 外注直送。' },
            { text: 'バーコードを登録しておくと、スキャン入庫時に商品を自動認識できます。' },
            { text: '安全在庫を設定すると、在庫一覧でアラート表示の基準値として使用されます。' },
            { text: 'スキャン入庫で仮登録された商品は「確認待ち商品」として上部に表示されます。定価・カテゴリ等を補完して「確認・登録する」で本登録します。' },
        ],
    },
];

// ── Component ─────────────────────────────────────────────

export default function HelpPanel() {
    const [activeId, setActiveId] = useState<string>('quote');
    const activeSection = helpData.find(s => s.id === activeId)!;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100%',
            fontFamily: "'IBM Plex Sans JP', 'Noto Sans TC', sans-serif",
            fontSize: '14px',
            backgroundColor: '#f0f3f8',
            color: '#1e2740',
        }}>
            <div style={{
                flex: 1,
                padding: '24px 32px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                maxWidth: '960px',
                margin: '0 auto',
                width: '100%',
                boxSizing: 'border-box',
            }}>

                {/* タイトル */}
                <div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#1e2740' }}>ヘルプ</div>
                    <div style={{ fontSize: '12px', color: '#96a0b8', marginTop: '4px' }}>
                        各機能の使い方を確認できます
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

                    {/* 左サイドバー */}
                    <div style={{
                        width: '176px',
                        flexShrink: 0,
                        backgroundColor: '#fff',
                        border: '1px solid #d0d7e8',
                        borderRadius: '10px',
                        boxShadow: '0 1px 3px rgba(30,39,64,0.08)',
                        overflow: 'hidden',
                    }}>
                        {helpData.map((s, idx) => (
                            <button
                                key={s.id}
                                onClick={() => setActiveId(s.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    width: '100%',
                                    padding: '11px 14px',
                                    border: 'none',
                                    borderBottom: idx < helpData.length - 1 ? '1px solid #d0d7e8' : 'none',
                                    borderLeft: activeId === s.id ? `3px solid ${s.color}` : '3px solid transparent',
                                    backgroundColor: activeId === s.id ? '#f0f3f8' : '#fff',
                                    color: activeId === s.id ? '#1e2740' : '#5a6480',
                                    fontSize: '13px',
                                    fontWeight: activeId === s.id ? 600 : 400,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    fontFamily: 'inherit',
                                    transition: 'background-color 0.1s',
                                }}
                            >
                                <span style={{ fontSize: '15px' }}>{s.icon}</span>
                                {s.title}
                            </button>
                        ))}
                    </div>

                    {/* 右コンテンツ */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>

                        {/* セクションカード */}
                        <div style={{
                            backgroundColor: '#fff',
                            border: '1px solid #d0d7e8',
                            borderRadius: '10px',
                            boxShadow: '0 1px 3px rgba(30,39,64,0.08)',
                            overflow: 'hidden',
                        }}>
                            {/* カードヘッダー */}
                            <div style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid #d0d7e8',
                                backgroundColor: '#e8ecf4',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                            }}>
                                <span style={{
                                    fontSize: '20px',
                                    width: '40px',
                                    height: '40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: `${activeSection.color}20`,
                                    borderRadius: '8px',
                                    flexShrink: 0,
                                }}>
                                    {activeSection.icon}
                                </span>
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e2740' }}>
                                        {activeSection.title}
                                    </div>
                                    <div style={{
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        letterSpacing: '0.07em',
                                        textTransform: 'uppercase' as const,
                                        color: '#96a0b8',
                                        marginTop: '2px',
                                    }}>
                                        {activeSection.items.length} tips
                                    </div>
                                </div>
                            </div>

                            {/* ヒント一覧 */}
                            {activeSection.items.map((item, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'flex',
                                        gap: '14px',
                                        padding: '13px 20px',
                                        borderBottom: idx < activeSection.items.length - 1 ? '1px solid #d0d7e8' : 'none',
                                        alignItems: 'flex-start',
                                    }}
                                >
                                    <span style={{
                                        minWidth: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        backgroundColor: `${activeSection.color}18`,
                                        color: activeSection.color,
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginTop: '2px',
                                        flexShrink: 0,
                                    }}>
                                        {idx + 1}
                                    </span>
                                    <span style={{ fontSize: '13px', color: '#1e2740', lineHeight: '1.75' }}>
                                        {item.text}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* 前後ナビ */}
                        {(() => {
                            const idx = helpData.findIndex(s => s.id === activeId);
                            const prev = helpData[idx - 1];
                            const next = helpData[idx + 1];
                            return (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <div>
                                        {prev && (
                                            <button onClick={() => setActiveId(prev.id)} style={navBtn}>
                                                ← {prev.icon} {prev.title}
                                            </button>
                                        )}
                                    </div>
                                    <div>
                                        {next && (
                                            <button onClick={() => setActiveId(next.id)} style={navBtn}>
                                                {next.icon} {next.title} →
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Styles ────────────────────────────────────────────────

const navBtn: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '7px',
    border: '1px solid #d0d7e8',
    backgroundColor: '#fff',
    color: '#5a6480',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'IBM Plex Sans JP', 'Noto Sans TC', sans-serif",
};