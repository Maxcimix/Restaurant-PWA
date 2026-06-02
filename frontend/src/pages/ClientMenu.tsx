
// ============================================================
// frontend/src/pages/ClientMenu.tsx  →  /autoservicio/menu
//
// CAMBIOS vs Fase 3 original:
// - ELIMINADO: toda referencia a tableId / tableNumber / mesa.
//   Autoservicio accede directo al menú sin validar mesa.
// - CORREGIDO: tabs de categorías usan cat.id como key única
//   (evita duplicados en React).
// - ARQUITECTURA: 100% dinámico — sin nombres de categoría
//   hardcodeados. Renderiza lo que venga del backend.
// ============================================================

import { formatCOP } from '../utils/constants';
import { useState, useCallback } from 'react';
import { useMenu } from '../hooks/useMenu';
import { useCartStore } from '../store/cartStore';
import Cart from '../components/autoservicio/Cart';
import type { MenuItem } from '../types/menu';
import '../styles/clientmenu.css';
import { useStockAvailability } from '../hooks/useStockAvailability';

export default function ClientMenu() {
  const { addItem, getTotalItems } = useCartStore();
  const {
    categories,
    items,
    activeCategory,
    selectCategory,
    loading,
    loadingItems,
    error,
    hasCategories,
  } = useMenu();

  const [cartOpen, setCartOpen] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const { availability } = useStockAvailability();

  const totalItems = getTotalItems();

  const handleAddItem = useCallback(
    (item: MenuItem) => {
      addItem(item, 1);
      setAddedIds((prev) => new Set(prev).add(item.id));
      setTimeout(() => {
        setAddedIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }, 800);
    },
    [addItem]
  );

  return (
    <div className="menu-root">
      <header className="menu-header">
        <div className="menu-header-left">
          <div className="menu-logo">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 2L25 8.5V19.5L14 26L3 19.5V8.5L14 2Z" fill="url(#mlg)" />
              <defs>
                <linearGradient id="mlg" x1="3" y1="2" x2="25" y2="26" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#f97316" />
                  <stop offset="1" stopColor="#ea580c" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <p className="menu-brand">RestaurantPWA</p>
            <p className="menu-subtitle">Autoservicio</p>
          </div>
        </div>

        <button
          className="cart-trigger"
          onClick={() => setCartOpen(true)}
          aria-label="Abrir carrito"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.4 5h12M7 13L5.4 5M10 18a1 1 0 102 0 1 1 0 00-2 0M17 18a1 1 0 102 0 1 1 0 00-2 0"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
          {totalItems > 0 && (
            <span className="cart-badge">{totalItems}</span>
          )}
        </button>
      </header>

      <div className="menu-hero">
        <h1 className="menu-h1">¿Qué vas a pedir?</h1>
        <p className="menu-sub">Selecciona tus platos y agrega al carrito</p>
      </div>

      {loading ? (
        <div className="menu-loading">
          <div className="spinner-ring" />
          <span>Cargando menú...</span>
        </div>
      ) : error ? (
        <div className="menu-error">
          <p>No se pudo cargar el menú</p>
          <span>{error}</span>
          <button onClick={() => window.location.reload()}>Reintentar</button>
        </div>
      ) : !hasCategories ? (
        <div className="menu-empty-state">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
            <path d="M16 24h16M24 16v16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
          </svg>
          <p>El menú aún no está disponible</p>
          <span>Por favor regresa en unos minutos</span>
        </div>
      ) : (
        <>
          <nav className="cat-tabs" aria-label="Categorías del menú">
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`cat-tab ${activeCategory === cat.id ? 'cat-tab--active' : ''}`}
                onClick={() => selectCategory(cat.id)}
                aria-selected={activeCategory === cat.id}
                role="tab"
              >
                {cat.icon && (
                  <span className="cat-tab-icon" aria-hidden="true">
                    {cat.icon}
                  </span>
                )}
                {cat.name}
              </button>
            ))}
          </nav>

          <div className="menu-content">
            {loadingItems ? (
              <div className="items-loading" aria-busy="true" aria-label="Cargando items">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="item-skeleton"
                    style={{ animationDelay: `${i * 0.06}s` }}
                  />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="items-empty">
                <p>No hay items disponibles en esta categoría</p>
              </div>
            ) : (
              <ul className="items-grid" role="list">
                {items.map((item, i) => {
                  const isOutOfStock = item.is_out_of_stock || !(availability[item.id]?.available ?? true);
                  const stockReason  = availability[item.id]?.reason;
                  return (
                    <li
                      key={item.id}
                      className={`item-card ${isOutOfStock ? 'item-card--out' : ''}`}
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      <div className="item-img-wrap">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="item-img"
                            loading="lazy"
                          />
                        ) : (
                          <div className="item-img-placeholder" aria-hidden="true">
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                              <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                              <path d="M10 16c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
                            </svg>
                          </div>
                        )}
                        {isOutOfStock && (
                          <div className="item-out-badge" title={stockReason}>Agotado</div>
                        )}
                        {item.preparation_time != null && !isOutOfStock && (
                          <div className="item-time-badge">~{item.preparation_time} min</div>
                        )}
                      </div>

                      <div className="item-body">
                        <h3 className="item-name">{item.name}</h3>
                        {item.description && (
                          <p className="item-desc">{item.description}</p>
                        )}
                        <div className="item-footer">
                          <span className="item-price">
                            {formatCOP(item.price)}
                          </span>
                          <button
                            className={`item-add-btn ${addedIds.has(item.id) ? 'item-add-btn--added' : ''}`}
                            onClick={() => handleAddItem(item)}
                            disabled={isOutOfStock}
                            aria-label={`Agregar ${item.name} al carrito`}
                          >
                            {addedIds.has(item.id) ? (
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}

      {totalItems > 0 && (
        <button className="cart-fab" onClick={() => setCartOpen(true)}>
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
            <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.4 5h12M10 18a1 1 0 102 0M17 18a1 1 0 102 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>{totalItems} {totalItems === 1 ? 'item' : 'items'} · Ver carrito</span>
        </button>
      )}

      <Cart isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}