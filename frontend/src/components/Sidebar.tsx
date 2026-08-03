import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, ChevronDown, ChevronRight, FileText, Settings, CheckSquare, Megaphone } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface NavItemProps {
    to?: string
    label: string
    icon?: React.ElementType
    onClick?: () => void
    active?: boolean
    sub?: boolean
}

function NavItem({ to, label, icon: Icon, onClick, active, sub }: NavItemProps) {
    if (to) {
        return (
            <NavLink to={to} className={({ isActive }) =>
                `sidebar-nav-item${isActive ? ' active' : ''}${sub ? ' sub' : ''}`
            }>
                {Icon && <Icon size={14} />}
                {label}
            </NavLink>
        )
    }
    return (
        <button className={`sidebar-nav-item${active ? ' active' : ''}`} onClick={onClick}>
            {Icon && <Icon size={14} />}
            <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
        </button>
    )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [configOpen, setConfigOpen] = React.useState(true)

    // const initials = user?.nome?.split(' ').slice(0, 2).map(n => n[0]).join('') ?? '?'

    function handleLogout() {
        logout()
        navigate('/login')
    }

    return (
        <div className="app-shell" style={{ flexDirection: 'column' }}>
            {/* ── Header ────────────────────────────── */}
            <header className="app-header">
                <div className="header-brand">
                    <div className="header-brand-logo">CX</div>
                    <div className="header-divider" />
                    <span>Gestão de campanhas</span>
                </div>
                <div className="header-user">
                    <div className="header-user-info">
                        <div className="header-user-name">Olá {user?.nome?.split(' ')[0]} {user?.nome?.split(' ').slice(-1)[0]} ▾</div>
                        <div className="header-user-role">
                            {user?.perfil === 'ADMIN' ? 'Administrador' :
                                user?.perfil === 'SOLICITANTE' ? 'Solicitante' : 'Aprovador'} —  {user?.codigo}
                        </div>
                    </div>
                    <button className="header-logout" onClick={handleLogout}>
                        <LogOut size={14} /> Sair
                    </button>
                </div>
            </header>

            {/* ── Sub-header ───────────────────────── */}
            <div className="sub-header">
                Conteúdo <strong>#INTERNO.CAIXA</strong>
            </div>

            {/* ── Body ─────────────────────────────── */}
            <div className="app-body">
                {/* Sidebar */}
                <nav className="sidebar">
                    <div className="sidebar-search">
                        <input className="sidebar-search-input" placeholder="Pesquisar" />
                    </div>
                    <div className="sidebar-nav">
                        {user?.perfil === 'SOLICITANTE' && (
                            <>
                                <NavItem to="/pecas" label="Peça de comunicação" icon={FileText} />
                                <NavItem 
                                    label="Gestão de campanhas" 
                                    icon={Megaphone} 
                                    onClick={() => window.location.href = '/campanhas/index.html'} 
                                />
                            </>
                        )}
                        {user?.perfil === 'ADMIN' && (
                            <>
                                <NavItem to="/pecas-admin" label="Peça de comunicação" icon={FileText} />
                                <NavItem 
                                    label="Gestão de campanhas" 
                                    icon={Megaphone} 
                                    onClick={() => window.location.href = '/campanhas/index.html'} 
                                />
                                <button
                                    className="sidebar-nav-item"
                                    onClick={() => setConfigOpen(o => !o)}
                                    style={{ justifyContent: 'space-between' }}
                                >
                                    <span className="flex items-center gap-2"><Settings size={14} /> Configurações</span>
                                    {configOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                </button>
                                {configOpen && (
                                    <div className="sidebar-nav-sub">
                                        <NavItem to="/admin/tipos-pecas" label="Tipos de peças" sub />
                                        <NavItem to="/aprovacoes/pendentes" label="Aprovação" sub />
                                        <NavItem to="/admin/unidades" label="Unidades" sub />
                                    </div>
                                )}
                            </>
                        )}
                        {user?.perfil === 'APROVADOR' && (
                            <>
                                <NavItem to="/aprovacoes/pendentes" label="Aprovação" icon={CheckSquare} />
                            </>
                        )}
                    </div>
                </nav>

                {/* Main */}
                <main className="main-content">
                    {children}
                </main>
            </div>
        </div>
    )
}
