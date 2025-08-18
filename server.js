const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const Database = require('./database');
const LinkService = require('./services/linkService');
const AnalyticsService = require('./services/analyticsService');
const { detectDevice, generateMetaTags } = require('./utils/helpers');
const AASAConfig = require('./utils/aasaConfig');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize services
const db = new Database();
const linkService = new LinkService(db);
const analyticsService = new AnalyticsService(db);
const aasaConfig = new AASAConfig();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// API Routes
app.post('/api/create', async (req, res) => {
  try {
    const { url, customAlias, title, description, imageUrl, iosUrl, androidUrl, desktopUrl } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const linkData = {
      originalUrl: url,
      customAlias,
      title,
      description,
      imageUrl,
      iosUrl,
      androidUrl,
      desktopUrl
    };

    const result = await linkService.createLink(linkData);
    const shortUrl = `https://link.staging.morafinance.com/${result.alias}`;

    res.json({
      shortUrl,
      alias: result.alias,
      originalUrl: url,
      createdAt: result.createdAt
    });
  } catch (error) {
    console.error('Error creating link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Link redirect handler
app.get('/:alias', async (req, res) => {
  try {
    const { alias } = req.params;
    const link = await linkService.getLink(alias);

    if (!link) {
      return res.status(404).send('Link not found');
    }

    // Track the click
    const userAgent = req.get('User-Agent');
    const ip = req.ip || req.connection.remoteAddress;
    const referer = req.get('Referer');
    
    await analyticsService.trackClick(alias, {
      userAgent,
      ip,
      referer,
      timestamp: new Date()
    });

    // Detect device and determine redirect URL
    const deviceInfo = detectDevice(userAgent);
    let redirectUrl = link.originalUrl;

    // Platform-specific routing
    if (deviceInfo.isIOS && link.iosUrl) {
      redirectUrl = link.iosUrl;
    } else if (deviceInfo.isAndroid && link.androidUrl) {
      redirectUrl = link.androidUrl;
    } else if (deviceInfo.isDesktop && link.desktopUrl) {
      redirectUrl = link.desktopUrl;
    }

    // Check if this is a social media crawler
    const isCrawler = /bot|crawler|spider|facebook|twitter|linkedin|whatsapp/i.test(userAgent);
    
    if (isCrawler) {
      // Return HTML with meta tags for social media preview
      const metaTags = generateMetaTags({
        title: link.title || 'Mora Finance',
        description: link.description || '',
        imageUrl: link.imageUrl || '',
        url: `https://link.staging.morafinance.com/${alias}`
      });

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          ${metaTags}
          <meta http-equiv="refresh" content="0;url=${redirectUrl}">
        </head>
        <body>
          <p>Redirecting...</p>
          <script>window.location.href = "${redirectUrl}";</script>
        </body>
        </html>
      `;
      
      return res.send(html);
    }

    // Regular redirect
    res.redirect(302, redirectUrl);
  } catch (error) {
    console.error('Error handling redirect:', error);
    res.status(500).send('Internal server error');
  }
});

// Get all links
app.get('/api/links', async (req, res) => {
  try {
    const links = await linkService.getAllLinks();
    res.json(links);
  } catch (error) {
    console.error('Error fetching links:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific link details
app.get('/api/links/:alias', async (req, res) => {
  try {
    const { alias } = req.params;
    const link = await linkService.getLink(alias);
    
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    res.json(link);
  } catch (error) {
    console.error('Error fetching link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update link
app.put('/api/links/:alias', async (req, res) => {
  try {
    const { alias } = req.params;
    const updateData = req.body;
    
    const link = await linkService.getLink(alias);
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    // Update logic would go here
    res.json({ message: 'Link updated successfully' });
  } catch (error) {
    console.error('Error updating link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete link
app.delete('/api/links/:alias', async (req, res) => {
  try {
    const { alias } = req.params;
    await linkService.deleteLink(alias);
    res.json({ message: 'Link deleted successfully' });
  } catch (error) {
    console.error('Error deleting link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Analytics endpoint
app.get('/api/analytics/:alias', async (req, res) => {
  try {
    const { alias } = req.params;
    const analytics = await analyticsService.getAnalytics(alias);
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Global analytics
app.get('/api/analytics', async (req, res) => {
  try {
    const analytics = await analyticsService.getGlobalStats();
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching global analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Top links
app.get('/api/top-links', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const topLinks = await analyticsService.getTopLinks(parseInt(limit));
    res.json(topLinks);
  } catch (error) {
    console.error('Error fetching top links:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Apple App Site Association endpoint for iOS Universal Links
app.get('/.well-known/apple-app-site-association', (req, res) => {
  try {
    const aasaData = aasaConfig.loadConfig();
    
    // Set proper headers for AASA file
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.json(aasaData);
  } catch (error) {
    console.error('Error serving AASA file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root endpoint - serve dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize database and start server
async function start() {
  try {
    await db.initialize();
    console.log('Database initialized successfully');
    
    // Initialize and validate AASA configuration
    console.log('Initializing AASA configuration...');
    const aasaData = aasaConfig.loadConfig();
    if (aasaData) {
      console.log('AASA configuration loaded and validated successfully');
      console.log(`AASA file available at: https://link.staging.morafinance.com/.well-known/apple-app-site-association`);
    } else {
      console.warn('AASA configuration validation failed, using default configuration');
    }
    
    app.listen(PORT, () => {
      console.log(`Mora Shortlink server running on port ${PORT}`);
      console.log(`API available at: http://localhost:${PORT}/api`);
      console.log(`Short links: https://link.staging.morafinance.com/`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();