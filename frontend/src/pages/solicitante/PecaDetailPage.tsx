import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Users, Loader2, CheckCircle, XCircle, Clock, X, ThumbsUp, ThumbsDown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function PecaDetailPage() {
    const { user } = useAuth()
    const { id } = useParams()
    const navigate = useNavigate()
    const [peca, setPeca] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [activeFilter, setActiveFilter] = useState<'all' | 'aprovado' | 'reprovado'>('all')

    // Voting states
    const [votando, setVotando] = useState(false)
    const [decisao, setDecisao] = useState<'APROVADO' | 'REPROVADO' | null>(null)
    const [justificativa, setJustificativa] = useState('')
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)

    function showToast(msg: string, type = 'success') {
        setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
    }

    useEffect(() => { load() }, [id])
    async function load() {
        setLoading(true)
        const { data } = await api.get(`/pecas/${id}`)
        setPeca(data)
        setLoading(false)
    }

    if (loading) return <div className="loading-center" style={{ marginTop: 80 }}><div className="spinner" /></div>
    if (!peca) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Peça não encontrada.</div>

    async function votar() {
        if (!decisao) return
        if (decisao === 'REPROVADO' && !justificativa.trim()) {
            showToast('Justificativa obrigatória para reprovação. (RN-03)', 'error'); return
        }
        setSaving(true)
        try {
            await api.post(`/aprovacoes/${lastVersao.id}/votar`, {
                decisao,
                justificativa: justificativa.trim() || undefined,
            })
            setVotando(false)
            setDecisao(null)
            setJustificativa('')
            await load()
            showToast(decisao === 'APROVADO' ? '✅ Peça aprovada!' : '❌ Peça reprovada.', 'success')
        } catch (e: any) {
            showToast(e.response?.data?.error ?? 'Erro ao votar.', 'error')
        } finally { setSaving(false) }
    }

    const lastVersao = peca.versoes?.[peca.versoes.length - 1]
    const versaoGrupos: any[] = lastVersao?.versaoGrupos ?? []
    const manifestacoes: any[] = lastVersao?.manifestacoes ?? []

    // Derivar status geral
    const statusGeral: Record<string, { label: string; color: string }> = {
        RASCUNHO: { label: 'Rascunho', color: '#6b7280' },
        AGUARDANDO_APROVACAO: { label: 'Em análise', color: '#d97706' },
        APROVADA: { label: 'Aprovado', color: '#16a34a' },
        REPROVADA: { label: 'Reprovado', color: '#dc2626' },
    }
    const sg = statusGeral[peca.status] ?? statusGeral.RASCUNHO

    // Filter groups
    const gruposFiltrados = versaoGrupos.filter(vg => {
        const m = manifestacoes.find((x: any) => x.grupoId === vg.grupoId)
        if (activeFilter === 'all') return true
        if (activeFilter === 'aprovado') return m?.decisao === 'APROVADO'
        if (activeFilter === 'reprovado') return m?.decisao === 'REPROVADO'
        return !m
    })
    const conteudo = lastVersao?.conteudo ?? {}

    const CANAL_LABEL: Record<string, string> = {
        SMS: 'SMS', PUSH: 'Push', WHATSAPP: 'WhatsApp', EMAIL: 'Email Marketing', BANNER_APP: 'App CAIXA'
    }

    return (
        <div className="main-inner">
            {/* Breadcrumb */}
            <div className="breadcrumb">
                <button className="breadcrumb-back" onClick={() => navigate('/pecas')}>← Voltar</button>
                <span className="breadcrumb-sep">|</span>
                <span className="breadcrumb-item">Home</span>
                <span className="breadcrumb-sep">›</span>
                <span className="breadcrumb-item current">Peça de comunicação</span>
            </div>

            {/* 2-column layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>

                {/* LEFT: content */}
                <div>
                    <h2 style={{
                        fontSize: 22, fontWeight: 700, color: 'var(--caixa-blue)',
                        borderLeft: '4px solid var(--caixa-orange)', paddingLeft: 14,
                        marginBottom: 24,
                    }}>
                        Conteúdo da peça
                    </h2>

                    {/* Meta grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>Tipo da peça</div>
                            <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>
                                {CANAL_LABEL[peca.canal] ?? peca.canal}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
                                {peca.canal === 'EMAIL' ? 'Assunto' : 'Título da peça'}
                            </div>
                            <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>
                                {peca.canal === 'EMAIL' ? conteudo.assunto : (conteudo.titulo ?? peca.nome)}
                            </div>
                        </div>
                    </div>

                    {/* App for PUSH */}
                    {peca.canal === 'PUSH' && conteudo.app && (
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                                Aplicativo de Destino
                            </div>
                            <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                {conteudo.app}
                            </div>
                        </div>
                    )}

                    {/* Mensagem ou Corpo */}
                    {(conteudo.mensagem || conteudo.corpo || conteudo.corpoHtml) && (
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                                {peca.canal === 'EMAIL' ? 'Corpo HTML (Mensagem)' : 'Mensagem da peça'}
                            </div>
                            <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                {conteudo.mensagem ?? conteudo.corpo ?? conteudo.corpoHtml}
                            </div>
                        </div>
                    )}

                    {/* Link (Texto e URL) */}
                    {(conteudo.textoLink || conteudo.urlDestino) && (
                        <div style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 32 }}>
                            {conteudo.textoLink && (
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Texto do link</div>
                                    <div style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>{conteudo.textoLink}</div>
                                </div>
                            )}
                            {conteudo.urlDestino && (
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>URL de destino</div>
                                    <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                                        <a href={conteudo.urlDestino.startsWith('http') ? conteudo.urlDestino : `https://${conteudo.urlDestino}`} target="_blank" rel="noreferrer" style={{ color: 'var(--caixa-blue)', textDecoration: 'underline' }}>
                                            {conteudo.urlDestino}
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Observação */}
                    {conteudo.observacoes && (
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                                Observações/Considerações
                            </div>
                            <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                {conteudo.observacoes}
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    {peca.descricao && (
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Descrição</div>
                            <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{peca.descricao}</div>
                        </div>
                    )}
                </div>

                {/* RIGHT: approval status panel */}
                <div style={{
                    position: 'sticky',
                    top: 24,
                    background: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                            Situação da aprovação
                        </span>
                        <span style={{
                            fontSize: 12, fontWeight: 700,
                            color: sg.color, padding: '2px 10px',
                            border: `1.5px solid ${sg.color}`,
                            borderRadius: 4,
                        }}>
                            {sg.label}
                        </span>
                    </div>

                    {/* Filter tabs */}
                    {versaoGrupos.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                            {([['all', 'Em análise'], ['aprovado', 'Aprovados'], ['reprovado', 'Reprovado']] as const).map(([key, label]) => (
                                <button
                                    key={key}
                                    onClick={() => setActiveFilter(key)}
                                    style={{
                                        fontSize: 11, fontWeight: 600, padding: '4px 10px',
                                        borderRadius: 4, border: '1.5px solid',
                                        borderColor: activeFilter === key ? 'var(--caixa-blue)' : 'var(--border)',
                                        background: activeFilter === key ? 'var(--caixa-blue-bg)' : 'white',
                                        color: activeFilter === key ? 'var(--caixa-blue)' : 'var(--text-muted)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Groups */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {gruposFiltrados.length === 0 ? (
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                                Nenhum grupo neste filtro.
                            </div>
                        ) : gruposFiltrados.map((vg: any) => {
                            const m = manifestacoes.find((x: any) => x.grupoId === vg.grupoId)
                            const decisao = m?.decisao
                            const borderColor = decisao === 'APROVADO' ? '#86efac' : decisao === 'REPROVADO' ? '#fca5a5' : '#e2e8f0'
                            const bgColor = decisao === 'APROVADO' ? '#f0fdf4' : decisao === 'REPROVADO' ? '#fff5f5' : '#f8fafc'

                            return (
                                <div key={vg.grupoId ?? vg.grupo?.id} style={{
                                    background: bgColor,
                                    border: `1px solid ${borderColor}`,
                                    borderRadius: 6,
                                    padding: '12px 14px',
                                }}>
                                    {/* Group header */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Users size={14} color="var(--caixa-blue)" />
                                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--caixa-blue)' }}>
                                                {(vg.grupo?.nome ?? '').toUpperCase()}
                                            </span>
                                        </div>
                                        {!decisao && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#b45309' }}>
                                                <Clock size={12} /> Em análise
                                            </span>
                                        )}
                                        {decisao === 'APROVADO' && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#16a34a' }}>
                                                <CheckCircle size={12} /> Aprovado
                                            </span>
                                        )}
                                        {decisao === 'REPROVADO' && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#dc2626' }}>
                                                <XCircle size={12} /> Reprovado
                                            </span>
                                        )}
                                    </div>

                                    {/* Approver info */}
                                    {m && (
                                        <>
                                            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: 2 }}>
                                                {decisao === 'APROVADO' ? 'Aprovado' : 'Reprovado'} por: {m.representadoPor?.nome ?? m.representadoPor} – {m.representadoPor?.codigo ?? ''}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                Unidade: {m.representadoPor?.unidade ?? ''}
                                            </div>
                                            {/* Reprovação quote */}
                                            {m.justificativa && (
                                                <div style={{
                                                    marginTop: 8,
                                                    background: 'rgba(220,38,38,0.07)',
                                                    border: '1px solid rgba(220,38,38,0.15)',
                                                    borderRadius: 4, padding: '8px 10px',
                                                    fontSize: 12, color: '#7f1d1d',
                                                    fontStyle: 'italic',
                                                }}>
                                                    "{m.justificativa}"
                                                    {m.manifestadoEm && (
                                                        <div style={{ marginTop: 4, textAlign: 'right', fontSize: 10.5, color: '#9ca3af' }}>
                                                            {format(new Date(m.manifestadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )
                        })}

                        {/* Unidades adicionais */}
                        {lastVersao?.unidadesAdicionais?.length > 0 && (
                            <>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginTop: 4 }}>Unidades Adicionais</div>
                                {lastVersao.unidadesAdicionais.map((ua: any) => (
                                    <div key={ua.id} style={{
                                        background: '#f8fafc', border: '1px solid #e2e8f0',
                                        borderRadius: 6, padding: '10px 14px',
                                        fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600,
                                    }}>
                                        {ua.codigo} – {ua.nome}
                                    </div>
                                ))}
                            </>
                        )}
                    </div>

                </div>
            </div>

            {/* Sticky Action Footer */}
            {user?.perfil === 'APROVADOR' && peca.status === 'AGUARDANDO_APROVACAO' && !votando && (
                <div style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 200, /* Fixed to not overlap sidebar */
                    right: 0,
                    background: 'white',
                    borderTop: '1px solid var(--border)',
                    padding: '16px 32px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 16,
                    boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
                    zIndex: 50,
                }}>
                    <button
                        className="btn"
                        style={{ color: '#dc2626', border: '1px solid #dc2626', background: 'white', fontSize: 14, padding: '10px 24px', fontWeight: 700, borderRadius: 6 }}
                        onClick={() => { setVotando(true); setDecisao('REPROVADO') }}
                    >
                        <ThumbsDown size={18} strokeWidth={2.5} /> Reprovar
                    </button>
                    <button
                        className="btn"
                        style={{ color: 'white', background: '#16a34a', border: 'none', fontSize: 14, padding: '10px 24px', fontWeight: 700, borderRadius: 6 }}
                        onClick={() => { setVotando(true); setDecisao('APROVADO') }}
                    >
                        <ThumbsUp size={18} strokeWidth={2.5} /> Aprovar
                    </button>
                </div>
            )}

            {/* Voting Modals */}
            {votando && decisao === 'REPROVADO' && (
                <div className="modal-overlay" onClick={() => { setVotando(false); setDecisao(null); setJustificativa('') }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 8, width: 500, overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>
                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#b91c1c' }}>Reprovar peça</h3>
                            <button onClick={() => { setVotando(false); setDecisao(null); setJustificativa('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', display: 'flex', alignItems: 'center' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ padding: '24px' }}>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                                    Motivo da reprovação
                                </label>
                                <textarea
                                    value={justificativa}
                                    onChange={e => setJustificativa(e.target.value)}
                                    placeholder="Explique o motivo da reprovação e os ajustes necessários."
                                    style={{ width: '100%', minHeight: 120, padding: 12, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, resize: 'vertical', outline: 'none' }}
                                />
                                <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#64748b' }}>
                                    Essa mensagem será exibida ao solicitante para que ele possa realizar os ajustes necessários.
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: 'white' }}>
                            <button
                                onClick={() => { setVotando(false); setDecisao(null); setJustificativa('') }}
                                style={{ background: 'transparent', border: '1px solid #005CA9', color: '#005CA9', borderRadius: 6, padding: '8px 24px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={votar}
                                disabled={saving || !justificativa.trim()}
                                style={{ background: '#e07604', color: 'white', border: 'none', borderRadius: 6, padding: '8px 24px', fontWeight: 600, cursor: saving || !justificativa.trim() ? 'not-allowed' : 'pointer', fontSize: 14, opacity: saving || !justificativa.trim() ? 0.7 : 1 }}
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} /> : null}
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {votando && decisao === 'APROVADO' && (
                <div className="modal-overlay" onClick={() => { setVotando(false); setDecisao(null) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 8, width: 440, overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: '#005CA9', color: 'white' }}>
                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Aprovar peça?</h3>
                            <button onClick={() => { setVotando(false); setDecisao(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ padding: '40px 24px' }}>
                            <p style={{ margin: 0, fontSize: 15, color: '#334155' }}>
                                Tem certeza de que deseja aprovar a peça?
                            </p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 24px', background: 'white', borderTop: '1px solid #e2e8f0' }}>
                            <button
                                onClick={() => { setVotando(false); setDecisao(null) }}
                                style={{ background: 'transparent', border: '1px solid #005CA9', color: '#005CA9', borderRadius: 6, padding: '8px 24px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
                            >
                                cancelar
                            </button>
                            <button
                                onClick={votar}
                                disabled={saving}
                                style={{ background: '#e07604', color: 'white', border: 'none', borderRadius: 6, padding: '8px 24px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, opacity: saving ? 0.7 : 1 }}
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} /> : null}
                                Aprovar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
        </div>
    )
}
