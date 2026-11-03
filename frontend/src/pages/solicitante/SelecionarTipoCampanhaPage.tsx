
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Send, GitBranch } from 'lucide-react'

export default function SelecionarTipoCampanhaPage() {
  const navigate = useNavigate()

  const handleClose = () => {
    navigate('/pecas')
  }

  // ESC key listener — WCAG 2.1.2 e eMAG 2.2
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div
      className="modal-overlay"
      onClick={handleClose}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-tipo-campanha-title"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '600px', maxWidth: '90%', padding: '32px', position: 'relative', borderRadius: '12px', background: 'white', border: 'none', boxShadow: 'var(--shadow-lg)' }}
      >
        <button 
          onClick={handleClose}
          aria-label="Fechar seleção de tipo de campanha"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            borderRadius: '50%'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          <X size={20} aria-hidden="true" />
        </button>

        <h2 id="modal-tipo-campanha-title" style={{ fontSize: '24px', fontWeight: 700, color: 'var(--caixa-blue)', marginBottom: '8px', marginTop: 0 }}>Nova campanha</h2>
        <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '32px', marginTop: 0 }}>Como você quer montar sua campanha?</p>

        <div style={{ display: 'flex', gap: '24px', flexDirection: 'row' }}>
          {/* Card Disparo Unico */}
          <div 
            role="button"
            tabIndex={0}
            onClick={() => navigate('/campanhas/nova/disparo')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                navigate('/campanhas/nova/disparo')
              }
            }}
            style={{
              flex: 1,
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              padding: '24px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '16px',
              background: '#ffffff'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--caixa-blue)'
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 92, 169, 0.12)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <div style={{ background: '#e8f0fe', color: 'var(--caixa-blue)', padding: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Send size={32} aria-hidden="true" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Campanha simples</h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.4' }}>Crie sua campanha usando uma única peça de comunicação e envie seu público alvo por arquivo.</p>
          </div>

          {/* Card Jornada */}
          <div 
            role="button"
            tabIndex={0}
            onClick={() => navigate('/campanhas/nova/jornada')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                navigate('/campanhas/nova/jornada')
              }
            }}
            style={{
              flex: 1,
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              padding: '24px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '16px',
              background: '#ffffff'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--caixa-blue)'
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 92, 169, 0.12)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <div style={{ background: '#e8f0fe', color: 'var(--caixa-blue)', padding: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GitBranch size={32} aria-hidden="true" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Campanha com jornada</h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.4' }}>Combine várias peças, condições, regras e loops para definir diferentes caminhos de comunicação com múltiplas etapas.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
