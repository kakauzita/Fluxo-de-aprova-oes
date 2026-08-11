// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import {
  Send,
  Sparkles,
  AlertTriangle,
  Search,
  Check,
  FileText,
  ChevronRight,
  Mail,
  MessageSquare,
  MessageCircle,
  Smartphone,
  Calendar,
  Clock
} from 'lucide-react'
import './CampaignBuilderPage.css'

const MOCK_PECAS = [
  { id: 'p1', name: 'Bem-vindo à CAIXA', channel: 'PUSH', content: 'Sua conta foi aberta com sucesso. Acesse o app e descubra suas vantagens.' },
  { id: 'p2', name: 'Cadastre sua chave Pix', channel: 'SMS', content: 'Facilite suas transferências! Acesse o app e cadastre sua chave Pix agora mesmo.' },
  { id: 'p3', name: 'Seu cartão pré-aprovado aguarda', channel: 'EMAIL', content: 'Temos um limite exclusivo para você. Acesse sua conta e desbloqueie seu cartão de crédito.' },
  { id: 'p4', name: 'Última chance para desbloquear', channel: 'SMS', content: 'Você ainda não desbloqueou seu cartão CAIXA. Desbloqueie hoje e não perca nossos benefícios.' },
  { id: 'p5', name: 'Oferta de Empréstimo', channel: 'PUSH', content: 'Crédito pré-aprovado com as melhores taxas. Simule agora no app.' },
  { id: 'p6', name: 'Desbloqueio de Cartão', channel: 'WHATSAPP', content: 'Olá! Vimos que seu cartão CAIXA chegou. Que tal desbloqueá-lo agora pelo WhatsApp?' },
  { id: 'p7', name: 'Pontos do Cartão', channel: 'APP CAIXA', content: 'Seu cartão CAIXA acumula pontos que nunca expiram. Conheça as vantagens.' }
]

interface Filter {
  id: string
  field: string
  operator: string
  value: string
}

interface Option {
  id: string
  nome: string
}

export default function CampaignDisparoPage() {
  const navigate = useNavigate()

  // ─── Stepper & Form States ──────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2>(1)
  const [campaignName, setCampaignName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedPublicos, setSelectedPublicos] = useState<Option[]>([])
  const [selectedSegmentos, setSelectedSegmentos] = useState<any[]>([])
  const [tempPublicoId, setTempPublicoId] = useState('')
  const [tempSegmentoId, setTempSegmentoId] = useState('')
  const [customFilters, setCustomFilters] = useState<Filter[]>([])
  const [selectedExclusions, setSelectedExclusions] = useState<string[]>([])
  
  // ─── Disparo Único Specific States ──────────────────────────────────────────
  const [selectedPeca, setSelectedPeca] = useState<any | null>(null)
  const [momentoEnvio, setMomentoEnvio] = useState<'imediato' | 'agendado'>('imediato')
  const [dataAgendada, setDataAgendada] = useState('')
  const [campaignObservation, setCampaignObservation] = useState('')
  
  // ─── API Lists ──────────────────────────────────────────────────────────────
  const [publicos, setPublicos] = useState<Option[]>([])
  const [allSegmentos, setAllSegmentos] = useState<any[]>([])
  const [apiPecas, setApiPecas] = useState<any[]>([])
  
  // ─── Publish States ─────────────────────────────────────────────────────────
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)

  // ─── Load data from backend ──────────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const [p, s, pecasRes] = await Promise.all([
          api.get('/admin/publicos-alvo'),
          api.get('/admin/segmentos'),
          api.get('/pecas')
        ])
        setPublicos(p.data)
        setAllSegmentos(s.data)
        setApiPecas(pecasRes.data)
      } catch (err) {
        console.error('Falha ao carregar dados do banco:', err)
      }
    }
    loadData()
  }, [])

  // ─── Filtered lists and details ─────────────────────────────────────────────
  const filteredSegmentos = useMemo(() => {
    if (selectedPublicos.length === 0) return []
    return allSegmentos.filter((s: any) => selectedPublicos.some(p => p.id === s.publicoAlvoId))
  }, [allSegmentos, selectedPublicos])

  const selectedPublicoName = useMemo(() => {
    return selectedPublicos.map(p => p.nome).join(', ')
  }, [selectedPublicos])

  const selectedSegmentoName = useMemo(() => {
    return selectedSegmentos.map(s => s.nome).join(', ')
  }, [selectedSegmentos])

  const allPecas = useMemo(() => {
    const formattedApi = apiPecas.map(p => ({
      id: p.id,
      name: p.nome,
      channel: p.canal,
      status: p.status,
      content: p.conteudo?.mensagem || p.conteudo?.corpo || p.conteudo?.corpoHtml || 'Peça cadastrada no sistema'
    }))
    // Mock pieces are treated as approved for simulation
    const formattedMock = MOCK_PECAS.map(p => ({ ...p, status: 'APROVADA' }))
    return [...formattedApi, ...formattedMock]
  }, [apiPecas])

  // Only approved communication pieces
  const approvedPecas = useMemo(() => {
    return allPecas.filter(p => p.status === 'APROVADA')
  }, [allPecas])

  // ─── Audience Filter Helpers ────────────────────────────────────────────────
  const handleAddPublico = () => {
    if (!tempPublicoId) return
    const publico = publicos.find(p => p.id === tempPublicoId)
    if (publico && !selectedPublicos.some(p => p.id === publico.id)) {
      setSelectedPublicos([...selectedPublicos, publico])
    }
    setTempPublicoId('')
  }

  const handleRemovePublico = (id: string) => {
    setSelectedPublicos(selectedPublicos.filter(p => p.id !== id))
    setSelectedSegmentos(selectedSegmentos.filter(s => s.publicoAlvoId !== id))
  }

  const handleAddSegmento = () => {
    if (!tempSegmentoId) return
    const segmento = allSegmentos.find(s => s.id === tempSegmentoId)
    if (segmento && !selectedSegmentos.some(s => s.id === segmento.id)) {
      setSelectedSegmentos([...selectedSegmentos, segmento])
    }
    setTempSegmentoId('')
  }

  const handleRemoveSegmento = (id: string) => {
    setSelectedSegmentos(selectedSegmentos.filter(s => s.id !== id))
  }

  // ─── Custom Filter Helpers ──────────────────────────────────────────────────
  const addFilter = () => {
    const filter: Filter = {
      id: 'f' + Date.now(),
      field: 'Idade',
      operator: 'maior que',
      value: ''
    }
    setCustomFilters([...customFilters, filter])
  }

  const updateFilter = (id: string, key: keyof Filter, val: string) => {
    setCustomFilters(customFilters.map(f => {
      if (f.id === id) {
        if (key === 'field') {
          let op = 'igual a'
          let v = ''
          if (val === 'Localização') {
            op = 'Região'
          } else if (val === 'Gênero') {
            op = 'igual a'
          } else {
            op = 'maior que'
          }
          return { ...f, field: val, operator: op, value: v }
        }
        return { ...f, [key]: val }
      }
      return f
    }))
  }

  const removeFilter = (id: string) => {
    setCustomFilters(customFilters.filter(f => f.id !== id))
  }

  // ─── Publish Logic ──────────────────────────────────────────────────────────
  const publishCampaign = () => {
    const campaignPayload = {
      tipoCampanha: 'disparo_unico',
      nome: campaignName,
      descricao: description,
      publicoAlvo: selectedPublicos,
      segmento: selectedSegmentos,
      filtros: customFilters,
      exclusoes: [
        'menores_18',
        'obitos',
        'cpf_irregular_rfb',
        'vulnerabilidade',
        ...selectedExclusions
      ],
      envioUnico: {
        pecaId: selectedPeca?.id,
        momentoEnvio: momentoEnvio,
        dataAgendada: momentoEnvio === 'agendado' ? dataAgendada : null
      }
    }
    
    console.log('Publicando Campanha (Disparo Único) - Payload:', JSON.stringify(campaignPayload, null, 2))
    
    setPublishing(true)
    setTimeout(() => {
      setPublishing(false)
      setPublished(true)
    }, 1500)
  }

  const isStep1Valid = useMemo(() => {
    const baseValid = campaignName && selectedPublicos.length > 0 && selectedSegmentos.length > 0 && selectedPeca
    if (momentoEnvio === 'agendado') {
      return baseValid && dataAgendada !== ''
    }
    return baseValid
  }, [campaignName, selectedPublicos, selectedSegmentos, selectedPeca, momentoEnvio, dataAgendada])

  return (
    <div className="builder-container" style={{ padding: '24px 30px', maxWidth: '1280px', margin: '0 auto', fontFamily: 'inherit' }}>
      
      {/* ── Breadcrumb ── */}
      <div className="breadcrumb-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
        <button className="breadcrumb-back" onClick={() => navigate('/campanhas')} style={{ background: 'none', border: 'none', color: 'var(--caixa-blue)', fontWeight: 600, cursor: 'pointer', padding: 0 }}>← Voltar</button>
        <span className="breadcrumb-sep" style={{ color: '#cbd5e1' }}>|</span>
        <span className="breadcrumb-item">Home</span>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-item">Campanhas</span>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-item current" style={{ fontWeight: 600 }}>Criar Campanha</span>
      </div>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ borderLeft: '4px solid var(--caixa-orange)', paddingLeft: 14, fontSize: 28, fontWeight: 800, color: 'var(--caixa-blue)', lineHeight: 1.1, margin: '8px 0 6px 0' }}>
            {campaignName || 'Criar Campanha (Disparo Único)'}
          </h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>Envio de peça única direto para seu público alvo sem complexidade de fluxos.</p>
        </div>
      </div>

      {/* ── Stepper Navigation ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--builder-border-light)', marginBottom: 24 }}>
        <div
          onClick={() => setStep(1)}
          style={{
            padding: '10px 20px', fontSize: 14, fontWeight: step === 1 ? 700 : 500,
            color: step === 1 ? 'var(--caixa-blue)' : 'var(--text-muted)',
            borderBottom: step === 1 ? '2.5px solid var(--caixa-blue)' : '2.5px solid transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <span style={{
            background: step === 1 ? 'var(--caixa-blue)' : '#e2e8f0',
            color: step === 1 ? 'white' : 'var(--text-muted)',
            borderRadius: '50%', width: 20, height: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700
          }}>1</span>
          Dados e envio
        </div>
        <div
          onClick={() => { if (isStep1Valid) { setStep(2); } }}
          style={{
            padding: '10px 20px', fontSize: 14, fontWeight: step === 2 ? 700 : 500,
            color: step === 2 ? 'var(--caixa-blue)' : 'var(--text-muted)',
            borderBottom: step === 2 ? '2.5px solid var(--caixa-blue)' : '2.5px solid transparent',
            cursor: isStep1Valid ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 8,
            opacity: isStep1Valid ? 1 : 0.6
          }}
        >
          <span style={{
            background: step === 2 ? 'var(--caixa-blue)' : '#e2e8f0',
            color: step === 2 ? 'white' : 'var(--text-muted)',
            borderRadius: '50%', width: 20, height: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700
          }}>2</span>
          Revisar
        </div>
      </div>

      {/* ── STEP 1: DADOS E ENVIO ── */}
      {step === 1 && (
        <>
          <div className="setup-layout">
            <div className="setup-main">
              {/* Secção 01: Identificação */}
              <div className="setup-section">
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--caixa-blue)', borderLeft: '4px solid var(--caixa-blue)', paddingLeft: 14, marginBottom: 16 }}>
                  Detalhes da campanha
                </h3>
                <div className="setup-card">
                  <div className="form-row">
                    <div className="form-group full">
                      <label className="form-label" style={{ fontWeight: 700 }}>Nome da campanha</label>
                      <input
                        type="text"
                        className="form-input"
                        maxLength={45}
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        placeholder="Ex: CAIXA Conta Poupança Premiada 2026"
                      />
                      <div style={{ textAlign: 'right', fontSize: '11px', color: '#94a3b8', marginTop: 4 }}>
                        {campaignName.length}/45
                      </div>
                    </div>
                  </div>
                  <div className="form-row" style={{ marginTop: 12 }}>
                    <div className="form-group full">
                      <label className="form-label" style={{ fontWeight: 700, display: 'flex', gap: 6, alignItems: 'baseline' }}>
                        Descrição <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '12px' }}>Opcional</span>
                      </label>
                      <textarea
                        className="form-input"
                        maxLength={45}
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Faça uma breve descrição da sua campanha"
                        style={{ resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }}
                      />
                      <div style={{ textAlign: 'right', fontSize: '11px', color: '#94a3b8', marginTop: 4 }}>
                        {description.length}/45
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secção 02: Quem vai receber */}
              <div className="setup-section">
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--caixa-blue)', borderLeft: '4px solid var(--caixa-blue)', paddingLeft: 14, marginBottom: 16 }}>
                  Quem vai receber
                </h3>
                <div className="setup-card">
                  <div className="form-row" style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                    {/* Público Alvo */}
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>Público alvo</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <select
                          className="form-select"
                          value={tempPublicoId}
                          onChange={(e) => setTempPublicoId(e.target.value)}
                          style={{ flex: 1 }}
                        >
                          <option value="">Selecione o público que receberá a campanha</option>
                          {publicos.map(p => (
                            <option key={p.id} value={p.id} disabled={selectedPublicos.some(sp => sp.id === p.id)}>
                              {p.nome}
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn"
                          type="button"
                          onClick={handleAddPublico}
                          style={{
                            background: 'white',
                            border: '1.5px solid var(--caixa-blue)',
                            color: 'var(--caixa-blue)',
                            fontWeight: 700,
                            padding: '0 16px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                        >
                          Adicionar
                        </button>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 4 }}>
                        Defina o público alvo desta campanha
                      </div>
                      {/* Tags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {selectedPublicos.map(p => (
                          <span key={p.id} style={{
                            background: '#e8f0fe',
                            color: 'var(--caixa-blue)',
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '4px 8px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            border: '1px solid var(--caixa-blue-light)'
                          }}>
                            {p.nome}
                            <button
                              type="button"
                              onClick={() => handleRemovePublico(p.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--caixa-blue)',
                                cursor: 'pointer',
                                padding: 0,
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                fontWeight: 700
                              }}
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Segmento */}
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>Segmento</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <select
                          className="form-select"
                          value={tempSegmentoId}
                          disabled={selectedPublicos.length === 0}
                          onChange={(e) => setTempSegmentoId(e.target.value)}
                          style={{ flex: 1 }}
                        >
                          <option value="">Selecione o segmento</option>
                          {filteredSegmentos.map(s => (
                            <option key={s.id} value={s.id} disabled={selectedSegmentos.some(ss => ss.id === s.id)}>
                              {s.nome}
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn"
                          type="button"
                          onClick={handleAddSegmento}
                          disabled={selectedPublicos.length === 0}
                          style={{
                            background: 'white',
                            border: '1.5px solid var(--caixa-blue)',
                            color: 'var(--caixa-blue)',
                            fontWeight: 700,
                            padding: '0 16px',
                            borderRadius: '4px',
                            cursor: selectedPublicos.length === 0 ? 'not-allowed' : 'pointer',
                            fontSize: '13px',
                            opacity: selectedPublicos.length === 0 ? 0.6 : 1
                          }}
                        >
                          Adicionar
                        </button>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 4 }}>
                        Defina o segmento desta campanha
                      </div>
                      {/* Tags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {selectedSegmentos.map(s => (
                          <span key={s.id} style={{
                            background: '#e8f0fe',
                            color: 'var(--caixa-blue)',
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '4px 8px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            border: '1px solid var(--caixa-blue-light)'
                          }}>
                            {s.nome}
                            <button
                              type="button"
                              onClick={() => handleRemoveSegmento(s.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--caixa-blue)',
                                cursor: 'pointer',
                                padding: 0,
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                fontWeight: 700
                              }}
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Filtros adicionais */}
                  <div className="filtros-section">
                    <div className="filtros-header">
                      <span className="filtros-title">Filtros Adicionais da Campanha</span>
                      <button className="btn-add-filter" onClick={addFilter}>+ Adicionar filtro</button>
                    </div>
                    {customFilters.length === 0 ? (
                      <p style={{ fontSize: 12, color: 'var(--builder-muted)', fontStyle: 'italic', margin: '4px 0 0 0' }}>
                        Nenhum filtro personalizado adicionado. A campanha utilizará a segmentação padrão.
                      </p>
                    ) : (
                      <div className="filters-list">
                        {customFilters.map(f => {
                          const isNumeric = ['Idade', 'Renda', 'Saldo em conta', 'Tempo de relacionamento'].includes(f.field)
                          const isGender = f.field === 'Gênero'
                          const isLocation = f.field === 'Localização'

                          return (
                            <div className="filter-row" key={f.id}>
                              <select
                                className="form-select"
                                style={{ flex: 1, padding: '6px 10px', fontSize: 12, width: 'auto' }}
                                value={f.field}
                                onChange={(e) => updateFilter(f.id, 'field', e.target.value)}
                              >
                                <option value="Idade">Idade</option>
                                <option value="Renda">Renda</option>
                                <option value="Saldo em conta">Saldo em conta</option>
                                <option value="Tempo de relacionamento">Tempo de relacionamento</option>
                                <option value="Localização">Localização</option>
                                <option value="Gênero">Gênero</option>
                              </select>

                              {isNumeric && (
                                <select
                                  className="form-select"
                                  style={{ width: 110, padding: '6px 10px', fontSize: 12 }}
                                  value={f.operator}
                                  onChange={(e) => updateFilter(f.id, 'operator', e.target.value)}
                                >
                                  <option value="maior que">maior que</option>
                                  <option value="menor que">menor que</option>
                                  <option value="igual a">igual a</option>
                                </select>
                              )}

                              {isGender && (
                                <select
                                  className="form-select"
                                  style={{ width: 110, padding: '6px 10px', fontSize: 12 }}
                                  value={f.operator}
                                  onChange={(e) => updateFilter(f.id, 'operator', e.target.value)}
                                >
                                  <option value="igual a">igual a</option>
                                  <option value="diferente de">diferente de</option>
                                </select>
                              )}

                              {isLocation && (
                                <select
                                  className="form-select"
                                  style={{ width: 110, padding: '6px 10px', fontSize: 12 }}
                                  value={f.operator}
                                  onChange={(e) => {
                                    updateFilter(f.id, 'operator', e.target.value)
                                    updateFilter(f.id, 'value', '')
                                  }}
                                >
                                  <option value="Região">Região</option>
                                  <option value="Estado">Estado</option>
                                </select>
                              )}

                              {isNumeric && (
                                <input
                                  type="text"
                                  className="form-input"
                                  style={{ width: 110, padding: '6px 10px', fontSize: 12 }}
                                  placeholder="valor"
                                  value={f.value}
                                  onChange={(e) => updateFilter(f.id, 'value', e.target.value)}
                                />
                              )}

                              {isGender && (
                                <select
                                  className="form-select"
                                  style={{ width: 110, padding: '6px 10px', fontSize: 12 }}
                                  value={f.value}
                                  onChange={(e) => updateFilter(f.id, 'value', e.target.value)}
                                >
                                  <option value="">Selecionar...</option>
                                  <option value="Feminino">Feminino</option>
                                  <option value="Masculino">Masculino</option>
                                  <option value="Não binário">Não binário</option>
                                  <option value="Outros">Outros</option>
                                </select>
                              )}

                              {isLocation && f.operator === 'Região' && (
                                <select
                                  className="form-select"
                                  style={{ width: 110, padding: '6px 10px', fontSize: 12 }}
                                  value={f.value}
                                  onChange={(e) => updateFilter(f.id, 'value', e.target.value)}
                                >
                                  <option value="">Selecionar...</option>
                                  <option value="Norte">Norte</option>
                                  <option value="Nordeste">Nordeste</option>
                                  <option value="Centro-Oeste">Centro-Oeste</option>
                                  <option value="Sudeste">Sudeste</option>
                                  <option value="Sul">Sul</option>
                                </select>
                              )}

                              {isLocation && f.operator === 'Estado' && (
                                <select
                                  className="form-select"
                                  style={{ width: 110, padding: '6px 10px', fontSize: 12 }}
                                  value={f.value}
                                  onChange={(e) => updateFilter(f.id, 'value', e.target.value)}
                                >
                                  <option value="">UF...</option>
                                  {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                                    <option key={uf} value={uf}>{uf}</option>
                                  ))}
                                </select>
                              )}

                              <button className="filter-remove" onClick={() => removeFilter(f.id)}>✕</button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Secção Nova: O que enviar e quando (DIFERENCIADO VISUALMENTE) */}
              <div className="setup-section" style={{ background: 'var(--builder-bg)', padding: '24px', borderRadius: '8px', border: '1px solid var(--builder-border)', marginTop: '24px' }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--caixa-blue)', borderLeft: '4px solid var(--caixa-blue)', paddingLeft: 14, marginBottom: 8 }}>
                  O que enviar e quando
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', marginLeft: '18px' }}>
                  Essa seção substitui o canvas — aqui você escolhe a peça e o momento do envio direto.
                </p>

                <div className="setup-card" style={{ background: 'transparent', border: 'none', padding: 0, boxShadow: 'none' }}>
                  <div className="form-row" style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                    
                    {/* Peça Aprovada */}
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>Peça aprovada</label>
                      <select
                        className="form-select"
                        value={selectedPeca?.id || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          const peca = approvedPecas.find(p => p.id === val)
                          setSelectedPeca(peca || null)
                        }}
                        style={{ width: '100%' }}
                      >
                        <option value="">Selecione o conteúdo de comunicação...</option>
                        {approvedPecas.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.channel})
                          </option>
                        ))}
                      </select>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 4 }}>
                        Apenas peças homologadas e aprovadas estão disponíveis para disparo rápido
                      </div>

                      {selectedPeca && (
                        <div style={{ 
                          marginTop: '16px', 
                          padding: '16px', 
                          background: '#ffffff', 
                          border: '1px solid var(--builder-border)', 
                          borderRadius: '8px', 
                          boxShadow: 'var(--shadow-sm)' 
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--caixa-blue)' }}>{selectedPeca.name}</span>
                            <span className={`peca-channel ${selectedPeca.channel.toLowerCase()}`} style={{ 
                              fontSize: '10px', 
                              padding: '2px 8px', 
                              borderRadius: '12px', 
                              fontWeight: 700,
                              textTransform: 'uppercase'
                            }}>
                              {selectedPeca.channel}
                            </span>
                          </div>
                          <p style={{ fontSize: '13px', color: 'var(--builder-text-secondary)', margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                            {selectedPeca.content}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Quando Enviar */}
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>Quando enviar?</label>
                      <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                        
                        {/* Radio Card: Imediatamente */}
                        <label 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            border: momentoEnvio === 'imediato' ? '2px solid var(--caixa-blue)' : '1px solid var(--builder-border)',
                            borderRadius: '8px',
                            padding: '16px',
                            cursor: 'pointer',
                            background: '#ffffff',
                            transition: 'all 0.2s',
                            boxShadow: momentoEnvio === 'imediato' ? '0 2px 8px rgba(19, 81, 180, 0.1)' : 'none'
                          }}
                        >
                          <input
                            type="radio"
                            name="momentoEnvio"
                            checked={momentoEnvio === 'imediato'}
                            onChange={() => setMomentoEnvio('imediato')}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--caixa-blue)' }}
                          />
                          <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Send size={14} color="var(--caixa-blue)" /> Imediato após aprovação
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>A peça será disparada logo após o fluxo de aprovação ser validado.</div>
                          </div>
                        </label>

                        {/* Radio Card: Agendado */}
                        <label 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            border: momentoEnvio === 'agendado' ? '2px solid var(--caixa-blue)' : '1px solid var(--builder-border)',
                            borderRadius: '8px',
                            padding: '16px',
                            cursor: 'pointer',
                            background: '#ffffff',
                            transition: 'all 0.2s',
                            boxShadow: momentoEnvio === 'agendado' ? '0 2px 8px rgba(19, 81, 180, 0.1)' : 'none'
                          }}
                        >
                          <input
                            type="radio"
                            name="momentoEnvio"
                            checked={momentoEnvio === 'agendado'}
                            onChange={() => setMomentoEnvio('agendado')}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--caixa-blue)' }}
                          />
                          <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Calendar size={14} color="var(--caixa-blue)" /> Agendado
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>Configure um momento exato no calendário para realizar o envio automático.</div>
                          </div>
                        </label>

                        {momentoEnvio === 'agendado' && (
                          <div style={{ animation: 'fadeIn 0.2s ease', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--builder-text-secondary)' }}>Data e Hora de Disparo</label>
                            <input
                              type="datetime-local"
                              value={dataAgendada}
                              onChange={(e) => setDataAgendada(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '6px',
                                border: '1px solid var(--builder-border)',
                                fontFamily: 'inherit',
                                fontSize: '13px',
                                outline: 'none'
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secção 03: Compliance e Exclusões */}
              <div className="setup-section" style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--caixa-blue)', borderLeft: '4px solid var(--caixa-blue)', paddingLeft: 14, marginBottom: 16 }}>
                  Exclusões obrigatórias
                </h3>
                <div className="setup-card" style={{ background: 'transparent', border: 'none', padding: 0, boxShadow: 'none' }}>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '-8px 0 16px 0' }}>
                    Listas de exclusão aplicadas automaticamente a todas as campanhas da CAIXA
                  </p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', marginBottom: 24 }}>
                    {[
                      { title: 'Menores de 18 anos', desc: 'Excluídos automaticamente de todas as campanhas' },
                      { title: 'CPF Diferente de Regular na RFB', desc: 'CPF que não estiver com situação regular na Receita Federal' },
                      { title: 'Pessoas em situação de vulnerabilidade', desc: 'Lista atualizada diariamente pelo compliance' },
                      { title: 'Óbitos registrados', desc: 'Clientes com registro de óbito são excluídos automaticamente' }
                    ].map((item, idx) => (
                      <div key={idx} style={{
                        background: 'white',
                        border: '1px solid #fed7aa',
                        borderRadius: '6px',
                        padding: '12px 16px',
                        display: 'flex',
                        gap: 12,
                        alignItems: 'flex-start',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                      }}>
                        <span style={{ color: '#f97316', fontSize: '14px', marginTop: '1px' }}>🔒</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>{item.title}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', lineHeight: '1.4' }}>{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 24 }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 4 }}>
                      Lista de exclusão adicional <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '12px' }}>Opcional</span>
                    </label>
                    <select
                      className="form-select"
                      value=""
                      onChange={(e) => {
                        const val = e.target.value
                        if (val && !selectedExclusions.includes(val)) {
                          setSelectedExclusions([...selectedExclusions, val])
                        }
                      }}
                    >
                      <option value="">Adicionar a lista de exclusão...</option>
                      {[
                        'Não Incomodar',
                        'Segmento Exclusivo e Grupo Familiar',
                        'PPE - Pessoa Politicamente Exposta',
                        'Cadastro Desatualizado',
                        'Lei de Crédito Aposentado',
                        'Restrição Absoluta (Base SIRIC)',
                        'SIPES - Restrições SERASA/Boa Vista',
                        'CONRES',
                        'SIGA - Atraso > 30 dias',
                        'Renegociação - SIICO 190 ou 191',
                        'Fique em Dia/Quita Fácil',
                        'Benefício INSS < 180 dias'
                      ].map(excl => (
                        <option key={excl} value={excl} disabled={selectedExclusions.includes(excl)}>
                          {excl}
                        </option>
                      ))}
                    </select>

                    {selectedExclusions.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                        {selectedExclusions.map(excl => (
                          <span key={excl} style={{
                            background: '#fef2f2',
                            color: '#dc2626',
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '6px 12px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            border: '1px solid #fecaca'
                          }}>
                            {excl}
                            <button
                              type="button"
                              onClick={() => setSelectedExclusions(selectedExclusions.filter(e => e !== excl))}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: 0,
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                fontWeight: 700
                              }}
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32, borderTop: '1px solid var(--builder-border-light)', paddingTop: 20, marginBottom: 40 }}>
            <button 
              className="btn" 
              style={{ background: 'white', border: '1px solid #cbd5e1', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, fontSize: 14, cursor: 'pointer' }}
              onClick={() => navigate('/campanhas/nova')}
            >
              Cancelar
            </button>
            <button 
              className="btn" 
              style={{ background: 'white', border: '1.5px solid var(--caixa-blue)', color: 'var(--caixa-blue)', fontWeight: 700, fontSize: 14 }}
              onClick={() => alert('Rascunho de disparo único salvo com sucesso!')}
            >
              Salvar rascunho
            </button>
            <button
              className="btn"
              disabled={!isStep1Valid}
              onClick={() => setStep(2)}
              style={{ 
                background: !isStep1Valid ? '#cbd5e1' : 'var(--caixa-blue)', 
                color: 'white', 
                border: 'none', 
                fontWeight: 700, 
                fontSize: 14,
                cursor: !isStep1Valid ? 'not-allowed' : 'pointer'
              }}
            >
              Próximo
            </button>
          </div>
        </>
      )}

      {/* ── STEP 2: REVISÃO ── */}
      {step === 2 && (
        <div className="review-layout" style={{ animation: 'fadeIn 0.3s ease' }}>
          
          {published ? (
            /* SUCCESS CARD */
            <div className="review-success-card" style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '48px 24px',
              textAlign: 'center',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
              maxWidth: 600,
              margin: '40px auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16
            }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
                marginBottom: 8
              }}>
                ✓
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>Campanha de Disparo Único Criada!</h2>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, maxWidth: 450, margin: 0 }}>
                A campanha de disparo rápido <strong>"{campaignName}"</strong> foi configurada com sucesso e enviada para homologação e aprovação.
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button className="btn btn-ghost" onClick={() => navigate('/pecas')}>Ir para Minhas Peças</button>
                <button className="btn btn-primary" onClick={() => navigate('/')}>Ir para o Início</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, alignItems: 'start' }}>
                {/* Left Column - Form Details Review */}
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--caixa-blue)', borderLeft: '4px solid var(--caixa-blue)', paddingLeft: 14, marginBottom: 16 }}>
                    Revisão dos dados da campanha
                  </h3>
                  
                  {/* Bloco 1: Detalhes básicos */}
                  <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid var(--builder-border)', marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: '0 0 16px 0', borderBottom: '1px solid var(--builder-border-light)', paddingBottom: '8px' }}>
                      Identificação
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Nome da Campanha</div>
                        <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 700, marginTop: '4px' }}>{campaignName}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Descrição</div>
                        <div style={{ fontSize: '14px', color: '#475569', marginTop: '4px' }}>{description || 'Nenhuma descrição informada.'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Bloco 2: Público e Filtros */}
                  <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid var(--builder-border)', marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: '0 0 16px 0', borderBottom: '1px solid var(--builder-border-light)', paddingBottom: '8px' }}>
                      Público e Filtros de Exclusão
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Público Alvo</div>
                          <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 700, marginTop: '4px' }}>{selectedPublicoName}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Segmentos</div>
                          <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 700, marginTop: '4px' }}>{selectedSegmentoName}</div>
                        </div>
                      </div>

                      {customFilters.length > 0 && (
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Filtros Customizados</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {customFilters.map(f => (
                              <span key={f.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', color: '#475569' }}>
                                <strong>{f.field}</strong> {f.operator} <strong>{f.value}</strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Exclusões Aplicadas</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {['Menores de 18', 'CPF Irregular RFB', 'Vulnerabilidade', 'Óbitos'].map(e => (
                            <span key={e} style={{ background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', color: '#c2410c', fontWeight: 600 }}>
                              🔒 {e} (Auto)
                            </span>
                          ))}
                          {selectedExclusions.map(e => (
                            <span key={e} style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', color: '#991b1b', fontWeight: 600 }}>
                              🚫 {e}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Observação Adicional */}
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--caixa-blue)', borderLeft: '4px solid var(--caixa-blue)', paddingLeft: 14, marginBottom: 16 }}>
                    Observações internas
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                    Adicione informações complementares que considere relevantes para a análise e aprovação desta campanha pelos gestores da CAIXA.
                  </p>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <textarea
                      className="form-textarea"
                      placeholder="Ex.: Este disparo único destina-se a incentivar o primeiro acesso de novos correntistas..."
                      value={campaignObservation}
                      onChange={(e) => setCampaignObservation(e.target.value)}
                      style={{ minHeight: 120, width: '100%', padding: '12px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                    />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textAlign: 'right' }}>
                      Campo opcional
                    </div>
                  </div>
                </div>

                {/* Right Column: Piece and Schedule Info */}
                <div style={{
                  background: 'white',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '24px 20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  position: 'sticky',
                  top: 20
                }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', borderBottom: '1px solid var(--builder-border-light)', paddingBottom: '8px' }}>
                    Peça de envio e agendamento
                  </div>
                  
                  {selectedPeca && (
                    <div style={{
                      background: '#f0f4ff',
                      border: '1px solid #c7d7fd',
                      borderRadius: 6,
                      padding: '16px',
                      marginBottom: '20px'
                    }}>
                      <div style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: 'var(--caixa-blue)',
                        marginBottom: 10,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span>{selectedPeca.channel}</span>
                        <span style={{ color: 'var(--caixa-orange)' }}>Peça única</span>
                      </div>
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 4, padding: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1f2937', marginBottom: '6px' }}>
                          {selectedPeca.name}
                        </div>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                          {selectedPeca.content}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Agendamento Resumo */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    padding: '16px'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={16} color="var(--caixa-blue)" /> Programação de Disparo
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginTop: '10px' }}>
                      {momentoEnvio === 'imediato' ? 'Imediato após aprovação' : 'Agendado'}
                    </div>
                    {momentoEnvio === 'agendado' && dataAgendada && (
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', fontWeight: 500 }}>
                        Data: {new Date(dataAgendada).toLocaleDateString('pt-BR')} às {new Date(dataAgendada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32, borderTop: '1px solid var(--builder-border-light)', paddingTop: 20, marginBottom: 40 }}>
                <button className="btn btn-ghost" onClick={() => setStep(1)}>← Dados e Envio</button>
                <button
                  className="btn btn-primary"
                  onClick={publishCampaign}
                  disabled={publishing || published}
                  style={{ background: 'var(--caixa-orange)', color: 'white', border: 'none', fontWeight: 700 }}
                >
                  {publishing ? 'Enviando...' : published ? '✅ Enviada para Aprovação!' : '🚀 Enviar para Aprovação'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
