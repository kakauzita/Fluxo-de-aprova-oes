import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ThumbsUp, ThumbsDown, Clock, Loader2, Eye } from 'lucide-react'
import { api } from '../../lib/api'


interface PendenciaItem {
    grupoId: string
    versaoPecaId: string
    grupo: { nome: string }
    versaoPeca: {
        id: string
        numeroVersao: number
        status: string
        submetidoEm: string
        conteudo: any
        peca: {
            id: string
            nome: string
            canal: string
            publicoAlvo?: { nome: string }
            segmento?: { nome: string }
            assunto?: { nome: string }
            solicitante?: { id: string; nome: string }
        }
        versaoGrupos: { grupo: { id: string; nome: string }; origem: string }[]
        manifestacoes: {
            grupoId: string
            decisao: string
            representadoPor?: { nome: string }
        }[]
    }
}

export default function AprovacoesPage() {
    const navigate = useNavigate()
    const [pendencias, setPendencias] = useState<PendenciaItem[]>([])
    const [loading, setLoading] = useState(true)

    async function load() {
        setLoading(true)
        const { data } = await api.get('/aprovacoes/pendentes')
        setPendencias(data)
        setLoading(false)
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load() }, [])


    // Deduplicate — one entry per versaoPecaId
    const unique = Array.from(new Map(pendencias.map(p => [p.versaoPecaId, p])).values())

    return (
        <div className="main-inner">
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div>
                        <h1 className="page-title">Aprovações Pendentes</h1>
                        <p className="page-description">Peças aguardando sua manifestação</p>
                    </div>
                    <div style={{
                        padding: '6px 14px', borderRadius: 20,
                        background: '#fef3c7', border: '1px solid #fde68a',
                        color: '#d97706', fontSize: 13, fontWeight: 700
                    }}>
                        {unique.length} pendente{unique.length !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>

            <div className="page-body">
                {loading ? (
                    <div className="empty-state"><Loader2 size={32} className="animate-spin" /></div>
                ) : unique.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon" style={{ color: 'var(--caixa-blue)' }}><ThumbsUp size={48} /></div>
                        <div className="empty-state-title">Tudo em dia!</div>
                        <div className="empty-state-text">Não há peças pendentes da sua aprovação.</div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: 16 }}>
                        {unique.map(item => {
                            const { versaoPeca } = item
                            const { peca } = versaoPeca
                            return (
                                <div key={versaoPeca.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>

                                    {/* Card Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{peca.nome}</div>
                                            <div style={{ fontSize: 13, color: '#64748b' }}>{peca.canal}</div>
                                        </div>

                                        {/* Time Badge */}
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: 4,
                                            padding: '4px 8px', borderRadius: 6,
                                            background: '#fef2f2', color: '#dc2626',
                                            fontSize: 12, fontWeight: 600
                                        }}>
                                            <Clock size={12} />
                                            <span>1 dia</span>
                                        </div>
                                    </div>

                                    <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />

                                    {/* Card Details */}
                                    <div style={{ fontSize: 13, color: '#475569', display: 'flex', gap: 16 }}>
                                        <span>Solicitante: {peca.solicitante?.nome ?? 'Desconhecido'}</span>
                                        <span>Prazo: Sem prazo</span>
                                    </div>

                                    {/* Groups */}
                                    <div>
                                        <div style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>Aprovadores:</div>
                                        <div className="flex flex-wrap gap-2">
                                            {versaoPeca.versaoGrupos.slice(0, 3).map(vg => {
                                                const manifestacao = versaoPeca.manifestacoes.find(m => m.grupoId === vg.grupo.id)
                                                const decisao = manifestacao?.decisao

                                                let bgColor = '#fefce8'
                                                let color = '#a16207'
                                                let Icon = Clock

                                                if (decisao === 'APROVADO') {
                                                    bgColor = '#f0fdf4'
                                                    color = '#15803d'
                                                    Icon = ThumbsUp
                                                } else if (decisao === 'REPROVADO') {
                                                    bgColor = '#fef2f2'
                                                    color = '#b91c1c'
                                                    Icon = ThumbsDown
                                                }

                                                return (
                                                    <div key={vg.grupo.id} style={{
                                                        display: 'flex', alignItems: 'center', gap: 6,
                                                        padding: '4px 8px', borderRadius: 4,
                                                        background: bgColor,
                                                        fontSize: 10, fontWeight: 700, color,
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        <Icon size={12} />
                                                        <span>{vg.grupo.nome}</span>
                                                    </div>
                                                )
                                            })}
                                            {versaoPeca.versaoGrupos.length > 3 && (
                                                <div style={{
                                                    display: 'flex', alignItems: 'center',
                                                    padding: '4px 8px', borderRadius: 4,
                                                    background: '#f1f5f9', color: '#334155',
                                                    fontSize: 11, fontWeight: 700
                                                }}>
                                                    +{versaoPeca.versaoGrupos.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                                        <button
                                            className="btn btn-primary"
                                            style={{ width: '100%', justifyContent: 'center', background: '#005CA9', border: 'none', color: 'white' }}
                                            onClick={() => navigate(`/pecas/${peca.id}`)}
                                        >
                                            <Eye size={16} /> Visualizar conteúdo
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

        </div>
    )
}
