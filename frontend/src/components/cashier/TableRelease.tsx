// ============================================================
// frontend/src/components/cashier/TableRelease.tsx  —  Fase 7
//
// Propósito: Modal de confirmación de cierre de mesa.
//   Muestra el resumen final del pago y permite liberar la mesa
//   (PATCH /cashier/tables/:id/release) y generar el comprobante.
//
// Ruta: frontend/src/components/cashier/TableRelease.tsx
//
// Props:
//   interface Props {
//     onReleased: () => void;  // mesa liberada — vuelve al dashboard
//     onClose:    () => void;
//   }
//
// Flujo de datos:
//   1. Lee paymentResult y selectedTable del cashierStore
//   2. Usuario confirma → PATCH /cashier/tables/:id/release
//   3. Backend: table.status = 'available', emite WS table:released
//   4. resetFlow() limpia el store
//   5. onReleased() → cierra modales y recarga dashboard
// ============================================================

import { useState, useRef } from 'react';
import { useCashierStore }   from '../../store/cashierStore';
import { releaseTable }      from '../../services/cashierService';
import { ApiError }          from '../../services/api';

interface Props {
  onReleased: () => void;
  onClose:    () => void;
}

const METHOD_LABELS: Record<string, string> = {
  efectivo:        'Efectivo',
  tarjeta_debito:  'Tarjeta débito',
  tarjeta_credito: 'Tarjeta crédito',
  transferencia:   'Transferencia',
};

export default function TableRelease({ onReleased, onClose }: Props) {
  const {
    paymentResult,
    selectedTable,
    activeBill,
    resetFlow,
    setProcessing,
    isProcessing,
  } = useCashierStore();

  const [localError, setLocalError] = useState<string | null>(null);
  const [released,   setReleased]   = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!paymentResult || !selectedTable || !activeBill) return null;

  const receipt = paymentResult.receipt;

  async function handleRelease() {
    if (!selectedTable) return;
    setProcessing(true);
    setLocalError(null);
    try {
      await releaseTable(selectedTable.tableId);
      setReleased(true);
      // Dar un momento para mostrar la animación de éxito
      setTimeout(() => {
        resetFlow();
        onReleased();
      }, 1_400);
    } catch (e) {
      setLocalError(
        e instanceof ApiError ? e.message : 'Error al liberar la mesa. Intenta de nuevo.'
      );
      setProcessing(false);
    }
  }

  function handlePrint() {
    // window.print() falla en Edge con Trusted Types activado.
    // Generamos un HTML standalone como Blob y lo abrimos en pestaña nueva,
    // donde el navegador muestra el diálogo de impresión sin restricciones.
    const METHOD_LABEL = METHOD_LABELS[receipt.method] ?? receipt.method;
    const paidAtStr    = new Date(receipt.paidAt).toLocaleString('es');

    const rows = receipt.items.map((item) =>
      `<tr>
        <td>${item.name}${item.specialInstructions ? ` <em>(${item.specialInstructions})</em>` : ''}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">$${item.unitPrice.toFixed(2)}</td>
        <td class="num">$${item.subtotal.toFixed(2)}</td>
      </tr>`
    ).join('');

    const tipRow = receipt.tip > 0
      ? `<tr><td>Propina</td><td></td><td></td><td class="num">$${receipt.tip.toFixed(2)}</td></tr>`
      : '';

    const changeRow = receipt.change > 0
      ? `<tr class="change"><td colspan="3">Cambio</td><td class="num">$${receipt.change.toFixed(2)}</td></tr>`
      : '';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Comprobante ${receipt.orderNumber}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:13px;padding:24px;max-width:420px;margin:auto;color:#111}
    h1{font-size:18px;margin-bottom:2px}
    .sub{color:#555;font-size:12px;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;margin:12px 0}
    th{text-align:left;border-bottom:1px solid #ccc;padding:4px 2px;font-size:11px;color:#555}
    td{padding:4px 2px}
    .num{text-align:right}
    .divider{border-top:1px solid #ccc;margin:4px 0}
    .total td{font-weight:700;font-size:15px}
    .tip td{color:#f59e0b}
    .change td{color:#22c55e;font-weight:600}
    .meta{background:#f5f5f5;border-radius:6px;padding:10px;margin-bottom:14px;font-size:12px;line-height:1.7}
    .footer{margin-top:20px;text-align:center;color:#888;font-size:11px;border-top:1px dashed #ccc;padding-top:12px}
    @media print{body{padding:0}}
  </style>
</head>
<body>
  <h1>RestaurantPWA</h1>
  <p class="sub">Comprobante de pago · ${receipt.orderNumber}</p>
  <div class="meta">
    <div><strong>Mesa</strong> ${receipt.tableNumber}${receipt.section ? ` · ${receipt.section}` : ''}</div>
    ${receipt.waiterName ? `<div><strong>Mesero</strong> ${receipt.waiterName}</div>` : ''}
    <div><strong>Método</strong> ${METHOD_LABEL}${receipt.reference ? ` · Ref: ${receipt.reference}` : ''}</div>
    <div><strong>Fecha</strong> ${paidAtStr}</div>
  </div>
  <table>
    <thead><tr><th>Item</th><th class="num">Cant.</th><th class="num">P/U</th><th class="num">Subtotal</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <table>
    <tbody>
      <tr><td colspan="3">Subtotal</td><td class="num">$${receipt.subtotal.toFixed(2)}</td></tr>
      <tr><td colspan="3">IVA (8%)</td><td class="num">$${receipt.tax.toFixed(2)}</td></tr>
      ${tipRow}
      <tr class="divider"><td colspan="4"><hr/></td></tr>
      <tr class="total"><td colspan="3">TOTAL</td><td class="num">$${receipt.total.toFixed(2)}</td></tr>
      <tr><td colspan="3">Recibido</td><td class="num">$${receipt.amountPaid.toFixed(2)}</td></tr>
      ${changeRow}
    </tbody>
  </table>
  <div class="footer"><p>¡Gracias por su visita!</p></div>
  <script>window.onload=()=>window.print();</script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank');
    if (!win) {
      // fallback: descarga directa como archivo
      const a  = document.createElement('a');
      a.href   = url;
      a.download = `comprobante-${receipt.orderNumber}.html`;
      a.click();
    }
    // Liberar la URL del blob después de un momento
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => !released && e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="release-title"
    >
      <div className="release-modal">

        {released ? (
          /* Animación de éxito */
          <div className="release-success" aria-live="polite">
            <div className="release-success-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="20" stroke="#22c55e" strokeWidth="2"/>
                <path d="M14 24l7 7 13-13" stroke="#22c55e" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="release-success-title">¡Mesa liberada!</h3>
            <p className="release-success-sub">Mesa {selectedTable.tableNumber} disponible</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="release-header no-print">
              <div className="release-header-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="7" width="20" height="14" rx="2" stroke="#22c55e" strokeWidth="1.5"/>
                  <path d="M2 12h20" stroke="#22c55e" strokeWidth="1.5"/>
                  <path d="M7 3l5-2 5 2" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <h2 className="release-title" id="release-title">Pago registrado</h2>
                <p className="release-sub">Mesa {selectedTable.tableNumber} · {activeBill.orderNumber}</p>
              </div>
              <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Comprobante de pago */}
            <div className="release-receipt" ref={printRef} id="release-printable">
              {/* Solo visible en impresión */}
              <div className="print-only receipt-print-header">
                <h1>RestaurantPWA</h1>
                <p>Comprobante de pago</p>
                <p>Mesa {receipt.tableNumber} · {receipt.section ?? ''}</p>
                {receipt.waiterName && <p>Mesero: {receipt.waiterName}</p>}
              </div>

              {/* Resumen de pago */}
              <div className="release-payment-summary">
                <div className="rps-row">
                  <span>Método</span>
                  <span className="rps-val">{METHOD_LABELS[receipt.method] ?? receipt.method}</span>
                </div>
                {receipt.reference && (
                  <div className="rps-row">
                    <span>Referencia</span>
                    <span className="rps-val">{receipt.reference}</span>
                  </div>
                )}
                <div className="rps-row">
                  <span>Pagado a las</span>
                  <span className="rps-val">
                    {new Date(receipt.paidAt).toLocaleTimeString('es', {
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>

              {/* Items (condensados) */}
              <div className="release-items">
                {receipt.items.map((item, i) => (
                  <div key={i} className="release-item-row">
                    <span>{item.quantity}× {item.name}</span>
                    <span>${item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Totales */}
              <div className="release-totals">
                <div className="rt-row">
                  <span>Subtotal</span>
                  <span>${receipt.subtotal.toFixed(2)}</span>
                </div>
                <div className="rt-row rt-tax">
                  <span>IVA (8%)</span>
                  <span>${receipt.tax.toFixed(2)}</span>
                </div>
                {receipt.tip > 0 && (
                  <div className="rt-row rt-tip">
                    <span>Propina</span>
                    <span>${receipt.tip.toFixed(2)}</span>
                  </div>
                )}
                <div className="rt-divider" />
                <div className="rt-row rt-total">
                  <span>TOTAL</span>
                  <span>${receipt.total.toFixed(2)}</span>
                </div>
                <div className="rt-row rt-paid">
                  <span>Recibido</span>
                  <span>${receipt.amountPaid.toFixed(2)}</span>
                </div>
                {receipt.change > 0 && (
                  <div className="rt-row rt-change">
                    <span>Cambio</span>
                    <span className="change-highlight">${receipt.change.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Footer de impresión */}
              <div className="print-only receipt-print-footer">
                <p>Orden: {activeBill.orderNumber}</p>
                <p>{new Date(receipt.paidAt).toLocaleString('es')}</p>
                <p>¡Gracias por su visita!</p>
              </div>
            </div>

            {/* Error */}
            {localError && (
              <div className="release-error" role="alert">{localError}</div>
            )}

            {/* Acciones */}
            <div className="release-footer no-print">
              <button
                type="button"
                className="release-print-btn"
                onClick={handlePrint}
                disabled={isProcessing}
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <rect x="2" y="5" width="11" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M4 5V3a1 1 0 011-1h5a1 1 0 011 1v2" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M4 10h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                Imprimir comprobante
              </button>
              <button
                type="button"
                className="release-confirm-btn"
                onClick={handleRelease}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <><span className="btn-spinner" aria-hidden="true" /> Liberando...</>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                      <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      <circle cx="8" cy="11" r="1" fill="currentColor"/>
                    </svg>
                    Liberar mesa {selectedTable.tableNumber}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}