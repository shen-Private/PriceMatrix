/* eslint-disable */
// import { useState, useEffect } from 'react';
// import { motion } from 'framer-motion';
// import axios from 'axios';
// import { background } from 'storybook/theming';

// function UserCard() {
//     const products = [
//         { id: 1, name: "蘋果", price: 30 },
//         { id: 2, name: "香蕉", price: 15 },
//         { id: 3, name: "西瓜", price: 80 },
//     ];
    
//     return (
//         <div>
//             {products.map(product => {
//             let TextColor = product.price > 50 ? "red" : "";

//                 return (
//                     <p key={product.id} style={{ color: TextColor }}>
//                        {product.name} - ${product.price}
//                     </p>
//                 );
//             })}
//         </div>
//     )
// }

// function Practice() {
//     return (
//         <div>
//             <UserCard />
//         </div>
//     );
// }


// function DateAPPtest() {
//     const [categories, setCategories] = useState([]);

//     useEffect(() => {
//         axios.get('http://localhost:8080/api/categories')
//             .then(response => {
//                 setCategories(response.data);
//             });
//     }, []);

//     return (
//         <div>
//             {categories.map(category => {
//                 let bgColor;
//                 if (category.name === "家電") {
//                     bgColor = "red";
//                 } else if (category.name === "零食") {
//                     bgColor = "blue";
//                 }

//                 return (
//                     <p key={category.id} style={{ backgroundColor: bgColor }}>
//                         {category.name}
//                     </p>
//                 );
//             }
//             )
//             }
//         </div>
//     );
// }
// // function ChildTest({ className }) {
// //     let displayText;
// //     if (className === "name1") {
// //         displayText = "我是傻逼";
// //     } else if (className === "name2") {
// //         displayText = "我是天才";
// //     }

// //     return (
// //         <>
// //             {displayText}

// //         </>
// //     );
// // }

// // function Practice() {
// //     const [buttontest, buttonchange] = useState(0);
// //     const [isHover, setIsHover] = useState(false);
// //     const [isTransfrom, setTreansfrom] = useState(false);
// //     const [isActive, setIsActive] = useState(false);
// //     return (

// //         <motion.button
// //             onClick={() => setIsActive(!isActive)}
// //             style={{
// //                 backgroundColor: isActive ? "red" : "blue",
// //                 scale: isActive ? 1.2 : 1
// //             }}

// //         >
// //             數字增加{(buttontest)}
// //         </motion.button>
// //     );
// // }
// // function Practice() {
// //     const [buttontest, buttonchange] = useState(0);
// //     const [isHover, setIsHover] = useState(false); 
// //     const [isTransfrom, setTreansfrom] = useState(false); 
// //     return (
// //         <motion.button
// //             onMouseEnter={() => setIsHover(true)}
// //             onMouseLeave={() => setIsHover(false)}
// //             onClick={() => buttonchange(buttontest + 1)}
// //             style={{ backgroundColor: isHover ? "red" : "" }}

// //         >
// //             數字增加{(buttontest)}
// //         </motion.button>
// //     );
// // }



// // ============================================
// // 第一層 component：只管視覺互動，不知道外面的世界
// // ============================================
// function StockTypeButton({ label, color, isSelected, onClick }) {
//     const [isHover, setIsHover] = useState(false);

//     return (
//         <button
//             onMouseEnter={() => setIsHover(true)}
//             onMouseLeave={() => setIsHover(false)}
//             onClick={onClick}                          // 「發生了什麼」交給外層決定
//             style={{
//                 backgroundColor: isSelected
//                     ? color                                // 選中：實色
//                     : isHover ? color + '44' : color + '22' // hover：半透明，預設：更淡
//             }}
//         >StockTypeButton
//             {label}
//         </button>
//     );
// }
// // ============================================
// // 第二層 component：管資料和 API，不管 hover 怎麼運作
// // ============================================
// const STOCK_TYPE_LABEL = {
//     internal: '內部庫存',
//     outsource_infinite: '外包無限',
//     outsource_warehouse: '外包倉儲',
//     outsource_dropship: '直送',
// };
// const COLORS = ['red', 'blue', 'green', 'yellow'];

// function Datetest() {
//     const [clickCount, setClickCount] = useState(0);

//     return (
//         <div>
//             {Object.keys(STOCK_TYPE_LABEL).map(k => (
//                 <p
//                     key={k}
//                     style={{ color: k === 'internal' ? COLORS[clickCount % COLORS.length] : 'black' }}
//                     onClick={() => setClickCount(clickCount + 1)}
//                 >
//                     {STOCK_TYPE_LABEL[k]}
//                 </p>
//             ))}
//         </div>
//     );
// }
// export default Practice;