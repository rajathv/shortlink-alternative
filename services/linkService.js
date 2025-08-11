const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class LinkService {
  constructor(database) {
    this.db = database;
  }

  async createLink(linkData) {
    const {
      originalUrl,
      customAlias,
      title = '',
      description = '',
      imageUrl = '',
      iosUrl = '',
      androidUrl = '',
      desktopUrl = ''
    } = linkData;

    // Generate alias
    let alias = customAlias;
    if (!alias) {
      alias = this.generateAlias();
      
      // Ensure alias is unique
      while (await this.getLink(alias)) {
        alias = this.generateAlias();
      }
    } else {
      // Check if custom alias already exists
      const existing = await this.getLink(alias);
      if (existing) {
        throw new Error('Custom alias already exists');
      }
    }

    const id = uuidv4();
    const createdAt = new Date().toISOString();

    const query = `
      INSERT INTO links (
        id, alias, original_url, title, description, image_url,
        ios_url, android_url, desktop_url, created_at, click_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `;

    await this.db.run(query, [
      id, alias, originalUrl, title, description, imageUrl,
      iosUrl, androidUrl, desktopUrl, createdAt
    ]);

    return {
      id,
      alias,
      originalUrl,
      title,
      description,
      imageUrl,
      iosUrl,
      androidUrl,
      desktopUrl,
      createdAt,
      clickCount: 0
    };
  }

  async getLink(alias) {
    const query = 'SELECT * FROM links WHERE alias = ?';
    const link = await this.db.get(query, [alias]);
    
    if (!link) return null;

    return {
      id: link.id,
      alias: link.alias,
      originalUrl: link.original_url,
      title: link.title,
      description: link.description,
      imageUrl: link.image_url,
      iosUrl: link.ios_url,
      androidUrl: link.android_url,
      desktopUrl: link.desktop_url,
      createdAt: link.created_at,
      clickCount: link.click_count
    };
  }

  async updateClickCount(alias) {
    const query = 'UPDATE links SET click_count = click_count + 1 WHERE alias = ?';
    await this.db.run(query, [alias]);
  }

  async getAllLinks() {
    const query = 'SELECT * FROM links ORDER BY created_at DESC';
    const links = await this.db.all(query);
    
    return links.map(link => ({
      id: link.id,
      alias: link.alias,
      originalUrl: link.original_url,
      title: link.title,
      description: link.description,
      imageUrl: link.image_url,
      iosUrl: link.ios_url,
      androidUrl: link.android_url,
      desktopUrl: link.desktop_url,
      createdAt: link.created_at,
      clickCount: link.click_count
    }));
  }

  async deleteLink(alias) {
    const query = 'DELETE FROM links WHERE alias = ?';
    await this.db.run(query, [alias]);
  }

  generateAlias(length = 6) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
  }

  generateSecureAlias() {
    return crypto.randomBytes(4).toString('hex');
  }
}

module.exports = LinkService;