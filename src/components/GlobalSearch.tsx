import { useState, useRef, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import styles from './GlobalSearch.module.css';

interface Customer { id: number; name: string; contactPerson: string; email: string; }
interface Quote { id: number; customerId: number; status: string; }
interface Product { id: number; name: string; }
interface SearchResult { customers: Customer[]; quotes: Quote[]; products: Product[]; }

type TabType = 'all' | 'customers' | 'quotes' | 'products';

export default function GlobalSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const API_BASE = import.meta.env.VITE_API_URL ?? '';
    const search = useDebouncedCallback(async (q: string) => {
        if (q.trim().length < 1) { setResults(null); setIsOpen(false); return; }
        const res = await axios.get(`${API_BASE}/api/search?q=${encodeURIComponent(q)}`, { withCredentials: true });
        setResults(res.data);
        setIsOpen(true);
    }, 300);

    // 點外部關閉
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        search(e.target.value);
    };

    const total = results
        ? results.customers.length + results.quotes.length + results.products.length
        : 0;
    const handleSelect = (type: string, id: number, keyword: string) => {
        setIsOpen(false);
        setQuery('');
        if (type === 'customer') navigate(`/customers?q=${encodeURIComponent(keyword)}`);
       if (type === 'quote') navigate(`/quotes?q=${encodeURIComponent(keyword)}`);
        if (type === 'product') navigate(`/inventory?q=${encodeURIComponent(keyword)}`);
    };

    return (
        <div ref={wrapperRef} className={styles.wrapper}>
            <input
                className={styles.input}
                type="text"
                placeholder="搜尋客戶、報價單、商品..."
                value={query}
                onChange={handleChange}
            />
            {isOpen && results && (
                <div className={styles.dropdown}>
                    {/* Tab */}
                    <div className={styles.tabs}>
                        {(['all', 'customers', 'quotes', 'products'] as TabType[]).map(tab => (
                            <button
                                key={tab}
                                className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab === 'all' && `全部 (${total})`}
                                {tab === 'customers' && `客戶 (${results.customers.length})`}
                                {tab === 'quotes' && `報價單 (${results.quotes.length})`}
                                {tab === 'products' && `商品 (${results.products.length})`}
                            </button>
                        ))}
                    </div>

                    {/* 結果清單 */}
                    <div className={styles.list}>
                        {(activeTab === 'all' || activeTab === 'customers') && results.customers.map(c => (
                            <div key={`c-${c.id}`} className={styles.item} onClick={() => handleSelect('customer', c.id, c.name)}>
                                <span className={styles.badge}>客戶</span>
                                <span>{c.name}</span>
                                {c.contactPerson && <span className={styles.sub}>{c.contactPerson}</span>}
                            </div>
                        ))}
                        {(activeTab === 'all' || activeTab === 'quotes') && results.quotes.map(q => (
                            <div key={`q-${q.id}`} className={styles.item} onClick={() => handleSelect('quote', q.id, String(q.id))}>
                                <span className={styles.badge}>報價單</span>
                                <span>Q#{q.id}</span>
                                <span className={styles.sub}>{q.status}</span>
                            </div>
                        ))}
                        {(activeTab === 'all' || activeTab === 'products') && results.products.map(p => (
                            <div key={`p-${p.id}`} className={styles.item} onClick={() => handleSelect('product', p.id, p.name)}>
                                <span className={styles.badge}>商品</span>
                                <span>{p.name}</span>
                            </div>
                        ))}
                        {total === 0 && <div className={styles.empty}>找不到結果</div>}
                    </div>
                </div>
            )}
        </div>
    );
}