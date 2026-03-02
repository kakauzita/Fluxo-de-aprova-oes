import React, { useState, useEffect, useMemo } from 'react'
import {
    Shield, Users, Tag, ChevronDown, ChevronUp,
    Plus, Pencil, Trash2, Globe, Search, X, Loader2, AlertTriangle
} from 'lucide-react'
import { api } from '../../lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────
type Section = 'grupos' | 'publico' | 'assunto'

interface Usuario {
    id: string
    codigo: string
    nome: string
}

interface Grupo {
    id: string
    nome: string
    isUniversal: boolean
    ativo: boolean
    possuiVinculo: boolean
    vinculacoesNomes: string[]
    grupoUnidades: { unidade: { id: string; codigo: string; sigla: string; nome: string } }[]
    grupoUsuarios: { usuario: { id: string; codigo: string; nome: string } }[]
}

interface Unidade {
    id: string
    codigo: string
    sigla: string
    nome: string
    ativo: boolean
}

interface Segmento {
    id: string
    nome: string
    publicoAlvoId: string
    segmentoGrupos: { grupo: { id: string; nome: string } }[]
}

interface PublicoAlvo {
    id: string
    nome: string
    segmentos: Segmento[]
}

interface Assunto {
    id: string
    nome: string
    assuntoGrupos: { grupo: { id: string; nome: string } }[]
}

// ── Toast helper ──────────────────────────────────────────────────────────────
function useToast() {
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
    function show(msg: string, type: 'success' | 'error' = 'success') {
        setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
    }
    return { toast, show }
}

// ── Dropdown Multi Select ───────────────────────────────────────────────────────
function DropdownMultiSelect({
    opcoes,
    selecionados,
    onChange
}: {
    opcoes: { id: string, nome: string }[];
    selecionados: string[];
    onChange: (ids: string[]) => void;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div style={{ position: 'relative' }}>
            <div
                className="form-select"
                onClick={() => setOpen(!open)}
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
                <span style={{ color: selecionados.length ? 'var(--text-primary)' : '#9ca3af' }}>
                    {selecionados.length === 0 ? 'Selecionar aprovadores cadastrados' : `${selecionados.length} aprovador(es) selecionado(s)`}
                </span>
                <ChevronDown size={14} color="#64748b" />
            </div>
            {open && (
                <>
                    {/* Invisible overlay to close dropdown when clicking outside */}
                    <div
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
                        onClick={() => setOpen(false)}
                    />
                    <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 100,
                        background: 'white', border: '1px solid #cbd5e1', borderRadius: 6,
                        maxHeight: 230, overflowY: 'auto', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}>
                        {opcoes.map(g => (
                            <label key={g.id} style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', margin: 0,
                                cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: 13.5,
                                background: selecionados.includes(g.id) ? '#f8fafc' : 'white',
                                color: 'var(--text-primary)'
                            }}>
                                <input
                                    type="checkbox"
                                    style={{ transform: 'scale(1.15)', accentColor: '#005CA9' }}
                                    checked={selecionados.includes(g.id)}
                                    onChange={() => {
                                        if (selecionados.includes(g.id)) {
                                            onChange(selecionados.filter(x => x !== g.id));
                                        } else {
                                            onChange([...selecionados, g.id]);
                                        }
                                    }}
                                />
                                {g.nome}
                            </label>
                        ))}
                        {opcoes.length === 0 && <div style={{ padding: '10px 14px', color: '#64748b', fontSize: 13 }}>Nenhum aprovador disponível.</div>}
                    </div>
                </>
            )}
        </div>
    )
}

// ── GRUPOS Section ────────────────────────────────────────────────────────────
function GruposSection() {
    const [grupos, setGrupos] = useState<Grupo[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [expanded, setExpanded] = useState<string[]>([])
    const [showAdd, setShowAdd] = useState(false)
    const [showUniversalConfirm, setShowUniversalConfirm] = useState<Grupo | null>(null)
    const [showDelete, setShowDelete] = useState<Grupo | null>(null)
    const [editingGrupo, setEditingGrupo] = useState<Grupo | null>(null)
    const [editNome, setEditNome] = useState('')
    const [nomeGrupo, setNomeGrupo] = useState('')
    const [saving, setSaving] = useState(false)
    const [allUnidades, setAllUnidades] = useState<Unidade[]>([])
    const { toast, show } = useToast()

    const [modalUnidades, setModalUnidades] = useState<Unidade[]>([])
    const [modalUsuarios, setModalUsuarios] = useState<Usuario[]>([])
    const [tempUnidadeId, setTempUnidadeId] = useState('')
    const [tempUsuarioCode, setTempUsuarioCode] = useState('')
    const [allUsuarios, setAllUsuarios] = useState<Usuario[]>([])

    useEffect(() => { load() }, [])

    async function load() {
        setLoading(true)
        const [g, u, us] = await Promise.all([
            api.get('/admin/grupos'),
            api.get('/admin/unidades'),
            api.get('/usuarios')
        ])
        setGrupos(g.data)
        setAllUnidades(u.data)
        setAllUsuarios(us.data)
        setLoading(false)
    }

    const filtered = useMemo(() =>
        grupos.filter(g => g.nome.toLowerCase().includes(search.toLowerCase())),
        [grupos, search]
    )

    function toggleExpand(id: string) {
        setExpanded(e => e.includes(id) ? e.filter(x => x !== id) : [...e, id])
    }

    function abrirEdicao(grupo: Grupo) {
        setEditingGrupo(grupo)
        setEditNome(grupo.nome)
        setModalUnidades(grupo.grupoUnidades.map(gu => ({ ...gu.unidade, ativo: true } as Unidade)))
        setModalUsuarios(grupo.grupoUsuarios.map(gu => gu.usuario))
    }

    async function salvarEdicaoGrupo() {
        if (!editingGrupo || !editNome.trim()) return
        setSaving(true)
        try {
            if (editNome !== editingGrupo.nome) {
                await api.put(`/admin/grupos/${editingGrupo.id}`, { nome: editNome })
            }

            const oldUnidades = editingGrupo.grupoUnidades.map(gu => gu.unidade.id)
            const newUnidades = modalUnidades.map(u => u.id)
            const toAddUnidades = newUnidades.filter(id => !oldUnidades.includes(id))
            const toRemoveUnidades = oldUnidades.filter(id => !newUnidades.includes(id))

            await Promise.all([
                ...toAddUnidades.map(id => api.post(`/admin/grupos/${editingGrupo.id}/unidades`, { unidadeId: id })),
                ...toRemoveUnidades.map(id => api.delete(`/admin/grupos/${editingGrupo.id}/unidades/${id}`))
            ])

            const oldUsuarios = editingGrupo.grupoUsuarios.map(gu => gu.usuario.id)
            const newUsuarios = modalUsuarios.map(u => u.id)
            const toAddUsuarios = newUsuarios.filter(id => !oldUsuarios.includes(id))
            const toRemoveUsuarios = oldUsuarios.filter(id => !newUsuarios.includes(id))

            await Promise.all([
                ...toAddUsuarios.map(id => api.post(`/admin/grupos/${editingGrupo.id}/usuarios`, { usuarioId: id })),
                ...toRemoveUsuarios.map(id => api.delete(`/admin/grupos/${editingGrupo.id}/usuarios/${id}`))
            ])

            setEditingGrupo(null)
            setEditNome('')
            setModalUnidades([])
            setModalUsuarios([])
            await load()
            show('Grupo atualizado com sucesso!')
        } catch (e: any) { show(e.response?.data?.error ?? 'Erro ao atualizar.', 'error') }
        finally { setSaving(false) }
    }

    async function criarGrupo() {
        if (!nomeGrupo.trim()) return
        setSaving(true)
        try {
            const res = await api.post('/admin/grupos', { nome: nomeGrupo })
            const groupId = res.data.id
            await Promise.all([
                ...modalUnidades.map(u => api.post(`/admin/grupos/${groupId}/unidades`, { unidadeId: u.id })),
                ...modalUsuarios.map(u => api.post(`/admin/grupos/${groupId}/usuarios`, { usuarioId: u.id }))
            ])
            setNomeGrupo(''); setModalUnidades([]); setModalUsuarios([]); setShowAdd(false); await load()
            show('Grupo criado com sucesso!')
        } catch (e: any) { show(e.response?.data?.error ?? 'Erro ao criar.', 'error') }
        finally { setSaving(false) }
    }

    async function confirmarUniversal(grupo: Grupo) {
        try {
            if (grupo.isUniversal) { await api.delete(`/admin/grupos/${grupo.id}/universal`) }
            else { await api.post(`/admin/grupos/${grupo.id}/universal`) }
            setShowUniversalConfirm(null)
            await load()
            show(grupo.isUniversal ? 'Atributo Universal removido.' : 'Grupo definido como Universal!')
        } catch (e: any) { show(e.response?.data?.error ?? 'Erro.', 'error') }
    }


    async function excluirGrupo(grupo: Grupo) {
        try {
            await api.patch(`/admin/grupos/${grupo.id}`, { ativo: false })
            setShowDelete(null); await load(); show('Grupo excluído.')
        } catch (e: any) { show(e.response?.data?.error ?? 'Erro ao excluir.', 'error') }
    }

    return (
        <div>
            {/* Info banner */}
            <div className="info-banner mb-4">
                <Shield size={16} style={{ flexShrink: 0, marginTop: 1, color: 'var(--caixa-blue)' }} />
                <div>
                    <strong>Específicos:</strong> Participam apenas dos fluxos aos quais forem vinculados (segmento ou assunto).{' '}
                    <strong>Universais:</strong> São incluídos automaticamente em todos os fluxos de aprovação.
                </div>
            </div>

            {/* Toolbar */}
            <div className="toolbar">
                <div className="search-input-wrap">
                    <Search size={14} />
                    <input className="search-input" placeholder="Buscar aprovador" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <button id="btn-novo-grupo" className="btn btn-primary" onClick={() => setShowAdd(true)}>
                    <Plus size={14} /> Adicionar aprovadores
                </button>
            </div>

            {/* Table */}
            {loading ? (
                <div className="loading-center"><div className="spinner" /></div>
            ) : (
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th style={{ width: 100 }}>Vinculações</th>
                            <th style={{ width: 100 }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={3} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                Nenhum grupo cadastrado
                            </td></tr>
                        ) : filtered.map(grupo => (
                            <React.Fragment key={grupo.id}>
                                {/* Grupo row */}
                                <tr className={expanded.includes(grupo.id) ? 'expanded' : ''}>
                                    <td>
                                        <div className="row-expandable" onClick={() => toggleExpand(grupo.id)}>
                                            <button className="row-expand-btn">
                                                {expanded.includes(grupo.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </button>
                                            <span style={{ fontWeight: 600 }}>{grupo.nome}</span>
                                            {grupo.isUniversal && <span className="badge badge-universal">● Universal</span>}
                                        </div>
                                    </td>

                                    <td>
                                        {grupo.vinculacoesNomes.length > 0 ? (
                                            <div className="universal-btn-wrap" style={{ display: 'inline-flex' }}>
                                                <span className="badge-count-hover">
                                                    {grupo.vinculacoesNomes.length}
                                                </span>
                                                <div className="universal-tooltip" style={{ minWidth: 200, textAlign: 'left' }}>
                                                    {grupo.vinculacoesNomes.map((n, i) => (
                                                        <div key={i} style={{ padding: '2px 0', borderBottom: i < grupo.vinculacoesNomes.length - 1 ? '1px solid rgba(255,255,255,0.15)' : 'none' }}>
                                                            {n}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="row-actions">
                                            <div style={{ position: 'relative', display: 'inline-flex' }} className="universal-btn-wrap">
                                                <button
                                                    id={`btn-universal-${grupo.id}`}
                                                    className="btn-icon-globe"
                                                    title={grupo.possuiVinculo
                                                        ? 'Indisponível para ser "Universal" pois está associado a um segmento ou assunto'
                                                        : grupo.isUniversal ? 'Remover universal' : 'Tornar universal'
                                                    }
                                                    onClick={() => !grupo.possuiVinculo && setShowUniversalConfirm(grupo)}
                                                    disabled={grupo.possuiVinculo}
                                                    style={{
                                                        color: grupo.possuiVinculo
                                                            ? '#D0E0E3'
                                                            : grupo.isUniversal ? '#038299' : 'var(--text-muted)',
                                                        cursor: grupo.possuiVinculo ? 'not-allowed' : 'pointer',
                                                    }}
                                                >
                                                    <Globe size={16} />
                                                </button>
                                                {grupo.possuiVinculo && (
                                                    <div className="universal-tooltip">
                                                        Indisponível para ser &ldquo;Universal&rdquo; pois está associado a um segmento ou assunto
                                                    </div>
                                                )}
                                            </div>
                                            <button className="btn-icon-edit" title="Editar nome" onClick={(e) => { e.stopPropagation(); abrirEdicao(grupo) }}>
                                                <Pencil size={15} />
                                            </button>
                                            <button className="btn-icon-delete" title="Excluir" onClick={() => setShowDelete(grupo)}>
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>

                                {/* Expanded members */}
                                {expanded.includes(grupo.id) && (
                                    <>
                                        <tr className="sub-row">
                                            <td colSpan={3} style={{ padding: '16px 20px', background: '#f7f9fc' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                    {/* Unidades text */}
                                                    {grupo.grupoUnidades.length > 0 && (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
                                                            <strong style={{ marginRight: 4 }}>Unidades:</strong>
                                                            {grupo.grupoUnidades.map(gu => (
                                                                <span key={gu.unidade.id} className="badge badge-unit flex items-center gap-1" style={{ fontSize: 12 }}>
                                                                    {gu.unidade.codigo} - {gu.unidade.sigla}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Users list */}
                                                    {grupo.grupoUsuarios.length > 0 && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                            {grupo.grupoUsuarios.map(gu => (
                                                                <div key={gu.usuario.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)' }}>
                                                                    <span className="flex items-center gap-2">
                                                                        <Users size={14} style={{ color: 'var(--text-muted)' }} />
                                                                        {gu.usuario.codigo} – {gu.usuario.nome}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Inline Add/Delete Disabled */}
                                                </div>
                                            </td>
                                        </tr>
                                    </>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            )}

            {/* Edit Group Modal */}
            {editingGrupo && (
                <div className="modal-overlay" onClick={() => { setEditingGrupo(null); setModalUnidades([]); setModalUsuarios([]) }}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Editar aprovadores</h3>
                            <button className="modal-close" onClick={() => { setEditingGrupo(null); setModalUnidades([]); setModalUsuarios([]) }}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.4px', color: '#4a5568' }}>Nome</label>
                                <input
                                    id="input-editar-nome-grupo"
                                    className="form-input"
                                    value={editNome}
                                    onChange={e => setEditNome(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && salvarEdicaoGrupo()}
                                    autoFocus
                                    maxLength={36}
                                />
                                <div style={{ textAlign: 'right', fontSize: 11, color: '#999', marginTop: 4 }}>
                                    {editNome.length}/36
                                </div>
                            </div>

                            <div className="form-group mt-4">
                                <label className="form-label" style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.4px', color: '#4a5568' }}>Adicionar unidade aprovadora</label>
                                <div className="form-row flex items-center gap-2">
                                    <select className="form-select" value={tempUnidadeId} onChange={e => setTempUnidadeId(e.target.value)}>
                                        <option value="">Digite o código da unidade ou selecione</option>
                                        {allUnidades.map(u => <option key={u.id} value={u.id}>{u.codigo} - {u.sigla}</option>)}
                                    </select>
                                    <button className="btn btn-secondary" onClick={() => {
                                        const un = allUnidades.find(x => x.id === tempUnidadeId)
                                        if (un && !modalUnidades.find(x => x.id === un.id)) setModalUnidades([...modalUnidades, un])
                                        setTempUnidadeId('')
                                    }}>Adicionar</button>
                                </div>
                                {modalUnidades.length > 0 && (
                                    <div className="flex gap-2 flex-wrap mt-2">
                                        {modalUnidades.map(u => (
                                            <span key={u.id} className="badge badge-unit flex items-center gap-1" style={{ background: '#e4f4fb', color: '#038299', fontWeight: 600, padding: '4px 8px', borderRadius: 4 }}>
                                                {u.codigo} - {u.sigla}
                                                <X size={14} className="cursor-pointer opacity-70 hover:opacity-100" onClick={() => setModalUnidades(modalUnidades.filter(x => x.id !== u.id))} />
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="form-group mt-4">
                                <label className="form-label" style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.4px', color: '#4a5568' }}>Usuário aprovador</label>
                                <div className="form-row flex items-center gap-2">
                                    <input className="form-input" placeholder="Ex: 9999"
                                        value={tempUsuarioCode} onChange={e => setTempUsuarioCode(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                const us = allUsuarios.find(x => x.codigo === tempUsuarioCode.trim())
                                                if (us && !modalUsuarios.find(x => x.id === us.id)) setModalUsuarios([...modalUsuarios, us])
                                                else if (!us && tempUsuarioCode.trim()) show('Usuário não encontrado.', 'error')
                                                setTempUsuarioCode('')
                                            }
                                        }}
                                    />
                                    <button className="btn btn-secondary" onClick={() => {
                                        const us = allUsuarios.find(x => x.codigo === tempUsuarioCode.trim())
                                        if (us && !modalUsuarios.find(x => x.id === us.id)) setModalUsuarios([...modalUsuarios, us])
                                        else if (!us && tempUsuarioCode.trim()) show('Usuário não encontrado.', 'error')
                                        setTempUsuarioCode('')
                                    }}>Adicionar</button>
                                </div>
                                {modalUsuarios.length > 0 && (
                                    <div className="flex gap-2 flex-wrap mt-2">
                                        {modalUsuarios.map(u => (
                                            <span key={u.id} className="badge badge-unit flex items-center gap-1" style={{ background: '#e4f4fb', color: '#038299', fontWeight: 600, padding: '4px 8px', borderRadius: 4 }}>
                                                {u.codigo} - {u.nome}
                                                <X size={14} className="cursor-pointer opacity-70 hover:opacity-100" onClick={() => setModalUsuarios(modalUsuarios.filter(x => x.id !== u.id))} />
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => { setEditingGrupo(null); setModalUnidades([]); setModalUsuarios([]) }}>Cancelar</button>
                            <button
                                id="btn-salvar-edicao-grupo"
                                className="btn btn-primary"
                                onClick={salvarEdicaoGrupo}
                                disabled={saving || !editNome.trim()}
                            >
                                {saving ? <Loader2 size={14} className="animate-spin" /> : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Group Modal */}
            {showAdd && (
                <div className="modal-overlay" onClick={() => { setShowAdd(false); setModalUnidades([]); setModalUsuarios([]) }}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Aprovadores</h3>
                            <button className="modal-close" onClick={() => { setShowAdd(false); setModalUnidades([]); setModalUsuarios([]) }}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Nome</label>
                                <input id="input-nome-grupo" className="form-input" value={nomeGrupo}
                                    onChange={e => setNomeGrupo(e.target.value)} autoFocus />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Selecionar Unidades</label>
                                <div className="form-row flex items-center gap-2">
                                    <select className="form-select" value={tempUnidadeId} onChange={e => setTempUnidadeId(e.target.value)}>
                                        <option value="">Selecionar</option>
                                        {allUnidades.map(u => <option key={u.id} value={u.id}>{u.codigo} - {u.sigla}</option>)}
                                    </select>
                                    <button className="btn btn-secondary" onClick={() => {
                                        const un = allUnidades.find(x => x.id === tempUnidadeId)
                                        if (un && !modalUnidades.find(x => x.id === un.id)) setModalUnidades([...modalUnidades, un])
                                        setTempUnidadeId('')
                                    }}>Adicionar</button>
                                </div>
                                {modalUnidades.length > 0 && (
                                    <div className="flex gap-2 flex-wrap mt-2">
                                        {modalUnidades.map(u => (
                                            <span key={u.id} className="badge badge-unit flex items-center gap-1">
                                                {u.codigo} - {u.sigla}
                                                <X size={12} className="cursor-pointer opacity-70 hover:opacity-100" onClick={() => setModalUnidades(modalUnidades.filter(x => x.id !== u.id))} />
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Usuário aprovador</label>
                                <div className="form-row flex items-center gap-2">
                                    <input className="form-input" placeholder="Ex: 9999"
                                        value={tempUsuarioCode} onChange={e => setTempUsuarioCode(e.target.value)} />
                                    <button className="btn btn-secondary" onClick={() => {
                                        const us = allUsuarios.find(x => x.codigo === tempUsuarioCode.trim())
                                        if (us && !modalUsuarios.find(x => x.id === us.id)) {
                                            setModalUsuarios([...modalUsuarios, us])
                                        } else if (!us) {
                                            show('Usuário não encontrado.', 'error')
                                        }
                                        setTempUsuarioCode('')
                                    }}>Adicionar</button>
                                </div>
                                {modalUsuarios.length > 0 && (
                                    <div className="flex gap-2 flex-wrap mt-2">
                                        {modalUsuarios.map(u => (
                                            <span key={u.id} className="badge badge-unit flex items-center gap-1">
                                                {u.codigo} - {u.nome}
                                                <X size={12} className="cursor-pointer opacity-70 hover:opacity-100" onClick={() => setModalUsuarios(modalUsuarios.filter(x => x.id !== u.id))} />
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => { setShowAdd(false); setModalUnidades([]); setModalUsuarios([]) }}>Cancelar</button>
                            <button id="btn-criar-grupo" className="btn btn-primary" onClick={criarGrupo} disabled={saving || !nomeGrupo.trim()}>
                                {saving ? <Loader2 size={14} /> : null} Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Universal confirm */}
            {showUniversalConfirm && (
                <div className="modal-overlay" onClick={() => setShowUniversalConfirm(null)}>
                    <div className="modal confirm-dialog" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {showUniversalConfirm.isUniversal ? 'Remover atributo Universal' : 'Tornar aprovador universal'}
                            </h3>
                            <button className="modal-close" onClick={() => setShowUniversalConfirm(null)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <p className="confirm-text">
                                {showUniversalConfirm.isUniversal
                                    ? 'O grupo deixará de participar automaticamente de todos os fluxos.'
                                    : 'Ao tornar este aprovador universal, ele passará a aprovar todos os tipos de peças. Ele não ficará disponível para associar a um segmento ou assunto.'}
                            </p>
                        </div>
                        <div className="confirm-footer">
                            <button className="btn btn-ghost" onClick={() => setShowUniversalConfirm(null)}>Cancelar</button>
                            <button className="btn btn-primary" style={{ background: 'var(--caixa-orange)' }}
                                onClick={() => confirmarUniversal(showUniversalConfirm)}>
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {showDelete && (
                <div className="modal-overlay" onClick={() => setShowDelete(null)}>
                    <div className="modal confirm-dialog" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title" style={{ color: 'var(--red)' }}>Excluir grupo</h3>
                            <button className="modal-close" onClick={() => setShowDelete(null)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <p className="confirm-text">Deseja excluir o grupo <strong>"{showDelete.nome}"</strong>? Esta ação não poderá ser desfeita.</p>
                        </div>
                        <div className="confirm-footer">
                            <button className="btn btn-ghost" onClick={() => setShowDelete(null)}>Cancelar</button>
                            <button className="btn btn-danger" onClick={() => excluirGrupo(showDelete)}>Excluir</button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
        </div>
    )
}

// ── PÚBLICO ALVO + SEGMENTOS Section ─────────────────────────────────────────
function PublicoAlvoSection() {
    const [publicos, setPublicos] = useState<PublicoAlvo[]>([])
    const [grupos, setGrupos] = useState<Grupo[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [expanded, setExpanded] = useState<string[]>([])
    const [showAddPublico, setShowAddPublico] = useState(false)
    const [showAddSegmento, setShowAddSegmento] = useState<string | null>(null) // publicoId
    const [nomePublico, setNomePublico] = useState('')
    const [nomeSegmento, setNomeSegmento] = useState('')
    const [gruposSelecionados, setGruposSelecionados] = useState<string[]>([])

    // Estados de edição e exclusão de Público Alvo
    const [editingPublico, setEditingPublico] = useState<PublicoAlvo | null>(null)
    const [editNomePublico, setEditNomePublico] = useState('')
    const [showDeletePublico, setShowDeletePublico] = useState<PublicoAlvo | null>(null)

    // Estados de edição e exclusão de Segmento
    const [editingSegmento, setEditingSegmento] = useState<Segmento | null>(null)
    const [editNomeSegmento, setEditNomeSegmento] = useState('')
    const [editGruposSegmento, setEditGruposSegmento] = useState<string[]>([])
    const [showDeleteSegmento, setShowDeleteSegmento] = useState<Segmento | null>(null)

    const [saving, setSaving] = useState(false)
    const { toast, show } = useToast()

    useEffect(() => { load() }, [])

    async function load() {
        setLoading(true)
        const [p, g] = await Promise.all([api.get('/admin/publicos-alvo'), api.get('/admin/grupos')])
        setPublicos(p.data)
        setGrupos(g.data.filter((g: Grupo) => !g.isUniversal))
        setLoading(false)
    }

    const filtered = useMemo(() =>
        publicos.filter(p => p.nome.toLowerCase().includes(search.toLowerCase())),
        [publicos, search]
    )

    function toggleExpand(id: string) {
        setExpanded(e => e.includes(id) ? e.filter(x => x !== id) : [...e, id])
    }

    async function criarPublico() {
        setSaving(true)
        try {
            await api.post('/admin/publicos-alvo', { nome: nomePublico })
            setNomePublico(''); setShowAddPublico(false); await load(); show('Público alvo criado!')
        } catch (e: any) { show(e.response?.data?.error ?? 'Erro.', 'error') }
        finally { setSaving(false) }
    }

    async function criarSegmento(publicoAlvoId: string) {
        if (!nomeSegmento.trim() || gruposSelecionados.length === 0) {
            show('Informe o nome e selecione ao menos 1 grupo.', 'error'); return
        }
        setSaving(true)
        try {
            await api.post('/admin/segmentos', { nome: nomeSegmento, publicoAlvoId, grupoIds: gruposSelecionados })
            setNomeSegmento(''); setGruposSelecionados([]); setShowAddSegmento(null); await load()
            show('Segmento criado!')
        } catch (e: any) { show(e.response?.data?.error ?? 'Erro.', 'error') }
        finally { setSaving(false) }
    }

    async function salvarEdicaoPublico() {
        if (!editingPublico || !editNomePublico.trim()) return
        setSaving(true)
        try {
            await api.put(`/admin/publicos-alvo/${editingPublico.id}`, { nome: editNomePublico })
            setEditingPublico(null); setEditNomePublico('')
            await load(); show('Público alvo atualizado!')
        } catch (e: any) { show(e.response?.data?.error ?? 'Erro ao atualizar.', 'error') }
        finally { setSaving(false) }
    }

    async function excluirPublico(id: string) {
        setSaving(true)
        try {
            await api.delete(`/admin/publicos-alvo/${id}`)
            setShowDeletePublico(null); await load(); show('Público alvo excluído!')
        } catch (e: any) { show(e.response?.data?.error ?? 'Erro ao excluir.', 'error') }
        finally { setSaving(false) }
    }

    async function salvarEdicaoSegmento() {
        if (!editingSegmento || !editNomeSegmento.trim() || editGruposSegmento.length === 0) {
            show('Informe o nome e selecione ao menos 1 grupo.', 'error'); return
        }
        setSaving(true)
        try {
            if (editNomeSegmento !== editingSegmento.nome) {
                await api.put(`/admin/segmentos/${editingSegmento.id}`, { nome: editNomeSegmento })
            }

            const oldGrupos = editingSegmento.segmentoGrupos.map(sg => sg.grupo.id)
            const toAdd = editGruposSegmento.filter(id => !oldGrupos.includes(id))
            const toRemove = oldGrupos.filter(id => !editGruposSegmento.includes(id))

            await Promise.all([
                ...toAdd.map(id => api.post(`/admin/segmentos/${editingSegmento.id}/grupos`, { grupoId: id })),
                ...toRemove.map(id => api.delete(`/admin/segmentos/${editingSegmento.id}/grupos/${id}`))
            ])

            setEditingSegmento(null); setEditNomeSegmento(''); setEditGruposSegmento([])
            await load(); show('Segmento atualizado!')
        } catch (e: any) { show(e.response?.data?.error ?? 'Erro ao atualizar.', 'error') }
        finally { setSaving(false) }
    }

    async function excluirSegmento(id: string) {
        setSaving(true)
        try {
            await api.delete(`/admin/segmentos/${id}`)
            setShowDeleteSegmento(null); await load(); show('Segmento excluído!')
        } catch (e: any) { show(e.response?.data?.error ?? 'Erro ao excluir.', 'error') }
        finally { setSaving(false) }
    }

    return (
        <div>
            <div className="toolbar">
                <div className="search-input-wrap">
                    <Search size={14} />
                    <input className="search-input" placeholder="Buscar público alvo" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <button id="btn-novo-publico" className="btn btn-primary" onClick={() => setShowAddPublico(true)}>
                    <Plus size={14} /> Novo público alvo
                </button>
            </div>

            {loading ? (
                <div className="loading-center"><div className="spinner" /></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {filtered.map(pa => {
                        const isExpanded = expanded.includes(pa.id)
                        return (
                            <div key={pa.id} style={{
                                background: 'white', borderRadius: 8, marginBottom: 8,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden'
                            }}>
                                {/* Público alvo header */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '14px 20px', cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--border-light)' : 'none'
                                }} onClick={() => toggleExpand(pa.id)}>
                                    <div className="flex items-center gap-2">
                                        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{pa.nome}</span>
                                        <button className="btn-icon-edit" title="Editar" onClick={e => { e.stopPropagation(); setEditingPublico(pa); setEditNomePublico(pa.nome) }}>
                                            <Pencil size={14} />
                                        </button>
                                        <button className="btn-icon-delete" title="Excluir" onClick={e => { e.stopPropagation(); setShowDeletePublico(pa) }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <button className="row-expand-action">
                                        {isExpanded ? <><ChevronUp size={13} /> Recolher</> : <><ChevronDown size={13} /> Expandir</>}
                                    </button>
                                </div>

                                {/* Segmentos */}
                                {isExpanded && (
                                    <div>
                                        <div className="sub-section-toolbar">
                                            <button className="btn btn-secondary btn-sm" onClick={() => { setShowAddSegmento(pa.id); setGruposSelecionados([]) }}>
                                                <Plus size={13} /> Novo segmento
                                            </button>
                                        </div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', background: '#f7f9fc', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Segmento</th>
                                                    <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', background: '#f7f9fc', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Aprovador</th>
                                                    <th style={{ padding: '10px 20px', width: 80, background: '#f7f9fc', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pa.segmentos.length === 0 ? (
                                                    <tr><td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                                                        Nenhum segmento cadastrado
                                                    </td></tr>
                                                ) : pa.segmentos.map(seg => (
                                                    <tr key={seg.id} style={{ borderTop: '1px solid var(--border-light)' }}>
                                                        <td style={{ padding: '12px 20px', fontSize: 13.5 }}>{seg.nome}</td>
                                                        <td style={{ padding: '12px 20px' }}>
                                                            <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                                                                {seg.segmentoGrupos.map(sg => (
                                                                    <span key={sg.grupo.id} className="badge badge-group">{sg.grupo.nome.toUpperCase()}</span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '12px 20px' }}>
                                                            <div className="row-actions">
                                                                <button className="btn-icon-edit" onClick={() => { setEditingSegmento(seg); setEditNomeSegmento(seg.nome); setEditGruposSegmento(seg.segmentoGrupos.map(sg => sg.grupo.id)) }}><Pencil size={14} /></button>
                                                                <button className="btn-icon-delete" onClick={() => setShowDeleteSegmento(seg)}><Trash2 size={14} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Add Público Modal */}
            {showAddPublico && (
                <div className="modal-overlay" onClick={() => setShowAddPublico(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Adicionar público alvo</h3>
                            <button className="modal-close" onClick={() => setShowAddPublico(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Nome do público alvo</label>
                                <input id="input-nome-publico" className="form-input"
                                    placeholder="Ex: Pessoa Física, Pessoa Jurídica"
                                    value={nomePublico} onChange={e => setNomePublico(e.target.value)} autoFocus />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowAddPublico(false)}>Cancelar</button>
                            <button id="btn-criar-publico" className="btn btn-primary" onClick={criarPublico} disabled={saving || !nomePublico.trim()}>Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Segmento Modal */}
            {showAddSegmento && (
                <div className="modal-overlay" onClick={() => setShowAddSegmento(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 550, overflow: 'visible' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Novo segmento</h3>
                            <button className="modal-close" onClick={() => setShowAddSegmento(null)}><X size={18} /></button>
                        </div>
                        <div className="modal-body" style={{ overflow: 'visible' }}>
                            <div className="form-group">
                                <label className="form-label">Nome</label>
                                <input id="input-nome-segmento" className="form-input" value={nomeSegmento}
                                    onChange={e => setNomeSegmento(e.target.value)} autoFocus />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Selecionar aprovadores cadastrados</label>
                                <DropdownMultiSelect
                                    opcoes={grupos}
                                    selecionados={gruposSelecionados}
                                    onChange={setGruposSelecionados}
                                />
                                {gruposSelecionados.length > 0 && (
                                    <div className="tag-list mt-2">
                                        {gruposSelecionados.map(id => {
                                            const g = grupos.find(x => x.id === id)
                                            return g ? <span key={id} className="badge badge-group">{g.nome.toUpperCase()}</span> : null
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowAddSegmento(null)}>Cancelar</button>
                            <button id="btn-criar-segmento" className="btn btn-primary"
                                onClick={() => criarSegmento(showAddSegmento)} disabled={saving}>
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Editar Público Alvo */}
            {editingPublico && (
                <div className="modal-overlay" onClick={() => setEditingPublico(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Editar público alvo</h3>
                            <button className="modal-close" onClick={() => setEditingPublico(null)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Nome do público alvo</label>
                                <input
                                    className="form-input"
                                    value={editNomePublico}
                                    onChange={e => setEditNomePublico(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && salvarEdicaoPublico()}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setEditingPublico(null)}>Cancelar</button>
                            <button
                                className="btn btn-primary"
                                onClick={salvarEdicaoPublico}
                                disabled={saving || !editNomePublico.trim() || editNomePublico.trim() === editingPublico.nome}
                            >
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />} Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Excluir Público Alvo */}
            {showDeletePublico && (
                <div className="modal-overlay" onClick={() => setShowDeletePublico(null)}>
                    <div className="modal confirm-dialog" onClick={e => e.stopPropagation()}>
                        <div className="modal-body">
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                                <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: 12, borderRadius: '50%' }}>
                                    <AlertTriangle size={32} />
                                </div>
                            </div>
                            <h3 className="confirm-title">Excluir público alvo?</h3>
                            <p className="confirm-text">
                                Tem certeza que deseja excluir o público alvo <strong>{showDeletePublico.nome}</strong>?<br />
                                Todos os subsegmentos e vínculos associados também poderão ser afetados.
                            </p>
                        </div>
                        <div className="confirm-footer">
                            <button className="btn btn-ghost" onClick={() => setShowDeletePublico(null)}>Cancelar</button>
                            <button className="btn btn-danger" onClick={() => excluirPublico(showDeletePublico.id)} disabled={saving}>
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Editar Segmento */}
            {editingSegmento && (
                <div className="modal-overlay" onClick={() => setEditingSegmento(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 550, overflow: 'visible' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Editar segmento</h3>
                            <button className="modal-close" onClick={() => setEditingSegmento(null)}><X size={18} /></button>
                        </div>
                        <div className="modal-body" style={{ overflow: 'visible' }}>
                            <div className="form-group">
                                <label className="form-label">Nome do segmento</label>
                                <input
                                    className="form-input"
                                    value={editNomeSegmento}
                                    onChange={e => setEditNomeSegmento(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && salvarEdicaoSegmento()}
                                    autoFocus
                                />
                                <div className="form-group mt-4">
                                    <label className="form-label">Selecionar aprovadores cadastrados</label>
                                    <DropdownMultiSelect
                                        opcoes={grupos}
                                        selecionados={editGruposSegmento}
                                        onChange={setEditGruposSegmento}
                                    />
                                    {editGruposSegmento.length > 0 && (
                                        <div className="tag-list mt-2" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                            {editGruposSegmento.map(id => {
                                                const g = grupos.find(x => x.id === id)
                                                return g ? <span key={id} className="badge badge-group">{g.nome.toUpperCase()}</span> : null
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setEditingSegmento(null)}>Cancelar</button>
                            <button
                                className="btn btn-primary"
                                onClick={salvarEdicaoSegmento}
                                disabled={saving || !editNomeSegmento.trim() || editGruposSegmento.length === 0}
                            >
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />} Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Excluir Segmento */}
            {showDeleteSegmento && (
                <div className="modal-overlay" onClick={() => setShowDeleteSegmento(null)}>
                    <div className="modal confirm-dialog" onClick={e => e.stopPropagation()}>
                        <div className="modal-body">
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                                <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: 12, borderRadius: '50%' }}>
                                    <AlertTriangle size={32} />
                                </div>
                            </div>
                            <h3 className="confirm-title">Excluir segmento?</h3>
                            <p className="confirm-text">
                                Tem certeza que deseja excluir o segmento <strong>{showDeleteSegmento.nome}</strong>?
                            </p>
                        </div>
                        <div className="confirm-footer">
                            <button className="btn btn-ghost" onClick={() => setShowDeleteSegmento(null)}>Cancelar</button>
                            <button className="btn btn-danger" onClick={() => excluirSegmento(showDeleteSegmento.id)} disabled={saving}>
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
        </div>
    )
}

// ── ASSUNTOS Section ─────────────────────────────────────────────────────────
function AssuntosSection() {
    const [assuntos, setAssuntos] = useState<Assunto[]>([])
    const [grupos, setGrupos] = useState<Grupo[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [showAdd, setShowAdd] = useState(false)
    const [editingAssunto, setEditingAssunto] = useState<Assunto | null>(null)
    const [editNome, setEditNome] = useState('')
    const [editGruposAssunto, setEditGruposAssunto] = useState<string[]>([])
    const [nome, setNome] = useState('')
    const [grupoId, setGrupoId] = useState('')
    const [saving, setSaving] = useState(false)
    const { toast, show } = useToast()

    useEffect(() => { load() }, [])

    async function load() {
        setLoading(true)
        const [a, g] = await Promise.all([api.get('/admin/assuntos'), api.get('/admin/grupos')])
        setAssuntos(a.data); setGrupos(g.data.filter((g: Grupo) => !g.isUniversal))
        setLoading(false)
    }

    const filtered = useMemo(() =>
        assuntos.filter(a => a.nome.toLowerCase().includes(search.toLowerCase())),
        [assuntos, search]
    )

    async function criar() {
        setSaving(true)
        try {
            const { data } = await api.post('/admin/assuntos', { nome })
            if (grupoId) await api.post(`/admin/assuntos/${data.id}/grupos`, { grupoId })
            setNome(''); setGrupoId(''); setShowAdd(false); await load(); show('Assunto criado!')
        } catch (e: any) { show(e.response?.data?.error ?? 'Erro.', 'error') }
        finally { setSaving(false) }
    }



    function abrirEdicao(assunto: Assunto) {
        setEditingAssunto(assunto)
        setEditNome(assunto.nome)
        setEditGruposAssunto(assunto.assuntoGrupos.map(ag => ag.grupo.id))
    }

    async function salvarEdicao() {
        if (!editingAssunto || !editNome.trim()) return
        setSaving(true)
        try {
            if (editNome !== editingAssunto.nome) {
                await api.put(`/admin/assuntos/${editingAssunto.id}`, { nome: editNome })
            }

            const oldGrupos = editingAssunto.assuntoGrupos.map(ag => ag.grupo.id)
            const toAdd = editGruposAssunto.filter(id => !oldGrupos.includes(id))
            const toRemove = oldGrupos.filter(id => !editGruposAssunto.includes(id))

            await Promise.all([
                ...toAdd.map(id => api.post(`/admin/assuntos/${editingAssunto.id}/grupos`, { grupoId: id })),
                ...toRemove.map(id => api.delete(`/admin/assuntos/${editingAssunto.id}/grupos/${id}`))
            ])

            setEditingAssunto(null); setEditNome(''); setEditGruposAssunto([])
            await load(); show('Assunto atualizado!')
        } catch (e: any) { show(e.response?.data?.error ?? 'Erro.', 'error') }
        finally { setSaving(false) }
    }



    return (
        <div>
            <div className="toolbar">
                <div className="search-input-wrap">
                    <Search size={14} />
                    <input className="search-input" placeholder="Buscar assunto" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <button id="btn-novo-assunto" className="btn btn-primary" onClick={() => setShowAdd(true)}>
                    <Plus size={14} /> Novo assunto
                </button>
            </div>

            {loading ? (
                <div className="loading-center"><div className="spinner" /></div>
            ) : (
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Assunto</th>
                            <th>Aprovador</th>
                            <th style={{ width: 80 }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={3} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Nenhum assunto cadastrado</td></tr>
                        ) : filtered.map(a => (
                            <tr key={a.id}>
                                <td style={{ fontWeight: 500 }}>{a.nome}</td>
                                <td>
                                    <div className="flex gap-1" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                                        {a.assuntoGrupos.map(ag => (
                                            <span key={ag.grupo.id} className="badge badge-group">
                                                {ag.grupo.nome.toUpperCase()}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td>
                                    <div className="row-actions">
                                        <button className="btn-icon-edit" onClick={() => abrirEdicao(a)}><Pencil size={14} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {showAdd && (
                <div className="modal-overlay" onClick={() => setShowAdd(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 550, overflow: 'visible' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Cadastrar assunto</h3>
                            <button className="modal-close" onClick={() => setShowAdd(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body" style={{ overflow: 'visible' }}>
                            <div className="form-group">
                                <label className="form-label">Nome do assunto</label>
                                <input id="input-nome-assunto" className="form-input" value={nome}
                                    onChange={e => setNome(e.target.value)} placeholder="Ex: Crédito Consignado" autoFocus />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Grupo de aprovação (opcional)</label>
                                <div className="form-row">
                                    <select className="form-select" value={grupoId} onChange={e => setGrupoId(e.target.value)}>
                                        <option value="">Selecionar</option>
                                        {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancelar</button>
                            <button id="btn-criar-assunto" className="btn btn-primary" onClick={criar} disabled={saving || !nome.trim()}>Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {editingAssunto && (
                <div className="modal-overlay" onClick={() => setEditingAssunto(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 550, overflow: 'visible' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Editar assunto</h3>
                            <button className="modal-close" onClick={() => setEditingAssunto(null)}><X size={18} /></button>
                        </div>
                        <div className="modal-body" style={{ overflow: 'visible' }}>
                            <div className="form-group">
                                <label className="form-label">Nome do assunto</label>
                                <input
                                    id="input-editar-nome-assunto"
                                    className="form-input"
                                    value={editNome}
                                    onChange={e => setEditNome(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && salvarEdicao()}
                                    autoFocus
                                />
                                <div className="form-group mt-4">
                                    <label className="form-label">Selecionar aprovadores cadastrados</label>
                                    <DropdownMultiSelect
                                        opcoes={grupos}
                                        selecionados={editGruposAssunto}
                                        onChange={setEditGruposAssunto}
                                    />
                                    {editGruposAssunto.length > 0 && (
                                        <div className="tag-list mt-2" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                            {editGruposAssunto.map(id => {
                                                const g = grupos.find(x => x.id === id)
                                                return g ? <span key={id} className="badge badge-group">{g.nome.toUpperCase()}</span> : null
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setEditingAssunto(null)}>Cancelar</button>
                            <button
                                id="btn-salvar-edicao-assunto"
                                className="btn btn-primary"
                                onClick={salvarEdicao}
                                disabled={saving || !editNome.trim()}
                            >
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />} Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
        </div>
    )
}


// ── Main Config Page ─────────────────────────────────────────────────────────
export default function ConfiguracaoPage() {
    const [section, setSection] = useState<Section>('grupos')

    const cards = [
        {
            id: 'grupos' as Section,
            icon: Shield,
            title: 'Aprovadores',
            desc: 'Crie aprovadores para segmentos ou assuntos.\nDefina um grupo universal para todas as aprovações.',
        },
        {
            id: 'publico' as Section,
            icon: Users,
            title: 'Público alvo',
            desc: 'Gerencie segmentos de clientes e suas regras de aprovação.',
        },
        {
            id: 'assunto' as Section,
            icon: Tag,
            title: 'Assunto',
            desc: 'Cadastre assuntos e defina regras de uso e aprovação por público.',
        },
    ]

    return (
        <div className="main-inner">
            {/* Breadcrumb */}
            <div className="breadcrumb">
                <button className="breadcrumb-back">← Voltar</button>
                <span className="breadcrumb-sep">|</span>
                <span className="breadcrumb-item">Home</span>
                <span className="breadcrumb-sep">›</span>
                <span className="breadcrumb-item current">Configuração</span>
            </div>

            {/* Title */}
            <h1 className="page-title">Configuração de Aprovação</h1>
            <p className="page-subtitle">As regras configuradas aqui determinam automaticamente quem aprova cada peça</p>

            {/* Section cards */}
            <div className="section-cards">
                {cards.map(card => (
                    <div
                        key={card.id}
                        className={`section-card${section === card.id ? ' active' : ''}`}
                        onClick={() => setSection(card.id)}
                    >
                        <div className="section-card-title">
                            <card.icon size={16} />
                            {card.title}
                        </div>
                        <p className="section-card-desc" style={{ whiteSpace: 'pre-line' }}>{card.desc}</p>
                    </div>
                ))}
            </div>

            {/* Content */}
            {section === 'grupos' && <GruposSection />}
            {section === 'publico' && <PublicoAlvoSection />}
            {section === 'assunto' && <AssuntosSection />}
        </div>
    )
}
