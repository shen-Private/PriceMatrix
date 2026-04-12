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
  const menuRef = useRef<HTMLDivElement>(null);

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
    { label: '改善提案', path: '/improvements', action: 'view_customers' as const },
    { label: '---' },
    { label: '在庫一覧', path: '/inventory', action: 'view_inventory' as const },
    { label: '---' },
    { label: 'ヘルプ', path: '/help', action: 'view_customers' as const },];

  const menuLinks = [
    { label: '商品マスタ管理', path: '/admin/products', action: 'manage_users' as const },
    { label: '社内アカウント管理', path: '/admin/users', action: 'manage_users' as const },
  ];

  const visibleMain = mainLinks.filter(l => !l.action || can(l.action));
  const visibleMenu = menuLinks.filter(l => can(l.action));

  return (
    <nav style={{
      display: 'flex', alignItems: 'center', gap: '4px',
      padding: '12px 24px', backgroundColor: '#fff',
      borderBottom: '1px solid #e0e6f0',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      {visibleMain.map((link, index) => {
        if (link.label === '---') {
          return (
            <span key={index} style={{
              width: '1px', height: '20px',
              backgroundColor: '#e0e6f0',
              margin: '0 4px',
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
              backgroundColor: location.pathname === link.path ? '#4a78c4' : 'transparent',
              color: location.pathname === link.path ? '#fff' : '#5a6480',
            }}
          >
            {link.label}
          </button>
        );
      })}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <GlobalSearch />
        <span style={{ fontSize: '12px', color: '#96a0b8' }}>
          {roleLabel[role ?? ''] ?? role}
        </span>

        {visibleMenu.length > 0 && (
          <div ref={menuRef} style={{ position: 'relative' }}>
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

        <button
          onClick={() => logout()}
          style={{
            padding: '6px 12px', borderRadius: '6px', border: '1px solid #dde3f0',
            cursor: 'pointer', fontSize: '12px', color: '#5a6480', backgroundColor: '#fff',
          }}
        >
          ログアウト
        </button>
      </div>
    </nav>
  );
}

export default Header;