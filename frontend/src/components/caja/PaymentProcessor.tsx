// ============================================================
// frontend/src/components/caja/PaymentProcessor.tsx  —  Fase 4
//
// FIX TAB: El bug original usaba setTimeout() para enfocar el
// botón confirmar, pero ese botón seguía disabled en ese tick
// porque React no había re-renderizado aún.
// Solución: doble requestAnimationFrame (espera el commit del DOM).
// También se agrega autoFocus y Enter en el input para confirmar.
// ============================================================

import { useState, useRef, useEffect } from 'react';
import type { OrderWithMeta } from '../../types/caja';
import { Banknote, CreditCard, ArrowLeftRight } from 'lucide-react';

interface Props {
  order:     OrderWithMeta;
  onConfirm: (orderId: string) => Promise<void>;
  onCancel:  () => void;
  loading:   boolean;
}

export default function PaymentProcessor({ order, onConfirm, onCancel, loading }: Props) {
  const total         = parseFloat(order.total as unknown as string);
  const [monto, setMonto] = useState('');
  const montoParsed   = parseFloat(monto) || 0;
  const cambio        = montoParsed > total ? montoParsed - total : 0;
  const esEfectivo    = order.payment_method === 'efectivo';
  const inputRef      = useRef<HTMLInputElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const canConfirm = !esEfectivo || montoParsed >= total;

  // autoFocus via useEffect (respaldo para browsers que ignoran autoFocus en modales)
  useEffect(() => {
    if (esEfectivo) {
      // Pequeño delay para asegurar que el modal está pintado
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, []); // eslint-disable-line

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // TAB con campo vacío → autocompleta con el total y enfoca confirmar
    if (e.key === 'Tab' && !monto) {
      e.preventDefault();
      setMonto(total.toFixed(0));
      // Doble RAF: espera el re-render de React (habilita el botón) antes de enfocar
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          confirmBtnRef.current?.focus();
        });
      });
    }
    // Enter con monto válido → confirmar directamente
    if (e.key === 'Enter' && canConfirm && !loading) {
      e.preventDefault();
      onConfirm(order.id);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="pp-modal">
        <div className="pp-header">
          <h2 className="pp-title">Procesar pago</h2>
          <button className="pp-close" onClick={onCancel} tabIndex={-1}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Resumen */}
        <div className="pp-summary">
          <div className="pp-row">
            <span>Orden</span>
            <span className="pp-val">#{order.order_number}</span>
          </div>
          <div className="pp-row">
            <span>Método</span>
            <span className="pp-val pp-payment-badge">
              {order.payment_method === 'efectivo'
                ? <><Banknote size={14}/> Efectivo</>
                : order.payment_method === 'tarjeta'
                ? <><CreditCard size={14}/> Tarjeta</>
                : <><ArrowLeftRight size={14}/> Transferencia</>}
            </span>
          </div>
          <div className="pp-divider" />
          <div className="pp-row pp-total-row">
            <span>Total a cobrar</span>
            <span className="pp-total">${total.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Monto recibido (solo efectivo) */}
        {esEfectivo && (
          <div className="pp-cash-section">
            <label className="pp-label" htmlFor="pp-monto">Monto recibido</label>
            <div className="pp-input-wrap">
              <span className="pp-currency">$</span>
              <input
                ref={inputRef}
                id="pp-monto"
                type="number"
                min={total}
                step="100"
                className="pp-input"
                placeholder={total.toFixed(0)}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                tabIndex={1}
              />
            </div>
            <p className="pp-hint">TAB autocompleta el total · Enter confirma</p>
            {cambio > 0 && (
              <div className="pp-change">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l3 3 7-7" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Cambio: <strong>${cambio.toLocaleString('es-CO', { minimumFractionDigits: 0 })}</strong>
              </div>
            )}
          </div>
        )}

        {/* Botones: Confirmar primero para flujo TAB → Enter */}
        <div className="pp-actions pp-actions-reversed">
          <button
            ref={confirmBtnRef}
            className="pp-btn-confirm"
            onClick={() => onConfirm(order.id)}
            disabled={loading || !canConfirm}
            tabIndex={2}
          >
            {loading ? <span className="btn-spinner" /> : (
              <>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M2 7.5l3.5 3.5 7.5-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                Confirmar y enviar a cocina
              </>
            )}
          </button>
          <button
            className="pp-btn-cancel"
            onClick={onCancel}
            disabled={loading}
            tabIndex={3}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}