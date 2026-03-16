import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const roleLabel: Record<string, string> = {
  admin: '管理員', warehouse: '倉庫人員', sales: '業務', cs: 'CS',
};

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, logout, can } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 點選選單外側自動關閉
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
    { label: '折扣管理',   path: '/pricing',        action: 'view_pricing'   as const },
    { label: '庫存總覽',   path: '/inventory',      action: 'view_inventory' as const },
    // { label: '掃碼入出庫', path: '/inventory/scan', action: 'scan_inventory' as const },
    { label: '報價單', path: '/quotes', action: 'view_pricing' as const },
  ];

  const menuLinks = [
    { label: '商品主檔管理', path: '/admin/products', action: 'manage_users' as const },
    { label: '帳號管理',     path: '/admin/users',    action: 'manage_users' as const },
  ];

  const visibleMain = mainLinks.filter(l => can(l.action));
  const visibleMenu = menuLinks.filter(l => can(l.action));

  return (
    <nav style={{
      display: 'flex', alignItems: 'center', gap: '4px',
      padding: '12px 24px', backgroundColor: '#fff',
      borderBottom: '1px solid #e0e6f0',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      {visibleMain.map(link => (
        <button
          key={link.path}
          onClick={() => navigate(link.path)}
          style={{
            padding: '8px 16px', borderRadius: '6px', border: 'none',
            cursor: 'pointer', fontSize: '13px', fontWeight: 500,
            backgroundColor: location.pathname === link.path ? '#4a78c4' : 'transparent',
            color: location.pathname === link.path ? '#fff' : '#5a6480',
          }}
        >
          {link.label}
        </button>
      ))}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '12px', color: '#96a0b8' }}>
          {roleLabel[role ?? ''] ?? role}
        </span>

        {/* 漢堡排選單 */}
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
          登出
        </button>
      </div>
    </nav>
  );
}

export default Header;