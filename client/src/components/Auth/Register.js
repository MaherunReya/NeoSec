import React, { useState } from 'react';
import { authAPI } from '../../services/api';
import AnimatedBackground from './AnimatedBackground';

const Register = ({ onSwitchToLogin }) => {
    const [step, setStep] = useState(1); // 1 = Details, 2 = OTP
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        otp: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
        setSuccess('');
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        if (!/[A-Za-z]/.test(formData.password)) {
            setError('Password must contain at least one letter');
            return;
        }

        if (!/[0-9]/.test(formData.password)) {
            setError('Password must contain at least one number');
            return;
        }

        setLoading(true);

        try {
            const response = await authAPI.sendOtp(formData.email);
            if (response.success) {
                setSuccess('Verification code sent to your email!');
                setStep(2);
            } else {
                setError(response.message || 'Failed to send verification code.');
            }
        } catch (err) {
            let errorMessage = 'Failed to send verification code.';
            if (err.response?.data) {
                if (err.response.data.errors && Array.isArray(err.response.data.errors)) {
                    errorMessage = err.response.data.errors.map(e => e.msg).join(', ');
                } else if (err.response.data.message) {
                    errorMessage = err.response.data.message;
                }
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (formData.otp.length !== 6) {
            setError('OTP must be exactly 6 digits');
            return;
        }

        setLoading(true);

        try {
            const response = await authAPI.verifyOtpAndRegister(
                formData.email,
                formData.password,
                formData.otp
            );

            if (response.success) {
                setSuccess(response.message || 'Registration successful! You can now login.');
                // Optionally clear form and redirect or wait for user to click "Login here"
                setFormData({
                    email: '',
                    password: '',
                    confirmPassword: '',
                    otp: ''
                });
                // Switch back to login page after 2 seconds
                setTimeout(() => {
                    onSwitchToLogin();
                }, 2000);
            } else {
                setError(response.message || 'Registration failed. Please try again.');
            }
        } catch (err) {
            let errorMessage = 'Registration failed. Please try again.';
            if (err.response?.data) {
                if (err.response.data.errors && Array.isArray(err.response.data.errors)) {
                    errorMessage = err.response.data.errors.map(e => e.msg).join(', ');
                } else if (err.response.data.message) {
                    errorMessage = err.response.data.message;
                }
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#0a0a0a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Header/Logo mapping */}
            <div style={{ position: 'absolute', top: 30, left: 40, display: 'flex', alignItems: 'center', gap: '9px', zIndex: 10 }}>
                <div style={{ width: 32, height: 32, background: '#36E27B', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.5">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                </div>
                <span onClick={() => window.location.href = '/?home=true'} style={{ color: '#fff', fontWeight: '800', fontSize: '18px', letterSpacing: '.8px', cursor: 'pointer' }}>NeoSec</span>
            </div>

            {/* Animated Background */}
            <AnimatedBackground theme="dark" />

            <div style={{
                width: '100%',
                maxWidth: '380px',
                background: 'rgba(28, 28, 28, 0.6)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '40px 35px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Loading Bar */}
                {loading && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '3px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            height: '100%',
                            background: 'linear-gradient(90deg, transparent, #36E27B, transparent)',
                            animation: 'loading 1.5s infinite',
                            width: '50%'
                        }} />
                    </div>
                )}
                <style>{`
                    @keyframes loading {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(300%); }
                    }
                `}</style>
                {/* Shield Icon */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: '24px'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        margin: '0 auto',
                        backgroundColor: '#1E8C4A',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.5">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </div>
                </div>

                {/* Title */}
                <h2 style={{
                    color: '#fff',
                    textAlign: 'center',
                    fontSize: '28px',
                    fontWeight: '600',
                    margin: '0 0 8px 0',
                    letterSpacing: '1px'
                }}>REGISTER</h2>

                <p style={{
                    color: '#888',
                    textAlign: 'center',
                    fontSize: '14px',
                    margin: '0 0 32px 0'
                }}>
                    {step === 1 ? 'Join NeoSec today' : 'Enter verification code'}
                </p>

                {error && (
                    <div style={{
                        padding: '12px 15px',
                        backgroundColor: 'rgba(42, 21, 21, 0.8)',
                        border: '1px solid #ff4444',
                        borderRadius: '6px',
                        color: '#ff6666',
                        marginBottom: '20px',
                        fontSize: '13px',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                {success && (
                    <div style={{
                        padding: '12px 15px',
                        backgroundColor: '#1a2a1f',
                        border: '1px solid #1E8C4A',
                        borderRadius: '6px',
                        color: '#1E8C4A',
                        marginBottom: '20px',
                        fontSize: '13px',
                        textAlign: 'center'
                    }}>
                        {success}
                    </div>
                )}

                {step === 1 ? (
                    <form onSubmit={handleSendOtp}>
                        {/* Email Field */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                color: '#bbb',
                                marginBottom: '8px',
                                fontSize: '13px',
                                fontWeight: '400'
                            }}>
                                Email
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="Enter your email"
                                autoComplete="email"
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    backgroundColor: 'rgba(42, 42, 42, 0.6)',
                                    border: '1px solid rgba(58, 58, 58, 0.8)',
                                    borderRadius: '6px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#36E27B'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(58, 58, 58, 0.8)'}
                            />
                        </div>

                        {/* Password Field */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                color: '#bbb',
                                marginBottom: '8px',
                                fontSize: '13px',
                                fontWeight: '400'
                            }}>
                                Password
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="Enter your password (min 6 chars, letter + number)"
                                minLength={6}
                                autoComplete="new-password"
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    backgroundColor: 'rgba(42, 42, 42, 0.6)',
                                    border: '1px solid rgba(58, 58, 58, 0.8)',
                                    borderRadius: '6px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#36E27B'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(58, 58, 58, 0.8)'}
                            />
                        </div>

                        {/* Confirm Password Field */}
                        <div style={{ marginBottom: '28px' }}>
                            <label style={{
                                display: 'block',
                                color: '#bbb',
                                marginBottom: '8px',
                                fontSize: '13px',
                                fontWeight: '400'
                            }}>
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                placeholder="Confirm your password"
                                minLength={6}
                                autoComplete="new-password"
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    backgroundColor: 'rgba(42, 42, 42, 0.6)',
                                    border: '1px solid rgba(58, 58, 58, 0.8)',
                                    borderRadius: '6px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#36E27B'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(58, 58, 58, 0.8)'}
                            />
                        </div>

                        {/* Register Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '14px',
                                backgroundColor: loading ? '#2a5f3d' : '#1E8C4A',
                                color: '#000',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: '600',
                                fontSize: '15px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                opacity: loading ? 0.7 : 1,
                                letterSpacing: '0.5px'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#1E8C4A'}
                            onBlur={(e) => e.target.style.borderColor = '#3a3a3a'}
                            onMouseEnter={(e) => {
                                if (!loading) e.target.style.backgroundColor = '#2ec96d';
                            }}
                            onMouseLeave={(e) => {
                                if (!loading) e.target.style.backgroundColor = '#1E8C4A';
                            }}
                        >
                            {loading ? 'Sending Code...' : 'Register'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp}>
                        {/* OTP Field */}
                        <div style={{ marginBottom: '28px' }}>
                            <label style={{
                                display: 'block',
                                color: '#bbb',
                                marginBottom: '8px',
                                fontSize: '13px',
                                fontWeight: '400'
                            }}>
                                6-Digit Verification Code
                            </label>
                            <input
                                type="text"
                                name="otp"
                                value={formData.otp}
                                onChange={handleChange}
                                required
                                placeholder="e.g. 123456"
                                maxLength={6}
                                autoComplete="off"
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    backgroundColor: 'rgba(42, 42, 42, 0.6)',
                                    border: '1px solid rgba(58, 58, 58, 0.8)',
                                    borderRadius: '6px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                    boxSizing: 'border-box',
                                    textAlign: 'center',
                                    letterSpacing: '5px'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#36E27B'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(58, 58, 58, 0.8)'}
                            />
                        </div>

                        {/* Verify Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '14px',
                                backgroundColor: loading ? '#2a5f3d' : '#1E8C4A',
                                color: '#000',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: '600',
                                fontSize: '15px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                opacity: loading ? 0.7 : 1,
                                letterSpacing: '0.5px',
                                marginBottom: '16px'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#1E8C4A'}
                            onBlur={(e) => e.target.style.borderColor = '#3a3a3a'}
                            onMouseEnter={(e) => {
                                if (!loading) e.target.style.backgroundColor = '#2ec96d';
                            }}
                            onMouseLeave={(e) => {
                                if (!loading) e.target.style.backgroundColor = '#1E8C4A';
                            }}
                        >
                            {loading ? 'Verifying...' : 'Verify and Create Account'}
                        </button>

                        {/* Back Button */}
                        <button
                            type="button"
                            onClick={() => {
                                setStep(1);
                                setError('');
                                setSuccess('');
                            }}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '14px',
                                backgroundColor: 'transparent',
                                color: '#aaa',
                                border: '1px solid #444',
                                borderRadius: '6px',
                                fontWeight: '500',
                                fontSize: '14px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#1E8C4A'}
                            onBlur={(e) => e.target.style.borderColor = '#3a3a3a'}
                            onMouseEnter={(e) => {
                                if (!loading) e.target.style.backgroundColor = '#2a2a2a';
                                if (!loading) e.target.style.color = '#fff';
                            }}
                            onMouseLeave={(e) => {
                                if (!loading) e.target.style.backgroundColor = 'transparent';
                                if (!loading) e.target.style.color = '#aaa';
                            }}
                        >
                            Back to Email/Password
                        </button>
                    </form>
                )}

                {/* Login Link */}
                <p style={{
                    marginTop: '24px',
                    textAlign: 'center',
                    color: '#777',
                    fontSize: '13px'
                }}>
                    Already have an account?{' '}
                    <button
                        type="button"
                        onClick={onSwitchToLogin}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#1E8C4A',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '600',
                            padding: 0,
                            textDecoration: 'none'
                        }}
                        onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                    >
                        Login here
                    </button>
                </p>
            </div>
        </div>
    );
};

export default Register;
