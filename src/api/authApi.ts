import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'
export interface LoginResponse {
  username: string;
  role: string;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await axios.post(`${API_BASE}/api/auth/login`, 
    { username, password },
    { withCredentials: true }
  );
  return res.data;
}

export async function logout(): Promise<void> {
  await axios.post(`${API_BASE}/api/auth/logout`, {}, { withCredentials: true });
}