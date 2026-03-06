import React, { useCallback, useEffect, useState } from 'react';
import { API_BASE } from '../../services/api';

const defaultPalette = {
  bgCard: '#111827',
  bgCardAlt: '#0b1220',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  border: '#1e293b',
  accent: '#6366f1',
  accentSoft: 'rgba(99,102,241,0.18)',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
};

const getPagePalette = (appPalette) => ({
  bgCard: appPalette?.bgCard || defaultPalette.bgCard,
  bgCardAlt: appPalette?.bgPanel || defaultPalette.bgCardAlt,
  text: appPalette?.text || defaultPalette.text,
  textMuted: appPalette?.textMuted || defaultPalette.textMuted,
  border: appPalette?.border || defaultPalette.border,
  accent: appPalette?.accent || defaultPalette.accent,
  accentSoft: appPalette?.accentSoft || defaultPalette.accentSoft,
  success: defaultPalette.success,
  warning: defaultPalette.warning,
  danger: appPalette?.danger || defaultPalette.danger,
});

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    price: '$9.99',
    period: '/ month',
    features: [
      'Up to 5 profiles',
      '1 group',
      '10 members',
      'Standard firewall rules',
      'Email support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29.99',
    period: '/ month',
    popular: true,
    features: [
      'Up to 20 profiles',
      '5 groups',
      '50 members',
      'Advanced firewall rules',
      'Priority support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$49.99',
    period: '/ month',
    features: [
      'Unlimited profiles',
      'Unlimited groups',
      'Unlimited members',
      'Advanced security policies',
      '24/7 premium support',
    ],
  },
];

const getApiBaseUrl = () => {
  if (API_BASE && API_BASE.trim()) {
    let url = API_BASE.trim();
    if (!url.endsWith('/api')) {
      url = url.endsWith('/') ? `${url}api` : `${url}/api`;
    }
    return url;
  }

  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    return 'https://neosec.onrender.com/api';
  }

  return 'http://localhost:5000/api';
};

const Subscription = ({ palette: appPalette, onUpgradeSuccess }) => {
  const apiBaseUrl = getApiBaseUrl();
  const palette = getPagePalette(appPalette);
  const tableHeadStyle = {
    textAlign: 'left',
    padding: '12px 8px',
    color: palette.textMuted,
    fontWeight: 500,
  };

  const tableCellStyle = {
    padding: '12px 8px',
    color: palette.text,
  };

  const [currentPlan, setCurrentPlan] = useState('free');
  const [billingHistory, setBillingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingTier, setProcessingTier] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const syncUserAfterPayment = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const meRes = await fetch(`${apiBaseUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (meRes.ok) {
          const meData = await meRes.json();
          const latestUser = meData?.user;

          if (latestUser && (latestUser.isPaid || latestUser.accountType === 'leader')) {
            localStorage.setItem('user', JSON.stringify(latestUser));

            if (typeof onUpgradeSuccess === 'function') {
              onUpgradeSuccess(latestUser);
            }

            window.dispatchEvent(new CustomEvent('neosec-user-updated', { detail: latestUser }));
            break;
          }
        }
      } catch (err) {
        // no-op: retry loop handles transient conditions
      }

      if (attempt < 4) {
        await delay(2000);
      }
    }
  }, [apiBaseUrl, onUpgradeSuccess]);

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      setError('No authentication token found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const subRes = await fetch(`${apiBaseUrl}/subscription/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!subRes.ok) throw new Error(`Failed to fetch subscription: ${subRes.status}`);

      const subData = await subRes.json();
      setCurrentPlan(subData.subscription?.tier || 'free');

      const billRes = await fetch(`${apiBaseUrl}/subscription/billing`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!billRes.ok) throw new Error(`Failed to fetch billing: ${billRes.status}`);

      const billData = await billRes.json();
      setBillingHistory(billData.history || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  const checkURLParams = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success')) {
      setMessage('Payment successful! Your subscription will be updated shortly.');
      await syncUserAfterPayment();
      await fetchData();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (params.get('canceled')) {
      setMessage('Payment was canceled.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [fetchData, syncUserAfterPayment]);

  useEffect(() => {
    const initialize = async () => {
      await fetchData();
      await checkURLParams();
    };

    initialize();
  }, [fetchData, checkURLParams]);

  const startCheckout = async (tier) => {
    setProcessingTier(tier);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const res = await fetch(`${apiBaseUrl}/subscription/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tier }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create checkout session');
      if (!data.url) throw new Error('No checkout URL returned');

      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      alert(err.message);
    } finally {
      setProcessingTier(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 32, maxWidth: 1200, color: palette.text, minHeight: '100vh', fontFamily: 'inherit', fontSize: 16, fontWeight: 400 }}>
        <h2 style={{ fontSize: 28 }}>Loading subscription...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto', color: palette.text, minHeight: '100vh', fontFamily: 'inherit', fontSize: 16, fontWeight: 400 }}>
      <h2 style={{ fontSize: 30, marginBottom: 8 }}>Subscriptions</h2>
      <p style={{ color: palette.textMuted, marginBottom: 24 }}>Upgrade to unlock more features</p>

      {error && (
        <div
          style={{
            backgroundColor: 'rgba(239,68,68,0.12)',
            border: `1px solid ${palette.danger}`,
            padding: 14,
            borderRadius: 8,
            marginBottom: 24,
            color: palette.danger,
          }}
        >
          {error}
        </div>
      )}

      {message && (
        <div
          style={{
            backgroundColor: palette.accentSoft,
            border: `1px solid ${palette.accent}`,
            padding: 14,
            borderRadius: 8,
            marginBottom: 24,
            color: palette.text,
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          backgroundColor: palette.bgCard,
          border: `1px solid ${palette.border}`,
          borderRadius: 12,
          padding: 24,
          marginBottom: 32,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 22, marginBottom: 10 }}>
          Current Plan:{' '}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: '0.4px',
              color: palette.warning,
              backgroundColor: 'rgba(245,158,11,0.14)',
              border: '1px solid rgba(245,158,11,0.35)',
            }}
          >
            {currentPlan.toUpperCase()}
          </span>
        </h3>
        <p style={{ color: palette.textMuted, margin: 0 }}>Upgrade to unlock more features</p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
          marginBottom: 36,
        }}
      >
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const isProcessing = processingTier === plan.id;
          const isPopular = !!plan.popular;

          return (
            <div
              key={plan.id}
              style={{
                backgroundColor: isPopular ? palette.bgCardAlt : palette.bgCard,
                border: `2px solid ${isCurrent ? palette.success : isPopular ? palette.accent : palette.border}`,
                borderRadius: 14,
                padding: 24,
                position: 'relative',
                boxShadow: isPopular ? '0 14px 30px rgba(79,70,229,0.24)' : 'none',
                transform: isPopular ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              {isPopular && (
                <div
                  style={{
                    position: 'absolute',
                    top: -12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: palette.accent,
                    color: '#fff',
                    padding: '4px 12px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 500,
                    letterSpacing: '0.4px',
                  }}
                >
                  POPULAR
                </div>
              )}

              <h3 style={{ margin: '2px 0 8px 0', fontSize: 22 }}>{plan.name}</h3>

              <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 20 }}>
                <span style={{ fontSize: 34, fontWeight: 500, color: isPopular ? palette.accent : palette.text }}>
                  {plan.price}
                </span>
                <span style={{ fontSize: 16, color: palette.textMuted, marginLeft: 6 }}>{plan.period}</span>
              </div>

              <ul style={{ paddingLeft: 0, listStyle: 'none', margin: '0 0 20px 0' }}>
                {plan.features.map((feature, index) => (
                  <li
                    key={index}
                    style={{
                      color: palette.textMuted,
                      marginBottom: 12,
                      paddingLeft: 24,
                      position: 'relative',
                    }}
                  >
                    <span style={{ position: 'absolute', left: 0, color: palette.success }}>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                disabled={isCurrent || isProcessing}
                onClick={() => startCheckout(plan.id)}
                style={{
                  width: '100%',
                  padding: '12px 0',
                  borderRadius: 8,
                  border: isPopular ? 'none' : `1px solid ${palette.border}`,
                  backgroundColor: isCurrent
                    ? palette.border
                    : isProcessing
                      ? palette.textMuted
                      : isPopular
                        ? palette.accent
                        : 'transparent',
                  color: isCurrent ? palette.textMuted : isPopular ? '#ffffff' : palette.text,
                  fontWeight: 500,
                  fontSize: 15,
                  cursor: isCurrent || isProcessing ? 'not-allowed' : 'pointer',
                  opacity: isCurrent || isProcessing ? 0.6 : 1,
                }}
              >
                {isCurrent ? 'Current Plan' : isProcessing ? 'Processing...' : 'Upgrade Now'}
              </button>
            </div>
          );
        })}
      </div>

      <div
        style={{
          backgroundColor: palette.bgCard,
          border: `1px solid ${palette.border}`,
          borderRadius: 12,
          padding: 24,
        }}
      >
        <h3 style={{ margin: 0, marginBottom: 16, fontSize: 22 }}>Billing History</h3>
        {billingHistory.length === 0 ? (
          <div
            style={{
              border: `1px solid ${palette.border}`,
              borderRadius: 10,
              padding: 24,
              color: palette.textMuted,
              textAlign: 'center',
              backgroundColor: palette.bgCardAlt,
            }}
          >
            No invoices yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
                  <th style={tableHeadStyle}>Plan</th>
                  <th style={tableHeadStyle}>Amount</th>
                  <th style={tableHeadStyle}>Date</th>
                  <th style={tableHeadStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {billingHistory.map((bill) => (
                  <tr key={bill.id} style={{ borderBottom: `1px solid ${palette.border}` }}>
                    <td style={tableCellStyle}>{bill.plan || '-'}</td>
                    <td style={tableCellStyle}>{bill.amount || '-'}</td>
                    <td style={tableCellStyle}>{bill.paidAt ? new Date(bill.paidAt).toLocaleDateString() : '-'}</td>
                    <td style={{ ...tableCellStyle, color: palette.success, fontWeight: 500 }}>{bill.status || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Subscription;
