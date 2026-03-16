import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, Role } from './AuthContext';
import Header from './components/Header';
import DiscountPanel from './modules/pricing/DiscountPanel';
import InventoryPanel from './modules/inventory/InventoryPanel';
import ScanPanel from './modules/inventory/ScanPanel';
import TransactionHistory from './modules/inventory/TransactionHistory';
import AdminUserPanel from './modules/admin/AdminUserPanel';
import ProductMasterPanel from './modules/inventory/ProductMasterPanel';
import QuotePanel from './modules/sales/QuotePanel';
function LoginForm() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (e: any) {
      setError(e.response?.data?.error || '登入失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#f4f6fb', gap: '24px',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '22px', fontWeight: 700, color: '#2c3554' }}>PriceMatrix</div>
        <div style={{ fontSize: '13px', color: '#96a0b8', marginTop: '4px' }}>請登入以繼續</div>
      </div>

      <div style={{
        backgroundColor: '#fff', borderRadius: '12px', padding: '32px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.08)', width: '300px',
        display: 'flex', flexDirection: 'column', gap: '16px',
      }}>
        <input
          type="text"
          placeholder="帳號"
          value={username}
          onChange={e => setUsername(e.target.value)}
          style={{
            padding: '10px 14px', borderRadius: '8px',
            border: '1px solid #dde3f0', fontSize: '14px', outline: 'none',
          }}
        />
        <input
          type="password"
          placeholder="密碼"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{
            padding: '10px 14px', borderRadius: '8px',
            border: '1px solid #dde3f0', fontSize: '14px', outline: 'none',
          }}
        />
        {error && (
          <div style={{ fontSize: '12px', color: '#e05c5c', textAlign: 'center' }}>
            {error}
          </div>
        )}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            padding: '10px', borderRadius: '8px', border: 'none',
            backgroundColor: '#4a78c4', color: '#fff', fontSize: '14px',
            fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? '登入中...' : '登入'}
        </button>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { role, can } = useAuth();

  if (!role) return <LoginForm />;

  const defaultPath = can('view_pricing') ? '/pricing' : '/inventory';

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Navigate to={defaultPath} replace />} />
        {can('view_pricing')   && <Route path="/pricing"           element={<DiscountPanel />} />}
        {can('view_inventory') && <Route path="/inventory"         element={<InventoryPanel />} />}
        {can('scan_inventory') && <Route path="/inventory/scan"    element={<ScanPanel />} />}
        {can('view_inventory') && <Route path="/inventory/history" element={<TransactionHistory />} />}
        {role === 'admin' && <Route path="/admin/users" element={<AdminUserPanel />} />}
        {role === 'admin' && <Route path="/admin/products" element={<ProductMasterPanel />} />}
        {can('view_pricing') && <Route path="/quotes" element={<QuotePanel />} />}
        <Route path="*" element={<Navigate to={defaultPath} replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;