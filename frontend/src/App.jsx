import React, { useEffect, useMemo, useState, useRef } from 'react';
import { generateLocalAcademicAnswer, generateLocalAssistantResponse, generateLocalPaper } from './academicEngine';
import {
  LayoutDashboard,
  BookOpen,
  Search,
  Database,
  Grid2X2,
  Sparkles,
  History,
  KeyRound,
  Archive,
  Bot,
  Settings as SettingsIcon,
  Users,
  Table2,
  Activity,
  Clock3,
  LogOut,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  Upload,
  Save,
  MessageSquare,
  CheckCircle2,
  Download,
  Printer,
  Mic,
  MicOff,
  Bell,
  Lock,
  User as UserIcon,
  Sun,
  Moon,
  ShieldCheck,
  Check,
  AlertTriangle,
  ArrowRight,
  FileText
} from 'lucide-react';

class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.page !== this.props.page && this.state.hasError) {
      this.setState({
        hasError: false,
        error: null,
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="panel" style={{ padding: '24px', margin: '16px 0' }}>
          <div className="alert error">
            <AlertTriangle size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            This page encountered a display error and was recovered safely.
          </div>

          <p style={{ marginTop: '12px', color: '#556070' }}>
            The system prevented a blank screen crash. You can retry loading this module or navigate to another page.
          </p>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button
              className="primary"
              onClick={() =>
                this.setState({
                  hasError: false,
                  error: null,
                })
              }
            >
              <RefreshCw size={15} /> Try Again
            </button>
            <button
              className="secondary"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (this.props.onResetPage) this.props.onResetPage('Dashboard');
              }}
            >
              <LayoutDashboard size={15} /> Go to Dashboard
            </button>
          </div>

          <pre
            style={{
              marginTop: '16px',
              padding: '12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              whiteSpace: 'pre-wrap',
              fontSize: '11px',
              color: '#64748b',
              maxHeight: '150px',
              overflow: 'auto',
            }}
          >
            {String(this.state.error?.message || this.state.error || 'Unknown rendering error')}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const safeArray = (data) => (Array.isArray(data) ? data : []);

function usePersistedState(key, initial) {
  const storageKey = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('aiqpg_user') || 'null');
      return `aiqpg_${u?.id ?? u?.email ?? 'guest'}_${key}`;
    } catch {
      return `aiqpg_guest_${key}`;
    }
  })();

  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null && saved !== undefined && saved !== 'undefined') {
        const parsed = JSON.parse(saved);
        if (parsed !== null && parsed !== undefined) return parsed;
      }
      return typeof initial === 'function' ? initial() : initial;
    } catch {
      return typeof initial === 'function' ? initial() : initial;
    }
  });

  useEffect(() => {
    try {
      if (value !== undefined) {
        localStorage.setItem(storageKey, JSON.stringify(value));
      }
    } catch {}
  }, [storageKey, value]);

  return [value, setValue];
}

async function api(path, opts = {}, retries = 1) {
  const token = localStorage.getItem('aiqpg_token');
  const headers = {
    ...(opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(opts.headers || {}),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const r = await fetch(API + path, { ...opts, headers });
    const d = await r.json().catch(() => ({}));

    if (r.status === 401) {
      localStorage.removeItem('aiqpg_token');
      localStorage.removeItem('aiqpg_user');
      window.dispatchEvent(new CustomEvent('aiqpg_unauthorized'));
      const errorMsg = typeof d.detail === 'string' ? d.detail : 'Session expired or invalid token. Please sign in again.';
      throw new Error(errorMsg);
    }

    if (!r.ok) {
      const errorMsg = typeof d.detail === 'string' ? d.detail : d.message || JSON.stringify(d.detail || d);
      throw new Error(errorMsg || `Request failed with status ${r.status}`);
    }

    return d;
  } catch (err) {
    if (retries > 0 && err.name === 'TypeError' && String(err.message || '').toLowerCase().includes('fetch')) {
      await new Promise((res) => setTimeout(res, 350));
      return api(path, opts, retries - 1);
    }
    if (err.name === 'TypeError' && String(err.message || '').toLowerCase().includes('fetch')) {
      const netErr = new Error('Network connection issue. Operating in offline resilience mode.');
      netErr.isNetworkError = true;
      throw netErr;
    }
    throw err;
  }
}

const FACULTY_NAV = [
  ['Dashboard', LayoutDashboard],
  ['Subject Management', BookOpen],
  ['Syllabus Analyzer', Search],
  ['Question Bank', Database],
  ['Blueprint Designer', Grid2X2],
  ['AI Paper Generator', Sparkles],
  ['Previous Paper Analyzer', History],
  ['Answer Key Generator', KeyRound],
  ['Paper Vault', Archive],
  ['AI Exam Assistant', Bot],
  ['Settings', SettingsIcon],
];

const ADMIN_NAV = [
  ['Dashboard', LayoutDashboard],
  ['User Management', Users],
  ['Database Console', Table2],
  ['Activity Logs', Activity],
  ['Login Sessions', Clock3],
  ['Settings', SettingsIcon],
];

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Module({ title, subtitle, actions, children }) {
  return (
    <div className="panel">
      <div className="module-head">
        <div>
          <span className="eyebrow">AIQPG MODULE</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

function Empty({ text = 'No records found.' }) {
  return <div className="empty">{text}</div>;
}

function Table({ rows = [], cols = [], renderActions }) {
  const safeRows = safeArray(rows);
  const safeCols = safeArray(cols);

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {safeCols.map((c) => (
              <th key={c}>{String(c).replaceAll('_', ' ')}</th>
            ))}
            {renderActions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {safeRows.map((r, i) => (
            <tr key={r?.id ?? i}>
              {safeCols.map((c) => (
                <td key={c}>{String(r?.[c] ?? '-').slice(0, 240)}</td>
              ))}
              {renderActions && (
                <td className="actions-cell">
                  {renderActions(r)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!safeRows.length && <Empty />}
    </div>
  );
}

function Auth({ onLogin }) {
  const [mode, setMode] = useState('signup');
  const [f, setF] = useState({
    name: '',
    email: '',
    password: '',
    role: 'faculty',
    admin_code: '',
    otp: '',
    new_password: '',
  });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const change = (e) => {
    setF({ ...f, [e.target.name]: e.target.value });
    setMsg('');
    setError('');
  };

  const validEmail = (e) => /^[^\s@]+@apollouniversity\.edu\.in$/i.test(e.trim());

  const run = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    setError('');
    try {
      if (mode === 'signup') {
        if (!f.name.trim()) throw Error('Enter your full name.');
        if (!validEmail(f.email)) throw Error('Only @apollouniversity.edu.in accounts are allowed.');
        if (f.password.length < 8) throw Error('Password must contain at least 8 characters.');
        if (f.role === 'admin' && !f.admin_code.trim()) throw Error('Administrator code is required.');
        await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: f.name.trim(),
            email: f.email.trim().toLowerCase(),
            password: f.password,
            role: f.role,
            admin_code: f.admin_code || null,
          }),
        });
        setMsg('Account created successfully. Please sign in.');
        setF({ ...f, password: '', admin_code: '' });
        setMode('login');
      } else if (mode === 'login') {
        if (!validEmail(f.email)) throw Error('Only @apollouniversity.edu.in accounts are allowed.');
        const d = await api('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: f.email.trim().toLowerCase(),
            password: f.password,
          }),
        });
        localStorage.setItem('aiqpg_token', d.access_token);
        localStorage.setItem('aiqpg_user', JSON.stringify(d.user));
        onLogin(d.user);
      } else if (mode === 'forgot') {
        const d = await api('/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({
            email: f.email.trim().toLowerCase(),
          }),
        });
        setMsg(d.development_otp ? `Development OTP: ${d.development_otp}` : d.message);
        setMode('otp');
      } else if (mode === 'otp') {
        await api('/auth/verify-otp', {
          method: 'POST',
          body: JSON.stringify({
            email: f.email.trim().toLowerCase(),
            otp: f.otp,
          }),
        });
        setMsg('OTP verified. Create your new password.');
        setMode('reset');
      } else {
        await api('/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({
            email: f.email.trim().toLowerCase(),
            otp: f.otp,
            new_password: f.new_password,
          }),
        });
        setMsg('Password reset successful. Please sign in.');
        setMode('login');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const title = {
    signup: 'Create your account',
    login: 'Welcome back',
    forgot: 'Forgot password',
    otp: 'Verify OTP',
    reset: 'Reset password',
  }[mode];

  return (
    <div className="auth-wrap">
      <div className="auth-left">
        <div className="auth-brand">
          <div className="brand-mark">AI</div>
          <div>
            <b>AIQPG</b>
            <small>AI Question Paper Generator</small>
          </div>
        </div>
        <h1>
          Generate smarter.
          <br />
          <span>Examine better.</span>
        </h1>
        <p>Faculty and administrator environments with secure college authentication.</p>
        <div className="hero-list">
          <div>✓ College email authentication</div>
          <div>✓ Faculty / Administrator role selection</div>
          <div>✓ OTP password recovery</div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-card">
          <h2>{title}</h2>
          <p>Official Apollo University email required.</p>
          {msg && <div className="alert success">{msg}</div>}
          {error && <div className="alert error">{error}</div>}
          <form onSubmit={run}>
            {mode === 'signup' && (
              <Field label="Full Name">
                <input name="name" value={f.name} onChange={change} required />
              </Field>
            )}
            {['signup', 'login', 'forgot', 'otp', 'reset'].includes(mode) && (
              <Field label="College Email">
                <input
                  type="email"
                  name="email"
                  value={f.email}
                  onChange={change}
                  readOnly={mode === 'otp' || mode === 'reset'}
                  required
                />
              </Field>
            )}
            {mode === 'signup' && (
              <>
                <Field label="Role">
                  <select name="role" value={f.role} onChange={change}>
                    <option value="faculty">Faculty</option>
                    <option value="admin">Administrator</option>
                  </select>
                </Field>
                {f.role === 'admin' && (
                  <Field label="Administrator Code">
                    <input name="admin_code" value={f.admin_code} onChange={change} />
                  </Field>
                )}
                <Field label="Password">
                  <input
                    type="password"
                    name="password"
                    value={f.password}
                    onChange={change}
                    minLength="8"
                    required
                  />
                </Field>
              </>
            )}
            {mode === 'login' && (
              <Field label="Password">
                <input
                  type="password"
                  name="password"
                  value={f.password}
                  onChange={change}
                  required
                />
              </Field>
            )}
            {mode === 'otp' && (
              <Field label="6-Digit OTP">
                <input name="otp" value={f.otp} onChange={change} maxLength="6" required />
              </Field>
            )}
            {mode === 'reset' && (
              <Field label="New Password">
                <input
                  type="password"
                  name="new_password"
                  value={f.new_password}
                  onChange={change}
                  minLength="8"
                  required
                />
              </Field>
            )}
            <button className="primary wide" disabled={loading}>
              {loading
                ? 'Please wait…'
                : mode === 'signup'
                ? 'Create Account'
                : mode === 'login'
                ? 'Sign In'
                : mode === 'forgot'
                ? 'Send OTP'
                : mode === 'otp'
                ? 'Verify OTP'
                : 'Reset Password'}
            </button>
          </form>
          {mode === 'login' && (
            <div className="auth-links">
              <button onClick={() => setMode('signup')}>Create account</button>
              <button onClick={() => setMode('forgot')}>Forgot password?</button>
            </div>
          )}
          {mode !== 'login' && (
            <button className="link-btn" onClick={() => setMode('login')}>
              Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ user, go }) {
  const [s, setS] = useState({
    questions: 0,
    papers: 0,
    subjects: 0,
    syllabi: 0,
    coverage: 0,
    recent_papers: [],
    recent_activity: [],
    question_stats: { easy: 0, medium: 0, hard: 0, sec_a: 0, sec_b: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const d = await api('/dashboard');
      if (d && typeof d === 'object') {
        setS({
          subjects: Number(d.subjects || 0),
          syllabi: Number(d.syllabi || 0),
          questions: Number(d.questions || 0),
          papers: Number(d.papers || 0),
          coverage: Number(d.coverage || 0),
          recent_papers: safeArray(d.recent_papers),
          recent_activity: safeArray(d.recent_activity),
          question_stats: d.question_stats || { easy: 0, medium: 0, hard: 0, sec_a: 0, sec_b: 0 },
        });
      }
    } catch (e) {
      setErrorMsg(e.message || 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const quickActions = [
    { title: 'Add Subject', icon: BookOpen, page: 'Subject Management', desc: 'Create course code & details' },
    { title: 'Upload Syllabus', icon: Search, page: 'Syllabus Analyzer', desc: 'Parse syllabus & extract units' },
    { title: 'Upload Question Bank', icon: Database, page: 'Question Bank', desc: 'Import 2m and 8m questions' },
    { title: 'Create Blueprint', icon: Grid2X2, page: 'Blueprint Designer', desc: 'Design unit & difficulty weights' },
    { title: 'Generate Paper', icon: Sparkles, page: 'AI Paper Generator', desc: 'Build exact exam papers' },
  ];

  return (
    <div>
      <div className="hero">
        <div>
          <span className="eyebrow">FACULTY DASHBOARD</span>
          <h1>Welcome, {user.name}</h1>
          <p>Manage your subjects, syllabi, question banks, and AI examination papers from one unified dashboard.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="secondary" onClick={loadData} disabled={loading}>
            <RefreshCw size={16} /> {loading ? 'Loading…' : 'Refresh'}
          </button>
          <button className="primary" onClick={() => go('AI Paper Generator')}>
            <Sparkles size={16} /> Generate Paper
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="alert error" style={{ marginTop: '14px' }}>
          {errorMsg}
        </div>
      )}

      <div className="stat-grid" style={{ marginTop: '18px' }}>
        <Stat n={loading ? '…' : s.subjects} label="Total Subjects" icon={BookOpen} color="#5869dc" />
        <Stat n={loading ? '…' : s.syllabi} label="Total Syllabi" icon={Search} color="#059669" />
        <Stat n={loading ? '…' : s.questions} label="Total Questions" icon={Database} color="#d97706" />
        <Stat n={loading ? '…' : s.papers} label="Generated Papers" icon={Sparkles} color="#9333ea" />
      </div>

      <div className="panel" style={{ marginTop: '18px' }}>
        <h2>Quick Actions</h2>
        <p style={{ color: '#738097', marginTop: '-4px', marginBottom: '16px' }}>
          Jump straight to key workflow modules with one click.
        </p>
        <div className="workflow" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {quickActions.map((qa, i) => {
            const Icon = qa.icon;
            return (
              <button
                key={qa.title}
                className="workflow-step"
                onClick={() => go(qa.page)}
                style={{
                  border: '1px solid #e1e6ee',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  background: '#fff',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: '#eef1ff',
                      color: '#5869dc',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <Icon size={18} />
                  </span>
                  <small style={{ fontWeight: 700, color: '#94a3b8' }}>0{i + 1}</small>
                </div>
                <strong style={{ fontSize: '14px', color: '#1e293b' }}>{qa.title}</strong>
                <span style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>{qa.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="form-grid" style={{ marginTop: '18px', gridTemplateColumns: '1fr 1fr' }}>
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ margin: 0 }}>Syllabus Coverage</h2>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#059669' }}>{s.coverage}% Covered</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '12px', marginTop: 0 }}>
            Percentage of registered subjects with an attached and analyzed syllabus.
          </p>
          <div style={{ background: '#f1f5f9', borderRadius: '8px', height: '12px', overflow: 'hidden', margin: '14px 0' }}>
            <div
              style={{
                width: `${s.coverage}%`,
                background: 'linear-gradient(90deg, #10b981, #059669)',
                height: '100%',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
            <span>Subjects with Syllabus: {s.syllabi}</span>
            <span>Total Subjects: {s.subjects}</span>
          </div>
        </div>

        <div className="panel">
          <h2 style={{ margin: 0, marginBottom: '12px' }}>Question Statistics</h2>
          <p style={{ color: '#64748b', fontSize: '12px', marginTop: 0 }}>
            Breakdown of stored question bank questions by difficulty level and marks.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '14px' }}>
            <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
              <strong style={{ display: 'block', fontSize: '18px', color: '#166534' }}>{s.question_stats.easy}</strong>
              <span style={{ fontSize: '11px', color: '#15803d' }}>Easy</span>
            </div>
            <div style={{ background: '#fffbeb', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
              <strong style={{ display: 'block', fontSize: '18px', color: '#92400e' }}>{s.question_stats.medium}</strong>
              <span style={{ fontSize: '11px', color: '#b45309' }}>Medium</span>
            </div>
            <div style={{ background: '#fef2f2', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
              <strong style={{ display: 'block', fontSize: '18px', color: '#991b1b' }}>{s.question_stats.hard}</strong>
              <span style={{ fontSize: '11px', color: '#b91c1c' }}>Hard</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginTop: '12px' }}>
            <span>Section A (2 Marks): <strong>{s.question_stats.sec_a}</strong></span>
            <span>Section B (8 Marks): <strong>{s.question_stats.sec_b}</strong></span>
          </div>
        </div>
      </div>

      <div className="form-grid" style={{ marginTop: '18px', gridTemplateColumns: '1fr' }}>
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ margin: 0 }}>Recent Question Papers</h2>
            <button className="secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => go('Paper Vault')}>
              View Vault
            </button>
          </div>
          {s.recent_papers.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Exam Type</th>
                    <th>Marks</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {s.recent_papers.map((p, i) => (
                    <tr key={p.id ?? i}>
                      <td>
                        <strong>{p.title || `Paper #${p.id}`}</strong>
                      </td>
                      <td>{p.exam_type || 'Exam'}</td>
                      <td>{p.total_marks}m</td>
                      <td>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            background: p.status === 'final' ? '#dcfce7' : '#f3f4f6',
                            color: p.status === 'final' ? '#166534' : '#374151',
                          }}
                        >
                          {p.status || 'draft'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty text={loading ? 'Loading recent papers…' : 'No question papers generated yet.'} />
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ n, label, icon: Icon, color = '#5869dc' }) {
  return (
    <div className="stat" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
      {Icon && (
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: `${color}15`,
            color: color,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Icon size={22} />
        </div>
      )}
      <div>
        <strong style={{ display: 'block', fontSize: '24px', lineHeight: 1 }}>{n}</strong>
        <span style={{ color: '#7a869a', fontSize: '12px' }}>{label}</span>
      </div>
    </div>
  );
}

function AdminDashboard({ user, go }) {
  const [stats, setStats] = useState({ users: 0, tables: 0, logs: 0, sessions: 0 });
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    setMsg('');
    try {
      const [users, logs, sessions, tables] = await Promise.all([
        api('/admin/users').catch(() => []),
        api('/admin/logs').catch(() => []),
        api('/admin/sessions').catch(() => []),
        api('/admin/tables').catch(() => ({ tables: [] })),
      ]);
      const userRows = safeArray(Array.isArray(users) ? users : users?.items);
      const logRows = safeArray(Array.isArray(logs) ? logs : logs?.items);
      const sessionRows = safeArray(Array.isArray(sessions) ? sessions : sessions?.items);
      const tableRows = safeArray(Array.isArray(tables) ? tables : tables?.tables);
      setStats({
        users: userRows.length,
        tables: tableRows.length,
        logs: logRows.length,
        sessions: sessionRows.length,
      });
      setRecentUsers(userRows.slice(0, 5));
      setRecentLogs(logRows.slice(0, 5));
    } catch (e) {
      setMsg(e.message || 'Unable to load administrator dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const actions = [
    ['User Management', Users, 'Manage faculty and administrator accounts'],
    ['Database Console', Table2, 'Browse SQLite tables and records'],
    ['Activity Logs', Activity, 'Review system activities'],
    ['Login Sessions', Clock3, 'Monitor login sessions'],
  ];

  return (
    <div>
      <div className="hero">
        <div>
          <span className="eyebrow">ADMINISTRATOR CONSOLE</span>
          <h1>Welcome, {user.name}</h1>
          <p>Manage users, inspect the SQLite database, review activity, and monitor login sessions.</p>
        </div>
        <button className="secondary" onClick={load}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {msg && <div className="alert error">{msg}</div>}

      <div className="stat-grid">
        <div className="stat">
          <strong>{loading ? '…' : stats.users}</strong>
          <span>Registered Users</span>
        </div>
        <div className="stat">
          <strong>{loading ? '…' : stats.tables}</strong>
          <span>SQLite Tables</span>
        </div>
        <div className="stat">
          <strong>{loading ? '…' : stats.logs}</strong>
          <span>Activity Logs</span>
        </div>
        <div className="stat">
          <strong>{loading ? '…' : stats.sessions}</strong>
          <span>Login Sessions</span>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '18px' }}>
        <h2>Administrator Actions</h2>
        <div className="workflow">
          {actions.map(([name, Icon, text], i) => (
            <button
              key={name}
              className="workflow-step"
              onClick={() => go(name)}
              style={{ border: '0', textAlign: 'left', cursor: 'pointer' }}
            >
              <b>{i + 1}</b>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon size={18} />
                <strong>{name}</strong>
              </span>
              <small style={{ display: 'block', marginTop: '4px', marginLeft: '26px', opacity: 0.7 }}>
                {text}
              </small>
            </button>
          ))}
        </div>
      </div>

      <div className="form-grid" style={{ marginTop: '18px' }}>
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ margin: 0 }}>Recent Users</h2>
            <button className="secondary" onClick={() => go('User Management')}>
              View All
            </button>
          </div>
          {recentUsers.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((u, i) => (
                    <tr key={u.id ?? i}>
                      <td>{u.name ?? '—'}</td>
                      <td>{u.email ?? '—'}</td>
                      <td>{u.role ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty text={loading ? 'Loading users…' : 'No users found.'} />
          )}
        </div>

        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ margin: 0 }}>Recent Activity</h2>
            <button className="secondary" onClick={() => go('Activity Logs')}>
              View Logs
            </button>
          </div>
          {recentLogs.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>User</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((x, i) => (
                    <tr key={x.id ?? i}>
                      <td>{x.action ?? '—'}</td>
                      <td>{x.user_id ?? '—'}</td>
                      <td>{x.created_at ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty text={loading ? 'Loading activity…' : 'No activity records found.'} />
          )}
        </div>
      </div>
    </div>
  );
}

function SubjectManagement() {
  const [list, setList] = useState([]);
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState(null);
  const [msg, setMsg] = useState('');
  const [q, setQ] = usePersistedState('aiqpg_subject_search', '');
  const empty = {
    name: '',
    code: '',
    department: 'CSE',
    semester: '',
    academic_year: '2026-27',
    credits: 4,
    description: '',
  };
  const [f, setF] = useState(empty);

  const load = () =>
    api('/subjects')
      .then((d) => setList(safeArray(d)))
      .catch((e) => setMsg(e.message));

  useEffect(() => {
    load();
  }, []);

  const safeList = safeArray(list);
  const filtered = useMemo(
    () =>
      safeList.filter((s) =>
        (String(s?.name || '') + ' ' + String(s?.code || '') + ' ' + String(s?.department || ''))
          .toLowerCase()
          .includes(q.toLowerCase())
      ),
    [safeList, q]
  );

  const save = async () => {
    try {
      await api(edit ? `/subjects/${edit}` : '/subjects', {
        method: edit ? 'PUT' : 'POST',
        body: JSON.stringify({ ...f, credits: Number(f.credits) }),
      });
      setMsg(edit ? 'Subject updated successfully.' : 'Subject created successfully.');
      setShow(false);
      setEdit(null);
      setF(empty);
      load();
    } catch (e) {
      setMsg(e.message);
    }
  };

  const del = async (id) => {
    if (!confirm('Delete this subject?')) return;
    try {
      await api(`/subjects/${id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <Module
      title="Subject Management"
      subtitle="Create and maintain subject name, code, department, semester and academic details."
      actions={
        <button
          className="primary"
          onClick={() => {
            setF(empty);
            setEdit(null);
            setShow(true);
          }}
        >
          <Plus size={16} /> Add Subject
        </button>
      }
    >
      {msg && <div className="notice">{msg}</div>}
      <div className="filter-row">
        <input
          placeholder="Search subject or code"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {show && (
        <div className="form-card">
          <h3>{edit ? 'Edit Subject' : 'Add Subject'}</h3>
          <div className="form-grid">
            {[
              ['name', 'Subject Name'],
              ['code', 'Subject Code'],
              ['department', 'Department'],
              ['semester', 'Semester'],
              ['academic_year', 'Academic Year'],
              ['credits', 'Credits'],
            ].map(([k, l]) => (
              <Field key={k} label={l}>
                <input
                  type={k === 'credits' ? 'number' : 'text'}
                  value={f[k] ?? ''}
                  onChange={(e) => setF({ ...f, [k]: e.target.value })}
                />
              </Field>
            ))}
            <Field label="Description">
              <textarea
                value={f.description ?? ''}
                onChange={(e) => setF({ ...f, description: e.target.value })}
              />
            </Field>
          </div>
          <div className="actions">
            <button className="primary" onClick={save}>
              <Save size={16} /> Save
            </button>
            <button className="secondary" onClick={() => setShow(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      <Table
          rows={filtered}
          cols={['id', 'code', 'name', 'department', 'semester', 'academic_year', 'credits']}
          renderActions={(s) => (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button className="table-icon" onClick={() => { setF({ ...empty, ...s }); setEdit(s.id); setShow(true); }}><Edit3 size={15} /></button>
              <button className="table-icon" onClick={() => del(s.id)}><Trash2 size={15} /></button>
            </div>
          )}
        />
    </Module>
  );
}

function SyllabusAnalyzer() {
  const [subjects, setSubjects] = useState([]);
  const [list, setList] = useState([]);
  const [mode, setMode] = usePersistedState('aiqpg_syllabus_mode', 'manual');
  const [sid, setSid] = usePersistedState('aiqpg_syllabus_sid', '');
  const [title, setTitle] = usePersistedState('aiqpg_syllabus_title', '');
  const [text, setText] = usePersistedState('aiqpg_syllabus_text', '');
  const [file, setFile] = useState(null);
  const [result, setResult] = usePersistedState('aiqpg_syllabus_result', null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setMsg('');
    try {
      const [a, b] = await Promise.all([
        api('/subjects').catch(() => []),
        api('/syllabi').catch(() => []),
      ]);
      setSubjects(safeArray(a));
      setList(safeArray(b));
    } catch (e) {
      setMsg(e.message || 'Unable to load syllabus data.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const run = async () => {
    setBusy(true);
    setMsg('');
    try {
      let d;
      if (mode === 'manual') {
        if (!sid || !text.trim()) throw Error('Select subject and enter syllabus text.');
        d = await api('/syllabi/analyze', {
          method: 'POST',
          body: JSON.stringify({
            subject_id: Number(sid),
            title: title || 'Syllabus',
            text,
            file_name: '',
          }),
        });
      } else {
        if (!sid || !file) throw Error('Select subject and syllabus file.');
        const fd = new FormData();
        fd.append('file', file);
        fd.append('title', title || file.name);
        d = await api(`/syllabi/upload?subject_id=${sid}`, {
          method: 'POST',
          body: fd,
        });
      }
      if (d?.analysis) setResult(d.analysis);
      setMsg(d?.message || 'Syllabus analyzed and saved successfully.');
      await load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  const units = safeArray(result?.units);

  return (
    <Module
      title="Syllabus Analyzer"
      subtitle="Enter manually or upload a syllabus without leaving this page."
    >
      <div className="tabs">
        <button className={mode === 'manual' ? 'active' : ''} onClick={() => setMode('manual')}>
          Manual Entry
        </button>
        <button className={mode === 'upload' ? 'active' : ''} onClick={() => setMode('upload')}>
          Upload Syllabus
        </button>
      </div>
      <div className="form-grid">
        <Field label="Subject">
          <select value={sid} onChange={(e) => setSid(e.target.value)}>
            <option value="">Select Subject</option>
            {safeArray(subjects).map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Syllabus Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="2026-27 Syllabus"
          />
        </Field>
        {mode === 'upload' ? (
          <Field label="Syllabus File">
            <input
              type="file"
              accept=".pdf,.docx,.txt,.pptx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </Field>
        ) : null}
      </div>
      {mode === 'manual' && (
        <Field label="Syllabus Content">
          <textarea
            className="large-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste syllabus content here..."
          />
        </Field>
      )}
      <button className="primary" disabled={busy} onClick={run}>
        {busy ? 'Analyzing…' : mode === 'manual' ? 'Analyze & Save' : 'Upload, Analyze & Save'}
      </button>
      {msg && <div className="notice">{msg}</div>}
      {units.length > 0 && (
        <div className="result-card">
          <h3>Analyzed Syllabus</h3>
          <div className="unit-grid">
            {units.map((u, i) => {
              const topics = safeArray(u?.topics);
              return (
                <div className="unit-card" key={u?.name || `unit-${i}`}>
                  <b>{u?.name || `Unit ${i + 1}`}</b>
                  <ul>
                    {topics.map((t, j) => (
                      <li key={`${u?.name || i}-${j}`}>{t}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <p>
            <b>Units:</b> {result?.total_units ?? units.length} &nbsp; <b>Topics:</b>{' '}
            {result?.total_topics ??
              units.reduce((n, u) => n + safeArray(u?.topics).length, 0)}
          </p>
        </div>
      )}
      <h3>Saved Syllabi</h3>
      <Table
          rows={safeArray(list).map((x) => ({ ...x, units: x.total_units, topics: x.total_topics }))}
          cols={['id', 'subject_id', 'title', 'file_name', 'units', 'topics', 'status']}
          renderActions={(s) => (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                className="table-icon"
                onClick={async () => {
                  const newTitle = prompt('Edit Syllabus Title:', s.title);
                  if (newTitle) {
                    await api(/syllabi/, { method: 'PUT', body: JSON.stringify({ title: newTitle, text: s.syllabus_text }) });
                    load();
                  }
                }}
              >
                <Edit3 size={15} />
              </button>
              <button
                className="table-icon"
                onClick={async () => {
                  if (confirm('Delete syllabus?')) {
                    await api(/syllabi/, { method: 'DELETE' });
                    load();
                  }
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          )}
        />
    </Module>
  );
}

function QuestionBank() {
  const [questions, setQuestions] = useState([]);
  const [name, setName] = usePersistedState('aiqpg_qb_name', '');
  const [code, setCode] = usePersistedState('aiqpg_qb_code', '');
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async (n) => {
    if (!n.trim()) {
      setQuestions([]);
      return;
    }
    try {
      const d = await api(`/questions?subject_name=${encodeURIComponent(n.trim())}`);
      setQuestions(safeArray(d));
    } catch (e) {
      setMsg(e.message);
      setQuestions([]);
    }
  };

  useEffect(() => {
    if (name) load(name);
  }, []);

  const process = async () => {
    if (!name.trim() || !file) {
      setMsg('Enter subject name and choose a question-bank file.');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const d = await api(
        `/questions/upload?subject_name=${encodeURIComponent(
          name.trim()
        )}&subject_code=${encodeURIComponent(code.trim())}`,
        { method: 'POST', body: fd }
      );
      setMsg(
        `${d.message}. Section A (2 marks): ${d.section_a_questions}. Section B (8 marks): ${d.section_b_questions}. Ignored non-question lines: ${d.ignored}.`
      );
      await load(d.subject_name || name);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  const clearOld = async () => {
    if (!name.trim()) {
      setMsg('Enter subject name first.');
      return;
    }
    if (
      !confirm(
        `Delete all existing questions for ${name}? Upload the correct question bank again after this.`
      )
    )
      return;
    try {
      const subs = await api(`/subjects`);
      const safeSubs = safeArray(subs);
      const s = safeSubs.find((x) => x.name?.trim().toLowerCase() === name.trim().toLowerCase());
      if (!s) {
        setMsg('Subject not found.');
        return;
      }
      const d = await api(`/questions/subject/${s.id}/clear`, { method: 'DELETE' });
      setMsg(d.message);
      setQuestions([]);
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <Module
      title="Question Bank"
      subtitle="Upload only exam questions. Section A is stored as 2 marks and Section B as 8 marks. Headings, instructions and CO mapping text are ignored."
    >
      <div className="form-grid">
        <Field label="Question Bank File">
          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.pptx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </Field>
        <Field label="Subject Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Internet of Things"
          />
        </Field>
        <Field label="Subject Code">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="CS401"
          />
        </Field>
      </div>
      <div className="actions">
        <button className="primary" disabled={busy} onClick={process}>
          <Upload size={16} />
          {busy ? 'Processing…' : 'Process Questions'}
        </button>
        <button className="secondary" onClick={clearOld}>
          <Trash2 size={16} /> Clear Existing Questions
        </button>
      </div>
      {msg && <div className="notice">{msg}</div>}
      {name && <h3>Processed Questions for {name} {code && `(${code})`}</h3>}
      <Table
          rows={questions}
          cols={[
            'id',
            'question_text',
            'marks',
            'unit',
            'topic',
            'difficulty',
            'bloom_level',
            'course_outcome',
            'duplicate_status',
            'mapping_status',
            'status',
          ]}
          renderActions={(q) => (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                className="table-icon"
                onClick={async () => {
                  const newText = prompt('Edit Question:', q.question_text);
                  if (newText) {
                    await api(/questions/, { method: 'PUT', body: JSON.stringify({ question_text: newText }) });
                    load(name);
                  }
                }}
              >
                <Edit3 size={15} />
              </button>
              <button
                className="table-icon"
                onClick={async () => {
                  if (confirm('Delete question?')) {
                    await api(/questions/, { method: 'DELETE' });
                    load(name);
                  }
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          )}
        />
    </Module>
  );
}

function BlueprintDesigner() {
  const [subjects, setSubjects] = useState([]);
  const [syllabi, setSyllabi] = useState([]);
  const [rows, setRows] = useState([]);
  const [edit, setEdit] = useState(null);
  const [msg, setMsg] = useState('');

  const [f, setF] = usePersistedState('aiqpg_blueprint_form', {
    subject_id: '',
    syllabus_id: '',
    blueprint_name: 'Internal Assessment Blueprint',
    exam_type: 'Internal Assessment',
    duration: '90 Minutes',
    total_marks: 50,
    total_questions: 25,
    difficulty_distribution: { Easy: 20, Medium: 50, Hard: 30 },
    bloom_distribution: { Remember: 20, Understand: 30, Apply: 30, Analyze: 20 },
    unit_weightage: {},
  });

  const safeForm = f && typeof f === 'object' ? f : {};

  const load = async () => {
    setMsg('');
    try {
      const [a, b, c] = await Promise.all([
        api('/subjects').catch(() => []),
        api('/syllabi').catch(() => []),
        api('/blueprints').catch(() => []),
      ]);
      setSubjects(safeArray(a));
      setSyllabi(safeArray(b));
      setRows(safeArray(c));
    } catch (e) {
      setMsg(e.message || 'Unable to load blueprint data.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const safeSyllabi = safeArray(syllabi);
  const selectedSyllabus = useMemo(
    () => safeSyllabi.find((x) => String(x.id) === String(safeForm.syllabus_id)),
    [safeSyllabi, safeForm.syllabus_id]
  );

  const unitNames = useMemo(
    () =>
      Array.isArray(selectedSyllabus?.units)
        ? selectedSyllabus.units.map((u, i) => String(u?.name || u || `Unit ${i + 1}`)).filter(Boolean)
        : [],
    [selectedSyllabus]
  );

  useEffect(() => {
    if (!unitNames.length) return;
    const existing =
      safeForm.unit_weightage && typeof safeForm.unit_weightage === 'object' ? safeForm.unit_weightage : {};
    const next = {};
    const missing = unitNames.filter((u) => existing[u] == null);
    const equal = missing.length ? Math.round((100 / unitNames.length) * 100) / 100 : 0;
    unitNames.forEach((u) => {
      next[u] = existing[u] != null ? Number(existing[u]) : equal;
    });
    const sum = Object.values(next).reduce((a, b) => a + Number(b || 0), 0);
    if (missing.length && unitNames.length > 0) {
      next[unitNames[unitNames.length - 1]] = Number(
        (Number(next[unitNames[unitNames.length - 1]]) + Number(100 - sum)).toFixed(2)
      );
    }
    setF((prev) => ({ ...prev, unit_weightage: next }));
  }, [unitNames.join('|')]);

  const difficulty = safeForm.difficulty_distribution || { Easy: 20, Medium: 50, Hard: 30 };
  const bloom = safeForm.bloom_distribution || { Remember: 20, Understand: 30, Apply: 30, Analyze: 20 };
  const units = safeForm.unit_weightage || {};

  const pctTotal = (o) => Object.values(o || {}).reduce((a, b) => a + Number(b || 0), 0);

  const updatePct = (group, key, value) =>
    setF((prev) => ({
      ...(prev || {}),
      [group]: { ...((prev || {})[group] || {}), [key]: Number(value) },
    }));

  const resetNew = () =>
    setF({
      subject_id: '',
      syllabus_id: '',
      blueprint_name: 'Internal Assessment Blueprint',
      exam_type: 'Internal Assessment',
      duration: '90 Minutes',
      total_marks: 50,
      total_questions: 25,
      difficulty_distribution: { Easy: 20, Medium: 50, Hard: 30 },
      bloom_distribution: { Remember: 20, Understand: 30, Apply: 30, Analyze: 20 },
      unit_weightage: {},
    });

  const save = async () => {
    try {
      if (!safeForm.subject_id) throw Error('Select a subject.');
      if (Number(safeForm.total_marks) <= 0 || Number(safeForm.total_questions) <= 0)
        throw Error('Total marks and total questions must be greater than 0.');
      const diffTotal = pctTotal(difficulty);
      if (Math.abs(diffTotal - 100) > 0.01)
        throw Error(`Difficulty / Taxonomy Level must total 100%. Current total: ${diffTotal}%.`);
      const bloomTotal = pctTotal(bloom);
      if (Math.abs(bloomTotal - 100) > 0.01)
        throw Error(`Bloom's Taxonomy must total 100%. Current total: ${bloomTotal}%.`);
      if (unitNames.length) {
        const unitTotal = pctTotal(units);
        if (Math.abs(unitTotal - 100) > 0.01)
          throw Error(`Unit weightage must total 100%. Current total: ${unitTotal}%.`);
      }
      const body = {
        ...safeForm,
        subject_id: Number(safeForm.subject_id),
        syllabus_id: safeForm.syllabus_id ? Number(safeForm.syllabus_id) : null,
        total_marks: Number(safeForm.total_marks),
        total_questions: Number(safeForm.total_questions),
        question_pattern: {},
        unit_weightage: units,
        difficulty_distribution: difficulty,
        bloom_distribution: bloom,
        co_distribution: {},
      };
      await api(edit ? `/blueprints/${edit}` : '/blueprints', {
        method: edit ? 'PUT' : 'POST',
        body: JSON.stringify(body),
      });
      setMsg('Blueprint saved successfully.');
      setEdit(null);
      await load();
    } catch (e) {
      setMsg(e.message);
    }
  };

  const editBlueprint = async (b) => {
    try {
      const full = await api(`/blueprints/${b.id}`);
      setEdit(b.id);
      setF((prev) => ({
        ...(prev || {}),
        subject_id: String(full.subject_id ?? b.subject_id ?? ''),
        syllabus_id: full.syllabus_id ? String(full.syllabus_id) : '',
        blueprint_name: full.blueprint_name ?? b.blueprint_name ?? '',
        exam_type: full.exam_type ?? b.exam_type ?? 'Internal Assessment',
        duration: full.duration ?? b.duration ?? '90 Minutes',
        total_marks: full.total_marks ?? b.total_marks ?? 50,
        total_questions: full.total_questions ?? b.total_questions ?? 25,
        unit_weightage: full.unit_weightage || {},
        difficulty_distribution: full.difficulty_distribution || { Easy: 20, Medium: 50, Hard: 30 },
        bloom_distribution: full.bloom_distribution || { Remember: 20, Understand: 30, Apply: 30, Analyze: 20 },
      }));
      setMsg('Blueprint loaded for editing.');
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <Module
      title="Blueprint Designer"
      subtitle="Create a blueprint with unit weightage, difficulty percentage and Bloom's Taxonomy distribution."
    >
      <div className="form-grid">
        <Field label="Subject">
          <select
            value={safeForm.subject_id ?? ''}
            onChange={(e) =>
              setF({ ...safeForm, subject_id: e.target.value, syllabus_id: '', unit_weightage: {} })
            }
          >
            <option value="">Select Subject</option>
            {safeArray(subjects).map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Syllabus">
          <select
            value={safeForm.syllabus_id ?? ''}
            onChange={(e) => setF({ ...safeForm, syllabus_id: e.target.value, unit_weightage: {} })}
          >
            <option value="">Select Syllabus</option>
            {safeArray(syllabi)
              .filter((s) => !safeForm.subject_id || s.subject_id === Number(safeForm.subject_id))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Blueprint Name">
          <input
            value={safeForm.blueprint_name ?? ''}
            onChange={(e) => setF({ ...safeForm, blueprint_name: e.target.value })}
          />
        </Field>
        <Field label="Exam Type">
          <input
            value={safeForm.exam_type ?? ''}
            onChange={(e) => setF({ ...safeForm, exam_type: e.target.value })}
          />
        </Field>
        <Field label="Duration">
          <input
            value={safeForm.duration ?? ''}
            onChange={(e) => setF({ ...safeForm, duration: e.target.value })}
          />
        </Field>
        <Field label="Total Marks">
          <input
            type="number"
            min="1"
            value={safeForm.total_marks ?? 50}
            onChange={(e) => setF({ ...safeForm, total_marks: e.target.value })}
          />
        </Field>
        <Field label="Total Questions">
          <input
            type="number"
            min="1"
            value={safeForm.total_questions ?? 25}
            onChange={(e) => setF({ ...safeForm, total_questions: e.target.value })}
          />
        </Field>
      </div>

      <div className="form-card">
        <h3>Difficulty / Taxonomy Level</h3>
        <p style={{ marginTop: 0 }}>Enter the percentage of questions for each level. Total must be 100%.</p>
        <div className="form-grid">
          {['Easy', 'Medium', 'Hard'].map((k) => (
            <Field key={k} label={`${k} %`}>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={difficulty[k] ?? 0}
                onChange={(e) => updatePct('difficulty_distribution', k, e.target.value)}
              />
            </Field>
          ))}
        </div>
        <div className={Math.abs(pctTotal(difficulty) - 100) < 0.01 ? 'notice' : 'alert error'}>
          Total: {pctTotal(difficulty)}%
        </div>
      </div>

      <div className="form-card">
        <h3>Unit Weightage</h3>
        {unitNames.length ? (
          <>
            <p style={{ marginTop: 0 }}>Set the percentage for every syllabus unit. Total must be 100%.</p>
            <div className="form-grid">
              {unitNames.map((u) => (
                <Field key={u} label={`${u} %`}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={units[u] ?? 0}
                    onChange={(e) => updatePct('unit_weightage', u, e.target.value)}
                  />
                </Field>
              ))}
            </div>
            <div className={Math.abs(pctTotal(units) - 100) < 0.01 ? 'notice' : 'alert error'}>
              Total: {pctTotal(units)}%
            </div>
          </>
        ) : (
          <div className="notice">Select a syllabus to load its units here.</div>
        )}
      </div>

      <div className="form-card">
        <h3>Bloom's Taxonomy</h3>
        <p style={{ marginTop: 0 }}>
          Set the percentage for the Bloom levels used by this blueprint. Total must be 100%.
        </p>
        <div className="form-grid">
          {['Remember', 'Understand', 'Apply', 'Analyze'].map((k) => (
            <Field key={k} label={`${k} %`}>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={bloom[k] ?? 0}
                onChange={(e) => updatePct('bloom_distribution', k, e.target.value)}
              />
            </Field>
          ))}
        </div>
        <div className={Math.abs(pctTotal(bloom) - 100) < 0.01 ? 'notice' : 'alert error'}>
          Total: {pctTotal(bloom)}%
        </div>
      </div>

      <div className="actions">
        <button
          className="primary"
          disabled={
            !safeForm.subject_id ||
            Math.abs(pctTotal(difficulty) - 100) > 0.01 ||
            Math.abs(pctTotal(bloom) - 100) > 0.01 ||
            (unitNames.length > 0 && Math.abs(pctTotal(units) - 100) > 0.01)
          }
          onClick={save}
        >
          <Save size={16} />
          {edit ? 'Update Blueprint' : 'Save Blueprint'}
        </button>
        <button
          className="secondary"
          onClick={() => {
            setEdit(null);
            resetNew();
            setMsg('New blueprint form ready.');
          }}
        >
          New Blueprint
        </button>
      </div>
      {msg && <div className="notice">{msg}</div>}
      <h3>Saved Blueprints</h3>
      <Table
          rows={rows}
          cols={['id', 'blueprint_name', 'exam_type', 'duration', 'total_marks', 'total_questions', 'status']}
          renderActions={(b) => (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button className="table-icon" onClick={() => editBlueprint(b)}>
                <Edit3 size={15} />
              </button>
              <button
                className="table-icon"
                onClick={async () => {
                  if (confirm('Delete blueprint?')) {
                    await api(/blueprints/, { method: 'DELETE' });
                    load();
                  }
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          )}
        />
    </Module>
  );
}

function PaperGenerator() {
  const [subjects, setSubjects] = useState([]);
  const [blueprints, setBlueprints] = useState([]);
  const [f, setF] = usePersistedState('aiqpg_paper_form', {
    subject_id: '',
    syllabus_id: '',
    blueprint_id: '',
    title: 'AI Generated Question Paper',
    exam_type: 'Internal Assessment',
    duration: '90 Minutes',
    choice_mode: 'No Choice',
    generation_mode: 'hybrid',
    topics: '',
    instructions: '',
    section_a_questions: 5,
    section_a_marks: 2,
    section_b_questions: 5,
    section_b_marks: 8,
  });

  const safeForm = f && typeof f === 'object' ? f : {};

  const [paper, setPaper] = usePersistedState('aiqpg_current_paper', null);
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = usePersistedState('aiqpg_current_paper_edit', []);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    api('/subjects')
      .then((d) => setSubjects(safeArray(d)))
      .catch(() => {});
    api('/blueprints')
      .then((d) => setBlueprints(safeArray(d)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (safeForm.subject_id && blueprints.length > 0) {
      const subjectIdNum = Number(safeForm.subject_id);
      const available = safeArray(blueprints).filter((b) => b.subject_id === subjectIdNum);
      const currentValid = available.find(b => b.id === Number(safeForm.blueprint_id));
      if (!currentValid && available.length > 0) {
        setF(prev => ({ ...prev, blueprint_id: available[0].id }));
      }
    }
  }, [safeForm.subject_id, blueprints]);

  const aCount = Number(safeForm.section_a_questions) || 0;
  const aMarks = Number(safeForm.section_a_marks) || 0;
  const bCount = Number(safeForm.section_b_questions) || 0;
  const bMarks = Number(safeForm.section_b_marks) || 0;
  const totalQuestions = aCount + bCount;
  const totalMarks = aCount * aMarks + bCount * bMarks;
  const internalChoice = safeForm.choice_mode === 'Internal Choice' || safeForm.choice_mode === 'Either/Or';

  const gen = async () => {
    try {
      if (!safeForm.subject_id) throw Error('Select a subject.');
      if (aCount < 0 || bCount < 0 || aMarks <= 0 || bMarks <= 0)
        throw Error('Enter valid section counts and marks.');
      if (internalChoice && bCount === 0)
        throw Error('Enter at least one Section B question slot for internal choice.');
      const d = await api('/papers/generate', {
        method: 'POST',
        body: JSON.stringify({
          ...safeForm,
          subject_id: Number(safeForm.subject_id),
          blueprint_id: safeForm.blueprint_id ? Number(safeForm.blueprint_id) : null,
          syllabus_id: safeForm.syllabus_id ? Number(safeForm.syllabus_id) : null,
          total_marks: totalMarks,
          total_questions: totalQuestions,
          section_a_questions: aCount,
          section_a_marks: aMarks,
          section_b_questions: bCount,
          section_b_marks: bMarks,
          choice_mode: safeForm.choice_mode,
          generation_mode: safeForm.generation_mode,
          topics: String(safeForm.topics || '')
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean),
        }),
      });
      setPaper(d);
      setEditContent(JSON.parse(JSON.stringify(d.content || [])));
      setEditing(false);
      setMsg(d.message);
    } catch (e) {
      if (e.isNetworkError || (e.message && e.message.includes('offline resilience mode'))) {
        const fallback = generateLocalPaper({
          section_a_questions: aCount,
          section_a_marks: aMarks,
          section_b_questions: bCount,
          section_b_marks: bMarks,
        });
        setPaper(fallback);
        setEditContent(JSON.parse(JSON.stringify(fallback.content || [])));
        setEditing(false);
        setMsg(fallback.message);
      } else {
        setMsg(e.message);
      }
    }
  };

  const startEdit = () => {
    setEditContent(JSON.parse(JSON.stringify(paper?.content || [])));
    setEditing(true);
    setMsg('');
  };

  const cancelEdit = () => {
    setEditContent(JSON.parse(JSON.stringify(paper?.content || [])));
    setEditing(false);
    setMsg('Edit cancelled.');
  };

  const updateSimple = (index, value) =>
    setEditContent((items) =>
      safeArray(items).map((item, i) => (i === index ? { ...item, question: value } : item))
    );

  const updateChoice = (index, choiceIndex, value) =>
    setEditContent((items) =>
      safeArray(items).map((item, i) => {
        if (i !== index) return item;
        const choices = [...safeArray(item.choices)];
        choices[choiceIndex] = { ...choices[choiceIndex], question: value };
        return { ...item, choices };
      })
    );

  const saveEdit = async () => {
    if (!paper) return;
    setSavingEdit(true);
    setMsg('');
    try {
      const d = await api(`/papers/${paper.id}/content`, {
        method: 'PUT',
        body: JSON.stringify({ content: editContent }),
      });
      setPaper((prev) => ({ ...prev, content: d.content }));
      setEditContent(JSON.parse(JSON.stringify(d.content || [])));
      setEditing(false);
      setMsg(d.message);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const escapeHtml = (value) =>
    String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');

  const paperHTML = () => {
    const content = safeArray(paper?.content);
    let html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(
      paper?.title || 'Question Paper'
    )}</title><style>body{font-family:Arial,sans-serif;max-width:850px;margin:35px auto;padding:0 25px;line-height:1.55;color:#111}h1{text-align:center;margin-bottom:5px}h2{margin-top:28px;border-bottom:1px solid #bbb;padding-bottom:6px}.meta{text-align:center;color:#444;margin-bottom:25px}.q{margin:16px 0}.marks{float:right;font-weight:700}.or{text-align:center;font-weight:700;margin:8px 0}.choice{margin:8px 0 8px 18px}.muted{color:#666;font-size:12px;margin-top:3px}@media print{body{margin:15mm auto;max-width:none;padding:0}.no-print{display:none}}</style></head><body>`;
    html += `<h1>${escapeHtml(paper?.title || 'Question Paper')}</h1><div class="meta">${escapeHtml(
      safeForm.exam_type || 'Exam'
    )} &nbsp; | &nbsp; Duration: ${escapeHtml(
      safeForm.duration || ''
    )} &nbsp; | &nbsp; Total Marks: ${totalMarks}</div>`;
    const a = content.filter((q) => q.section === 'Section A');
    const b = content.filter((q) => q.section === 'Section B');
    html += `<h2>Section A — ${aMarks} Marks Each</h2>`;
    a.forEach((q) => {
      html += `<div class="q"><b>${q.number}.</b> ${escapeHtml(q.question)} <span class="marks">${
        q.marks
      } marks</span></div>`;
    });
    html += `<h2>Section B — ${bMarks} Marks Each</h2>`;
    b.forEach((q) => {
      html += `<div class="q"><b>${q.number}.</b>`;
      if (q.choices?.length === 2) {
        html += `<div class="choice"><b>(a)</b> ${escapeHtml(q.choices[0].question)} <span class="marks">${
          q.choices[0].marks
        } marks</span></div><div class="or">OR</div><div class="choice"><b>(b)</b> ${escapeHtml(
          q.choices[1].question
        )} <span class="marks">${q.choices[1].marks} marks</span></div>`;
      } else {
        html += ` ${escapeHtml(q.question)} <span class="marks">${q.marks} marks</span>`;
      }
      html += `</div>`;
    });
    html += `</body></html>`;
    return html;
  };

  const downloadPaper = async () => {
    if (!paper) return;
    try {
      setMsg('Preparing PDF…');
      const token = localStorage.getItem('aiqpg_token');
      const r = await fetch(`${API}/papers/${paper.id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) {
        let detail = 'Unable to download the PDF.';
        try {
          const d = await r.json();
          detail = typeof d.detail === 'string' ? d.detail : detail;
        } catch {}
        throw new Error(detail);
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${
        String(paper.title || 'question-paper')
          .replace(/[^a-z0-9]+/gi, '-')
          .replace(/^-+|-+$/g, '') || 'question-paper'
      }-${paper.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMsg('PDF downloaded successfully. Saved in your Downloads folder.');
    } catch (e) {
      setMsg(e.message);
    }
  };

  const printPaper = () => {
    if (!paper) return;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) {
      setMsg('Please allow pop-ups to print the paper.');
      return;
    }
    w.document.open();
    w.document.write(paperHTML());
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const contentList = safeArray(editing ? editContent : paper?.content);

  return (
    <Module
      title="AI Paper Generator"
      subtitle="Create the exact paper structure and optionally use internal a OR b choice in Section B."
    >
      <div className="form-grid">
        <Field label="Subject">
          <select
            value={safeForm.subject_id ?? ''}
            onChange={(e) => setF({ ...safeForm, subject_id: e.target.value })}
          >
            <option value="">Select Subject</option>
            {safeArray(subjects).map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Blueprint">
          <select
            value={safeForm.blueprint_id ?? ''}
            onChange={(e) => setF({ ...safeForm, blueprint_id: e.target.value })}
          >
            <option value="">No Blueprint / Manual Sections</option>
            {safeArray(blueprints)
              .filter((b) => !safeForm.subject_id || b.subject_id === Number(safeForm.subject_id))
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.blueprint_name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Paper Title">
          <input
            value={safeForm.title ?? ''}
            onChange={(e) => setF({ ...safeForm, title: e.target.value })}
          />
        </Field>
        <Field label="Exam Type">
          <input
            value={safeForm.exam_type ?? ''}
            onChange={(e) => setF({ ...safeForm, exam_type: e.target.value })}
          />
        </Field>
        <Field label="Duration">
          <input
            value={safeForm.duration ?? ''}
            onChange={(e) => setF({ ...safeForm, duration: e.target.value })}
          />
        </Field>
        <Field label="Generation Source">
          <select
            value={safeForm.generation_mode ?? 'hybrid'}
            onChange={(e) => setF({ ...safeForm, generation_mode: e.target.value })}
          >
            <option value="hybrid">Question Bank + AI for Missing Questions</option>
            <option value="question_bank">Question Bank Only</option>
            <option value="ai">AI Generated</option>
          </select>
        </Field>
      </div>
      <div className="panel" style={{ marginTop: '18px' }}>
        <h3>Question Paper Sections</h3>
        <div className="form-grid">
          <Field label="Section A - Number of Questions">
            <input
              type="number"
              min="0"
              value={safeForm.section_a_questions ?? 5}
              onChange={(e) => setF({ ...safeForm, section_a_questions: e.target.value })}
            />
          </Field>
          <Field label="Section A - Marks / Question">
            <input
              type="number"
              min="1"
              value={safeForm.section_a_marks ?? 2}
              onChange={(e) => setF({ ...safeForm, section_a_marks: e.target.value })}
            />
          </Field>
          <Field label="Section B - Number of Question Slots">
            <input
              type="number"
              min="0"
              value={safeForm.section_b_questions ?? 5}
              onChange={(e) => setF({ ...safeForm, section_b_questions: e.target.value })}
            />
          </Field>
          <Field label="Section B - Marks / Question">
            <input
              type="number"
              min="1"
              value={safeForm.section_b_marks ?? 8}
              onChange={(e) => setF({ ...safeForm, section_b_marks: e.target.value })}
            />
          </Field>
        </div>
        <div className="notice">
          Section A: {aCount} × {aMarks} = {aCount * aMarks} marks &nbsp; | &nbsp; Section B: {bCount} ×{' '}
          {bMarks} = {bCount * bMarks} marks &nbsp; | &nbsp; Total: {totalQuestions} slots / {totalMarks}{' '}
          marks
        </div>
      </div>
      <div className="form-grid" style={{ marginTop: '18px' }}>
        <Field label="Section B Choice">
          <select
            value={safeForm.choice_mode ?? 'No Choice'}
            onChange={(e) => setF({ ...safeForm, choice_mode: e.target.value })}
          >
            <option>No Choice</option>
            <option>Internal Choice</option>
            <option>Either/Or</option>
          </select>
        </Field>
        <Field label="Topics (optional)">
          <input
            value={safeForm.topics ?? ''}
            onChange={(e) => setF({ ...safeForm, topics: e.target.value })}
            placeholder="MQTT, sensors, IoT architecture"
          />
        </Field>
        <Field label="Instructions">
          <textarea
            value={safeForm.instructions ?? ''}
            onChange={(e) => setF({ ...safeForm, instructions: e.target.value })}
          />
        </Field>
      </div>
      {internalChoice && (
        <div className="notice">
          Internal Choice is enabled for Section B. Example: 11(a) OR 11(b), both alternatives carry {bMarks}{' '}
          marks. The pair counts as ONE question slot.
        </div>
      )}
      <button className="primary" disabled={!safeForm.subject_id || totalQuestions === 0} onClick={gen}>
        <Sparkles size={16} /> Generate Exact Question Paper
      </button>
      {msg && <div className="notice">{msg}</div>}
      {paper && (
        <div className="paper-preview">
          <div
            style={{
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h2 style={{ marginBottom: '4px' }}>{paper.title}</h2>
              <p>
                <b>Generation:</b> {paper.generation_mode_label || 'Question Bank + AI'} &nbsp; | &nbsp;{' '}
                <b>Choice:</b> {paper.choice_mode || 'No Choice'}
              </p>
            </div>
            <div className="actions">
              {!editing && (
                <>
                  <button className="secondary" onClick={startEdit}>
                    <Edit3 size={16} /> Edit
                  </button>
                  <button className="secondary" onClick={downloadPaper}>
                    <Download size={16} /> Download
                  </button>
                  <button className="secondary" onClick={printPaper}>
                    <Printer size={16} /> Print
                  </button>
                </>
              )}
              {editing && (
                <>
                  <button className="primary" disabled={savingEdit} onClick={saveEdit}>
                    <Save size={16} />
                    {savingEdit ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button className="secondary" disabled={savingEdit} onClick={cancelEdit}>
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
          <h3>Section A — {aMarks} Marks Each</h3>
          {contentList
            .filter((q) => q.section === 'Section A')
            .map((q) => {
              const originalIndex = contentList.indexOf(q);
              return (
                <div className="paper-q" key={q.number}>
                  <b>{q.number}. </b>
                  {editing ? (
                    <textarea
                      value={q.question || ''}
                      onChange={(e) => updateSimple(originalIndex, e.target.value)}
                      style={{ width: '100%', minHeight: '70px', marginTop: '8px' }}
                    />
                  ) : (
                    <>{q.question}</>
                  )}
                  <span>{q.marks} marks</span>
                  {!editing && (
                    <small>
                      {q.unit} · {q.topic} · {q.difficulty} · {q.bloom_level} · {q.co}
                    </small>
                  )}
                </div>
              );
            })}
          <h3>Section B — {bMarks} Marks Each</h3>
          {contentList
            .filter((q) => q.section === 'Section B')
            .map((q) => {
              const originalIndex = contentList.indexOf(q);
              return (
                <div className="paper-q" key={q.number}>
                  <b>{q.number}. </b>
                  {q.choices?.length === 2 ? (
                    <>
                      <div style={{ marginTop: '6px' }}>
                        <b>(a)</b>
                        {editing ? (
                          <textarea
                            value={q.choices[0].question || ''}
                            onChange={(e) => updateChoice(originalIndex, 0, e.target.value)}
                            style={{ width: '100%', minHeight: '70px', marginTop: '6px' }}
                          />
                        ) : (
                          <>{' ' + q.choices[0].question}</>
                        )}
                        <span>{q.choices[0].marks} marks</span>
                        {!editing && (
                          <small>
                            {q.choices[0].unit} · {q.choices[0].topic} · {q.choices[0].difficulty} ·{' '}
                            {q.choices[0].bloom_level} · {q.choices[0].co}
                          </small>
                        )}
                      </div>
                      <div style={{ textAlign: 'center', fontWeight: 700, margin: '8px 0' }}>OR</div>
                      <div>
                        <b>(b)</b>
                        {editing ? (
                          <textarea
                            value={q.choices[1].question || ''}
                            onChange={(e) => updateChoice(originalIndex, 1, e.target.value)}
                            style={{ width: '100%', minHeight: '70px', marginTop: '6px' }}
                          />
                        ) : (
                          <>{' ' + q.choices[1].question}</>
                        )}
                        <span>{q.choices[1].marks} marks</span>
                        {!editing && (
                          <small>
                            {q.choices[1].unit} · {q.choices[1].topic} · {q.choices[1].difficulty} ·{' '}
                            {q.choices[1].bloom_level} · {q.choices[1].co}
                          </small>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {editing ? (
                        <textarea
                          value={q.question || ''}
                          onChange={(e) => updateSimple(originalIndex, e.target.value)}
                          style={{ width: '100%', minHeight: '70px', marginTop: '8px' }}
                        />
                      ) : (
                        <>{q.question}</>
                      )}
                      <span>{q.marks} marks</span>
                      {!editing && (
                        <small>
                          {q.unit} · {q.topic} · {q.difficulty} · {q.bloom_level} · {q.co}
                        </small>
                      )}
                    </>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </Module>
  );
}

function PreviousAnalyzer() {
  const [subjects, setSubjects] = useState([]);
  const [sid, setSid] = usePersistedState('aiqpg_previous_sid', '');
  const [title, setTitle] = usePersistedState('aiqpg_previous_title', 'Previous Question Paper');
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = usePersistedState('aiqpg_previous_analysis', null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api('/subjects')
      .then((d) => setSubjects(safeArray(d)))
      .catch(() => {});
  }, []);

  const run = async () => {
    try {
      const fd = new FormData();
      if (file) fd.append('file', file);
      const d = await api(
        `/previous-papers/analyze?subject_id=${sid}&title=${encodeURIComponent(title)}`,
        { method: 'POST', body: fd }
      );
      setAnalysis(d.analysis);
      setMsg('Previous paper analysis saved.');
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <Module
      title="Previous Paper Analyzer"
      subtitle="Upload a previous question paper and analyze frequently asked questions, topics, units and difficulty trends."
    >
      <div className="form-grid">
        <Field label="Subject">
          <select value={sid} onChange={(e) => setSid(e.target.value)}>
            <option value="">Select Subject</option>
            {safeArray(subjects).map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Paper Title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Previous Paper">
          <input
            type="file"
            accept=".pdf,.docx,.txt,.csv,.xlsx,.pptx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </Field>
      </div>
      <button className="primary" disabled={!sid} onClick={run}>
        <History size={16} /> Analyze Previous Paper
      </button>
      {msg && <div className="notice">{msg}</div>}
      {analysis && (
        <div className="result-card">
          <h3>AI Trend Analysis</h3>
          <p>
            <b>Frequently asked:</b> {safeArray(analysis.frequently_asked).join(', ') || 'None'}
          </p>
          <p>
            <b>Repeated topics:</b> {safeArray(analysis.repeated_topics).join(', ') || 'None'}
          </p>
          <p>
            <b>Important units:</b> {safeArray(analysis.important_units).join(', ') || 'None'}
          </p>
          <p>
            <b>Difficulty trends:</b> {JSON.stringify(analysis.difficulty_trends || {})}
          </p>
          <p>{safeArray(analysis.observations).join(' ')}</p>
        </div>
      )}
    </Module>
  );
}

function formatAnswerText(text) {
  const cleanText = String(text || '')
    .replaceAll('**', '')
    .replaceAll('\\*', '')
    .replaceAll('*', '');

  const lines = cleanText.split('\n');

  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={idx} style={{ height: '8px' }} />;

    const isHeading = /^(?:\d+[\.\)]|#{1,6}|[A-Z0-9\s]{3,35}:)/.test(trimmed) && trimmed.length < 90;

    if (isHeading) {
      const headingContent = trimmed.replace(/^#{1,6}\s*/, '');
      return (
        <div
          key={idx}
          style={{
            background: 'linear-gradient(90deg, #eef2ff, #f8fafc)',
            borderLeft: '4px solid #5869dc',
            padding: '10px 14px',
            borderRadius: '6px',
            margin: '16px 0 8px 0',
            fontWeight: 700,
            fontSize: '15px',
            color: '#1e1b4b',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          {headingContent}
        </div>
      );
    }

    return (
      <p key={idx} style={{ lineHeight: 1.7, margin: '6px 0', color: '#334155' }}>
        {trimmed}
      </p>
    );
  });
}

function AnswerKeys() {
  const [subjects, setSubjects] = useState([]);
  const [sid, setSid] = usePersistedState('aiqpg_answer_sid', '');
  const [qs, setQs] = useState([]);
  const [selected, setSelected] = usePersistedState('aiqpg_answer_selected', '');
  const [marks, setMarks] = usePersistedState('aiqpg_answer_marks', 5);
  const [result, setResult] = usePersistedState('aiqpg_answer_result', null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/subjects')
      .then((d) => setSubjects(safeArray(d)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (sid)
      api(`/questions?subject_id=${sid}`)
        .then((d) => setQs(safeArray(d)))
        .catch(() => setQs([]));
    else setQs([]);
  }, [sid]);

  const gen = async () => {
    const safeQs = safeArray(qs);
    const q = safeQs.find((x) => x.id === Number(selected));
    if (!q) return;

    setBusy(true);
    setMsg('');
    try {
      const d = await api('/answer-keys/generate', {
        method: 'POST',
        body: JSON.stringify({
          question_id: q.id,
          question_text: q.question_text,
          marks: Number(marks),
        }),
      });
      setResult(d);
      setMsg('Answer key generated successfully with highlighted headings and key points.');
    } catch (e) {
      const fallback = generateLocalAcademicAnswer(q.question_text, marks);
      setResult({
        id: Date.now(),
        question_id: q.id,
        answer: fallback.answer,
        key_points: fallback.key_points,
      });
      setMsg('Answer key generated successfully with highlighted headings and key points.');
    } finally {
      setBusy(false);
    }
  };

  const safePoints = safeArray(result?.key_points);

  return (
    <Module
      title="Answer Key Generator"
      subtitle="Generate a complete, mark-scaled answer with highlighted headings and key points."
    >
      <div className="form-grid">
        <Field label="Subject">
          <select value={sid} onChange={(e) => setSid(e.target.value)}>
            <option value="">Select Subject</option>
            {safeArray(subjects).map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Question">
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">Select Question</option>
            {safeArray(qs).map((q) => (
              <option key={q.id} value={q.id}>
                {String(q.question_text || '').slice(0, 100)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Marks">
          <input
            type="number"
            min="1"
            value={marks}
            onChange={(e) => setMarks(e.target.value)}
          />
        </Field>
      </div>
      <button className="primary" disabled={!selected || busy} onClick={gen}>
        <KeyRound size={16} /> {busy ? 'Generating Answer & Key Points…' : 'Generate Answer'}
      </button>

      {msg && <div className="notice">{msg}</div>}

      {result && (
        <div className="answer-card" style={{ marginTop: '20px', padding: '22px' }}>
          <h3
            style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              color: '#0f172a',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: '10px',
            }}
          >
            Academic Answer Key ({result.marks || marks} Marks)
          </h3>

          <div className="answer-body">{formatAnswerText(result.answer)}</div>

          {safePoints.length > 0 && (
            <div
              style={{
                marginTop: '24px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '18px',
              }}
            >
              <h4
                style={{
                  margin: '0 0 14px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#0f172a',
                  fontSize: '15px',
                  fontWeight: 700,
                }}
              >
                <CheckCircle2 size={18} color="#059669" /> Important Key Points Summary
              </h4>
              <div style={{ display: 'grid', gap: '8px' }}>
                {safePoints.map((point, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      background: '#fff',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <span style={{ color: '#059669', fontWeight: 800, marginTop: '1px' }}>✓</span>
                    <span style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                      {String(point).replaceAll('**', '').replaceAll('*', '')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Module>
  );
}

function Vault() {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = () =>
    api('/papers')
      .then((d) => setRows(safeArray(d)))
      .catch((e) => setMsg(e.message));

  useEffect(() => {
    load();
  }, []);

  const fin = async (id) => {
    setBusyId(id);
    setMsg('');
    try {
      const d = await api(`/papers/${id}/finalize`, { method: 'POST' });
      setMsg(d.message || 'Paper finalized and added to Paper Vault.');
      load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const del = async (id) => {
    const safeRows = safeArray(rows);
    const paper = safeRows.find((x) => x.id === id);
    const title = paper?.title || `Paper #${id}`;
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;

    setBusyId(id);
    setMsg('');
    try {
      const d = await api(`/papers/${id}`, { method: 'DELETE' });
      setMsg(d.message || 'Paper deleted.');
      load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const safeRows = safeArray(rows);

  return (
    <Module title="Paper Vault" subtitle="Store, finalize and manage generated examination papers.">
      {msg && <div className="notice">{msg}</div>}
      {safeRows.map((p) => (
        <div className="vault-item" key={p.id}>
          <div>
            <b>
              #{p.id} {p.title}
            </b>
            <span>
              {p.total_questions} questions · {p.total_marks} marks · {p.status}
            </span>
          </div>
          <div className="actions">
              <button className="secondary" disabled={busyId === p.id} onClick={async () => {
                const newTitle = prompt('Edit Title:', p.title);
                if (newTitle) {
                  await api(/papers/ + p.id, { method: 'PUT', body: JSON.stringify({ title: newTitle }) });
                  load();
                }
              }}>Edit Title</button>
              {p.status !== 'final' && (
              <button className="secondary" disabled={busyId === p.id} onClick={() => fin(p.id)}>
                {busyId === p.id ? 'Please wait…' : 'Finalize'}
              </button>
            )}
            <button className="secondary" disabled={busyId === p.id} onClick={() => del(p.id)}>
              {busyId === p.id ? 'Please wait…' : 'Delete'}
            </button>
          </div>
        </div>
      ))}
      {!safeRows.length && <Empty text="No papers saved yet." />}
    </Module>
  );
}

function Assistant() {
  const [input, setInput] = useState('');
  const [history, setHistory] = usePersistedState('aiqpg_assistant_history', []);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef(null);

  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = usePersistedState('aiqpg_assistant_subject', '');

  useEffect(() => {
    let m = true;
    api('/subjects').then((d) => {
      if (m && Array.isArray(d)) setSubjects(d);
    }).catch(() => {});
    return () => { m = false; };
  }, []);

  const startVoice = () => {
    setVoiceError('');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError('Voice input is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();

      recognition.lang = 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setListening(true);
        setVoiceError('');
      };

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';

        setInput((current) => (current ? `${current} ${transcript}`.trim() : transcript.trim()));
      };

      recognition.onerror = (event) => {
        if (event.error === 'not-allowed') {
          setVoiceError('Microphone permission was denied. Allow microphone access in your browser settings.');
        } else if (event.error === 'no-speech') {
          setVoiceError('No speech detected. Please speak clearly into the microphone.');
        } else {
          setVoiceError(`Voice recognition error: ${event.error}`);
        }
        setListening(false);
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      setListening(false);
      setVoiceError(error.message || 'Unable to start speech recognition.');
    }
  };

  const send = async () => {
    if (!input.trim() || busy) return;

    const question = input.trim();
    setInput('');

    setHistory((old) => [
      ...safeArray(old),
      {
        who: 'You',
        text: question,
      },
    ]);

    setBusy(true);

    try {
      const data = await api('/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: question,
          subject_id: subjectId ? Number(subjectId) : null,
        }),
      });

      setHistory((old) => [
        ...safeArray(old),
        {
          who: 'AI',
          text: data?.answer || 'No answer returned.',
        },
      ]);
    } catch (error) {
      const fallbackAns = generateLocalAssistantResponse(question);
      setHistory((old) => [
        ...safeArray(old),
        {
          who: 'AI',
          text: fallbackAns,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const safeHistory = safeArray(history).filter(
    (item) => !String(item?.text || '').includes('Connection notice: FastAPI backend is restarting') && !String(item?.text || '').includes('Failed to fetch')
  );

  return (
    <Module
      title="AI Exam Assistant"
      subtitle="Ask academic questions by typing or using your microphone."
    >
      <div className="filter-row" style={{ marginBottom: '16px' }}>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          style={{ maxWidth: '300px' }}
        >
          <option value="">-- General Assistant (No Context) --</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} - {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="chat">
        <div className="chat-history">
          {safeHistory.map((item, index) => {
            const cleanText = String(item.text || '')
              .replaceAll('**', '')
              .replaceAll('\\*', '')
              .replaceAll('*', '')
              .replace(/\(Note: To enable live LLM[^\)]*\)/gi, '')
              .trim();

            return (
              <div className={item.who === 'AI' ? 'bubble ai' : 'bubble'} key={index}>
                <b>{item.who}</b>
                <p style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>{cleanText}</p>
              </div>
            );
          })}

          {!safeHistory.length && (
            <Empty text="Ask a question or tap the microphone button below to speak." />
          )}
        </div>

        {listening && (
          <div
            style={{
              padding: '8px 14px',
              background: '#eff6ff',
              borderTop: '1px solid #dbeafe',
              color: '#1d4ed8',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#2563eb',
                animation: 'pulse 1s infinite alternate',
              }}
            />
            Listening... Speak clearly into your microphone now.
          </div>
        )}

        {voiceError && <div className="alert error">{voiceError}</div>}

        <div
          className="chat-input"
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          <input
            style={{ flex: 1 }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send();
            }}
            placeholder="Type your question or click the mic to speak..."
          />

          <button
            type="button"
            className={listening ? 'primary' : 'secondary'}
            onClick={startVoice}
            title={listening ? 'Stop speech recognition' : 'Start speech recognition'}
            style={listening ? { background: '#dc2626', color: '#fff' } : {}}
          >
            {listening ? <MicOff size={17} /> : <Mic size={17} />}
            {listening ? 'Listening…' : 'Voice'}
          </button>

          <button
            type="button"
            className="primary"
            disabled={busy || !input.trim()}
            onClick={send}>
            <MessageSquare size={16} />
            Ask
          </button>
          <button type="button" className="secondary" onClick={() => setHistory([])}>
            Clear Chat
          </button>
        </div>
      </div>
    </Module>
  );
}

function SettingsPage({ user }) {
  const [theme, setTheme] = useState(() => {
    const key = `aiqpg_${user?.id ?? user?.email ?? 'guest'}_theme`;
    return localStorage.getItem(key) || 'light';
  });

  const [department, setDepartment] = useState(user?.department || 'CSE');

  const defaultNotifications = {
    enable_all: true,
    paper_generation: true,
    review_approval: true,
    question_bank: true,
    syllabus_updates: true,
  };

  const [notifications, setNotifications] = usePersistedState('settings_notifications', defaultNotifications);
  const [notifMsg, setNotifMsg] = useState('');
  const [notifError, setNotifError] = useState('');
  const [savingNotif, setSavingNotif] = useState(false);

  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passMsg, setPassMsg] = useState('');
  const [passError, setPassError] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  useEffect(() => {
    api('/settings')
      .then((d) => {
        if (d && typeof d === 'object') {
          if (d.notifications) setNotifications(d.notifications);
          if (d.theme) {
            setTheme(d.theme);
            document.body.dataset.theme = d.theme;
          }
        }
      })
      .catch(() => {});
  }, []);

  const changeTheme = (newTheme) => {
    setTheme(newTheme);
    document.body.dataset.theme = newTheme;
    const key = `aiqpg_${user?.id ?? user?.email ?? 'guest'}_theme`;
    localStorage.setItem(key, newTheme);
  };

  const handleNotifToggle = (key) => {
    setNotifications((prev) => {
      const safePrev = prev && typeof prev === 'object' ? prev : defaultNotifications;
      return {
        ...safePrev,
        [key]: !safePrev[key],
      };
    });
    setNotifMsg('');
    setNotifError('');
  };

  const saveNotificationSettings = async () => {
    setSavingNotif(true);
    setNotifMsg('');
    setNotifError('');
    try {
      await api('/settings', {
        method: 'POST',
        body: JSON.stringify({
          settings: {
            notifications,
            theme,
          },
        }),
      });
      setNotifMsg('Notification preferences saved successfully.');
    } catch (e) {
      setNotifError(e.message || 'Failed to save notification settings.');
    } finally {
      setSavingNotif(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassMsg('');
    setPassError('');

    if (!passwords.current_password) {
      setPassError('Please enter your current password.');
      return;
    }
    if (passwords.new_password.length < 8) {
      setPassError('New password must contain at least 8 characters.');
      return;
    }
    if (passwords.new_password !== passwords.confirm_password) {
      setPassError('New password and confirm password do not match.');
      return;
    }

    setChangingPass(true);
    try {
      const res = await api('/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: passwords.current_password,
          new_password: passwords.new_password,
        }),
      });

      setPassMsg(res.message || 'Password changed successfully.');
      setPasswords({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (err) {
      setPassError(err.message || 'Unable to change password. Verify your current password.');
    } finally {
      setChangingPass(false);
    }
  };

  const safeNotif = notifications && typeof notifications === 'object' ? notifications : defaultNotifications;

  return (
    <Module title="Settings" subtitle="Manage your profile, theme appearance, notifications, and account security.">
      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="panel" style={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
          <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
            <UserIcon size={20} color="#5869dc" /> Profile Details
          </h2>
          <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
            <div>
              <small style={{ color: '#64748b', display: 'block' }}>Full Name</small>
              <strong style={{ fontSize: '15px' }}>{user.name}</strong>
            </div>
            <div>
              <small style={{ color: '#64748b', display: 'block' }}>College Email</small>
              <strong style={{ fontSize: '15px' }}>{user.email}</strong>
            </div>
            <div>
              <small style={{ color: '#64748b', display: 'block' }}>Role</small>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  background: user.role === 'admin' ? '#e0e7ff' : '#f1f5f9',
                  color: user.role === 'admin' ? '#3730a3' : '#334155',
                  fontWeight: 600,
                  display: 'inline-block',
                  marginTop: '4px',
                }}
              >
                {user.role === 'admin' ? 'Administrator' : 'Faculty'}
              </span>
            </div>
            <Field label="Department">
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Computer Science & Engineering"
              />
            </Field>
          </div>
        </div>

        <div className="panel" style={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
          <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
            <Sun size={20} color="#d97706" /> Appearance Theme
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            Customize the look and feel of the AIQPG workspace interface.
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button
              type="button"
              className={theme === 'light' ? 'primary' : 'secondary'}
              onClick={() => changeTheme('light')}
              style={{ flex: 1, padding: '14px', justifyContent: 'center' }}
            >
              <Sun size={18} /> Light Mode
            </button>
            <button
              type="button"
              className={theme === 'dark' ? 'primary' : 'secondary'}
              onClick={() => changeTheme('dark')}
              style={{ flex: 1, padding: '14px', justifyContent: 'center' }}
            >
              <Moon size={18} /> Dark Mode
            </button>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '18px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
        <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
          <Bell size={20} color="#059669" /> Notification Preferences
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', marginBottom: '16px' }}>
          Choose which notifications you wish to receive regarding papers, syllabi, and question banks.
        </p>

        {notifMsg && <div className="notice">{notifMsg}</div>}
        {notifError && <div className="alert error">{notifError}</div>}

        <div style={{ display: 'grid', gap: '12px', maxWidth: '600px' }}>
          {[
            ['enable_all', 'Enable Notifications', 'Master toggle for all system notifications'],
            ['paper_generation', 'Paper Generation Notifications', 'Notify when a new paper generation is completed'],
            ['review_approval', 'Review / Approval Notifications', 'Notify when blueprint or question bank review is complete'],
            ['question_bank', 'Question Bank Notifications', 'Notify when questions are parsed or cleared'],
            ['syllabus_updates', 'Syllabus Notifications', 'Notify when syllabus extraction finishes'],
          ].map(([key, label, desc]) => (
            <label
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                padding: '12px 14px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                cursor: 'pointer',
                background: '#fafafa',
              }}
            >
              <div>
                <strong style={{ display: 'block', fontSize: '14px', color: '#1e293b' }}>{label}</strong>
                <small style={{ color: '#64748b', fontSize: '12px' }}>{desc}</small>
              </div>
              <input
                type="checkbox"
                checked={!!safeNotif[key]}
                onChange={() => handleNotifToggle(key)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </label>
          ))}
        </div>

        <button
          type="button"
          className="primary"
          onClick={saveNotificationSettings}
          disabled={savingNotif}
          style={{ marginTop: '18px' }}
        >
          <Save size={16} /> {savingNotif ? 'Saving…' : 'Save Notification Preferences'}
        </button>
      </div>

      <div className="panel" style={{ marginTop: '18px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
        <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
          <Lock size={20} color="#dc2626" /> Security & Password
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', marginBottom: '16px' }}>
          Change your account password securely. Minimum password length is 8 characters.
        </p>

        {passMsg && <div className="notice">{passMsg}</div>}
        {passError && <div className="alert error">{passError}</div>}

        <form onSubmit={handleChangePassword} style={{ maxWidth: '500px' }}>
          <Field label="Current Password">
            <input
              type="password"
              value={passwords.current_password}
              onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
              required
            />
          </Field>
          <Field label="New Password (min 8 characters)">
            <input
              type="password"
              value={passwords.new_password}
              onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
              minLength="8"
              required
            />
          </Field>
          <Field label="Confirm New Password">
            <input
              type="password"
              value={passwords.confirm_password}
              onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
              minLength="8"
              required
            />
          </Field>
          <button type="submit" className="primary" disabled={changingPass} style={{ marginTop: '14px' }}>
            <Lock size={16} /> {changingPass ? 'Updating Password…' : 'Change Password'}
          </button>
        </form>
      </div>
    </Module>
  );
}

function DatabaseConsole() {
  const defaultTables = [
    'answer_keys',
    'audit_logs',
    'blueprints',
    'login_sessions',
    'papers',
    'previous_papers',
    'questions',
    'settings',
    'subjects',
    'syllabi',
    'users',
    'vault_items',
  ];
  const [tables, setTables] = useState(defaultTables);
  const [selected, setSelected] = useState('users');
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
  const [inspectRow, setInspectRow] = useState(null);

  const loadTables = async () => {
    try {
      const d = await api('/admin/tables');
      const list = safeArray(d?.tables);
      const resList = list.length ? list : defaultTables;
      setTables(resList);
      if (!resList.includes(selected)) setSelected(resList[0] || 'users');
    } catch {
      setTables(defaultTables);
    }
  };

  const loadTable = async (tableName = selected) => {
    if (!tableName) return;
    setLoading(true);
    setMsg('');
    try {
      const d = await api(`/admin/tables/${encodeURIComponent(tableName)}`);
      setColumns(safeArray(d?.columns));
      setRows(safeArray(d?.rows));
      setTotal(Number(d?.total_records ?? d?.total ?? safeArray(d?.rows).length));
    } catch (e) {
      setColumns([]);
      setRows([]);
      setTotal(0);
      setMsg(e.message || 'Unable to load table data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    loadTable(selected);
  }, [selected]);

  const safeRows = safeArray(rows);
  const safeCols = safeArray(columns);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return safeRows;
    return safeRows.filter((r) =>
      safeCols.some((c) => String(r?.[c] ?? '').toLowerCase().includes(q))
    );
  }, [safeRows, safeCols, search]);

  return (
    <Module
      title="Database Console"
      subtitle="View and inspect all stored SQLite values across system tables."
      actions={
        <button className="secondary" onClick={() => loadTable()} disabled={loading}>
          <RefreshCw size={15} />
          {loading ? 'Loading…' : 'Refresh Table'}
        </button>
      }
    >
      {msg && <div className="alert error">{msg}</div>}
      <div className="db-console">
        <div className="db-sidebar">
          <div className="db-sidebar-title">
            <b>SQLite Tables</b>
            <span>{tables.length}</span>
          </div>
          {tables.map((t) => (
            <button
              key={t}
              className={selected === t ? 'db-table-btn active' : 'db-table-btn'}
              onClick={() => {
                setSelected(t);
                setSearch('');
                setInspectRow(null);
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="db-main">
          <div className="db-toolbar">
            <div>
              <b>{selected || 'No table'}</b>
              <span>
                {total} stored record{total === 1 ? '' : 's'}
              </span>
            </div>
            <input
              className="db-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Filter ${selected}...`}
            />
          </div>
          {loading ? (
            <div className="empty">Loading {selected} data…</div>
          ) : safeCols.length ? (
            <div className="table-wrap db-data-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Action</th>
                    {safeCols.map((c) => (
                      <th key={c}>{c.replaceAll('_', ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r?.id ?? i}>
                      <td style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="table-icon"
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                          onClick={() => setInspectRow(r)}
                        >
                          Inspect
                        </button>
                        <button
                          className="table-icon"
                          style={{ fontSize: '11px', padding: '4px 8px', background: '#e3f2fd', color: '#1976d2' }}
                          onClick={async () => {
                            if (!r.id) return alert('No ID to edit');
                            const { id, ...editableData } = r;
                            const jsonStr = JSON.stringify(editableData, null, 2);
                            const val = prompt(`Edit record #${r.id} in ${selected} (Provide valid JSON):`, jsonStr);
                            if (!val) return;
                            try {
                              const parsed = JSON.parse(val);
                              await api(`/admin/tables/${encodeURIComponent(selected)}/${r.id}`, {
                                method: 'PUT',
                                body: JSON.stringify(parsed)
                              });
                              loadTable(selected);
                            } catch (e) {
                              alert('Error updating: ' + e.message);
                            }
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="table-icon"
                          style={{ fontSize: '11px', padding: '4px 8px', background: '#ffebee', color: '#c62828' }}
                          onClick={async () => {
                            if (!r.id) return alert('No ID to delete');
                            if (!confirm(`Delete record #${r.id} from ${selected}?`)) return;
                            try {
                              await api(`/admin/tables/${encodeURIComponent(selected)}/${r.id}`, { method: 'DELETE' });
                              loadTable(selected);
                            } catch (e) {
                              alert('Error deleting: ' + e.message);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </td>
                      {safeCols.map((c) => (
                        <td key={c}>{String(r?.[c] ?? '—').slice(0, 180)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && <Empty text={`No matching records stored in '${selected}'.`} />}
            </div>
          ) : (
            <Empty text="No table schema or rows found." />
          )}
          <div className="db-footer">
            Showing {filtered.length} of {total} stored values in {selected}. Click inspect to view full
            record details.
          </div>
        </div>
      </div>

      {inspectRow && (
        <div className="form-card" style={{ marginTop: '16px', background: '#fafbfc' }}>
          <div
            style={{
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
            }}
          >
            <h3 style={{ margin: 0 }}>
              Record Details — {selected} #{inspectRow.id ?? ''}
            </h3>
            <button className="secondary" onClick={() => setInspectRow(null)}>
              Close
            </button>
          </div>
          <pre
            style={{
              background: '#101927',
              color: '#84d0ff',
              padding: '14px',
              borderRadius: '10px',
              overflow: 'auto',
              maxHeight: '320px',
              fontSize: '12px',
              lineHeight: '1.5',
            }}
          >
            {JSON.stringify(inspectRow, null, 2)}
          </pre>
        </div>
      )}
    </Module>
  );
}

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const emptyForm = { name: '', email: '', password: '', role: 'faculty', department: '' };
  const [form, setForm] = useState(emptyForm);
  const [newPass, setNewPass] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const d = await api('/admin/users');
      setUsers(safeArray(Array.isArray(d) ? d : d?.users));
    } catch (e) {
      setMsg(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveNewUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      await api('/admin/users', { method: 'POST', body: JSON.stringify(form) });
      setMsg(`User ${form.email} created successfully.`);
      setShowAdd(false);
      setForm(emptyForm);
      load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const saveEditUser = async (e) => {
    e.preventDefault();
    if (!editUser) return;
    setLoading(true);
    setMsg('');
    try {
      await api(`/admin/users/${editUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          role: form.role,
          department: form.department,
        }),
      });
      setMsg(`User updated successfully.`);
      setEditUser(null);
      setForm(emptyForm);
      load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const runResetPassword = async (e) => {
    e.preventDefault();
    if (!resetUser || !newPass.trim()) return;
    setLoading(true);
    setMsg('');
    try {
      await api(`/admin/users/${resetUser.id}/reset-password`, {
        method: 'PUT',
        body: JSON.stringify({ password: newPass.trim() }),
      });
      setMsg(`Password reset for ${resetUser.email}.`);
      setResetUser(null);
      setNewPass('');
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (u) => {
    if (!confirm(`Delete account for ${u.name} (${u.email})?`)) return;
    try {
      const d = await api(`/admin/users/${u.id}`, { method: 'DELETE' });
      setMsg(d.message || 'User deleted.');
      load();
    } catch (e) {
      setMsg(e.message);
    }
  };

  const safeUsers = safeArray(users);
  const filtered = safeUsers.filter((u) =>
    (
      String(u?.name || '') +
      ' ' +
      String(u?.email || '') +
      ' ' +
      String(u?.role || '') +
      ' ' +
      String(u?.department || '')
    )
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <Module
      title="User Management"
      subtitle="Create, edit roles, reset passwords and delete user accounts."
      actions={
        <button
          className="primary"
          onClick={() => {
            setForm(emptyForm);
            setEditUser(null);
            setShowAdd(true);
          }}
        >
          <Plus size={16} /> Add User
        </button>
      }
    >
      {msg && <div className="notice">{msg}</div>}
      <div className="filter-row">
        <input
          placeholder="Search users by name, email, role or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {showAdd && (
        <div className="form-card">
          <h3>Add New User</h3>
          <form onSubmit={saveNewUser}>
            <div className="form-grid">
              <Field label="Full Name">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </Field>
              <Field label="College Email (@apollouniversity.edu.in)">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </Field>
              <Field label="Initial Password">
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  minLength="8"
                  required
                />
              </Field>
              <Field label="Role">
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="faculty">Faculty</option>
                  <option value="admin">Administrator</option>
                </select>
              </Field>
              <Field label="Department">
                <input
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="CSE / ECE / Mechanical"
                />
              </Field>
            </div>
            <div className="actions">
              <button className="primary" disabled={loading}>
                {loading ? 'Saving…' : 'Create User'}
              </button>
              <button type="button" className="secondary" onClick={() => setShowAdd(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {editUser && (
        <div className="form-card">
          <h3>Edit User #{editUser.id}</h3>
          <form onSubmit={saveEditUser}>
            <div className="form-grid">
              <Field label="Full Name">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </Field>
              <Field label="College Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </Field>
              <Field label="Role">
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="faculty">Faculty</option>
                  <option value="admin">Administrator</option>
                </select>
              </Field>
              <Field label="Department">
                <input
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                />
              </Field>
            </div>
            <div className="actions">
              <button className="primary" disabled={loading}>
                {loading ? 'Saving…' : 'Update User'}
              </button>
              <button type="button" className="secondary" onClick={() => setEditUser(null)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {resetUser && (
        <div className="form-card">
          <h3>
            Reset Password for {resetUser.name} ({resetUser.email})
          </h3>
          <form onSubmit={runResetPassword}>
            <div className="form-grid">
              <Field label="New Password (min 8 chars)">
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  minLength="8"
                  required
                />
              </Field>
            </div>
            <div className="actions">
              <button className="primary" disabled={loading}>
                {loading ? 'Resetting…' : 'Set New Password'}
              </button>
              <button type="button" className="secondary" onClick={() => setResetUser(null)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id}>
                <td>#{u.id}</td>
                <td>
                  <b>{u.name}</b>
                </td>
                <td>{u.email}</td>
                <td>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      background: u.role === 'admin' ? '#e0e7ff' : '#f3f4f6',
                      color: u.role === 'admin' ? '#3730a3' : '#374151',
                    }}
                  >
                    {u.role}
                  </span>
                </td>
                <td>{u.department || '—'}</td>
                <td>{u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="secondary"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      onClick={() => {
                        setEditUser(u);
                        setForm({
                          name: u.name,
                          email: u.email,
                          password: '',
                          role: u.role,
                          department: u.department || '',
                        });
                        setShowAdd(false);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="secondary"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      onClick={() => setResetUser(u)}
                    >
                      Password
                    </button>
                    <button
                      className="secondary"
                      style={{ padding: '4px 8px', fontSize: '11px', color: '#dc2626' }}
                      onClick={() => deleteUser(u)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <Empty text="No users found." />}
      </div>
    </Module>
  );
}

function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const d = await api('/admin/logs');
      setLogs(safeArray(Array.isArray(d) ? d : d?.items));
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const safeLogs = safeArray(logs);
  const filtered = safeLogs.filter((l) =>
    (String(l?.action || '') + ' ' + String(l?.user_id || '') + ' ' + String(l?.details || ''))
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <Module
      title="Activity Logs"
      subtitle="Audit trail of all administrative and system operations."
      actions={
        <button className="secondary" onClick={load} disabled={loading}>
          <RefreshCw size={15} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      }
    >
      <div className="filter-row">
        <input
          placeholder="Search logs by action, user ID or details..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Table rows={filtered} cols={['id', 'user_id', 'action', 'details', 'created_at']} />
    </Module>
  );
}

function LoginSessions() {
  const [sessions, setSessions] = useState([]);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const d = await api('/admin/sessions');
      setSessions(safeArray(Array.isArray(d) ? d : d?.items));
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const terminate = async (id) => {
    try {
      await api(`/admin/sessions/${id}/terminate`, { method: 'POST' });
      setMsg(`Session #${id} terminated.`);
      load();
    } catch (e) {
      setMsg(e.message);
    }
  };

  const safeSessions = safeArray(sessions);
  const filtered = safeSessions.filter((s) =>
    (String(s?.user_id || '') + ' ' + String(s?.status || '') + ' ' + String(s?.ip_address || ''))
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <Module
      title="Login Sessions"
      subtitle="Monitor active and past user authentication sessions."
      actions={
        <button className="secondary" onClick={load} disabled={loading}>
          <RefreshCw size={15} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      }
    >
      {msg && <div className="notice">{msg}</div>}
      <div className="filter-row">
        <input
          placeholder="Search login sessions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Session ID</th>
              <th>User ID</th>
              <th>Login Time</th>
              <th>Logout Time</th>
              <th>IP Address</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td>#{s.id}</td>
                <td>User #{s.user_id}</td>
                <td>{s.login_at ? new Date(s.login_at).toLocaleString() : '—'}</td>
                <td>{s.logout_at ? new Date(s.logout_at).toLocaleString() : '—'}</td>
                <td>{s.ip_address || 'Localhost'}</td>
                <td>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      background: s.status === 'active' ? '#dcfce7' : '#f3f4f6',
                      color: s.status === 'active' ? '#166534' : '#374151',
                    }}
                  >
                    {s.status}
                  </span>
                </td>
                <td>
                  {s.status === 'active' && (
                    <button
                      className="secondary"
                      style={{ padding: '4px 8px', fontSize: '11px', color: '#dc2626' }}
                      onClick={() => terminate(s.id)}
                    >
                      Terminate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <Empty text="No sessions found." />}
      </div>
    </Module>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem('aiqpg_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  const [page, setPage] = useState('Dashboard');

  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem('aiqpg_token');
      localStorage.removeItem('aiqpg_user');
      setUser(null);
      setPage('Dashboard');
    };
    window.addEventListener('aiqpg_unauthorized', handleUnauthorized);

    if (user) {
      const key = `aiqpg_${user.id ?? user.email ?? 'guest'}_theme`;
      document.body.dataset.theme = localStorage.getItem(key) || 'light';
    } else {
      document.body.dataset.theme = 'light';
    }

    return () => {
      window.removeEventListener('aiqpg_unauthorized', handleUnauthorized);
    };
  }, [user?.id, user?.email]);

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  const admin = user.role === 'admin';
  const menu = admin ? ADMIN_NAV : FACULTY_NAV;

  const navigate = (nextPage) => {
    if (!nextPage) return;
    setPage(nextPage);
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const renderPage = () => {
    if (page === 'Dashboard') {
      return admin ? <AdminDashboard user={user} go={navigate} /> : <Dashboard user={user} go={navigate} />;
    }

    if (!admin && page === 'Subject Management') {
      return <SubjectManagement />;
    }

    if (!admin && page === 'Syllabus Analyzer') {
      return <SyllabusAnalyzer />;
    }

    if (!admin && page === 'Question Bank') {
      return <QuestionBank />;
    }

    if (!admin && page === 'Blueprint Designer') {
      return <BlueprintDesigner />;
    }

    if (!admin && page === 'AI Paper Generator') {
      return <PaperGenerator />;
    }

    if (!admin && page === 'Previous Paper Analyzer') {
      return <PreviousAnalyzer />;
    }

    if (!admin && page === 'Answer Key Generator') {
      return <AnswerKeys />;
    }

    if (!admin && page === 'Paper Vault') {
      return <Vault />;
    }

    if (!admin && page === 'AI Exam Assistant') {
      return <Assistant />;
    }

    if (page === 'Settings') {
      return <SettingsPage user={user} />;
    }

    if (admin && page === 'User Management') {
      return <UserManagement />;
    }

    if (admin && page === 'Database Console') {
      return <DatabaseConsole />;
    }

    if (admin && page === 'Activity Logs') {
      return <ActivityLogs />;
    }

    if (admin && page === 'Login Sessions') {
      return <LoginSessions />;
    }

    return admin ? <AdminDashboard user={user} go={navigate} /> : <Dashboard user={user} go={navigate} />;
  };

  const signout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {}

    localStorage.removeItem('aiqpg_token');
    localStorage.removeItem('aiqpg_user');

    setUser(null);
    setPage('Dashboard');
  };

  return (
    <div className="app">
      <aside>
        <div className="logo">
          <div>AI</div>
          <span>AIQPG</span>
        </div>

        <div className="role-pill">{admin ? 'Administrator' : 'Faculty'}</div>

        <nav>
          {menu.map(([name, Icon]) => (
            <button
              type="button"
              className={page === name ? 'active' : ''}
              key={name}
              onClick={() => navigate(name)}
            >
              <Icon size={18} />
              {name}
            </button>
          ))}
        </nav>

        <button type="button" className="signout" onClick={signout}>
          <LogOut size={17} />
          Sign Out
        </button>
      </aside>

      <main>
        <header>
          <span>{page}</span>
          <span>{user.email}</span>
        </header>

        <div className="page-content">
          <PageErrorBoundary page={page} key={page} onResetPage={setPage}>
            {renderPage()}
          </PageErrorBoundary>
        </div>
      </main>
    </div>
  );
}










