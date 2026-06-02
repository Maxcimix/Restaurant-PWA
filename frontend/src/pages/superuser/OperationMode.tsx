import { useEffect, useState } from 'react';
import { Save, Smartphone, Users, Layers } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { getSuperuserConfig, updateSuperuserConfig } from '../../services/superuserService';

type Mode = 'autoservicio' | 'mesero' | 'ambos';

const MODES = [
  { id: 'autoservicio' as Mode, icon: <Smartphone size={28}/>, label: 'Autoservicio',  desc: 'Solo kiosco QR. Los clientes piden desde su dispositivo.' },
  { id: 'mesero'       as Mode, icon: <Users size={28}/>,      label: 'Con mesero',    desc: 'Solo servicio con mesero. Pedidos en mesa.' },
  { id: 'ambos'        as Mode, icon: <Layers size={28}/>,     label: 'Ambos modos',   desc: 'Autoservicio y mesero disponibles simultáneamente.' },
];

export default function OperationMode() {
  const { setOperationMode, reloadConfig } = useAppStore();
  const [selected, setSelected] = useState<Mode>('ambos');
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    getSuperuserConfig().then((cfg) => setSelected(cfg.operation_mode)).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
     await updateSuperuserConfig({ operation_mode: selected });
setOperationMode(selected);
await reloadConfig();
window.dispatchEvent(new CustomEvent('rpwa:config-update'));
      setMsg({ text: 'Modo actualizado correctamente', ok: true });
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
          <h1 className="admin-page-title">Modo de Operación</h1>
          <p className="admin-page-sub">Define cómo el restaurante recibe pedidos</p>
        </div>
        <button className="admin-btn-primary" onClick={handleSave} disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Save size={14}/> {saving ? 'Aplicando...' : 'Guardar'}
        </button>
      </div>

      {msg && (
        <div className={msg.ok ? 'admin-success-banner' : 'admin-error-banner'}>
          {msg.text}
        </div>
      )}

      <div className="admin-form-card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {MODES.map((m) => (
            <button key={m.id} type="button" onClick={() => setSelected(m.id)}
              style={{
                textAlign: 'left', padding: '16px 20px',
                background: selected === m.id ? 'var(--a-indigo-soft)' : 'var(--a-bg)',
                border: selected === m.id ? '2px solid var(--a-indigo)' : '2px solid var(--a-border)',
                borderRadius: '10px', cursor: 'pointer',
                color: 'var(--a-text)', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: '16px',
              }}>
              <span style={{ color: selected === m.id ? 'var(--a-indigo)' : 'var(--a-text-muted)', flexShrink: 0 }}>
                {m.icon}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{m.label}</div>
                <div style={{ fontSize: '12px', color: 'var(--a-text-muted)', marginTop: '2px' }}>{m.desc}</div>
              </div>
              {selected === m.id && <span style={{ color: 'var(--a-indigo)', fontWeight: 700 }}>✓</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}