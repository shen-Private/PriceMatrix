import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import DiscountPanel from './modules/pricing/DiscountPanel';
import InventoryPanel from './modules/inventory/InventoryPanel';
import ScanPanel from './modules/inventory/ScanPanel';
import TransactionHistory from './modules/inventory/TransactionHistory';

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/pricing" element={<DiscountPanel />} />
        <Route path="/inventory" element={<InventoryPanel />} />
        <Route path="/inventory/scan" element={<ScanPanel />} />
        <Route path="/inventory/history" element={<TransactionHistory />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;