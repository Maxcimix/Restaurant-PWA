// ============================================================
// frontend/src/components/cashier/BillGenerator.tsx  —  Fase 7
//
// Propósito: Modal que genera y muestra la cuenta detallada de
//   una mesa antes de procesar el pago. Permite imprimir la
//   vista previa con window.print() + CSS @media print.
//
// Ruta: frontend/src/components/cashier/BillGenerator.tsx
// Dependencias: React 19, cashierService, cashierStore
//
// Props:
//   interface Props {
//     onProceedToPayment: () => void;  // avanza al modal de pago
//     onClose:            () => void;  // cierra sin pagar
//   }
//
// Flujo de datos:
//   1. Lee selectedTable del cashierStore
//   2. POST /cashier/orders/:orderId/bill → BillDetail
//   3. Guarda en cashierStore.activeBill
//   4. Renderiza tabla de items + totales + propina sugerida
//   5. "Procesar Pago" → onProceedToPayment()
//   6. "Imprimir" → window.print() con CSS @media print
//
// Notas: La propina sugerida (10%) es informativa — el cliente
//   decide si la agrega. El campo tip real se registra en PaymentMethod.
// ============================================================

import { useEffect, useState, useRef } from 'react';
import { useCashierStore }   from '../../store/cashierStore';
import { useAppStore }       from '../../store/appStore';
import { generateBill, payOrder, releaseTable } from '../../services/cashierService';
import { formatCOP }         from '../../utils/constants';
import type { WaitingTable, CashierPaymentMethod } from '../../types/cashier';

interface Props {
  table:    WaitingTable;
  onPaid:   () => void;
  onClose:  () => void;
}

const METHOD_LABEL: Record<string, string> = {
  efectivo:        'Efectivo',
  tarjeta_debito:  'Tarjeta débito',
  tarjeta_credito: 'Tarjeta crédito',
  transferencia:   'Transferencia',
  tarjeta:         'Tarjeta',
};

export default function BillGenerator({ table, onPaid, onClose }: Props) {
  const { setActiveBill, activeBill } = useCashierStore();
  const { brand } = useAppStore();

  const [loading,    setLoading]    = useState(!activeBill);
  const [localError, setLocalError] = useState<string | null>(null);
  const [paying,     setPaying]     = useState(false);
  const [payError,   setPayError]   = useState<string | null>(null);
  const [monto,      setMonto]      = useState('');

  const inputRef   = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const esEfectivo  = table.paymentMethod === 'efectivo';
  const bill        = activeBill;
  const montoParsed = parseFloat(monto) || 0;
  const cambio      = bill && montoParsed > bill.total ? montoParsed - bill.total : 0;
  const canPay      = !esEfectivo || montoParsed >= (bill?.total ?? 0);

  useEffect(() => {
    if (activeBill) {
      if (esEfectivo) {
        setMonto(String(activeBill.total));
        setTimeout(() => inputRef.current?.select(), 100);
      } else {
        setTimeout(() => confirmRef.current?.focus(), 100);
      }
      return;
    }
    setLoading(true);
    generateBill(table.orderId)
      .then((b) => {
        setActiveBill(b);
        setLoading(false);
        if (esEfectivo) {
          setMonto(String(b.total));
          setTimeout(() => inputRef.current?.select(), 100);
        } else {
          setTimeout(() => confirmRef.current?.focus(), 100);
        }
      })
      .catch((e: unknown) => {
        setLocalError(e instanceof Error ? e.message : 'Error al generar la cuenta');
        setLoading(false);
      });
  }, []); // eslint-disable-line

  const handlePrint = () => {
    if (!bill) return;
    const w = window.open('', '_blank');
    if (!w) return;
    const rows = bill.items.map((it) =>
      `<tr>
        <td>${it.name}${it.specialInstructions ? ` — ${it.specialInstructions}` : ''}</td>
        <td style="text-align:right">${it.quantity}</td>
        <td style="text-align:right">$${it.unitPrice.toFixed(2)}</td>
        <td style="text-align:right">$${it.subtotal.toFixed(2)}</td>
      </tr>`
    ).join('');
    w.document.write(`
      <html><head><title>Cuenta Mesa ${table.tableNumber}</title>
      <style>
        body{font-family:sans-serif;padding:20px;max-width:340px;margin:0 auto}
        h2{text-align:center;margin:0}p{text-align:center;color:#666;margin:2px 0 12px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th{border-bottom:1px solid #ccc;padding:4px 2px;font-size:11px;text-align:left}
        td{padding:5px 2px;border-bottom:1px solid #f0f0f0}
        .r{text-align:right}.divider{border-top:1px dashed #ccc;margin:8px 0}
        .total{font-weight:700;font-size:16px}
      </style></head>
      <body>
        <h2>Cuenta — Mesa ${table.tableNumber}</h2>
        ${table.section ? `<p>${table.section}</p>` : ''}
        <p>${table.orderNumber ?? ''} · ${table.waiterName ?? ''}</p>
        <table>
          <thead><tr><th>Ítem</th><th class="r">Cant.</th><th class="r">P/U</th><th class="r">Subtotal</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="divider"></div>
        <div style="font-size:13px">
          <div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>$${bill.subtotal.toFixed(2)}</span></div>
          <div style="display:flex;justify-content:space-between"><span>IVA (${brand.taxRate}%)</span><span>$${bill.tax.toFixed(2)}</span></div>
          ${bill.tip > 0 ? `<div style="display:flex;justify-content:space-between"><span>Propina</span><span>$${bill.tip.toFixed(2)}</span></div>` : ''}
        </div>
        <div class="divider"></div>
        <div class="total" style="display:flex;justify-content:space-between"><span>TOTAL</span><span>$${bill.total.toFixed(2)}</span></div>
        <div style="margin-top:10px;font-size:12px;color:#666">
          Método: ${METHOD_LABEL[table.paymentMethod ?? ''] ?? table.paymentMethod ?? '—'}
        </div>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  const handlePay = async () => {
    if (!bill || paying) return;
    setPaying(true);
    setPayError(null);
    try {
      await payOrder(table.orderId, {
  method:     (table.paymentMethod ?? 'efectivo') as CashierPaymentMethod,
  amountPaid: esEfectivo ? montoParsed : bill.total,
  tip:        0,
});
onPaid();
    } catch (e: unknown) {
      setPayError(e instanceof Error ? e.message : 'Error al procesar el pago');
      setPaying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!monto || parseFloat(monto) < (bill?.total ?? 0)) setMonto(String(bill?.total ?? 0));
      confirmRef.current?.focus();
    }
    if (e.key === 'Enter' && canPay && !paying) handlePay();
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="bill-modal">

        {/* Header */}
        <div className="bill-header no-print">
          <div>
            <h2 className="bill-title">Cuenta — Mesa {table.tableNumber}</h2>
            {table.section && <p className="bill-section">{table.section}</p>}
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="bill-body">
          {loading ? (
            <div className="bill-loading">
              <div className="cashier-spinner"/>
              <p>Generando cuenta...</p>
            </div>
          ) : localError ? (
            <div className="bill-error">
              <p>{localError}</p>
              <button onClick={() => { setLocalError(null); setLoading(true); }}>Reintentar</button>
            </div>
          ) : bill ? (
            <>
              {/* Info orden */}
              <div className="bill-order-info no-print">
                <span className="bill-order-num">{bill.orderNumber}</span>
                {bill.waiterName && (
                  <span className="bill-waiter">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <circle cx="6" cy="4" r="2" stroke="currentColor" strokeWidth="1"/>
                      <path d="M2 10c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                    </svg>
                    {bill.waiterName}
                  </span>
                )}
              </div>

              {/* Tabla de ítems */}
              <table className="bill-items-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="col-qty">Cant.</th>
                    <th className="col-price">P/U</th>
                    <th className="col-sub">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.items.map((item, i) => (
                    <tr key={i}>
                      <td>
                        {item.name}
                        {item.specialInstructions && (
                          <span className="item-note">— {item.specialInstructions}</span>
                        )}
                      </td>
                      <td className="col-qty">{item.quantity}</td>
                      <td className="col-price">{formatCOP(item.unitPrice)}</td>
                      <td className="col-sub">{formatCOP(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totales */}
              <div className="bill-totals">
                <div className="bill-total-row">
                  <span>Subtotal</span>
                  <span>{formatCOP(bill.subtotal)}</span>
                </div>
                <div className="bill-total-row bill-tax-row">
                  <span>IVA ({brand.taxRate}%)</span>
                  <span>{formatCOP(bill.tax)}</span>
                </div>
                
                {/* Propina bloqueada */}
              {bill.tip > 0 && (
                <div className="payment-field">
                  <span className="pf-label">
                    Propina
                    <span className="pf-hint pf-hint--locked"> — acordada con el cliente</span>
                  </span>
                  <div className="pm-locked-badge">
                    <span className="pm-locked-icon">
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <rect x="2.5" y="5.5" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                        <path d="M4.5 5.5V4a2 2 0 014 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                    </span>
                    {formatCOP(bill.tip)}
                  </div>
                </div>
              )}

              {/* Método bloqueado */}
              <div className="payment-field">
                <span className="pf-label">
                  Método de pago
                  <span className="pf-hint pf-hint--locked"> — acordado con el cliente</span>
                </span>
                <div className="pm-locked-badge">
                  <span className="pm-locked-icon">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <rect x="2.5" y="5.5" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M4.5 5.5V4a2 2 0 014 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  </span>
                  {METHOD_LABEL[table.paymentMethod ?? ''] ?? table.paymentMethod ?? '—'}
                </div>
              </div>

              

              <div className="bill-divider"/>
                <div className="bill-total-row bill-grand-total">
                  <span>TOTAL</span>
                  <span>{formatCOP(bill.total)}</span>
                </div>
              </div>

              {/* Monto recibido — solo efectivo */}
              {esEfectivo && (
                <div className="payment-field">
                  <label className="pf-label" htmlFor="bill-monto">
                    Monto recibido
                    <span className="pf-hint">Tab → total exacto · Enter → confirmar</span>
                  </label>
                  <div className="pf-input-wrap">
                    <span className="pf-currency">$</span>
                    <input
                      ref={inputRef}
                      id="bill-monto"
                      type="number"
                      min={bill.total}
                      step="1000"
                      className="pf-input pf-input-lg"
                      placeholder={String(bill.total)}
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                  </div>
                  {cambio > 0 && (
                    <div className="change-display">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7l3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                      Cambio: <strong>{formatCOP(cambio)}</strong>
                    </div>
                  )}
                </div>
              )}

              {payError && (
                <div className="payment-error">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M7 4.5v3M7 9v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  {payError}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        {bill && !loading && !localError && (
          <div className="bill-footer no-print">
            <button type="button" className="bill-print-btn" onClick={handlePrint}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="3" y="5" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M5 5V3a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M5 10h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              Imprimir
            </button>
            <button
              ref={confirmRef}
              type="button"
              className="bill-pay-btn"
              onClick={handlePay}
              disabled={paying || !canPay}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canPay && !paying) handlePay();
              }}
            >
              {paying ? (
                <><span className="btn-spinner"/> Procesando...</>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="4" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M2 7h12" stroke="currentColor" strokeWidth="1.3"/>
                  </svg>
                  Confirmar pago
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}