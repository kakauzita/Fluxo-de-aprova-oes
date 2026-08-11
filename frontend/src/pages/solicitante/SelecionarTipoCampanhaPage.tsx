import React from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Send, GitBranch } from 'lucide-react'

export default function SelecionarTipoCampanhaPage() {
  const navigate = useNavigate()

  const handleClose = () => {
    navigate('/pecas')
  }

  return (
    <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="modal" style={{ width: '600px', maxWidth: '90%', padding: '32px', position: 'relative', borderRadius: '12px', background: 'white', border: 'none', boxShadow: 'var(--shadow-lg)' }}>
        <button 
          onClick={handleClose} 
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
          <X size={20} />
        </button>

        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--caixa-blue)', marginBottom: '8px', marginTop: 0 }}>Nova campanha</h2>
        <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '32px', marginTop: 0 }}>Como você quer montar essa comunicação?</p>

        <div style={{ display: 'flex', gap: '24px', flexDirection: 'row' }}>
          {/* Card Disparo Unico */}
          <div 
            onClick={() => navigate('/campanhas/nova/disparo')}
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
              <Send size={32} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Disparo único</h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.4' }}>Uma peça, um público, um envio.</p>
          </div>

          {/* Card Jornada */}
          <div 
            onClick={() => navigate('/campanhas/nova/jornada')}
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
              <GitBranch size={32} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Jornada</h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.4' }}>Múltiplas peças com condições e tempo, montadas no canvas.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
