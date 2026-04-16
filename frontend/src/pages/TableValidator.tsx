// ============================================================
// frontend/src/pages/TableValidator.tsx  →  /autoservicio/mesa
//
// Pantalla de entrada al flujo autoservicio.
// El cliente ingresa el número de mesa (o viene de un QR que
// incluye el código en la URL como ?mesa=5).
// Valida contra el backend y guarda tableId en el cartStore.
// ============================================================

import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { validateTable } from '../services/tableService';
import { useCartStore } from '../store/cartStore';
import { ApiError } from '../services/api';
import '../styles/TableValidator.css';

export default function TableValidator() {
  const navigate       = useNavigate();
  const [params]       = useSearchParams();
  const { setTable, tableId } = useCartStore();

  const [code, setCode]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  // Si ya tiene mesa asignada, ir directo al menú
  useEffect(() => {
    if (tableId) navigate('/autoservicio/menu', { replace: true });
  }, [tableId, navigate]);

  // Si viene de QR con ?mesa=X, auto-validar
  useEffect(() => {
    const qrCode = params.get('mesa');
    if (qrCode) {
      setCode(qrCode);
      handleValidate(qrCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleValidate(codeOverride?: string) {
    const target = (codeOverride ?? code).trim();
    if (!target) { setError('Ingresa el número de mesa'); return; }

    setLoading(true);
    setError(null);

    try {
      const table = await validateTable(target);
      setTable(table.id, table.number);
      navigate('/autoservicio/menu');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 404
          ? `Mesa "${target}" no encontrada`
          : err.message
        );
      } else {
        setError('Error de conexión. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    handleValidate();
  }

  return (
    <div className="tv-root">
      <div className="tv-bg">
        <div className="tv-blob" />
        <div className="tv-noise" />
      </div>

      <div className="tv-card">
        <div className="tv-logo">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <path d="M22 2L41 12.5V31.5L22 42L3 31.5V12.5L22 2Z" fill="url(#tvlg)"/>
            <defs>
              <linearGradient id="tvlg" x1="3" y1="2" x2="41" y2="42" gradientUnits="userSpaceOnUse">
                <stop stopColor="#f97316"/><stop offset="1" stopColor="#ea580c"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="tv-header">
          <h1 className="tv-title">Bienvenido</h1>
          <p className="tv-sub">Ingresa el número de tu mesa para ver el menú</p>
        </div>

        <form className="tv-form" onSubmit={onSubmit}>
          <div className="tv-field">
            <label className="tv-label" htmlFor="mesa-input">Número de mesa</label>
            <input
              id="mesa-input"
              type="text"
              inputMode="numeric"
              className={`tv-input ${error ? 'tv-input--error' : ''}`}
              placeholder="Ej: 5"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(null); }}
              autoFocus
              disabled={loading}
            />
            {error && (
              <p className="tv-error-msg">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M7 4.5v3M7 9v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                {error}
              </p>
            )}
          </div>

          <button type="submit" className="tv-btn" disabled={loading || !code.trim()}>
            {loading ? <span className="tv-spinner" /> : 'Ver menú'}
          </button>
        </form>

        <p className="tv-hint">
          También puedes escanear el QR de tu mesa con la cámara
        </p>
      </div>
    </div>
  );
}
