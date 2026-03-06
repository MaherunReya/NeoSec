import React, { useEffect, useRef, useState } from 'react';
import AnimatedBackground from './Auth/AnimatedBackground';

import { API_BASE } from '../services/api';

/* ─── Intersection observer hook ─── */
function useInView(threshold = 0.12) {
    const ref = useRef(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) setInView(true); },
            { threshold }
        );
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [threshold]);
    return [ref, inView];
}

/* ─── Animated stat counter ─── */
function AnimatedCounter({ target, suffix = '', duration = 2000 }) {
    const [count, setCount] = useState(0);
    const [ref, inView] = useInView();
    useEffect(() => {
        if (!inView) return;
        let n = 0;
        const step = Math.ceil(target / (duration / 16));
        const t = setInterval(() => {
            n += step;
            if (n >= target) { setCount(target); clearInterval(t); }
            else setCount(n);
        }, 16);
        return () => clearInterval(t);
    }, [inView, target, duration]);
    return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}


/* Step 1 — Sign-up / account creation screen */
function MockupSignup() {
    return (
        <div style={mockupWrap}>
            <MockupTopBar title="Create Account" />
            <div style={{ padding: '14px 16px' }}>
                {/* Shield icon row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <div style={greenCircle}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.5">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </div>
                    <div>
                        <div style={{ ...fakeText, width: 80, background: '#fff', opacity: 0.85 }} />
                        <div style={{ ...fakeText, width: 55, marginTop: 4, opacity: 0.3 }} />
                    </div>
                </div>
                {/* Input fields */}
                {['Email address', 'Password', 'Organization name'].map((label, i) => (
                    <div key={i} style={{ marginBottom: '10px' }}>
                        <div style={{ ...fakeText, width: 80, opacity: 0.4, marginBottom: 4, height: 6 }} />
                        <div style={{
                            height: '26px', borderRadius: '5px',
                            background: i === 0 ? 'rgba(54,226,123,0.08)' : 'rgba(255,255,255,0.04)',
                            border: i === 0 ? '1px solid rgba(54,226,123,0.5)' : '1px solid rgba(255,255,255,0.08)',
                            display: 'flex', alignItems: 'center', paddingLeft: '8px',
                        }}>
                            <div style={{ ...fakeText, width: i === 0 ? 100 : 70, opacity: i === 0 ? 0.7 : 0.2, height: 7 }} />
                        </div>
                    </div>
                ))}
                {/* MFA badge */}
                <div style={{
                    marginTop: '10px', padding: '6px 10px', borderRadius: '6px',
                    background: 'rgba(54,226,123,0.08)', border: '1px solid rgba(54,226,123,0.2)',
                    display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#36E27B', flexShrink: 0 }} />
                    <div style={{ ...fakeText, width: 120, opacity: 0.7, height: 7 }} />
                </div>
                {/* Button */}
                <div style={{ marginTop: '12px', height: '26px', borderRadius: '5px', background: '#36E27B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ ...fakeText, width: 80, background: '#000', opacity: 0.8, height: 8 }} />
                </div>
            </div>
        </div>
    );
}

/* Step 2 — Firewall / profile config screen */
function MockupFirewall() {
    const rules = [
        { label: 'Block port 22 inbound', status: 'ACTIVE', color: '#36E27B' },
        { label: 'Allow HTTPS 443', status: 'ACTIVE', color: '#36E27B' },
        { label: 'Block geo: CN, RU', status: 'ACTIVE', color: '#36E27B' },
        { label: 'Rate-limit API /auth', status: 'WARN', color: '#f0a500' },
    ];
    return (
        <div style={mockupWrap}>
            <MockupTopBar title="Firewall Rules" />
            <div style={{ padding: '10px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
                    <div style={{ ...fakeText, width: 90, opacity: 0.4, height: 7 }} />
                    <div style={{ background: '#36E27B', borderRadius: '4px', padding: '3px 8px' }}>
                        <div style={{ ...fakeText, width: 40, background: '#000', height: 7 }} />
                    </div>
                </div>
                {rules.map((r, i) => (
                    <div key={i} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '7px 8px', borderRadius: '5px', marginBottom: '5px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                            <div style={{ ...fakeText, width: 100, opacity: 0.55, height: 7 }} />
                        </div>
                        <div style={{
                            fontSize: '8px', fontWeight: 700, color: r.color,
                            background: `${r.color}18`, borderRadius: '3px',
                            padding: '2px 5px', letterSpacing: '0.3px',
                        }}>{r.status}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* Step 3 — VPN tunnel / connection screen */
function MockupVPN() {
    const tunnels = [
        { label: 'US-East Gateway', status: 'CONNECTED', color: '#36E27B', ping: '14ms' },
        { label: 'EU-West Gateway', status: 'STANDBY', color: '#5b8fff', ping: '42ms' },
        { label: 'Kill-Switch', status: 'ARMED', color: '#f0a500', ping: '—' },
    ];
    return (
        <div style={mockupWrap}>
            <MockupTopBar title="VPN Manager" />
            <div style={{ padding: '10px 14px' }}>
                {/* Zero-trust badge */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '5px 8px', borderRadius: '5px', marginBottom: '10px',
                    background: 'rgba(54,226,123,0.07)', border: '1px solid rgba(54,226,123,0.2)',
                }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#36E27B', boxShadow: '0 0 6px #36E27B', flexShrink: 0 }} />
                    <div style={{ ...fakeText, width: 90, opacity: 0.6, height: 6 }} />
                    <div style={{ marginLeft: 'auto', color: '#36E27B', fontSize: '8px', fontWeight: 700 }}>ZERO-TRUST</div>
                </div>
                {/* Tunnel list */}
                {tunnels.map((t, i) => (
                    <div key={i} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '7px 8px', borderRadius: '5px', marginBottom: '5px',
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${t.color}20`,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                            <div style={{ ...fakeText, width: 90, opacity: 0.55, height: 6 }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ color: '#555', fontSize: '7px' }}>{t.ping}</div>
                            <div style={{
                                fontSize: '7px', fontWeight: 700, color: t.color,
                                background: `${t.color}15`, borderRadius: '3px',
                                padding: '2px 5px',
                            }}>{t.status}</div>
                        </div>
                    </div>
                ))}
                {/* Split tunnel toggle */}
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ ...fakeText, width: 80, opacity: 0.35, height: 6 }} />
                    <div style={{ width: 28, height: 14, borderRadius: '99px', background: '#36E27B', display: 'flex', alignItems: 'center', paddingLeft: 2 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff' }} />
                    </div>
                </div>
            </div>
        </div>
    );
}

/* Step 3 — Network scan / threat monitoring screen */
function MockupScan() {
    return (
        <div style={mockupWrap}>
            <MockupTopBar title="Network Scan" />
            <div style={{ padding: '10px 14px' }}>
                {/* Scan progress */}
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <div style={{ ...fakeText, width: 80, opacity: 0.5, height: 7 }} />
                        <div style={{ color: '#36E27B', fontSize: '9px', fontWeight: 700 }}>87%</div>
                    </div>
                    <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px' }}>
                        <div style={{ width: '87%', height: '100%', background: 'linear-gradient(90deg,#36E27B,#5ff0a0)', borderRadius: '99px' }} />
                    </div>
                </div>
                {/* Threat cards */}
                {[
                    { label: 'Open port 8080 detected', sev: 'HIGH', color: '#ff4444' },
                    { label: 'Suspicious login attempt', sev: 'MED', color: '#f0a500' },
                    { label: '3 devices scanned clean', sev: 'OK', color: '#36E27B' },
                ].map((t, i) => (
                    <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '7px 8px', borderRadius: '5px', marginBottom: '5px',
                        background: `${t.color}0d`,
                        border: `1px solid ${t.color}25`,
                    }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                        <div style={{ ...fakeText, width: 110, opacity: 0.6, height: 7 }} />
                        <div style={{ marginLeft: 'auto', fontSize: '8px', fontWeight: 700, color: t.color }}>{t.sev}</div>
                    </div>
                ))}
                {/* Live ping line */}
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#36E27B', boxShadow: '0 0 6px #36E27B' }} />
                    <div style={{ ...fakeText, width: 90, opacity: 0.4, height: 6 }} />
                    <div style={{ marginLeft: 'auto', color: '#36E27B', fontSize: '9px', fontWeight: 700 }}>LIVE</div>
                </div>
            </div>
        </div>
    );
}

/* Step 4 — Reports / export screen */
function MockupReports() {
    const bars = [70, 45, 90, 55, 80, 35, 60];
    return (
        <div style={mockupWrap}>
            <MockupTopBar title="Security Report" />
            <div style={{ padding: '10px 14px' }}>
                {/* Summary row */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                    {[{ n: '247', l: 'Blocked', c: '#36E27B' }, { n: '3', l: 'Threats', c: '#ff4444' }, { n: '12', l: 'Devices', c: '#5b8fff' }].map((s, i) => (
                        <div key={i} style={{
                            flex: 1, padding: '6px', borderRadius: '5px',
                            background: `${s.c}10`, border: `1px solid ${s.c}25`, textAlign: 'center',
                        }}>
                            <div style={{ color: s.c, fontSize: '13px', fontWeight: 800 }}>{s.n}</div>
                            <div style={{ ...fakeText, width: '80%', margin: '3px auto 0', opacity: 0.4, height: 6 }} />
                        </div>
                    ))}
                </div>
                {/* Mini bar chart */}
                <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '40px', marginBottom: '10px' }}>
                    {bars.map((h, i) => (
                        <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '3px 3px 0 0', background: i === 2 ? '#36E27B' : 'rgba(54,226,123,0.25)' }} />
                    ))}
                </div>
                {/* Export buttons */}
                <div style={{ display: 'flex', gap: '6px' }}>
                    {['PDF Report', 'Export CSV'].map((b, i) => (
                        <div key={i} style={{
                            flex: 1, height: '22px', borderRadius: '4px',
                            background: i === 0 ? '#36E27B' : 'rgba(255,255,255,0.05)',
                            border: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <div style={{ ...fakeText, width: 55, background: i === 0 ? '#000' : undefined, opacity: i === 0 ? 0.8 : 0.4, height: 7 }} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* Shared mockup styles */
const mockupWrap = {
    width: '100%',
    height: '220px',
    background: '#111',
    border: '1px solid rgba(54,226,123,0.18)',
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
    fontFamily: 'monospace',
};
const fakeText = {
    display: 'inline-block', height: 8, borderRadius: '99px',
    background: 'rgba(255,255,255,0.25)',
};
const greenCircle = {
    width: '26px', height: '26px',
    borderRadius: '50%', background: '#36E27B', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
};

function MockupTopBar({ title }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
            {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
            ))}
            <div style={{ marginLeft: '8px', color: '#aaa', fontSize: '10px', fontWeight: 600, letterSpacing: '0.3px' }}>
                NeoSec — {title}
            </div>
            <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#36E27B', boxShadow: '0 0 6px #36E27B' }} />
        </div>
    );
}


const MOCKUPS = [MockupSignup, MockupFirewall, MockupVPN, MockupScan, MockupReports];

function TutorialStep({ number, Mockup, title, description, delay = 0 }) {
    const [ref, inView] = useInView();
    return (
        <div
            ref={ref}
            style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(36px)',
                transition: `opacity 0.55s ease ${delay}s, transform 0.55s ease ${delay}s`,
                flex: '1 1 200px',
                minWidth: 0,
                maxWidth: '240px',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Mini UI mockup — grows to fill */}
            <div style={{ flex: 1 }}>
                <Mockup />
            </div>

            {/* Step badge + text */}
            <div style={{ marginTop: '18px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    border: '2px solid #36E27B',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#36E27B', fontSize: '12px', fontWeight: '800',
                    flexShrink: 0, boxShadow: '0 0 10px rgba(54,226,123,0.25)',
                }}>
                    {number}
                </div>
                <div>
                    <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: '700', marginBottom: '6px', lineHeight: 1.3 }}>
                        {title}
                    </h3>
                    <p style={{ color: '#777', fontSize: '12px', lineHeight: 1.7, margin: 0 }}>
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
}

/* ─── Feature card ─── */
function FeatureCard({ icon, title, description, accentColor = '#36E27B', delay = 0 }) {
    const [ref, inView] = useInView();
    const [hovered, setHovered] = useState(false);
    return (
        <div
            ref={ref}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(24px)',
                transition: `opacity 0.45s ease ${delay}s, transform 0.45s ease ${delay}s, background 0.3s, border-color 0.3s, box-shadow 0.3s`,
                background: hovered
                    ? `linear-gradient(160deg, rgba(22,26,22,0.95) 0%, rgba(14,20,14,0.95) 100%)`
                    : 'rgba(15,15,15,0.9)',
                border: `1px solid ${hovered ? accentColor + '50' : 'rgba(255,255,255,0.07)'}`,
                borderTop: `1px solid ${hovered ? accentColor + '70' : accentColor + '22'}`,
                borderRadius: '14px',
                padding: '26px 22px 24px',
                flex: '1 1 220px',
                cursor: 'default',
                boxShadow: hovered ? `0 0 32px ${accentColor}12, 0 4px 24px rgba(0,0,0,0.4)` : '0 2px 12px rgba(0,0,0,0.3)',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '180px',
            }}
        >
            {/* Subtle top gradient line */}
            <div style={{
                position: 'absolute', top: 0, left: '16px', right: '16px', height: '1px',
                background: `linear-gradient(90deg, transparent, ${accentColor}44, transparent)`,
                opacity: hovered ? 1 : 0.4,
                transition: 'opacity 0.3s',
            }} />
            {/* Icon circle */}
            <div style={{
                width: '44px', height: '44px', borderRadius: '10px',
                background: `${accentColor}15`,
                border: `1px solid ${accentColor}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', marginBottom: '16px',
                boxShadow: hovered ? `0 0 16px ${accentColor}20` : 'none',
                transition: 'box-shadow 0.3s',
            }}>{icon}</div>
            <h4 style={{ color: '#f0f0f0', fontSize: '15px', fontWeight: '700', marginBottom: '10px', letterSpacing: '0.1px' }}>{title}</h4>
            <p style={{ color: '#555', fontSize: '13px', lineHeight: 1.75, margin: 0, flex: 1 }}>{description}</p>
        </div>
    );
}

const HomePage = ({ onGetStarted, user }) => {
    const [navSolid, setNavSolid] = useState(false);
    const [currentPlan, setCurrentPlan] = useState(null);
    const [processingTier, setProcessingTier] = useState(null);

    const apiBaseUrl = (() => {
        if (API_BASE && API_BASE.trim()) {
            let url = API_BASE.trim();
            if (!url.endsWith('/api')) url = url.endsWith('/') ? `${url}api` : `${url}/api`;
            return url;
        }
        if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
            return 'https://neosec.onrender.com/api';
        }
        return 'http://localhost:5000/api';
    })();

    // Fetch subscription on mount if user is logged in
    useEffect(() => {
        const fetchSub = async () => {
            if (!user) return;
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const res = await fetch(`${apiBaseUrl}/subscription/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setCurrentPlan(data.subscription?.tier || 'free');
                }
            } catch (err) {
                console.error('Failed to fetch subscription on homepage:', err);
            }
        };
        fetchSub();
    }, [user, apiBaseUrl]);

    // Handle checkout 
    const handleCheckout = async (tier) => {
        if (!user) {
            onGetStarted();
            return;
        }
        setProcessingTier(tier);
        try {
            const token = localStorage.getItem('token');
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
            if (data.url) window.location.href = data.url;
        } catch (err) {
            alert(err.message);
        } finally {
            setProcessingTier(null);
        }
    };

    useEffect(() => {
        const onScroll = () => setNavSolid(window.scrollY > 40);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const steps = [
        {
            title: 'Create your secure account',
            description: 'Sign up in under a minute. Multi-factor authentication and strong encryption keep your account protected from day one.',
        },
        {
            title: 'Manage your firewall rules',
            description: 'Add, remove, or modify firewall rules remotely. Block ports, restrict geo-regions, and apply custom policies using an intuitive visual editor.',
        },
        {
            title: 'Control VPN connections',
            description: 'Connect or disconnect OpenVPN and WireGuard tunnels remotely. Configure split tunneling and enable kill-switch protection from a single dashboard.',
        },
        {
            title: 'Scan URLs and monitor threats',
            description: 'Check URLs for malicious content using the VirusTotal API. Run vulnerability scans and get real-time threat alerts to stay ahead of attacks.',
        },

    ];

    const features = [
        { icon: '🧱', title: 'Advanced Firewall', accentColor: '#ff6b35', description: 'Layer-7 rules, geo-blocking, and rate-limiting that deploy instantly without restarts.' },
        { icon: '🌐', title: 'VPN Management', accentColor: '#5b8fff', description: 'Zero-trust tunnels, split tunneling, and kill-switch protection managed from one panel.' },
        { icon: '🔎', title: 'Network Scanning', accentColor: '#a855f7', description: 'Detect open ports, CVEs, and misconfigurations across every device in your estate.' },
        { icon: '👥', title: 'Groups & RBAC', accentColor: '#36E27B', description: 'Create teams, assign roles, and enforce security policies at the group level.' },
        { icon: '📣', title: 'Real-time Alerts', accentColor: '#f0a500', description: 'Instant notifications for suspicious logins, policy violations, and anomalies.' },
        { icon: '📝', title: 'Audit Trail', accentColor: '#36E27B', description: 'Immutable, tamper-evident logs for every action — ready for compliance exports.' },
    ];

    const stats = [
        { value: 99, suffix: '.9%', label: 'Uptime SLA' },
        { value: 250, suffix: 'K+', label: 'Threats Blocked' },
        { value: 4800, suffix: '+', label: 'Active Users' },
        { value: 128, suffix: '-bit', label: 'Encryption' },
    ];

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', color: '#fff', overflowX: 'hidden' }}>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
                * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
                ::-webkit-scrollbar { width: 5px; }
                ::-webkit-scrollbar-track { background: #0a0a0a; }
                ::-webkit-scrollbar-thumb { background: #36E27B; border-radius: 99px; }

                @keyframes fadeUp   { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:none; } }
                @keyframes fadeDown { from { opacity:0; transform:translateY(-16px); } to { opacity:1; transform:none; } }
                @keyframes float    { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
                @keyframes pulse-ring {
                    0%   { box-shadow: 0 0 0 0 rgba(54,226,123,.4); }
                    70%  { box-shadow: 0 0 0 10px rgba(54,226,123,0); }
                    100% { box-shadow: 0 0 0 0 rgba(54,226,123,0); }
                }
                @keyframes shimmer {
                    0%   { background-position: -200% center; }
                    100% { background-position:  200% center; }
                }
                .cta-primary {
                    animation: pulse-ring 2.5s infinite;
                    transition: transform .2s, box-shadow .2s, background .2s;
                }
                .cta-primary:hover {
                    transform: translateY(-2px) scale(1.02) !important;
                    box-shadow: 0 10px 36px rgba(54,226,123,.5) !important;
                    animation: none;
                    background-color: #2ec96d !important;
                }
                .cta-ghost:hover {
                    background: rgba(54,226,123,.06) !important;
                    border-color: rgba(54,226,123,.35) !important;
                    color: #36E27B !important;
                }
                .gradient-text {
                    background: linear-gradient(135deg,#36E27B 0%,#7fffc4 50%,#36E27B 100%);
                    background-size: 200% auto;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    animation: shimmer 3s linear infinite;
                }
                .nav-link:hover { color: #36E27B !important; }
                .trust-name:hover { color: #36E27B !important; }
            `}</style>

            {/* ── NAV ── */}
            <nav style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
                padding: '0 5%', height: '60px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: navSolid ? 'rgba(10,10,10,.94)' : 'transparent',
                backdropFilter: navSolid ? 'blur(14px)' : 'none',
                borderBottom: navSolid ? '1px solid rgba(54,226,123,.1)' : 'none',
                transition: 'all .4s',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <div style={{ width: 32, height: 32, background: '#36E27B', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.5">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </div>
                    <span style={{ color: '#fff', fontWeight: '800', fontSize: '18px', letterSpacing: '.8px' }}>NeoSec</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
                    {[['Features', '#features'], ['How It Works', '#how-it-works'], ['Pricing', '#pricing']].map(([l, h]) => (
                        <a key={l} href={h} className="nav-link" style={{ color: '#999', textDecoration: 'none', fontSize: '13px', fontWeight: '500', transition: 'color .2s' }}>{l}</a>
                    ))}
                    <button onClick={onGetStarted} className="cta-primary" style={{
                        padding: '7px 18px', background: '#36E27B', color: '#000',
                        border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                    }}>
                        {user ? 'Go to Dashboard' : 'Sign In'}
                    </button>
                </div>
            </nav>

            {/* ── HERO ── */}
            <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '110px 5% 80px', textAlign: 'center' }}>
                <AnimatedBackground theme="dark" />

                {/* radial glow */}
                <div style={{ position: 'absolute', top: '38%', left: '50%', transform: 'translate(-50%,-50%)', width: 560, height: 560, background: 'radial-gradient(circle,rgba(54,226,123,.07) 0%,transparent 70%)', pointerEvents: 'none' }} />

                <div style={{ position: 'relative', zIndex: 1, maxWidth: '780px' }}>
                    {/* Badge */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(54,226,123,.1)', border: '1px solid rgba(54,226,123,.28)', borderRadius: '99px', padding: '5px 14px', marginBottom: '26px', animation: 'fadeDown .55s ease both' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#36E27B' }} />
                        <span style={{ color: '#36E27B', fontSize: '12px', fontWeight: '700' }}>Enterprise-grade cybersecurity — built for teams</span>
                    </div>

                    <h1 style={{ fontSize: 'clamp(36px,6vw,68px)', fontWeight: '900', lineHeight: 1.08, marginBottom: '22px', animation: 'fadeUp .6s ease .08s both' }}>
                        Protect Your Network<br />
                        <span className="gradient-text">With Total Confidence</span>
                    </h1>

                    <p style={{ color: '#888', fontSize: 'clamp(14px,2vw,17px)', lineHeight: 1.85, maxWidth: '560px', margin: '0 auto 38px', animation: 'fadeUp .6s ease .16s both' }}>
                        One dashboard for firewall rules, VPN tunnels, real-time threat scanning, audit logs, and complete team management. Security made simple.
                    </p>

                    <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', animation: 'fadeUp .6s ease .24s both' }}>
                        <button onClick={onGetStarted} className="cta-primary" style={{ padding: '14px 34px', background: '#36E27B', color: '#000', border: 'none', borderRadius: '7px', fontWeight: '800', fontSize: '15px', cursor: 'pointer', letterSpacing: '.2px' }}>
                            {user ? 'Go to Dashboard →' : 'Get Started Free →'}
                        </button>
                        <a href="#how-it-works" className="cta-ghost" style={{ padding: '14px 28px', color: '#ccc', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '7px', fontWeight: '600', fontSize: '14px', textDecoration: 'none', display: 'inline-block', transition: 'all .25s' }}>
                            See How It Works
                        </a>
                    </div>

                    {/* Floating shield */}
                    <div style={{ marginTop: '56px', display: 'inline-flex', animation: 'float 4s ease-in-out infinite, fadeUp .7s ease .3s both' }}>
                        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(54,226,123,.1)', border: '2px solid rgba(54,226,123,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 36px rgba(54,226,123,.18)' }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#36E27B" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── STATS ── */}
            <section style={{ background: 'rgba(16,16,16,.9)', borderTop: '1px solid rgba(255,255,255,.04)', borderBottom: '1px solid rgba(255,255,255,.04)', padding: '38px 5%' }}>
                <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around', gap: '8px' }}>
                    {stats.map((s, i) => (
                        <div key={i} style={{ textAlign: 'center', flex: '1 1 150px' }}>
                            <div style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: '900', color: '#36E27B' }}>
                                <AnimatedCounter target={s.value} suffix={s.suffix} />
                            </div>
                            <div style={{ color: '#555', fontSize: '12px', marginTop: '3px', letterSpacing: '.5px', textTransform: 'uppercase' }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section id="how-it-works" style={{ padding: 'clamp(60px,10vw,110px) 5%' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                        <p style={{ color: '#36E27B', fontSize: '12px', fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>How It Works</p>
                        <h2 style={{ fontSize: 'clamp(26px,4vw,44px)', fontWeight: '800', color: '#fff', lineHeight: 1.2, marginBottom: '14px' }}>
                            Get Fully Secured in 4 Steps
                        </h2>
                        <div style={{ width: 50, height: 3, background: 'linear-gradient(90deg,#36E27B,transparent)', borderRadius: '99px', margin: '0 auto' }} />
                        <p style={{ color: '#555', marginTop: '16px', fontSize: '14px', maxWidth: '440px', margin: '16px auto 0', lineHeight: 1.8 }}>
                            From account creation to full threat coverage — NeoSec is designed to get you protected fast.
                        </p>
                    </div>

                    {/* Step cards */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center', alignItems: 'stretch' }}>
                        {steps.map((s, i) => (
                            <TutorialStep
                                key={i}
                                number={i + 1}
                                Mockup={MOCKUPS[i]}
                                title={s.title}
                                description={s.description}
                                delay={i * 0.08}
                            />
                        ))}
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '50px' }}>
                        <button onClick={onGetStarted} className="cta-ghost" style={{ padding: '13px 30px', color: '#36E27B', background: 'transparent', border: '1.5px solid #36E27B', borderRadius: '7px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', transition: 'all .25s' }}>
                            {user ? 'Go to Dashboard →' : 'Start Your Free Trial →'}
                        </button>
                    </div>
                </div>
            </section>

            {/* ── FEATURES ── */}
            <section id="features" style={{ padding: 'clamp(60px,10vw,110px) 5%', background: 'linear-gradient(180deg,#0a0a0a 0%,#0d1a10 50%,#0a0a0a 100%)' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '56px' }}>
                        <p style={{ color: '#36E27B', fontSize: '12px', fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>Platform Features</p>
                        <h2 style={{ fontSize: 'clamp(26px,4vw,44px)', fontWeight: '800', color: '#fff' }}>Everything You Need to Stay Secure</h2>
                        <div style={{ width: 50, height: 3, background: 'linear-gradient(90deg,#36E27B,transparent)', borderRadius: '99px', margin: '14px auto 0' }} />
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', alignItems: 'stretch' }}>
                        {features.map((f, i) => <FeatureCard key={i} delay={i * 0.07} {...f} />)}
                    </div>
                </div>
            </section>

            {/* ── PRICING ── */}
            <section id="pricing" style={{ padding: 'clamp(60px,10vw,110px) 5%', background: '#0a0a0a', position: 'relative' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '56px' }}>
                        <p style={{ color: '#36E27B', fontSize: '12px', fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>Pricing</p>
                        <h2 style={{ fontSize: 'clamp(26px,4vw,44px)', fontWeight: '800', color: '#fff' }}>Simple, Transparent Pricing</h2>
                        <div style={{ width: 50, height: 3, background: 'linear-gradient(90deg,#36E27B,transparent)', borderRadius: '99px', margin: '14px auto 0' }} />
                        <p style={{ color: '#555', marginTop: '16px', fontSize: '14px', maxWidth: '440px', margin: '16px auto 0', lineHeight: 1.8 }}>
                            Choose the plan that fits your organization's security needs. All plans include 24/7 support.
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center', alignItems: 'stretch' }}>
                        {/* Free Tier */}
                        <div style={{
                            flex: '1 1 300px', background: 'rgba(15,15,15,0.9)', border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: '14px', padding: '36px 30px', display: 'flex', flexDirection: 'column', position: 'relative'
                        }}>
                            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '12px' }}>Starter</h3>
                            <div style={{ fontSize: '36px', fontWeight: '900', color: '#fff', marginBottom: '8px' }}>$0<span style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}> /mo</span></div>
                            <p style={{ color: '#888', fontSize: '13px', lineHeight: 1.6, marginBottom: '24px' }}>Essential security for individuals and small teams.</p>

                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', flex: 1 }}>
                                {['1 Admin User', 'Basic Firewall Rules', 'Community Support', '7-day Audit Logs'].map((f, i) => (
                                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ccc', fontSize: '13px', marginBottom: '12px' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#36E27B" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={!user ? onGetStarted : undefined}
                                disabled={user}
                                style={{ width: '100%', padding: '12px', background: user && currentPlan === 'free' ? 'rgba(255,255,255,0.05)' : 'transparent', color: user && currentPlan === 'free' ? '#888' : '#fff', border: user && currentPlan === 'free' ? 'none' : '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: user ? 'default' : 'pointer', transition: 'all .2s' }}>
                                {user ? (currentPlan === 'free' ? 'Current Plan' : 'Free Tier Included') : 'Get Started'}
                            </button>
                        </div>

                        {/* Pro Tier (Highlighted - previously Professional) */}
                        <div style={{
                            flex: '1 1 300px', background: 'linear-gradient(160deg, rgba(22,26,22,0.95) 0%, rgba(14,20,14,0.95) 100%)',
                            border: '1px solid rgba(54,226,123,0.3)', borderRadius: '14px', padding: '36px 30px',
                            display: 'flex', flexDirection: 'column', position: 'relative', transform: 'scale(1.02)', boxShadow: '0 12px 40px rgba(54,226,123,0.1)'
                        }}>
                            <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#36E27B', color: '#000', fontSize: '11px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 12px', borderRadius: '99px' }}>Most Popular</div>
                            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#36E27B', marginBottom: '12px' }}>Professional</h3>
                            <div style={{ fontSize: '36px', fontWeight: '900', color: '#fff', marginBottom: '8px' }}>$29.99<span style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}> /mo</span></div>
                            <p style={{ color: '#888', fontSize: '13px', lineHeight: 1.6, marginBottom: '24px' }}>Advanced features for growing organizations.</p>

                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', flex: 1 }}>
                                {['Up to 20 profiles', 'Advanced firewall rules', 'Priority support', '5 groups & 50 members'].map((f, i) => (
                                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', fontSize: '13px', marginBottom: '12px' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#36E27B" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => handleCheckout('pro')}
                                disabled={currentPlan === 'pro' || processingTier === 'pro'}
                                style={{ width: '100%', padding: '12px', background: currentPlan === 'pro' ? 'rgba(54,226,123,0.1)' : '#36E27B', color: currentPlan === 'pro' ? '#36E27B' : '#000', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '14px', cursor: (currentPlan === 'pro' || processingTier === 'pro') ? 'default' : 'pointer', transition: 'all .2s' }}>
                                {currentPlan === 'pro' ? 'Current Plan' : processingTier === 'pro' ? 'Processing...' : (user ? 'Upgrade to Pro' : 'Start Free Trial')}
                            </button>
                        </div>

                        {/* Enterprise Tier -> NOW Enterprise/Pro mix -> Wait, let's include Pro and Enterprise to match Subscription.js! */}
                        {/* We will rename the 3rd to Pro and add a 4th for Enterprise, or just replace the 3rd with Enterprise. The dashboard has Basic, Pro, Enterprise. So 3 paid tiers. Let's make 4 cards or merge the 3 cards. The user wants to "pick from backend", there are 3 tiers total: basic, pro, enterprise. Let's show all 3. */}

                        {/* Enterprise Tier - previously Custom */}
                        <div style={{
                            flex: '1 1 300px', background: 'rgba(15,15,15,0.9)', border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: '14px', padding: '36px 30px', display: 'flex', flexDirection: 'column', position: 'relative'
                        }}>
                            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '12px' }}>Enterprise</h3>
                            <div style={{ fontSize: '36px', fontWeight: '900', color: '#fff', marginBottom: '8px' }}>$49.99<span style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}> /mo</span></div>
                            <p style={{ color: '#888', fontSize: '13px', lineHeight: 1.6, marginBottom: '24px' }}>Advanced features for growing organizations.</p>

                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', flex: 1 }}>
                                {['Unlimited Profiles', 'Advanced security policies', '24/7 premium support', 'Unlimited members'].map((f, i) => (
                                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ccc', fontSize: '13px', marginBottom: '12px' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#36E27B" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => handleCheckout('enterprise')}
                                disabled={currentPlan === 'enterprise' || processingTier === 'enterprise'}
                                style={{ width: '100%', padding: '12px', background: currentPlan === 'enterprise' ? 'rgba(255,255,255,0.05)' : 'transparent', color: currentPlan === 'enterprise' ? '#666' : '#fff', border: currentPlan === 'enterprise' ? 'none' : '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: (currentPlan === 'enterprise' || processingTier === 'enterprise') ? 'default' : 'pointer', transition: 'all .2s' }}>
                                {currentPlan === 'enterprise' ? 'Current Plan' : processingTier === 'enterprise' ? 'Processing...' : (user ? 'Upgrade to Enterprise' : 'Start Free Trial')}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── TRUST BANNER ── */}
            <section style={{ padding: 'clamp(36px,6vw,60px) 5%', background: 'rgba(14,14,14,.7)', borderTop: '1px solid rgba(255,255,255,.04)', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                <div style={{ maxWidth: '820px', margin: '0 auto', textAlign: 'center' }}>
                    <p style={{ color: '#444', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '26px' }}>Trusted by security teams at</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '36px', justifyContent: 'center' }}>
                        {['FinTech Corp', 'DataShield Inc', 'CyberVault', 'SecureOps', 'NetGuard'].map(n => (
                            <span key={n} className="trust-name" style={{ color: '#333', fontSize: '15px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'default', transition: 'color .25s' }}>{n}</span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section id="pricing" style={{ padding: 'clamp(80px,12vw,140px) 5%', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 360, background: 'radial-gradient(ellipse,rgba(54,226,123,.07) 0%,transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ position: 'relative', zIndex: 1, maxWidth: '620px', margin: '0 auto', textAlign: 'center' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(54,226,123,.1)', border: '2px solid rgba(54,226,123,.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 0 28px rgba(54,226,123,.14)' }}>
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#36E27B" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                    </div>
                    <h2 style={{ fontSize: 'clamp(24px,4vw,42px)', fontWeight: '900', color: '#fff', marginBottom: '16px', lineHeight: 1.2 }}>
                        Ready to Secure Your Network?
                    </h2>
                    <p style={{ color: '#666', fontSize: '15px', lineHeight: 1.85, marginBottom: '36px' }}>
                        Join thousands of security professionals who rely on NeoSec. Start for free — no card needed.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={onGetStarted} className="cta-primary" style={{ padding: '15px 38px', background: '#36E27B', color: '#000', border: 'none', borderRadius: '7px', fontWeight: '800', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 22px rgba(54,226,123,.32)' }}>
                            {user ? 'Go to Dashboard' : 'Create Free Account'}
                        </button>
                        {!user && (
                            <button onClick={onGetStarted} className="cta-ghost" style={{ padding: '15px 32px', color: '#fff', background: 'transparent', border: '1.5px solid rgba(255,255,255,.14)', borderRadius: '7px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', transition: 'all .25s' }}>
                                Sign In →
                            </button>
                        )}
                    </div>
                    <p style={{ color: '#333', fontSize: '12px', marginTop: '20px' }}>✓ No credit card &nbsp;·&nbsp; ✓ Free forever tier &nbsp;·&nbsp; ✓ Cancel anytime</p>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer style={{ padding: '28px 5%', borderTop: '1px solid rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 26, height: 26, background: '#36E27B', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                    </div>
                    <span style={{ color: '#fff', fontWeight: '700', fontSize: '15px' }}>NeoSec</span>
                    <span style={{ color: '#2a2a2a', fontSize: '12px', marginLeft: '10px' }}>© {new Date().getFullYear()}</span>
                </div>
                <div style={{ display: 'flex', gap: '20px' }}>
                    {['Privacy', 'Terms', 'Support'].map(l => (
                        <span key={l} className="nav-link" style={{ color: '#333', fontSize: '12px', cursor: 'pointer', transition: 'color .2s' }}>{l}</span>
                    ))}
                </div>
            </footer>
        </div>
    );
};

export default HomePage;
