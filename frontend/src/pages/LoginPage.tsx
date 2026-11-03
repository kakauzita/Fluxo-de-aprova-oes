import React, { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
    const { login, isLoading } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [senha, setSenha] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        try {
            await login(email, senha)
            navigate('/')
        } catch (err: any) {
            if (!err?.response) {
                setError('⚠️ Não foi possível conectar ao servidor. Certifique-se de que o backend está rodando.')
            } else if (err?.response?.status === 401) {
                setError('E-mail ou senha inválidos.')
            } else {
                setError(err?.response?.data?.error ?? 'Erro inesperado.')
            }
        }
    }

    return (
        <div className="login-wrap">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">CX</div>
                    <h1 className="login-title">Gestão de campanhas</h1>
                    <p className="login-subtitle">Sistema de Aprovação de Peças de Comunicação</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email" className="form-label">E-mail</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="username"
                            className="form-input"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="senha" className="form-label">Senha</label>
                        <div className="relative">
                            <input
                                id="senha"
                                name="senha"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                className="form-input"
                                placeholder="••••••••"
                                value={senha}
                                onChange={e => setSenha(e.target.value)}
                                required
                                style={{ paddingRight: 40 }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                                aria-pressed={showPassword}
                                style={{
                                    position: 'absolute', right: 10, top: '50%',
                                    transform: 'translateY(-50%)', background: 'none',
                                    border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', padding: '4px'
                                }}
                            >
                                {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="login-error" role="alert" aria-live="assertive">
                            {error}
                        </div>
                    )}

                    <button
                        id="btn-login"
                        type="submit"
                        className="btn btn-primary w-full"
                        style={{ justifyContent: 'center', padding: '11px', fontSize: 14, marginBottom: 4 }}
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 size={15} className="animate-spin" style={{ animation: 'spin 0.6s linear infinite' }} /> : null}
                        {isLoading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>

                <div className="login-demo">
                    <strong>Credenciais de demo — senha: senha123</strong>
                    <span>admin@empresa.com → Administrador</span><br />
                    <span>carla@empresa.com → Solicitante</span><br />
                    <span>aprovador1@empresa.com → Aprovador</span><br />
                    <span>juridico@empresa.com → Aprovador (Universal)</span>
                </div>
            </div>
        </div>
    )
}
