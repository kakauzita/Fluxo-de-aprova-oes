// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import ReactDOM from 'react-dom'
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
  Clock,
  Upload,
  Trash2,
  AlertCircle,
  Info
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

const getUnitLabel = (freq: string, intervalo: number) => {
  if (freq === 'diaria') return intervalo === 1 ? 'dia' : 'dias'
  if (freq === 'semanal') return intervalo === 1 ? 'semana' : 'semanas'
  if (freq === 'mensal') return intervalo === 1 ? 'mês' : 'meses'
  if (freq === 'anual') return intervalo === 1 ? 'ano' : 'anos'
  return freq
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
  const [recorrenciaTipo, setRecorrenciaTipo] = useState<'pontual' | 'recorrente'>('pontual')
  const [recorrenciaFrequencia, setRecorrenciaFrequencia] = useState<string>('mensal')
  const [recorrenciaIntervalo, setRecorrenciaIntervalo] = useState<number>(2)
  const [selectedExclusions, setSelectedExclusions] = useState<string[]>([])
  const [tempExclusion, setTempExclusion] = useState('')
  
  // ─── CSV & Target Mode States ───────────────────────────────────────────────
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvFileName, setCsvFileName] = useState('')
  const [csvFileStatus, setCsvFileStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [csvErrorMsg, setCsvErrorMsg] = useState('')
  const [csvRecordsCount, setCsvRecordsCount] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  
  // ─── Disparo Único Specific States ──────────────────────────────────────────
  const [selectedPeca, setSelectedPeca] = useState<any | null>(null)
  const [momentoEnvio, setMomentoEnvio] = useState<'imediato' | 'agendado'>('imediato')
  const [dataAgendada, setDataAgendada] = useState('')
  const [campaignObservation, setCampaignObservation] = useState('')

  // ─── Piece Selection Modal States ───────────────────────────────────────────
  const [pecasModalOpen, setPecasModalOpen] = useState(false)
  const [pecaSearch, setPecaSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'Todos' | 'PUSH' | 'SMS' | 'EMAIL' | 'WHATSAPP' | 'APP CAIXA'>('Todos')
  
  // ─── API Lists ──────────────────────────────────────────────────────────────
  const [apiPecas, setApiPecas] = useState<any[]>([])
  
  // ─── Publish States ─────────────────────────────────────────────────────────
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)

  // ─── Load data from backend ──────────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const pecasRes = await api.get('/pecas')
        setApiPecas(pecasRes.data)
      } catch (err) {
        console.error('Falha ao carregar dados do banco:', err)
      }
    }
    loadData()
  }, [])

  // ─── CSV Import & Toggle Helpers ───────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const csvContent = "cpf;email;telefone\n12345678901;cliente@exemplo.com;11999999999\n98765432100;outro@exemplo.com;\n11122233344;;21988888888"
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "modelo_importacao_clientes.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    processCSVFile(file)
  }

  const processCSVFile = (file: File) => {
    setCsvFile(file)
    setCsvFileName(file.name)
    setCsvFileStatus('loading')
    setCsvErrorMsg('')
    setCsvRecordsCount(0)

    const reader = new FileReader()
    reader.onload = (event) => {
      // Simulate validation delay for better visual feedback
      setTimeout(() => {
        const text = event.target?.result as string
        if (!text) {
          setCsvFileStatus('error')
          setCsvErrorMsg('O arquivo está vazio.')
          return
        }

        const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0)
        if (lines.length <= 1) {
          setCsvFileStatus('error')
          setCsvErrorMsg('O arquivo não contém linhas de dados (apenas cabeçalho ou vazio).')
          return
        }

        // Parse header
        const headerLine = lines[0]
        const separator = headerLine.includes(';') ? ';' : ','
        const headers = headerLine.split(separator).map(h => h.trim().toLowerCase())

        // Check columns
        const cpfIndex = headers.indexOf('cpf')
        const emailIndex = headers.indexOf('email')
        const telefoneIndex = headers.indexOf('telefone')

        if (cpfIndex === -1) {
          setCsvFileStatus('error')
          setCsvErrorMsg('Coluna obrigatória "cpf" não encontrada no cabeçalho do CSV. O arquivo deve conter: cpf;email;telefone')
          return
        }

        if (emailIndex === -1 && telefoneIndex === -1) {
          setCsvFileStatus('error')
          setCsvErrorMsg('O arquivo precisa conter ao menos uma coluna de contato: "email" ou "telefone".')
          return
        }

        // Validate rows
        let validCount = 0
        let invalidLines = 0

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(separator).map(cell => cell.trim())
          const cpf = row[cpfIndex]
          const email = emailIndex !== -1 ? row[emailIndex] : ''
          const telefone = telefoneIndex !== -1 ? row[telefoneIndex] : ''

          // Basic CPF presence validation
          if (!cpf) {
            invalidLines++
            continue
          }

          // At least one contact field must be present
          if (!email && !telefone) {
            invalidLines++
            continue
          }

          validCount++
        }

        if (validCount === 0) {
          setCsvFileStatus('error')
          setCsvErrorMsg('Nenhum registro válido encontrado. Verifique se as linhas possuem CPF e e-mail/telefone preenchidos.')
        } else {
          setCsvFileStatus('success')
          setCsvRecordsCount(validCount)
        }
      }, 800)
    }

    reader.onerror = () => {
      setCsvFileStatus('error')
      setCsvErrorMsg('Falha ao ler o arquivo CSV.')
    }

    reader.readAsText(file)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processCSVFile(e.dataTransfer.files[0])
    }
  }

  // ─── Publish Logic ──────────────────────────────────────────────────────────
  const publishCampaign = () => {
    const campaignPayload = {
      tipoCampanha: 'disparo_unico',
      nome: campaignName,
      descricao: description,
      recorrencia: {
        tipo: recorrenciaTipo,
        frequencia: recorrenciaTipo === 'recorrente' ? recorrenciaFrequencia : null,
        intervalo: recorrenciaTipo === 'recorrente' ? recorrenciaIntervalo : null
      },
      modoPublico: 'csv',
      publicoAlvo: [],
      segmento: [],
      csvFileName: csvFileName,
      csvRecordsCount: csvRecordsCount,
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
    const targetValid = csvFileStatus === 'success'
    const baseValid = campaignName && targetValid && selectedPeca
    if (momentoEnvio === 'agendado') {
      return baseValid && dataAgendada !== ''
    }
    return baseValid
  }, [campaignName, csvFileStatus, selectedPeca, momentoEnvio, dataAgendada])

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
            {campaignName || 'Campanha simples'}
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

              {/* Secção: Tipo de disparo */}
              <div className="setup-section">
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--caixa-blue)', borderLeft: '4px solid var(--caixa-blue)', paddingLeft: 14, marginBottom: 16 }}>
                  Tipo de disparo
                </h3>
                <div className="setup-card" style={{ padding: '24px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
                      <input 
                        type="radio" 
                        name="recorrenciaTipo" 
                        value="pontual"
                        checked={recorrenciaTipo === 'pontual'} 
                        onChange={() => setRecorrenciaTipo('pontual')}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--caixa-blue, #005ca9)', cursor: 'pointer' }}
                      />
                      <span>Disparo único</span>
                    </label>

                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
                      <input 
                        type="radio" 
                        name="recorrenciaTipo" 
                        value="recorrente"
                        checked={recorrenciaTipo === 'recorrente'} 
                        onChange={() => setRecorrenciaTipo('recorrente')}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--caixa-blue, #005ca9)', cursor: 'pointer' }}
                      />
                      <span>Recorrente</span>
                    </label>
                  </div>

                  {recorrenciaTipo === 'recorrente' && (
                    <>
                      <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '20px 0' }} />
                      
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                          Configuração da recorrência
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                          Configure a frequência e o período em que a campanha será enviada automaticamente.
                        </div>

                        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                              Frequência
                            </label>
                            <select 
                              className="form-select"
                              value={recorrenciaFrequencia}
                              onChange={(e) => setRecorrenciaFrequencia(e.target.value)}
                              style={{ width: '180px', padding: '8px 12px', fontSize: '13px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            >
                              <option value="diaria">Diária</option>
                              <option value="semanal">Semanal</option>
                              <option value="mensal">Mensal</option>
                              <option value="anual">Anual</option>
                            </select>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                              Repetir a cada
                            </label>
                            <select 
                              className="form-select"
                              value={recorrenciaIntervalo}
                              onChange={(e) => setRecorrenciaIntervalo(Number(e.target.value))}
                              style={{ width: '100px', padding: '8px 12px', fontSize: '13px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                                <option key={num} value={num}>{num}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div style={{ fontSize: '12px', color: '#0284c7', marginTop: '14px' }}>
                          A campanha será enviada a cada <strong>{recorrenciaIntervalo} {getUnitLabel(recorrenciaFrequencia, recorrenciaIntervalo)}</strong>.
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Secção 02: Quem vai receber */}
              <div className="setup-section">
                <style>{`
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}</style>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--caixa-blue)', borderLeft: '4px solid var(--caixa-blue)', paddingLeft: 14, marginBottom: 16 }}>
                  Quem vai receber
                </h3>
                <div className="setup-card">
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <Upload size={16} color="var(--caixa-blue)" />
                      <span style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
                        Importar lista própria (CSV)
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Neste fluxo simples, o envio é direcionado exclusivamente para a sua lista própria de destinatários.
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Drag & Drop Area */}
                      <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => {
                          const input = document.getElementById('csv-file-input');
                          if (input) input.click();
                        }}
                        style={{
                          border: dragActive 
                            ? '2px dashed var(--caixa-blue)' 
                            : csvFileStatus === 'success'
                            ? '2px solid #22c55e'
                            : csvFileStatus === 'error'
                            ? '2px dashed #ef4444'
                            : '2px dashed #cbd5e1',
                          borderRadius: '8px',
                          background: dragActive 
                            ? '#f0f7ff' 
                            : csvFileStatus === 'success'
                            ? '#f0fdf4'
                            : csvFileStatus === 'error'
                            ? '#fef2f2'
                            : '#f8fafc',
                          padding: '32px 24px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          position: 'relative'
                        }}
                      >
                        <input
                          type="file"
                          accept=".csv"
                          id="csv-file-input"
                          onChange={handleCSVUpload}
                          onClick={(e) => e.stopPropagation()}
                          style={{ display: 'none' }}
                        />

                        {/* IDLE / EMPTY STATE */}
                        {csvFileStatus === 'idle' && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '50%',
                              background: '#e2e8f0',
                              color: '#64748b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <Upload size={20} />
                            </div>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                                Arraste seu arquivo CSV ou clique para selecionar
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                Colunas obrigatórias: <strong style={{ color: '#475569' }}>cpf</strong> + <strong style={{ color: '#475569' }}>email</strong> ou <strong style={{ color: '#475569' }}>telefone</strong> (com DDD)
                              </div>
                            </div>
                          </div>
                        )}

                        {/* LOADING STATE */}
                        {csvFileStatus === 'loading' && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '10px 0' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              border: '3px solid #cbd5e1',
                              borderTopColor: 'var(--caixa-blue)',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite'
                            }} />
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>
                              Processando e validando arquivo "{csvFileName}"...
                            </div>
                          </div>
                        )}

                        {/* SUCCESS STATE */}
                        {csvFileStatus === 'success' && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '50%',
                              background: '#dcfce7',
                              color: '#16a34a',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '20px',
                              fontWeight: 'bold'
                            }}>
                              ✓
                            </div>
                            <div>
                              <div style={{ fontSize: '15px', fontWeight: 700, color: '#14532d' }}>
                                Arquivo importado com sucesso!
                              </div>
                              <div style={{ fontSize: '13px', color: '#15803d', marginTop: '4px', fontWeight: 600 }}>
                                {csvFileName} • {csvRecordsCount} registros válidos encontrados
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                              <label htmlFor="csv-file-input" style={{
                                background: '#ffffff',
                                border: '1px solid #bbf7d0',
                                color: '#16a34a',
                                padding: '6px 16px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}>
                                Substituir arquivo
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  setCsvFile(null)
                                  setCsvFileName('')
                                  setCsvFileStatus('idle')
                                  setCsvErrorMsg('')
                                  setCsvRecordsCount(0)
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#dc2626',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Trash2 size={13} />
                                Remover
                              </button>
                            </div>
                          </div>
                        )}

                        {/* ERROR STATE */}
                        {csvFileStatus === 'error' && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '50%',
                              background: '#fee2e2',
                              color: '#dc2626',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <AlertCircle size={22} />
                            </div>
                            <div>
                              <div style={{ fontSize: '15px', fontWeight: 700, color: '#991b1b' }}>
                                Falha na validação do arquivo
                              </div>
                              <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px', maxWidth: '400px', margin: '6px auto 0 auto', lineHeight: '1.4' }}>
                                {csvErrorMsg}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                              <label htmlFor="csv-file-input" style={{
                                background: '#ffffff',
                                border: '1px solid #fca5a5',
                                color: '#dc2626',
                                padding: '6px 16px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}>
                                Tentar outro arquivo
                              </label>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Download Template & Instructions Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '14px' }}>💡</span> 
                          Precisa de ajuda para estruturar? Baixe nosso modelo padrão pronto para preenchimento.
                        </div>
                        <button
                          type="button"
                          onClick={handleDownloadTemplate}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            color: '#475569',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <FileText size={14} />
                          Baixar modelo CSV
                        </button>
                      </div>
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

                      {/* Selected piece preview card — mirrors Canvas "Adicionar peça" pattern */}
                      {selectedPeca ? (
                        <div style={{ 
                          padding: '16px', 
                          background: '#ffffff', 
                          border: '1.5px solid var(--caixa-blue)', 
                          borderRadius: '8px', 
                          boxShadow: 'var(--shadow-sm)',
                          position: 'relative'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--caixa-blue)' }}>{selectedPeca.name}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className={`peca-channel ${selectedPeca.channel.toLowerCase().replace(' ', '-')}`} style={{ 
                                fontSize: '10px', 
                                padding: '2px 8px', 
                                borderRadius: '12px', 
                                fontWeight: 700,
                                textTransform: 'uppercase'
                              }}>
                                {selectedPeca.channel}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setPecaSearch('')
                                  setActiveTab('Todos')
                                  setPecasModalOpen(true)
                                }}
                                style={{
                                  background: 'none',
                                  border: '1px solid #cbd5e1',
                                  color: '#475569',
                                  borderRadius: '4px',
                                  padding: '2px 8px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                Trocar
                              </button>
                            </div>
                          </div>
                          <p style={{ fontSize: '13px', color: 'var(--builder-text-secondary)', margin: 0, lineHeight: '1.5' }}>
                            {selectedPeca.content}
                          </p>
                        </div>
                      ) : (
                        <div style={
                          {
                            border: '1.5px dashed #cbd5e1',
                            borderRadius: '8px',
                            padding: '20px',
                            textAlign: 'center',
                            background: '#f8fafc',
                            marginBottom: '4px'
                          }
                        }>
                          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 12px 0' }}>
                            Nenhuma peça selecionada para este passo de envio.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setPecaSearch('')
                              setActiveTab('Todos')
                              setPecasModalOpen(true)
                            }}
                            style={{
                              background: 'var(--caixa-blue)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '10px 20px',
                              fontSize: '14px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            + Adicionar peça
                          </button>
                        </div>
                      )}

                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 6 }}>
                        Apenas peças homologadas e aprovadas estão disponíveis para disparo rápido
                      </div>
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
                    Listas de exclusão aplicadas automaticamente a todas as campanhas
                  </p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', marginBottom: 16 }}>
                    {[
                      { title: 'Menores de 18 anos', desc: 'Excluídos automaticamente de todas as campanhas' },
                      { title: 'CPF Diferente de Regular na RFB', desc: 'CPF que não estiver com situação regular na Receita Federal' },
                      { title: 'Pessoas em situação de vulnerabilidade', desc: 'Lista atualizada diariamente pelo compliance' },
                      { title: 'Óbitos registrados', desc: 'Clientes com registro de óbito são excluídos automaticamente de todas as campanhas' }
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

                  {/* Banner de Aviso dentro de Exclusões */}
                  <div style={{
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '6px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 24
                  }}>
                    <Info size={20} style={{ color: '#0284c7', flexShrink: 0 }} />
                    <div style={{ fontSize: '13px', color: '#0369a1', lineHeight: '1.4' }}>
                      <strong style={{ fontWeight: 700 }}>Precisa atingir algum desses grupos?</strong> Se sua campanha tiver justificativa para isso, registre a solicitação no campo observações da etapa revisar fluxo. A solicitação será avaliada antes da aprovação.
                    </div>
                  </div>

                  <div style={{ marginTop: 24 }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 4 }}>
                      Lista de exclusão adicional <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '12px' }}>Opcional</span>
                    </label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <select
                        className="form-select"
                        style={{ flex: 1 }}
                        value={tempExclusion}
                        onChange={(e) => setTempExclusion(e.target.value)}
                      >
                        <option value="">Adicionar a lista de exclusão</option>
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
                      <button
                        type="button"
                        onClick={() => {
                          if (tempExclusion && !selectedExclusions.includes(tempExclusion)) {
                            setSelectedExclusions([...selectedExclusions, tempExclusion])
                            setTempExclusion('')
                          }
                        }}
                        disabled={!tempExclusion}
                        style={{
                          background: 'white',
                          border: '1px solid var(--caixa-blue, #005ca9)',
                          color: 'var(--caixa-blue, #005ca9)',
                          padding: '0 20px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          fontSize: '13px',
                          cursor: tempExclusion ? 'pointer' : 'not-allowed',
                          opacity: tempExclusion ? 1 : 0.6,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Adicionar
                      </button>
                    </div>

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
                      <div style={{ gridColumn: 'span 2' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Tipo de disparo</div>
                        <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 700, marginTop: '4px' }}>
                          {recorrenciaTipo === 'recorrente' ? `Recorrente (a cada ${recorrenciaIntervalo} ${getUnitLabel(recorrenciaFrequencia, recorrenciaIntervalo)})` : 'Disparo único'}
                        </div>
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
                          <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 700, marginTop: '4px' }}>Lista própria importada (CSV)</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Arquivo de Origem</div>
                          <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 700, marginTop: '4px' }}>
                            {csvFileName || 'Nenhum arquivo'} ({csvRecordsCount} registros válidos)
                          </div>
                        </div>
                      </div>

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
                  {publishing ? 'Enviando...' : published ? '✅ Enviada para Análise!' : '🚀 Enviar para Análise'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {pecasModalOpen && ReactDOM.createPortal(
        <div
          className="builder-layout-container"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(2px)',
            maxWidth: 'none', margin: 0, padding: 0, width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <div style={{
            background: '#ffffff',
            border: '1px solid #d1d9e0',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '720px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            margin: '0 16px'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid #d1d9e0',
              flexShrink: 0
            }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e' }}>
                Selecionar Peça de Comunicação
              </span>
              <button
                onClick={() => setPecasModalOpen(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '18px', color: '#718096', lineHeight: 1,
                  padding: '4px', borderRadius: '4px'
                }}
              >✕</button>
            </div>

            {/* Toolbar: search + tabs */}
            <div style={{
              padding: '12px 20px',
              borderBottom: '1px solid #e8ecf0',
              display: 'flex', alignItems: 'center', gap: '12px',
              flexWrap: 'wrap',
              flexShrink: 0,
              background: '#f5f6fa'
            }}>
              {/* Search */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: '#ffffff', border: '1px solid #d1d9e0',
                borderRadius: '6px', padding: '6px 10px',
                maxWidth: '280px', flex: '1 1 200px'
              }}>
                <Search size={14} color="#718096" />
                <input
                  type="text"
                  placeholder="Buscar peça por nome ou conteúdo..."
                  value={pecaSearch}
                  onChange={(e) => setPecaSearch(e.target.value)}
                  style={{
                    border: 'none', outline: 'none', fontSize: '13px',
                    color: '#1a1a2e', background: 'transparent', flex: 1,
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Channel tabs */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {(['Todos', 'PUSH', 'SMS', 'EMAIL', 'WHATSAPP', 'APP CAIXA'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '5px',
                      border: activeTab === tab ? '1.5px solid #1351b4' : '1.5px solid #d1d9e0',
                      background: activeTab === tab ? '#1351b4' : '#ffffff',
                      color: activeTab === tab ? '#ffffff' : '#4a5568',
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                      transition: 'all 0.15s', fontFamily: 'inherit'
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid body */}
            <div style={{ overflowY: 'auto', padding: '16px 20px', flex: 1 }}>
              {filteredPecas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#718096' }}>
                  Nenhuma peça de comunicação encontrada para este filtro.
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px'
                }}>
                  {filteredPecas.map(p => (
                    <div
                      key={p.id}
                      onClick={() => { setSelectedPeca(p); setPecasModalOpen(false) }}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #d1d9e0',
                        borderRadius: '8px',
                        padding: '14px 16px',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.border = '1.5px solid #1351b4'
                        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(19,81,180,0.12)'
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.border = '1px solid #d1d9e0'
                        ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a2e', lineHeight: 1.3 }}>{p.name}</span>
                        <span className={`peca-channel ${p.channel.toLowerCase().replace(' ', '-')}`} style={{ flexShrink: 0 }}>
                          {p.channel}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#4a5568', margin: 0, lineHeight: '1.5' }}>{p.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
