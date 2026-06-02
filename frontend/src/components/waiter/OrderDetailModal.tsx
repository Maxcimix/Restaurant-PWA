// ============================================================
// frontend/src/components/waiter/OrderDetailModal.tsx
//
// Modal que muestra el detalle completo de una orden activa
// en una mesa. El mesero lo abre desde la tarjeta de mesa
// para ver qué se pidió, cantidades, totales y estado.
// ============================================================

import { useEffect, useState } from 'react';
import { getOrderDetail, deliverItem } from '../../services/waiterService';
import { formatCOP }            from '../../utils/constants';
import type { Order }           from '../../types/order';
import { FileText, CheckCircle, Package } from 'lucide-react';

interface Props {
  orderId:     string;
  orderNumber: string;
  tableNumber: number;
  onClose:     () => void;
  onAllDelivered?: () => void;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:              { label: 'Pendiente',       color: '#f59e0b' },
  pending_payment:      { label: 'Pend. pago',      color: '#f59e0b' },
  payment_confirmed:    { label: 'Pago confirmado', color: '#10b981' },
  pending_validation:   { label: 'En validación',   color: '#8b5cf6' },
  sent_to_kitchen:      { label: 'En cocina',       color: '#3b82f6' },
  in_preparation:       { label: 'Preparando',      color: '#f97316' },
  ready_for_pickup:     { label: '¡Listo!',         color: '#10b981' },
  delivered:            { label: 'Entregado',       color: '#6b7280' },
  completed:            { label: 'Completado',      color: '#6b7280' },
  cancelled:            { label: 'Cancelado',       color: '#ef4444' },
};

export default function OrderDetailModal({ orderId, orderNumber, tableNumber, onClose, onAllDelivered }: Props) {
  const [order,        setOrder]        = useState<Order | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [delivering,   setDelivering]   = useState<string | null>(null);
  const [delivered,    setDelivered]    = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    getOrderDetail(orderId)
      .then((o) => {
        setOrder(o);
        // Pre-marcar ítems ya entregados
        const pre = new Set<string>();
        o.items?.forEach((item: any) => {
          if (item.delivered_at) pre.add(item.id);
        });
        setDelivered(pre);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleDeliver = async (itemId: string) => {
    setDelivering(itemId);
    try {
      const res = await deliverItem(orderId, itemId);
      setDelivered((prev) => new Set([...prev, itemId]));
      if (res.allDelivered) {
        onAllDelivered?.();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al entregar ítem';
      setError(msg.includes('estado') ? 'Este ítem solo se puede entregar cuando la orden esté lista' : msg);
    } finally {
      setDelivering(null);
    }
  };

  const statusInfo = order ? (STATUS_LABEL[order.status] ?? { label: order.status, color: '#6b7280' }) : null;

  return (
    <div className="odm-overlay" role="dialog" aria-modal="true">
      <div className="odm-panel">

        {/* Cabecera */}
        <div className="odm-header">
          <div className="odm-title-group">
            <span className="odm-table-badge">Mesa {tableNumber}</span>
            <h2 className="odm-title">{orderNumber}</h2>
          </div>
          {statusInfo && (
            <span className="odm-status-chip"
              style={{ background: `${statusInfo.color}18`, color: statusInfo.color, borderColor: `${statusInfo.color}30` }}>
              {statusInfo.label}
            </span>
          )}
          <button type="button" className="odm-close" onClick={onClose} aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Contenido */}
        <div className="odm-body">
          {loading && (
            <div className="odm-loading">
              <div className="odm-spinner"/>
              <span>Cargando pedido…</span>
            </div>
          )}

          {error && (
            <div className="odm-error">
              <span>{error}</span>
            </div>
          )}

          {order && !loading && (
            <>
              {/* Items */}
              <div className="odm-section">
                <h3 className="odm-section-title">Artículos pedidos</h3>
                {order.items && order.items.length > 0 ? (
                  <ul className="odm-items-list">
                    {order.items.map((item: any, idx: number) => {
                      const isDelivered = delivered.has(item.id);
                      const isSkip      = item.skip_kitchen;
                      return (
                        <li key={item.id ?? idx} className="odm-item"
                          style={{ opacity: isDelivered ? 0.5 : 1 }}>
                          <div className="odm-item-main">
                            <span className="odm-item-qty">{item.quantity}×</span>
                            <div className="odm-item-info">
                              <span className="odm-item-name">{item.name}</span>
                              {isSkip && !isDelivered && (
                                <span style={{
                                  fontSize: '11px', marginTop: '2px',
                                  color: '#f97316', display: 'flex',
                                  alignItems: 'center', gap: '4px',
                                }}>
                                  <Package size={11}/> Alista tú
                                </span>
                              )}
                              {item.special_instructions && (
                                <span className="odm-item-note">
                                  <FileText size={13}/> {item.special_instructions}
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="odm-item-price">
                              {formatCOP(parseFloat(String(item.price)) * item.quantity)}
                            </span>
                            {!isDelivered ? (
                              <button
                                type="button"
                                onClick={() => handleDeliver(item.id)}
                                disabled={delivering === item.id}
                                style={{
                                  padding: '4px 10px', fontSize: '12px',
                                  background: 'var(--a-indigo)',
                                  color: '#fff', border: 'none',
                                  borderRadius: '6px', cursor: 'pointer',
                                  opacity: delivering === item.id ? 0.6 : 1,
                                  whiteSpace: 'nowrap',
                                }}>
                                {delivering === item.id ? '...' : 'Entregar'}
                              </button>
                            ) : (
                              <CheckCircle size={18} color="#10b981"/>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="odm-empty-items">Sin artículos</p>
                )}
              </div>

              {/* Notas */}
              {order.notes && (
                <div className="odm-section">
                  <h3 className="odm-section-title">Notas</h3>
                  <p className="odm-notes">{order.notes}</p>
                </div>
              )}

              {/* Totales */}
              <div className="odm-totals">
                <div className="odm-total-row">
                  <span>Subtotal</span>
                  <span>{formatCOP(parseFloat(String(order.subtotal ?? 0)))}</span>
                </div>
                {parseFloat(String(order.tax ?? 0)) > 0 && (
                  <div className="odm-total-row">
                    <span>IVA</span>
                    <span>{formatCOP(parseFloat(String(order.tax)))}</span>
                  </div>
                )}
                <div className="odm-total-row odm-total-final">
                  <span>Total</span>
                  <span>{formatCOP(parseFloat(String(order.total ?? 0)))}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="odm-footer">
          <button type="button" className="odm-btn-close" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}