# WP Link Auditor

![WordPress](https://img.shields.io/badge/WordPress-5.8%2B-blue.svg?style=flat-square&logo=wordpress)
![PHP](https://img.shields.io/badge/PHP-7.4%2B-777BB4.svg?style=flat-square&logo=php)
![License](https://img.shields.io/badge/License-GPL%20v2%2B-green.svg?style=flat-square)
![Version](https://img.shields.io/badge/Version-1.8.5-blue.svg?style=flat-square)
![React](https://img.shields.io/badge/React-19-61DAFB.svg?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg?style=flat-square&logo=typescript)

A powerful WordPress plugin to audit, analyze, and bulk update links across your WordPress site. Built with React and TypeScript for a modern admin experience.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Development](#development)
- [API Documentation](#api-documentation)
- [SEO Integration](#seo-plugin-integration)
- [Security](#security)
- [Requirements](#requirements)
- [License](#license)
- [Credits](#credits)

## Features

- **Link Auditing**: Scan all published posts and identify internal and external links
- **Link Status Checking**: Verify if external links are working or broken with real-time status checks
- **Bulk Link Updates**: Update link attributes (nofollow, target, rel) across multiple posts
- **Focus Keyphrase Management**: Add and manage SEO focus keyphrases with full compatibility for:
  - Yoast SEO
  - Rank Math SEO
  - Standalone focus keyword storage (works without SEO plugins)
- **Bulk Focus Keyword Operations**: Quickly identify and fill missing focus keywords across your site
- **Modern UI**: Beautiful, responsive interface built with React 19, TypeScript, and Tailwind CSS
- **WordPress REST API Integration**: Fully integrated with WordPress REST API for seamless data synchronization
- **Post Type Support**: Filter and manage focus keywords by post type

## Installation

### Quick Start

1. **Upload the plugin**:
   - Upload the plugin files to the `/wp-content/plugins/wp-link-auditor` directory, or
   - Install the plugin through the WordPress plugins screen directly

2. **Activate the plugin** through the 'Plugins' screen in WordPress

3. **Build the admin interface**:
   ```bash
   cd admin
   npm install
   npm run build
   ```

4. **Access the plugin** via **Link Auditor** in the WordPress admin menu

> **Note**: The admin interface must be built before use. See [Development](#development) section for detailed build instructions.

## Development

### Prerequisites

- **Node.js 18+** and npm
- **WordPress 5.8+**
- **PHP 7.4+**
- **Modern browser** with JavaScript enabled

### Building the Admin Interface

1. Navigate to the admin directory:
   ```bash
   cd admin
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```
   This creates optimized production files in the `admin/build` directory.

4. **Development mode with hot reload**:
   ```bash
   npm run dev
   ```
   This starts a Vite development server with hot module replacement.

5. **Preview production build**:
   ```bash
   npm run preview
   ```

### Technology Stack

| Category | Technology |
|----------|-----------|
| **Frontend** | React 19, TypeScript, Tailwind CSS |
| **Build Tool** | Vite 6 |
| **Backend** | WordPress REST API, PHP 7.4+ |

### Plugin Structure

```
wp-link-auditor/
├── wp-link-auditor.php              # Main plugin file
├── includes/                         # PHP classes
│   ├── class-wp-link-auditor.php    # Core plugin class
│   ├── class-admin.php               # Admin interface handler
│   ├── class-api.php                 # REST API endpoints
│   ├── class-link-checker.php       # Link status verification
│   ├── class-seo-integration.php    # SEO plugin integration
│   ├── class-activator.php          # Plugin activation
│   ├── class-deactivator.php        # Plugin deactivation
│   ├── class-i18n.php               # Internationalization
│   └── class-loader.php             # Autoloader
├── admin/                            # React admin interface
│   ├── src/
│   │   ├── components/              # React components
│   │   ├── services/                # API service layer
│   │   ├── utils/                   # Utility functions
│   │   ├── types.ts                 # TypeScript definitions
│   │   ├── index.tsx                # Entry point
│   │   └── index.css                # Styles
│   ├── build/                       # Built files (generated)
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
└── README.md
```

## Usage

1. **Navigate to Link Auditor** in the WordPress admin menu
2. **Browse all published posts** - View all your posts in a clean, organized interface
3. **Expand posts** - Click on any post to expand and see its links
4. **Update link attributes** - Modify link attributes (nofollow, new tab, rel) as needed
5. **Check link status** - Verify external links are working or identify broken links
6. **Focus Keyword Assistant**:
   - View posts missing focus keywords for active SEO plugins
   - Bulk fill missing Yoast SEO or Rank Math focus keywords
   - Add individual focus keyphrases for any post
   - Filter by post type
   - Overwrite existing keywords or skip posts that already have them
7. **Save changes** - All changes are synchronized with WordPress and your SEO plugin

## API Documentation

All endpoints are prefixed with `/wp-json/wp-link-auditor/v1/` and require authentication (user must have `edit_posts` capability).

### Posts

#### `GET /posts`
Get all published posts.

**Returns**: Array of post objects with links, focus keywords, and metadata

#### `GET /posts/{id}`
Get single post by ID.

**Parameters**:
- `id` (integer) - Post ID

**Returns**: Post object with full details

#### `POST /posts/{id}`
Update post content and focus keyword.

**Parameters**:
- `id` (integer) - Post ID

**Request Body**:
```json
{
  "content": "Updated post content",
  "focusKeyphrase": "optional focus keyword"
}
```

**Returns**: Updated post object

### Link Checking

#### `POST /check-link`
Check if a link is working.

**Request Body**:
```json
{
  "url": "https://example.com"
}
```

**Returns**: Link status and debug information

### SEO Focus Keywords

#### `GET /seo/focus-keywords/missing`
List posts without focus keywords.

**Query Parameters**:
- `post_type` (optional, string) - Filter by post type (default: 'post')

**Returns**: List of posts missing focus keywords for active SEO plugins

#### `POST /seo/focus-keywords/bulk`
Bulk update focus keywords.

**Request Body**:
```json
{
  "keywords": [
    {
      "postId": 123,
      "focusKeyword": "example keyword"
    }
  ],
  "syncYoast": true,
  "syncRankMath": true,
  "overwriteExisting": true
}
```

**Returns**: Updated and skipped post IDs, remaining missing keywords

## SEO Plugin Integration

WP Link Auditor seamlessly integrates with popular SEO plugins:

### Yoast SEO
- Automatically detects if Yoast SEO is active
- Syncs focus keywords to `_yoast_wpseo_focuskw` meta key
- Works with Yoast's focus keyword system

### Rank Math SEO
- Automatically detects if Rank Math is active
- Syncs focus keywords to `_rank_math_focus_keyword` meta key
- Compatible with Rank Math's focus keyword feature

### Standalone Mode
- Works without any SEO plugins installed
- Stores focus keywords in `_wp_link_auditor_focus_keyphrase` meta key
- Can be used as a standalone focus keyword management system

## Security

WP Link Auditor follows WordPress security best practices:

| Security Feature | Implementation |
|-----------------|----------------|
| **Authentication** | All API endpoints require WordPress user authentication |
| **Capability Checks** | Users must have `edit_posts` capability to access the plugin |
| **Permission Validation** | Individual post updates check `edit_post` capability |
| **Input Sanitization** | All user inputs are sanitized using WordPress functions |
| **CSRF Protection** | WordPress nonces are used for form submissions |
| **URL Validation** | Link URLs are validated before processing |
| **SQL Injection Protection** | All database queries use WordPress prepared statements |

## Requirements

| Requirement | Minimum Version |
|------------|----------------|
| **WordPress** | 5.8 or higher |
| **PHP** | 7.4 or higher |
| **Node.js** | 18+ (for building admin interface) |
| **Browser** | Modern browser with JavaScript enabled |

## License

This plugin is licensed under the **GPL v2 or later**.

```
Copyright (C) 2025 Smmedy06

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.
```

## Credits

**Developed by** [Smmedy06](https://github.com/Smmedy06)

---

<div align="center">

**If you find this plugin useful, please consider giving it a star!**

Made with love for the WordPress community

</div>
