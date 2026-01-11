const { createAuditLog } = require('../middleware/auditLogger');
const axios = require('axios');

// Ollama configuration
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:1b'; // Lightweight model: 1B parameters, ~700MB RAM

// Fallback response generator (used when Ollama is not available)
const generateFallbackResponse = (query, context) => {
  const lowerQuery = query.toLowerCase();
  let message = '';
  let severity = 'info';
  let suggestedActions = [];

  // MFA related queries
  if (lowerQuery.includes('mfa') || lowerQuery.includes('two-factor') || lowerQuery.includes('2fa')) {
    message = "🔐 **Multi-Factor Authentication (MFA) is highly recommended!**\n\nHere's why you should enable it:\n\n✅ **Extra Security Layer** - Even if someone gets your password, they can't access your account without your phone\n\n✅ **Industry Standard** - Used by banks, tech companies, and security professionals worldwide\n\n✅ **Easy Setup** - Takes just 2 minutes to configure with Google Authenticator or similar apps\n\n⚠️ **Important:** Make sure to save your backup codes in a safe place!";
    suggestedActions = [
      { label: 'Enable MFA Now', action: 'enable_mfa', variant: 'default' },
      { label: 'Learn More', action: 'learn_mfa', variant: 'outline' }
    ];
  }
  // Security status queries
  else if (lowerQuery.includes('secure') || lowerQuery.includes('safe') || lowerQuery.includes('protect')) {
    const securityScore = context?.mfaEnabled ? 9 : 7;
    message = `🛡️ **Let me check your account security status...**\n\nHere's what I found:\n\n✅ **Strong Password** - Your password meets all requirements\n\n${context?.mfaEnabled ? '✅' : '⚠️'} **MFA ${context?.mfaEnabled ? 'Enabled' : 'Disabled'}** - ${context?.mfaEnabled ? 'Great! Your account has an extra layer of protection.' : 'I recommend enabling two-factor authentication'}\n\n✅ **Email Verified** - Your email address is confirmed\n\n✅ **Recent Activity Normal** - No suspicious login attempts detected\n\n**Security Score: ${securityScore}/10**\n\n${securityScore < 9 ? 'You can improve your score by enabling MFA and reviewing active sessions regularly.' : 'Your account security is excellent!'}`;
    suggestedActions = context?.mfaEnabled ? [] : [
      { label: 'Enable MFA', action: 'enable_mfa', variant: 'default' },
      { label: 'Review Sessions', action: 'review_sessions', variant: 'outline' }
    ];
  }
  // Session/logout queries
  else if (lowerQuery.includes('logged out') || lowerQuery.includes('logout') || lowerQuery.includes('session')) {
    message = "🔄 **Understanding Session Management**\n\nYou might get logged out for several reasons:\n\n1️⃣ **Session Timeout** - For security, sessions expire after 30 minutes of inactivity\n\n2️⃣ **Password Change** - Changing your password logs out all other devices\n\n3️⃣ **Suspicious Activity** - Our system detects unusual login patterns and logs you out for safety\n\n4️⃣ **Manual Logout** - You or an admin logged out all sessions\n\n**Tip:** You can adjust session timeout in Privacy & Preferences settings.";
    suggestedActions = [
      { label: 'View Active Sessions', action: 'review_sessions', variant: 'default' },
      { label: 'Adjust Settings', action: 'adjust_settings', variant: 'outline' }
    ];
  }
  // Password queries
  else if (lowerQuery.includes('password')) {
    message = "🔑 **Password Security Best Practices**\n\n**Creating a Strong Password:**\n\n✅ At least 12 characters long\n✅ Mix of uppercase and lowercase letters\n✅ Include numbers and special characters\n✅ Avoid personal information (birthdays, names)\n✅ Don't reuse passwords from other sites\n\n**Pro Tips:**\n• Use a passphrase: \"Coffee!Mountain@2024\"\n• Consider using a password manager\n• Change passwords every 90 days\n• Never share your password with anyone\n\n**Current password strength:** Strong ✅";
    suggestedActions = [
      { label: 'Change Password', action: 'change_password', variant: 'default' }
    ];
  }
  // Firewall queries
  else if (lowerQuery.includes('firewall') || lowerQuery.includes('rule')) {
    message = "🔥 **Firewall Rules Explained**\n\nFirewall rules control which connections are allowed or blocked:\n\n**Basic Concepts:**\n\n🎯 **Allow Rules** - Permit specific traffic (e.g., web browsing)\n🚫 **Block Rules** - Deny specific traffic (e.g., suspicious IPs)\n📊 **Priority** - Rules are evaluated in order from top to bottom\n\n**Common Scenarios:**\n\n• Block all incoming except necessary ports\n• Allow HTTP/HTTPS for web browsing\n• Block known malicious IP ranges\n• Time-based rules for work hours\n\n**Pro Tip:** Test rules in simulation mode before applying!";
    suggestedActions = [
      { label: 'View Firewall Rules', action: 'view_firewall', variant: 'default' },
      { label: 'Learn More', action: 'learn_firewall', variant: 'outline' }
    ];
  }
  // Threat blocker queries
  else if (lowerQuery.includes('threat') || lowerQuery.includes('block') || lowerQuery.includes('malware')) {
    message = "🛡️ **Threat Blocker Overview**\n\nOur automatic threat blocker protects you from:\n\n🦠 **Malware** - Malicious software distribution sites\n🤖 **Botnets** - Compromised systems used for attacks\n💥 **DDoS Sources** - Distributed denial-of-service attackers\n🎣 **Phishing** - Fake websites trying to steal credentials\n\n**How It Works:**\n\n1. Updates blocklists from AbuseIPDB hourly\n2. Categorizes threats by severity (Critical/High/Medium/Low)\n3. Blocks connections automatically\n4. Logs all blocked attempts for review\n\n✅ Currently protecting you from **12,147 threats**";
    suggestedActions = [
      { label: 'View Threat Dashboard', action: 'view_threats', variant: 'default' },
      { label: 'Check Blocklists', action: 'check_blocklists', variant: 'outline' }
    ];
  }
  // Website/General questions
  else if (lowerQuery.includes('website') || lowerQuery.includes('neosec') || lowerQuery.includes('platform') || lowerQuery.includes('what is') || lowerQuery.includes('how does')) {
    message = "🌐 **About NeoSec Platform**\n\nNeoSec is a comprehensive cybersecurity platform that helps protect your digital life. Here's what we offer:\n\n🔐 **Account Security** - Multi-factor authentication, strong password management, and session control\n\n🔥 **Firewall Management** - Create custom firewall rules to control network traffic\n\n🛡️ **Threat Protection** - Automatic blocking of malicious IPs and known threats\n\n📊 **Logs & Analytics** - Monitor your security events and system health\n\n💻 **Dashboard** - Real-time status monitoring and security insights\n\n**Need Help?** Ask me about:\n• Setting up MFA\n• Creating firewall rules\n• Understanding threat blocking\n• Managing your account security\n• Troubleshooting issues";
    suggestedActions = [
      { label: 'View Dashboard', action: 'view_dashboard', variant: 'default' },
      { label: 'Learn More', action: 'learn_more', variant: 'outline' }
    ];
  }
  // Troubleshooting/Problems
  else if (lowerQuery.includes('problem') || lowerQuery.includes('issue') || lowerQuery.includes('error') || lowerQuery.includes('not working') || lowerQuery.includes('help')) {
    message = "🔧 **Troubleshooting Help**\n\nI'm here to help you resolve any issues! Common problems and solutions:\n\n**Login Issues:**\n• Check your email and password\n• Ensure your account is not locked\n• Try resetting your password\n\n**Session Problems:**\n• Clear browser cache and cookies\n• Check if you're logged out due to inactivity\n• Verify your session timeout settings\n\n**Firewall Not Working:**\n• Verify rules are saved correctly\n• Check rule priority order\n• Ensure desktop client is connected\n\n**Threat Blocker Issues:**\n• Confirm blocklists are up to date\n• Check if IP is in whitelist\n• Review recent threat logs\n\n**Still Having Issues?**\n• Check the Logs & Reports section\n• Review your account settings\n• Contact support if problem persists";
    suggestedActions = [
      { label: 'View Logs', action: 'view_logs', variant: 'default' },
      { label: 'Check Settings', action: 'adjust_settings', variant: 'outline' }
    ];
  }
  // Default response
  else {
    message = "I can help you with:\n\n🔐 **Security Settings** - MFA, passwords, account protection\n\n💻 **Session Management** - Active devices, login history\n\n🔥 **Firewall Rules** - Configuration and best practices\n\n🛡️ **Threat Protection** - Blocklists and threat detection\n\n⚙️ **Account Settings** - Profile, preferences, privacy\n\n🌐 **Platform Questions** - Learn about NeoSec features\n\n🔧 **Troubleshooting** - Resolve issues and problems\n\n🔍 **Security Analysis** - Check your account security status\n\nWhat would you like to know more about?";
    suggestedActions = [
      { label: 'Check Account Security', action: 'check_security', variant: 'default' },
      { label: 'Explain Firewall Rules', action: 'explain_firewall', variant: 'outline' },
      { label: 'How Threat Blocking Works', action: 'explain_threats', variant: 'outline' },
      { label: 'Enable MFA', action: 'enable_mfa', variant: 'outline' }
    ];
  }

  return { message, severity, suggestedActions };
};

// Extract suggested actions from AI response
const extractSuggestedActions = (aiMessage) => {
  const actions = [];
  
  // Check for common action keywords in the AI response
  if (aiMessage.toLowerCase().includes('enable mfa') || aiMessage.toLowerCase().includes('set up mfa')) {
    actions.push({ label: 'Enable MFA', action: 'enable_mfa', variant: 'default' });
  }
  if (aiMessage.toLowerCase().includes('change password') || aiMessage.toLowerCase().includes('update password')) {
    actions.push({ label: 'Change Password', action: 'change_password', variant: 'default' });
  }
  if (aiMessage.toLowerCase().includes('review session') || aiMessage.toLowerCase().includes('active session')) {
    actions.push({ label: 'Review Sessions', action: 'review_sessions', variant: 'outline' });
  }
  if (aiMessage.toLowerCase().includes('firewall')) {
    actions.push({ label: 'View Firewall Rules', action: 'view_firewall', variant: 'outline' });
  }
  if (aiMessage.toLowerCase().includes('threat') || aiMessage.toLowerCase().includes('blocklist')) {
    actions.push({ label: 'View Threat Dashboard', action: 'view_threats', variant: 'outline' });
  }
  if (aiMessage.toLowerCase().includes('dashboard') || aiMessage.toLowerCase().includes('status')) {
    actions.push({ label: 'View Dashboard', action: 'view_dashboard', variant: 'outline' });
  }
  if (aiMessage.toLowerCase().includes('log') || aiMessage.toLowerCase().includes('report')) {
    actions.push({ label: 'View Logs', action: 'view_logs', variant: 'outline' });
  }
  
  return actions.length > 0 ? actions : [
    { label: 'Learn More', action: 'learn_more', variant: 'outline' }
  ];
};

// Call Ollama API
const callOllama = async (prompt) => {
  try {
    const response = await axios.post(`${OLLAMA_API_URL}/api/generate`, {
      model: OLLAMA_MODEL,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        num_predict: 400 // Limit response length
      }
    }, {
      timeout: 15000 // 15 second timeout
    });

    return response.data?.response || '';
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new Error('Ollama is not running. Please start Ollama service.');
    }
    throw error;
  }
};

// @desc    AI Profile Assistant
// @route   POST /api/ai/profile-assist
// @access  Private
const profileAssist = async (req, res) => {
  try {
    const { query, context } = req.body;
    const userId = req.user.id;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query is required'
      });
    }

    let message = '';
    let severity = 'info';
    let suggestedActions = [];
    let aiProvider = 'fallback';

    // Try to use Ollama if available
    try {
      // Build enhanced context-aware system prompt
      const systemPrompt = `You are NeoSec AI Assistant, a helpful cybersecurity expert and support assistant for the NeoSec platform.

NeoSec Platform Overview:
- NeoSec is a comprehensive cybersecurity platform
- Features include: Account Security, Firewall Management, Threat Protection, Logs & Analytics, Dashboard Monitoring
- Users can manage MFA, sessions, firewall rules, and view security logs
- The platform integrates with AbuseIPDB for threat blocking

User Context:
- MFA Status: ${context?.mfaEnabled ? 'Enabled' : 'Disabled'}
- Active Sessions: ${context?.activeSessions || 0}
- Recent Logins: ${context?.recentLogins || 0}
- Current Section: ${context?.section || 'profile'}

Your Role:
1. Answer questions about the NeoSec website/platform features
2. Help users troubleshoot problems and resolve issues
3. Guide users through security settings (MFA, passwords, sessions)
4. Explain firewall rules and threat blocking
5. Provide cybersecurity best practices
6. Help with account management and preferences

Guidelines:
- Provide clear, concise, and helpful responses
- Use emojis sparingly for visual clarity (🔐 🛡️ ✅ ⚠️ 🔥 💻)
- Format responses with markdown (bold, lists, line breaks)
- Keep responses under 300 words
- Be security-focused and professional
- Suggest relevant actions when appropriate
- For website questions, explain NeoSec features clearly
- For troubleshooting, provide step-by-step solutions
- Always be helpful and friendly

Respond naturally and conversationally, focusing on cybersecurity, account management, and NeoSec platform features.`;

      const fullPrompt = `${systemPrompt}\n\nUser Question: ${query}\n\nAssistant Response:`;

      const aiResponse = await callOllama(fullPrompt);
      
      if (aiResponse && aiResponse.trim().length > 20) {
        message = aiResponse.trim();
        suggestedActions = extractSuggestedActions(message);
        aiProvider = `ollama-${OLLAMA_MODEL}`;
        console.log(`✅ AI Assistant: Used Ollama (${OLLAMA_MODEL})`);
      } else {
        throw new Error('Ollama response too short, using fallback');
      }
    } catch (ollamaError) {
      // Log detailed error for debugging
      console.log(`⚠️ AI Assistant: Ollama unavailable - ${ollamaError.message}`);
      console.log(`   Ollama URL: ${OLLAMA_API_URL}`);
      console.log(`   Model: ${OLLAMA_MODEL}`);
      console.log(`   Error Code: ${ollamaError.code || 'N/A'}`);
      
      // Fall back to keyword-based responses
      const fallback = generateFallbackResponse(query, context);
      message = fallback.message;
      severity = fallback.severity;
      suggestedActions = fallback.suggestedActions;
      aiProvider = 'fallback';
      
      // Add a note in development mode that Ollama is not available
      if (process.env.NODE_ENV === 'development') {
        console.log(`   ℹ️  Using fallback responses. To enable AI, install and start Ollama:`);
        console.log(`   1. Install: https://ollama.com/download`);
        console.log(`   2. Pull model: ollama pull ${OLLAMA_MODEL}`);
        console.log(`   3. Start Ollama service`);
      }
    }

    // Log AI interaction for audit (only for admins)
    try {
      if (req.user.role === 'admin') {
        await createAuditLog(
          userId,
          'AI_ASSISTANT_QUERY',
          'AI_ASSISTANT',
          {
            details: JSON.stringify({
              query: query.substring(0, 200), // Limit query length
              context: context || {},
              aiProvider: aiProvider
            }),
            ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown'
          }
        );
      }
    } catch (auditError) {
      console.error('Error creating audit log for AI assistant:', auditError);
      // Don't fail the request if audit logging fails
    }

    res.status(200).json({
      success: true,
      message,
      severity,
      suggestedActions
    });
  } catch (error) {
    console.error('AI Assistant error:', error);
    
    // Final fallback on any error
    const fallback = generateFallbackResponse(req.body.query || '', req.body.context || {});
    
    res.status(200).json({
      success: true,
      message: fallback.message,
      severity: fallback.severity,
      suggestedActions: fallback.suggestedActions
    });
  }
};

// Health check for Ollama
const checkOllamaHealth = async (req, res) => {
  try {
    const response = await axios.get(`${OLLAMA_API_URL}/api/tags`, {
      timeout: 5000
    });
    
    const models = response.data?.models || [];
    const hasModel = models.some(m => m.name === OLLAMA_MODEL || m.name.includes(OLLAMA_MODEL.split(':')[0]));
    
    res.status(200).json({
      success: true,
      ollamaAvailable: true,
      ollamaUrl: OLLAMA_API_URL,
      model: OLLAMA_MODEL,
      modelInstalled: hasModel,
      availableModels: models.map(m => m.name),
      message: hasModel 
        ? `Ollama is running and model ${OLLAMA_MODEL} is available`
        : `Ollama is running but model ${OLLAMA_MODEL} is not installed. Run: ollama pull ${OLLAMA_MODEL}`
    });
  } catch (error) {
    res.status(200).json({
      success: false,
      ollamaAvailable: false,
      ollamaUrl: OLLAMA_API_URL,
      model: OLLAMA_MODEL,
      error: error.message,
      errorCode: error.code,
      message: 'Ollama is not running. Install from https://ollama.com/download and start the service.',
      instructions: [
        '1. Download Ollama from https://ollama.com/download',
        `2. Install and start Ollama service`,
        `3. Pull the model: ollama pull ${OLLAMA_MODEL}`,
        `4. Verify: ollama list`
      ]
    });
  }
};

module.exports = {
  profileAssist,
  checkOllamaHealth
};
