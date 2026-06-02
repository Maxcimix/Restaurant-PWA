import { useEffect, useRef, useState } from 'react';
import { Upload, Trash2, Save } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { getSuperuserConfig, updateSuperuserConfig } from '../../services/superuserService';
import { apiFetch } from '../../services/api';

export default function BrandSettings() {
  const { setBrand } = useAppStore();
  const [form, setForm] = useState({ restaurant_name: '', logo_url: '' });
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg]             = useState<{ text: string; ok: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSuperuserConfig().then((cfg) => {
      setForm({ restaurant_name: cfg.restaurant_name, logo_url: cfg.logo_url ?? '' });
    }).catch(() => {});
  }, []);

  const showMsg = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3500);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const token = localStorage.getItem('rpwa-token');
      // NO usar apiFetch: fuerza Content-Type: application/json, lo que impide
      // que multer detecte el boundary multipart y parsee el archivo.
      // Con fetch directo el browser establece el Content-Type: multipart/form-data correcto.
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Error al subir el logo' }));
        throw new Error(err.message ?? 'Error al subir el logo');
      }
      const data = await res.json() as { url: string };
      setForm((f) => ({ ...f, logo_url: data.url }));
      showMsg('Logo subido correctamente', true);
    } catch (err) {
      console.error('[BrandSettings/upload]', err);
      showMsg(err instanceof Error ? err.message : 'Error al subir el logo', false);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSuperuserConfig({
        restaurant_name: form.restaurant_name,
        logo_url:        form.logo_url || null,
      });
      setBrand({ restaurantName: form.restaurant_name, logoUrl: form.logo_url || null });
      showMsg('Marca actualizada correctamente', true);
    } catch {
      showMsg('Error al guardar', false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Marca</h1>
          <p className="admin-page-sub">Nombre y logo del restaurante</p>
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
        <h3 className="admin-form-title">Nombre del restaurante</h3>
        <div className="admin-field">
          <label>Nombre *</label>
          <input className="admin-input" value={form.restaurant_name}
            onChange={(e) => setForm((f) => ({ ...f, restaurant_name: e.target.value }))}
            placeholder="Mi Restaurante" />
        </div>
      </div>

      <div className="admin-form-card" style={{ marginTop: '20px' }}>
        <h3 className="admin-form-title">Logo</h3>
        <div style={{
          height: '140px', borderRadius: '8px', marginBottom: '16px',
          border: '1px dashed var(--a-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--a-bg)',
        }}>
          {form.logo_url
            ? <img src={form.logo_url} alt="logo"
                style={{ maxHeight: '120px', maxWidth: '100%', objectFit: 'contain' }} />
            : <span style={{ color: 'var(--a-text-muted)', fontSize: '13px' }}>Sin logo</span>
          }
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="admin-btn-primary" onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Upload size={14}/> {uploading ? 'Subiendo...' : 'Subir imagen'}
          </button>
          {form.logo_url && (
            <button className="admin-btn-ghost"
              onClick={() => setForm((f) => ({ ...f, logo_url: '' }))}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Trash2 size={14}/> Quitar
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
        <p style={{ fontSize: '12px', color: 'var(--a-text-muted)', marginTop: '10px' }}>
          JPG, PNG, WebP · Máximo 5MB
        </p>
      </div>
    </div>
  );
}