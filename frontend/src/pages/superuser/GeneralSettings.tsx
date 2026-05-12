import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { getSuperuserConfig, updateSuperuserConfig } from '../../services/superuserService';

export default function GeneralSettings() {
  const { reloadConfig } = useAppStore();
  const [form, setForm] = useState({
    address: '', phone: '', tax_rate: '0', tip_suggestion: '0', currency: 'COP', timezone: 'America/Bogota',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    getSuperuserConfig().then((cfg) => {
      setForm({
        address:        cfg.address        ?? '',
        phone:          cfg.phone          ?? '',
        tax_rate:       String(cfg.tax_rate),
        tip_suggestion: String(cfg.tip_suggestion),
        currency:       cfg.currency,
        timezone:       cfg.timezone,
      });
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSuperuserConfig({
        address:        form.address || null,
        phone:          form.phone   || null,
        tax_rate:       parseFloat(form.tax_rate)       || 0,
        tip_suggestion: parseFloat(form.tip_suggestion) || 0,
        currency:       form.currency,
        timezone:       form.timezone,
      } as Parameters<typeof updateSuperuserConfig>[0]);
      await reloadConfig();
      setMsg({ text: 'Configuración guardada correctamente', ok: true });
    } catch {
      setMsg({ text: 'Error al guardar', ok: false });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 3500);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Configuración General</h1>
          <p className="admin-page-sub">IVA, propina, moneda y zona horaria</p>
        </div>
        <button className="admin-btn-primary" onClick={handleSave} disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Save size={14}/> {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {msg && (
        <div className={msg.ok ? 'admin-success-banner' : 'admin-error-banner'}>
          {msg.text}
        </div>
      )}

      <div className="admin-form-card">
        <h3 className="admin-form-title">Datos del local</h3>
        <div className="admin-form-grid">
          <div className="admin-field admin-field--full">
            <label>Dirección</label>
            <input className="admin-input" value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Calle 123 #45-67, Ciudad" />
          </div>
          <div className="admin-field">
            <label>Teléfono</label>
            <input className="admin-input" value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+57 300 000 0000" />
          </div>
        </div>
      </div>

      <div className="admin-form-card" style={{ marginTop: '20px' }}>
        <h3 className="admin-form-title">Parámetros financieros</h3>
        <div className="admin-form-grid">
          <div className="admin-field">
            <label>IVA (%)</label>
            <input className="admin-input" type="number" min="0" max="100" step="0.1"
              value={form.tax_rate}
              onChange={(e) => setForm((f) => ({ ...f, tax_rate: e.target.value }))} />
          </div>
          <div className="admin-field">
            <label>Propina sugerida (%)</label>
            <input className="admin-input" type="number" min="0" max="50" step="0.5"
              value={form.tip_suggestion}
              onChange={(e) => setForm((f) => ({ ...f, tip_suggestion: e.target.value }))} />
          </div>
          <div className="admin-field">
            <label>Moneda</label>
            <select className="admin-select" value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>
              <option value="COP">COP – Peso colombiano</option>
              <option value="USD">USD – Dólar</option>
              <option value="EUR">EUR – Euro</option>
              <option value="MXN">MXN – Peso mexicano</option>
              <option value="PEN">PEN – Sol peruano</option>
              <option value="CLP">CLP – Peso chileno</option>
            </select>
          </div>
          <div className="admin-field">
            <label>Zona horaria</label>
            <select className="admin-select" value={form.timezone}
              onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}>
              <option value="America/Bogota">America/Bogota (COT)</option>
              <option value="America/Mexico_City">America/Mexico_City (CST)</option>
              <option value="America/Lima">America/Lima (PET)</option>
              <option value="America/Santiago">America/Santiago (CLT)</option>
              <option value="America/Buenos_Aires">America/Buenos_Aires (ART)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Europe/Madrid">Europe/Madrid (CET)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}