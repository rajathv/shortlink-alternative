const UAParser = require('ua-parser-js');

function detectDevice(userAgent) {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  
  const os = result.os.name ? result.os.name.toLowerCase() : '';
  const device = result.device.type || 'desktop';
  
  return {
    isIOS: os.includes('ios') || os.includes('mac os'),
    isAndroid: os.includes('android'),
    isDesktop: device === 'desktop' || (!os.includes('ios') && !os.includes('android')),
    isMobile: device === 'mobile' || device === 'tablet',
    browser: result.browser.name || 'unknown',
    os: result.os.name || 'unknown',
    device: device,
    userAgent: userAgent
  };
}

function generateMetaTags(options) {
  const {
    title = 'Mora Finance',
    description = 'Secure Islamic Banking Solutions',
    imageUrl = '',
    url = ''
  } = options;

  return `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${escapeHtml(url)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    ${imageUrl ? `<meta property="og:image" content="${escapeHtml(imageUrl)}">` : ''}
    <meta property="og:site_name" content="Mora Finance">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${escapeHtml(url)}">
    <meta property="twitter:title" content="${escapeHtml(title)}">
    <meta property="twitter:description" content="${escapeHtml(description)}">
    ${imageUrl ? `<meta property="twitter:image" content="${escapeHtml(imageUrl)}">` : ''}
    
    <!-- WhatsApp -->
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    
    <!-- LinkedIn -->
    <meta property="og:locale" content="en_US">
    
    <!-- Additional meta tags -->
    <meta name="robots" content="index, follow">
    <meta name="author" content="Mora Finance">
  `.trim();
}

function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return '';
  
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function sanitizeAlias(alias) {
  // Remove special characters and ensure alphanumeric only
  return alias.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function getClientIP(req) {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.ip;
}

function generateQRCode(url) {
  // For QR code generation, you might want to integrate with a service like qr-server.com
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
}

module.exports = {
  detectDevice,
  generateMetaTags,
  escapeHtml,
  isValidUrl,
  sanitizeAlias,
  getClientIP,
  generateQRCode
};