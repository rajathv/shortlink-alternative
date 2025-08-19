const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
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

// iOS redirect page for smart app opening (must be before /:alias route)
app.get('/ios-redirect.html', (req, res) => {
  const { deeplink, fallback } = req.query;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Opening Mora Finance App...</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 20px;
        }
        
        .container {
            max-width: 400px;
        }
        
        .logo {
            width: 80px;
            height: 80px;
            background: white;
            border-radius: 16px;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: #667eea;
            font-weight: bold;
        }
        
        h1 {
            font-size: 24px;
            margin-bottom: 10px;
        }
        
        p {
            font-size: 16px;
            opacity: 0.9;
            margin-bottom: 30px;
        }
        
        .btn {
            display: inline-block;
            background: white;
            color: #667eea;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin: 10px;
        }
        
        .spinner {
            border: 3px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top: 3px solid white;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .fallback {
            display: none;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">MF</div>
        <h1>Opening Mora Finance App...</h1>
        <p>If the app doesn't open automatically, you can download it from the App Store.</p>
        <div class="spinner"></div>
        
        <div class="fallback" id="fallback">
            <p>App not installed?</p>
            <a href="${fallback || 'https://apps.apple.com/us/app/mora-finance/id6444378741'}" class="btn">
                Download from App Store
            </a>
        </div>
    </div>

    <script>
        // Get URL parameters
        const deepLink = '${deeplink || 'com.moraapp.morainternal://'}';
        const fallbackUrl = '${fallback || 'https://apps.apple.com/us/app/mora-finance/id6444378741'}';
        
        console.log('Attempting to open app with:', deepLink);
        
        // Multiple methods to try opening the app
        function attemptAppOpen() {
            // Method 1: Direct window.location (most reliable on iOS)
            try {
                window.location.href = deepLink;
            } catch (e) {
                console.log('Method 1 failed:', e);
            }
            
            // Method 2: Create invisible iframe as backup
            setTimeout(() => {
                try {
                    const iframe = document.createElement('iframe');
                    iframe.style.display = 'none';
                    iframe.src = deepLink;
                    document.body.appendChild(iframe);
                    
                    setTimeout(() => {
                        if (document.body.contains(iframe)) {
                            document.body.removeChild(iframe);
                        }
                    }, 1000);
                } catch (e) {
                    console.log('Method 2 failed:', e);
                }
            }, 500);
            
            // Method 3: Create a temporary link and click it
            setTimeout(() => {
                try {
                    const link = document.createElement('a');
                    link.href = deepLink;
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } catch (e) {
                    console.log('Method 3 failed:', e);
                }
            }, 1000);
        }
        
        // Show fallback after delay
        function showFallback() {
            setTimeout(() => {
                document.getElementById('fallback').style.display = 'block';
                document.querySelector('.spinner').style.display = 'none';
                console.log('Showing fallback options');
            }, 2000); // Reduced from 3000 to 2000ms
        }
        
        // Detect if user left the page (app opened successfully)
        let appOpened = false;
        let startTime = Date.now();
        
        // Multiple event listeners to detect app opening
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                appOpened = true;
                console.log('App likely opened (visibilitychange)');
            }
        });
        
        window.addEventListener('blur', () => {
            appOpened = true;
            console.log('App likely opened (blur)');
        });
        
        window.addEventListener('pagehide', () => {
            appOpened = true;
            console.log('App likely opened (pagehide)');
        });
        
        // Start the process immediately
        attemptAppOpen();
        showFallback();
        
        // Fallback to App Store if app didn't open
        setTimeout(() => {
            if (!appOpened) {
                console.log('App did not open, redirecting to App Store');
                window.location.href = fallbackUrl;
            } else {
                console.log('App opened successfully');
            }
        }, 4000); // Reduced from 5000 to 4000ms
        
        // Add manual fallback button functionality
        setTimeout(() => {
            const fallbackBtn = document.querySelector('.btn');
            if (fallbackBtn) {
                fallbackBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Manual fallback clicked');
                    window.location.href = fallbackUrl;
                });
            }
        }, 100);
    </script>
</body>
</html>`;

  res.send(html);
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

    // UNIVERSAL LINKS ONLY - NO CUSTOM REDIRECTS
    // Just redirect to original URL and let iOS handle Universal Links naturally
    console.log(`Device: ${deviceInfo.isIOS ? 'iOS' : deviceInfo.isAndroid ? 'Android' : 'Desktop'}`);
    console.log(`Original URL: ${link.originalUrl}`);
    
    // Always redirect to original URL - iOS will intercept if app is installed
    redirectUrl = link.originalUrl;

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

// Static file serving (after specific routes to avoid conflicts)
app.use(express.static('public'));

// Root endpoint - serve dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize database and start server
async function start() {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(process.env.DB_PATH || './data/mora_shortlink.db');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`Created data directory: ${dataDir}`);
    }

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