// ===== DATA =====
const BLOCK_META = {
  trigger: { icon: '⚡', label: 'Quando acontecer', badge: 'Início',   color: '#f59e0b' },
  wait:    { icon: '⏳', label: 'Esperar',           badge: 'Espera',   color: '#818cf8' },
  send:    { icon: '📨', label: 'Enviar',            badge: 'Envio',    color: '#10b981' },
  check:   { icon: '🔀', label: 'Verificar',         badge: 'Condição', color: '#3b82f6' },
  end:     { icon: '🏁', label: 'Encerrar campanha', badge: 'Fim',      color: '#6b7280' },
};

const EXAMPLE_FLOW = [
  { id: 'b1', type: 'trigger', config: { events: ['Cliente abrindo conta'], operator: 'E', extra: 'Cliente movimentar a conta nos últimos 30 dias' } },
  { id: 'b2', type: 'wait',    config: { amount: 2, unit: 'dias' } },
  { id: 'b3', type: 'send',    config: { channel: 'Push', message: 'Bem-vindo! Sua conta foi aberta com sucesso.' } },
  { id: 'b4', type: 'wait',    config: { amount: 1, unit: 'dia' } },
  { id: 'b5', type: 'send',    config: { channel: 'SMS', message: 'Cadastre sua chave Pix e facilite suas transferências!' } },
  { id: 'b6', type: 'check',   config: { question: 'Cliente possui cartão pré-aprovado?',
    yes: [
      { id: 'b7', type: 'wait', config: { amount: 1, unit: 'dia' } },
      { id: 'b8', type: 'send', config: { channel: 'SMS', message: 'Temos um cartão disponível para você. Desbloqueie agora!' } },
      { id: 'b9', type: 'check', config: { question: 'Cliente desbloqueou o cartão?',
        yes: [{ id: 'b10', type: 'end', config: { reason: 'Conversão realizada com sucesso' } }],
        no:  [
          { id: 'b11', type: 'wait', config: { amount: 5, unit: 'dias' } },
          { id: 'b12', type: 'send', config: { channel: 'SMS', message: 'Você ainda não desbloqueou seu cartão. Aproveite agora!' } },
          { id: 'b13', type: 'end',  config: { reason: 'Jornada de cartão concluída' } }
        ]
      }},
    ],
    no: [{ id: 'b14', type: 'end', config: { reason: 'Sem cartão pré-aprovado' } }]
  }},
];

// ===== STATE =====
let blocks = [];
let selectedId = null;
let zoom = 1;
let totalDays = 0;
let addBlockTarget = null; // { blockId, branch: 'yes'|'no' } ou nulo para array principal

const MOCK_PECAS = [
  { id: 'p1', name: 'Bem-vindo à CAIXA', channel: 'Push', content: 'Sua conta foi aberta com sucesso. Acesse o app e descubra suas vantagens.' },
  { id: 'p2', name: 'Cadastre sua chave Pix', channel: 'SMS', content: 'Facilite suas transferências! Acesse o app e cadastre sua chave Pix agora mesmo.' },
  { id: 'p3', name: 'Seu cartão pré-aprovado aguarda', channel: 'Email', content: 'Temos um limite exclusivo para você. Acesse sua conta e desbloqueie seu cartão de crédito.' },
  { id: 'p4', name: 'Última chance para desbloquear', channel: 'SMS', content: 'Você ainda não desbloqueou seu cartão CAIXA. Desbloqueie hoje e não perca nossos benefícios.' },
  { id: 'p5', name: 'Oferta de Empréstimo', channel: 'Push', content: 'Crédito pré-aprovado com as melhores taxas. Simule agora no app.' },
];

// ===== RENDER =====
function renderCanvas() {
  const grid = document.getElementById('canvasGrid');
  let hint = document.getElementById('startHint');
  
  if (blocks.length === 0) {
    grid.innerHTML = '';
    if (hint) {
      grid.appendChild(hint);
      hint.style.display = 'flex';
    } else {
      grid.innerHTML = `
        <div class="canvas-start-hint" id="startHint" style="display:flex">
          <div class="start-hint-icon">✦</div>
          <div class="start-hint-title">Construa a jornada</div>
          <div class="start-hint-desc">Clique em "Quando acontecer" na barra lateral para começar</div>
          <button class="btn-primary" style="margin-top:16px" onclick="loadExample()">Carregar exemplo completo</button>
        </div>
      `;
    }
    return;
  }
  
  grid.innerHTML = '';
  blocks.forEach((b, i) => {
    if (i > 0) grid.appendChild(makeConnector());
    grid.appendChild(makeBlockEl(b));
  });
  updateStats();
}

function makeConnector() {
  const el = document.createElement('div');
  el.className = 'block-connector';
  return el;
}

function makeBlockEl(b, inBranch = false) {
  const meta = BLOCK_META[b.type];
  const wrapper = document.createElement('div');
  wrapper.className = 'canvas-block';

  if (b.type === 'check') {
    wrapper.innerHTML = `
      <div class="block-card type-check ${selectedId===b.id?'selected':''}" onclick="selectBlock('${b.id}')">
        <div class="block-header">
          <span class="block-type-badge">${meta.badge}</span>
          <span style="font-size:16px">${meta.icon}</span>
          <button class="block-delete" onclick="event.stopPropagation();deleteBlock('${b.id}')">✕</button>
        </div>
        <div class="block-body">${b.config.question || '<span class="block-empty">Defina a pergunta...</span>'}</div>
      </div>`;
    const branch = document.createElement('div');
    branch.className = 'branch-container';
    
    // Ramo SIM
    const yes = document.createElement('div'); yes.className = 'branch-side branch-yes';
    yes.innerHTML = '<div class="branch-label">✓ Sim</div>';
    (b.config.yes||[]).forEach((cb,i) => { if(i>0) yes.appendChild(makeBranchConnector()); yes.appendChild(makeBlockEl(cb, true)); });
    
    const addYes = document.createElement('div');
    addYes.innerHTML = `<button class="branch-add-btn" onclick="event.stopPropagation(); openAddMenu(event, '${b.id}', 'yes')">+ Adicionar passo</button>`;
    yes.appendChild(addYes);
    
    // Ramo NÃO
    const no  = document.createElement('div'); no.className  = 'branch-side branch-no';
    no.innerHTML  = '<div class="branch-label">✗ Não</div>';
    (b.config.no||[]).forEach((cb,i)  => { if(i>0)  no.appendChild(makeBranchConnector());  no.appendChild(makeBlockEl(cb,  true)); });
    
    const addNo = document.createElement('div');
    addNo.innerHTML = `<button class="branch-add-btn" onclick="event.stopPropagation(); openAddMenu(event, '${b.id}', 'no')">+ Adicionar passo</button>`;
    no.appendChild(addNo);
    
    branch.appendChild(yes); branch.appendChild(no);
    wrapper.appendChild(branch);
    return wrapper;
  }

  let body = '';
  if (b.type==='trigger') {
    const evts = (b.config.events||[]).join(` <strong style="color:var(--accent-light)">${b.config.operator||'E'}</strong> `);
    body = evts ? `A campanha começa quando:<br><strong>${evts}</strong>` : '<span class="block-empty">Defina o gatilho...</span>';
    if (b.config.extra) body += `<br><strong>${b.config.extra}</strong>`;
  } else if (b.type==='wait') {
    body = b.config.amount ? `Aguardar <strong>${b.config.amount} ${b.config.unit||'dia(s)'}</strong>` : '<span class="block-empty">Defina o tempo...</span>';
  } else if (b.type==='send') {
    body = b.config.piece ? `<strong>${b.config.piece.channel}</strong>: ${b.config.piece.name}` : '<span class="block-empty">Nenhuma peça selecionada</span>';
  } else if (b.type==='end') {
    body = b.config.reason ? `Motivo: <strong>${b.config.reason}</strong>` : 'A jornada é encerrada aqui';
  }

  wrapper.innerHTML = `
    <div class="block-card type-${b.type} ${selectedId===b.id?'selected':''}" onclick="selectBlock('${b.id}')">
      <div class="block-header">
        <span class="block-type-badge">${meta.badge}</span>
        <span style="font-size:16px">${meta.icon}</span>
        <button class="block-delete" onclick="event.stopPropagation();deleteBlock('${b.id}')">✕</button>
      </div>
      <div class="block-body">${body}</div>
    </div>`;
  return wrapper;
}

function makeBranchConnector() {
  const d = document.createElement('div'); d.className='block-connector'; return d;
}

// ===== INLINE MENU =====
function openAddMenu(e, blockId, branch) {
  addBlockTarget = { blockId, branch };
  const menu = document.getElementById('addBlockMenu');
  menu.style.display = 'flex';
  menu.style.left = e.clientX + 'px';
  menu.style.top = e.clientY + 'px';
}

document.addEventListener('click', e => {
  const menu = document.getElementById('addBlockMenu');
  if (menu && menu.style.display !== 'none' && !e.target.closest('.add-block-menu') && !e.target.closest('.branch-add-btn')) {
    menu.style.display = 'none';
    addBlockTarget = null;
  }
});

function confirmAddBlock(type) {
  document.getElementById('addBlockMenu').style.display = 'none';
  if (addBlockTarget) {
    const parent = findBlock(addBlockTarget.blockId, blocks);
    if (parent) {
      const id = 'b' + Date.now() + Math.floor(Math.random()*1000);
      const b = createBlockObj(id, type);
      parent.config[addBlockTarget.branch].push(b);
      renderCanvas();
      selectBlock(id);
      updateStats();
    }
    addBlockTarget = null;
  }
}

// ===== ACTIONS =====
function createBlockObj(id, type) {
  const defaults = { 
    trigger: {events:[],operator:'E',extra:''}, 
    wait: {amount:'',unit:'dias'}, 
    send: {piece:null}, 
    check: { question:'', yes:[], no:[] }, 
    end: {reason:''} 
  };
  return { id, type, config: JSON.parse(JSON.stringify(defaults[type])) };
}

function addBlock(type) {
  const id = 'b' + Date.now() + Math.floor(Math.random()*1000);
  const b = createBlockObj(id, type);
  
  // Se for o primeiro bloco ou a adição padrão da lateral, insere na raiz
  const lastEnd = blocks.length > 0 && blocks[blocks.length-1].type === 'end';
  if (lastEnd) blocks.splice(blocks.length-1, 0, b);
  else blocks.push(b);
  
  renderCanvas();
  selectBlock(id);
  updateStats();
}

function deleteBlock(id) {
  blocks = blocks.filter(b => b.id !== id);
  if (selectedId === id) { selectedId = null; showDetailEmpty(); }
  renderCanvas();
}

function selectBlock(id) {
  selectedId = id;
  renderCanvas();
  // Find block recursively
  const b = findBlock(id, blocks);
  if (b) renderDetailPanel(b);
}

function findBlock(id, list) {
  for (const b of list) {
    if (b.id === id) return b;
    if (b.type === 'check') {
      const y = findBlock(id, b.config.yes||[]);
      if (y) return y;
      const n = findBlock(id, b.config.no||[]);
      if (n) return n;
    }
  }
  return null;
}

// ===== DETAIL PANEL =====
function showDetailEmpty() {
  document.getElementById('detailEmpty').style.display = 'flex';
  document.getElementById('detailContent').style.display = 'none';
}

function renderDetailPanel(b) {
  document.getElementById('detailEmpty').style.display = 'none';
  const panel = document.getElementById('detailContent');
  panel.style.display = 'flex';
  const meta = BLOCK_META[b.type];
  let fields = '';

  if (b.type==='trigger') {
    fields = `
      <div class="detail-field">
        <div class="detail-label">Evento de início</div>
        <select class="detail-select" id="d_event" onchange="updateBlock('${b.id}','events',[this.value])">
          <option value="">Selecionar evento...</option>
          <option ${(b.config.events||[]).includes('Cliente abrindo conta')?'selected':''}>Cliente abrindo conta</option>
          <option ${(b.config.events||[]).includes('Cliente fazendo login')?'selected':''}>Cliente fazendo login</option>
          <option ${(b.config.events||[]).includes('Cliente movimentando conta')?'selected':''}>Cliente movimentando conta</option>
          <option ${(b.config.events||[]).includes('Cliente acessando app')?'selected':''}>Cliente acessando app</option>
        </select>
      </div>
      <div class="detail-field">
        <div class="detail-label">Operador</div>
        <select class="detail-select" onchange="updateBlock('${b.id}','operator',this.value)">
          <option value="E" ${b.config.operator==='E'?'selected':''}>E (ambos devem ocorrer)</option>
          <option value="OU" ${b.config.operator==='OU'?'selected':''}>OU (qualquer um)</option>
        </select>
      </div>
      <div class="detail-field">
        <div class="detail-label">Condição adicional</div>
        <input class="detail-input" value="${b.config.extra||''}" placeholder="Ex: movimentação nos últimos 30 dias" oninput="updateBlock('${b.id}','extra',this.value)"/>
      </div>`;
  } else if (b.type==='wait') {
    fields = `
      <div class="detail-field">
        <div class="detail-label">Aguardar por</div>
        <div class="detail-row">
          <input class="detail-input" type="number" min="1" value="${b.config.amount||''}" placeholder="0" oninput="updateBlock('${b.id}','amount',this.value)"/>
          <select class="detail-select" onchange="updateBlock('${b.id}','unit',this.value)">
            <option value="minutos" ${b.config.unit==='minutos'?'selected':''}>minutos</option>
            <option value="horas"   ${b.config.unit==='horas'?'selected':''}>horas</option>
            <option value="dias"    ${b.config.unit==='dias'?'selected':''}>dias</option>
          </select>
        </div>
      </div>`;
  } else if (b.type==='send') {
    const p = b.config.piece;
    fields = `
      <div class="detail-field">
        <div class="detail-label">Peça selecionada</div>
        ${p ? `
          <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
              <strong style="color:var(--text);font-size:13px">${p.name}</strong>
              <span class="peca-channel ${p.channel.toLowerCase()}" style="font-size:10px">${p.channel}</span>
            </div>
            <div style="color:var(--muted);font-size:12px;line-height:1.4">${p.content}</div>
          </div>
        ` : `
          <div style="background:rgba(255,255,255,0.02);border:1px dashed var(--border-light);border-radius:10px;padding:16px;text-align:center;color:var(--muted);font-size:12px;margin-bottom:8px">
            Nenhuma peça selecionada para este bloco de envio.
          </div>
        `}
        <button class="btn-ghost" style="width:100%;border-color:var(--accent);color:var(--accent-light)" onclick="openPecasModal('${b.id}')">
          ${p ? 'Trocar peça' : 'Selecionar Peça'}
        </button>
      </div>`;
  } else if (b.type==='check') {
    fields = `
      <div class="detail-field">
        <div class="detail-label">Pergunta de verificação</div>
        <select class="detail-select" onchange="updateBlock('${b.id}','question',this.value)">
          <option value="">Selecionar verificação...</option>
          <option value="Cliente possui cartão pré-aprovado?" ${b.config.question==='Cliente possui cartão pré-aprovado?'?'selected':''}>Cliente possui cartão pré-aprovado?</option>
          <option value="Cliente desbloqueou o cartão?" ${b.config.question==='Cliente desbloqueou o cartão?'?'selected':''}>Cliente desbloqueou o cartão?</option>
          <option value="Cliente cadastrou chave Pix?" ${b.config.question==='Cliente cadastrou chave Pix?'?'selected':''}>Cliente cadastrou chave Pix?</option>
          <option value="Cliente possui saldo acima de R$5.000?" ${b.config.question==='Cliente possui saldo acima de R$5.000?'?'selected':''}>Cliente possui saldo acima de R$5.000?</option>
          <option value="Cliente acessou o app nos últimos 7 dias?" ${b.config.question==='Cliente acessou o app nos últimos 7 dias?'?'selected':''}>Cliente acessou o app nos últimos 7 dias?</option>
        </select>
      </div>
      <div style="background:var(--card);border-radius:10px;padding:12px;font-size:12px;color:var(--muted);border:1px solid var(--border)">
        ✓ <strong style="color:#10b981">Sim</strong> e ✗ <strong style="color:#ef4444">Não</strong> criam caminhos diferentes no canvas automaticamente.
      </div>`;
  } else if (b.type==='end') {
    fields = `
      <div class="detail-field">
        <div class="detail-label">Motivo do encerramento</div>
        <select class="detail-select" onchange="updateBlock('${b.id}','reason',this.value)">
          <option value="">Selecionar motivo...</option>
          <option value="Conversão realizada" ${b.config.reason==='Conversão realizada'?'selected':''}>Conversão realizada</option>
          <option value="Sem elegibilidade" ${b.config.reason==='Sem elegibilidade'?'selected':''}>Sem elegibilidade</option>
          <option value="Jornada concluída" ${b.config.reason==='Jornada concluída'?'selected':''}>Jornada concluída</option>
          <option value="Limite de contatos atingido" ${b.config.reason==='Limite de contatos atingido'?'selected':''}>Limite de contatos atingido</option>
        </select>
      </div>`;
  }

  panel.innerHTML = `
    <div class="detail-block-type">
      <div class="detail-block-icon">${meta.icon}</div>
      <div>
        <div class="detail-block-name">${meta.label}</div>
        <div class="detail-block-subtitle">Configure as propriedades do bloco</div>
      </div>
    </div>
    ${fields}
    <button class="detail-save-btn" onclick="renderCanvas()">✓ Aplicar configuração</button>
  `;
}

function updateBlock(id, key, value) {
  const b = findBlock(id, blocks);
  if (b) { b.config[key] = value; }
}

// ===== ZOOM =====
function zoomIn()  { zoom = Math.min(zoom + 0.1, 2);   applyZoom(); }
function zoomOut() { zoom = Math.max(zoom - 0.1, 0.4); applyZoom(); }
function resetZoom() { zoom = 1; applyZoom(); }
function applyZoom() {
  document.getElementById('canvasGrid').style.transform = `scale(${zoom})`;
  document.getElementById('canvasGrid').style.transformOrigin = 'top center';
  document.getElementById('zoomLabel').textContent = Math.round(zoom*100) + '%';
}

// ===== STATS =====
function updateStats() {
  let count = countBlocks(blocks);
  let paths = 1 + countChecks(blocks);
  let days  = sumDays(blocks);
  document.getElementById('statBlocks').textContent = count;
  document.getElementById('statPaths').textContent  = paths;
  document.getElementById('statDays').textContent   = days;
}
function countBlocks(list) { let n=0; for(const b of list){ n++; if(b.type==='check'){n+=countBlocks(b.config.yes||[]);n+=countBlocks(b.config.no||[]);} } return n; }
function countChecks(list) { let n=0; for(const b of list){ if(b.type==='check'){n++;n+=countChecks(b.config.yes||[]);n+=countChecks(b.config.no||[]);} } return n; }
function sumDays(list) { let d=0; for(const b of list){ if(b.type==='wait'&&b.config.amount){ const a=parseInt(b.config.amount)||0; d+= b.config.unit==='horas'?Math.ceil(a/24):(b.config.unit==='minutos'?0:a);} if(b.type==='check'){d+=Math.max(sumDays(b.config.yes||[]),sumDays(b.config.no||[]));} } return d; }

// ===== LOAD EXAMPLE =====
function loadExample() {
  blocks = JSON.parse(JSON.stringify(EXAMPLE_FLOW));
  selectedId = null;
  showDetailEmpty();
  renderCanvas();
  document.getElementById('startHint') && (document.getElementById('startHint').style.display = 'none');
}

function clearCanvas() {
  blocks = []; selectedId = null; showDetailEmpty(); renderCanvas();
}

// ===== SIMULATION =====
function runSimulation() {
  const total = countBlocks(blocks);
  if (total === 0) { alert('Adicione blocos ao canvas antes de simular.'); return; }
  const days = sumDays(blocks);
  const msg = `✅ Simulação concluída!\n\n📦 ${total} blocos\n📅 Duração estimada: ${days} dias\n👥 Público estimado: ~48.200 pessoas\n📨 Envios previstos: ~312.000 mensagens`;
  alert(msg);
}

// ===== SETUP PAGE INTERACTIONS =====
function toggleSelect(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const trigger = el.querySelector('.select-trigger');
  const dropdown = el.querySelector('.select-dropdown');
  const isOpen = dropdown.classList.contains('open');
  document.querySelectorAll('.select-dropdown').forEach(d => d.classList.remove('open'));
  document.querySelectorAll('.select-trigger').forEach(t => t.classList.remove('open'));
  if (!isOpen) { dropdown.classList.add('open'); trigger.classList.add('open'); }
}

function selectOption(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.querySelector('.select-value').textContent = value;
  el.querySelector('.select-value').classList.remove('muted');
  el.querySelector('.select-dropdown').classList.remove('open');
  el.querySelector('.select-trigger').classList.remove('open');
  updateSummary();
  updateReach();
}

function toggleChannel(el) {
  el.classList.toggle('active');
}

function updateSummary() {
  const items = [];
  const pub = document.querySelector('#selectPublico .select-value');
  const seg = document.querySelector('#selectSegmento .select-value');
  const obj = document.querySelector('#selectObjetivo .select-value');
  if (pub && !pub.classList.contains('muted')) items.push({k:'Público', v: pub.textContent});
  if (seg && !seg.classList.contains('muted')) items.push({k:'Segmento', v: seg.textContent});
  if (obj && !obj.classList.contains('muted')) items.push({k:'Objetivo', v: obj.textContent});
  const list = document.getElementById('summaryList');
  if (!list) return;
  if (items.length === 0) { list.innerHTML='<div class="summary-empty">Preencha os campos para ver o resumo aqui</div>'; return; }
  list.innerHTML = items.map(i=>`<div class="summary-item"><span class="summary-key">${i.k}:</span><span class="summary-val">${i.v}</span></div>`).join('');
}

function updateReach() {
  const pub = document.querySelector('#selectPublico .select-value');
  const seg = document.querySelector('#selectSegmento .select-value');
  if (!pub||!seg||pub.classList.contains('muted')||seg.classList.contains('muted')) return;
  const estimates = {
    'Clientes novos (até 30 dias)': 48200,
    'Clientes ativos': 312400,
    'Clientes inativos (90+ dias)': 89100,
    'Clientes premium': 24600,
    'Clientes digitais': 198300,
  };
  const val = estimates[seg.textContent] || 60000;
  const pct = Math.min(100, Math.round(val/4000));
  const elNumber = document.getElementById('reachNumber');
  const elBar = document.getElementById('reachBar');
  const elHint = document.getElementById('reachHint');
  if (elNumber) elNumber.textContent = val.toLocaleString('pt-BR');
  if (elBar) elBar.style.width = pct + '%';
  if (elHint) elHint.textContent = `Estimativa baseada na segmentação selecionada`;
}

function addFilter() {
  const list = document.getElementById('filtersList');
  if (!list) return;
  const row = document.createElement('div');
  row.className = 'filter-row';
  row.innerHTML = `
    <select class="detail-select" style="flex:1;font-size:12px">
      <option>Idade</option><option>Renda</option><option>Saldo em conta</option><option>Tempo de relacionamento</option>
    </select>
    <select class="detail-select" style="width:90px;font-size:12px">
      <option>maior que</option><option>menor que</option><option>igual a</option>
    </select>
    <input class="detail-input" placeholder="valor" style="width:80px;font-size:12px"/>
    <button class="filter-remove" onclick="this.parentElement.remove()">✕</button>`;
  list.appendChild(row);
}

function applyTemplate(name) {
  const names = {
    boasvindas: 'Boas-vindas — Conta Nova',
    cartao: 'Ativação de Cartão Pré-aprovado',
    reengajamento: 'Reengajamento — 90 dias'
  };
  const n = names[name] || 'Nova Campanha';
  // Preenche campos de nome
  const campNome  = document.getElementById('campNome');
  const campName  = document.getElementById('campaignName');
  if (campNome)  campNome.value  = n;
  if (campName)  campName.value  = n;
  // Carrega jornada de exemplo
  loadExample();
  // Navega para etapa 2 (builder)
  if (typeof goToStep2 === 'function') goToStep2();
}

// ===== MODAL PEÇAS =====
let pecaTargetBlock = null;

function openPecasModal(blockId) {
  pecaTargetBlock = blockId;
  document.getElementById('pecasModal').style.display = 'flex';
  document.getElementById('pecaSearch').value = '';
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.filter-tab').classList.add('active'); // O primeiro "Todos"
  renderPecasList(MOCK_PECAS);
}

function closePecasModal() {
  document.getElementById('pecasModal').style.display = 'none';
  pecaTargetBlock = null;
}

function filterPecas() {
  const query = document.getElementById('pecaSearch').value.toLowerCase();
  const activeTab = document.querySelector('.filter-tab.active').textContent;
  
  const filtered = MOCK_PECAS.filter(p => {
    const matchTxt = p.name.toLowerCase().includes(query) || p.content.toLowerCase().includes(query) || p.channel.toLowerCase().includes(query);
    const matchCat = activeTab === 'Todos' || p.channel === activeTab;
    return matchTxt && matchCat;
  });
  renderPecasList(filtered);
}

function filterPecasCat(cat, btn) {
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  filterPecas();
}

function renderPecasList(list) {
  const grid = document.getElementById('pecasList');
  if (list.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted)">Nenhuma peça encontrada com este filtro.</div>';
    return;
  }
  
  grid.innerHTML = list.map(p => `
    <div class="peca-card" onclick="selectPeca('${p.id}')">
      <div class="peca-header">
        <div class="peca-name">${p.name}</div>
        <span class="peca-channel ${p.channel.toLowerCase()}">${p.channel}</span>
      </div>
      <div class="peca-content">${p.content}</div>
    </div>
  `).join('');
}

function selectPeca(pecaId) {
  const peca = MOCK_PECAS.find(p => p.id === pecaId);
  if (peca && pecaTargetBlock) {
    updateBlock(pecaTargetBlock, 'piece', peca);
    closePecasModal();
    selectBlock(pecaTargetBlock); // Refresh details & canvas
  }
}


// ===== CLOSE DROPDOWNS ON OUTSIDE CLICK =====
document.addEventListener('click', e => {
  if (!e.target.closest('.select-custom')) {
    document.querySelectorAll('.select-dropdown').forEach(d => d.classList.remove('open'));
    document.querySelectorAll('.select-trigger').forEach(t => t.classList.remove('open'));
  }
});

// ===== INIT =====
// Não chama renderCanvas() aqui pois o canvas pode não estar visível ainda.
// renderCanvas() é chamado dentro de goToStep2() quando o usuário navega.
