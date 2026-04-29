// ============================================================
// frontend/src/types/cashier.ts  —  Fase 7: Caja Con Mesero
//
// Tipos del módulo de cobro para la modalidad Con Mesero.
// Archivo independiente para no tocar types/order.ts ni types/table.ts.
//
// DECISIÓN: No se modifica OrderStatus ni TableStatus.
//   - La orden pasa a 'completed' al cerrar (status ya existe).
//   - La mesa pasa a 'available' al liberar (status ya existe).
//   - Se usa payment_status = 'paid' en la orden (campo ya existe en schema).
// ============================================================

/** Métodos de pago disponibles en el módulo caja con mesero */
export type CashierPaymentMethod =
  | 'efectivo'
  | 'tarjeta_debito'
  | 'tarjeta_credito'
  | 'transferencia';

/** Mesa en estado waiting_bill enriquecida con datos de la orden */
export interface WaitingTable {
  // Datos de la mesa
  tableId:     string;
  tableNumber: number;
  section:     string | null;
  capacity:    number;

  // Datos de la orden activa
  orderId:        string;
  orderNumber:    string;
  orderStatus:    string;
  subtotal:       number;
  tax:            number;
  total:          number;
  paymentMethod:  string | null;
  waiterName:     string | null;
  createdAt:      string;   // inicio del servicio para calcular duración
  deliveredAt:    string | null;
}

/** Detalle completo de la cuenta a presentar al cliente */
export interface BillDetail {
  orderId:      string;
  orderNumber:  string;
  tableId:      string;
  tableNumber:  number;
  section:      string | null;
  waiterName:   string | null;

  items: BillItem[];

  subtotal:     number;
  tax:          number;      // IVA calculado en backend
  tip:          number;      // propina registrada (default 0)
  suggestedTip: number;      // 10% del subtotal — sugerida al cliente
  total:        number;      // subtotal + tax + tip

  createdAt:    string;
  deliveredAt:  string | null;
  generatedAt:  string;      // timestamp de generación de la cuenta
}

/** Item dentro de la cuenta */
export interface BillItem {
  name:                string;
  quantity:            number;
  unitPrice:           number;
  subtotal:            number;
  specialInstructions: string | null;
}

/** Payload para procesar el pago */
export interface PayOrderPayload {
  method:      CashierPaymentMethod;
  amountPaid:  number;              // monto entregado por el cliente
  tip?:        number;              // propina adicional ingresada por la caja
  reference?:  string;              // número de referencia (tarjeta/transferencia)
}

/** Respuesta del endpoint de pago */
export interface PayOrderResponse {
  orderId:    string;
  paidAt:     string;
  amountPaid: number;
  change:     number;   // vuelto (0 si no es efectivo)
  tip:        number;
  total:      number;
  receipt:    ReceiptData;
}

/** Datos del comprobante generado al cerrar */
export interface ReceiptData {
  orderNumber:   string;
  tableNumber:   number;
  section:       string | null;
  waiterName:    string | null;
  items:         BillItem[];
  subtotal:      number;
  tax:           number;
  tip:           number;
  total:         number;
  amountPaid:    number;
  change:        number;
  method:        CashierPaymentMethod;
  reference:     string | null;
  createdAt:     string;
  paidAt:        string;
}

/** Evento WebSocket: orden pagada */
export interface WsOrderPaidEvent {
  orderId:     string;
  tableId:     string;
  tableNumber: number;
  paidAt:      string;
}

/** Evento WebSocket: mesa liberada */
export interface WsTableReleasedEvent {
  tableId:     string;
  tableNumber: number;
  status:      'available';
}
// ── Panel monitor de caja (visible desde sent_to_kitchen) ────

/** Orden en el panel de monitoreo de caja.
 *  Se muestra desde que el mesero la envía a cocina.
 *  Caja solo puede cobrar cuando status === 'waiting_bill'.
 */
export interface MonitorOrder {
  orderId:       string;
  orderNumber:   string;
  tableId:       string | null;
  tableNumber:   number | null;
  waiterName:    string | null;
  status:        string;
  paymentMethod: string | null;
  tip:           number;
  subtotal:      number;
  tax:           number;
  total:         number;
  createdAt:     string;
  items:         MonitorOrderItem[];
}

export interface MonitorOrderItem {
  name:     string;
  quantity: number;
  notes:    string | null;
}

/** Evento WebSocket que llega cuando el mesero solicita la cuenta */
export interface WsBillRequestedEvent {
  orderId:       string;
  orderNumber:   string;
  tableId:       string;
  paymentMethod: string;
  tip:           number;
  subtotal:      number;
  tax:           number;
  total:         number;
  status:        'waiting_bill';
}
