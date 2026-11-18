type StudyTask = 'pix' | 'cartao'

type JourneyBlock = {
  id: string
  type: string
  config?: {
    events?: string[]
    piece?: { name: string; channel: string }
    wait?: { type: string; amount?: string; unit?: string; anchor?: string; anchorBlockId?: string }
    question?: string
    yes?: JourneyBlock[]
    no?: JourneyBlock[]
    direction?: string
    targetBlockId?: string
    maxRepetitions?: number
    timing?: string
  }
}

function normalize(value = '') {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function getCampaignStudyTask(name: string): StudyTask | undefined {
  switch (normalize(name)) {
    case 'boas-vindas e pix':
    case 'tarefa 1':
      return 'pix'
    case 'desbloqueio de cartao':
    case 'tarefa 2':
      return 'cartao'
  }
}

type StudyEvent =
  | 'dados_avancou' | 'aba_fluxo_aberta' | 'editor_aberto'
  | 'do_zero' | 'modelo_simples' | 'modelo_decisao' | 'modelo_retorno'
  | 'gatilho_confirmado' | 'envio_confirmado' | 'verificacao_confirmada' | 'retorno_confirmado'
  | 'revisao_bloqueada' | 'revisao_aberta' | 'enviar_clicado'
  | 'confirmacao_exibida' | 'configuracao_correta' | 'configuracao_incorreta'
  | 'publico_configurado' | 'gatilho_configurado' | 'primeiro_envio_configurado'
  | 'verificacao_configurada' | 'ramo_sim_encerrado' | 'sms_ramo_nao_configurado'
  | 'retorno_configurado'

export function trackCampaignStudy(task: StudyTask | undefined, event: StudyEvent) {
  const { clarity } = window as Window & { clarity?: (...args: string[]) => void }
  const eventName = `ux_${task ?? 'jornada'}_${event}`
  clarity?.('event', eventName)
  console.log('[Clarity UX]', eventName, { apiDisponivel: typeof clarity === 'function' })
}

export function trackCampaignStudyBlock(task: StudyTask | undefined, block?: JourneyBlock) {
  if (block?.type === 'trigger') trackCampaignStudy(task, 'gatilho_confirmado')
  if (block?.type === 'send') trackCampaignStudy(task, 'envio_confirmado')
  if (block?.type === 'check') trackCampaignStudy(task, 'verificacao_confirmada')
  if (block?.type === 'connector' && block.config?.direction === 'backward') {
    trackCampaignStudy(task, 'retorno_confirmado')
  }
}

const scenarios = {
  pix: {
    trigger: 'Cliente abriu conta corrente',
    firstPiece: 'Bem-vindo à CAIXA',
    firstChannel: 'PUSH',
    check: 'Chave Pix cadastrada?',
    sms: 'Cadastre sua chave Pix',
    days: 2,
  },
  cartao: {
    trigger: 'Cliente solicitou novo cartão de crédito',
    firstPiece: 'Seu cartão pré-aprovado aguarda',
    firstChannel: 'EMAIL',
    check: 'Cartão desbloqueado?',
    sms: 'Última chance para desbloquear',
    days: 5,
  },
}

export function inferCampaignStudyTask(blocks: JourneyBlock[]): StudyTask | undefined {
  const trigger = blocks.find(block => block.type === 'trigger')
  const tasks = Object.keys(scenarios) as StudyTask[]
  return tasks.find(task => trigger?.config?.events?.some(event =>
    normalize(event) === normalize(scenarios[task].trigger),
  )) ?? tasks.find(task => blocks.some(block => block.type === 'check'
    && normalize(block.config?.question) === normalize(scenarios[task].check)))
}

function matchesPiece(block: JourneyBlock | undefined, name: string, channel: string) {
  return block?.type === 'send' && normalize(block.config?.piece?.name) === normalize(name)
    && block.config?.piece?.channel.toUpperCase() === channel
}

function endsJourney(blocks: JourneyBlock[]) {
  return blocks.length === 0 || (blocks.length === 1 && blocks[0].type === 'end')
}

export function assessCampaignStudy(
  task: StudyTask,
  blocks: JourneyBlock[],
  audiences: { id: string; nome: string }[],
  segments: { publicoAlvoId: string; nome: string }[],
) {
  const scenario = scenarios[task]
  const [trigger, firstSend, check, ...tail] = blocks
  const [sms, ...afterSms] = check?.config?.no ?? []
  const [connector, ...afterConnector] = afterSms
  const wait = sms?.config?.wait
  const event = trigger?.config?.events
  const audience = audiences[0]
  const segment = segments[0]
  const checks = {
    publico: task === 'cartao' || (
      audiences.length === 1 && segments.length === 1 && normalize(audience?.nome) === 'pessoa fisica'
      && normalize(segment?.nome) === 'baixa renda' && segment?.publicoAlvoId === audience?.id
    ),
    gatilho: trigger?.type === 'trigger' && event?.length === 1 && normalize(event[0]) === normalize(scenario.trigger),
    primeiro_envio: matchesPiece(firstSend, scenario.firstPiece, scenario.firstChannel)
      && firstSend?.config?.wait?.type === 'immediate',
    verificacao: check?.type === 'check' && normalize(check.config?.question) === normalize(scenario.check),
    ramo_sim: check?.type === 'check' && endsJourney(check.config?.yes ?? []),
    sms: matchesPiece(sms, scenario.sms, 'SMS'),
    prazo_sms: wait?.type === 'after' && Number(wait.amount) === scenario.days
      && ['dia', 'dias'].includes(wait.unit ?? '')
      && (!wait.anchor || wait.anchor === 'previous' || (wait.anchor === 'step' && wait.anchorBlockId === check?.id)),
    retorno: task === 'pix' ? endsJourney(afterSms) : (
      connector?.type === 'connector' && connector.config?.direction === 'backward'
      && connector.config.targetBlockId === check?.id && connector.config.maxRepetitions === 3
      && endsJourney(afterConnector)
    ),
    fim: endsJourney(tail),
  }
  return Object.entries(checks).filter(([, passed]) => !passed).map(([criterion]) => criterion)
}

export function trackCampaignStudyMilestones(task: StudyTask, issues: string[], recorded: Set<string>) {
  const milestones: [StudyEvent, string[]][] = [
    ['publico_configurado', ['publico']],
    ['gatilho_configurado', ['gatilho']],
    ['primeiro_envio_configurado', ['primeiro_envio']],
    ['verificacao_configurada', ['verificacao']],
    ['ramo_sim_encerrado', ['verificacao', 'ramo_sim']],
    ['sms_ramo_nao_configurado', ['verificacao', 'sms', 'prazo_sms']],
    ['retorno_configurado', ['verificacao', 'sms', 'retorno']],
  ]
  for (const [event, criteria] of milestones) {
    if ((task === 'pix' && event === 'retorno_configurado') || (task === 'cartao' && event === 'publico_configurado')) continue
    const key = `${task}:${event}`
    if (recorded.has(key) || criteria.some(criterion => issues.includes(criterion))) continue
    recorded.add(key)
    trackCampaignStudy(task, event)
  }
}

export function trackCampaignStudyResult(task: StudyTask, issues: string[]) {
  trackCampaignStudy(task, issues.length ? 'configuracao_incorreta' : 'configuracao_correta')
  if (issues.length) {
    const { clarity } = window as Window & { clarity?: (command: string, key: string, values: string[]) => void }
    const tag = `ux_${task}_divergencias`
    clarity?.('set', tag, issues)
    console.log('[Clarity UX]', tag, issues)
  }
}
