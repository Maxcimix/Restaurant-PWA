// ============================================================
// frontend/src/components/autoservicio/Cart.tsx
//
// Sidebar deslizable que muestra los items del carrito.
// Controles +/- por item, subtotales y total general.
// Se cierra al hacer click fuera o con botón X.
// ============================================================

import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import './Cart.css';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Cart({ isOpen, onClose }: CartProps) {
  const navigate    = useNavigate();
  const { items, updateQty, removeItem, getTotal, getTotalItems } = useCartStore();

  const total      = getTotal();
  const totalItems = getTotalItems();

  function handleCheckout() {
    onClose();
    navigate('/autoservicio/checkout');
  }

  return (
    <>
      {/* Overlay oscuro detrás del sidebar */}
      <div
        className={`cart-overlay ${isOpen ? 'cart-overlay--visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`cart-sidebar ${isOpen ? 'cart-sidebar--open' : ''}`} aria-label="Carrito de compras">
        {/* Header */}
        <div className="cart-header">
          <div className="cart-header-left">
            <h2 className="cart-title">Tu pedido</h2>
            {totalItems > 0 && (
              <span className="cart-count">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
            )}
          </div>
          <button className="cart-close" onClick={onClose} aria-label="Cerrar carrito">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Lista de items */}
        <div className="cart-body">
          {items.length === 0 ? (
            <div className="cart-empty">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
                <path d="M16 20h16l-2 12H18L16 20z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" opacity="0.5"/>
                <path d="M20 20v-4a4 4 0 018 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
              </svg>
              <p>Tu carrito está vacío</p>
              <span>Agrega items del menú</span>
            </div>
          ) : (
            <ul className="cart-list">
              {items.map(({ menuItem, quantity, notes }) => (
                <li key={menuItem.id} className="cart-item">
                  <div className="cart-item-info">
                    <span className="cart-item-name">{menuItem.name}</span>
                    {notes && <span className="cart-item-notes">{notes}</span>}
                    <span className="cart-item-price">
                      ${(menuItem.price * quantity).toFixed(2)}
                    </span>
                    <span className="cart-item-unit-price">
                      ${menuItem.price.toFixed(2)} c/u
                    </span>
                  </div>
                  <div className="cart-item-controls">
                    <button
                      className="qty-btn"
                      onClick={() => updateQty(menuItem.id, quantity - 1)}
                      aria-label="Reducir cantidad"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                    </button>
                    <span className="qty-value">{quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => updateQty(menuItem.id, quantity + 1)}
                      aria-label="Aumentar cantidad"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                    </button>
                    <button
                      className="cart-item-remove"
                      onClick={() => removeItem(menuItem.id)}
                      aria-label="Eliminar item"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer con total y botón de checkout */}
        {items.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total-row">
              <span className="cart-total-label">Total estimado</span>
              <span className="cart-total-value">${total.toFixed(2)}</span>
            </div>
            <p className="cart-total-note">El total final se confirma en caja</p>
            <button className="cart-checkout-btn" onClick={handleCheckout}>
              Ir al checkout
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 9h10M10 5l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
