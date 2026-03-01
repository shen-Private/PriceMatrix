import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DiscountPanel from './modules/pricing/DiscountPanel';
import InventoryPanel from './modules/inventory/InventoryPanel';
import ScanPanel from './modules/inventory/ScanPanel';
// import Practice from './modules/test/Practice';
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/pricing" element={<DiscountPanel />} />
        <Route path="/inventory" element={<InventoryPanel />} />
        <Route path="/inventory/scan" element={<ScanPanel />} />
        {/* <Route path="/test" element={<Practice />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;