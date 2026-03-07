import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../AuthContext";

interface User {
    id: number;
    username: string;
    role: string;
    isActive: boolean;
}

const API = `${process.env.REACT_APP_API_URL}/api/admin/users`;

const roleOptions = ["admin", "warehouse", "sales", "cs"];

export default function AdminUserPanel() {
    const { username } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [newUsername, setNewUsername] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newRole, setNewRole] = useState("sales");

    const fetchUsers = () =>
        axios.get(API, { withCredentials: true }).then((res) => setUsers(res.data));

    useEffect(() => { fetchUsers(); }, []);

    const handleCreate = async () => {
        if (!newUsername || !newPassword) return;
        await axios.post(API, { username: newUsername, password: newPassword, role: newRole }, { withCredentials: true });
        setNewUsername("");
        setNewPassword("");
        fetchUsers();
    };

    const handleToggleStatus = async (id: number, current: boolean) => {
        await axios.patch(`${API}/${id}/status`, { active: !current }, { withCredentials: true });
        fetchUsers();
    };

    const handleResetPassword = async (id: number) => {
        const newPass = prompt("輸入新密碼");
        if (!newPass) return;
        await axios.patch(`${API}/${id}/password`, { newPassword: newPass }, { withCredentials: true });
        alert("密碼已重設");
    };

    const inputStyle: React.CSSProperties = {
        padding: "8px 12px", borderRadius: "6px",
        border: "1px solid #dde3f0", fontSize: "13px", outline: "none",
    };

    const btnStyle = (variant: "primary" | "danger" | "default"): React.CSSProperties => ({
        padding: "6px 12px", borderRadius: "6px", border: "none",
        cursor: "pointer", fontSize: "12px", fontWeight: 500,
        backgroundColor: variant === "primary" ? "#4a78c4" : variant === "danger" ? "#e05c5c" : "#f0f2f8",
        color: variant === "default" ? "#5a6480" : "#fff",
    });

    return (
        <div style={{ padding: "2rem", maxWidth: "700px", margin: "0 auto" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#2c3554", marginBottom: "1.5rem" }}>帳號管理</h2>

            {/* 新增帳號 */}
            <div style={{
                display: "flex", gap: "8px", marginBottom: "1.5rem",
                padding: "16px", backgroundColor: "#f8f9fd", borderRadius: "8px",
            }}>
                <input style={inputStyle} placeholder="帳號" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
                <input style={inputStyle} placeholder="密碼" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <select style={inputStyle} value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                    {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <button style={btnStyle("primary")} onClick={handleCreate}>新增</button>
            </div>

            {/* 帳號列表 */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                    <tr style={{ borderBottom: "2px solid #e0e6f0", color: "#96a0b8", textAlign: "left" }}>
                        <th style={{ padding: "8px 12px" }}>帳號</th>
                        <th style={{ padding: "8px 12px" }}>角色</th>
                        <th style={{ padding: "8px 12px" }}>狀態</th>
                        <th style={{ padding: "8px 12px" }}>操作</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <tr key={user.id} style={{ borderBottom: "1px solid #f0f2f8" }}>
                            <td style={{ padding: "10px 12px", color: "#2c3554", fontWeight: 500 }}>{user.username}</td>
                            <td style={{ padding: "10px 12px", color: "#5a6480" }}>{user.role}</td>
                            <td style={{ padding: "10px 12px" }}>
                                <span style={{
                                    padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600,
                                    backgroundColor: user.isActive ? "#e8f5e9" : "#fce4e4",
                                    color: user.isActive ? "#388e3c" : "#e05c5c",
                                }}>
                                    {user.isActive ? "啟用" : "停用"}
                                </span>
                            </td>
                            <td style={{ padding: "10px 12px", display: "flex", gap: "6px" }}>
                                <button
                                    style={btnStyle(user.isActive ? "danger" : "default")}
                                    onClick={() => handleToggleStatus(user.id, user.isActive)}
                                    disabled={user.username === username}
                                    hidden={user.username === username}
                                >
                                    {user.isActive ? "停用" : "啟用"}
                                </button>
                                <button style={btnStyle("default")} onClick={() => handleResetPassword(user.id)}>重設密碼</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}