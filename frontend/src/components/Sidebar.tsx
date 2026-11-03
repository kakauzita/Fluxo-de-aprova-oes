import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, ChevronDown, ChevronRight, FileText, Settings, CheckSquare, Sparkles, Menu } from 'lucide-react'
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
                {Icon && <Icon size={14} aria-hidden="true" />}
                {label}
            </NavLink>
        )
    }
    return (
        <button className={`sidebar-nav-item${active ? ' active' : ''}`} onClick={onClick}>
            {Icon && <Icon size={14} aria-hidden="true" />}
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
            {/* Skip Link — eMAG 1.1 e WCAG 2.4.1 */}
            <a href="#main-content" className="skip-link">
                Pular para o conteúdo principal
            </a>

            {/* ── Header ────────────────────────────── */}
            <header className="app-header" style={{ height: '56px', padding: '0 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        className="header-menu-btn"
                        aria-label="Menu principal de navegação"
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2px',
                            cursor: 'pointer',
                            padding: '4px',
                            fontFamily: 'inherit',
                            opacity: 0.9
                        }}
                    >
                        <Menu size={20} aria-hidden="true" />
                        <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'none' }}>Menu</span>
                    </button>
                    <div className="header-brand" style={{ gap: '16px', display: 'flex', alignItems: 'center' }}>
                        {/* Caixa X Logo */}
                        <svg
                            role="img"
                            aria-label="Logotipo da CAIXA"
                            viewBox="66 -1 46 33"
                            style={{ height: '20px', width: 'auto', display: 'block' }}
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <title>Logotipo da CAIXA</title>
                            <g transform="matrix(2.92153 0 0 2.92153 -838.161 -441.968)">
                                <path d="M310.18 161.61h4.41l4.83-4.84h-4.41zM318.42 153.36l1.49 2.92 4.83-4.83h-4.41z" fill="#f7941d" />
                                <path d="M319.91 156.28h-4.41l-2.46-4.83h4.41z" fill="#FFFFFF" fillRule="evenodd" />
                                <path d="M321.88 161.61h-4.41l-.97-1.92 2.92-2.92z" fill="#FFFFFF" fillRule="evenodd" />
                            </g>
                        </svg>
                        <div className="header-divider" style={{ background: 'rgba(255, 255, 255, 0.4)' }} />
                        <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.3px' }}>Gestão de campanhas</span>
                    </div>
                </div>
                <div className="header-user" style={{ gap: '20px', display: 'flex', alignItems: 'center' }}>
                    <div className="header-user-info" style={{ textAlign: 'right' }}>
                        <div className="header-user-name" style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                            <span>Olá {user?.nome}</span>
                            <span style={{ fontSize: '9px', opacity: 0.9 }}>▼</span>
                        </div>
                        <div className="header-user-role" style={{ fontSize: '11px', opacity: 0.95, marginTop: '2px', color: '#ffffff' }}>
                            {user?.perfil === 'ADMIN' ? 'Administrador' :
                                user?.perfil === 'SOLICITANTE' ? 'Solicitante' : 'Aprovador'} - {user?.codigo}
                        </div>
                    </div>
                    <button
                        className="header-logout"
                        onClick={handleLogout}
                        aria-label="Sair da conta"
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2px',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            opacity: 0.95
                        }}
                    >
                        <LogOut size={20} aria-hidden="true" />
                        <span>Sair</span>
                    </button>
                </div>
            </header>

            {/* ── Sub-header ───────────────────────── */}
            <div className="sub-header" style={{ padding: '6px 20px', fontSize: '12px' }}>
                <strong>Conteúdo</strong> #INTERNO.CAIXA
            </div>

            {/* ── Body ─────────────────────────────── */}
            <div className="app-body">
                {/* Sidebar */}
                <nav className="sidebar" aria-label="Navegação principal">
                    <div className="sidebar-search">
                        <input
                            className="sidebar-search-input"
                            placeholder="Pesquisar"
                            aria-label="Pesquisar opções do menu"
                        />
                    </div>
                    <div className="sidebar-nav">
                        {user?.perfil === 'SOLICITANTE' && (
                            <>
                                <NavItem to="/pecas" label="Peça de comunicação" icon={FileText} />
                                <NavItem to="/campanhas/nova" label="Criar campanha" icon={Sparkles} />
                            </>
                        )}
                        {user?.perfil === 'ADMIN' && (
                            <>
                                <NavItem to="/pecas-admin" label="Peça de comunicação" icon={FileText} />
                                <button
                                    className="sidebar-nav-item"
                                    onClick={() => setConfigOpen(o => !o)}
                                    aria-expanded={configOpen}
                                    aria-controls="submenu-configuracoes"
                                    style={{ justifyContent: 'space-between' }}
                                >
                                    <span className="flex items-center gap-2"><Settings size={14} aria-hidden="true" /> Configurações</span>
                                    {configOpen ? <ChevronDown size={13} aria-hidden="true" /> : <ChevronRight size={13} aria-hidden="true" />}
                                </button>
                                {configOpen && (
                                    <div id="submenu-configuracoes" className="sidebar-nav-sub">
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
                <main id="main-content" tabIndex={-1} className="main-content" style={{ outline: 'none' }}>
                    {children}
                </main>
            </div>
        </div>
    )
}
