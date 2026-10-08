import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { X, Loader2, ChevronRight } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Canal = 'SMS' | 'PUSH' | 'WHATSAPP' | 'EMAIL' | 'BANNER_APP'
interface Option { id: string; nome: string }
interface GrupoCalculado { id: string; nome: string; origem: string; unidades: { codigo: string; nome: string }[] }

// ─── Canal config ─────────────────────────────────────────────────────────────
const CANAL_CFG: { id: Canal; label: string; desc: string; emoji: string }[] = [
    { id: 'SMS', label: 'SMS', desc: 'Mensagem de texto curtas e diretas', emoji: '💬' },
    { id: 'WHATSAPP', label: 'Whatsapp', desc: 'Mensagens ricas com texto, imagens e possibilidade de link', emoji: '📲' },
    { id: 'BANNER_APP', label: 'App CAIXA', desc: 'Comunicação no formato banner (imagem) que aparece no topo do app CAIXA', emoji: '📱' },
    { id: 'EMAIL', label: 'Email Marketing', desc: 'Mensagens personalizadas por e-mail com maior espaço para texto e imagens podendo conter link.', emoji: '✉️' },
    { id: 'PUSH', label: 'Push', desc: 'Mensagem de texto curtas e diretas enviada para um app específico', emoji: '🔔' },
]

// ─── Push app options ──────────────────────────────────────────────────────────
const PUSH_APPS = ['Sou Caixa', 'Pé de meia', 'FGTS', 'Caixa TEM']

// ─── Toast ────────────────────────────────────────────────────────────────────
function useToast() {
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
    function show(msg: string, type: 'success' | 'error' = 'success') {
        setToast({ msg, type }); setTimeout(() => setToast(null), 4000)
    }
    return { toast, show }
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function NovaPecaPage() {
    const navigate = useNavigate()
    const { toast, show } = useToast()
    const [step, setStep] = useState(0) // 0=canal, 1=dados, 2=conteúdo
    const [saving, setSaving] = useState(false)

    // Step 0 — canal
    const [canal, setCanal] = useState<Canal>('PUSH')

    // Step 1 — dados
    const [nome, setNome] = useState('')
    const [descricao, setDescricao] = useState('')
    const [publicoAlvoId, setPublicoAlvoId] = useState('')
    const [segmentosIds, setSegmentosIds] = useState<string[]>([])
    const [assuntosIds, setAssuntosIds] = useState<string[]>([])
    const [novaUnidade, setNovaUnidade] = useState('')

    const [publicos, setPublicos] = useState<Option[]>([])
    const [segmentos, setSegmentos] = useState<Option[]>([])
    const [allSegmentos, setAllSegmentos] = useState<any[]>([])
    const [assuntos, setAssuntos] = useState<Option[]>([])
    const [grupos, setGrupos] = useState<GrupoCalculado[]>([])
    const [pecaId, setPecaId] = useState<string | null>(null)

    // Step 2 — conteúdo
    const [pushApp, setPushApp] = useState('')
    const [conteudo, setConteudo] = useState<Record<string, string>>({})

    useEffect(() => { loadConfig() }, [])
    async function loadConfig() {
        const [p, s, a] = await Promise.all([
            api.get('/admin/publicos-alvo'),
            api.get('/admin/segmentos'),
            api.get('/admin/assuntos'),
        ])
        setPublicos(p.data)
        setAllSegmentos(s.data)
        setAssuntos(a.data)
    }

    useEffect(() => {
        setSegmentos(allSegmentos.filter((s: any) => s.publicoAlvoId === publicoAlvoId))
        setSegmentosIds([])
    }, [publicoAlvoId])


    // Carrega aprovadores reativamente sempre que segmento ou assunto mudar
    useEffect(() => {
        if (segmentosIds.length > 0 && assuntosIds.length > 0) {
            loadGruposPreview(segmentosIds[0], assuntosIds[0])
        } else {
            setGrupos([])
        }
    }, [segmentosIds, assuntosIds])

    async function loadGruposPreview(segmentoId: string, assuntoId: string) {
        try {
            const { data } = await api.get('/pecas/grupos-preview', { params: { segmentoId, assuntoId } })
            setGrupos(data)
        } catch { setGrupos([]) }
    }

    // ── Segmento multi-select helpers ──────────────────────────────────────────
    function toggleSegmento(id: string) {
        setSegmentosIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }
    function removeSegmento(id: string) { setSegmentosIds(prev => prev.filter(x => x !== id)) }

    // ── Assunto multi-select helpers ───────────────────────────────────────────
    function toggleAssunto(id: string) {
        setAssuntosIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }
    function removeAssunto(id: string) { setAssuntosIds(prev => prev.filter(x => x !== id)) }

    // ── Save dados ──────────────────────────────────────────────────────────────
    async function salvarDados() {
        if (!nome.trim() || !publicoAlvoId || segmentosIds.length === 0 || assuntosIds.length === 0) {
            show('Preencha todos os campos obrigatórios.', 'error'); return
        }
        setSaving(true)
        try {
            const payload = {
                nome, descricao, canal,
                publicoAlvoId,
                segmentoId: segmentosIds[0],
                assuntoId: assuntosIds[0],
            }
            if (!pecaId) {
                const { data } = await api.post('/pecas', payload)
                setPecaId(data.id)
            } else {
                await api.patch(`/pecas/${pecaId}`, payload)
            }
            show('Rascunho salvo!')
            setStep(2)
        } catch (e: any) {
            show(e.response?.data?.error ?? 'Erro ao salvar.', 'error')
        } finally { setSaving(false) }
    }

    // ── Submit ──────────────────────────────────────────────────────────────────
    async function submeter() {
        if (!pecaId) { show('Salve os dados primeiro.', 'error'); return }
        setSaving(true)
        try {
            const payload: Record<string, string> = { ...conteudo }
            if (canal === 'PUSH' && pushApp) payload.app = pushApp
            await api.post(`/pecas/${pecaId}/submeter`, { conteudo: payload })
            show('Peça enviada para aprovação!')
            setTimeout(() => navigate('/pecas'), 1600)
        } catch (e: any) {
            show(e.response?.data?.error ?? 'Erro ao submeter.', 'error')
        } finally { setSaving(false) }
    }

    // ── Group by origem for the sidebar ───────────────────────────────────────


    // ─── STEP 0 ────────────────────────────────────────────────────────────────
    if (step === 0) {
        return (
            <div className="main-inner">
                <div className="breadcrumb">
                    <button className="breadcrumb-back" onClick={() => navigate('/pecas')}>← Voltar</button>
                    <span className="breadcrumb-sep">|</span>
                    <span className="breadcrumb-item">Home</span>
                    <span className="breadcrumb-sep">›</span>
                    <span className="breadcrumb-item current">Peça de comunicação</span>
                </div>

                <h1 className="page-title">Cadastrar peça de comunicação</h1>
                <p className="page-subtitle" style={{ marginBottom: 28 }}>Escolha como você deseja se comunicar com o seu público</p>

                {/* Canal grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
                    {CANAL_CFG.map((c, i) => {
                        const selected = canal === c.id
                        // Row 2 has only 2 items — center them
                        const isRow2 = i >= 3
                        return (
                            <div
                                key={c.id}
                                onClick={() => setCanal(c.id)}
                                style={{
                                    background: '#EBF1F2',
                                    border: `2px solid ${selected ? 'var(--caixa-blue)' : 'transparent'}`,
                                    borderRadius: 8,
                                    padding: '24px 20px',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    transition: 'border-color 0.15s, background 0.15s',
                                    ...(isRow2 && i === 3 ? { gridColumn: '1 / 2' } : {}),
                                    ...(isRow2 && i === 4 ? { gridColumn: '2 / 3' } : {}),
                                }}
                            >
                                {/* Radio top-right */}
                                <div style={{
                                    position: 'absolute', top: 16, right: 16,
                                    width: 20, height: 20, borderRadius: '50%',
                                    border: `2px solid ${selected ? '#16a34a' : '#9ca3af'}`,
                                    background: selected ? '#16a34a' : 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {selected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                    <span style={{ fontSize: 22 }}>{c.emoji}</span>
                                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--caixa-blue)' }}>{c.label}</span>
                                </div>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{c.desc}</p>
                            </div>
                        )
                    })}
                </div>

                {/* Footer buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <button className="btn btn-ghost" onClick={() => navigate('/pecas')}>Voltar</button>
                    <button
                        id="btn-configurar-peca"
                        style={{
                            background: 'var(--caixa-orange)', color: 'white',
                            border: 'none', borderRadius: 6,
                            padding: '11px 24px', fontWeight: 700, fontSize: 14,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                        }}
                        onClick={() => setStep(1)}
                    >
                        Configurar peça de comunicação <ChevronRight size={16} />
                    </button>
                </div>

                {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
            </div>
        )
    }

    // ─── STEP 1: Dados ─────────────────────────────────────────────────────────
    if (step === 1) {
        return (
            <div className="main-inner">
                <div className="breadcrumb">
                    <button className="breadcrumb-back" onClick={() => navigate('/pecas')}>← Voltar</button>
                    <span className="breadcrumb-sep">|</span>
                    <span className="breadcrumb-item">Home</span>
                    <span className="breadcrumb-sep">›</span>
                    <span className="breadcrumb-item current">Peça de comunicação</span>
                </div>

                {/* Step tabs */}
                <StepTabs step={1} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32, alignItems: 'start' }}>
                    {/* Left: form */}
                    <div>
                        {/* Identificação */}
                        <SectionTitle>Identificação da peça</SectionTitle>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                            Escolha um nome que ajude você e sua equipe a reconhecer rapidamente essa peça. Ex.: "Consulta de saldo FGTS".
                        </p>

                        <div className="form-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                                <label className="form-label">Nome da peça <span style={{ color: '#6b7280', fontWeight: 400 }}>Obrigatório</span></label>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{nome.length}/50</span>
                            </div>
                            <input
                                id="input-nome-peca"
                                className="form-input"
                                maxLength={50}
                                value={nome}
                                onChange={e => setNome(e.target.value)}
                                placeholder="Promoção cartão com anuidade grátis"
                            />
                        </div>

                        <div className="form-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                                <label className="form-label">Descrição <span style={{ color: '#6b7280', fontWeight: 400 }}>Opcional</span></label>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{descricao.length}/240</span>
                            </div>
                            <textarea
                                className="form-input"
                                style={{ minHeight: 80, resize: 'vertical' }}
                                maxLength={240}
                                value={descricao}
                                onChange={e => setDescricao(e.target.value)}
                            />
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                Limite de {240 - descricao.length} caracteres restantes
                            </div>
                        </div>

                        {/* Aprovação */}
                        <SectionTitle style={{ marginTop: 32 }}>Aprovação da peça</SectionTitle>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                            As unidades aprovadoras serão definidas automaticamente com base nas opções selecionadas abaixo.
                        </p>

                        {/* Público Alvo */}
                        <div className="form-group">
                            <label className="form-label">Público Alvo <span style={{ color: '#6b7280', fontWeight: 400 }}>Obrigatório</span></label>
                            <select id="select-publico-peca" className="form-select" value={publicoAlvoId} onChange={e => setPublicoAlvoId(e.target.value)}>
                                <option value="">Selecione...</option>
                                {publicos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                            </select>
                        </div>

                        {/* Nicho */}
                        <div className="form-group">
                            <label className="form-label">Nicho <span style={{ color: '#6b7280', fontWeight: 400 }}>Obrigatório</span></label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <select
                                    id="select-segmento-peca"
                                    className="form-select"
                                    style={{ flex: 1 }}
                                    disabled={!publicoAlvoId}
                                    onChange={e => { if (e.target.value) toggleSegmento(e.target.value); e.target.value = '' }}
                                    defaultValue=""
                                >
                                    <option value="">Selecione...</option>
                                    {segmentos.filter(s => !segmentosIds.includes(s.id)).map(s => (
                                        <option key={s.id} value={s.id}>{s.nome}</option>
                                    ))}
                                </select>
                                <button className="btn btn-secondary">Adicionar</button>
                            </div>
                            {/* Tags */}
                            {segmentosIds.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                                    {segmentosIds.map(id => {
                                        const seg = segmentos.find(s => s.id === id)
                                        return seg ? (
                                            <span key={id} style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                                background: 'var(--caixa-blue-bg)', border: '1px solid var(--caixa-blue-light)',
                                                borderRadius: 4, padding: '2px 8px', fontSize: 12, color: 'var(--caixa-blue)',
                                            }}>
                                                {seg.nome}
                                                <button onClick={() => removeSegmento(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--caixa-blue)', lineHeight: 1 }}>
                                                    <X size={11} />
                                                </button>
                                            </span>
                                        ) : null
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Assunto */}
                        <div className="form-group">
                            <label className="form-label">Assunto <span style={{ color: '#6b7280', fontWeight: 400 }}>Obrigatório</span></label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <select
                                    id="select-assunto-peca"
                                    className="form-select"
                                    style={{ flex: 1 }}
                                    onChange={e => { if (e.target.value) toggleAssunto(e.target.value); e.target.value = '' }}
                                    defaultValue=""
                                >
                                    <option value="">Selecione...</option>
                                    {assuntos.filter(a => !assuntosIds.includes(a.id)).map(a => (
                                        <option key={a.id} value={a.id}>{a.nome}</option>
                                    ))}
                                </select>
                                <button className="btn btn-secondary">Adicionar</button>
                            </div>
                            {assuntosIds.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                                    {assuntosIds.map(id => {
                                        const ass = assuntos.find(a => a.id === id)
                                        return ass ? (
                                            <span key={id} style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                                background: 'var(--caixa-blue-bg)', border: '1px solid var(--caixa-blue-light)',
                                                borderRadius: 4, padding: '2px 8px', fontSize: 12, color: 'var(--caixa-blue)',
                                            }}>
                                                {ass.nome}
                                                <button onClick={() => removeAssunto(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--caixa-blue)', lineHeight: 1 }}>
                                                    <X size={11} />
                                                </button>
                                            </span>
                                        ) : null
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Unidade adicional */}
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                            Esta etapa é opcional. Caso precise de uma validação específica, você pode incluir unidades adicionais.
                        </p>
                        <div className="form-group">
                            <label className="form-label">Código da unidade aprovadora</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    id="input-unidade-extra"
                                    className="form-input"
                                    placeholder="Ex: 9999"
                                    value={novaUnidade}
                                    onChange={e => setNovaUnidade(e.target.value.toUpperCase())}
                                    style={{ flex: 1 }}
                                />
                                <button className="btn btn-secondary">Adicionar</button>
                            </div>
                        </div>
                    </div>

                    {/* Right: grupo de aprovadores panel */}
                    <div style={{
                        background: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '20px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Aprovadores</div>
                        {grupos.length === 0 ? (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                Selecione público alvo, nicho e assunto para ver os aprovadores calculados automaticamente.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {grupos.map(g => (
                                    <div key={g.id} style={{
                                        background: '#f0f4ff', border: '1px solid #c7d7fd',
                                        borderRadius: 6, padding: '10px 14px',
                                    }}>
                                        {/* Group name as title */}
                                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--caixa-blue)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            {g.nome}
                                        </div>
                                        {/* Units: codigo – NOME */}
                                        {g.unidades.length > 0 ? g.unidades.map(u => (
                                            <div key={u.codigo} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                                <span style={{ fontWeight: 700 }}>{u.codigo}</span> – {u.nome.toUpperCase()}
                                            </div>
                                        )) : (
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Sem unidades cadastradas</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Unidades Adicionais section */}
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 20, marginBottom: 10 }}>Unidades Adicionais</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {novaUnidade ? (
                                <div style={{ background: '#f0f4ff', border: '1px solid #c7d7fd', borderRadius: 6, padding: '8px 12px', fontWeight: 600, color: 'var(--caixa-blue)' }}>
                                    {novaUnidade}
                                </div>
                            ) : 'Nenhuma unidade adicional.'}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32 }}>
                    <button className="btn btn-ghost" onClick={() => navigate('/pecas')}>Sair</button>
                    <button
                        id="btn-proximo-step"
                        style={{
                            background: 'var(--caixa-orange)', color: 'white',
                            border: 'none', borderRadius: 6,
                            padding: '11px 24px', fontWeight: 700, fontSize: 14,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                        }}
                        disabled={saving}
                        onClick={salvarDados}
                    >
                        {saving ? <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} /> : null}
                        Prosseguir para conteúdo da peça <ChevronRight size={16} />
                    </button>
                </div>

                {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
            </div>
        )
    }

    // ─── STEP 2: Conteúdo ──────────────────────────────────────────────────────
    const canalInfo = CANAL_CFG.find(c => c.id === canal)!
    const setC = (key: string, val: string) => setConteudo(prev => ({ ...prev, [key]: val }))

    return (
        <div className="main-inner">
            <div className="breadcrumb">
                <button className="breadcrumb-back" onClick={() => setStep(1)}>← Voltar</button>
                <span className="breadcrumb-sep">|</span>
                <span className="breadcrumb-item">Home</span>
                <span className="breadcrumb-sep">›</span>
                <span className="breadcrumb-item current">Peça</span>
            </div>

            {/* Toast de peça salva */}
            {toast?.type === 'success' && (
                <div style={{
                    background: '#15803d', color: 'white',
                    borderRadius: 6, padding: '12px 20px', marginBottom: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontSize: 14, fontWeight: 600,
                }}>
                    <span>✅ {toast.msg}</span>
                    <button onClick={() => navigate('/pecas')} style={{
                        background: 'white', color: '#15803d', border: 'none',
                        borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontWeight: 600, fontSize: 12,
                    }}>Sair</button>
                </div>
            )}

            {/* Step tabs */}
            <StepTabs step={2} />

            {/* Section title */}
            <h2 style={{
                fontSize: 22, fontWeight: 700, color: 'var(--caixa-blue)',
                borderLeft: '4px solid var(--caixa-orange)', paddingLeft: 14, marginBottom: 20,
            }}>
                {canalInfo.label}
            </h2>

            {/* Push: app selection */}
            {canal === 'PUSH' && (
                <div style={{ marginBottom: 24 }}>
                    <p style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 12 }}>Qual app você quer enviar a comunicação?</p>
                    {PUSH_APPS.map(app => (
                        <label key={app} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer', fontSize: 14 }}>
                            <div style={{
                                width: 20, height: 20, borderRadius: '50%',
                                border: `2px solid ${pushApp === app ? 'var(--caixa-blue)' : '#9ca3af'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                {pushApp === app && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--caixa-blue)' }} />}
                            </div>
                            <input type="radio" name="pushApp" value={app} checked={pushApp === app} onChange={() => setPushApp(app)} style={{ display: 'none' }} />
                            {app}
                        </label>
                    ))}
                </div>
            )}

            {/* Mensagem section */}
            <SectionTitle>Mensagem</SectionTitle>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                Preencha os dados que vão fazer parte da mensagem enviada para o cliente
            </p>

            {/* Canal-specific fields */}
            {canal === 'SMS' && (
                <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <label className="form-label">Mensagem <span style={{ color: '#6b7280', fontWeight: 400 }}>Obrigatório</span></label>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(conteudo.mensagem ?? '').length}/160</span>
                    </div>
                    <textarea id="input-msg-sms" className="form-input" style={{ minHeight: 100 }} maxLength={160} value={conteudo.mensagem ?? ''} onChange={e => setC('mensagem', e.target.value)} />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Limite de 160 caracteres</div>
                </div>
            )}

            {(canal === 'PUSH' || canal === 'BANNER_APP') && (
                <>
                    <CountedInput label="Título da mensagem" required fieldKey="titulo" max={65} conteudo={conteudo} setC={setC} id="input-titulo-peca" />
                    <CountedTextarea label="Mensagem" required fieldKey={canal === 'PUSH' ? 'mensagem' : 'corpo'} max={240} conteudo={conteudo} setC={setC} id="input-msg-peca" />
                    <SimpleInput label="Texto do link" fieldKey="textoLink" conteudo={conteudo} setC={setC} />
                    <SimpleInput label="URL" fieldKey="urlDestino" conteudo={conteudo} setC={setC} placeholder="https://" />
                </>
            )}

            {canal === 'WHATSAPP' && (
                <>
                    <CountedInput label="Título da mensagem" required fieldKey="titulo" max={65} conteudo={conteudo} setC={setC} />
                    <CountedTextarea label="Mensagem" required fieldKey="mensagem" max={1024} conteudo={conteudo} setC={setC} />
                    <SimpleInput label="Texto do link" fieldKey="textoLink" conteudo={conteudo} setC={setC} />
                    <SimpleInput label="URL" fieldKey="urlDestino" conteudo={conteudo} setC={setC} placeholder="https://" />
                </>
            )}

            {canal === 'EMAIL' && (
                <>
                    <SimpleInput label="Assunto do e-mail" required fieldKey="assunto" conteudo={conteudo} setC={setC} />
                    <CountedTextarea label="Corpo HTML" required fieldKey="corpoHtml" max={5000} conteudo={conteudo} setC={setC} />
                </>
            )}

            {/* Observações/Considerações (all canals) */}
            <CountedTextarea label="Observações/Considerações" fieldKey="observacoes" max={240} conteudo={conteudo} setC={setC} />

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32 }}>
                <button className="btn btn-ghost" onClick={() => navigate('/pecas')}>Salvar</button>
                <button
                    id="btn-submeter-peca"
                    style={{
                        background: 'var(--caixa-orange)', color: 'white',
                        border: 'none', borderRadius: 6,
                        padding: '11px 24px', fontWeight: 700, fontSize: 14,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                    }}
                    disabled={saving}
                    onClick={submeter}
                >
                    {saving ? <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} /> : null}
                    Enviar para aprovação
                </button>
            </div>

            {toast?.type === 'error' && <div className="toast toast-error">{toast.msg}</div>}
        </div>
    )
}

// ─── Helper Components ─────────────────────────────────────────────────────────

function StepTabs({ step }: { step: 1 | 2 }) {
    const tabs = [
        { n: 1, label: 'Dados da peça' },
        { n: 2, label: 'Conteúdo da peça' },
    ]
    return (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 28 }}>
            {tabs.map(t => {
                const active = t.n === step
                return (
                    <div key={t.n} style={{
                        padding: '10px 20px', fontSize: 14, fontWeight: active ? 700 : 500,
                        color: active ? 'var(--caixa-blue)' : 'var(--text-muted)',
                        borderBottom: active ? '2px solid var(--caixa-blue)' : '2px solid transparent',
                        marginBottom: -1, display: 'flex', alignItems: 'center', gap: 7, cursor: 'default',
                    }}>
                        <span style={{
                            background: active ? 'var(--caixa-blue)' : '#e2e8f0',
                            color: active ? 'white' : 'var(--text-muted)',
                            borderRadius: '50%', width: 20, height: 20,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700,
                        }}>{t.n > step ? '▶' : '▶'}</span>
                        {t.label}
                    </div>
                )
            })}
        </div>
    )
}

function SectionTitle({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <h2 style={{
            fontSize: 18, fontWeight: 700, color: 'var(--caixa-blue)',
            borderLeft: '4px solid var(--caixa-orange)', paddingLeft: 14, marginBottom: 8,
            ...(style ?? {}),
        }}>
            {children}
        </h2>
    )
}

function SimpleInput({ label, fieldKey, conteudo, setC, placeholder, required }: {
    label: string; fieldKey: string; conteudo: Record<string, string>
    setC: (k: string, v: string) => void; placeholder?: string; required?: boolean
}) {
    return (
        <div className="form-group">
            <label className="form-label">{label}{required && <span style={{ color: '#6b7280', fontWeight: 400 }}> Obrigatório</span>}</label>
            <input className="form-input" value={conteudo[fieldKey] ?? ''} onChange={e => setC(fieldKey, e.target.value)} placeholder={placeholder} />
        </div>
    )
}

function CountedInput({ label, fieldKey, max, conteudo, setC, required, id }: {
    label: string; fieldKey: string; max: number; conteudo: Record<string, string>
    setC: (k: string, v: string) => void; required?: boolean; id?: string
}) {
    return (
        <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <label className="form-label">{label}{required && <span style={{ color: '#6b7280', fontWeight: 400 }}> Obrigatório</span>}</label>
            </div>
            <input id={id} className="form-input" maxLength={max} value={conteudo[fieldKey] ?? ''} onChange={e => setC(fieldKey, e.target.value)} />
        </div>
    )
}

function CountedTextarea({ label, fieldKey, max, conteudo, setC, required, id }: {
    label: string; fieldKey: string; max: number; conteudo: Record<string, string>
    setC: (k: string, v: string) => void; required?: boolean; id?: string
}) {
    const len = (conteudo[fieldKey] ?? '').length
    return (
        <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <label className="form-label">{label}{required && <span style={{ color: '#6b7280', fontWeight: 400 }}> Obrigatório</span>}</label>
            </div>
            <textarea
                id={id}
                className="form-input"
                style={{ minHeight: 90, resize: 'vertical' }}
                maxLength={max}
                value={conteudo[fieldKey] ?? ''}
                onChange={e => setC(fieldKey, e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                <span>Limite de {max - len} caracteres restantes</span>
                <span>{len}/{max}</span>
            </div>
        </div>
    )
}
