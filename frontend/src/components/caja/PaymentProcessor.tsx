// ============================================================
// frontend/src/components/caja/PaymentProcessor.tsx  —  Fase 4
//
// Modal que confirma el método de pago y valida la orden.
// Calcula cambio para pagos en efectivo.
// Al confirmar → PATCH /api/orders/:id/status → sent_to_kitchen
// UX: TAB en input vacío autocompleta el total, botones invertidos
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
  const total          = parseFloat(order.total as unknown as string);
  const [monto, setMonto] = useState('');
  const montoParsed    = parseFloat(monto) || 0;
  const cambio         = montoParsed > total ? montoParsed - total : 0;
  const esEfectivo     = order.payment_method === 'efectivo';
  const inputRef       = useRef<HTMLInputElement>(null);
  const confirmBtnRef  = useRef<HTMLButtonElement>(null);

  const canConfirm = !esEfectivo || montoParsed >= total;

  // Auto-focus en el input de monto al abrir
  useEffect(() => {
    if (esEfectivo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [esEfectivo]);

  // Handler para TAB: si el input está vacío, autocompleta con el total
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && !monto) {
      e.preventDefault();
      setMonto(total.toFixed(2));
      // Después de setear el monto, mover foco al botón confirmar
      setTimeout(() => confirmBtnRef.current?.focus(), 0);
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
            <span className="pp-total">${total.toFixed(2)}</span>
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
                step="0.01"
                className="pp-input"
                placeholder={total.toFixed(2)}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                onKeyDown={handleKeyDown}
                tabIndex={1}
              />
            </div>
            <p className="pp-hint">Presiona TAB para autocompletar el monto</p>
            {cambio > 0 && (
              <div className="pp-change">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l3 3 7-7" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Cambio: <strong>${cambio.toFixed(2)}</strong>
              </div>
            )}
          </div>
        )}

        {/* Botones invertidos: Confirmar primero para flujo TAB->TAB->Enter */}
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
