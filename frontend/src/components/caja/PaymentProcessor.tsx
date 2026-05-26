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
  const total     = parseFloat(order.total as unknown as string);
  const subtotal  = parseFloat(order.subtotal as unknown as string) || 0;
  const tax       = parseFloat(order.tax as unknown as string) || 0;

  const [monto, setMonto] = useState('');
  const montoParsed = parseFloat(monto) || 0;
  const cambio      = montoParsed > total ? montoParsed - total : 0;
  const esEfectivo  = order.payment_method === 'efectivo';
  const canConfirm  = !esEfectivo || montoParsed >= total;

  const inputRef   = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (esEfectivo) inputRef.current?.focus();
    else confirmRef.current?.focus();
  }, [esEfectivo]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && canConfirm && !loading) {
      onConfirm(order.id);
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!monto || parseFloat(monto) < total) setMonto(String(total));
      confirmRef.current?.focus();
    }
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const items = order.items?.map((item) => {
      const unit = parseFloat(
        String((item as unknown as Record<string,unknown>).unit_price ?? item.price)
      );
      return `<div class="row"><span>${item.quantity}× ${item.name}</span><span>$${(unit * item.quantity).toFixed(2)}</span></div>`;
    }).join('') ?? '';
    w.document.write(`
      <html><head><title>Recibo ${order.order_number}</title>
      <style>
        body{font-family:sans-serif;padding:20px;max-width:300px;margin:0 auto}
        h2{text-align:center;margin:0}
        p{text-align:center;color:#666;margin:4px 0 16px}
        .row{display:flex;justify-content:space-between;padding:4px 0;font-size:14px}
        .divider{border-top:1px solid #eee;margin:8px 0}
        .total{font-weight:700;font-size:16px}
      </style></head>
      <body>
        <h2>RestaurantPWA</h2>
        <p>Recibo digital</p>
        <div class="row"><span>Orden</span><span>#${order.order_number}</span></div>
        <div class="row"><span>Fecha</span><span>${new Date().toLocaleDateString('es-CO')}</span></div>
        <div class="divider"></div>
        ${items}
        <div class="divider"></div>
        ${subtotal > 0 ? `<div class="row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>` : ''}
        ${tax > 0 ? `<div class="row"><span>Impuesto</span><span>$${tax.toFixed(2)}</span></div>` : ''}
        <div class="divider"></div>
        <div class="row total"><span>TOTAL</span><span>$${total.toFixed(2)}</span></div>
        <div class="row"><span>Pago</span><span>${order.payment_method ?? '—'}</span></div>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="pp-modal">
        <div className="pp-header">
          <h2 className="pp-title">Procesar pago</h2>
          <button className="pp-close" onClick={onCancel}>
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
        </div>

        {/* Ítems */}
        {order.items && order.items.length > 0 && (
          <div className="pp-items">
            {order.items.map((item) => {
              const unit = parseFloat(
                String((item as unknown as Record<string,unknown>).unit_price ?? item.price)
              );
              return (
                <div key={item.id} className="pp-item-row">
                  <span className="pp-item-qty">{item.quantity}×</span>
                  <span className="pp-item-name">{item.name}</span>
                  <span className="pp-item-price">${(unit * item.quantity).toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Totales */}
        <div className="pp-totals">
          {subtotal > 0 && (
            <div className="pp-row">
              <span>Subtotal</span>
              <span className="pp-val">${subtotal.toFixed(2)}</span>
            </div>
          )}
          {tax > 0 && (
            <div className="pp-row">
              <span>IVA</span>
              <span className="pp-val">${tax.toFixed(2)}</span>
            </div>
          )}
          <div className="pp-divider" />
          <div className="pp-row pp-total-row">
            <span>Total a cobrar</span>
            <span className="pp-total">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Monto recibido — solo efectivo */}
        {esEfectivo && (
          <div className="pp-cash-section">
            <label className="pp-label" htmlFor="pp-monto">
              Monto recibido
              <span style={{ opacity: 0.5, fontSize: '11px', marginLeft: '6px' }}>
                Tab → total exacto · Enter → confirmar
              </span>
            </label>
            <div className="pp-input-wrap">
              <span className="pp-currency">$</span>
              <input
                ref={inputRef}
                id="pp-monto"
                type="number"
                min={total}
                step="1000"
                className="pp-input"
                placeholder={total.toFixed(2)}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
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

        {/* Imprimir recibo */}
        <button className="pp-print-btn" type="button" onClick={handlePrint}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="2" y="4" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M4 4V2.5h6V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M4 9.5h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          Imprimir recibo
        </button>

        {/* Acciones */}
        <div className="pp-actions">
          <button className="pp-btn-cancel" onClick={onCancel} disabled={loading} tabIndex={0}>
            Cancelar
          </button>
          <button
            ref={confirmRef}
            className="pp-btn-confirm"
            onClick={() => onConfirm(order.id)}
            disabled={loading || !canConfirm}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canConfirm && !loading) onConfirm(order.id);
            }}
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
        </div>
      </div>
    </div>
  );
}