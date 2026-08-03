import React from 'react';

export interface JornadaNode {
  type: 'trigger' | 'send' | 'conditional' | 'end' | 'connector';
  label?: string;
  channel?: string;
  delay?: string;
  piece?: string;
  question?: string;
  yes?: JornadaNode[];
  no?: JornadaNode[];
  reason?: string;
  direction?: 'forward' | 'backward';
  targetLabel?: string;
  targetStepNum?: number;
  maxRepetitions?: number;
}

// Inline Styles
const containerStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e3e7f0',
  borderRadius: '14px',
  padding: '32px 36px',
  fontSize: '16px',
  lineHeight: '2.2',
  color: '#2b2f3b',
  fontFamily: 'inherit',
  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
};

const delayChipStyle: React.CSSProperties = {
  background: '#f0f3fa',
  color: '#3b4466',
  fontSize: '12px',
  fontWeight: 700,
  padding: '1px 9px',
  borderRadius: '20px',
  verticalAlign: '2px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  lineHeight: 'normal',
  margin: '0 4px',
};

const seSimStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '.07em',
  textTransform: 'uppercase',
  color: '#9aa1b2',
  display: 'block',
  margin: '20px 0 4px',
};

const seNaoStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '.07em',
  textTransform: 'uppercase',
  color: '#c5c9d6',
  display: 'block',
  margin: '16px 0 4px',
  paddingLeft: '22px',
};

const getChannelBadgeStyle = (channel: string): React.CSSProperties => {
  let bg = '#E6F1FB';
  let color = '#0C447C';
  const c = channel.toUpperCase();
  if (c === 'PUSH') {
    bg = '#EEEDFE';
    color = '#3C3489';
  } else if (c === 'EMAIL' || c === 'E-MAIL') {
    bg = '#E6F1FB';
    color = '#0C447C';
  } else if (c === 'SMS') {
    bg = '#E1F5EE';
    color = '#0F6E56';
  } else if (c === 'WHATSAPP') {
    bg = '#E1F5EE';
    color = '#0F6E56';
  }
  return {
    background: bg,
    color: color,
    fontSize: '11.5px',
    fontWeight: 700,
    padding: '1px 8px',
    borderRadius: '5px',
    verticalAlign: '2px',
    display: 'inline-block',
    lineHeight: 'normal',
    margin: '0 4px',
  };
};

export default function JornadaExplicada({ nodes }: { nodes: JornadaNode[] }) {
  const renderedChannels = new Set<string>();
  let conditionalCount = 0;

  const renderNodesList = (list: JornadaNode[], depth: number, isYesBranch: boolean): React.ReactNode => {
    return list.map((node, index) => {
      const key = `${node.type}-${depth}-${index}`;

      if (node.type === 'trigger') {
        return (
          <div key={key} style={{ marginBottom: '16px' }}>
            A campanha será iniciada assim que um cliente <strong style={{ fontWeight: 700 }}>{node.label}</strong>.
          </div>
        );
      }

      if (node.type === 'send') {
        const isSubsequentSend = index > 0 && list[index - 1].type === 'send';
        const channelKey = (node.channel || '').toUpperCase();
        const hasSameChannelBefore = renderedChannels.has(channelKey);

        // Track this channel as used in the narrative
        renderedChannels.add(channelKey);

        let prefix = 'Após ';
        let verbPhrase = '';

        if (isSubsequentSend) {
          prefix = 'Em seguida, após ';
          verbPhrase = 'será enviado ';
        } else {
          prefix = 'Após ';
          if (hasSameChannelBefore) {
            verbPhrase = 'será enviado um novo ';
          } else {
            verbPhrase = 'o cliente receberá ';
          }
        }

        return (
          <div key={key} style={{ marginBottom: '16px' }}>
            {prefix}
            <span style={delayChipStyle}>⏱️ {node.delay}</span>
            {verbPhrase}
            {!isSubsequentSend && !hasSameChannelBefore && 'um '}
            <span style={getChannelBadgeStyle(node.channel || '')}>{node.channel}</span>
            {" com a mensagem "}
            <strong style={{ fontWeight: 700 }}>"{node.piece}"</strong>.
          </div>
        );
      }

      if (node.type === 'conditional') {
        conditionalCount++;
        const isFirstConditional = conditionalCount === 1;

        // Clean question (remove trailing question mark)
        let cleanQuestion = node.question || '';
        if (cleanQuestion.endsWith('?')) {
          cleanQuestion = cleanQuestion.slice(0, -1);
        }
        cleanQuestion = cleanQuestion.trim();

        return (
          <div key={key} style={{ marginBottom: '16px' }}>
            <div>
              {isFirstConditional 
                ? "Nesse momento, o sistema verificará se " 
                : "O sistema então verificará se "}
              <strong style={{ fontWeight: 700 }}>{cleanQuestion}</strong>.
            </div>

            <div>
              <span style={seSimStyle}>SE SIM</span>
              <div style={{ paddingLeft: '22px' }}>
                {renderNodesList(node.yes || [], depth + 1, true)}
              </div>
            </div>

            <div>
              <span style={seNaoStyle}>SE NÃO</span>
              <div style={{ paddingLeft: '22px' }}>
                {renderNodesList(node.no || [], depth + 1, false)}
              </div>
            </div>
          </div>
        );
      }

      if (node.type === 'end') {
        const reason = node.reason || '';
        const r = reason.toLowerCase();
        let text: React.ReactNode;

        if (r.includes('conversão')) {
          text = (
            <span>
              A campanha será encerrada automaticamente, registrando uma <strong style={{ fontWeight: 700 }}>conversão realizada</strong>.
            </span>
          );
        } else if (isYesBranch) {
          text = (
            <span>
              A campanha seguirá normalmente para as próximas etapas configuradas.
            </span>
          );
        } else {
          text = (
            <span>
              A campanha será então <strong style={{ fontWeight: 700 }}>concluída</strong>.
            </span>
          );
        }

        return (
          <div key={key} style={{ marginBottom: '16px' }}>
            {text}
          </div>
        );
      }

      if (node.type === 'connector') {
        const isBack = node.direction === 'backward';
        const timingText = node.delay && node.delay !== 'imediatamente'
          ? <><span style={delayChipStyle}>⏱️ {node.delay}</span>, </>
          : '';

        if (isBack) {
          return (
            <div key={key} style={{ marginBottom: '16px' }}>
              Nesse ponto, o fluxo retornará para a <strong style={{ fontWeight: 700 }}>etapa {node.targetStepNum || '?'}</strong>{' '}
              ({node.targetLabel || 'etapa anterior'}), repetindo no máximo{' '}
              <strong style={{ fontWeight: 700 }}>{node.maxRepetitions || '?'}x</strong>.
              {timingText && <> {timingText}</>}
            </div>
          );
        } else {
          return (
            <div key={key} style={{ marginBottom: '16px' }}>
              O fluxo seguirá para a <strong style={{ fontWeight: 700 }}>etapa {node.targetStepNum || '?'}</strong>{' '}
              ({node.targetLabel || 'etapa posterior'}).
              {timingText && <> {timingText}</>}
            </div>
          );
        }
      }

      return null;
    });
  };

  return (
    <div style={containerStyle}>
      {renderNodesList(nodes, 0, false)}
    </div>
  );
}

// Mapper to convert canvas blocks array into JornadaNode[]
export function mapBlocksToJornadaNodes(list: any[], allBlocks?: any[], numbersMap?: Record<string, number>): JornadaNode[] {
  const rootBlocks = allBlocks || list;
  const nodes: JornadaNode[] = [];

  const getDelayText = (w: any) => {
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
      return `${amt} ${unit}`;
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

  list.forEach(b => {
    if (b.type === 'trigger') {
      const label = b.config?.events?.[0] || 'abrir uma conta';
      let triggerLabel = label;
      if (triggerLabel.toLowerCase().startsWith('cliente ')) {
        const sub = triggerLabel.substring(8).trim();
        if (sub.startsWith('abriu')) {
          triggerLabel = 'abrir' + sub.substring(5);
        } else if (sub.startsWith('solicitou')) {
          triggerLabel = 'solicitar' + sub.substring(9);
        } else {
          triggerLabel = sub.charAt(0).toLowerCase() + sub.slice(1);
        }
      }
      nodes.push({
        type: 'trigger',
        label: triggerLabel
      });
    } else if (b.type === 'send') {
      const channel = b.config?.piece?.channel || b.config?.channel || 'SMS';
      const pieceName = b.config?.piece?.name || b.config?.pecaName || 'Mensagem';
      const delay = getDelayText(b.config?.wait);
      nodes.push({
        type: 'send',
        channel: channel,
        delay: delay,
        piece: pieceName
      });
    } else if (b.type === 'check') {
      const question = b.config?.question || 'realizou a ação esperada';
      
      // Recursively map branches
      const yesNodes = mapBlocksToJornadaNodes(b.config?.yes || [], rootBlocks, numbersMap);
      const lastYesBlock = yesNodes[yesNodes.length - 1];
      if (!lastYesBlock || (lastYesBlock.type !== 'end' && lastYesBlock.type !== 'conditional')) {
        yesNodes.push({ type: 'end', reason: '' });
      }

      const noNodes = mapBlocksToJornadaNodes(b.config?.no || [], rootBlocks, numbersMap);
      const lastNoBlock = noNodes[noNodes.length - 1];
      if (!lastNoBlock || (lastNoBlock.type !== 'end' && lastNoBlock.type !== 'conditional')) {
        noNodes.push({ type: 'end', reason: '' });
      }

      nodes.push({
        type: 'conditional',
        question: question,
        yes: yesNodes,
        no: noNodes
      });
    } else if (b.type === 'end' || b.id === 'end_auto') {
      const reason = b.config?.reason || 'Campanha concluída';
      nodes.push({
        type: 'end',
        reason: reason
      });
    } else if (b.type === 'connector') {
      const delayText = b.config?.timing === 'delay'
        ? `${b.config.delay?.amount || '1'} ${b.config.delay?.unit || 'dia'}`
        : 'imediatamente';
      // Resolve target block label from rootBlocks
      let resolvedLabel = '';
      let resolvedStepNum = 0;
      if (b.config?.targetBlockId) {
        const findInAll = (searchList: any[], targetId: string): any => {
          for (const bl of searchList) {
            if (bl.id === targetId) return bl;
            if (bl.type === 'check') {
              const y = findInAll(bl.config?.yes || [], targetId);
              if (y) return y;
              const n = findInAll(bl.config?.no || [], targetId);
              if (n) return n;
            }
          }
          return null;
        };
        const target = findInAll(rootBlocks, b.config.targetBlockId);
        if (target) {
          if (target.type === 'trigger') resolvedLabel = (target.config?.events || [])[0] || 'Início';
          else if (target.type === 'send') resolvedLabel = target.config?.piece?.name || 'Envio';
          else if (target.type === 'check') resolvedLabel = target.config?.question || 'Verificação';
          else resolvedLabel = 'Etapa';
        }
        if (numbersMap && b.config.targetBlockId in numbersMap) {
          resolvedStepNum = numbersMap[b.config.targetBlockId];
        }
      }
      nodes.push({
        type: 'connector',
        direction: b.config?.direction || 'forward',
        delay: delayText,
        targetLabel: resolvedLabel,
        targetStepNum: resolvedStepNum,
        maxRepetitions: b.config?.maxRepetitions || 0
      });
    }
  });

  return nodes;
}
