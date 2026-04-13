import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import GlobalSearch from './GlobalSearch';

const roleLabel: Record<string, string> = {
  admin: '管理者', warehouse: '倉庫担当', sales: '営業', cs: 'CS',
};

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, logout, can } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSP, setIsSP] = useState(window.innerWidth <= 768);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setIsSP(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mainLinks = [
    { label: '顧客管理', path: '/customers', action: 'view_customers' as const },
    { label: '見込み客', path: '/prospects', action: 'view_customers' as const },
    { label: '---' },
    { label: '割引管理', path: '/pricing', action: 'view_pricing' as const },
    { label: '見積書', path: '/quotes', action: 'view_pricing' as const },
    { label: '受注管理', path: '/orders', action: 'view_pricing' as const },
    { label: '---' },
    { label: '在庫一覧', path: '/inventory', action: 'view_inventory' as const },
    { label: '---' },
    { label: '改善提案', path: '/improvements', action: 'view_customers' as const },
    { label: '---' },
    { label: 'ヘルプ', path: '/help', action: 'view_customers' as const },
  ];

  const menuLinks = [
    { label: '商品マスタ管理', path: '/admin/products', action: 'manage_users' as const },
    { label: '社内アカウント管理', path: '/admin/users', action: 'manage_users' as const },
  ];

  const visibleMain = mainLinks.filter(l => !l.action || can(l.action));
  const visibleMenu = menuLinks.filter(l => can(l.action));
  const drawerLinks = visibleMain.filter(l => l.label !== '---');

  return (
    <>
      <nav style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '0 16px', height: '48px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #e0e6f0',
        position: 'sticky', top: 0, zIndex: 100,
        overflow: 'hidden', // ← はみ出し防止
      }}>

        {/* ── PC: 横並びメニュー ── */}
        {!isSP && visibleMain.map((link, index) => {
          if (link.label === '---') {
            return (
              <span key={index} style={{
                width: '1px', height: '20px',
                backgroundColor: '#e0e6f0', margin: '0 4px', flexShrink: 0,
              }} />
            );
          }
          return (
            <button
              key={link.path}
              onClick={() => navigate(link.path!)}
              style={{
                padding: '8px 16px', borderRadius: '6px', border: 'none',
                cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                flexShrink: 0,
                backgroundColor: location.pathname === link.path ? '#4a78c4' : 'transparent',
                color: location.pathname === link.path ? '#fff' : '#5a6480',
              }}
            >
              {link.label}
            </button>
          );
        })}

        {/* ── SP: ロゴ ── */}
        {isSP && (
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e2740', flexShrink: 0 }}>
            PM
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <GlobalSearch />

          {/* SP: ロール表示は省略 */}
          {!isSP && (
            <span style={{ fontSize: '12px', color: '#96a0b8', flexShrink: 0 }}>
              {roleLabel[role ?? ''] ?? role}
            </span>
          )}

          {/* PC: 管理メニュー */}
          {!isSP && visibleMenu.length > 0 && (
            <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setMenuOpen(prev => !prev)}
                style={{
                  padding: '6px 10px', borderRadius: '6px', border: '1px solid #dde3f0',
                  cursor: 'pointer', fontSize: '16px', color: '#5a6480', backgroundColor: '#fff',
                  lineHeight: 1,
                }}
              >
                ☰
              </button>
              {menuOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                  backgroundColor: '#fff', border: '1px solid #e0e6f0',
                  borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  minWidth: '160px', overflow: 'hidden', zIndex: 200,
                }}>
                  {visibleMenu.map(link => (
                    <button
                      key={link.path}
                      onClick={() => { navigate(link.path); setMenuOpen(false); }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '10px 16px', border: 'none', borderBottom: '1px solid #f0f3f8',
                        cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                        backgroundColor: location.pathname === link.path ? '#f0f5ff' : '#fff',
                        color: location.pathname === link.path ? '#4a78c4' : '#5a6480',
                      }}
                    >
                      {link.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PC: ログアウト */}
          {!isSP && (
            <button
              onClick={() => logout()}
              style={{
                padding: '6px 12px', borderRadius: '6px', border: '1px solid #dde3f0',
                cursor: 'pointer', fontSize: '12px', color: '#5a6480', backgroundColor: '#fff',
                flexShrink: 0,
              }}
            >
              ログアウト
            </button>
          )}

          {/* SP: ハンバーガーボタン */}
          {isSP && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDrawerOpen(prev => !prev);
              }}
              style={{
                padding: '6px 10px', borderRadius: '6px', border: '1px solid #dde3f0',
                cursor: 'pointer', fontSize: '16px', color: '#5a6480', backgroundColor: '#fff',
                lineHeight: 1, flexShrink: 0,
              }}
            >
              ☰
            </button>
          )}
        </div>
      </nav>

      {/* ── SP ドロワー ── */}
      {isSP && drawerOpen && (
        <div style={{
          position: 'fixed', top: '48px', left: 0, right: 0, bottom: 0,
          zIndex: 99,
        }}>
          {/* 背景オーバーレイ */}
          <div
            onClick={() => setDrawerOpen(false)}
            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)' }}
          />
          {/* ドロワー本体 */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            backgroundColor: '#fff', borderBottom: '1px solid #e0e6f0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          }}>
            {/* ロール表示 */}
            <div style={{
              padding: '12px 24px 8px',
              fontSize: '12px', color: '#96a0b8',
              borderBottom: '1px solid #f0f3f8',
            }}>
              {roleLabel[role ?? ''] ?? role}
            </div>

            {/* ナビリンク */}
            {drawerLinks.map(link => (
              <button
                key={link.path}
                onClick={() => { navigate(link.path!); setDrawerOpen(false); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '14px 24px', border: 'none', borderBottom: '1px solid #f0f3f8',
                  cursor: 'pointer', fontSize: '14px', fontWeight: 500,
                  backgroundColor: location.pathname === link.path ? '#f0f5ff' : '#fff',
                  color: location.pathname === link.path ? '#4a78c4' : '#5a6480',
                }}
              >
                {link.label}
              </button>
            ))}

            {/* 管理メニュー */}
            {visibleMenu.length > 0 && (
              <>
                <div style={{ height: '1px', backgroundColor: '#e0e6f0', margin: '4px 0' }} />
                {visibleMenu.map(link => (
                  <button
                    key={link.path}
                    onClick={() => { navigate(link.path); setDrawerOpen(false); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '14px 24px', border: 'none', borderBottom: '1px solid #f0f3f8',
                      cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                      backgroundColor: location.pathname === link.path ? '#f0f5ff' : '#fff',
                      color: location.pathname === link.path ? '#4a78c4' : '#5a6480',
                    }}
                  >
                    {link.label}
                  </button>
                ))}
              </>
            )}

            {/* ログアウト */}
            <div style={{ padding: '8px 16px 16px' }}>
              <button
                onClick={() => { logout(); setDrawerOpen(false); }}
                style={{
                  display: 'block', width: '100%',
                  padding: '12px 24px', border: '1px solid #dde3f0', borderRadius: '8px',
                  cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                  backgroundColor: '#fff', color: '#5a6480', textAlign: 'center',
                }}
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Header;