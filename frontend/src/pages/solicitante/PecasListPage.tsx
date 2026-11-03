import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MoreVertical, Search, SlidersHorizontal, FileText, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Plus, Calendar, ThumbsUp, ThumbsDown, Clock, Edit2, Eye } from 'lucide-react'

interface Peca {
    id: string
    nome: string
    canal: string
    status: string
    criadoEm: string
    descricao?: string
    publicoAlvo?: { nome: string }
    segmento?: { nome: string }
    assunto?: { nome: string }
    versoes?: {
        id: string
        numeroVersao: number
        status: string
        versaoGrupos?: { grupo: { id: string; nome: string } }[]
        manifestacoes?: { grupoId: string; decisao: string }[]
    }[]
}

const STATUS_CFG: Record<string, { label: string; color: string; border: string }> = {
    RASCUNHO: { label: 'Rascunho', color: '#64748b', border: '#cbd5e1' },
    AGUARDANDO_APROVACAO: { label: 'Em análise', color: '#ea580c', border: '#ea580c' },
    EM_EDICAO: { label: 'Em análise', color: '#ea580c', border: '#ea580c' },
    APROVADA: { label: 'Aprovado', color: '#16a34a', border: '#16a34a' },
    REPROVADA: { label: 'Reprovado', color: '#dc2626', border: '#dc2626' },
    CANCELADA: { label: 'Cancelado', color: '#64748b', border: '#cbd5e1' },
}

const PAGE_SIZE_OPTIONS = [10, 25, 30, 50]

export default function PecasListPage() {
    const navigate = useNavigate()
    const [pecas, setPecas] = useState<Peca[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(30)
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

    async function load() {
        setLoading(true)
        const { data } = await api.get('/pecas')
        setPecas(data)
        setLoading(false)
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load() }, [])

    const filtered = useMemo(() =>
        pecas.filter(p => p.nome.toLowerCase().includes(search.toLowerCase()) || p.canal.toLowerCase().includes(search.toLowerCase())),
        [pecas, search]
    )

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = () => setMenuOpenId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
    const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize)

    function goPage(p: number) { setPage(Math.min(Math.max(1, p), totalPages)) }

    return (
        <div className="main-inner">
            {/* Breadcrumb */}
            <div className="breadcrumb">
                <button className="breadcrumb-back" onClick={() => navigate(-1)} aria-label="Voltar para a página anterior">← Voltar</button>
                <span className="breadcrumb-sep">|</span>
                <span className="breadcrumb-item">Home</span>
                <span className="breadcrumb-sep">›</span>
                <span className="breadcrumb-item current">Peça de comunicação</span>
            </div>

            {/* Title */}
            <h1 className="page-title">Peça de comunicação</h1>

            {/* CTA Banner */}
            <div
                role="button"
                tabIndex={0}
                aria-label="Cadastrar peça de comunicação"
                onClick={() => navigate('/pecas/nova')}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate('/pecas/nova')
                    }
                }}
                style={{
                    background: '#EBF1F2',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    padding: '20px 24px',
                    marginBottom: 16,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.background = '#e2e8ea';
                    e.currentTarget.style.boxShadow = '0 6px 12px -2px rgba(0,0,0,0.1), 0 3px 6px -3px rgba(0,0,0,0.05)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.background = '#EBF1F2';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.06)';
                    e.currentTarget.style.transform = 'translateY(0)';
                }}
            >
                <div style={{
                    width: 44, height: 44, borderRadius: 8,
                    background: 'var(--caixa-orange)', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    position: 'relative',
                    boxShadow: '0 2px 5px rgba(234, 88, 12, 0.3)'
                }}>
                    <FileText size={20} color="white" />
                    <div style={{ position: 'absolute', top: -2, right: -2, background: 'white', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Plus size={10} color="var(--caixa-orange)" strokeWidth={4} />
                    </div>
                </div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--caixa-blue)', marginBottom: 3 }}>
                        Cadastrar peça de comunicação
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        Cadastre sua peça para atender necessidades de comunicação do seu time, evento ou projeto.
                    </div>
                </div>
            </div>

            {/* Search content banner */}
            <div style={{
                background: 'var(--caixa-blue-bg)',
                border: '1px solid var(--caixa-blue-light)',
                borderRadius: 8,
                padding: '14px 20px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
            }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--caixa-blue)', marginBottom: 4 }}>
                        Buscar pelo conteúdo da peça
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        A busca avançada encontra informações dentro da peça, como o título ou texto da mensagem.<br />
                        Exemplo: Em uma peça do tipo SMS, o cliente recebe o título e o texto da mensagem. Para buscar por esse conteúdo, use a busca avançada.
                    </div>
                </div>
                <button style={{
                    background: 'var(--caixa-blue)', color: 'white',
                    border: 'none', borderRadius: 6,
                    padding: '9px 18px', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: 7,
                }}>
                    <Search size={14} /> Busca avançada
                </button>
            </div>

            {/* Search toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Busca pelo nome da peça</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right', lineHeight: 1.4 }}>
                    Esta listagem exibe dados dos últimos 30 dias.<br />Use os filtros para alterar o período.
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <div className="search-input-wrap" style={{ flex: 1, minWidth: 240 }}>
                    <Search size={14} aria-hidden="true" />
                    <input
                        className="search-input"
                        placeholder="Busca apenas pelo nome da peça de comunicação"
                        aria-label="Buscar pelo nome ou canal da peça de comunicação"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1) }}
                    />
                </div>
                <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <SlidersHorizontal size={13} /> Filtrar
                </button>
                <button className="btn btn-secondary btn-sm" style={{ background: 'var(--caixa-blue-light)', color: 'var(--caixa-blue)', fontWeight: 700 }}>
                    Minha Unidade
                </button>
                <button className="btn btn-secondary btn-sm">Minhas peças</button>
            </div>

            {/* List */}
            {loading ? (
                <div className="loading-center"><div className="spinner" /></div>
            ) : pageItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
                    Nenhuma peça encontrada.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {pageItems.map((peca) => {
                        const cfg = STATUS_CFG[peca.status] ?? STATUS_CFG.RASCUNHO
                        const lastVersao = peca.versoes?.[0]
                        const grupos = lastVersao?.versaoGrupos ?? []
                        const manifests = lastVersao?.manifestacoes ?? []
                        const data = format(new Date(peca.criadoEm), "dd/MM/yyyy HH:mm", { locale: ptBR })

                        return (
                            <div
                                key={peca.id}
                                role="button"
                                tabIndex={0}
                                aria-label={`Ver detalhes da peça: ${peca.canal === 'BANNER_APP' ? 'App CAIXA' : peca.canal === 'WHATSAPP' ? 'Whatsapp' : peca.canal === 'EMAIL' ? 'Email Marketing' : peca.canal} - ${peca.nome}`}
                                onClick={() => navigate(`/pecas/${peca.id}`)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        navigate(`/pecas/${peca.id}`)
                                    }
                                }}
                                style={{
                                    background: 'white',
                                    border: '1px solid #e2e8f0',
                                    padding: '24px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 16,
                                    borderRadius: 8,
                                    transition: 'box-shadow 0.15s, border-color 0.15s',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = '#cbd5e1'
                                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = '#e2e8f0'
                                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {/* Row 1: name + status badge */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>
                                            {peca.canal === 'BANNER_APP' ? 'App CAIXA' : peca.canal === 'WHATSAPP' ? 'Whatsapp' : peca.canal === 'EMAIL' ? 'Email Marketing' : peca.canal} - {peca.nome}
                                        </span>
                                        <span style={{
                                            fontSize: 11, fontWeight: 700,
                                            color: cfg.color, background: 'transparent',
                                            border: `1px solid ${cfg.border}`,
                                            borderRadius: 4, padding: '2px 8px',
                                            textTransform: 'none'
                                        }}>
                                            {cfg.label}
                                        </span>
                                    </div>

                                    {/* Description */}
                                    {peca.descricao && (
                                        <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.4 }}>
                                            {peca.descricao}
                                        </div>
                                    )}

                                    {/* Row 2: grupo aprovadores */}
                                    {grupos.length > 0 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                                            <span style={{ fontSize: 14, color: '#1e293b', fontWeight: 500 }}>Aprovador:</span>
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                {grupos.map(vg => {
                                                    const m = manifests.find(x => x.grupoId === vg.grupo.id)

                                                    let color = '#ea580c'
                                                    let bg = '#ffedd5'
                                                    let border = 'transparent'
                                                    let Icon: any = Clock

                                                    if (m?.decisao === 'APROVADO') {
                                                        color = '#16a34a'
                                                        bg = '#dcfce7'
                                                        Icon = ThumbsUp
                                                    } else if (m?.decisao === 'REPROVADO') {
                                                        color = '#dc2626'
                                                        bg = '#fee2e2'
                                                        Icon = ThumbsDown
                                                    }

                                                    if (peca.status === 'RASCUNHO') {
                                                        color = '#64748b'
                                                        bg = 'transparent'
                                                        border = '1px solid #cbd5e1'
                                                        Icon = null
                                                    }

                                                    return (
                                                        <span key={vg.grupo.id} style={{
                                                            fontSize: 11, fontWeight: 700, color, background: bg, border,
                                                            borderRadius: 4, padding: '4px 8px',
                                                            display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase'
                                                        }}>
                                                            {Icon && <Icon size={14} strokeWidth={2.5} />} {vg.grupo.nome}
                                                        </span>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Row 3: ID + date */}
                                    <div style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                                        <span style={{ fontWeight: 600, color: '#475569' }}>##{peca.id.slice(-3)}</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Calendar size={14} color="#94a3b8" />
                                            Criado em: {data}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ position: 'relative' }}>
                                    <button
                                        onClick={e => {
                                            e.stopPropagation()
                                            setMenuOpenId(menuOpenId === peca.id ? null : peca.id)
                                        }}
                                        aria-label={`Mais opções para ${peca.nome}`}
                                        aria-haspopup="true"
                                        aria-expanded={menuOpenId === peca.id}
                                        style={{
                                            background: 'transparent', border: 'none',
                                            color: '#64748b', cursor: 'pointer',
                                            padding: 8, borderRadius: 6,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <MoreVertical size={20} aria-hidden="true" />
                                    </button>

                                    {menuOpenId === peca.id && (
                                        <div style={{
                                            position: 'absolute', top: 36, right: 0,
                                            background: 'white', border: '1px solid #e2e8f0', borderRadius: 6,
                                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                                            padding: 4, zIndex: 10, minWidth: 140
                                        }}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); navigate(`/pecas/${peca.id}`) }}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 8,
                                                    width: '100%', padding: '8px 12px',
                                                    background: 'transparent', border: 'none',
                                                    textAlign: 'left', fontSize: 13, color: '#334155',
                                                    cursor: 'pointer', borderRadius: 4, fontWeight: 500,
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <Eye size={16} /> Visualizar
                                            </button>

                                            {peca.status === 'RASCUNHO' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/pecas/${peca.id}/editar`) }}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: 8,
                                                        width: '100%', padding: '8px 12px',
                                                        background: 'transparent', border: 'none',
                                                        textAlign: 'left', fontSize: 13, color: '#334155',
                                                        cursor: 'pointer', borderRadius: 4, fontWeight: 500,
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <Edit2 size={16} /> Editar
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Pagination */}
            {!loading && filtered.length > 0 && (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginTop: 20, flexWrap: 'wrap', gap: 12,
                    fontSize: 13, color: 'var(--text-secondary)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>Itens por página:</span>
                        <select
                            value={pageSize}
                            onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                            className="form-select"
                            aria-label="Quantidade de itens por página"
                            style={{ padding: '4px 8px', fontSize: 13, width: 'auto' }}
                        >
                            {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ marginRight: 8 }}>
                            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} de {filtered.length}
                        </span>
                        <button className="btn btn-ghost btn-sm btn-icon" disabled={page === 1} onClick={() => goPage(1)} aria-label="Ir para a primeira página"><ChevronFirst size={14} aria-hidden="true" /></button>
                        <button className="btn btn-ghost btn-sm btn-icon" disabled={page === 1} onClick={() => goPage(page - 1)} aria-label="Ir para a página anterior"><ChevronLeft size={14} aria-hidden="true" /></button>
                        <span style={{ padding: '0 8px' }}>Página {page} de {totalPages}</span>
                        <button className="btn btn-ghost btn-sm btn-icon" disabled={page === totalPages} onClick={() => goPage(page + 1)} aria-label="Ir para a próxima página"><ChevronRight size={14} aria-hidden="true" /></button>
                        <button className="btn btn-ghost btn-sm btn-icon" disabled={page === totalPages} onClick={() => goPage(totalPages)} aria-label="Ir para a última página"><ChevronLast size={14} aria-hidden="true" /></button>
                    </div>
                </div>
            )}
        </div>
    )
}
