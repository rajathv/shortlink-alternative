const { v4: uuidv4 } = require('uuid');
const { detectDevice } = require('../utils/helpers');

class AnalyticsService {
  constructor(database) {
    this.db = database;
  }

  async trackClick(alias, clickData) {
    const { userAgent, ip, referer, timestamp } = clickData;
    const deviceInfo = detectDevice(userAgent);
    
    const id = uuidv4();
    const clickTime = timestamp || new Date().toISOString();

    // Insert click record
    const query = `
      INSERT INTO clicks (
        id, alias, ip, user_agent, referer, timestamp,
        browser, os, device_type, is_mobile, country
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.run(query, [
      id,
      alias,
      ip,
      userAgent,
      referer || '',
      clickTime,
      deviceInfo.browser,
      deviceInfo.os,
      deviceInfo.device,
      deviceInfo.isMobile ? 1 : 0,
      '' // Country detection can be added with GeoIP service
    ]);

    // Update link click count
    await this.updateLinkClickCount(alias);

    return id;
  }

  async updateLinkClickCount(alias) {
    const query = 'UPDATE links SET click_count = click_count + 1 WHERE alias = ?';
    await this.db.run(query, [alias]);
  }

  async getAnalytics(alias, options = {}) {
    const { startDate, endDate, limit = 1000 } = options;
    
    // Base query for clicks
    let whereClause = 'WHERE alias = ?';
    let params = [alias];

    if (startDate) {
      whereClause += ' AND timestamp >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND timestamp <= ?';
      params.push(endDate);
    }

    // Get basic stats
    const statsQuery = `
      SELECT COUNT(*) as total_clicks,
             COUNT(DISTINCT ip) as unique_visitors
      FROM clicks ${whereClause}
    `;
    const stats = await this.db.get(statsQuery, params);

    // Get click distribution by time (last 30 days, grouped by day)
    const timeQuery = `
      SELECT DATE(timestamp) as date, COUNT(*) as clicks
      FROM clicks ${whereClause}
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
      LIMIT 30
    `;
    const clicksByDate = await this.db.all(timeQuery, params);

    // Get browser statistics
    const browserQuery = `
      SELECT browser, COUNT(*) as count
      FROM clicks ${whereClause}
      GROUP BY browser
      ORDER BY count DESC
    `;
    const browserStats = await this.db.all(browserQuery, params);

    // Get OS statistics
    const osQuery = `
      SELECT os, COUNT(*) as count
      FROM clicks ${whereClause}
      GROUP BY os
      ORDER BY count DESC
    `;
    const osStats = await this.db.all(osQuery, params);

    // Get device type statistics
    const deviceQuery = `
      SELECT device_type, COUNT(*) as count,
             SUM(CASE WHEN is_mobile = 1 THEN 1 ELSE 0 END) as mobile_count
      FROM clicks ${whereClause}
      GROUP BY device_type
      ORDER BY count DESC
    `;
    const deviceStats = await this.db.all(deviceQuery, params);

    // Get referrer statistics
    const referrerQuery = `
      SELECT 
        CASE 
          WHEN referer = '' OR referer IS NULL THEN 'Direct'
          WHEN referer LIKE '%facebook%' THEN 'Facebook'
          WHEN referer LIKE '%twitter%' OR referer LIKE '%t.co%' THEN 'Twitter'
          WHEN referer LIKE '%linkedin%' THEN 'LinkedIn'
          WHEN referer LIKE '%whatsapp%' THEN 'WhatsApp'
          WHEN referer LIKE '%telegram%' THEN 'Telegram'
          WHEN referer LIKE '%google%' THEN 'Google'
          ELSE 'Other'
        END as source,
        COUNT(*) as count
      FROM clicks ${whereClause}
      GROUP BY source
      ORDER BY count DESC
    `;
    const referrerStats = await this.db.all(referrerQuery, params);

    // Get recent clicks
    const recentClicksQuery = `
      SELECT timestamp, ip, browser, os, referer
      FROM clicks ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `;
    const recentClicks = await this.db.all(recentClicksQuery, params);

    return {
      alias,
      totalClicks: stats.total_clicks || 0,
      uniqueVisitors: stats.unique_visitors || 0,
      clicksByDate,
      browserStats,
      osStats,
      deviceStats,
      referrerStats,
      recentClicks,
      generatedAt: new Date().toISOString()
    };
  }

  async getTopLinks(limit = 10) {
    const query = `
      SELECT alias, original_url, title, click_count, created_at
      FROM links
      ORDER BY click_count DESC
      LIMIT ?
    `;
    return await this.db.all(query, [limit]);
  }

  async getGlobalStats() {
    const totalLinksQuery = 'SELECT COUNT(*) as count FROM links';
    const totalClicksQuery = 'SELECT COUNT(*) as count FROM clicks';
    const totalUniqueVisitorsQuery = 'SELECT COUNT(DISTINCT ip) as count FROM clicks';
    
    const [totalLinks, totalClicks, uniqueVisitors] = await Promise.all([
      this.db.get(totalLinksQuery),
      this.db.get(totalClicksQuery),
      this.db.get(totalUniqueVisitorsQuery)
    ]);

    // Get clicks by date for the last 30 days
    const clicksByDateQuery = `
      SELECT DATE(timestamp) as date, COUNT(*) as clicks
      FROM clicks
      WHERE timestamp >= date('now', '-30 days')
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `;
    const clicksByDate = await this.db.all(clicksByDateQuery);

    return {
      totalLinks: totalLinks.count,
      totalClicks: totalClicks.count,
      uniqueVisitors: uniqueVisitors.count,
      clicksByDate
    };
  }

  async cleanOldData(daysToKeep = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const query = 'DELETE FROM clicks WHERE timestamp < ?';
    const result = await this.db.run(query, [cutoffDate.toISOString()]);
    
    return result.changes;
  }
}

module.exports = AnalyticsService;