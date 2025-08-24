# Apple App Site Association (AASA) Setup Guide

## Overview

This guide explains how to configure and deploy Apple App Site Association (AASA) support for iOS Universal Links in the Mora Shortlink service.

## What are iOS Universal Links?

Universal Links allow iOS apps to handle web links directly, providing a seamless user experience by opening the app instead of Safari when the app is installed. When the app is not installed, the link falls back to normal web behavior.

## Configuration

### AASA Configuration File

The AASA configuration is stored in `config/apple-app-site-association.json`. This file defines which iOS apps can handle Universal Links from your domain.

**Default Configuration:**
```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["TEAMID.com.morafinance.app"],
        "components": [
          {
            "/": "/",
            "comment": "Matches all shortlinks for Universal Links"
          }
        ]
      }
    ]
  }
}
```

### Configuration Parameters

- **appIDs**: Array of app identifiers in the format `TEAMID.BUNDLEID`
  - `TEAMID`: Your Apple Developer Team ID (10-character alphanumeric)
  - `BUNDLEID`: Your app's bundle identifier (e.g., `com.morafinance.app`)

- **components**: Array of URL pattern matching rules
  - `/`: The path pattern to match (use `/` to match all paths)
  - `comment`: Optional description of the rule

### Updating Configuration

1. **Edit the configuration file:**
   ```bash
   nano config/apple-app-site-association.json
   ```

2. **Update app identifiers:**
   Replace `TEAMID` with your actual Apple Developer Team ID:
   ```json
   "appIDs": ["ABC1234567.com.morafinance.app"]
   ```

3. **Add multiple apps (if needed):**
   ```json
   "appIDs": [
     "ABC1234567.com.morafinance.app",
     "ABC1234567.com.morafinance.app.staging"
   ]
   ```

4. **Restart the service:**
   The configuration is loaded on startup, so restart the service after changes:
   ```bash
   docker-compose restart mora-shortlink
   ```

## Deployment

### Docker Deployment

1. **Build and deploy:**
   ```bash
   docker-compose up -d --build
   ```

2. **Verify AASA endpoint:**
   ```bash
   curl -H "Accept: application/json" \
        https://link.morafinance.com/.well-known/apple-app-site-association
   ```

### Nginx Configuration

The nginx configuration automatically handles AASA file serving with proper headers:

- **Content-Type**: `application/json`
- **Cache-Control**: `no-cache, no-store, must-revalidate`
- **No rate limiting** for AASA requests
- **Available on both HTTP and HTTPS** for development flexibility

### SSL Certificate Requirements

Universal Links require HTTPS in production. Ensure your SSL certificate is properly configured:

1. **Verify SSL certificate:**
   ```bash
   openssl s_client -connect link.morafinance.com:443 -servername link.morafinance.com
   ```

2. **Check certificate validity:**
   ```bash
   curl -I https://link.morafinance.com/.well-known/apple-app-site-association
   ```

## Testing and Validation

### Apple's AASA Validator

Use Apple's official validator to test your AASA file:

1. **Visit Apple's validator:**
   https://search.developer.apple.com/appsearch-validation-tool/

2. **Enter your domain:**
   `link.morafinance.com`

3. **Verify the results show your app configuration**

### Manual Testing

1. **Test AASA endpoint directly:**
   ```bash
   curl -v https://link.morafinance.com/.well-known/apple-app-site-association
   ```

2. **Verify response headers:**
   ```
   Content-Type: application/json
   Cache-Control: no-cache, no-store, must-revalidate
   ```

3. **Validate JSON structure:**
   ```bash
   curl -s https://link.morafinance.com/.well-known/apple-app-site-association | jq .
   ```

### iOS Device Testing

1. **Install your iOS app** on a test device
2. **Create a test shortlink** using the dashboard
3. **Share the shortlink** via Messages, Mail, or Safari
4. **Tap the link** - it should open in your app (not Safari)

### Debugging Universal Links

If Universal Links aren't working:

1. **Check AASA file accessibility:**
   ```bash
   curl -I https://link.morafinance.com/.well-known/apple-app-site-association
   ```

2. **Verify app configuration in Xcode:**
   - Associated Domains capability is enabled
   - Domain is added: `applinks:link.morafinance.com`

3. **Check iOS device logs:**
   - Connect device to Xcode
   - Open Console app
   - Filter for "swcd" (Shared Web Credentials Daemon)

## Troubleshooting

### Common Issues

1. **AASA file not found (404)**
   - Check nginx configuration
   - Verify Express route is properly configured
   - Restart nginx: `docker-compose restart nginx`

2. **Invalid JSON response**
   - Check configuration file syntax
   - Review server logs: `docker-compose logs mora-shortlink`
   - Validate JSON: `cat config/apple-app-site-association.json | jq .`

3. **Universal Links not working**
   - Verify HTTPS is working
   - Check Apple's validator results
   - Ensure app has Associated Domains capability
   - Test with a fresh iOS app install

4. **Configuration not updating**
   - Restart the service after config changes
   - Clear iOS cache by reinstalling the app
   - Check file permissions on config file

### Log Analysis

Monitor server logs for AASA-related messages:

```bash
# View startup logs
docker-compose logs mora-shortlink | grep -i aasa

# Monitor real-time logs
docker-compose logs -f mora-shortlink
```

Look for these log messages:
- `AASA configuration loaded successfully`
- `AASA configuration validation failed`
- `Default AASA configuration file created`

### Performance Monitoring

Monitor AASA endpoint performance:

```bash
# Test response time
curl -w "@curl-format.txt" -o /dev/null -s \
  https://link.morafinance.com/.well-known/apple-app-site-association
```

Create `curl-format.txt`:
```
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
```

## Security Considerations

1. **File Permissions:**
   ```bash
   chmod 644 config/apple-app-site-association.json
   ```

2. **Configuration Validation:**
   - The system validates configuration on startup
   - Invalid configurations fall back to safe defaults
   - All app IDs are validated for proper format

3. **Rate Limiting:**
   - AASA endpoint has no rate limiting (required by Apple)
   - Monitor for abuse in nginx access logs

4. **SSL/TLS:**
   - Always use HTTPS in production
   - Ensure certificate is valid and trusted
   - Monitor certificate expiration

## Integration with iOS App

### Xcode Configuration

1. **Enable Associated Domains:**
   - Select your app target
   - Go to Signing & Capabilities
   - Add Associated Domains capability

2. **Add Domain:**
   ```
   applinks:link.morafinance.com
   ```

3. **Handle Universal Links in code:**
   ```swift
   func application(_ application: UIApplication, 
                   continue userActivity: NSUserActivity, 
                   restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
       
       guard userActivity.activityType == NSUserActivityTypeBrowsingWeb,
             let url = userActivity.webpageURL else {
           return false
       }
       
       // Handle the Universal Link URL
       handleUniversalLink(url)
       return true
   }
   ```

### Testing in Development

For development testing, you can use HTTP (though production requires HTTPS):

```
applinks:link.morafinance.com
```

The nginx configuration serves AASA files on both HTTP and HTTPS for development flexibility.

## Maintenance

### Regular Tasks

1. **Monitor AASA endpoint availability**
2. **Update app IDs when adding new apps**
3. **Validate configuration after changes**
4. **Monitor Universal Link performance**
5. **Keep SSL certificates updated**

### Configuration Updates

When updating the AASA configuration:

1. Edit `config/apple-app-site-association.json`
2. Validate JSON syntax
3. Restart the service
4. Test with Apple's validator
5. Verify Universal Links still work

### Backup and Recovery

Backup your AASA configuration:

```bash
cp config/apple-app-site-association.json config/apple-app-site-association.json.backup
```

The system will automatically create a default configuration if the file is missing or invalid.