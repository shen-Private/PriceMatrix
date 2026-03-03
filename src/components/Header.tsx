import { useNavigate, useLocation } from 'react-router-dom';

function Header() {
    const navigate = useNavigate();
    const location = useLocation();

    const links = [
        { label: '折扣管理', path: '/pricing' },
        { label: '庫存總覽', path: '/inventory' },
        { label: '掃碼入出庫', path: '/inventory/scan' },
        { label: '入出庫歷史', path: '/inventory/history' },
    ];

    return (
        <nav style={{
            display: 'flex', gap: '4px', padding: '12px 24px',
            backgroundColor: '#fff', borderBottom: '1px solid #e0e6f0',
            position: 'sticky', top: 0, zIndex: 100
        }}>
            {links.map(link => (
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
        </nav>
    );
}

export default Header;