import CustomerSearch from '../CustomerSearch';

// 告訴 Storybook 這個元件叫什麼、放在哪個分類
const meta = {
  title: 'PriceMatrix/CustomerSearch',
  component: CustomerSearch,
};

export default meta;

// Story 1：預設狀態
export const Default = {
  args: {
    onSearch: (text) => console.log('搜尋:', text),
  },
};