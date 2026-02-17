import { useState } from 'react';
import { useEffect } from 'react';
import axios from 'axios';

function CustomerSearch({ onSearch }) {
    const [searchText, setSearchText] = useState('');
    const [customers, setCustomers] = useState([]);
    useEffect(() => {
        axios.get('http://localhost:8080/customers')
            .then(response => {
                setCustomers(response.data);
                console.log('客戶資料：', response.data);
            })
            .catch(error => {
                console.error('API 錯誤：', error);
            });
    }, []);
    const handleSearch = () => {
        onSearch(searchText);  // ← 呼叫父元件傳來的函數
    };

    return (
        <div>
            <h2>客戶搜尋</h2>
            <input
                type="text"
                placeholder="輸入客戶名稱..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
            />
            <button onClick={handleSearch}>搜尋</button>
            <div>
                <h3>客戶列表：</h3>
                <ul>
                    {customers.map(customer => (
                        <li key={customer.id}>
                            {customer.name} - {customer.email}
                        </li>
                    ))}
                </ul>
            </div>
            <p>你輸入的是：{searchText}</p>
        </div>
    );
}

export default CustomerSearch;