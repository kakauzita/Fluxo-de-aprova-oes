import { useState, useEffect } from 'react'
import { Plus, Loader2, Search, Target, Trash2, X } from 'lucide-react'
import { api } from '../../lib/api'

interface Unidade {
    id: string
    codigo: string
    sigla: string
    nome: string
    ativo: boolean
}

function useToast() {
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
    function show(msg: string, type: 'success' | 'error' = 'success') {
        setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
    }
    return { toast, show }
}

export default function UnidadesPage() {
    const [unidades, setUnidades] = useState<Unidade[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [showAdd, setShowAdd] = useState(false)
    const [codigo, setCodigo] = useState('')
    const [sigla, setSigla] = useState('')
    const [nome, setNome] = useState('')
    const [saving, setSaving] = useState(false)
    const { toast, show } = useToast()

    useEffect(() => { load() }, [])

    async function load() {
        setLoading(true)
        const { data } = await api.get('/admin/unidades')
        setUnidades(data)
        setLoading(false)
    }

    const filtered = unidades.filter(u =>
        u.codigo.includes(search) ||
        u.sigla.toLowerCase().includes(search.toLowerCase()) ||
        u.nome.toLowerCase().includes(search.toLowerCase())
    )

    async function criar() {
        if (!codigo.trim() || !sigla.trim() || !nome.trim()) return
        setSaving(true)
        try {
            await api.post('/admin/unidades', { codigo, sigla, nome })
            setCodigo(''); setSigla(''); setNome('')
            setShowAdd(false); await load(); show('Unidade cadastrada!')
        } catch (e: any) { show(e.response?.data?.error ?? 'Erro ao criar.', 'error') }
        finally { setSaving(false) }
    }

    async function toggleAtivo(u: Unidade) {
        try {
            await api.patch(`/admin/unidades/${u.id}`, { ativo: !u.ativo })
            await load(); show(u.ativo ? 'Unidade desativada.' : 'Unidade reativada.')
        } catch (e: any) { show(e.response?.data?.error ?? 'Erro.', 'error') }
    }

    return (
        <div className="main-inner">
            {/* Breadcrumb */}
            <div className="breadcrumb">
                <span className="breadcrumb-item">Home</span>
                <span className="breadcrumb-sep">›</span>
                <span className="breadcrumb-item current">Unidades</span>
            </div>

            <h1 className="page-title">Unidades</h1>
            <p className="page-subtitle">Gerencie as unidades disponíveis para compor os grupos de aprovadores</p>

            <div className="info-banner mb-4">
                <Target size={16} style={{ flexShrink: 0, marginTop: 1, color: 'var(--caixa-blue)' }} />
                <div>
                    Unidades cadastradas aqui ficam disponíveis para serem vinculadas aos <strong>Grupos de Aprovadores</strong>.
                    Cada unidade é identificada por <strong>Código</strong>, <strong>Sigla</strong> e <strong>Nome</strong>.
                </div>
            </div>

            <div className="toolbar">
                <div className="search-input-wrap">
                    <Search size={14} />
                    <input className="search-input" placeholder="Buscar por código, sigla ou nome" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <button id="btn-nova-unidade" className="btn btn-primary" onClick={() => setShowAdd(true)}>
                    <Plus size={14} /> Nova Unidade
                </button>
            </div>

            {loading ? (
                <div className="loading-center"><div className="spinner" /></div>
            ) : (
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: 100 }}>Código</th>
                            <th style={{ width: 120 }}>Sigla</th>
                            <th>Nome</th>
                            <th style={{ width: 100 }}>Status</th>
                            <th style={{ width: 80 }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Nenhuma unidade cadastrada</td></tr>
                        ) : filtered.map(u => (
                            <tr key={u.id}>
                                <td><span style={{ fontWeight: 700 }}>{u.codigo}</span></td>
                                <td><span style={{ fontWeight: 700, color: 'var(--caixa-blue)' }}>{u.sigla}</span></td>
                                <td style={{ color: u.ativo ? 'var(--text-primary)' : 'var(--text-muted)' }}>{u.nome}</td>
                                <td>
                                    <span style={{
                                        fontSize: 11, fontWeight: 600,
                                        color: u.ativo ? '#166534' : '#6b7280',
                                        background: u.ativo ? '#dcfce7' : '#f3f4f6',
                                        border: `1px solid ${u.ativo ? '#86efac' : '#d1d5db'}`,
                                        borderRadius: 4, padding: '1px 8px',
                                    }}>
                                        {u.ativo ? 'Ativa' : 'Inativa'}
                                    </span>
                                </td>
                                <td>
                                    <button
                                        className={u.ativo ? 'btn-icon-delete' : 'btn-icon-edit'}
                                        title={u.ativo ? 'Desativar' : 'Reativar'}
                                        onClick={() => toggleAtivo(u)}
                                    >
                                        {u.ativo ? <Trash2 size={14} /> : <Plus size={14} />}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {showAdd && (
                <div className="modal-overlay" onClick={() => setShowAdd(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Nova Unidade</h3>
                            <button className="modal-close" onClick={() => setShowAdd(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Código</label>
                                <input id="input-codigo-unidade" className="form-input" value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Ex: 5361" autoFocus />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Sigla</label>
                                <input id="input-sigla-unidade" className="form-input" value={sigla} onChange={e => setSigla(e.target.value.toUpperCase())} placeholder="Ex: GECRM" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Nome</label>
                                <input id="input-nome-unidade" className="form-input" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Gerência de CRM" />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancelar</button>
                            <button id="btn-criar-unidade" className="btn btn-primary" onClick={criar} disabled={saving || !codigo.trim() || !sigla.trim() || !nome.trim()}>
                                {saving ? <Loader2 size={14} className="animate-spin" /> : null} Cadastrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
        </div>
    )
}
