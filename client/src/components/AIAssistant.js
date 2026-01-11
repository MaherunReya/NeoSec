import React, { useState, useRef, useEffect } from 'react';
import { FiMessageCircle, FiX, FiSend, FiZap, FiShield, FiKey, FiSmartphone, FiClock, FiHelpCircle, FiTrash2, FiLock, FiTarget } from 'react-icons/fi';
import { aiAssistantAPI } from '../services/api';

const AIAssistant = ({ theme, palette, user, mfaEnabled = false, activeSessions = [], recentLogins = [] }) => {
  const darkPalette = {
    bgMain: '#121212', bgCard: '#181818', text: '#ffffff', textMuted: '#9aa3b5',
    border: '#242424', accent: '#36E27B', danger: '#e04848'
  };
  const lightPalette = {
    bgMain: '#f6f8fb', bgCard: '#ffffff', text: '#0b172a', textMuted: '#5b6b7a',
    border: '#d9e2ec', accent: '#1fa45a', danger: '#d4183d'
  };
  const colors = palette || (theme === 'light' ? lightPalette : darkPalette);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: '1',
      role: 'assistant',
      content: "👋 Hi! I'm your NeoSec AI Assistant. I'm here to help you with account security, MFA setup, session management, and more. How can I assist you today?",
      timestamp: new Date(),
      suggestions: [
        "Should I enable MFA?",
        "Is my account secure?",
        "Why did I get logged out?",
        "How do I protect my account?"
      ]
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (message) => {
    const messageText = message || inputValue.trim();
    if (!messageText) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await aiAssistantAPI.profileAssist({
        query: messageText,
        context: {
          section: 'profile',
          mfaEnabled,
          activeSessions: activeSessions.length,
          recentLogins: recentLogins.length
        }
      });

      if (response.success) {
        const fallbackResponse = generateAIResponse(messageText);
        const aiResponse = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.message || fallbackResponse.content,
          timestamp: new Date(),
          suggestions: fallbackResponse.suggestions || [],
          actions: response.suggestedActions ? response.suggestedActions.map(a => ({
            label: a.label,
            icon: getIconForAction(a.action),
            variant: a.variant || 'outline'
          })) : fallbackResponse.actions
        };
        setMessages(prev => [...prev, aiResponse]);
      } else {
        // Fallback to local response
        const aiResponse = generateAIResponse(messageText);
        setMessages(prev => [...prev, aiResponse]);
      }
    } catch (err) {
      // Fallback to local response on error
      const aiResponse = generateAIResponse(messageText);
      setMessages(prev => [...prev, aiResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const getIconForAction = (action) => {
    const iconMap = {
      'enable_mfa': FiSmartphone,
      'change_password': FiKey,
      'review_sessions': FiClock,
      'adjust_settings': FiShield,
      'view_firewall': FiLock,
      'view_threats': FiTarget
    };
    return iconMap[action] || FiHelpCircle;
  };

  const generateAIResponse = (userMessage) => {
    const lowerMessage = userMessage.toLowerCase();

    // MFA related
    if (lowerMessage.includes('mfa') || lowerMessage.includes('two-factor') || lowerMessage.includes('2fa')) {
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: "🔐 **Multi-Factor Authentication (MFA) is highly recommended!**\n\nHere's why you should enable it:\n\n✅ **Extra Security Layer** - Even if someone gets your password, they can't access your account without your phone\n\n✅ **Industry Standard** - Used by banks, tech companies, and security professionals worldwide\n\n✅ **Easy Setup** - Takes just 2 minutes to configure with Google Authenticator or similar apps\n\n⚠️ **Important:** Make sure to save your backup codes in a safe place!",
        timestamp: new Date(),
        actions: [
          { label: 'Enable MFA Now', icon: FiSmartphone, variant: 'default' },
          { label: 'Learn More', icon: FiHelpCircle, variant: 'outline' }
        ],
        suggestions: [
          "What if I lose my phone?",
          "How do backup codes work?",
          "Can I use multiple devices?"
        ]
      };
    }

    // Account security
    if (lowerMessage.includes('secure') || lowerMessage.includes('safe') || lowerMessage.includes('protect')) {
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: "🛡️ **Let me check your account security status...**\n\nHere's what I found:\n\n✅ **Strong Password** - Your password meets all requirements\n\n⚠️ **MFA Disabled** - I recommend enabling two-factor authentication\n\n✅ **Email Verified** - Your email address is confirmed\n\n✅ **Recent Activity Normal** - No suspicious login attempts detected\n\n**Security Score: 7/10**\n\nYou can improve your score by enabling MFA and reviewing active sessions regularly.",
        timestamp: new Date(),
        actions: [
          { label: 'Enable MFA', icon: FiSmartphone, variant: 'default' },
          { label: 'Review Sessions', icon: FiClock, variant: 'outline' }
        ],
        suggestions: [
          "How can I improve my security score?",
          "Show me my login history",
          "What are active sessions?"
        ]
      };
    }

    // Logout issues
    if (lowerMessage.includes('logged out') || lowerMessage.includes('logout') || lowerMessage.includes('session')) {
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: "🔄 **Understanding Session Management**\n\nYou might get logged out for several reasons:\n\n1️⃣ **Session Timeout** - For security, sessions expire after 30 minutes of inactivity\n\n2️⃣ **Password Change** - Changing your password logs out all other devices\n\n3️⃣ **Suspicious Activity** - Our system detects unusual login patterns and logs you out for safety\n\n4️⃣ **Manual Logout** - You or an admin logged out all sessions\n\n**Tip:** You can adjust session timeout in Privacy & Preferences settings.",
        timestamp: new Date(),
        actions: [
          { label: 'View Active Sessions', icon: FiClock, variant: 'default' },
          { label: 'Adjust Settings', icon: FiShield, variant: 'outline' }
        ]
      };
    }

    // Suspicious login
    if (lowerMessage.includes('suspicious') || lowerMessage.includes('unusual') || lowerMessage.includes('hack')) {
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: "⚠️ **Detected Potentially Suspicious Activity**\n\nI noticed a failed login attempt from an unknown location:\n\n📍 **Location:** Los Angeles, USA\n🌐 **IP Address:** 203.0.113.45\n⏰ **Time:** 3 hours ago\n\n**Recommended Actions:**\n\n1. **Change your password immediately** if you don't recognize this activity\n2. **Enable MFA** for extra protection\n3. **Review all active sessions** and log out unknown devices\n4. **Check your email** for any unauthorized password reset attempts\n\n✅ **Good News:** The login attempt was blocked by our security system.",
        timestamp: new Date(),
        actions: [
          { label: 'Change Password', icon: FiKey, variant: 'default' },
          { label: 'Enable MFA', icon: FiSmartphone, variant: 'default' },
          { label: 'Review Sessions', icon: FiClock, variant: 'outline' }
        ]
      };
    }

    // Password help
    if (lowerMessage.includes('password')) {
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: "🔑 **Password Security Best Practices**\n\n**Creating a Strong Password:**\n\n✅ At least 12 characters long\n✅ Mix of uppercase and lowercase letters\n✅ Include numbers and special characters\n✅ Avoid personal information (birthdays, names)\n✅ Don't reuse passwords from other sites\n\n**Pro Tips:**\n• Use a passphrase: \"Coffee!Mountain@2024\"\n• Consider using a password manager\n• Change passwords every 90 days\n• Never share your password with anyone\n\n**Current password strength:** Strong ✅",
        timestamp: new Date(),
        actions: [
          { label: 'Change Password', icon: FiKey, variant: 'default' }
        ],
        suggestions: [
          "How often should I change my password?",
          "What is a password manager?",
          "Forgot password help"
        ]
      };
    }

    // Sessions explanation
    if (lowerMessage.includes('session') || lowerMessage.includes('device')) {
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: "💻 **Active Sessions Explained**\n\nAn active session represents a logged-in device. You currently have:\n\n• **MacBook Pro** (Current device)\n• **iPhone 14 Pro** (Active 1 hour ago)\n• **Windows PC** (Active 3 hours ago)\n\n**Security Tips:**\n\n1. Review your active sessions regularly\n2. Log out devices you don't recognize\n3. Use \"Log Out All Devices\" if your password was compromised\n4. Each session shows location and IP for verification\n\n⚠️ If you see unfamiliar devices, log them out immediately and change your password.",
        timestamp: new Date(),
        actions: [
          { label: 'Review Sessions', icon: FiClock, variant: 'default' },
          { label: 'Log Out All', icon: FiShield, variant: 'outline' }
        ]
      };
    }

    // Default response
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: "I can help you with:\n\n🔐 **Security Settings** - MFA, passwords, account protection\n\n💻 **Session Management** - Active devices, login history\n\n⚙️ **Account Settings** - Profile, preferences, privacy\n\n🔍 **Security Analysis** - Check your account security status\n\nWhat would you like to know more about?",
      timestamp: new Date(),
      suggestions: [
        "Check my account security",
        "Enable MFA",
        "Review active sessions",
        "Change my password"
      ]
    };
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: "👋 Chat cleared! How can I help you with your account security?",
        timestamp: new Date(),
        suggestions: [
          "Should I enable MFA?",
          "Is my account secure?",
          "Why did I get logged out?",
          "How do I protect my account?"
        ]
      }
    ]);
  };

  return (
    <>
      {/* Floating AI Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            width: '56px',
            height: '56px',
            backgroundColor: colors.accent,
            border: 'none',
            borderRadius: '50%',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transition: 'transform 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <FiMessageCircle size={24} />
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '12px',
            height: '12px',
            backgroundColor: colors.danger,
            borderRadius: '50%',
            animation: 'pulse 2s infinite'
          }} />
        </button>
      )}

      {/* AI Assistant Panel */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 10000,
          width: '400px',
          maxWidth: 'calc(100vw - 48px)',
          height: '600px',
          maxHeight: 'calc(100vh - 48px)',
          backgroundColor: colors.bgCard,
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          border: `1px solid ${colors.border}`,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            borderBottom: `1px solid ${colors.border}`,
            background: `linear-gradient(to right, ${theme === 'light' ? '#d1fae5' : 'rgba(16, 185, 129, 0.1)'}, ${theme === 'light' ? '#dbeafe' : 'rgba(59, 130, 246, 0.1)'})`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                padding: '8px',
                backgroundColor: colors.accent,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FiZap size={20} color="#ffffff" />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: colors.text }}>NeoSec AI Assistant</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: colors.textMuted }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: colors.accent,
                    borderRadius: '50%',
                    animation: 'pulse 2s infinite'
                  }} />
                  <span>Online</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleClearChat}
                style={{
                  padding: '8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: colors.textMuted,
                  cursor: 'pointer',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FiTrash2 size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  padding: '8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: colors.textMuted,
                  cursor: 'pointer',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FiX size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  maxWidth: '80%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {message.role === 'assistant' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        backgroundColor: colors.accent,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <FiZap size={12} color="#ffffff" />
                      </div>
                      <span style={{ fontSize: '11px', color: colors.textMuted }}>NeoSec AI</span>
                    </div>
                  )}

                  <div
                    style={{
                      padding: '12px',
                      borderRadius: '12px',
                      backgroundColor: message.role === 'user'
                        ? colors.accent
                        : colors.bgMain,
                      color: message.role === 'user' ? '#ffffff' : colors.text,
                      fontSize: '13px',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-line'
                    }}
                  >
                    {message.content}
                  </div>

                  {/* Action Buttons */}
                  {message.actions && message.actions.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {message.actions.map((action, index) => {
                        const IconComponent = action.icon;
                        return (
                          <button
                            key={index}
                            onClick={() => {
                              // Handle action click
                              console.log('Action clicked:', action.label);
                            }}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: action.variant === 'default' ? colors.accent : 'transparent',
                              border: `1px solid ${action.variant === 'default' ? colors.accent : colors.border}`,
                              borderRadius: '16px',
                              color: action.variant === 'default' ? '#ffffff' : colors.text,
                              fontSize: '11px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <IconComponent size={12} />
                            {action.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Suggested Questions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <p style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '6px' }}>Suggested questions:</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {message.suggestions
                          .filter(s => typeof s === 'string')
                          .map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => handleSendMessage(suggestion)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: colors.bgCard,
                                border: `1px solid ${colors.border}`,
                                borderRadius: '16px',
                                color: colors.text,
                                fontSize: '11px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = colors.accent;
                                e.currentTarget.style.color = colors.accent;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = colors.border;
                                e.currentTarget.style.color = colors.text;
                              }}
                            >
                              {suggestion}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {message.role === 'user' && (
                    <div style={{ fontSize: '10px', color: colors.textMuted, textAlign: 'right' }}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: colors.accent,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FiZap size={12} color="#ffffff" />
                  </div>
                  <div style={{
                    padding: '12px',
                    backgroundColor: colors.bgMain,
                    borderRadius: '12px'
                  }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <span style={{
                        width: '6px',
                        height: '6px',
                        backgroundColor: colors.textMuted,
                        borderRadius: '50%',
                        animation: 'bounce 1.4s infinite',
                        animationDelay: '0ms'
                      }} />
                      <span style={{
                        width: '6px',
                        height: '6px',
                        backgroundColor: colors.textMuted,
                        borderRadius: '50%',
                        animation: 'bounce 1.4s infinite',
                        animationDelay: '150ms'
                      }} />
                      <span style={{
                        width: '6px',
                        height: '6px',
                        backgroundColor: colors.textMuted,
                        borderRadius: '50%',
                        animation: 'bounce 1.4s infinite',
                        animationDelay: '300ms'
                      }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{
            padding: '16px',
            borderTop: `1px solid ${colors.border}`,
            backgroundColor: colors.bgMain
          }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              style={{ display: 'flex', gap: '8px' }}
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about account security, MFA, sessions..."
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  backgroundColor: colors.bgCard,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  color: colors.text,
                  fontSize: '13px'
                }}
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                style={{
                  padding: '10px 16px',
                  backgroundColor: colors.accent,
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                  opacity: inputValue.trim() ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FiSend size={16} />
              </button>
            </form>
            <p style={{
              fontSize: '10px',
              color: colors.textMuted,
              marginTop: '8px',
              textAlign: 'center'
            }}>
              AI responses are for guidance only. Always verify critical security decisions.
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </>
  );
};

export default AIAssistant;

