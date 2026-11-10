// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import {
  Zap,
  Clock,
  Send,
  GitBranch,
  Flag,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Play,
  Sparkles,
  AlertTriangle,
  Search,
  Check,
  Lock,
  FileText,
  ChevronRight,
  HelpCircle,
  FolderOpen,
  Mail,
  MessageSquare,
  MessageCircle,
  Smartphone,
  Link2,
  Info
} from 'lucide-react'
import './CampaignBuilderPage.css'
import JornadaExplicada, { mapBlocksToJornadaNodes } from '../../components/JornadaExplicada'

// ─── (SVG backward line overlay removed — replaced by inline card badges) ─────

// ─── Constants ────────────────────────────────────────────────────────────────
const MANDATORY_EXCLUSIONS = [
  'Menores de 18 anos',
  'CPF Diferente de Regular na RFB',
  'Pessoas em situação de vulnerabilidade',
  'Não perturbe CAIXA',
  'Não perturbe',
  'Segmento exclusivo e grupo familiar'
]

const getUnitLabel = (freq: string, intervalo: number) => {
  if (freq === 'diaria') return intervalo === 1 ? 'dia' : 'dias'
  if (freq === 'semanal') return intervalo === 1 ? 'semana' : 'semanas'
  if (freq === 'mensal') return intervalo === 1 ? 'mês' : 'meses'
  if (freq === 'anual') return intervalo === 1 ? 'ano' : 'anos'
  return freq
}

interface BlockMeta {
  icon: React.ReactNode
  label: string
  badge: string
  color: string
}

const BLOCK_META: Record<string, BlockMeta> = {
  trigger: {
    icon: (
      <div style={{ background: '#E4F7F4', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Zap size={13} color="#216E62" fill="#216E62" />
      </div>
    ),
    label: 'Início da campanha',
    badge: 'Início da campanha',
    color: '#216E62'
  },
  send: {
    icon: (
      <div style={{ background: '#F8EAF3', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Send size={13} color="#4F213F" />
      </div>
    ),
    label: 'Enviar peça de comunicação',
    badge: 'Enviar peça de comunicação',
    color: '#4F213F'
  },
  check: {
    icon: (
      <div style={{ background: '#FFF8F0', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <GitBranch size={13} color="#A65E00" />
      </div>
    ),
    label: 'Verificar',
    badge: 'Verificar',
    color: '#A65E00'
  },
  end: {
    icon: (
      <div style={{ background: '#f1f2f5', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Flag size={13} color="#718096" />
      </div>
    ),
    label: 'Encerrar campanha',
    badge: 'Encerrar campanha',
    color: '#718096'
  },
  connector: {
    icon: (
      <div style={{ background: '#E0E7FF', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Link2 size={13} color="#6366f1" />
      </div>
    ),
    label: 'Conectar',
    badge: 'Conexão',
    color: '#6366f1'
  },
}

const MOCK_PECAS = [
  { id: 'p1', name: 'Bem-vindo à CAIXA', channel: 'PUSH', content: 'Sua conta foi aberta com sucesso. Acesse o app e descubra suas vantagens.' },
  { id: 'p2', name: 'Cadastre sua chave Pix', channel: 'SMS', content: 'Facilite suas transferências! Acesse o app e cadastre sua chave Pix agora mesmo.' },
  { id: 'p3', name: 'Seu cartão pré-aprovado aguarda', channel: 'EMAIL', content: 'Temos um limite exclusivo para você. Acesse sua conta e desbloqueie seu cartão de crédito.' },
  { id: 'p4', name: 'Última chance para desbloquear', channel: 'SMS', content: 'Você ainda não desbloqueou seu cartão CAIXA. Desbloqueie hoje e não perca nossos benefícios.' },
  { id: 'p5', name: 'Oferta de Empréstimo', channel: 'PUSH', content: 'Crédito pré-aprovado com as melhores taxas. Simule agora no app.' },
  { id: 'p6', name: 'Desbloqueio de Cartão', channel: 'WHATSAPP', content: 'Olá! Vimos que seu cartão CAIXA chegou. Que tal desbloqueá-lo agora pelo WhatsApp?' },
  { id: 'p7', name: 'Pontos do Cartão', channel: 'APP CAIXA', content: 'Seu cartão CAIXA acumula pontos que nunca expiram. Conheça as vantagens.' }
]

// ─── Template Flows ───────────────────────────────────────────────────────────
const TEMPLATE_SIMPLES = [
  { id: 'ts1', type: 'trigger', config: { events: ['Cliente abrir conta'], operator: 'E', extra: '', conditions: [] } },
  { id: 'ts2', type: 'send', config: { piece: { id: 'p1', name: 'Bem-vindo à CAIXA', channel: 'PUSH', content: 'Sua conta foi aberta com sucesso. Acesse o app e descubra suas vantagens.' }, wait: { type: 'immediate', amount: '1', unit: 'dia' } } },
]

const TEMPLATE_DECISAO = [
  { id: 'td1', type: 'trigger', config: { events: ['Cliente abrir conta'], operator: 'E', extra: '', conditions: [] } },
  {
    id: 'td2', type: 'check', config: {
      question: 'Cliente possui cartão pré-aprovado?',
      yes: [
        { id: 'td3', type: 'send', config: { piece: { id: 'p3', name: 'Seu cartão pré-aprovado aguarda', channel: 'EMAIL', content: 'Temos um limite exclusivo para você. Acesse sua conta e desbloqueie seu cartão de crédito.' }, wait: { type: 'after', amount: '1', unit: 'dia' } } },
        { id: 'td4', type: 'end', config: { reason: 'Conversão realizada' } }
      ],
      no: [
        { id: 'td5', type: 'send', config: { piece: { id: 'p2', name: 'Cadastre sua chave Pix', channel: 'SMS', content: 'Facilite suas transferências! Acesse o app e cadastre sua chave Pix agora mesmo.' }, wait: { type: 'after', amount: '1', unit: 'dia' } } },
        { id: 'td6', type: 'end', config: { reason: 'Sem elegibilidade' } }
      ]
    }
  },
]

const TEMPLATE_RETORNO = [
  { id: 'tr1', type: 'trigger', config: { events: ['Cliente abrir conta'], operator: 'E', extra: '', conditions: [] } },
  {
    id: 'tr2', type: 'check', config: {
      question: 'Cliente ativou o produto?',
      yes: [
        { id: 'tr3', type: 'send', config: { piece: { id: 'p1', name: 'Parabéns pela ativação!', channel: 'PUSH', content: 'Você ativou o produto com sucesso. Aproveite todas as vantagens.' }, wait: { type: 'immediate', amount: '1', unit: 'dia' } } },
        { id: 'tr4', type: 'end', config: { reason: 'Conversão realizada' } }
      ],
      no: [
        { id: 'tr5', type: 'send', config: { piece: { id: 'p2', name: 'Lembrete de ativação', channel: 'SMS', content: 'Você ainda não ativou o produto. Acesse o app para ativar.' }, wait: { type: 'after', amount: '3', unit: 'dias' } } },
        { id: 'tr6', type: 'connector', config: { targetBlockId: 'tr2', direction: 'backward', timing: 'delay', delay: { amount: '2', unit: 'dias' }, maxRepetitions: 3 } },
      ]
    }
  },
]

const EXAMPLE_FLOW = TEMPLATE_RETORNO

const CONDICAO_OPCOES = [
  'Cliente movimentou a conta nos últimos 30 dias',
  'Renda presumida maior que R$ 3.000',
  'Sem restrição cadastral interna (CONFIP)',
  'Possui limite de crédito pré-aprovado',
  'Chave Pix não cadastrada na CAIXA',
  'Não possui o app CAIXA instalado',
  'Saldo em conta poupança maior que R$ 1.000',
  'Servidor público ativo',
  'Adesão ao Pé de Meia ativa'
]

const CHECK_CATEGORIES = [
  {
    category: 'Pix / Conta',
    items: [
      'Chave Pix cadastrada?',
      'Conta movimentada?',
      'Primeiro acesso realizado?',
      'Conta desbloqueada?',
      'App CAIXA acessado?',
      'Cadastro atualizado?',
      'Biometria validada?'
    ]
  },
  {
    category: 'Cartões',
    items: [
      'Cartão desbloqueado?',
      'Cartão utilizado?',
      'Fatura paga?',
      'Limite disponível?',
      'Limite utilizado?',
      'Cartão ativado?',
      'Compra realizada?',
      'Cartão virtual criado?'
    ]
  },
  {
    category: 'Crédito',
    items: [
      'Proposta aprovada?',
      'Crédito contratado?',
      'Simulação realizada?',
      'Contrato assinado?',
      'Oferta aceita?',
      'Documentação enviada?',
      'Análise concluída?',
      'Crédito liberado?'
    ]
  },
  {
    category: 'Habitação',
    items: [
      'Interesse em financiamento?',
      'Simulação habitacional realizada?',
      'Documentação validada?',
      'Etapa concluída?',
      'Contrato assinado?',
      'Imóvel aprovado?',
      'Avaliação concluída?'
    ]
  },
  {
    category: 'Benefícios sociais',
    items: [
      'Benefício disponível?',
      'Saque realizado?',
      'Cadastro validado?',
      'Elegibilidade confirmada?',
      'Atualização cadastral realizada?',
      'Benefício consultado?'
    ]
  },
  {
    category: 'Seguros',
    items: [
      'Seguro contratado?',
      'Cotação realizada?',
      'Cobertura ativada?',
      'Pagamento confirmado?',
      'Renovação concluída?'
    ]
  },
  {
    category: 'Investimentos',
    items: [
      'Aplicação realizada?',
      'Perfil de investimento atualizado?',
      'Investimento resgatado?',
      'Meta cadastrada?',
      'Primeiro aporte realizado?'
    ]
  },
  {
    category: 'Relacionamento / Engajamento',
    items: [
      'Mensagem visualizada?',
      'Link acessado?',
      'E-mail aberto?',
      'Push confirmado?',
      'WhatsApp entregue?',
      'Formulário preenchido?',
      'Jornada concluída?'
    ]
  },
  {
    category: 'Cobrança / Recuperação',
    items: [
      'Pagamento identificado?',
      'Parcela vencida?',
      'Acordo realizado?',
      'Negociação concluída?',
      'Boleto emitido?',
      'Dívida regularizada?'
    ]
  },
  {
    category: 'Educação financeira / onboarding',
    items: [
      'Conteúdo acessado?',
      'Curso iniciado?',
      'Tutorial concluído?',
      'Etapa finalizada?',
      'Perfil completado?'
    ]
  }
]

const TRIGGER_CATEGORIES = [
  {
    category: 'Conta / Pix',
    items: [
      "Cliente abriu conta corrente",
      "Cliente abriu conta poupança",
      "Cliente cadastrou chave Pix",
      "Cliente realizou transferência Pix",
      "Cliente recebeu transferência Pix",
      "Cliente atualizou dados cadastrais",
      "Cliente realizou portabilidade de salário",
      "Cliente ativou biometria no caixa eletrônico"
    ]
  },
  {
    category: 'Canais / Login',
    items: [
      "Cliente realizou login no App CAIXA",
      "Cliente realizou login no Internet Banking",
      "Cliente solicitou atendimento no chat"
    ]
  },
  {
    category: 'Cartões',
    items: [
      "Cliente consultou limite de cartão de crédito",
      "Cliente solicitou novo cartão de crédito",
      "Cliente desbloqueou cartão de crédito",
      "Cliente realizou compra acima de R$ 500 no cartão",
      "Cliente utilizou cartão de débito virtual",
      "Cliente solicitou segunda via de cartão",
      "Cliente cadastrou fatura por e-mail"
    ]
  },
  {
    category: 'Crédito / Empréstimo',
    items: [
      "Cliente simulou empréstimo pessoal",
      "Cliente contratou empréstimo pessoal",
      "Cliente contratou financiamento habitacional",
      "Cliente simulou financiamento de veículo",
      "Cliente contratou financiamento de veículo",
      "Cliente renegociou dívida atrasada",
      "Cliente contratou crédito consignado",
      "Cliente simulou crédito consignado",
      "Cliente contratou microcrédito orientado",
      "Cliente atingiu limite de cheque especial",
      "Cliente solicitou portabilidade de crédito"
    ]
  },
  {
    category: 'Investimentos / Previdência',
    items: [
      "Cliente aplicou em poupança",
      "Cliente contratou CDB",
      "Cliente resgatou CDB",
      "Cliente investiu em fundos de investimento",
      "Cliente comprou título de capitalização",
      "Cliente contratou previdência privada",
      "Cliente simulou previdência privada"
    ]
  },
  {
    category: 'Consórcios / Seguros',
    items: [
      "Cliente simulou consórcio imobiliário",
      "Cliente simulou consórcio auto",
      "Cliente contratou consórcio imobiliário",
      "Cliente contratou consórcio auto",
      "Cliente contratou seguro residencial",
      "Cliente contratou seguro de vida",
      "Cliente contratou seguro auto",
      "Cliente simulou seguro de vida"
    ]
  },
  {
    category: 'Serviços / Benefícios',
    items: [
      "Cliente realizou pagamento de boleto",
      "Cliente realizou agendamento de boleto",
      "Cliente realizou recarga de celular",
      "Cliente consultou Pé-de-Meia",
      "Cliente recebeu benefício social",
      "Cliente consultou saldo do FGTS",
      "Cliente solicitou saque-aniversário FGTS",
      "Cliente ativou débito automático"
    ]
  }
];

const PREDEFINED_EVENTS = TRIGGER_CATEGORIES.flatMap(cat => cat.items);


interface Option {
  id: string
  nome: string
}

export default function CampaignBuilderPage() {
  const navigate = useNavigate()

  // ─── Stepper & Form States ──────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [campaignName, setCampaignName] = useState('')
  const [description, setDescription] = useState('')
  const [recorrenciaTipo, setRecorrenciaTipo] = useState<'pontual' | 'recorrente'>('pontual')
  const [recorrenciaFrequencia, setRecorrenciaFrequencia] = useState<string>('mensal')
  const [recorrenciaIntervalo, setRecorrenciaIntervalo] = useState<number>(2)
  const [selectedPublicos, setSelectedPublicos] = useState<Option[]>([])
  const [selectedSegmentos, setSelectedSegmentos] = useState<any[]>([])
  const [tempPublicoId, setTempPublicoId] = useState('')
  const [tempSegmentoId, setTempSegmentoId] = useState('')
  const [selectedExclusions, setSelectedExclusions] = useState<string[]>([])
  const [tempExclusion, setTempExclusion] = useState('')

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

  // Load backend configurations
  const [publicos, setPublicos] = useState<Option[]>([])
  const [allSegmentos, setAllSegmentos] = useState<any[]>([])
  const [apiPecas, setApiPecas] = useState<any[]>([])

  // ─── Builder Canvas States ──────────────────────────────────────────────────
  const [builderView, setBuilderView] = useState<'select' | 'canvas'>('select')
  const [blocks, setBlocks] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [backupBlockConfig, setBackupBlockConfig] = useState<any>(null)
  const [customEventId, setCustomEventId] = useState<string | null>(null)
  const [isTriggerDropdownOpen, setIsTriggerDropdownOpen] = useState(false)
  const [isCheckDropdownOpen, setIsCheckDropdownOpen] = useState(false)
  const [checkSearchQuery, setCheckSearchQuery] = useState('')
  const [recentChecks, setRecentChecks] = useState<string[]>([])
  const [checkActiveIndex, setCheckActiveIndex] = useState(0)
  const [triggerSearchQuery, setTriggerSearchQuery] = useState('')
  const [recentTriggers, setRecentTriggers] = useState<string[]>([])
  const [triggerActiveIndex, setTriggerActiveIndex] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [addBlockTarget, setAddBlockTarget] = useState<{ blockId: string; branch: 'yes' | 'no' } | null>(null)
  const [addMenuPos, setAddMenuPos] = useState<{ x: number; y: number } | null>(null)
  // insertTarget: { index } = insert at root index, { blockId, branch } = insert in branch
  const [insertTarget, setInsertTarget] = useState<{ index: number } | { blockId: string; branch: 'yes' | 'no'; index: number } | null>(null)
  // Connector config subview states
  const [connectorConfigOpen, setConnectorConfigOpen] = useState(false)
  const [connectorTargetId, setConnectorTargetId] = useState<string | null>(null)
  const [connectorTiming, setConnectorTiming] = useState<'immediate' | 'delay'>('immediate')
  const [connectorDelay, setConnectorDelay] = useState({ amount: '1', unit: 'dia' })
  const [connectorMaxRepetitions, setConnectorMaxRepetitions] = useState<string>('')
  const [connectorUnlimited, setConnectorUnlimited] = useState<boolean>(false)

  // ─── Pan / Drag navigation (Figma-style) ─────────────────────────────
  // The canvas-grid is a 4000×4000px absolute surface.
  // Content is centered horizontally at x=2000. We init panOffset so that
  // content appears centered in the viewport.
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const isPanning = useRef(false)
  const [isPanningState, setIsPanningState] = useState(false)
  const lastPointer = useRef({ x: 0, y: 0 })
  const viewportRef = useRef<HTMLDivElement>(null)

  const CANVAS_CENTER_X = 2000 // matches canvas-grid width / 2
  const CANVAS_INITIAL_Y = 80  // top padding offset for content

  const resetPanToCenter = useCallback(() => {
    if (!viewportRef.current) return
    const { width, height } = viewportRef.current.getBoundingClientRect()
    setPanOffset({
      x: width / 2 - CANVAS_CENTER_X,
      y: CANVAS_INITIAL_Y
    })
  }, [])

  // Center canvas whenever step 2 becomes active
  useEffect(() => {
    if (step === 2) {
      // Small delay to let layout paint first
      const t = setTimeout(resetPanToCenter, 30)
      return () => clearTimeout(t)
    }
  }, [step, resetPanToCenter])

  const handleViewportPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.canvas-block, .block-card, button, select, input')) return
    isPanning.current = true
    setIsPanningState(true)
    lastPointer.current = { x: e.clientX, y: e.clientY }
      ; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    e.preventDefault()
  }, [])

  const handleViewportPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning.current) return
    const dx = e.clientX - lastPointer.current.x
    const dy = e.clientY - lastPointer.current.y
    lastPointer.current = { x: e.clientX, y: e.clientY }
    setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }))
  }, [])

  const handleViewportPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isPanning.current = false
    setIsPanningState(false)
      ; (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  }, [])

  // ─── Modal States ───────────────────────────────────────────────────────────
  const [pecasModalOpen, setPecasModalOpen] = useState(false)
  const [pecaSearch, setPecaSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'Todos' | 'PUSH' | 'SMS' | 'EMAIL' | 'WHATSAPP' | 'APP CAIXA'>('Todos')

  // ESC key to close open modals — WCAG 2.1.2 e eMAG 2.2
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (pecasModalOpen) {
          setPecasModalOpen(false)
        } else if (insertTarget) {
          setInsertTarget(null)
          setConnectorConfigOpen(false)
        } else if (selectedId) {
          setSelectedId(null)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pecasModalOpen, insertTarget, selectedId])

  // Load configurations
  useEffect(() => {
    async function loadData() {
      try {
        const [p, s, pecasRes] = await Promise.all([
          api.get('/admin/publicos-alvo'),
          api.get('/admin/segmentos'),
          api.get('/pecas', { params: { excludeStatus: 'RASCUNHO' } })
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

  // Filtered segments based on selected target audiences
  const filteredSegmentos = useMemo(() => {
    if (selectedPublicos.length === 0) return []
    return allSegmentos.filter((s: any) => selectedPublicos.some(p => p.id === s.publicoAlvoId))
  }, [allSegmentos, selectedPublicos])

  // Get name of selected publico and segmento
  const selectedPublicoName = useMemo(() => {
    return selectedPublicos.map(p => p.nome).join(', ')
  }, [selectedPublicos])

  const selectedSegmentoName = useMemo(() => {
    return selectedSegmentos.map(s => s.nome).join(', ')
  }, [selectedSegmentos])

  // ─── Reach Estimator ────────────────────────────────────────────────────────
  const reachEstimate = useMemo(() => {
    if (selectedSegmentos.length === 0) return 0
    let total = 0
    selectedSegmentos.forEach(seg => {
      const name = seg.nome.toLowerCase()
      if (name.includes('novo')) total += 48200
      else if (name.includes('ativo')) total += 312400
      else if (name.includes('inativo')) total += 89100
      else if (name.includes('premium')) total += 24600
      else if (name.includes('digital')) total += 198300
      else total += 60000
    })
    return total
  }, [selectedSegmentos])

  // ─── Combined Communication Pieces ──────────────────────────────────────────
  const allPecas = useMemo(() => {
    const formattedApi = (apiPecas || [])
      .filter((p: any) => p.status !== 'RASCUNHO')
      .map((p: any) => ({
        id: p.id,
        name: p.nome,
        channel: p.canal,
        content: p.conteudo?.mensagem || p.conteudo?.corpo || p.conteudo?.corpoHtml || 'Peça cadastrada no sistema'
      }))
    return [...formattedApi, ...MOCK_PECAS]
  }, [apiPecas])

  // Filtered pieces based on query & channel tabs in modal
  const filteredPecas = useMemo(() => {
    return allPecas.filter(p => {
      const matchTxt = p.name.toLowerCase().includes(pecaSearch.toLowerCase()) ||
        p.content.toLowerCase().includes(pecaSearch.toLowerCase())
      const matchCat = activeTab === 'Todos' || p.channel === activeTab
      return matchTxt && matchCat
    })
  }, [allPecas, pecaSearch, activeTab])

  // ─── Block tree logic helpers ──────────────────────────────────────────────

  function getBlockBriefInfo(blockId: string) {
    if (!blockId) return null;
    let found: any = null;
    const traverse = (list: any[]) => {
      for (const b of list) {
        if (b.id === blockId) {
          found = b;
          return;
        }
        if (b.type === 'check') {
          if (b.config.yes) traverse(b.config.yes);
          if (b.config.no) traverse(b.config.no);
        }
      }
    };
    traverse(blocks);
    if (!found) return null;

    if (found.type === 'trigger') {
      return { icon: '🚀', title: 'Início da jornada' };
    }
    if (found.type === 'send') {
      const channel = found.config.piece?.channel || 'SMS';
      const channelIcons: any = { SMS: '💬', EMAIL: '✉️', WHATSAPP: '🟢', PUSH: '🔔', APP: '📱' };
      const icon = channelIcons[channel.toUpperCase()] || '📨';
      return { icon, title: found.config.piece?.name || 'Ação de Envio' };
    }
    if (found.type === 'check') {
      return { icon: '🔀', title: found.config.question || 'Verificação' };
    }
    if (found.type === 'wait') {
      return { icon: '⏱️', title: `Aguardar: ${found.config.amount} ${found.config.unit}` };
    }
    return { icon: '•', title: 'Etapa' };
  }

  function getAnchoredBlocksFor(targetBlockId: string) {
    const anchored: any[] = [];
    const traverse = (list: any[]) => {
      list.forEach(b => {
        if (b.type === 'send' && b.config?.wait?.anchor === 'step' && b.config?.wait?.anchorBlockId === targetBlockId) {
          anchored.push(b);
        }
        if (b.type === 'send' && b.config?.wait?.anchor === 'start') {
          const triggerBlock = blocks.find(x => x.type === 'trigger');
          if (triggerBlock && triggerBlock.id === targetBlockId) {
            anchored.push(b);
          }
        }
        if (b.type === 'check') {
          if (b.config.yes) traverse(b.config.yes);
          if (b.config.no) traverse(b.config.no);
        }
      });
    };
    traverse(blocks);
    return anchored;
  }

  function getSequentialTimelineFor(rootBlockId: string, list: any[]): any[] {
    // Returns the full linear timeline starting from rootBlockId.
    // Anchored blocks (anchor='start' or anchor='step') are NOT separate parallel branches—
    // they are just timing metadata and should render linearly.
    const timeline: any[] = [];
    let foundRoot = false;
    
    for (const b of list) {
      if (b.id === rootBlockId) {
        foundRoot = true;
        timeline.push(b);
        if (b.type === 'check') break;
        continue;
      }
      
      if (foundRoot) {
        timeline.push(b);
        if (b.type === 'check') break;
      }
    }
    
    return timeline;
  }

  const blockNumbersMap = useMemo(() => {
    const map: Record<string, number> = {};
    let currentNumber = 1;
    const visited = new Set<string>();

    const traverseTimeline = (list: any[]) => {
      list.forEach(b => {
        const isEnd = b.id === 'end_auto' || b.type === 'end';
        if (isEnd) return;

        if (visited.has(b.id)) return;
        visited.add(b.id);

        map[b.id] = currentNumber++;

        if (b.type === 'check') {
          if (b.config.yes) traverseTimeline(b.config.yes);
          if (b.config.no) traverseTimeline(b.config.no);
        }
      });
    };

    if (blocks.length > 0) {
      traverseTimeline(blocks);
    }
    return map;
  }, [blocks]);

  // ─── Map: targetBlockId → list of backward connectors pointing to it ─────────
  const returnsToMap = useMemo(() => {
    const map: Record<string, { connectorId: string; fromStepNum: number | null; maxRepetitions: number | null }[]> = {};
    const flattenBlocks = (list: any[]): any[] => {
      let flat: any[] = [];
      for (const b of list) {
        flat.push(b);
        if (b.config?.yes) flat = flat.concat(flattenBlocks(b.config.yes));
        if (b.config?.no) flat = flat.concat(flattenBlocks(b.config.no));
      }
      return flat;
    };
    const allBlocks = flattenBlocks(blocks);
    allBlocks.forEach(b => {
      if (b.type === 'connector' && b.config?.direction === 'backward' && b.config?.targetBlockId) {
        const tid = b.config.targetBlockId;
        if (!map[tid]) map[tid] = [];
        // fromStepNum is the step number of the connector block itself
        // we approximate it using blockNumbersMap of the prev block or just use connector's own position
        const fromStep = blockNumbersMap[b.id] ?? null;
        map[tid].push({
          connectorId: b.id,
          fromStepNum: fromStep,
          maxRepetitions: b.config.maxRepetitions ?? null
        });
      }
    });
    return map;
  }, [blocks, blockNumbersMap]);

  function createBlockObj(id: string, type: string) {
    const defaults = {
      trigger: { events: [], operator: 'E', extra: '' },
      wait: { amount: '1', unit: 'dias' },
      send: { piece: null, wait: { type: 'immediate', amount: '1', unit: 'dia' } },
      check: { question: '', yes: [], no: [] },
      end: { reason: '' },
      connector: { targetBlockId: null, direction: null, timing: 'immediate', delay: { amount: '1', unit: 'dia' }, maxRepetitions: null }
    }
    return { id, type, config: JSON.parse(JSON.stringify((defaults as any)[type])) }
  }

  function ensureEndBlock(list: any[]): any[] {
    const endId = 'end_auto'
    const filtered = list.filter(b => b.id !== endId)
    const endBlock = createBlockObj(endId, 'end')
    return [...filtered, endBlock]
  }

  function addBlock(type: string) {
    const id = 'b' + Date.now() + Math.floor(Math.random() * 1000)
    const newBlock = createBlockObj(id, type)
    if (type === 'end') return // end is managed automatically

    const updated = [...blocks]
    const withoutEnd = updated.filter(b => b.id !== 'end_auto')
    withoutEnd.push(newBlock)
    setBlocks(ensureEndBlock(withoutEnd))
    setSelectedId(id)
  }

  function insertBlockAt(type: string) {
    if (!insertTarget) return
    const id = 'b' + Date.now() + Math.floor(Math.random() * 1000)
    const newBlock = createBlockObj(id, type)

    if ('index' in insertTarget && !('blockId' in insertTarget)) {
      // root-level insert
      const withoutEnd = blocks.filter(b => b.id !== 'end_auto')
      withoutEnd.splice(insertTarget.index, 0, newBlock)
      setBlocks(ensureEndBlock(withoutEnd))
    } else if ('blockId' in insertTarget) {
      const tgt = insertTarget as { blockId: string; branch: 'yes' | 'no'; index: number }
      const updated = [...blocks]
      findAndModifyBlock(updated, tgt.blockId, (parent: any) => {
        const branch = tgt.branch
        if (!parent.config[branch]) parent.config[branch] = []
        parent.config[branch].splice(tgt.index, 0, newBlock)
      })
      setBlocks(updated)
    }
    setSelectedId(id)
    setInsertTarget(null)
  }

  function confirmAddBlock(type: string) {
    if (insertTarget) {
      insertBlockAt(type)
    } else {
      addBlock(type)
    }
    setAddMenuPos(null)
  }

  function findAndModifyBlock(list: any[], targetId: string, action: (b: any) => void): boolean {
    for (let b of list) {
      if (b.id === targetId) {
        action(b)
        return true
      }
      if (b.type === 'check') {
        const foundY = findAndModifyBlock(b.config.yes || [], targetId, action)
        if (foundY) return true
        const foundN = findAndModifyBlock(b.config.no || [], targetId, action)
        if (foundN) return true
      }
    }
    return false
  }

  function findBlock(id: string, list: any[]): any | null {
    for (const b of list) {
      if (b.id === id) return b
      if (b.type === 'check') {
        const y = findBlock(id, b.config.yes || [])
        if (y) return y
        const n = findBlock(id, b.config.no || [])
        if (n) return n
      }
    }
    return null
  }

  const selectedBlock = useMemo(() => {
    if (!selectedId) return null
    return findBlock(selectedId, blocks)
  }, [selectedId, blocks])

  function updateBlockConfig(blockId: string, key: string | Record<string, any>, value?: any) {
    setBlocks(prevBlocks => {
      const updated = JSON.parse(JSON.stringify(prevBlocks))
      findAndModifyBlock(updated, blockId, (b) => {
        if (typeof key === 'string') {
          b.config[key] = value
        } else {
          for (const k in key) {
            b.config[k] = key[k]
          }
        }
      })
      return updated
    })
  }

  useEffect(() => {
    if (selectedId && selectedBlock) {
      setBackupBlockConfig(JSON.parse(JSON.stringify(selectedBlock.config)))
    } else {
      setBackupBlockConfig(null)
    }
  }, [selectedId])

  const handleCancelEdit = () => {
    if (selectedId && backupBlockConfig) {
      setBlocks(prev => {
        const updated = [...prev]
        let found = false
        const revertBlock = (list: any[]) => {
          for (let i = 0; i < list.length; i++) {
            if (list[i].id === selectedId) {
              list[i].config = JSON.parse(JSON.stringify(backupBlockConfig))
              found = true
              return
            }
            if (list[i].type === 'check') {
              revertBlock(list[i].config.yes || [])
              if (found) return
              revertBlock(list[i].config.no || [])
              if (found) return
            }
          }
        }
        revertBlock(updated)
        if (selectedBlock?.type === 'trigger') {
          const trigger = updated.find(x => x.type === 'trigger')
          if (trigger && (!trigger.config.events || trigger.config.events.length === 0 || trigger.config.events[0] === '')) {
            return []
          }
        }
        return updated
      })
    }
    setSelectedId(null)
    setBackupBlockConfig(null)
  }

  const handleConfirmEdit = () => {
    setSelectedId(null)
    setBackupBlockConfig(null)
  }

  function deleteBlock(id: string) {
    // Check if any connector blocks reference this block
    const findConnectorsTargeting = (list: any[], targetId: string): any[] => {
      const results: any[] = []
      list.forEach(b => {
        if (b.type === 'connector' && b.config?.targetBlockId === targetId) {
          results.push(b)
        }
        if (b.type === 'check') {
          results.push(...findConnectorsTargeting(b.config?.yes || [], targetId))
          results.push(...findConnectorsTargeting(b.config?.no || [], targetId))
        }
      })
      return results
    }

    const referencingConnectors = findConnectorsTargeting(blocks, id)
    if (referencingConnectors.length > 0) {
      const msg = referencingConnectors.length === 1
        ? 'Existe uma conexão apontando para esta etapa. Deseja excluir a etapa e a conexão associada?'
        : `Existem ${referencingConnectors.length} conexões apontando para esta etapa. Deseja excluir a etapa e todas as conexões associadas?`
      if (!window.confirm(msg)) return
      // Also remove the connectors
      referencingConnectors.forEach(c => {
        removeBlockById(c.id)
      })
    }

    removeBlockById(id)
    if (selectedId === id) {
      setSelectedId(null)
    }
  }

  function removeBlockById(id: string) {
    setBlocks(prev => {
      let updated = [...prev]

      // Filter at root level
      const initialLen = updated.length
      updated = updated.filter(b => b.id !== id)

      // If not removed from root, recursively search and filter
      if (updated.length === initialLen) {
        const recursiveDelete = (list: any[]) => {
          for (let b of list) {
            if (b.type === 'check') {
              b.config.yes = (b.config.yes || []).filter((x: any) => x.id !== id)
              b.config.no = (b.config.no || []).filter((x: any) => x.id !== id)
              recursiveDelete(b.config.yes)
              recursiveDelete(b.config.no)
            }
          }
        }
        recursiveDelete(updated)
      }
      return updated
    })
  }

  const validateCampaignJourney = (list: any[]): { valid: boolean; message?: string } => {
    for (const b of list) {
      if (b.id === 'end_auto' || b.type === 'end') {
        continue;
      }
      if (b.type === 'trigger') {
        if (!b.config?.events || b.config.events.length === 0 || !b.config.events[0]) {
          return {
            valid: false,
            message: 'Por favor, selecione ou crie um evento de gatilho para iniciar a jornada.',
          };
        }
      }
      if (b.type === 'send') {
        if (!b.config?.piece || !b.config.piece.id) {
          return {
            valid: false,
            message: 'Por favor, selecione uma peça de comunicação para todas as etapas de envio.',
          };
        }
      }
      if (b.type === 'check') {
        if (!b.config?.question || !b.config.question.trim() || b.config.question === 'Defina a pergunta de verificação...') {
          return {
            valid: false,
            message: 'Por favor, defina a pergunta de verificação para todas as condicionais.',
          };
        }
        
        const yesList = b.config?.yes || [];
        const noList = b.config?.no || [];
        
        if (yesList.length === 0 && noList.length === 0) {
          return {
            valid: false,
            message: `A condicional "${b.config.question}" precisa ter pelo menos um dos caminhos configurados ("Sim" ou "Não").`,
          };
        }
        
        if (yesList.length > 0) {
          const yesVal = validateCampaignJourney(yesList);
          if (!yesVal.valid) return yesVal;
        }
        
        if (noList.length > 0) {
          const noVal = validateCampaignJourney(noList);
          if (!noVal.valid) return noVal;
        }
      }
      if (b.type === 'connector') {
        if (!b.config?.targetBlockId) {
          return {
            valid: false,
            message: 'Uma conexão precisa ter uma etapa de destino selecionada.',
          };
        }
        // Check that the target block still exists in the flow
        const targetExists = findBlock(b.config.targetBlockId, blocks);
        if (!targetExists) {
          return {
            valid: false,
            message: 'Uma conexão aponta para uma etapa que não existe mais. Remova ou reconfigure a conexão.',
          };
        }
        if (b.config.direction === 'backward' && (!b.config.maxRepetitions || (b.config.maxRepetitions !== -1 && b.config.maxRepetitions < 1))) {
          return {
            valid: false,
            message: 'Defina quantas vezes o retorno poderá acontecer na conexão de retorno.',
          };
        }
      }
    }
    return { valid: true };
  };

  const goToStep3 = () => {
    const validation = validateCampaignJourney(blocks);
    if (!validation.valid) {
      alert(validation.message);
      return;
    }
    setStep(3);
  };

  function openAddMenu(e: React.MouseEvent, blockId: string, branch: 'yes' | 'no') {
    e.stopPropagation()
    setInsertTarget({ blockId, branch, index: 9999 })
    setSelectedId(null)
  }

  // Close panel on canvas click
  useEffect(() => {
    const closeAll = () => { setAddMenuPos(null) }
    window.addEventListener('click', closeAll)
    return () => window.removeEventListener('click', closeAll)
  }, [])

  // ─── Simulation & Stats ─────────────────────────────────────────────────────

  function countBlocks(list: any[]): number {
    let n = 0
    for (const b of list) {
      n++
      if (b.type === 'check') {
        n += countBlocks(b.config.yes || [])
        n += countBlocks(b.config.no || [])
      }
    }
    return n
  }

  function countChecks(list: any[]): number {
    let n = 0
    for (const b of list) {
      if (b.type === 'check') {
        n++
        n += countChecks(b.config.yes || [])
        n += countChecks(b.config.no || [])
      }
    }
    return n
  }

  function sumDays(list: any[]): number {
    let d = 0
    for (const b of list) {
      if (b.type === 'send' && b.config.wait) {
        const w = b.config.wait
        if (w.type === 'after' || w.type === 'before') {
          const a = parseInt(w.amount) || 0
          const u = w.unit || 'dia'
          if (u.startsWith('hora') || u === 'horas') {
            d += Math.ceil(a / 24)
          } else if (u.startsWith('dia') || u === 'dias') {
            d += a
          }
        } else if (w.type === 'date') {
          if (w.date) {
            const diffTime = Math.max(0, new Date(w.date).getTime() - new Date('2026-05-25').getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            d += diffDays
          } else {
            d += 1
          }
        }
      }
      if (b.type === 'wait' && b.config.amount) {
        const a = parseInt(b.config.amount) || 0
        if (b.config.unit === 'horas') {
          d += Math.ceil(a / 24)
        } else if (b.config.unit === 'dias') {
          d += a
        }
      }
      if (b.type === 'check') {
        d += Math.max(sumDays(b.config.yes || []), sumDays(b.config.no || []))
      }
    }
    return d
  }

  const stats = useMemo(() => {
    const total = countBlocks(blocks)
    const paths = 1 + countChecks(blocks)
    const duration = sumDays(blocks)
    return { total, paths, duration }
  }, [blocks])

  function runSimulation() {
    if (stats.total === 0) {
      alert('Adicione blocos ao canvas antes de simular a jornada.')
      return
    }
    const msg = `✅ Simulação Concluída!\n\n📦 Total de Blocos: ${stats.total}\n📅 Caminho mais longo: ${stats.duration} dias\n👥 Público Alvo Estimado: ~${reachEstimate.toLocaleString('pt-BR')} pessoas\n📨 Envios Estimados: ~${(stats.total * 6200).toLocaleString('pt-BR')} mensagens`
    alert(msg)
  }

  // ─── Exclusions ─────────────────────────────────────────────────────────────

  function toggleExclusion(item: string) {
    setSelectedExclusions(prev =>
      prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
    )
  }

  // Templates suggested helper
  function loadTemplate(name: 'simples' | 'decisao' | 'retorno' | 'boasvindas' | 'cartao' | 'reengajamento') {
    const templateMap: Record<string, any[]> = {
      simples: TEMPLATE_SIMPLES,
      decisao: TEMPLATE_DECISAO,
      retorno: TEMPLATE_RETORNO,
      boasvindas: TEMPLATE_SIMPLES,
      cartao: TEMPLATE_DECISAO,
      reengajamento: TEMPLATE_RETORNO,
    }
    const source = templateMap[name] || TEMPLATE_SIMPLES
    const flow = JSON.parse(JSON.stringify(source))
    setBlocks(ensureEndBlock(flow.filter((b: any) => b.type !== 'end')))
    setSelectedId(null)
    setInsertTarget(null)
    setBuilderView('canvas')
    setTimeout(resetPanToCenter, 30)
  }

  // Publish flow state
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [campaignObservation, setCampaignObservation] = useState('')
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false)

  function publishCampaign() {
    const campaignPayload = {
      tipoCampanha: 'jornada',
      nome: campaignName,
      descricao: description,
      recorrencia: {
        tipo: recorrenciaTipo,
        frequencia: recorrenciaTipo === 'recorrente' ? recorrenciaFrequencia : null,
        intervalo: recorrenciaTipo === 'recorrente' ? recorrenciaIntervalo : null
      },
      publicoAlvo: selectedPublicos,
      segmento: selectedSegmentos,
      exclusoes: [
        'menores_18',
        'cpf_irregular_rfb',
        'vulnerabilidade',
        'nao_perturbe_caixa',
        'nao_perturbe',
        'segmento_exclusivo_familiar',
        ...selectedExclusions
      ],
      fluxo: {
        nos: blocks
      }
    }
    
    console.log('Publicando Campanha (Jornada) - Payload:', JSON.stringify(campaignPayload, null, 2))
    
    setPublishing(true)
    setTimeout(() => {
      setPublishing(false)
      setPublished(true)
    }, 1500)
  }

  // ─── Renderer JSX Helpers ───────────────────────────────────────────────────

  function getChannelIcon(channel: string) {
    const iconSize = 20
    switch (channel.toUpperCase()) {
      case 'EMAIL':
        return <Mail size={iconSize} color="#1d4ed8" />
      case 'PUSH':
        return (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Smartphone size={iconSize} color="#1d4ed8" />
            <Sparkles size={8} color="#f59e0b" style={{ position: 'absolute', top: -2, right: -2 }} />
          </div>
        )
      case 'SMS':
        return <MessageSquare size={iconSize} color="#1d4ed8" />
      case 'WHATSAPP':
        return <MessageCircle size={iconSize} color="#16a34a" />
      case 'APP':
      case 'APP CAIXA':
        return (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Smartphone size={iconSize} color="#1d4ed8" />
            <Check size={9} color="#1d4ed8" style={{ position: 'absolute', top: 5, left: 5, fontWeight: 'bold' }} />
          </div>
        )
      default:
        return <Send size={iconSize} color="#1a7a4a" />
    }
  }

  function renderBlockBodyText(b: any) {
    if (b.type === 'trigger') {
      const evts = (b.config.events || []).join(` ou `)
      return (
        <div>
          {evts ? (
            <>
              A campanha começa quando: <br />
              <strong style={{ color: 'var(--caixa-blue)' }}>{evts}</strong>
            </>
          ) : (
            <span className="block-empty">Selecione o evento que inicia a comunicação</span>
          )}
          {b.config.extra && (
            <div style={{ marginTop: 4, fontStyle: 'italic', fontSize: 12, color: 'var(--builder-muted)' }}>
              ({b.config.extra})
            </div>
          )}
        </div>
      )
    }
    if (b.type === 'wait') {
      return b.config.amount ? (
        <span>Aguardar por <strong>{b.config.amount} {b.config.unit || 'dias'}</strong></span>
      ) : (
        <span className="block-empty">Configure o tempo de espera...</span>
      )
    }
    if (b.type === 'send') {
      return b.config.piece ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '4px 0', width: '100%' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '8px',
            background: b.config.piece.channel.toUpperCase() === 'WHATSAPP' ? '#e8f5e9' : '#f0f4f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {getChannelIcon(b.config.piece.channel)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span style={{ color: '#0f172a' }}>{b.config.piece.channel}</span> - {b.config.piece.name}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.3' }}>
              {b.config.piece.content}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 0', color: 'var(--builder-muted)', width: '100%' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', border: '1.5px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Send size={18} color="#94a3b8" />
          </div>
          <span className="block-empty" style={{ fontSize: '12px', textAlign: 'left' }}>Selecionar peça de comunicação...</span>
        </div>
      )
    }
    if (b.type === 'check') {
      return (
        <div>
          {b.config.question ? (
            <strong>{b.config.question}</strong>
          ) : (
            <span className="block-empty">Defina a pergunta de verificação...</span>
          )}
          {b.config.extra && (
            <div style={{ marginTop: 4, fontStyle: 'italic', fontSize: 12, color: 'var(--builder-muted)' }}>
              ({b.config.extra})
            </div>
          )}
        </div>
      )
    }
    if (b.type === 'end') {
      return b.config.reason ? (
        <span>Encerrado por: <strong>{b.config.reason}</strong></span>
      ) : (
        <span>A campanha será finalizada aqui.</span>
      )
    }
    if (b.type === 'connector') {
      const targetBlock = b.config.targetBlockId ? findBlock(b.config.targetBlockId, blocks) : null
      const targetStepNum = b.config.targetBlockId ? blockNumbersMap[b.config.targetBlockId] : null
      const targetInfo = b.config.targetBlockId ? getBlockBriefInfo(b.config.targetBlockId) : null
      const isBackward = b.config.direction === 'backward'

      if (!targetBlock) {
        return <span className="block-empty">Selecione uma etapa de destino...</span>
      }

      const delayText = b.config.timing === 'delay'
        ? `${b.config.delay?.amount || '1'} ${b.config.delay?.unit || 'dia'}`
        : null

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isBackward ? <RotateCcw size={14} color="#6366f1" /> : <ChevronRight size={14} color="#6366f1" />}
            <strong style={{ color: '#1e293b' }}>
              {isBackward
                ? (blockNumbersMap[b.id] ? `Etapa ${blockNumbersMap[b.id]} • Retorno` : 'Retorno')
                : (blockNumbersMap[b.id] ? `Etapa ${blockNumbersMap[b.id]} • Seguir para` : 'Seguir para')}
            </strong>
          </div>
          {delayText && (
            <span style={{
              fontSize: '11px', background: '#f1f5f9', padding: '2px 8px',
              borderRadius: '12px', fontWeight: 600, color: '#475569',
              display: 'inline-flex', alignItems: 'center', gap: '3px', alignSelf: 'flex-start'
            }}>
              ⏱️ Após {delayText}
            </span>
          )}
          <div style={{ fontSize: '12px', color: '#475569' }}>
            {isBackward ? 'Volta para' : 'Segue para'} etapa {targetStepNum || '?'}
            {targetInfo && <> • {targetInfo.title}</>}
          </div>
          {isBackward && b.config.maxRepetitions && (
            <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600 }}>
              {b.config.maxRepetitions === -1 ? 'Ilimitado' : `Máximo: ${b.config.maxRepetitions}x`}
            </div>
          )}
        </div>
      )
    }
    return null
  }

  function renderBlockWaitHeader(b: any) {
    if (b.type !== 'send') return null
    const w = b.config.wait || { type: 'immediate' }

    let suffix = ''
    if (w.anchor === 'start') {
      suffix = ' após início'
    } else if (w.anchor === 'step') {
      suffix = ' após etapa'
    }

    let text = 'Imediatamente'
    if (w.type === 'after') {
      const amt = w.amount || '1'
      let unit = w.unit || 'dia'
      if (amt === '1') {
        if (unit.endsWith('s')) {
          unit = unit.slice(0, -1)
        }
      } else {
        if (!unit.endsWith('s')) {
          unit = unit + 's'
        }
      }
      text = `${amt} ${unit}${suffix || ' após'}`
    } else if (w.type === 'before') {
      const amt = w.amount || '1'
      let unit = w.unit || 'dia'
      if (amt === '1') {
        if (unit.endsWith('s')) {
          unit = unit.slice(0, -1)
        }
      } else {
        if (!unit.endsWith('s')) {
          unit = unit + 's'
        }
      }
      text = `${amt} ${unit} antes`
    } else if (w.type === 'date') {
      if (w.date) {
        const [year, month, day] = w.date.split('-')
        text = `${day}/${month}/${year}`
      } else {
        text = 'Agendado'
      }
    } else if (w.type === 'immediate' && suffix) {
      text = `Imediatamente${suffix}`
    }

    return (
      <span style={{
        marginLeft: 'auto',
        fontSize: '11px',
        color: '#475569',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: '#f1f5f9',
        padding: '3px 8px',
        borderRadius: '12px',
        fontWeight: 600
      }}>
        ⏱️ {text}
      </span>
    )
  }

  function renderInlineAddBtn(onClickInsert: () => void, isEnd?: boolean) {
    return (
      <div className="inline-add-wrapper">
        <div className="block-connector" />
        <button
          className={`inline-add-btn${isEnd ? ' end-add-btn' : ''}`}
          onClick={(e) => { e.stopPropagation(); onClickInsert() }}
          title="Adicionar etapa aqui"
        >
          +
        </button>
        <div className="block-connector" />
      </div>
    )
  }

  function renderBlockTree(list: any[], branchCtx?: { blockId: string; branch: 'yes' | 'no' }): React.ReactNode {
    if (list.length === 0) {
      if (branchCtx) {
        const endId = `end_auto_${branchCtx.blockId}_${branchCtx.branch}`;
        return [
          <React.Fragment key={`add_final_${endId}`}>
            {renderInlineAddBtn(() => {
              setInsertTarget({ blockId: branchCtx.blockId, branch: branchCtx.branch, index: 0 });
              setSelectedId(null);
            }, true)}
          </React.Fragment>,
          buildBlockCard({ id: endId, type: 'end', config: {} }, undefined, true)
        ];
      }
      return null;
    }

    const displayList = [...list];

    // ── Helper: returns a key identifying the anchor target, or null if not anchored
    const getAnchorKey = (b: any): string | null => {
      if (b.type !== 'send') return null;
      const a = b.config?.wait?.anchor;
      if (!a || a === 'previous') return null;
      if (a === 'start') return 'start';
      if (a === 'step') return `step:${b.config?.wait?.anchorBlockId || ''}`;
      return null;
    };

    // ── Build segment list: each segment is either a single block or a parallel group
    type SingleSeg = { kind: 'single'; block: any; idx: number };
    type ParallelSeg = { kind: 'parallel'; blocks: any[]; startIdx: number };
    type Seg = SingleSeg | ParallelSeg;

    const segments: Seg[] = [];
    let i = 0;
    while (i < displayList.length) {
      const block = displayList[i];
      const anchorKey = getAnchorKey(block);

      if (anchorKey !== null) {
        // Look ahead: collect consecutive blocks with the same anchor key
        const group: any[] = [block];
        let j = i + 1;
        while (j < displayList.length) {
          const nextKey = getAnchorKey(displayList[j]);
          if (nextKey === anchorKey) {
            group.push(displayList[j]);
            j++;
          } else {
            break;
          }
        }
        if (group.length > 1) {
          segments.push({ kind: 'parallel', blocks: group, startIdx: i });
          i = j;
          continue;
        }
      }
      segments.push({ kind: 'single', block, idx: i });
      i++;
    }

    // ── Helper: build the card JSX for a single block
    function buildBlockCard(block: any, stepNum: number | undefined, isEnd: boolean) {
      // Backward connectors that point to this block
      const incomingReturns = returnsToMap[block.id] ?? [];
      const isAutoEnd = block.id === 'end_auto' || block.id.startsWith('end_auto_') || block.type === 'end';
      return (
      <div id={`canvas-block-${block.id}`} className={`canvas-block${block.type === 'connector' && block.config?.direction === 'backward' ? ' connector-backward' : ''}`} style={{ position: 'relative' }} key={block.id}>
        <div
          className={`block-card type-${block.type} ${selectedId === block.id ? 'selected' : ''} ${isAutoEnd ? 'auto-end' : ''}`}
          onClick={(e) => { e.stopPropagation(); if (!isAutoEnd && block.type !== 'connector') setSelectedId(block.id); }}
        >
          {/* Return-from badge — shown on the TARGET block of backward connectors */}
          {incomingReturns.length > 0 && (
            <div style={{ position: 'absolute', top: -12, right: 12, display: 'flex', gap: 4, zIndex: 20 }}>
              {incomingReturns.map((ret, ri) => {
                const flatAll = (() => {
                  const flatten = (list: any[]): any[] => {
                    let f: any[] = [];
                    for (const b of list) {
                      f.push(b);
                      if (b.config?.yes) f = f.concat(flatten(b.config.yes));
                      if (b.config?.no) f = f.concat(flatten(b.config.no));
                    }
                    return f;
                  };
                  return flatten(blocks);
                })();
                const maxRep = ret.maxRepetitions;
                const tooltipText = `Retorno para esta etapa${maxRep ? (maxRep === -1 ? ' · Ilimitado' : ` · Máx. ${maxRep}×`) : ''}`;
                // Step number of the connector
                let prevStepNum: number | string = blockNumbersMap[ret.connectorId] !== undefined ? blockNumbersMap[ret.connectorId] : '?';
                if (prevStepNum === '?') {
                  const connectorIdx = flatAll.findIndex((b: any) => b.id === ret.connectorId);
                  for (let ci = connectorIdx - 1; ci >= 0; ci--) {
                    const pb = flatAll[ci];
                    if (blockNumbersMap[pb.id] !== undefined) { prevStepNum = blockNumbersMap[pb.id] + 1; break; }
                  }
                }
                return (
                  <div
                    key={ret.connectorId + ri}
                    title={tooltipText}
                    style={{
                      background: '#6366f1',
                      color: '#fff',
                      borderRadius: '20px',
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'default',
                      boxShadow: '0 1px 4px rgba(99,102,241,0.35)',
                      border: '1.5px solid #4f46e5',
                      userSelect: 'none',
                    }}
                  >
                    <RotateCcw size={11} />
                    Retorno da etapa {prevStepNum}
                    {maxRep ? <span style={{ opacity: 0.8, fontWeight: 500 }}>· Máx. {maxRep}×</span> : null}
                  </div>
                );
              })}
            </div>
          )}

          <div className="block-header">
            <span className="block-type-badge">
              {stepNum ? `Etapa ${stepNum} • ` : ''}
              {block.type === 'connector' ? (block.config?.direction === 'backward' ? 'Retorno' : 'Conexão') : BLOCK_META[block.type]?.badge}
            </span>
            <span style={{ display: 'flex', alignItems: 'center' }}>{BLOCK_META[block.type]?.icon}</span>
            {block.type === 'connector' && block.config?.timing === 'delay' && (
              <span style={{
                marginLeft: 'auto', fontSize: '11px', color: '#475569',
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: '#f1f5f9', padding: '3px 8px', borderRadius: '12px', fontWeight: 600
              }}>
                ⏱️ Após : {block.config.delay?.amount || '1'} {block.config.delay?.unit || 'dia'}
              </span>
            )}
            {block.type !== 'connector' && renderBlockWaitHeader(block)}
            {!isAutoEnd && (
              <button
                className="block-delete"
                onClick={(e) => { e.stopPropagation(); deleteBlock(block.id) }}
                aria-label={`Excluir ${stepNum ? `etapa ${stepNum}` : 'esta etapa'}`}
              >✕</button>
            )}
          </div>
          <div className="block-body" style={{ display: 'flex', flexDirection: 'column' }}>
            {renderBlockBodyText(block)}
            {block.config?.wait?.anchor && block.config.wait.anchor !== 'previous' && (() => {
              const anchorId = block.config.wait.anchor === 'start'
                ? blocks.find((x: any) => x.type === 'trigger')?.id
                : block.config.wait.anchorBlockId;
              const info = getBlockBriefInfo(anchorId);
              if (!info) return null;
              return (
                <div style={{
                  marginTop: '10px', padding: '6px 8px',
                  background: 'var(--builder-bg)', border: '1px solid var(--builder-border-light)',
                  borderRadius: '6px', fontSize: '10px', color: 'var(--builder-muted)',
                  display: 'flex', alignItems: 'center', gap: '4px', alignSelf: 'stretch', lineHeight: 1.2
                }}>
                  <span>⏱️ Referência:</span>
                  <strong style={{ color: 'var(--text-color)' }}>{info.icon} {info.title}</strong>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Check block branching (Sim/Não) */}
        {block.type === 'check' && (
          <div className="branch-container">
            <div className="branch-side branch-yes">
              <div className="branch-label">✓ Sim</div>
              {renderBlockTree(block.config.yes || [], { blockId: block.id, branch: 'yes' })}
            </div>
            <div className="branch-side branch-no">
              <div className="branch-label">✗ Não</div>
              {renderBlockTree(block.config.no || [], { blockId: block.id, branch: 'no' })}
            </div>
          </div>
        )}
      </div>
    );
    }

    // ── Render segments
    const result: React.ReactNode[] = [];

    for (let si = 0; si < segments.length; si++) {
      const seg = segments[si];
      const isFirst = si === 0;

      if (seg.kind === 'single') {
        const { block, idx } = seg;
        const isEnd = block.type === 'end';
        const stepNum = blockNumbersMap[block.id];

        // Add button connector before non-end, non-first block
        if (!isFirst && !isEnd) {
          const capturedIdx = idx;
          result.push(
            <React.Fragment key={`add_${block.id}`}>
              {renderInlineAddBtn(() => {
                if (branchCtx) {
                  setInsertTarget({ blockId: branchCtx.blockId, branch: branchCtx.branch, index: capturedIdx });
                } else {
                  const mainIndex = blocks.findIndex((b: any) => b.id === block.id);
                  setInsertTarget({ index: mainIndex });
                }
                setSelectedId(null);
              })}
            </React.Fragment>
          );
        }

        // Add button before the end block (insert at tail)
        if (isEnd) {
          const prevSeg = si > 0 ? segments[si - 1] : null;
          result.push(
            <React.Fragment key={`add_end_${block.id}`}>
              {renderInlineAddBtn(() => {
                if (branchCtx) {
                  setInsertTarget({ blockId: branchCtx.blockId, branch: branchCtx.branch, index: idx });
                } else {
                  let prevBlock: any = null;
                  if (prevSeg) {
                    prevBlock = prevSeg.kind === 'single'
                      ? prevSeg.block
                      : prevSeg.blocks[prevSeg.blocks.length - 1];
                  }
                  if (prevBlock) {
                    const mainIndex = blocks.findIndex((b: any) => b.id === prevBlock.id);
                    setInsertTarget({ index: mainIndex + 1 });
                  } else {
                    setInsertTarget({ index: 0 });
                  }
                }
                setSelectedId(null);
              }, true)}
            </React.Fragment>
          );
        }

        result.push(buildBlockCard(block, stepNum, isEnd));

      } else {
        // ── Parallel group: render cards side by side
        const { blocks: parallelBlks, startIdx } = seg;

        // Add button connector above the parallel group (if not first)
        if (!isFirst) {
          const capturedIdx = startIdx;
          result.push(
            <React.Fragment key={`add_parallel_${parallelBlks[0].id}`}>
              {renderInlineAddBtn(() => {
                if (branchCtx) {
                  setInsertTarget({ blockId: branchCtx.blockId, branch: branchCtx.branch, index: capturedIdx });
                } else {
                  const mainIndex = blocks.findIndex((b: any) => b.id === parallelBlks[0].id);
                  setInsertTarget({ index: mainIndex });
                }
                setSelectedId(null);
              })}
            </React.Fragment>
          );
        }

        result.push(
          <div key={`parallel_group_${parallelBlks[0].id}`} className="parallel-group">
            {parallelBlks.map((pb: any) => (
              <div key={pb.id} className="parallel-group-col">
                <div className="parallel-col-line" />
                {buildBlockCard(pb, blockNumbersMap[pb.id], false)}
              </div>
            ))}
          </div>
        );
      }
    }

    // Append an add button and an end block to this branch/segment if it doesn't have one
    const lastSeg = segments.length > 0 ? segments[segments.length - 1] : null;
    const hasEnd = lastSeg && lastSeg.kind === 'single' && lastSeg.block.type === 'end';
    const endsWithCheck = lastSeg && lastSeg.kind === 'single' && lastSeg.block.type === 'check';
    
    if (!hasEnd && !endsWithCheck && displayList.length > 0) {
      const endId = `end_auto_${branchCtx ? branchCtx.blockId + '_' + branchCtx.branch : 'main'}`;
      
      result.push(
        <React.Fragment key={`add_final_${endId}`}>
          {renderInlineAddBtn(() => {
            if (branchCtx) {
              setInsertTarget({ blockId: branchCtx.blockId, branch: branchCtx.branch, index: displayList.length });
            } else {
              setInsertTarget({ index: blocks.filter((b: any) => !b.id.startsWith('end_auto')).length });
            }
            setSelectedId(null);
          })}
        </React.Fragment>
      );
      
      result.push(buildBlockCard({ id: endId, type: 'end', config: {} }, undefined, true));
    }

    return result;
  }

  return (
    <div className={`main-inner builder-layout-container step-${step} view-${builderView}`}>
      {/* ── Breadcrumb ── */}
      <div className="breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
        <button className="breadcrumb-back" onClick={() => navigate('/campanhas')} style={{ background: 'none', border: 'none', color: 'var(--caixa-blue)', fontWeight: 600, cursor: 'pointer', padding: 0 }}>← Voltar</button>
        <span className="breadcrumb-sep" style={{ color: '#cbd5e1' }}>|</span>
        <span className="breadcrumb-item">Home</span>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-item">Campanhas</span>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-item current" style={{ fontWeight: 600 }}>Criar Campanha</span>
      </div>

      {/* ── Stepper Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ borderLeft: '4px solid var(--caixa-orange)', paddingLeft: 14, fontSize: 28, fontWeight: 800, color: 'var(--caixa-blue)', lineHeight: 1.1, margin: '8px 0 6px 0' }}>
            {campaignName || 'Campanha com jornada'}
          </h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>Configure quando e como as mensagens serão enviadas ao cliente.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {step === 2 && builderView === 'canvas' && (
            <>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>← Dados Gerais</button>
              <button
                className="btn btn-primary"
                onClick={goToStep3}
              >
                Revisar Jornada <ChevronRight size={15} style={{ marginLeft: 6 }} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Stepper Navigation pills ── */}
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
          Dados da campanha
        </div>
        <div
          onClick={() => { if (campaignName && selectedPublicos.length > 0 && selectedSegmentos.length > 0) { setStep(2); } }}
          style={{
            padding: '10px 20px', fontSize: 14, fontWeight: step === 2 ? 700 : 500,
            color: step === 2 ? 'var(--caixa-blue)' : 'var(--text-muted)',
            borderBottom: step === 2 ? '2.5px solid var(--caixa-blue)' : '2.5px solid transparent',
            cursor: campaignName && selectedPublicos.length > 0 && selectedSegmentos.length > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 8,
            opacity: campaignName && selectedPublicos.length > 0 && selectedSegmentos.length > 0 ? 1 : 0.6
          }}
        >
          <span style={{
            background: step === 2 ? 'var(--caixa-blue)' : '#e2e8f0',
            color: step === 2 ? 'white' : 'var(--text-muted)',
            borderRadius: '50%', width: 20, height: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700
          }}>2</span>
          Fluxo de comunicação
        </div>
        <div
          onClick={() => { if (campaignName && selectedPublicos.length > 0 && selectedSegmentos.length > 0) { goToStep3(); } }}
          style={{
            padding: '10px 20px', fontSize: 14, fontWeight: step === 3 ? 700 : 500,
            color: step === 3 ? 'var(--caixa-blue)' : 'var(--text-muted)',
            borderBottom: step === 3 ? '2.5px solid var(--caixa-blue)' : '2.5px solid transparent',
            cursor: campaignName && selectedPublicos.length > 0 && selectedSegmentos.length > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 8,
            opacity: campaignName && selectedPublicos.length > 0 && selectedSegmentos.length > 0 ? 1 : 0.6
          }}
        >
          <span style={{
            background: step === 3 ? 'var(--caixa-blue)' : '#e2e8f0',
            color: step === 3 ? 'white' : 'var(--text-muted)',
            borderRadius: '50%', width: 20, height: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700
          }}>3</span>
          Revisar fluxo
        </div>
      </div>

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
                    {/* Tags below */}
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

                  {/* Nicho */}
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Nicho</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select
                        className="form-select"
                        value={tempSegmentoId}
                        disabled={selectedPublicos.length === 0}
                        onChange={(e) => setTempSegmentoId(e.target.value)}
                        style={{ flex: 1 }}
                      >
                        <option value="">Selecione o nicho</option>
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
                      Defina o nicho desta campanha
                    </div>
                    {/* Tags below */}
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
              </div>
            </div>

            {/* Secção 03: Compliance e Exclusões */}
            <div className="setup-section">
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--caixa-blue)', borderLeft: '4px solid var(--caixa-blue)', paddingLeft: 14, marginBottom: 16 }}>
                Exclusões obrigatórias
              </h3>
              <div className="setup-card" style={{ background: 'transparent', border: 'none', padding: 0, boxShadow: 'none' }}>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '-8px 0 16px 0' }}>
                  Listas de exclusão aplicadas automaticamente a todas as campanhas
                </p>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 10px', marginBottom: 16 }}>
                  {MANDATORY_EXCLUSIONS.map((item, idx) => (
                    <div key={idx} style={{
                      background: 'white',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}>
                      <Lock size={13} style={{ color: '#d97706', strokeWidth: 2.2, flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>{item}</span>
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
                        'PPE - Pessoa Politicamente Exposta',
                        'Cadastro Desatualizado',
                        'Lei de Crédito Aposentado',
                        'Restrição Absoluta (Base SIRIC)',
                        'SIPES - Restrições SERASA/Boa Vista',
                        'CONRES',
                        'SIGA - Atraso > 30 dias',
                        'Renegociação - SIICO 190 ou 191',
                        'Fique em Dia/Quita Fácil',
                        'Benefício INSS < 180 dias',
                        'Excluir Consig - Atraso > 30 dias e extrato da convenente com erro ou não paga'
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

                  {/* Render selected exclusions as tags/badges */}
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
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center'
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
        
        {/* Footer buttons at the bottom of the page */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32, borderTop: '1px solid var(--builder-border-light)', paddingTop: 20, marginBottom: 40 }}>
          <button 
            className="btn" 
            style={{ background: 'white', border: '1px solid #cbd5e1', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, fontSize: 14, cursor: 'not-allowed' }}
            disabled
          >
            ← Anterior
          </button>
          <button 
            className="btn" 
            style={{ background: 'white', border: '1.5px solid var(--caixa-blue)', color: 'var(--caixa-blue)', fontWeight: 700, fontSize: 14 }}
            onClick={() => alert('Rascunho salvo com sucesso!')}
          >
            Salvar rascunho
          </button>
          <button
            className="btn"
            disabled={!campaignName || selectedPublicos.length === 0 || selectedSegmentos.length === 0}
            onClick={() => { setStep(2); }}
            style={{ 
              background: (!campaignName || selectedPublicos.length === 0 || selectedSegmentos.length === 0) ? '#cbd5e1' : 'var(--caixa-blue)', 
              color: 'white', 
              border: 'none', 
              fontWeight: 700, 
              fontSize: 14,
              cursor: (!campaignName || selectedPublicos.length === 0 || selectedSegmentos.length === 0) ? 'not-allowed' : 'pointer'
            }}
          >
            Próximo
          </button>
        </div>
      </>)}

      {/* ── STEP 2: JOURNEY BUILDER ── */}
      {step === 2 && builderView === 'select' && (
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '20px 0 60px', width: '100%' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--caixa-blue)', marginBottom: 6 }}>
              Como deseja montar o fluxo da campanha?
            </h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>
              Escolha a melhor forma de criar o fluxo de comunicação para seus clientes
            </p>
          </div>

          {/* Criar do zero */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#ffffff', border: '1px solid var(--builder-border)',
            borderRadius: 10, padding: '20px 28px', marginBottom: 32,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
          }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                Criar fluxo do zero
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Monte sua campanha personalizada etapa por etapa
              </div>
            </div>
            <button
              className="btn"
              style={{
                background: 'var(--caixa-orange)', color: '#ffffff',
                border: 'none', fontWeight: 700, fontSize: 14,
                padding: '10px 24px', borderRadius: 6, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                whiteSpace: 'nowrap'
              }}
              onClick={() => {
                setBlocks([])
                setSelectedId(null)
                setInsertTarget(null)
                setBuilderView('canvas')
                setTimeout(resetPanToCenter, 30)
              }}
            >
              Criar fluxo <ChevronRight size={15} />
            </button>
          </div>

          {/* Modelos prontos */}
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Modelos prontos</span>
            <span
              style={{
                fontSize: 13, color: 'var(--caixa-blue)', marginLeft: 12,
                cursor: 'pointer', textDecoration: 'underline', fontWeight: 500
              }}
              title="Veja como cada modelo funciona"
            >
              Aprenda com exemplos prontos
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
            {/* Template: Fluxo simples */}
            <div style={{
              background: '#ffffff', border: '1px solid var(--builder-border)',
              borderRadius: 10, padding: '24px 20px', display: 'flex', flexDirection: 'column',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)', minHeight: 320
            }}>
              {/* Mini flow diagram */}
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 6, marginBottom: 20,
                background: '#f8fafc', borderRadius: 8, padding: '20px 10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#216E62', background: '#E4F7F4', padding: '4px 12px', borderRadius: 20 }}>
                  <Zap size={10} /> Evento
                </div>
                <div style={{ width: 1, height: 16, background: '#cbd5e1' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#4F213F', background: '#F8EAF3', padding: '4px 12px', borderRadius: 20 }}>
                  <Send size={10} /> Peça
                </div>
                <div style={{ width: 1, height: 16, background: '#cbd5e1' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#718096', background: '#f1f2f5', padding: '4px 12px', borderRadius: 20 }}>
                  <Flag size={10} /> Encerrar
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 4 }}>Fluxo simples</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.4 }}>
                Uma comunicação única.
              </div>
              <button
                style={{
                  background: 'none', border: 'none', color: 'var(--caixa-blue)',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', gap: 4, marginTop: 'auto'
                }}
                onClick={() => loadTemplate('simples')}
              >
                Usar modelo <ChevronRight size={14} />
              </button>
            </div>

            {/* Template: Fluxo com decisão */}
            <div style={{
              background: '#ffffff', border: '1px solid var(--builder-border)',
              borderRadius: 10, padding: '24px 20px', display: 'flex', flexDirection: 'column',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)', minHeight: 320
            }}>
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 6, marginBottom: 20,
                background: '#f8fafc', borderRadius: 8, padding: '20px 10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#216E62', background: '#E4F7F4', padding: '4px 12px', borderRadius: 20 }}>
                  <Zap size={10} /> Evento
                </div>
                <div style={{ width: 1, height: 12, background: '#cbd5e1' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#A65E00', background: '#FFF8F0', padding: '4px 12px', borderRadius: 20 }}>
                  <GitBranch size={10} /> Condição
                </div>
                <div style={{ display: 'flex', gap: 24, marginTop: 6 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 1, height: 12, background: '#cbd5e1' }} />
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#4F213F', background: '#F8EAF3', padding: '4px 12px', borderRadius: 20 }}>
                      Peça
                    </div>
                    <div style={{ width: 1, height: 12, background: '#cbd5e1' }} />
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#718096', background: '#f1f2f5', padding: '4px 10px', borderRadius: 20 }}>
                      Encerrar
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 1, height: 12, background: '#cbd5e1' }} />
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#4F213F', background: '#F8EAF3', padding: '4px 12px', borderRadius: 20 }}>
                      Peça
                    </div>
                    <div style={{ width: 1, height: 12, background: '#cbd5e1' }} />
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#718096', background: '#f1f2f5', padding: '4px 10px', borderRadius: 20 }}>
                      Encerrar
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 4 }}>Fluxo com decisão</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.4 }}>
                Envia mensagens diferentes conforme uma condição.
              </div>
              <button
                style={{
                  background: 'none', border: 'none', color: 'var(--caixa-blue)',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', gap: 4, marginTop: 'auto'
                }}
                onClick={() => loadTemplate('decisao')}
              >
                Usar modelo <ChevronRight size={14} />
              </button>
            </div>

            {/* Template: Fluxo com retorno */}
            <div style={{
              background: '#ffffff', border: '1px solid var(--builder-border)',
              borderRadius: 10, padding: '24px 20px', display: 'flex', flexDirection: 'column',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)', minHeight: 320
            }}>
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 6, marginBottom: 20,
                background: '#f8fafc', borderRadius: 8, padding: '20px 10px', position: 'relative'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#216E62', background: '#E4F7F4', padding: '4px 12px', borderRadius: 20 }}>
                  <Zap size={10} /> Evento
                </div>
                <div style={{ width: 1, height: 12, background: '#cbd5e1' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#A65E00', background: '#FFF8F0', padding: '4px 12px', borderRadius: 20, position: 'relative' }}>
                  <GitBranch size={10} /> Condição
                </div>
                <div style={{ display: 'flex', gap: 24, marginTop: 6 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 1, height: 12, background: '#cbd5e1' }} />
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#4F213F', background: '#F8EAF3', padding: '4px 12px', borderRadius: 20 }}>
                      Peça
                    </div>
                    <div style={{ width: 1, height: 12, background: '#cbd5e1' }} />
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#718096', background: '#f1f2f5', padding: '4px 10px', borderRadius: 20 }}>
                      Encerrar
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 1, height: 12, background: '#cbd5e1' }} />
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#4F213F', background: '#F8EAF3', padding: '4px 12px', borderRadius: 20 }}>
                      Peça
                    </div>
                    <div style={{ width: 1, height: 12, background: '#cbd5e1' }} />
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
                      color: '#6366f1', background: '#E0E7FF', padding: '4px 10px', borderRadius: 20
                    }}>
                      <RotateCcw size={9} /> Retorno
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 4 }}>Fluxo com retorno</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.4 }}>
                Permite retornar para uma etapa quando necessário.
              </div>
              <button
                style={{
                  background: 'none', border: 'none', color: 'var(--caixa-blue)',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', gap: 4, marginTop: 'auto'
                }}
                onClick={() => loadTemplate('retorno')}
              >
                Usar modelo <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Footer buttons */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 40,
            borderTop: '1px solid var(--builder-border-light)', paddingTop: 20, marginBottom: 40
          }}>
            <button
              className="btn btn-ghost"
              onClick={() => setStep(1)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              ← Anterior
            </button>
            <button
              className="btn"
              style={{
                background: 'white', border: '1.5px solid var(--caixa-blue)',
                color: 'var(--caixa-blue)', fontWeight: 700, fontSize: 14
              }}
              onClick={() => alert('Rascunho salvo com sucesso!')}
            >
              Salvar rascunho
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setBlocks([])
                setBuilderView('canvas')
              }}
            >
              Próximo
            </button>
          </div>
        </div>
      )}

      {step === 2 && builderView === 'canvas' && (
        <div className="builder-layout">
          {/* Main Canvas Viewport — full width, no left sidebar */}
          <main className="canvas-area">
            <div className="canvas-toolbar">
              <div className="canvas-toolbar-left">
                <button
                  className="canvas-btn"
                  onClick={() => setZoom(Math.min(zoom + 0.1, 1.8))}
                  aria-label="Aumentar zoom do fluxo"
                >+</button>
                <span className="zoom-label" aria-live="polite" aria-label={`Nível de zoom: ${Math.round(zoom * 100)}%`}>
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  className="canvas-btn"
                  onClick={() => setZoom(Math.max(zoom - 0.1, 0.5))}
                  aria-label="Diminuir zoom do fluxo"
                >−</button>
                <button
                  className="canvas-btn"
                  onClick={() => setZoom(1)}
                  title="Restaurar zoom"
                  aria-label="Restaurar zoom para 100%"
                >
                  <RotateCcw size={13} aria-hidden="true" />
                </button>
                <div className="toolbar-divider" />
                <span className="canvas-stat-pill"><strong>{stats.total}</strong> passos</span>
                <span className="canvas-stat-pill"><strong>{stats.paths}</strong> ramif.</span>
                <span className="canvas-stat-pill"><strong>{stats.duration}d</strong> duração</span>
              </div>
              <div className="canvas-toolbar-right">
                {/* Template dropdown */}
                <div className="template-dropdown-wrapper">
                  <button
                    className="canvas-btn-text"
                    onClick={() => setTemplateDropdownOpen(o => !o)}
                  >
                    📋 Templates ▾
                  </button>
                  {templateDropdownOpen && (
                    <div className="template-dropdown">
                      <div className="template-dropdown-title">Carregar modelo de jornada</div>
                      {[
                        { key: 'simples', icon: '📨', name: 'Fluxo simples', desc: 'Uma comunicação única e direta' },
                        { key: 'decisao', icon: '🔀', name: 'Fluxo com decisão', desc: 'Caminhos diferentes conforme uma condição' },
                        { key: 'retorno', icon: '🔄', name: 'Fluxo com retorno', desc: 'Permite retornar para uma etapa anterior' },
                      ].map(tpl => (
                        <button
                          key={tpl.key}
                          className="template-dropdown-item"
                          onClick={() => { loadTemplate(tpl.key as any); setTemplateDropdownOpen(false) }}
                        >
                          <span className="tpl-d-icon">{tpl.icon}</span>
                          <div>
                            <div className="tpl-d-name">{tpl.name}</div>
                            <div className="tpl-d-desc">{tpl.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="toolbar-divider" />
                <button className="canvas-btn-text" onClick={() => { setBlocks([]); setSelectedId(null); setInsertTarget(null); setBuilderView('select'); setTimeout(resetPanToCenter, 30) }}>Limpar</button>
              </div>
            </div>

            <div
              className="canvas-viewport"
              ref={viewportRef}
              onPointerDown={handleViewportPointerDown}
              onPointerMove={handleViewportPointerMove}
              onPointerUp={handleViewportPointerUp}
              onPointerCancel={handleViewportPointerUp}
              style={{ cursor: isPanningState ? 'grabbing' : 'grab' }}
            >
              <div
                className="canvas-grid"
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                  transformOrigin: 'top left'
                }}
              >
                {/* BackwardConnectionsOverlay removed — returns are shown as badges on target cards */}
                {blocks.length === 0 ? (
                  <div className="canvas-start-hint" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#ffffff',
                    border: '1px solid var(--builder-border)',
                    borderRadius: 12,
                    padding: '32px 24px',
                    width: 360,
                    margin: '120px auto',
                    textAlign: 'center',
                    boxShadow: 'var(--shadow-lg)'
                  }}>
                    <div style={{
                      background: '#E4F7F4',
                      color: '#216E62',
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 16
                    }}>
                      <Zap size={24} color="#216E62" fill="#216E62" />
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--caixa-blue)', marginBottom: 8 }}>
                      Comece com um evento
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--builder-muted)', marginBottom: 20, lineHeight: 1.4 }}>
                      Defina o evento que dará início ao fluxo de comunicação com seus clientes
                    </div>
                    <button
                      className="btn"
                      style={{ background: 'var(--caixa-blue)', color: '#ffffff', padding: '8px 24px', borderRadius: 6, fontWeight: 700, border: 'none', cursor: 'pointer' }}
                      onClick={() => {
                        const id = 'b' + Date.now();
                        const t = createBlockObj(id, 'trigger');
                        setBlocks(ensureEndBlock([t]));
                        setSelectedId(id);
                      }}
                    >
                      Iniciar fluxo
                    </button>
                  </div>
                ) : (
                  renderBlockTree(getSequentialTimelineFor(blocks[0].id, blocks))
                )}
              </div>
            </div>
          </main>

          {/* Step Picker Modal */}
          {insertTarget && (
            <div
              className="modal-overlay"
              style={{ animation: 'fadeIn 0.2s ease' }}
              onClick={() => { setInsertTarget(null); setConnectorConfigOpen(false) }}
            >
              <div
                className="modal-container"
                style={{ maxWidth: 450 }}
                role="dialog"
                aria-modal="true"
                aria-labelledby={connectorConfigOpen ? 'modal-conectar-etapa-title' : 'modal-proximos-passos-title'}
                onClick={e => e.stopPropagation()}
              >
                {!connectorConfigOpen ? (
                  <React.Fragment>
                    <div className="modal-header">
                      <div id="modal-proximos-passos-title" className="modal-title">Próximos passos</div>
                      <button className="modal-close" onClick={() => { setInsertTarget(null); setConnectorConfigOpen(false) }} aria-label="Fechar janela de próximos passos">✕</button>
                    </div>
                    <div className="modal-body" style={{ padding: 24 }}>
                      <div style={{ fontSize: 13, color: 'var(--builder-muted)', marginBottom: 16 }}>
                        Selecione o tipo de etapa a ser adicionado à sua jornada
                      </div>
                      <div className="step-picker-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                          {
                            type: 'send' as const,
                            icon: (
                              <div style={{
                                background: '#F8EAF3',
                                border: '1px solid #e9d5e3',
                                width: 38,
                                height: 38,
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 6px rgba(79, 33, 63, 0.08)',
                                flexShrink: 0
                              }}>
                                <Send size={18} color="#4F213F" />
                              </div>
                            ),
                            label: 'Enviar peça de comunicação',
                            desc: 'Dispare mensagens via SMS, Push, WhatsApp, E-mail ou App CAIXA',
                            channels: ['SMS', 'Push', 'WhatsApp', 'E-mail', 'App CAIXA']
                          },
                          {
                            type: 'check' as const,
                            icon: (
                              <div style={{
                                background: '#FFF8F0',
                                border: '1px solid #fed7aa',
                                width: 38,
                                height: 38,
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 6px rgba(166, 94, 0, 0.08)',
                                flexShrink: 0
                              }}>
                                <GitBranch size={18} color="#A65E00" />
                              </div>
                            ),
                            label: 'Verificar',
                            desc: 'Crie caminhos de "sim" e "não" na jornada'
                          },
                          {
                            type: 'connector' as const,
                            icon: (
                              <div style={{
                                background: '#EEF2FF',
                                border: '1px solid #c7d2fe',
                                width: 38,
                                height: 38,
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 6px rgba(99, 102, 241, 0.08)',
                                flexShrink: 0
                              }}>
                                <Link2 size={18} color="#4f46e5" />
                              </div>
                            ),
                            label: 'Conectar a uma etapa existente',
                            desc: 'Siga para uma etapa existente ou crie um retorno'
                          }
                        ].map(item => (
                          <button
                            key={item.type}
                            className="step-picker-item"
                            onClick={() => {
                              if (item.type === 'connector') {
                                setConnectorConfigOpen(true)
                                setConnectorTargetId(null)
                                setConnectorTiming('immediate')
                                setConnectorDelay({ amount: '1', unit: 'dia' })
                                setConnectorMaxRepetitions('')
                                setConnectorUnlimited(false)
                              } else {
                                insertBlockAt(item.type)
                              }
                            }}
                          >
                            <span className="step-picker-icon">{item.icon}</span>
                            <div className="step-picker-info">
                              <div className="step-picker-name">{item.label}</div>
                              <div className="step-picker-desc">{item.desc}</div>
                              {'channels' in item && item.channels && (
                                <div className="step-picker-channels">
                                  {item.channels.map(ch => (
                                    <span key={ch} className="step-channel-tag">{ch}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <ChevronRight size={18} className="step-picker-arrow" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </React.Fragment>
                ) : (() => {
                  const availableSteps: { id: string; stepNum: number; label: string; type: string }[] = []
                  const collectSteps = (clist: any[]) => {
                    clist.forEach(b => {
                      if (b.type === 'end' || b.type === 'connector' || b.id === 'end_auto') return
                      const num = blockNumbersMap[b.id]
                      if (num) {
                        let lbl = ''
                        if (b.type === 'trigger') lbl = (b.config?.events || [])[0] || 'Início da campanha'
                        else if (b.type === 'send') lbl = b.config?.piece?.name || 'Enviar peça'
                        else if (b.type === 'check') lbl = b.config?.question || 'Verificação'
                        availableSteps.push({ id: b.id, stepNum: num, label: lbl, type: b.type })
                      }
                      if (b.type === 'check') {
                        collectSteps(b.config?.yes || [])
                        collectSteps(b.config?.no || [])
                      }
                    })
                  }
                  collectSteps(blocks)
                  availableSteps.sort((a, b) => a.stepNum - b.stepNum)

                  let insertPointStepNum = 0
                  if (insertTarget && 'index' in insertTarget && !('blockId' in insertTarget)) {
                    const rootNonEnd = blocks.filter(b => b.id !== 'end_auto')
                    const beforeIdx = Math.min(insertTarget.index, rootNonEnd.length) - 1
                    if (beforeIdx >= 0 && rootNonEnd[beforeIdx]) {
                      insertPointStepNum = blockNumbersMap[rootNonEnd[beforeIdx].id] || 0
                    }
                  } else if (insertTarget && 'blockId' in insertTarget) {
                    insertPointStepNum = blockNumbersMap[(insertTarget as any).blockId] || 0
                  }

                  const selTarget = availableSteps.find(s => s.id === connectorTargetId)
                  const cDirection: 'forward' | 'backward' | null = selTarget
                    ? (selTarget.stepNum <= insertPointStepNum ? 'backward' : 'forward')
                    : null

                  const handleConfirmConnector = () => {
                    if (!connectorTargetId || !cDirection) return
                    if (cDirection === 'backward' && !connectorUnlimited && (!connectorMaxRepetitions || parseInt(connectorMaxRepetitions) < 1)) {
                      alert('Por favor, defina quantas vezes o retorno poderá acontecer ou marque Ilimitado.')
                      return
                    }
                    const cid = 'b' + Date.now() + Math.floor(Math.random() * 1000)
                    const newBlock = createBlockObj(cid, 'connector')
                    newBlock.config.targetBlockId = connectorTargetId
                    newBlock.config.direction = cDirection
                    newBlock.config.timing = connectorTiming
                    if (connectorTiming === 'delay') {
                      newBlock.config.delay = { ...connectorDelay }
                    }
                    if (cDirection === 'backward') {
                      newBlock.config.maxRepetitions = connectorUnlimited ? -1 : (parseInt(connectorMaxRepetitions) || 1)
                    }

                    if ('index' in insertTarget && !('blockId' in insertTarget)) {
                      const withoutEnd = blocks.filter(b => b.id !== 'end_auto')
                      withoutEnd.splice(insertTarget.index, 0, newBlock)
                      setBlocks(ensureEndBlock(withoutEnd))
                    } else if ('blockId' in insertTarget) {
                      const tgt = insertTarget as { blockId: string; branch: 'yes' | 'no'; index: number }
                      const updated = [...blocks]
                      findAndModifyBlock(updated, tgt.blockId, (parent: any) => {
                        const br = tgt.branch
                        if (!parent.config[br]) parent.config[br] = []
                        parent.config[br].splice(tgt.index, 0, newBlock)
                      })
                      setBlocks(updated)
                    }

                    setInsertTarget(null)
                    setConnectorConfigOpen(false)
                    setConnectorTargetId(null)
                  }

                  return (
                    <React.Fragment>
                      <div className="modal-header">
                        <div id="modal-conectar-etapa-title" className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ background: '#E0E7FF', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Link2 size={15} color="#6366f1" />
                          </div>
                          Conectar a uma etapa existente
                        </div>
                        <button className="modal-close" onClick={() => { setInsertTarget(null); setConnectorConfigOpen(false) }} aria-label="Fechar janela de conexão de etapa">✕</button>
                      </div>
                      <div className="modal-body" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {availableSteps.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--builder-muted)', fontSize: 14 }}>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                            <div>Você ainda não criou nenhuma etapa</div>
                            <div style={{ fontSize: 12, marginTop: 4 }}>Adicione etapas ao fluxo antes de conectá-las.</div>
                          </div>
                        ) : (
                          <React.Fragment>
                            <div>
                              <label style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', marginBottom: 6, display: 'block' }}>
                                Etapa de destino
                              </label>
                              <select
                                value={connectorTargetId || ''}
                                onChange={(e) => setConnectorTargetId(e.target.value || null)}
                                style={{
                                  width: '100%', padding: '10px 12px', borderRadius: 8,
                                  border: '1.5px solid #d1d5db', fontSize: 14,
                                  background: '#fff', cursor: 'pointer', outline: 'none'
                                }}
                              >
                                <option value="">Selecione uma etapa</option>
                                {availableSteps.map(s => (
                                  <option key={s.id} value={s.id}>
                                    {s.stepNum}. {s.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {cDirection === 'backward' && (
                              <div style={{
                                background: '#eff6ff', border: '1px solid #bfdbfe',
                                borderRadius: 8, padding: '10px 14px',
                                display: 'flex', alignItems: 'flex-start', gap: 8,
                                fontSize: 13, color: '#1e40af'
                              }}>
                                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>ℹ️</span>
                                <span>Essa conexão cria um retorno na jornada. Defina quantas vezes esse retorno poderá acontecer.</span>
                              </div>
                            )}

                            {cDirection && (
                              <React.Fragment>
                                <div>
                                  <label style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', marginBottom: 8, display: 'block' }}>
                                    {cDirection === 'backward' ? 'Quando retornar para esta etapa?' : 'Quando seguir para esta etapa?'}
                                  </label>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                                      <input
                                        type="radio" name="connectorTiming"
                                        checked={connectorTiming === 'immediate'}
                                        onChange={() => setConnectorTiming('immediate')}
                                      />
                                      Imediatamente
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                                      <input
                                        type="radio" name="connectorTiming"
                                        checked={connectorTiming === 'delay'}
                                        onChange={() => setConnectorTiming('delay')}
                                      />
                                      Após um período
                                    </label>
                                  </div>
                                  {connectorTiming === 'delay' && (
                                    <div style={{ display: 'flex', gap: 8, marginTop: 10, paddingLeft: 24 }}>
                                      <input
                                        type="number" min="1" max="365"
                                        value={connectorDelay.amount}
                                        onChange={(e) => setConnectorDelay(prev => ({ ...prev, amount: e.target.value }))}
                                        style={{
                                          width: 60, padding: '6px 8px', borderRadius: 6,
                                          border: '1.5px solid #d1d5db', fontSize: 14, textAlign: 'center' as const
                                        }}
                                      />
                                      <select
                                        value={connectorDelay.unit}
                                        onChange={(e) => setConnectorDelay(prev => ({ ...prev, unit: e.target.value }))}
                                        style={{
                                          padding: '6px 10px', borderRadius: 6,
                                          border: '1.5px solid #d1d5db', fontSize: 14
                                        }}
                                      >
                                        <option value="minuto">minuto(s)</option>
                                        <option value="hora">hora(s)</option>
                                        <option value="dia">dia(s)</option>
                                        <option value="semana">semana(s)</option>
                                      </select>
                                    </div>
                                  )}
                                </div>

                                {cDirection === 'backward' && (
                                  <div>
                                    <label style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', marginBottom: 6, display: 'block' }}>
                                      Quantas vezes vai se repetir?
                                    </label>
                                    <input
                                      type="number" min="1" max="10"
                                      placeholder="Ex: 3"
                                      value={connectorMaxRepetitions}
                                      disabled={connectorUnlimited}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value)
                                        if (e.target.value === '') {
                                          setConnectorMaxRepetitions('')
                                        } else if (!isNaN(val) && val >= 1 && val <= 10) {
                                          setConnectorMaxRepetitions(String(val))
                                        }
                                      }}
                                      style={{
                                        width: '100%', padding: '10px 12px', borderRadius: 8,
                                        border: '1.5px solid #d1d5db', fontSize: 14,
                                        opacity: connectorUnlimited ? 0.5 : 1,
                                        background: connectorUnlimited ? '#f1f5f9' : '#fff'
                                      }}
                                    />
                                    
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer' }}>
                                      <div style={{
                                        position: 'relative', width: 36, height: 20, borderRadius: 20,
                                        background: connectorUnlimited ? '#6366f1' : '#cbd5e1',
                                        transition: 'background 0.2s', display: 'flex', alignItems: 'center', padding: 2
                                      }}>
                                        <input
                                          type="checkbox"
                                          checked={connectorUnlimited}
                                          onChange={(e) => {
                                            setConnectorUnlimited(e.target.checked);
                                            if (e.target.checked) setConnectorMaxRepetitions('');
                                          }}
                                          style={{ opacity: 0, position: 'absolute', width: '100%', height: '100%', cursor: 'pointer', margin: 0 }}
                                        />
                                        <div style={{
                                          width: 16, height: 16, borderRadius: '50%', background: '#fff',
                                          transform: connectorUnlimited ? 'translateX(16px)' : 'translateX(0)',
                                          transition: 'transform 0.2s'
                                        }} />
                                      </div>
                                      <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>Ilimitado</span>
                                    </label>
                                  </div>
                                )}
                              </React.Fragment>
                            )}
                          </React.Fragment>
                        )}

                        {availableSteps.length > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                            <button
                              className="btn"
                              style={{
                                padding: '8px 20px', borderRadius: 6, fontWeight: 600,
                                border: '1.5px solid #1351b4', background: '#fff', color: '#1351b4',
                                cursor: 'pointer', fontSize: 14
                              }}
                              onClick={() => { setConnectorConfigOpen(false); setConnectorTargetId(null) }}
                            >
                              Cancelar
                            </button>
                            <button
                              className="btn"
                              disabled={!connectorTargetId || !cDirection || (cDirection === 'backward' && !connectorUnlimited && (!connectorMaxRepetitions || parseInt(connectorMaxRepetitions) < 1))}
                              style={{
                                padding: '8px 20px', borderRadius: 6, fontWeight: 600,
                                border: 'none', cursor: connectorTargetId && cDirection ? 'pointer' : 'not-allowed',
                                fontSize: 14,
                                background: connectorTargetId && cDirection ? '#1351b4' : '#94a3b8',
                                color: '#fff', opacity: connectorTargetId && cDirection ? 1 : 0.7
                              }}
                              onClick={handleConfirmConnector}
                            >
                              Confirmar
                            </button>
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Block Configuration Modals */}
          {selectedId && selectedBlock && (
            <div
              className="modal-overlay"
              style={{ animation: 'fadeIn 0.2s ease' }}
              onClick={handleCancelEdit}
            >
              <div
                className="modal-container"
                style={{ maxWidth: selectedBlock.type === 'send' ? 550 : 500 }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-configurar-etapa-title"
                onClick={e => e.stopPropagation()}
              >
                <div className="modal-header">
                  <div id="modal-configurar-etapa-title" className="modal-title">
                    {selectedBlock.type === 'trigger' && 'Configurar evento'}
                    {selectedBlock.type === 'send' && 'Configurar peça'}
                    {selectedBlock.type === 'check' && 'Configurar verificação'}
                    {selectedBlock.type === 'end' && 'Configurar encerramento'}
                  </div>
                  <button className="modal-close" onClick={handleCancelEdit} aria-label="Fechar configuração de etapa">✕</button>
                </div>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  
                  {/* TRIGGER BLOCK CONFIG */}
                  {selectedBlock.type === 'trigger' && (() => {
                    const conditions = selectedBlock.config.conditions || (selectedBlock.config.extra ? [selectedBlock.config.extra] : [])

                    const handleOperatorChange = (newOp: 'E' | 'OU') => {
                      updateBlockConfig(selectedBlock.id, {
                        operator: newOp,
                        extra: conditions.filter(Boolean).join(` ${newOp} `)
                      })
                    }

                    const handleUpdateCondition = (idx: number, newVal: string) => {
                      const updated = [...conditions]
                      updated[idx] = newVal
                      updateBlockConfig(selectedBlock.id, {
                        conditions: updated,
                        extra: updated.filter(Boolean).join(` ${selectedBlock.config.operator || 'E'} `)
                      })
                    }

                    const handleDeleteCondition = (idx: number) => {
                      const updated = conditions.filter((_, i) => i !== idx)
                      updateBlockConfig(selectedBlock.id, {
                        conditions: updated,
                        extra: updated.filter(Boolean).join(` ${selectedBlock.config.operator || 'E'} `)
                      })
                    }

                    const handleAddCondition = () => {
                      const updated = [...conditions, '']
                      updateBlockConfig(selectedBlock.id, {
                        conditions: updated,
                        extra: updated.filter(Boolean).join(` ${selectedBlock.config.operator || 'E'} `)
                      })
                    }

                    return (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--builder-border-light)', paddingBottom: 12 }}>
                          <div style={{ background: '#E4F7F4', color: '#216E62', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Zap size={18} color="#216E62" fill="#216E62" />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--caixa-blue)' }}>Evento</div>
                            <div style={{ fontSize: 12, color: 'var(--builder-muted)' }}>A campanha começa quando:</div>
                          </div>
                        </div>

                        <div className="detail-field">
                          {(() => {
                            const currentEvent = selectedBlock.config.events?.[0] || '';
                            const filteredCats = TRIGGER_CATEGORIES.map(cat => {
                              const matchedItems = cat.items.filter(item =>
                                item.toLowerCase().includes(triggerSearchQuery.toLowerCase())
                              );
                              return { ...cat, items: matchedItems };
                            }).filter(cat => cat.items.length > 0);

                            const flatItems: string[] = [];
                            const matchedRecents = recentTriggers.filter(item => 
                              item.toLowerCase().includes(triggerSearchQuery.toLowerCase()) && 
                              !flatItems.includes(item)
                            );
                            flatItems.push(...matchedRecents);
                            filteredCats.forEach(cat => {
                              cat.items.forEach(item => {
                                if (!flatItems.includes(item)) {
                                  flatItems.push(item);
                                }
                              });
                            });

                            const exactMatchExists = flatItems.some(i => i.toLowerCase() === triggerSearchQuery.trim().toLowerCase());
                            const canCreateCustom = triggerSearchQuery.trim().length > 0 && !exactMatchExists;

                            const handleSelectTrigger = (val: string) => {
                              updateBlockConfig(selectedBlock.id, 'events', [val]);
                              setIsTriggerDropdownOpen(false);
                              setTriggerSearchQuery('');
                              setRecentTriggers(prev => {
                                const updated = [val, ...prev.filter(x => x !== val)];
                                return updated.slice(0, 5);
                              });
                            };

                            const handleKeyDown = (e: React.KeyboardEvent) => {
                              const totalOptions = flatItems.length + (canCreateCustom ? 1 : 0);
                              if (totalOptions === 0) return;
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setTriggerActiveIndex(prev => (prev + 1) % totalOptions);
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setTriggerActiveIndex(prev => (prev - 1 + totalOptions) % totalOptions);
                              } else if (e.key === 'Enter') {
                                e.preventDefault();
                                if (canCreateCustom && triggerActiveIndex === flatItems.length) {
                                  handleSelectTrigger(triggerSearchQuery.trim());
                                } else if (flatItems[triggerActiveIndex]) {
                                  handleSelectTrigger(flatItems[triggerActiveIndex]);
                                }
                              } else if (e.key === 'Escape') {
                                setIsTriggerDropdownOpen(false);
                              }
                            };

                            return (
                              <div className="autocomplete-container" style={{ position: 'relative' }}>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                  <input
                                    type="text"
                                    className="detail-input"
                                    placeholder="Busque um evento ou crie um"
                                    value={isTriggerDropdownOpen ? triggerSearchQuery : currentEvent}
                                    onFocus={() => {
                                      setIsTriggerDropdownOpen(true);
                                      setTriggerSearchQuery('');
                                      setTriggerActiveIndex(0);
                                    }}
                                    onChange={(e) => {
                                      setTriggerSearchQuery(e.target.value);
                                      setTriggerActiveIndex(0);
                                      if (!isTriggerDropdownOpen) {
                                        setIsTriggerDropdownOpen(true);
                                      }
                                    }}
                                    onKeyDown={handleKeyDown}
                                    style={{
                                      width: '100%',
                                      padding: '10px 30px 10px 12px',
                                      borderRadius: 6,
                                      border: '1.5px solid var(--builder-border)',
                                      fontSize: '13px',
                                      outline: 'none',
                                    }}
                                  />
                                  {(currentEvent || triggerSearchQuery) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateBlockConfig(selectedBlock.id, 'events', ['']);
                                        setTriggerSearchQuery('');
                                      }}
                                      style={{
                                        position: 'absolute',
                                        right: 10,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: '#94a3b8',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        padding: 4
                                      }}
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>

                                {isTriggerDropdownOpen && (
                                  <>
                                    <div
                                      className="autocomplete-overlay"
                                      onClick={() => setIsTriggerDropdownOpen(false)}
                                      style={{
                                        position: 'fixed',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        zIndex: 999
                                      }}
                                    />
                                    <div
                                      className="autocomplete-dropdown searchable-condition-dropdown"
                                      style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        marginTop: '4px',
                                        background: '#ffffff',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '6px',
                                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                                        maxHeight: '220px',
                                        overflowY: 'auto',
                                        zIndex: 1000,
                                        padding: '4px'
                                      }}
                                    >
                                      {recentTriggers.length > 0 && !triggerSearchQuery && (
                                        <div className="dropdown-section">
                                          <div className="dropdown-section-title" style={{ padding: '6px 8px', fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            🕒 Recentes / Mais Utilizados
                                          </div>
                                          {recentTriggers.map((val) => {
                                            const flatIdx = flatItems.indexOf(val);
                                            const isActive = flatIdx === triggerActiveIndex;
                                            return (
                                              <div
                                                key={val}
                                                className={`dropdown-item ${isActive ? 'active' : ''}`}
                                                onClick={() => handleSelectTrigger(val)}
                                                style={{
                                                  padding: '8px 10px',
                                                  fontSize: '12.5px',
                                                  color: '#1e293b',
                                                  cursor: 'pointer',
                                                  borderRadius: '4px',
                                                  background: isActive ? '#f1f5f9' : 'transparent',
                                                  fontWeight: isActive ? 600 : 400
                                                }}
                                              >
                                                {val}
                                              </div>
                                            );
                                          })}
                                          <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />
                                        </div>
                                      )}

                                      {filteredCats.map(cat => (
                                        <div key={cat.category} className="dropdown-section" style={{ marginBottom: '8px' }}>
                                          <div className="dropdown-section-title" style={{ padding: '6px 8px', fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#f8fafc', borderRadius: '4px', margin: '2px 4px' }}>
                                            {cat.category}
                                          </div>
                                          {cat.items.map(item => {
                                            const flatIdx = flatItems.indexOf(item);
                                            const isActive = flatIdx === triggerActiveIndex;
                                            return (
                                              <div
                                                key={item}
                                                className={`dropdown-item ${isActive ? 'active' : ''}`}
                                                onClick={() => handleSelectTrigger(item)}
                                                style={{
                                                  padding: '8px 10px',
                                                  fontSize: '12.5px',
                                                  color: '#1e293b',
                                                  cursor: 'pointer',
                                                  borderRadius: '4px',
                                                  background: isActive ? '#f1f5f9' : 'transparent',
                                                  fontWeight: isActive ? 600 : 400
                                                }}
                                              >
                                                {item}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ))}

                                      {filteredCats.length === 0 && !canCreateCustom && (
                                        <div style={{ padding: '16px', fontSize: '12.5px', color: '#64748b', textAlign: 'center' }}>
                                          Nenhum evento encontrado.
                                        </div>
                                      )}

                                      {canCreateCustom && (
                                        <div
                                          className={`dropdown-item custom-create-item ${triggerActiveIndex === flatItems.length ? 'active' : ''}`}
                                          onClick={() => handleSelectTrigger(triggerSearchQuery.trim())}
                                          style={{
                                            padding: '10px 10px',
                                            fontSize: '13px',
                                            color: 'var(--builder-accent)',
                                            cursor: 'pointer',
                                            borderRadius: '4px',
                                            background: triggerActiveIndex === flatItems.length ? 'var(--builder-accent-dim)' : 'transparent',
                                            fontWeight: 600,
                                            borderTop: '1px solid #e2e8f0',
                                            marginTop: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                          }}
                                        >
                                          Criar evento: "{triggerSearchQuery.trim()}"
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Elegibilidade Extra */}
                        <div className="detail-field" style={{ marginTop: 8 }}>
                          <label className="detail-label" style={{ marginBottom: 8, display: 'block', fontWeight: 700 }}>CONDIÇÕES DE ELEGIBILIDADE EXTRA</label>
                          {conditions.length > 0 && (
                            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                              <button
                                type="button"
                                onClick={() => handleOperatorChange('E')}
                                style={{
                                  padding: '4px 12px',
                                  fontSize: 13,
                                  fontWeight: 700,
                                  borderRadius: 4,
                                  border: `1.5px solid ${selectedBlock.config.operator === 'E' ? 'var(--caixa-blue)' : '#d1d9e0'}`,
                                  background: selectedBlock.config.operator === 'E' ? 'var(--caixa-blue-bg)' : '#ffffff',
                                  color: selectedBlock.config.operator === 'E' ? 'var(--caixa-blue)' : '#4a5568',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s'
                                }}
                              >
                                E
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOperatorChange('OU')}
                                style={{
                                  padding: '4px 12px',
                                  fontSize: 13,
                                  fontWeight: 700,
                                  borderRadius: 4,
                                  border: `1.5px solid ${selectedBlock.config.operator === 'OU' ? 'var(--caixa-blue)' : '#d1d9e0'}`,
                                  background: selectedBlock.config.operator === 'OU' ? 'var(--caixa-blue-bg)' : '#ffffff',
                                  color: selectedBlock.config.operator === 'OU' ? 'var(--caixa-blue)' : '#4a5568',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s'
                                }}
                              >
                                OU
                              </button>
                            </div>
                          )}

                          {conditions.map((cond: string, idx: number) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <select
                                className="detail-select"
                                style={{ flex: 1, margin: 0, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--builder-border)' }}
                                value={cond}
                                onChange={(e) => handleUpdateCondition(idx, e.target.value)}
                              >
                                <option value="">Selecionar opção</option>
                                {CONDICAO_OPCOES.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleDeleteCondition(idx)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: '#718096',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: '6px',
                                  borderRadius: '4px',
                                  transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = '#dc2626';
                                  e.currentTarget.style.background = '#fee2e2';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = '#718096';
                                  e.currentTarget.style.background = 'none';
                                }}
                                title="Excluir regra"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={handleAddCondition}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 12px',
                              borderRadius: 6,
                              border: '1.5px solid #d1d9e0',
                              background: '#ffffff',
                              color: '#1a1a2e',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              marginTop: 6,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = 'var(--caixa-blue)';
                              e.currentTarget.style.background = '#f8fafc';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#d1d9e0';
                              e.currentTarget.style.background = '#ffffff';
                            }}
                          >
                            <Plus size={14} /> Adicionar regra
                          </button>
                        </div>

                        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, borderTop: '1px solid var(--builder-border-light)', paddingTop: 16 }}>
                          <button className="btn btn-ghost" onClick={handleCancelEdit}>Cancelar</button>
                          <button className="btn btn-primary" onClick={handleConfirmEdit} style={{ background: 'var(--caixa-orange)', color: 'white' }}>Confirmar</button>
                        </div>
                      </>
                    )
                  })()}

                  {/* SEND BLOCK CONFIG */}
                  {selectedBlock.type === 'send' && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--builder-border-light)', paddingBottom: 12 }}>
                        <div style={{ background: '#F8EAF3', color: '#4F213F', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Send size={18} color="#4F213F" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--caixa-blue)' }}>Peça</div>
                          <div style={{ fontSize: 12, color: 'var(--builder-muted)' }}>Escolha o conteúdo, mensagem ou comunicação que será enviada ao cliente.</div>
                        </div>
                      </div>

                      <div className="detail-field">
                        {selectedBlock.config.piece ? (
                          <div style={{ padding: 12, border: '1px solid var(--builder-border)', borderRadius: 6, marginBottom: 8, background: '#f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontWeight: 700, fontSize: 13 }}>{selectedBlock.config.piece.name}</span>
                              <span className={`peca-channel ${selectedBlock.config.piece.channel.toLowerCase()}`} style={{ fontSize: 9 }}>
                                {selectedBlock.config.piece.channel}
                              </span>
                            </div>
                            <p style={{ fontSize: 11, color: 'var(--builder-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {selectedBlock.config.piece.content}
                            </p>
                          </div>
                        ) : (
                          <div style={{ padding: 16, border: '1px dashed var(--builder-border)', borderRadius: 6, textAlign: 'center', color: 'var(--builder-muted)', fontSize: 12, marginBottom: 8 }}>
                            Nenhuma peça selecionada para este passo de envio.
                          </div>
                        )}
                        <button
                          className="btn btn-primary"
                          style={{ width: '100%', fontSize: 14, background: 'var(--caixa-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: 'none', padding: '10px' }}
                          onClick={() => setPecasModalOpen(true)}
                        >
                          {selectedBlock.config.piece ? 'Trocar Peça' : <><Plus size={16} /> Adicionar peça</>}
                        </button>
                      </div>

                      {/* Timing Anchor Selector */}
                      <div className="detail-field" style={{ borderTop: '1px solid var(--builder-border-light)', paddingTop: 16, marginTop: 4 }}>
                        <label className="detail-label" style={{ fontWeight: 700, color: '#1e293b', marginBottom: 8, display: 'block' }}>
                          Enviar depois de qual etapa?
                        </label>
                        {(() => {
                          const waitCfg = selectedBlock.config.wait || { type: 'immediate', amount: '1', unit: 'dia', anchor: 'previous' };
                          const anchor = waitCfg.anchor || 'previous';

                          const getCandidateBlocks = () => {
                            const candidates: any[] = [];
                            const traverse = (list: any[]) => {
                              list.forEach(b => {
                                if (b.id !== selectedBlock.id && b.type !== 'end' && b.id !== 'end_auto') {
                                  candidates.push(b);
                                }
                                if (b.type === 'check') {
                                  if (b.config.yes) traverse(b.config.yes);
                                  if (b.config.no) traverse(b.config.no);
                                }
                              });
                            };
                            traverse(blocks);
                            return candidates;
                          };

                          const candidates = getCandidateBlocks();

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              <select
                                className="detail-select"
                                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--builder-border)', background: '#ffffff', fontSize: 13, fontWeight: 500, color: '#334155' }}
                                value={anchor}
                                onChange={(e) => {
                                  const newAnchor = e.target.value;
                                  const updatedCfg = { ...waitCfg, anchor: newAnchor };
                                  if (newAnchor === 'step' && candidates.length > 0) {
                                    updatedCfg.anchorBlockId = candidates[0].id;
                                  } else {
                                    delete updatedCfg.anchorBlockId;
                                  }
                                  updateBlockConfig(selectedBlock.id, 'wait', updatedCfg);
                                }}
                              >
                                <option value="previous">Etapa anterior</option>
                                <option value="start">Início da jornada</option>
                                <option value="step">Escolher etapa...</option>
                              </select>

                              {anchor === 'step' && (
                                <div style={{ marginTop: 4 }}>
                                  <label className="detail-label" style={{ fontSize: 11, color: '#64748b', marginBottom: 4, display: 'block' }}>Selecionar etapa de referência:</label>
                                  <select
                                    className="detail-select"
                                    style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--builder-border)', fontSize: 12 }}
                                    value={waitCfg.anchorBlockId || ''}
                                    onChange={(e) => {
                                      updateBlockConfig(selectedBlock.id, 'wait', { ...waitCfg, anchorBlockId: e.target.value });
                                    }}
                                  >
                                    {candidates.map(c => {
                                      const stepNum = blockNumbersMap[c.id];
                                      const prefix = stepNum ? `Etapa ${stepNum} • ` : '';
                                      let label = '';
                                      if (c.type === 'trigger') {
                                        label = `${prefix}🚀 Início da jornada (Gatilho)`;
                                      } else if (c.type === 'send') {
                                        label = `${prefix}📨 Enviar ${c.config.piece?.channel || 'SMS'}: ${c.config.piece?.name || 'Ação de Envio'}`;
                                      } else if (c.type === 'check') {
                                        label = `${prefix}🔀 Condição: ${c.config.question || 'Verificação'}`;
                                      } else if (c.type === 'wait') {
                                        label = `${prefix}⏱️ Aguardar: ${c.config.amount} ${c.config.unit}`;
                                      } else {
                                        label = `${prefix}${c.type} - ${c.id}`;
                                      }
                                      return (
                                        <option key={c.id} value={c.id}>
                                          {label}
                                        </option>
                                      );
                                    })}
                                    {candidates.length === 0 && (
                                      <option value="">Nenhuma outra etapa encontrada</option>
                                    )}
                                  </select>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Delay options */}
                      <div className="detail-field" style={{ borderTop: '1px solid var(--builder-border-light)', paddingTop: 16, marginTop: 4 }}>
                        <label className="detail-label" style={{ fontWeight: 700, color: '#1e293b', marginBottom: 8, display: 'block' }}>
                          Quando enviar?
                        </label>
                        {(() => {
                          const waitCfg = selectedBlock.config.wait || { type: 'immediate', amount: '1', unit: 'dia' }
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: '#334155' }}>
                                <input
                                  type="radio"
                                  name="waitType"
                                  checked={waitCfg.type === 'immediate'}
                                  onChange={() => updateBlockConfig(selectedBlock.id, 'wait', { ...waitCfg, type: 'immediate' })}
                                />
                                Imediatamente
                              </label>

                              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: '#334155' }}>
                                <input
                                  type="radio"
                                  name="waitType"
                                  checked={waitCfg.type === 'after'}
                                  onChange={() => updateBlockConfig(selectedBlock.id, 'wait', { ...waitCfg, type: 'after' })}
                                />
                                Após um período
                              </label>

                              {waitCfg.type === 'after' && (
                                <div className="detail-row" style={{ display: 'flex', gap: 8, paddingLeft: 22 }}>
                                  <input
                                    type="number"
                                    className="detail-input"
                                    min="1"
                                    style={{ width: 80, padding: '6px 8px', borderRadius: 4, border: '1px solid var(--builder-border)' }}
                                    value={waitCfg.amount || '1'}
                                    onChange={(e) => updateBlockConfig(selectedBlock.id, 'wait', { ...waitCfg, amount: e.target.value })}
                                  />
                                  <select
                                    className="detail-select"
                                    style={{ flex: 1, padding: '6px 8px', borderRadius: 4, border: '1px solid var(--builder-border)' }}
                                    value={waitCfg.unit || 'dia'}
                                    onChange={(e) => updateBlockConfig(selectedBlock.id, 'wait', { ...waitCfg, unit: e.target.value })}
                                  >
                                    <option value="minuto">minuto(s)</option>
                                    <option value="hora">hora(s)</option>
                                    <option value="dia">dia(s)</option>
                                  </select>
                                </div>
                              )}

                              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: '#334155' }}>
                                <input
                                  type="radio"
                                  name="waitType"
                                  checked={waitCfg.type === 'before'}
                                  onChange={() => updateBlockConfig(selectedBlock.id, 'wait', { ...waitCfg, type: 'before' })}
                                />
                                Antes de um período
                              </label>

                              {waitCfg.type === 'before' && (
                                <div className="detail-row" style={{ display: 'flex', gap: 8, paddingLeft: 22 }}>
                                  <input
                                    type="number"
                                    className="detail-input"
                                    min="1"
                                    style={{ width: 80, padding: '6px 8px', borderRadius: 4, border: '1px solid var(--builder-border)' }}
                                    value={waitCfg.amount || '1'}
                                    onChange={(e) => updateBlockConfig(selectedBlock.id, 'wait', { ...waitCfg, amount: e.target.value })}
                                  />
                                  <select
                                    className="detail-select"
                                    style={{ flex: 1, padding: '6px 8px', borderRadius: 4, border: '1px solid var(--builder-border)' }}
                                    value={waitCfg.unit || 'dia'}
                                    onChange={(e) => updateBlockConfig(selectedBlock.id, 'wait', { ...waitCfg, unit: e.target.value })}
                                  >
                                    <option value="minuto">minuto(s)</option>
                                    <option value="hora">hora(s)</option>
                                    <option value="dia">dia(s)</option>
                                  </select>
                                </div>
                              )}

                              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: '#334155' }}>
                                <input
                                  type="radio"
                                  name="waitType"
                                  checked={waitCfg.type === 'date'}
                                  onChange={() => updateBlockConfig(selectedBlock.id, 'wait', { ...waitCfg, type: 'date' })}
                                />
                                Data Programada (calendário)
                              </label>

                              {waitCfg.type === 'date' && (
                                <div className="detail-row" style={{ paddingLeft: 22 }}>
                                  <input
                                    type="date"
                                    className="detail-input"
                                    style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--builder-border)', fontFamily: 'inherit' }}
                                    value={waitCfg.date || ''}
                                    onChange={(e) => updateBlockConfig(selectedBlock.id, 'wait', { ...waitCfg, date: e.target.value })}
                                  />
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>

                      <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, borderTop: '1px solid var(--builder-border-light)', paddingTop: 16 }}>
                        <button className="btn btn-ghost" onClick={handleCancelEdit}>Cancelar</button>
                        <button 
                          className="btn btn-primary" 
                          onClick={handleConfirmEdit} 
                          disabled={!selectedBlock.config.piece}
                          style={{ 
                            background: selectedBlock.config.piece ? 'var(--caixa-blue)' : '#cbd5e1', 
                            color: 'white',
                            cursor: selectedBlock.config.piece ? 'pointer' : 'not-allowed',
                            border: 'none'
                          }}
                        >
                          Confirmar
                        </button>
                      </div>
                    </>
                  )}

                  {/* CHECK BLOCK CONFIG */}
                  {selectedBlock.type === 'check' && (() => {
                    const currentVal = selectedBlock.config.question || '';
                    const conditions = selectedBlock.config.conditions || (selectedBlock.config.extra ? [selectedBlock.config.extra] : [])

                    const handleOperatorChange = (newOp: 'E' | 'OU') => {
                      updateBlockConfig(selectedBlock.id, {
                        operator: newOp,
                        extra: conditions.filter(Boolean).join(` ${newOp} `)
                      })
                    }

                    const handleUpdateCondition = (idx: number, newVal: string) => {
                      const updated = [...conditions]
                      updated[idx] = newVal
                      updateBlockConfig(selectedBlock.id, {
                        conditions: updated,
                        extra: updated.filter(Boolean).join(` ${selectedBlock.config.operator || 'E'} `)
                      })
                    }

                    const handleDeleteCondition = (idx: number) => {
                      const updated = conditions.filter((_, i) => i !== idx)
                      updateBlockConfig(selectedBlock.id, {
                        conditions: updated,
                        extra: updated.filter(Boolean).join(` ${selectedBlock.config.operator || 'E'} `)
                      })
                    }

                    const handleAddCondition = () => {
                      const updated = [...conditions, '']
                      updateBlockConfig(selectedBlock.id, {
                        conditions: updated,
                        extra: updated.filter(Boolean).join(` ${selectedBlock.config.operator || 'E'} `)
                      })
                    }
                    const filteredCats = CHECK_CATEGORIES.map(cat => {
                      const matchedItems = cat.items.filter(item =>
                        item.toLowerCase().includes(checkSearchQuery.toLowerCase())
                      );
                      return { ...cat, items: matchedItems };
                    }).filter(cat => cat.items.length > 0);

                    const flatItems: string[] = [];
                    const matchedRecents = recentChecks.filter(item => 
                      item.toLowerCase().includes(checkSearchQuery.toLowerCase()) && 
                      !flatItems.includes(item)
                    );
                    flatItems.push(...matchedRecents);
                    filteredCats.forEach(cat => {
                      cat.items.forEach(item => {
                        if (!flatItems.includes(item)) {
                          flatItems.push(item);
                        }
                      });
                    });

                    const exactMatchExists = flatItems.some(i => i.toLowerCase() === checkSearchQuery.trim().toLowerCase());
                    const canCreateCustom = checkSearchQuery.trim().length > 0 && !exactMatchExists;

                    const handleSelectCondition = (val: string) => {
                      updateBlockConfig(selectedBlock.id, 'question', val);
                      setIsCheckDropdownOpen(false);
                      setCheckSearchQuery('');
                      setRecentChecks(prev => {
                        const updated = [val, ...prev.filter(x => x !== val)];
                        return updated.slice(0, 5);
                      });
                    };

                    const handleKeyDown = (e: React.KeyboardEvent) => {
                      const totalOptions = flatItems.length + (canCreateCustom ? 1 : 0);
                      if (totalOptions === 0) return;
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setCheckActiveIndex(prev => (prev + 1) % totalOptions);
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setCheckActiveIndex(prev => (prev - 1 + totalOptions) % totalOptions);
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (canCreateCustom && checkActiveIndex === flatItems.length) {
                          handleSelectCondition(checkSearchQuery.trim());
                        } else if (flatItems[checkActiveIndex]) {
                          handleSelectCondition(flatItems[checkActiveIndex]);
                        }
                      } else if (e.key === 'Escape') {
                        setIsCheckDropdownOpen(false);
                      }
                    };

                    return (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--builder-border-light)', paddingBottom: 12 }}>
                          <div style={{ background: '#FFF8F0', color: '#A65E00', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <GitBranch size={18} color="#A65E00" />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--caixa-blue)' }}>Condição</div>
                            <div style={{ fontSize: 12, color: 'var(--builder-muted)' }}>Crie caminhos de "sim" e "não" na jornada.</div>
                          </div>
                        </div>

                        <div className="detail-field">
                          <label className="detail-label" style={{ fontWeight: 700, marginBottom: 8, display: 'block' }}>Pergunta de Ação</label>
                          <div className="autocomplete-container" style={{ position: 'relative' }}>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <input
                                type="text"
                                className="detail-input"
                                placeholder="Busque uma condição ou crie uma"
                                value={isCheckDropdownOpen ? checkSearchQuery : currentVal}
                                onFocus={() => {
                                  setIsCheckDropdownOpen(true);
                                  setCheckSearchQuery('');
                                  setCheckActiveIndex(0);
                                }}
                                onChange={(e) => {
                                  setCheckSearchQuery(e.target.value);
                                  setCheckActiveIndex(0);
                                  if (!isCheckDropdownOpen) {
                                    setIsCheckDropdownOpen(true);
                                  }
                                }}
                                onKeyDown={handleKeyDown}
                                style={{
                                  width: '100%',
                                  padding: '10px 30px 10px 12px',
                                  borderRadius: 6,
                                  border: '1.5px solid var(--builder-border)',
                                  fontSize: '13px',
                                  outline: 'none',
                                }}
                              />
                              {(currentVal || checkSearchQuery) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateBlockConfig(selectedBlock.id, 'question', '');
                                    setCheckSearchQuery('');
                                  }}
                                  style={{
                                    position: 'absolute',
                                    right: 10,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    padding: 4
                                  }}
                                >
                                  ✕
                                </button>
                              )}
                            </div>

                            {isCheckDropdownOpen && (
                              <>
                                <div
                                  className="autocomplete-overlay"
                                  onClick={() => setIsCheckDropdownOpen(false)}
                                  style={{
                                    position: 'fixed',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    zIndex: 999
                                  }}
                                />
                                <div
                                  className="autocomplete-dropdown searchable-condition-dropdown"
                                  style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    marginTop: '4px',
                                    background: '#ffffff',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                                    maxHeight: '220px',
                                    overflowY: 'auto',
                                    zIndex: 1000,
                                    padding: '4px'
                                  }}
                                >
                                  {recentChecks.length > 0 && !checkSearchQuery && (
                                    <div className="dropdown-section">
                                      <div className="dropdown-section-title" style={{ padding: '6px 8px', fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        🕒 Recentes / Mais Utilizadas
                                      </div>
                                      {recentChecks.map((val) => {
                                        const flatIdx = flatItems.indexOf(val);
                                        const isActive = flatIdx === checkActiveIndex;
                                        return (
                                          <div
                                            key={val}
                                            className={`dropdown-item ${isActive ? 'active' : ''}`}
                                            onClick={() => handleSelectCondition(val)}
                                            style={{
                                              padding: '8px 10px',
                                              fontSize: '12.5px',
                                              color: '#1e293b',
                                              cursor: 'pointer',
                                              borderRadius: '4px',
                                              background: isActive ? '#f1f5f9' : 'transparent',
                                              fontWeight: isActive ? 600 : 400
                                            }}
                                          >
                                            {val}
                                          </div>
                                        );
                                      })}
                                      <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />
                                    </div>
                                  )}

                                  {filteredCats.map(cat => (
                                    <div key={cat.category} className="dropdown-section" style={{ marginBottom: '8px' }}>
                                      <div className="dropdown-section-title" style={{ padding: '6px 8px', fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#f8fafc', borderRadius: '4px', margin: '2px 4px' }}>
                                        {cat.category}
                                      </div>
                                      {cat.items.map(item => {
                                        const flatIdx = flatItems.indexOf(item);
                                        const isActive = flatIdx === checkActiveIndex;
                                        return (
                                          <div
                                            key={item}
                                            className={`dropdown-item ${isActive ? 'active' : ''}`}
                                            onClick={() => handleSelectCondition(item)}
                                            style={{
                                              padding: '8px 10px',
                                              fontSize: '12.5px',
                                              color: '#1e293b',
                                              cursor: 'pointer',
                                              borderRadius: '4px',
                                              background: isActive ? '#f1f5f9' : 'transparent',
                                              fontWeight: isActive ? 600 : 400
                                            }}
                                          >
                                            {item}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ))}

                                  {filteredCats.length === 0 && !canCreateCustom && (
                                    <div style={{ padding: '16px', fontSize: '12.5px', color: '#64748b', textAlign: 'center' }}>
                                      Nenhuma condição encontrada.
                                    </div>
                                  )}

                                  {canCreateCustom && (
                                    <div
                                      className={`dropdown-item custom-create-item ${checkActiveIndex === flatItems.length ? 'active' : ''}`}
                                      onClick={() => handleSelectCondition(checkSearchQuery.trim())}
                                      style={{
                                        padding: '10px 10px',
                                        fontSize: '13px',
                                        color: 'var(--builder-accent)',
                                        cursor: 'pointer',
                                        borderRadius: '4px',
                                        background: checkActiveIndex === flatItems.length ? 'var(--builder-accent-dim)' : 'transparent',
                                        fontWeight: 600,
                                        borderTop: '1px solid #e2e8f0',
                                        marginTop: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                      }}
                                    >
                                      Criar condição: "{checkSearchQuery.trim()}"
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Elegibilidade Extra */}
                        <div className="detail-field" style={{ marginTop: 8 }}>
                          <label className="detail-label" style={{ marginBottom: 8, display: 'block', fontWeight: 700 }}>CONDIÇÕES DE ELEGIBILIDADE EXTRA</label>
                          {conditions.length > 0 && (
                            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                              <button
                                type="button"
                                onClick={() => handleOperatorChange('E')}
                                style={{
                                  padding: '4px 12px',
                                  fontSize: 13,
                                  fontWeight: 700,
                                  borderRadius: 4,
                                  border: `1.5px solid ${selectedBlock.config.operator === 'E' ? 'var(--caixa-blue)' : '#d1d9e0'}`,
                                  background: selectedBlock.config.operator === 'E' ? 'var(--caixa-blue-bg)' : '#ffffff',
                                  color: selectedBlock.config.operator === 'E' ? 'var(--caixa-blue)' : '#4a5568',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s'
                                }}
                              >
                                E
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOperatorChange('OU')}
                                style={{
                                  padding: '4px 12px',
                                  fontSize: 13,
                                  fontWeight: 700,
                                  borderRadius: 4,
                                  border: `1.5px solid ${selectedBlock.config.operator === 'OU' ? 'var(--caixa-blue)' : '#d1d9e0'}`,
                                  background: selectedBlock.config.operator === 'OU' ? 'var(--caixa-blue-bg)' : '#ffffff',
                                  color: selectedBlock.config.operator === 'OU' ? 'var(--caixa-blue)' : '#4a5568',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s'
                                }}
                              >
                                OU
                              </button>
                            </div>
                          )}

                          {conditions.map((cond, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <select
                                className="detail-select"
                                style={{ flex: 1, margin: 0, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--builder-border)' }}
                                value={cond}
                                onChange={(e) => handleUpdateCondition(idx, e.target.value)}
                              >
                                <option value="">Selecionar opção</option>
                                {CONDICAO_OPCOES.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleDeleteCondition(idx)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: '#718096',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: '6px',
                                  borderRadius: '4px',
                                  transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = '#dc2626';
                                  e.currentTarget.style.background = '#fee2e2';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = '#718096';
                                  e.currentTarget.style.background = 'none';
                                }}
                                title="Excluir regra"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={handleAddCondition}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 12px',
                              borderRadius: 6,
                              border: '1.5px solid #d1d9e0',
                              background: '#ffffff',
                              color: '#1a1a2e',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              marginTop: 6,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = 'var(--caixa-blue)';
                              e.currentTarget.style.background = '#f8fafc';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#d1d9e0';
                              e.currentTarget.style.background = '#ffffff';
                            }}
                          >
                            <Plus size={14} /> Adicionar regra
                          </button>
                        </div>

                        <div style={{ marginTop: 12, padding: 12, background: 'var(--builder-bg)', border: '1px solid var(--builder-border-light)', borderRadius: 8, fontSize: 11, color: 'var(--builder-muted)', lineHeight: 1.4 }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-color)', marginBottom: 4 }}>💡 Direcione a jornada conforme o resultado</div>
                          A ramificação gerará caminhos automáticos para <strong>✓ Sim</strong> e <strong>✗ Não</strong>, permitindo que você tome ações distintas dependendo da resposta do cliente.
                        </div>

                        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, borderTop: '1px solid var(--builder-border-light)', paddingTop: 16 }}>
                          <button className="btn btn-ghost" onClick={handleCancelEdit}>Cancelar</button>
                          <button className="btn btn-primary" onClick={handleConfirmEdit} style={{ background: 'var(--caixa-blue)', color: 'white' }}>Confirmar</button>
                        </div>
                      </>
                    );
                  })()}

                  {/* END BLOCK CONFIG */}
                  {selectedBlock.type === 'end' && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--builder-border-light)', paddingBottom: 12 }}>
                        <div style={{ background: '#f1f2f5', color: '#718096', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Flag size={18} color="#718096" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--caixa-blue)' }}>Encerramento</div>
                          <div style={{ fontSize: 12, color: 'var(--builder-muted)' }}>Defina o encerramento da jornada para o cliente neste ponto.</div>
                        </div>
                      </div>

                      <div className="detail-field">
                        <label className="detail-label" style={{ fontWeight: 700, marginBottom: 8, display: 'block' }}>Motivo do Encerramento</label>
                        <select
                          className="detail-select"
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--builder-border)', background: '#ffffff', fontSize: 13, fontWeight: 500, color: '#334155' }}
                          value={selectedBlock.config.reason}
                          onChange={(e) => updateBlockConfig(selectedBlock.id, 'reason', e.target.value)}
                        >
                          <option value="">Selecionar motivo...</option>
                          <option value="Conversão realizada">Conversão realizada com sucesso</option>
                          <option value="Sem elegibilidade">Sem elegibilidade comercial</option>
                          <option value="Jornada concluída">Jornada concluída por inatividade</option>
                          <option value="Opt-out comercial">Opt-out comercial no período</option>
                        </select>
                      </div>

                      <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, borderTop: '1px solid var(--builder-border-light)', paddingTop: 16 }}>
                        <button className="btn btn-ghost" onClick={handleCancelEdit}>Cancelar</button>
                        <button className="btn btn-primary" onClick={handleConfirmEdit} style={{ background: 'var(--caixa-blue)', color: 'white' }}>Confirmar</button>
                      </div>
                    </>
                  )}

                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: CAMPAIGN REVIEW ── */}
      {step === 3 && (() => {
        const getAssuntoName = (piece: any) => {
          if (piece?.assunto?.nome) return piece.assunto.nome;
          if (typeof piece?.assunto === 'string') return piece.assunto;
          // Hardcoded fallback for mock pieces to match the layout perfectly
          if (piece?.id === 'p1' || piece?.id === 'p2' || piece?.id === 'p4') return 'Conta Corrente PF';
          if (piece?.id === 'p3') return 'Cartão de Crédito Gold';
          return piece?.assunto || 'Geral';
        };

        const getUsedChannelsDetailed = () => {
          const pieces: { channel: string; name: string; subject: string }[] = [];
          const traverse = (list: any[]) => {
            list.forEach(b => {
              if (b.type === 'send') {
                const ch = (b.config?.piece?.channel || b.config?.channel || 'SMS').toUpperCase();
                const pName = b.config?.piece?.name || b.config?.pecaName || 'Peça sem nome';
                const pSubject = getAssuntoName(b.config?.piece);
                pieces.push({ channel: ch, name: pName, subject: pSubject });
              }
              if (b.type === 'check') {
                if (b.config?.yes) traverse(b.config.yes);
                if (b.config?.no) traverse(b.config.no);
              }
            });
          };
          traverse(blocks);
          return pieces;
        };

        const allPieces = getUsedChannelsDetailed();

        // Count by channel
        const channelCounts: Record<string, number> = {};
        allPieces.forEach(p => {
          const key = p.channel;
          channelCounts[key] = (channelCounts[key] || 0) + 1;
        });

        const getTimingText = (w: any) => {
          if (!w) return 'imediatamente';
          const type = w.type || '';
          if (type === 'immediate') return 'imediatamente';
          if (type === 'after' || type === 'wait') {
            const amt = w.amount || w.value || '1';
            let unit = w.unit || 'dia';
            if (unit === 'days') unit = 'dias';
            if (unit === 'hours') unit = 'horas';
            if (unit === 'minutes') unit = 'minutos';
            
            if (amt === '1') {
              if (unit.endsWith('s')) {
                unit = unit.slice(0, -1);
              }
            } else {
              if (!unit.endsWith('s')) {
                unit = unit + 's';
              }
            }
            let suffix = '';
            if (w.anchor === 'start') {
              suffix = ' após início';
            } else if (w.anchor === 'step') {
              suffix = ' após etapa';
            }
            return `${amt} ${unit}${suffix || ' após'}`;
          }
          if (type === 'before') {
            const amt = w.amount || w.value || '1';
            let unit = w.unit || 'dia';
            if (unit === 'days') unit = 'dias';
            if (unit === 'hours') unit = 'horas';
            if (unit === 'minutes') unit = 'minutos';
            
            if (amt === '1') {
              if (unit.endsWith('s')) {
                unit = unit.slice(0, -1);
              }
            } else {
              if (!unit.endsWith('s')) {
                unit = unit + 's';
              }
            }
            return `${amt} ${unit} antes`;
          }
          if (type === 'date') return `em ${w.date}`;
          return 'imediatamente';
        };

        return (
          <div className="review-layout" style={{ animation: 'fadeIn 0.3s ease' }}>
            
            {published ? (
              /* SUCCESS PANEL */
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
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>Campanha Enviada para Análise!</h2>
                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, maxWidth: 450, margin: 0 }}>
                  A jornada <strong>"{campaignName}"</strong> foi estruturada com sucesso e enviada para a fila de validação dos gestores e aprovadores da CAIXA.
                </p>
                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  <button className="btn btn-ghost" onClick={() => navigate('/campanhas')}>Ir para Minhas Campanhas</button>
                  <button className="btn btn-primary" onClick={() => navigate('/')}>Ir para o Início</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32, alignItems: 'start' }}>
                  {/* Left Column */}
                  <div>
                    {/* Dados da Campanha */}
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--caixa-blue)', borderLeft: '4px solid var(--caixa-blue)', paddingLeft: 14, marginBottom: 16 }}>
                      Dados da campanha
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 32px', marginBottom: 20, marginTop: 12 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Nome da campanha</div>
                        <div style={{ fontSize: 15, color: '#4b5563', fontWeight: 400 }}>{campaignName || 'Não informado'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Descrição</div>
                        <div style={{ fontSize: 15, color: '#4b5563', fontWeight: 400 }}>{description || 'Não informado'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Tipo de disparo</div>
                        <div style={{ fontSize: 15, color: '#4b5563', fontWeight: 400 }}>
                          {recorrenciaTipo === 'recorrente' ? `Recorrente (a cada ${recorrenciaIntervalo} ${getUnitLabel(recorrenciaFrequencia, recorrenciaIntervalo)})` : 'Disparo único'}
                        </div>
                      </div>
                      <div>
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Nichos selecionados</div>
                        <div style={{ fontSize: 15, color: '#4b5563', fontWeight: 400 }}>{selectedSegmentoName || 'Público Geral'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Público alvo</div>
                        <div style={{ fontSize: 15, color: '#4b5563', fontWeight: 400 }}>{selectedPublicoName || 'Não informado'}</div>
                      </div>
                    </div>

                    {/* Exclusões Obrigatórias */}
                    <div style={{ marginTop: 12, marginBottom: 16 }}>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: 8 }}>Exclusões Obrigatórias (Automáticas)</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {MANDATORY_EXCLUSIONS.map(excl => (
                          <span key={excl} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: '#fff7ed', border: '1px solid #ffedd5',
                            borderRadius: 4, padding: '5px 12px', fontSize: 12, color: '#c2410c', fontWeight: 600
                          }}>
                            <Lock size={12} style={{ color: '#ea580c' }} /> {excl}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Exclusões Opcionais */}
                    {selectedExclusions.length > 0 && (
                      <div style={{ marginTop: 12, marginBottom: 32 }}>
                        <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: 8 }}>Exclusões Opcionais</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {selectedExclusions.map(excl => (
                            <span key={excl} style={{
                              display: 'inline-flex', alignItems: 'center',
                              background: '#fef2f2', border: '1px solid #fca5a5',
                              borderRadius: 4, padding: '5px 12px', fontSize: 12, color: '#dc2626', fontWeight: 600
                            }}>
                              {excl}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Jornada Explicada */}
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--caixa-blue)', borderLeft: '4px solid var(--caixa-blue)', paddingLeft: 14, marginBottom: 24, marginTop: 8 }}>
                      Como a campanha funcionará
                    </h3>
                    <div style={{ marginBottom: 32 }}>
                      <JornadaExplicada nodes={mapBlocksToJornadaNodes(blocks, blocks, blockNumbersMap)} />
                    </div>

                    {/* Observação */}
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--caixa-blue)', borderLeft: '4px solid var(--caixa-blue)', paddingLeft: 14, marginBottom: 16 }}>
                      Observação
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                      Adicione informações complementares que considere relevantes para a análise e aprovação desta campanha.
                    </p>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <textarea
                        className="form-textarea"
                        placeholder="Ex.: Esta campanha é destinada a clientes que abriram conta nos últimos 30 dias..."
                        value={campaignObservation}
                        onChange={(e) => setCampaignObservation(e.target.value)}
                        style={{ minHeight: 120, width: '100%', padding: '12px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                      />
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textAlign: 'right' }}>
                        Campo opcional
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Canais Utilizados Card */}
                  <div style={{
                    background: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '24px 20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    position: 'sticky',
                    top: 20
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
                      Canais utilizados e assuntos
                    </div>
                    {(() => {
                      const grouped: Record<string, { name: string; subject: string }[]> = {};
                      allPieces.forEach(p => {
                        if (!grouped[p.channel]) grouped[p.channel] = [];
                        grouped[p.channel].push({ name: p.name, subject: p.subject });
                      });

                      const channelLabels: Record<string, string> = {
                        'SMS': 'SMS',
                        'EMAIL': 'E-mail',
                        'E-MAIL': 'E-mail',
                        'WHATSAPP': 'WhatsApp',
                        'PUSH': 'Push App',
                        'APP CAIXA': 'App CAIXA',
                        'APP': 'App'
                      };

                      return Object.entries(grouped).map(([ch, pcs]) => {
                        const label = (channelLabels[ch] || ch).toUpperCase();
                        return (
                          <div key={ch} style={{
                            background: '#f0f4ff',
                            border: '1px solid #c7d7fd',
                            borderRadius: 6,
                            padding: '14px',
                            marginBottom: 12
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
                              <span>{label}</span>
                              <span style={{ color: 'var(--caixa-orange)' }}>
                                {pcs.length} {pcs.length === 1 ? 'PEÇA' : 'PEÇAS'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {pcs.map((p, i) => (
                                <div key={i} style={{
                                  background: '#ffffff',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: 4,
                                  padding: '10px 12px',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1f2937' }}>
                                    {p.name}
                                  </div>
                                  {p.subject && (
                                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                                      Assunto: {p.subject}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()}

                    {Object.keys(channelCounts).length === 0 && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Nenhum canal de comunicação foi utilizado nesta jornada.
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer buttons at the bottom of the page */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32, borderTop: '1px solid var(--builder-border-light)', paddingTop: 20 }}>
                  <button className="btn btn-ghost" onClick={() => setStep(2)}>← Desenhar Jornada</button>
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
        );
      })()}

      {/* ── Floating context menu for adding blocks inline ── */}
      {addMenuPos && (
        <div
          className="add-block-menu"
          style={{ left: addMenuPos.x, top: addMenuPos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="menu-item" onClick={() => confirmAddBlock('send')}>
            <span className="menu-icon">📨</span> Enviar peça de comunicação
          </div>
          <div className="menu-item" onClick={() => confirmAddBlock('check')}>
            <span className="menu-icon">🔀</span> Verificar
          </div>
        </div>
      )}

      {/* ── Communication Piece Selector Modal ── */}
      {pecasModalOpen && (
        <div className="modal-overlay" onClick={() => setPecasModalOpen(false)}>
          <div
            className="modal-container modal-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-selecionar-peca-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <div id="modal-selecionar-peca-title" className="modal-title">Selecionar Peça de Comunicação</div>
              <button className="modal-close" onClick={() => setPecasModalOpen(false)} aria-label="Fechar seleção de peça">✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-toolbar">
                <div className="search-input" style={{ maxWidth: 300 }}>
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="Buscar peça por nome ou conteúdo..."
                    value={pecaSearch}
                    onChange={(e) => setPecaSearch(e.target.value)}
                  />
                </div>
                <div className="filter-tabs">
                  {(['Todos', 'PUSH', 'SMS', 'EMAIL', 'WHATSAPP', 'APP CAIXA'] as const).map(tab => (
                    <button
                      key={tab}
                      className={`filter-tab ${activeTab === tab ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {filteredPecas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--builder-muted)' }}>
                  Nenhuma peça de comunicação encontrada para este filtro.
                </div>
              ) : (
                <div className="pecas-grid">
                  {filteredPecas.map(p => (
                    <div
                      key={p.id}
                      className="peca-card"
                      onClick={() => {
                        if (selectedId) {
                          updateBlockConfig(selectedId, 'piece', p)
                          setPecasModalOpen(false)
                        }
                      }}
                    >
                      <div className="peca-header">
                        <span className="peca-name">{p.name}</span>
                        <span className={`peca-channel ${p.channel.toLowerCase()}`}>
                          {p.channel}
                        </span>
                      </div>
                      <p className="peca-content">{p.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
