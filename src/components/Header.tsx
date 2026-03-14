import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const roleLabel: Record<string, string> = {
  admin: '管理員', warehouse: '倉庫人員', sales: '業務', cs: 'CS',
};

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, logout, can } = useAuth();

  const allLinks = [
    { label: '帳號管理', path: '/admin/users', action: 'manage_users' as const },
    { label: '折扣管理',   path: '/pricing',           action: 'view_pricing'   as const },
    { label: '庫存總覽',   path: '/inventory',         action: 'view_inventory' as const },
    { label: '掃碼入出庫', path: '/inventory/scan',    action: 'scan_inventory' as const },
    // { label: '入出庫歷史', path: '/inventory/history', action: 'view_inventory' as const },
  ];

  const visibleLinks = allLinks.filter(l => can(l.action));

  return (
    <nav style={{
      display: 'flex', alignItems: 'center', gap: '4px',
      padding: '12px 24px', backgroundColor: '#fff',
      borderBottom: '1px solid #e0e6f0',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      {visibleLinks.map(link => (
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

      {/* 右側：目前角色 + 切換身份 */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '12px', color: '#96a0b8' }}>
          {roleLabel[role ?? ''] ?? role}
        </span>
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