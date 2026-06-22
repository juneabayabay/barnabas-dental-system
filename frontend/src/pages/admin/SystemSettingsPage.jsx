import { useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import ErrorMessage from '../../components/common/ErrorMessage';
import AlertBanner from '../../components/common/AlertBanner';
import QueryState from '../../components/common/QueryState';
import DataTable from '../../components/common/DataTable';
import {
  useClinicSettings,
  useUpdateClinicSettings,
  useEmailSettings,
  useUpdateEmailSettings,
  useTestEmailSettings,
  useStaffProcedures,
  useCreateStaffProcedure,
  useUpdateStaffProcedure,
} from '../../hooks/useSettings';
import { usePermission } from '../../hooks/usePermission';
import { parseApiError, formatPrice } from '../../utils/formatters';

export default function SystemSettingsPage() {
  const [tab, setTab] = useState('clinic');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [settingsDraft, setSettingsDraft] = useState({});
  const [procForm, setProcForm] = useState(null);
  const [emailForm, setEmailForm] = useState({ smtp_user: '', smtp_app_password: '', test_email: '' });
  const { can } = usePermission();

  const settings = useClinicSettings();
  const emailSettings = useEmailSettings();
  const procedures = useStaffProcedures();
  const updateSettings = useUpdateClinicSettings();
  const updateEmailSettings = useUpdateEmailSettings();
  const testEmailSettings = useTestEmailSettings();
  const createProc = useCreateStaffProcedure();
  const updateProc = useUpdateStaffProcedure();

  const canManage = can('settings.manage');

  const handleSaveSettings = async () => {
    setError('');
    const payload = (settings.data || []).map((s) => ({
      key: s.key,
      value: settingsDraft[s.key] ?? s.value,
    }));
    try {
      await updateSettings.mutateAsync(payload);
      setMessage('Clinic settings saved.');
      setSettingsDraft({});
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const handleSaveEmail = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {};
      if (emailForm.smtp_user.trim()) payload.smtp_user = emailForm.smtp_user.trim();
      if (emailForm.smtp_app_password.trim()) payload.smtp_app_password = emailForm.smtp_app_password.trim();
      if (!payload.smtp_user && !payload.smtp_app_password) {
        setError('Enter your Gmail address and App Password.');
        return;
      }
      await updateEmailSettings.mutateAsync(payload);
      setMessage('Gmail settings saved. Password reset emails can now be sent.');
      setEmailForm((f) => ({ ...f, smtp_app_password: '' }));
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const handleTestEmail = async () => {
    setError('');
    try {
      const res = await testEmailSettings.mutateAsync(
        emailForm.test_email.trim() || emailForm.smtp_user.trim() || emailSettings.data?.smtp_user
      );
      setMessage(res.data.detail || 'Test email sent.');
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const handleSaveProcedure = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (procForm.id) {
        await updateProc.mutateAsync({ id: procForm.id, data: procForm });
      } else {
        await createProc.mutateAsync(procForm);
      }
      setMessage('Procedure saved.');
      setProcForm(null);
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const procColumns = [
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    { key: 'duration_minutes', label: 'Duration (min)' },
    { key: 'price', label: 'Price', render: (r) => formatPrice(r.price) },
    {
      key: 'active',
      label: 'Active',
      render: (r) => (r.is_active ? 'Yes' : 'No'),
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            label: '',
            render: (r) => (
              <div className="flex gap-2">
                <button type="button" className="text-sm text-sky-600" onClick={() => setProcForm({ ...r })}>
                  Edit
                </button>
                {r.is_active && (
                  <button
                    type="button"
                    className="text-sm text-red-600"
                    onClick={async () => {
                      if (!window.confirm(`Deactivate procedure "${r.name}"?`)) return;
                      setError('');
                      try {
                        await updateProc.mutateAsync({ id: r.id, data: { is_active: false } });
                        setMessage('Procedure deactivated.');
                      } catch (err) {
                        setError(parseApiError(err));
                      }
                    }}
                  >
                    Deactivate
                  </button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="System Settings" subtitle="Clinic configuration and procedures" />

      {message && <AlertBanner message={message} onDismiss={() => setMessage('')} />}
      <ErrorMessage message={error} />

      <div className="flex flex-wrap gap-2">
        {['clinic', 'email', 'procedures'].map((t) => (
          <button
            key={t}
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
              tab === t ? 'bg-sky-600 text-white' : 'bg-white text-slate-600'
            }`}
            onClick={() => {
              setTab(t);
              if (t === 'email' && emailSettings.data && !emailForm.smtp_user) {
                setEmailForm((f) => ({
                  ...f,
                  smtp_user: emailSettings.data.smtp_user || 'abayabayytchannel@gmail.com',
                  test_email: emailSettings.data.smtp_user || 'abayabayytchannel@gmail.com',
                }));
              }
            }}
          >
            {t === 'email' ? 'Email (Gmail)' : t}
          </button>
        ))}
      </div>

      {tab === 'clinic' && (
        <QueryState isLoading={settings.isLoading} isError={settings.isError} error={settings.error}>
          <div className="card space-y-4">
            {(settings.data || []).map((s) => (
              <label key={s.key} className="label block">
                {s.key.replace(/_/g, ' ')}
                <input
                  className="input max-w-md"
                  value={settingsDraft[s.key] ?? s.value}
                  onChange={(e) => setSettingsDraft((d) => ({ ...d, [s.key]: e.target.value }))}
                  disabled={!canManage}
                />
                {s.description && <span className="mt-1 block text-xs text-slate-400">{s.description}</span>}
              </label>
            ))}
            {canManage && (
              <button type="button" className="btn-primary btn-sm" onClick={handleSaveSettings} disabled={updateSettings.isPending}>
                Save settings
              </button>
            )}
          </div>
        </QueryState>
      )}

      {tab === 'email' && (
        <QueryState isLoading={emailSettings.isLoading} isError={emailSettings.isError} error={emailSettings.error}>
          <div className="card space-y-4 max-w-lg">
            <p className="text-sm text-slate-600">
              Configure Gmail so forgot-password links are delivered to patients in their inbox
              (not shown on the website).
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
              <li>Google Account → Security → 2-Step Verification → ON</li>
              <li>App passwords → Mail → copy the 16-character password</li>
              <li>Paste below and save</li>
            </ol>
            {emailSettings.data?.smtp_ready ? (
              <p className="text-sm font-medium text-emerald-700">Gmail is configured and ready.</p>
            ) : (
              <p className="text-sm font-medium text-amber-700">Gmail is not configured yet.</p>
            )}
            {canManage ? (
              <form onSubmit={handleSaveEmail} className="space-y-4">
                <label className="label">
                  Gmail address (sender)
                  <input
                    type="email"
                    className="input"
                    placeholder="abayabayytchannel@gmail.com"
                    value={emailForm.smtp_user || emailSettings.data?.smtp_user || ''}
                    onChange={(e) => setEmailForm((f) => ({ ...f, smtp_user: e.target.value }))}
                    required
                  />
                </label>
                <label className="label">
                  Google App Password (16 characters, no spaces)
                  <input
                    type="password"
                    className="input"
                    placeholder={emailSettings.data?.password_configured ? '••••••••••••••••' : 'Paste app password'}
                    value={emailForm.smtp_app_password}
                    onChange={(e) => setEmailForm((f) => ({ ...f, smtp_app_password: e.target.value }))}
                  />
                </label>
                <label className="label">
                  Send test email to
                  <input
                    type="email"
                    className="input"
                    placeholder="abayabayytchannel@gmail.com"
                    value={emailForm.test_email}
                    onChange={(e) => setEmailForm((f) => ({ ...f, test_email: e.target.value }))}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="submit" className="btn-primary btn-sm" disabled={updateEmailSettings.isPending}>
                    Save Gmail settings
                  </button>
                  <button
                    type="button"
                    className="btn-outline btn-sm"
                    onClick={handleTestEmail}
                    disabled={testEmailSettings.isPending || !emailSettings.data?.smtp_ready}
                  >
                    Send test email
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-slate-500">Only administrators can change email settings.</p>
            )}
          </div>
        </QueryState>
      )}

      {tab === 'procedures' && (
        <>
          {canManage && (
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() =>
                setProcForm({
                  name: '',
                  slug: '',
                  category: 'minor',
                  duration_minutes: 30,
                  price: '0',
                  is_active: true,
                })
              }
            >
              + Add procedure
            </button>
          )}
          {procForm && (
            <form onSubmit={handleSaveProcedure} className="card grid gap-4 sm:grid-cols-2">
              {['name', 'slug', 'category', 'duration_minutes', 'price'].map((f) => (
                <label key={f} className="label capitalize">
                  {f.replace('_', ' ')}
                  <input
                    className="input"
                    type={f === 'duration_minutes' || f === 'price' ? 'number' : 'text'}
                    value={procForm[f]}
                    onChange={(e) => setProcForm((p) => ({ ...p, [f]: e.target.value }))}
                    required={f !== 'slug'}
                  />
                </label>
              ))}
              <div className="flex gap-2 sm:col-span-2">
                <button type="submit" className="btn-primary btn-sm">Save</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => setProcForm(null)}>Cancel</button>
              </div>
            </form>
          )}
          <QueryState isLoading={procedures.isLoading} isError={procedures.isError} error={procedures.error}>
            <DataTable columns={procColumns} rows={procedures.data || []} />
          </QueryState>
        </>
      )}
    </div>
  );
}
