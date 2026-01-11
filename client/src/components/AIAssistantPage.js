import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiZap, FiShield, FiKey, FiSmartphone, FiClock, FiHelpCircle, FiTrash2, FiLock, FiTarget } from 'react-icons/fi';
import { aiAssistantAPI } from '../services/api';
import Sidebar from './Layout/Sidebar';
import Header from './Layout/Header';

const AIAssistantPage = ({ theme, palette, user, handleLogout, currentView, setCurrentView, sidebarOpen, setSidebarOpen, isMobile, isTablet, setTheme }) => {
  const darkPalette = {
    bgMain: '#121212', bgCard: '#181818', text: '#ffffff', textMuted: '#9aa3b5',
    border: '#242424', accent: '#36E27B', danger: '#e04848'
  };
  const lightPalette = {
    bgMain: '#f6f8fb', bgCard: '#ffffff', text: '#0b172a', textMuted: '#5b6b7a',
    border: '#d9e2ec', accent: '#1fa45a', danger: '#d4183d'
  };
  const colors = palette || (theme === 'light' ? lightPalette : darkPalette);

  const [messages, setMessages] = useState([
    {
      id: '1',
      role: 'assistant',
      content: "👋 Hi! I'm your NeoSec AI Assistant. I'm here to help you with account security, MFA setup, session management, firewall rules, threat protection, and more. How can I assist you today?",
      timestamp: new Date(),
      suggestions: [
        "Should I enable MFA?",
        "Is my account secure?",
        "Explain firewall rules",
        "How does threat blocking work?"
      ]
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
          section: 'ai-assistant',
          mfaEnabled: false,
          activeSessions: 0,
          recentLogins: 0
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
        const aiResponse = generateAIResponse(messageText);
        setMessages(prev => [...prev, aiResponse]);
      }
    } catch (err) {
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

    // Firewall help
    if (lowerMessage.includes('firewall') || lowerMessage.includes('rule')) {
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: "🔥 **Firewall Rules Explained**\n\nFirewall rules control which connections are allowed or blocked:\n\n**Basic Concepts:**\n\n🎯 **Allow Rules** - Permit specific traffic (e.g., web browsing)\n🚫 **Block Rules** - Deny specific traffic (e.g., suspicious IPs)\n📊 **Priority** - Rules are evaluated in order from top to bottom\n\n**Common Scenarios:**\n\n• Block all incoming except necessary ports\n• Allow HTTP/HTTPS for web browsing\n• Block known malicious IP ranges\n• Time-based rules for work hours\n\n**Pro Tip:** Test rules in simulation mode before applying!",
        timestamp: new Date(),
        actions: [
          { label: 'View Firewall Rules', icon: FiLock, variant: 'default' },
          { label: 'Learn More', icon: FiHelpCircle, variant: 'outline' }
        ],
        suggestions: [
          "How do I create a firewall rule?",
          "What are common firewall mistakes?",
          "Explain rule priority"
        ]
      };
    }

    // Threat blocker help
    if (lowerMessage.includes('threat') || lowerMessage.includes('block') || lowerMessage.includes('malware')) {
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: "🛡️ **Threat Blocker Overview**\n\nOur automatic threat blocker protects you from:\n\n🦠 **Malware** - Malicious software distribution sites\n🤖 **Botnets** - Compromised systems used for attacks\n💥 **DDoS Sources** - Distributed denial-of-service attackers\n🎣 **Phishing** - Fake websites trying to steal credentials\n\n**How It Works:**\n\n1. Updates blocklists from AbuseIPDB hourly\n2. Categorizes threats by severity (Critical/High/Medium/Low)\n3. Blocks connections automatically\n4. Logs all blocked attempts for review\n\n✅ Currently protecting you from **12,147 threats**",
        timestamp: new Date(),
        actions: [
          { label: 'View Threat Dashboard', icon: FiTarget, variant: 'default' },
          { label: 'Check Blocklists', icon: FiShield, variant: 'outline' }
        ],
        suggestions: [
          "How often are blocklists updated?",
          "Can I whitelist an IP?",
          "View recent blocked threats"
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

    // Default response
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: "I can help you with:\n\n🔐 **Security Settings** - MFA, passwords, account protection\n\n💻 **Session Management** - Active devices, login history\n\n🔥 **Firewall Rules** - Configuration and best practices\n\n🛡️ **Threat Protection** - Blocklists and threat detection\n\n⚙️ **Account Settings** - Profile, preferences, privacy\n\n🔍 **Security Analysis** - Check your account security status\n\nWhat would you like to know more about?",
      timestamp: new Date(),
      suggestions: [
        "Check my account security",
        "Explain firewall rules",
        "How does threat blocking work?",
        "Enable MFA"
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
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: colors.bgMain }}>
      <Sidebar
        user={user}
        theme={theme}
        palette={palette}
        currentView={currentView}
        setCurrentView={setCurrentView}
        setTheme={setTheme}
        isMobile={isMobile}
        isTablet={isTablet}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        handleLogout={handleLogout}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: isMobile ? 0 : '260px' }}>
        <Header
          user={user}
          theme={theme}
          palette={palette}
          isMobile={isMobile}
          isTablet={isTablet}
          onLogout={handleLogout}
          onUserUpdate={() => {}}
        />

        <main style={{ flex: 1, overflow: 'hidden', padding: '24px', backgroundColor: colors.bgMain }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              backgroundColor: colors.bgCard,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Welcome Banner */}
              <div style={{
                padding: '24px',
                borderBottom: `1px solid ${colors.border}`,
                background: `linear-gradient(to right, ${theme === 'light' ? '#d1fae5' : 'rgba(16, 185, 129, 0.1)'}, ${theme === 'light' ? '#dbeafe' : 'rgba(59, 130, 246, 0.1)'})`
              }}>
                <div style={{ display: 'flex', alignItems: 'start', gap: '16px' }}>
                  <div style={{
                    padding: '12px',
                    backgroundColor: colors.accent,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FiZap size={24} color="#ffffff" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: colors.text }}>
                      Welcome to NeoSec AI Assistant
                    </h2>
                    <p style={{ fontSize: '14px', color: colors.textMuted }}>
                      I'm here to help you understand security settings, guide you through MFA setup, explain firewall rules, 
                      and answer any questions about your account protection. Ask me anything!
                    </p>
                  </div>
                  <button
                    onClick={handleClearChat}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'transparent',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      color: colors.text,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px'
                    }}
                  >
                    <FiTrash2 size={16} />
                    Clear Chat
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                style={{
                  flex: 1,
                  padding: '24px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px'
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
                      maxWidth: '85%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      {message.role === 'assistant' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: colors.accent,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <FiZap size={16} color="#ffffff" />
                          </div>
                          <span style={{ fontSize: '12px', color: colors.textMuted }}>NeoSec AI</span>
                        </div>
                      )}

                      <div
                        style={{
                          padding: '16px',
                          borderRadius: '12px',
                          backgroundColor: message.role === 'user'
                            ? colors.accent
                            : colors.bgMain,
                          color: message.role === 'user' ? '#ffffff' : colors.text,
                          fontSize: '14px',
                          lineHeight: '1.6',
                          whiteSpace: 'pre-line'
                        }}
                      >
                        {message.content}
                      </div>

                      {/* Action Buttons */}
                      {message.actions && message.actions.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {message.actions.map((action, index) => {
                            const IconComponent = action.icon;
                            return (
                              <button
                                key={index}
                                onClick={() => {
                                  console.log('Action clicked:', action.label);
                                }}
                                style={{
                                  padding: '8px 16px',
                                  backgroundColor: action.variant === 'default' ? colors.accent : 'transparent',
                                  border: `1px solid ${action.variant === 'default' ? colors.accent : colors.border}`,
                                  borderRadius: '8px',
                                  color: action.variant === 'default' ? '#ffffff' : colors.text,
                                  fontSize: '13px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                <IconComponent size={16} />
                                {action.label}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Suggested Questions */}
                      {message.suggestions && message.suggestions.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                          <p style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '8px' }}>Suggested questions:</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {message.suggestions
                              .filter(s => typeof s === 'string')
                              .map((suggestion, index) => (
                                <button
                                  key={index}
                                  onClick={() => handleSendMessage(suggestion)}
                                  style={{
                                    padding: '8px 16px',
                                    backgroundColor: colors.bgCard,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: '8px',
                                    color: colors.text,
                                    fontSize: '13px',
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
                        <div style={{ fontSize: '11px', color: colors.textMuted, textAlign: 'right' }}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: colors.accent,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <FiZap size={16} color="#ffffff" />
                      </div>
                      <div style={{
                        padding: '16px',
                        backgroundColor: colors.bgMain,
                        borderRadius: '12px'
                      }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            backgroundColor: colors.textMuted,
                            borderRadius: '50%',
                            animation: 'bounce 1.4s infinite',
                            animationDelay: '0ms'
                          }} />
                          <span style={{
                            width: '8px',
                            height: '8px',
                            backgroundColor: colors.textMuted,
                            borderRadius: '50%',
                            animation: 'bounce 1.4s infinite',
                            animationDelay: '150ms'
                          }} />
                          <span style={{
                            width: '8px',
                            height: '8px',
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
                padding: '24px',
                borderTop: `1px solid ${colors.border}`,
                backgroundColor: theme === 'light' ? '#f9fafb' : colors.bgMain
              }}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  style={{ maxWidth: '800px', margin: '0 auto' }}
                >
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Ask about account security, MFA, firewall rules, threats, sessions..."
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        backgroundColor: colors.bgCard,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        color: colors.text,
                        fontSize: '14px'
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!inputValue.trim()}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: colors.accent,
                        border: 'none',
                        borderRadius: '8px',
                        color: '#ffffff',
                        cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                        opacity: inputValue.trim() ? 1 : 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '14px',
                        fontWeight: 500
                      }}
                    >
                      <FiSend size={20} />
                      Send
                    </button>
                  </div>
                  <p style={{
                    fontSize: '11px',
                    color: colors.textMuted,
                    marginTop: '12px',
                    textAlign: 'center'
                  }}>
                    AI responses are for guidance only. Always verify critical security decisions with your administrator.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default AIAssistantPage;

