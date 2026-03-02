import { useState, useEffect } from 'react'
import { Plus, X, Loader2, ChevronRight, Tag, Target } from 'lucide-react'
import { api } from '../../lib/api'

interface PublicoAlvo {
    id: string
    nome: string
    segmentos: Segmento[]
}
interface Segmento {
    id: string
    nome: string
    publicoAlvoId: string
    segmentoGrupos: { grupo: { id: string; nome: string } }[]
}
interface Grupo {
    id: string
    nome: string
    isUniversal: boolean
}
interface Assunto {
    id: string
    nome: string
    assuntoGrupos: { grupo: { id: string; nome: string } }[]
}

function Toast({ msg, type }: { msg: string; type: string }) {
    return <div className={`toast toast-${type}`}>{type === 'success' ? '✅' : '❌'} {msg}</div>
}

export function PublicosAlvoPage() {
    const [publicos, setPublicos] = useState<PublicoAlvo[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [nome, setNome] = useState('')
    const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)

    useEffect(() => { load() }, [])

    async function load() {
        setLoading(true)
        const { data } = await api.get('/admin/publicos-alvo')
        setPublicos(data)
        setLoading(false)
    }

    function showToastMsg(msg: string, type = 'success') {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    async function criar() {
        await api.post('/admin/publicos-alvo', { nome })
        setNome(''); setShowModal(false); await load()
        showToastMsg('Público alvo criado!')
    }

    return (
        <div>
            <div className="page-header">
                <div className="header-row">
                    <div>
                        <h1 className="page-title">Públicos Alvo</h1>
                        <p className="page-description">Estrutura hierárquica pai → segmento</p>
                    </div>
                    <button id="btn-novo-publico" className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={16} /> Novo Público Alvo
                    </button>
                </div>
            </div>
            <div className="page-body">
                {loading ? <div className="empty-state"><Loader2 size={28} className="animate-spin" /></div> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {publicos.map(pa => (
                            <div key={pa.id} className="card">
                                <div className="flex items-center gap-3 mb-2">
                                    <Target size={16} color="var(--brand-400)" />
                                    <span className="font-semibold">{pa.nome}</span>
                                    <span className="badge badge-rascunho">{pa.segmentos.length} segmentos</span>
                                </div>
                                {pa.segmentos.map(seg => (
                                    <div key={seg.id} className="flex items-center gap-2 mt-2" style={{ paddingLeft: 24 }}>
                                        <ChevronRight size={12} color="var(--text-muted)" />
                                        <span style={{ fontSize: 13 }}>{seg.nome}</span>
                                        <div className="flex gap-1">
                                            {seg.segmentoGrupos.map(sg => (
                                                <span key={sg.grupo.id} className="badge badge-universal" style={{ fontSize: 10 }}>{sg.grupo.nome}</span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Novo Público Alvo</h3>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowModal(false)}><X size={16} /></button>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nome</label>
                            <input id="input-nome-publico" className="form-input" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Pessoa Física" autoFocus />
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button id="btn-criar-publico" className="btn btn-primary" onClick={criar} disabled={!nome.trim()}><Plus size={14} />Criar</button>
                        </div>
                    </div>
                </div>
            )}
            {toast && <Toast msg={toast.msg} type={toast.type} />}
        </div>
    )
}

export function SegmentosPage() {
    const [segmentos, setSegmentos] = useState<Segmento[]>([])
    const [publicos, setPublicos] = useState<PublicoAlvo[]>([])
    const [grupos, setGrupos] = useState<Grupo[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [nome, setNome] = useState('')
    const [publicoId, setPublicoId] = useState('')
    const [grupoIds, setGrupoIds] = useState<string[]>([])
    const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)

    useEffect(() => { load() }, [])

    async function load() {
        setLoading(true)
        const [s, p, g] = await Promise.all([
            api.get('/admin/segmentos'),
            api.get('/admin/publicos-alvo'),
            api.get('/admin/grupos'),
        ])
        setSegmentos(s.data)
        setPublicos(p.data)
        setGrupos(g.data.filter((g: Grupo) => !g.isUniversal))
        setLoading(false)
    }

    function showToastMsg(msg: string, type = 'success') {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    async function criar() {
        if (!publicoId || grupoIds.length === 0) return
        try {
            await api.post('/admin/segmentos', { nome, publicoAlvoId: publicoId, grupoIds })
            setNome(''); setPublicoId(''); setGrupoIds([])
            setShowModal(false); await load()
            showToastMsg('Segmento criado!')
        } catch (e: any) {
            showToastMsg(e.response?.data?.error ?? 'Erro.', 'error')
        }
    }

    function toggleGrupo(id: string) {
        setGrupoIds(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id])
    }

    return (
        <div>
            <div className="page-header">
                <div className="header-row">
                    <div>
                        <h1 className="page-title">Segmentos</h1>
                        <p className="page-description">Filhos de Público Alvo — obrigatório ter ao menos 1 grupo</p>
                    </div>
                    <button id="btn-novo-segmento" className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={16} /> Novo Segmento
                    </button>
                </div>
            </div>
            <div className="page-body">
                {loading ? <div className="empty-state"><Loader2 size={28} className="animate-spin" /></div> : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Segmento</th>
                                    <th>Público Alvo</th>
                                    <th>Grupos Vinculados</th>
                                </tr>
                            </thead>
                            <tbody>
                                {segmentos.map(seg => (
                                    <tr key={seg.id}>
                                        <td className="font-semibold">{seg.nome}</td>
                                        <td className="text-secondary">{publicos.find(p => p.id === seg.publicoAlvoId)?.nome ?? '—'}</td>
                                        <td>
                                            <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                                                {seg.segmentoGrupos.map(sg => (
                                                    <span key={sg.grupo.id} className="badge badge-aprovador">{sg.grupo.nome}</span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Novo Segmento</h3>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowModal(false)}><X size={16} /></button>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nome</label>
                            <input id="input-nome-segmento" className="form-input" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Baixa Renda" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Público Alvo</label>
                            <select id="select-publico-segmento" className="form-select" value={publicoId} onChange={e => setPublicoId(e.target.value)}>
                                <option value="">Selecione...</option>
                                {publicos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Grupos de Aprovação <span style={{ color: 'var(--red-400)' }}>*</span></label>
                            <p className="form-hint mb-2">Ao menos 1 grupo obrigatório (RN-10)</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {grupos.map(g => (
                                    <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                                        <input type="checkbox" checked={grupoIds.includes(g.id)} onChange={() => toggleGrupo(g.id)} />
                                        {g.nome}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button id="btn-criar-segmento" className="btn btn-primary" onClick={criar} disabled={!nome.trim() || !publicoId || grupoIds.length === 0}>
                                <Plus size={14} /> Criar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {toast && <Toast msg={toast.msg} type={toast.type} />}
        </div>
    )
}

export function AssuntosPage() {
    const [assuntos, setAssuntos] = useState<Assunto[]>([])
    const [grupos, setGrupos] = useState<Grupo[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [nome, setNome] = useState('')
    const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)

    useEffect(() => { load() }, [])

    async function load() {
        setLoading(true)
        const [a, g] = await Promise.all([api.get('/admin/assuntos'), api.get('/admin/grupos')])
        setAssuntos(a.data); setGrupos(g.data.filter((g: Grupo) => !g.isUniversal))
        setLoading(false)
    }

    function showToastMsg(msg: string, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

    async function criar() {
        await api.post('/admin/assuntos', { nome })
        setNome(''); setShowModal(false); await load()
        showToastMsg('Assunto criado!')
    }

    async function vincularGrupo(assuntoId: string, grupoId: string) {
        try {
            await api.post(`/admin/assuntos/${assuntoId}/grupos`, { grupoId })
            await load(); showToastMsg('Grupo vinculado!')
        } catch (e: any) { showToastMsg(e.response?.data?.error ?? 'Erro.', 'error') }
    }

    return (
        <div>
            <div className="page-header">
                <div className="header-row">
                    <div>
                        <h1 className="page-title">Assuntos</h1>
                        <p className="page-description">Temas das peças — grupos são opcionais (RN-11)</p>
                    </div>
                    <button id="btn-novo-assunto" className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={16} /> Novo Assunto
                    </button>
                </div>
            </div>
            <div className="page-body">
                {loading ? <div className="empty-state"><Loader2 size={28} className="animate-spin" /></div> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {assuntos.map(a => (
                            <div key={a.id} className="card">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Tag size={16} color="var(--text-muted)" />
                                        <span className="font-semibold">{a.nome}</span>
                                        <div className="flex gap-1">
                                            {a.assuntoGrupos.map(ag => (
                                                <span key={ag.grupo.id} className="badge badge-aprovador">{ag.grupo.nome}</span>
                                            ))}
                                            {a.assuntoGrupos.length === 0 && <span className="text-sm text-muted">Sem grupos vinculados</span>}
                                        </div>
                                    </div>
                                    <select
                                        className="form-select"
                                        style={{ width: 180, padding: '5px 10px', fontSize: 11 }}
                                        onChange={e => { if (e.target.value) vincularGrupo(a.id, e.target.value); e.target.value = '' }}
                                        defaultValue=""
                                    >
                                        <option value="">+ Vincular grupo</option>
                                        {grupos.filter(g => !a.assuntoGrupos.find(ag => ag.grupo.id === g.id)).map(g => (
                                            <option key={g.id} value={g.id}>{g.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Novo Assunto</h3>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowModal(false)}><X size={16} /></button>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nome</label>
                            <input id="input-nome-assunto" className="form-input" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Crédito" autoFocus />
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button id="btn-criar-assunto" className="btn btn-primary" onClick={criar} disabled={!nome.trim()}><Plus size={14} />Criar</button>
                        </div>
                    </div>
                </div>
            )}
            {toast && <Toast msg={toast.msg} type={toast.type} />}
        </div>
    )
}
