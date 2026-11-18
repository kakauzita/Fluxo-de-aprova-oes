import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

export interface TourStep {
  target: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  offset?: { x?: number; y?: number };
}

export interface GuidedTourProps {
  isOpen: boolean;
  steps: TourStep[];
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onFinish: () => void;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({
  isOpen,
  steps,
  currentStep,
  onNext,
  onPrev,
  onSkip,
  onFinish,
}) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; arrowPlacement: string }>({
    top: 0,
    left: 0,
    arrowPlacement: 'left',
  });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];

  const updatePosition = useCallback(() => {
    if (!isOpen || !step) {
      setTargetRect(null);
      return;
    }

    const el = document.querySelector(step.target);
    if (!el) {
      setTargetRect(null);
      return;
    }

    // Scroll into view if not visible
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    const rect = el.getBoundingClientRect();
    setTargetRect(rect);

    const tooltipEl = tooltipRef.current;
    const tooltipWidth = tooltipEl ? tooltipEl.offsetWidth : 320;
    const tooltipHeight = tooltipEl ? tooltipEl.offsetHeight : 190;
    const padding = 16;
    const arrowOffset = 14;

    const placement = step.placement || 'auto';
    let top = 0;
    let left = 0;
    let arrow = 'left';

    // Auto determine placement if needed
    let effectivePlacement = placement;
    if (placement === 'auto') {
      const spaceRight = window.innerWidth - rect.right;
      const spaceLeft = rect.left;
      const spaceBottom = window.innerHeight - rect.bottom;

      if (spaceRight >= tooltipWidth + padding) {
        effectivePlacement = 'right';
      } else if (spaceLeft >= tooltipWidth + padding) {
        effectivePlacement = 'left';
      } else if (spaceBottom >= tooltipHeight + padding) {
        effectivePlacement = 'bottom';
      } else {
        effectivePlacement = 'top';
      }
    }

    if (effectivePlacement === 'right') {
      left = rect.right + arrowOffset + (step.offset?.x || 0);
      top = rect.top + rect.height / 2 - tooltipHeight / 2 + (step.offset?.y || 0);
      arrow = 'left';
    } else if (effectivePlacement === 'left') {
      left = rect.left - tooltipWidth - arrowOffset + (step.offset?.x || 0);
      top = rect.top + rect.height / 2 - tooltipHeight / 2 + (step.offset?.y || 0);
      arrow = 'right';
    } else if (effectivePlacement === 'top') {
      left = rect.left + rect.width / 2 - tooltipWidth / 2 + (step.offset?.x || 0);
      top = rect.top - tooltipHeight - arrowOffset + (step.offset?.y || 0);
      arrow = 'bottom';
    } else {
      // bottom
      left = rect.left + rect.width / 2 - tooltipWidth / 2 + (step.offset?.x || 0);
      top = rect.bottom + arrowOffset + (step.offset?.y || 0);
      arrow = 'top';
    }

    // Keep within window viewport boundaries
    if (left < padding) left = padding;
    if (left + tooltipWidth > window.innerWidth - padding) {
      left = window.innerWidth - tooltipWidth - padding;
    }
    if (top < padding) top = padding;
    if (top + tooltipHeight > window.innerHeight - padding) {
      top = window.innerHeight - tooltipHeight - padding;
    }

    setTooltipPos({ top, left, arrowPlacement: arrow });
  }, [isOpen, step]);

  useEffect(() => {
    if (!isOpen) return;

    // Run immediately and after slight delay for DOM painting
    updatePosition();
    const timer = setTimeout(updatePosition, 60);

    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, currentStep, updatePosition]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStep < steps.length - 1) {
          onNext();
        } else {
          onFinish();
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStep > 0) {
          onPrev();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, steps.length, onNext, onPrev, onSkip, onFinish]);

  if (!isOpen || !step) return null;

  const isLast = currentStep === steps.length - 1;

  // Arrow style
  const getArrowStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      width: 0,
      height: 0,
      borderStyle: 'solid',
    };

    if (tooltipPos.arrowPlacement === 'left') {
      return {
        ...base,
        top: targetRect ? Math.max(16, Math.min(tooltipRef.current?.offsetHeight ? tooltipRef.current.offsetHeight - 24 : 150, targetRect.top + targetRect.height / 2 - tooltipPos.top - 6)) : '50%',
        left: -8,
        borderWidth: '7px 8px 7px 0',
        borderColor: 'transparent #ffffff transparent transparent',
      };
    }
    if (tooltipPos.arrowPlacement === 'right') {
      return {
        ...base,
        top: targetRect ? Math.max(16, Math.min(tooltipRef.current?.offsetHeight ? tooltipRef.current.offsetHeight - 24 : 150, targetRect.top + targetRect.height / 2 - tooltipPos.top - 6)) : '50%',
        right: -8,
        borderWidth: '7px 0 7px 8px',
        borderColor: 'transparent transparent transparent #ffffff',
      };
    }
    if (tooltipPos.arrowPlacement === 'top') {
      return {
        ...base,
        left: targetRect ? Math.max(16, Math.min(tooltipRef.current?.offsetWidth ? tooltipRef.current.offsetWidth - 24 : 280, targetRect.left + targetRect.width / 2 - tooltipPos.left - 6)) : '50%',
        top: -8,
        borderWidth: '0 7px 8px 7px',
        borderColor: 'transparent transparent #ffffff transparent',
      };
    }
    // bottom
    return {
      ...base,
      left: targetRect ? Math.max(16, Math.min(tooltipRef.current?.offsetWidth ? tooltipRef.current.offsetWidth - 24 : 280, targetRect.left + targetRect.width / 2 - tooltipPos.left - 6)) : '50%',
      bottom: -8,
      borderWidth: '8px 7px 0 7px',
      borderColor: '#ffffff transparent transparent transparent',
    };
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, pointerEvents: 'auto' }}>
      {/* Dimmed backdrop with spotlight cutout */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            top: targetRect.top - 5,
            left: targetRect.left - 5,
            width: targetRect.width + 10,
            height: targetRect.height + 10,
            borderRadius: 8,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.55), 0 0 15px rgba(0, 92, 169, 0.45)',
            border: '2px solid #005CA9',
            pointerEvents: 'none',
            transition: 'all 0.25s ease',
          }}
        />
      )}

      {/* Tooltip Card */}
      <div
        ref={tooltipRef}
        style={{
          position: 'fixed',
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: 320,
          maxWidth: 'calc(100vw - 32px)',
          background: '#ffffff',
          borderRadius: 12,
          padding: '20px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.22), 0 2px 6px rgba(0, 0, 0, 0.08)',
          zIndex: 100000,
          transition: 'top 0.25s ease, left 0.25s ease',
          animation: 'fadeIn 0.2s ease',
          fontFamily: 'inherit',
        }}
      >
        {/* Tooltip arrow */}
        <div style={getArrowStyle()} />

        {/* Close Button */}
        <button
          onClick={onSkip}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#1e293b')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          title="Fechar tutorial"
          aria-label="Fechar tutorial"
        >
          <X size={16} />
        </button>

        {/* Step indicator */}
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#005CA9',
            marginBottom: 6,
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
          }}
        >
          Passo {currentStep + 1} de {steps.length}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: '#0f172a',
            marginBottom: 8,
            lineHeight: 1.3,
            paddingRight: 20,
          }}
        >
          {step.title}
        </div>

        {/* Content */}
        <div
          style={{
            fontSize: 13,
            color: '#475569',
            lineHeight: 1.45,
            marginBottom: 20,
          }}
        >
          {step.content}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={onPrev}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#475569',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: 6,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                Voltar
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={isLast ? onFinish : onNext}
              style={{
                background: '#005CA9',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 0.15s, transform 0.1s',
                boxShadow: '0 2px 4px rgba(0, 92, 169, 0.25)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#004c8c')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#005CA9')}
            >
              {isLast ? 'Concluir' : 'Próximo'}
            </button>
          </div>

          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              onClick={onSkip}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: 12,
                cursor: 'pointer',
                padding: '2px 8px',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              Pular tour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
