import type { ReactNode } from 'react'
import { createContext, useContext, useState } from 'react'
import { api } from '../lib/api'

export interface AuthUser {
    id: string
    codigo: string
    nome: string
    email: string
    perfil: 'ADMIN' | 'SOLICITANTE' | 'APROVADOR'
}

interface AuthContextValue {
    user: AuthUser | null
    token: string | null
    login: (email: string, senha: string) => Promise<void>
    logout: () => void
    isLoading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(() => {
        try { return JSON.parse(localStorage.getItem('user') ?? 'null') } catch { return null }
    })
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
    const [isLoading, setIsLoading] = useState(false)

    async function login(email: string, senha: string) {
        setIsLoading(true)
        try {
            const { data } = await api.post('/auth/login', { email, senha })
            localStorage.setItem('token', data.token)
            localStorage.setItem('user', JSON.stringify(data.usuario))
            setToken(data.token)
            setUser(data.usuario)
        } finally {
            setIsLoading(false)
        }
    }

    function logout() {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setToken(null)
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
