// ============================================================
// frontend/src/pages/OrderTracker.tsx  →  /autoservicio/tracker/:id
//
// Pantalla de seguimiento en tiempo real de la orden.
// Se conecta al WebSocket para recibir actualizaciones de estado.
// Muestra un timeline visual con los 4 pasos del proceso.
// ============================================================

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrderStore } from '../store/orderStore';
import { getOrderById } from '../services/orderService';
import { useWebSocket } from '../hooks/useWebSocket';
import type { Order, OrderStatus, WsOrderReadyEvent } from '../types/order';
import '../styles/OrderTracker.css';

// Definición de los pasos del timeline
const STEPS: { status: OrderStatus; label: string; sub: string; icon: React.ReactNode }[] = [
  {
    status: 'pending_payment',
    label: 'Recibido',
    sub: 'Tu pedido fue registrado',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    status: 'sent_to_kitchen',
    label: 'En preparación',
    sub: 'La cocina está preparando tu pedido',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M8 22V14a6 6 0 1012 0v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M4 22h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M12 8V4M9 9L7 6M15 9l2-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    status: 'ready_for_pickup',
    label: '¡Listo!',
    sub: 'Tu pedido está listo para retirar',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2l3 6.5 7 1-5 4.8 1.2 7L12 18l-6.2 3.3L7 14.3 2 9.5l7-1L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    status: 'completed',
    label: 'Entregado',
    sub: '¡Buen provecho!',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M20 7l-11 11-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

// Mapeo de status al índice del step activo
function getActiveStep(status: OrderStatus): number {
  if (['pending_payment', 'payment_confirmed', 'pending_validation'].includes(status)) return 0;
  if (['sent_to_kitchen', 'in_preparation'].includes(status)) return 1;
  if (status === 'ready_for_pickup') return 2;
  if (['delivered', 'completed'].includes(status)) return 3;
  return 0;
}

// Mensajes dinámicos según el estado
function getStatusMessage(status: OrderStatus): { title: string; color: string } {
  const map: Partial<Record<OrderStatus, { title: string; color: string }>> = {
    pending_payment:    { title: 'Pedido recibido',       color: '#6b6775' },
    payment_confirmed:  { title: 'Pago confirmado',       color: '#3b82f6' },
    pending_validation: { title: 'Validando pedido...',   color: '#eab308' },
    sent_to_kitchen:    { title: 'Enviado a cocina',      color: '#f97316' },
    in_preparation:     { title: 'En preparación 🔥',    color: '#f97316' },
    ready_for_pickup:   { title: '¡Pedido listo! 🎉',    color: '#22c55e' },
    delivered:          { title: 'Entregado',             color: '#22c55e' },
    completed:          { title: '¡Buen provecho! 🍽️',  color: '#22c55e' },
    cancelled:          { title: 'Pedido cancelado',      color: '#ef4444' },
  };
  return map[status] ?? { title: 'Procesando...', color: '#6b6775' };
}

export default function OrderTracker() {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const { activeOrder, setActiveOrder } = useOrderStore();

  const [order, setOrder]     = useState<Order | null>(activeOrder);
  const [loading, setLoading] = useState(!activeOrder);
  const [error, setError]     = useState<string | null>(null);
  const [readyAlert, setReadyAlert] = useState(false);

  // Cargar orden si no está en el store (ej: recarga de página)
  useEffect(() => {
    if (!id) return;
    if (activeOrder?.id === id) {
      setOrder(activeOrder);
      return;
    }
    setLoading(true);
    getOrderById(id)
      .then((data) => {
        setOrder(data);
        setActiveOrder(data);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, activeOrder, setActiveOrder]);

  // Sincronizar cambios del store (actualizados por WS) con estado local
  useEffect(() => {
    if (activeOrder && activeOrder.id === id) {
      setOrder((prev) =>
        prev ? { ...prev, status: activeOrder.status } : activeOrder
      );
    }
  }, [activeOrder?.status, id]);

  // WebSocket — escuchar eventos de esta orden
  useWebSocket({
    orderId: id ?? null,
    onStatusChange: (event) => {
      console.log('[Tracker] status change:', event.status);
    },
    onReady: (_event: WsOrderReadyEvent) => {
      setReadyAlert(true);
      // Auto-cerrar alerta después de 5 segundos
      setTimeout(() => setReadyAlert(false), 5000);
    },
  });

  if (loading) {
    return (
      <div className="tracker-loading">
        <div className="tracker-spinner" />
        <p>Cargando tu pedido...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="tracker-error">
        <p>No se pudo cargar el pedido</p>
        <span>{error}</span>
        <button onClick={() => navigate('/autoservicio/menu')}>Volver al menú</button>
      </div>
    );
  }

  const activeStep    = getActiveStep(order.status);
  const statusMsg     = getStatusMessage(order.status);
  const isCompleted   = ['delivered', 'completed'].includes(order.status);
  const isReady       = order.status === 'ready_for_pickup';

  return (
    <div className="tracker-root">
      <div className="tracker-bg">
        <div className={`tracker-blob ${isReady ? 'tb-green' : 'tb-orange'}`} />
      </div>

      {/* Header */}
      <header className="tracker-header">
        <span className="tracker-order-num">Pedido #{order.order_number}</span>
        <span className="tracker-table">
          {order.table_id ? `Mesa asignada` : 'Pedido para llevar'}
        </span>
      </header>

      {/* Estado actual */}
      <div className="tracker-status-card" style={{ '--status-color': statusMsg.color } as React.CSSProperties}>
        <div className="tracker-status-dot" />
        <div>
          <h1 className="tracker-status-title">{statusMsg.title}</h1>
          <p className="tracker-status-sub">
            {STEPS[activeStep]?.sub ?? 'Procesando tu pedido...'}
          </p>
        </div>
      </div>

      {/* Alerta de pedido listo */}
      {readyAlert && (
        <div className="tracker-ready-alert">
          <span className="ready-icon">🎉</span>
          <div>
            <p className="ready-title">¡Tu pedido está listo!</p>
            <p className="ready-sub">Retíralo en el mostrador</p>
          </div>
          <button className="ready-close" onClick={() => setReadyAlert(false)}>×</button>
        </div>
      )}

      {/* Timeline */}
      <div className="tracker-timeline">
        {STEPS.map((step, i) => {
          const isDone    = i < activeStep;
          const isActive  = i === activeStep;
          const isPending = i > activeStep;

          return (
            <div key={step.status} className={`tl-step ${isDone ? 'tl-done' : ''} ${isActive ? 'tl-active' : ''} ${isPending ? 'tl-pending' : ''}`}>
              {/* Línea conectora */}
              {i < STEPS.length - 1 && (
                <div className={`tl-line ${isDone || isActive ? 'tl-line--active' : ''}`} />
              )}

              {/* Icono del paso */}
              <div className="tl-icon-wrap">
                {isDone ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                ) : (
                  step.icon
                )}
                {isActive && <div className="tl-pulse" />}
              </div>

              {/* Texto */}
              <div className="tl-text">
                <span className="tl-label">{step.label}</span>
                {isActive && <span className="tl-sub">{step.sub}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detalle de items */}
      <div className="tracker-items-card">
        <h3 className="tracker-items-title">Detalle del pedido</h3>
        {order.items && order.items.length > 0 ? (
          <ul className="tracker-items-list">
            {order.items.map((item) => (
              <li key={item.id} className="tracker-item">
                <span className="ti-qty">{item.quantity}×</span>
                <span className="ti-name">{item.name}</span>
                <span className="ti-price">${(item.price * item.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="tracker-items-empty">Cargando items...</p>
        )}
        <div className="tracker-total">
          <span>Total</span>
          <span>${order.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Acción post-entrega */}
      {isCompleted && (
        <div className="tracker-done-actions">
          <p className="done-msg">¡Gracias por tu visita!</p>
          <button
            className="done-btn"
            onClick={() => navigate('/')}
          >
            Hacer otro pedido
          </button>
        </div>
      )}
    </div>
  );
}
