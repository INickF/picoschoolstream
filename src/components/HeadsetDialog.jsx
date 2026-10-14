import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n.jsx';

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

// mode: 'add' | 'rename' | 'ip'
export default function HeadsetDialog({ mode, headset, headsets, onSubmit, onClose }) {
  const t = useT();
  const [name, setName] = useState(
    headset?.name ?? t('dialog.defaultName', { n: String(headsets.length + 1).padStart(2, '0') }),
  );
  const [ip, setIp] = useState(headset?.ip ?? '192.168.0.');
  const [error, setError] = useState('');
  const firstInput = useRef(null);

  const showName = mode !== 'ip';
  const showIp = mode !== 'rename';

  useEffect(() => {
    firstInput.current?.focus();
    firstInput.current?.select();
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const submit = (e) => {
    e.preventDefault();
    const n = name.trim();
    const a = ip.trim();
    if (showName && !n) return setError(t('dialog.errName'));
    if (showIp && !IPV4.test(a)) return setError(t('dialog.errIp'));
    if (showIp && headsets.some((h) => h.ip === a && h.id !== headset?.id)) {
      return setError(t('dialog.errDup'));
    }
    onSubmit({ name: n, ip: a });
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="modal" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
        <h2>{t(`dialog.${mode}`)}</h2>
        {showName && (
          <label>
            {t('dialog.name')}
            <input ref={firstInput} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
          </label>
        )}
        {showIp && (
          <label>
            {t('dialog.ipLabel')}
            <input
              ref={showName ? undefined : firstInput}
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              spellCheck={false}
            />
          </label>
        )}
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="ghost-btn" onClick={onClose}>
            {t('dialog.cancel')}
          </button>
          <button type="submit" className="primary-btn">
            {mode === 'add' ? t('dialog.submitAdd') : t('dialog.save')}
          </button>
        </div>
      </form>
    </div>
  );
}
