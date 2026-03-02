import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Users, Star, Building, UserRound, X, Loader2, ShieldCheck } from 'lucide-react'
import { api } from '../../lib/api'

interface Grupo {
    id: string
    nome: string
    isUniversal: boolean
    ativo: boolean
    grupoUnidades: { unidade: { id: string; codigo: string; nome: string } }[]
    grupoUsuarios: { usuario: { id: string; codigo: string; nome: string } }[]
}

interface Usuario {
    id: string
    codigo: string
    nome: string
    perfil: string
}

export default function GruposPage() {
    const [grupos, setGrupos] = useState<Grupo[]>([])
    const [usuarios, setUsuarios] = useState<Usuario[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showMembersModal, setShowMembersModal] = useState<Grupo | null>(null)
    const [editingGrupo, setEditingGrupo] = useState<Grupo | null>(null)
    const [editNome, setEditNome] = useState('')
    const [nome, setNome] = useState('')
    const [codigoUnidade, setCodigoUnidade] = useState('')
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

    useEffect(() => { load() }, [])

    async function load() {
        try {
            setLoading(true)
            const [g, u] = await Promise.all([api.get('/admin/grupos'), api.get('/usuarios')])
            setGrupos(g.data)
            setUsuarios(u.data)
        } finally { setLoading(false) }
    }

    function showToast(msg: string, type: 'success' | 'error' = 'success') {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    async function criarGrupo() {
        if (!nome.trim()) return
        setSaving(true)
        try {
            await api.post('/admin/grupos', { nome })
            setNome('')
            setShowModal(false)
            await load()
            showToast('Grupo criado com sucesso!')
        } catch (e: any) {
            showToast(e.response?.data?.error ?? 'Erro ao criar grupo.', 'error')
        } finally { setSaving(false) }
    }

    async function toggleUniversal(grupo: Grupo) {
        try {
            if (grupo.isUniversal) {
                await api.delete(`/admin/grupos/${grupo.id}/universal`)
                showToast('Grupo removido do modo Universal.')
            } else {
                await api.post(`/admin/grupos/${grupo.id}/universal`)
                showToast('Grupo definido como Universal!')
            }
            await load()
        } catch (e: any) {
            showToast(e.response?.data?.error ?? 'Erro.', 'error')
        }
    }

    function abrirEdicao(grupo: Grupo) {
        setEditingGrupo(grupo)
        setEditNome(grupo.nome)
    }

    async function salvarEdicao() {
        if (!editingGrupo || !editNome.trim()) return
        setSaving(true)
        try {
            await api.put(`/admin/grupos/${editingGrupo.id}`, { nome: editNome })
            setEditingGrupo(null)
            setEditNome('')
            await load()
            showToast('Grupo atualizado com sucesso!')
        } catch (e: any) {
            showToast(e.response?.data?.error ?? 'Erro ao atualizar grupo.', 'error')
        } finally { setSaving(false) }
    }

    async function adicionarUnidade(grupoId: string) {
        if (!codigoUnidade.trim()) return
        try {
            await api.post(`/admin/grupos/${grupoId}/unidades`, { codigo: codigoUnidade })
            setCodigoUnidade('')
            await load()
            showToast('Unidade adicionada!')
        } catch (e: any) {
            showToast(e.response?.data?.error ?? 'Código inválido.', 'error')
        }
    }

    async function adicionarUsuario(grupoId: string, usuarioId: string) {
        try {
            await api.post(`/admin/grupos/${grupoId}/usuarios`, { usuarioId })
            await load()
            showToast('Usuário adicionado ao grupo!')
        } catch (e: any) {
            showToast(e.response?.data?.error ?? 'Erro.', 'error')
        }
    }

    async function removerUnidade(grupoId: string, unidadeId: string) {
        await api.delete(`/admin/grupos/${grupoId}/unidades/${unidadeId}`)
        await load()
        showToast('Unidade removida.')
    }

    async function removerUsuario(grupoId: string, usuarioId: string) {
        await api.delete(`/admin/grupos/${grupoId}/usuarios/${usuarioId}`)
        await load()
        showToast('Usuário removido.')
    }

    const grupoAtualMembrosIds = showMembersModal?.grupoUsuarios.map(gu => gu.usuario.id) ?? []
    const aprovadoresDisponiveis = usuarios.filter(
        u => u.perfil === 'APROVADOR' && !grupoAtualMembrosIds.includes(u.id)
    )

    return (
        <div>
            <div className="page-header">
                <div className="header-row">
                    <div>
                        <h1 className="page-title">Aprovadores</h1>
                        <p className="page-description">Gerencie os aprovadores e seus membros (unidades e usuários)</p>
                    </div>
                    <div className="page-actions">
                        <button id="btn-novo-grupo" className="btn btn-primary" onClick={() => setShowModal(true)}>
                            <Plus size={16} /> Novo Grupo
                        </button>
                    </div>
                </div>
            </div>

            <div className="page-body">
                {loading ? (
                    <div className="empty-state"><Loader2 size={32} className="animate-spin" /></div>
                ) : grupos.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon"><Users size={40} /></div>
                        <div className="empty-state-title">Nenhum grupo cadastrado</div>
                        <div className="empty-state-text">Crie o primeiro grupo de aprovadores.</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {grupos.map(grupo => (
                            <div key={grupo.id} className="card">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 10,
                                            background: grupo.isUniversal
                                                ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
                                            border: `1px solid ${grupo.isUniversal ? 'rgba(59,130,246,0.3)' : 'var(--border-subtle)'}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {grupo.isUniversal ? <ShieldCheck size={18} color="var(--brand-400)" /> : <Users size={18} color="var(--text-muted)" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{grupo.nome}</span>
                                                {grupo.isUniversal && <span className="badge badge-universal">Universal</span>}
                                            </div>
                                            <div className="text-sm text-muted mt-1">
                                                {grupo.grupoUnidades.length} unidade(s) · {grupo.grupoUsuarios.length} usuário(s)
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            id={`btn-universal-${grupo.id}`}
                                            className={`btn btn-sm ${grupo.isUniversal ? 'btn-secondary' : 'btn-ghost'}`}
                                            onClick={() => toggleUniversal(grupo)}
                                            title={grupo.isUniversal ? 'Remover Universal' : 'Definir como Universal'}
                                        >
                                            <Star size={13} />
                                            {grupo.isUniversal ? 'Remover Universal' : 'Universal'}
                                        </button>
                                        <button
                                            id={`btn-editar-${grupo.id}`}
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => abrirEdicao(grupo)}
                                            title="Editar nome do grupo"
                                        >
                                            <Pencil size={13} /> Editar
                                        </button>
                                        <button
                                            id={`btn-membros-${grupo.id}`}
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => setShowMembersModal(grupo)}
                                        >
                                            <Users size={13} /> Membros
                                        </button>
                                    </div>
                                </div>

                                {/* Member chips */}
                                {(grupo.grupoUnidades.length > 0 || grupo.grupoUsuarios.length > 0) && (
                                    <div className="flex gap-2 mt-3" style={{ flexWrap: 'wrap' }}>
                                        {grupo.grupoUnidades.map(gu => (
                                            <span key={gu.unidade.id} style={{
                                                display: 'flex', alignItems: 'center', gap: 4,
                                                padding: '3px 8px', borderRadius: 6, fontSize: 11,
                                                background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                                                color: 'var(--text-secondary)'
                                            }}>
                                                <Building size={10} /> {gu.unidade.nome}
                                            </span>
                                        ))}
                                        {grupo.grupoUsuarios.map(gu => (
                                            <span key={gu.usuario.id} style={{
                                                display: 'flex', alignItems: 'center', gap: 4,
                                                padding: '3px 8px', borderRadius: 6, fontSize: 11,
                                                background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                                                color: 'var(--text-secondary)'
                                            }}>
                                                <UserRound size={10} /> {gu.usuario.nome}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Group Modal */}
            {editingGrupo && (
                <div className="modal-overlay" onClick={() => setEditingGrupo(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Editar Grupo</h3>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditingGrupo(null)}><X size={16} /></button>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nome do Grupo</label>
                            <input
                                id="input-editar-nome-grupo"
                                className="form-input"
                                value={editNome}
                                onChange={e => setEditNome(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && salvarEdicao()}
                                autoFocus
                            />
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setEditingGrupo(null)}>Cancelar</button>
                            <button
                                id="btn-salvar-grupo"
                                className="btn btn-primary"
                                onClick={salvarEdicao}
                                disabled={saving || !editNome.trim() || editNome.trim() === editingGrupo.nome}
                            >
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Group Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Novo Grupo</h3>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowModal(false)}><X size={16} /></button>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nome do Grupo</label>
                            <input id="input-nome-grupo" className="form-input" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Marketing Digital" autoFocus />
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button id="btn-criar-grupo" className="btn btn-primary" onClick={criarGrupo} disabled={saving || !nome.trim()}>
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                Criar Grupo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Members Modal */}
            {showMembersModal && (
                <div className="modal-overlay" onClick={() => setShowMembersModal(null)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Membros — {showMembersModal.nome}</h3>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowMembersModal(null)}><X size={16} /></button>
                        </div>

                        <div className="grid-2" style={{ gap: 20 }}>
                            {/* Unidades */}
                            <div>
                                <div className="font-semibold mb-3 flex items-center gap-2">
                                    <Building size={14} /> Unidades
                                </div>
                                <div className="flex gap-2 mb-3">
                                    <input
                                        id="input-codigo-unidade"
                                        className="form-input"
                                        placeholder="Código (ex: UN001)"
                                        value={codigoUnidade}
                                        onChange={e => setCodigoUnidade(e.target.value.toUpperCase())}
                                        style={{ flex: 1 }}
                                    />
                                    <button id="btn-add-unidade" className="btn btn-secondary btn-sm" onClick={() => adicionarUnidade(showMembersModal.id)}>
                                        <Plus size={14} />
                                    </button>
                                </div>
                                {showMembersModal.grupoUnidades.map(gu => (
                                    <div key={gu.unidade.id} className="approval-group-item mb-2">
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 500 }}>{gu.unidade.nome}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{gu.unidade.codigo}</div>
                                        </div>
                                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removerUnidade(showMembersModal.id, gu.unidade.id)}>
                                            <Trash2 size={13} color="var(--red-400)" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Usuários */}
                            <div>
                                <div className="font-semibold mb-3 flex items-center gap-2">
                                    <UserRound size={14} /> Usuários
                                </div>
                                <select
                                    id="select-usuario-grupo"
                                    className="form-select mb-3"
                                    onChange={e => { if (e.target.value) adicionarUsuario(showMembersModal.id, e.target.value); e.target.value = '' }}
                                    defaultValue=""
                                >
                                    <option value="">+ Adicionar usuário...</option>
                                    {aprovadoresDisponiveis.map(u => (
                                        <option key={u.id} value={u.id}>{u.nome} ({u.codigo})</option>
                                    ))}
                                </select>
                                {showMembersModal.grupoUsuarios.map(gu => (
                                    <div key={gu.usuario.id} className="approval-group-item mb-2">
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 500 }}>{gu.usuario.nome}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{gu.usuario.codigo}</div>
                                        </div>
                                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removerUsuario(showMembersModal.id, gu.usuario.id)}>
                                            <Trash2 size={13} color="var(--red-400)" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowMembersModal(null)}>Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className={`toast toast-${toast.type}`}>
                    {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
                </div>
            )}
        </div>
    )
}
