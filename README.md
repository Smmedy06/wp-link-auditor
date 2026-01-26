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

### Troubleshooting Upload Issues

If you encounter errors when uploading the plugin to different WordPress sites, this is typically due to server configuration differences. Here are the most common issues and solutions:

#### Common Upload Errors

**1. "The link you followed has expired" Error**
- **Cause**: This misleading error usually indicates your plugin ZIP file exceeds the server's upload size limit
- **Solution**: 
  - Check your upload limit: Go to **Media > Add New** in WordPress to see "Maximum upload file size"
  - If your plugin ZIP exceeds this limit, you need to increase server limits (see below)
  - Alternatively, use FTP to upload the plugin manually

**2. "PCLZIP_ERR_BAD_FORMAT" or "Corrupted ZIP File" Error**
- **Cause**: ZIP file structure is incorrect or file is corrupted
- **Solution**:
  - Ensure the ZIP contains a single folder named `wp-link-auditor` (not files at the root)
  - Re-create the ZIP file ensuring proper structure
  - Verify the ZIP file isn't corrupted by testing extraction locally

**3. "Destination folder already exists" Error**
- **Cause**: Plugin folder already exists in `/wp-content/plugins/` from a previous installation
- **Solution**:
  - Access your site via FTP or File Manager
  - Navigate to `/wp-content/plugins/`
  - Delete the existing `wp-link-auditor` folder
  - Retry the installation

**4. "Memory exhausted" or "Fatal error: Allowed memory size"**
- **Cause**: PHP memory limit is too low
- **Solution**: Increase PHP memory limit (see Server Configuration below)

**5. "Maximum execution time exceeded"**
- **Cause**: Server timeout limit is too low for large plugin uploads
- **Solution**: Increase execution time limit (see Server Configuration below)

**6. "There has been a critical error on this website" (During Installation)**
- **Cause**: This is a PHP fatal error occurring during plugin installation/activation. Common causes:
  - Missing required files in the ZIP package
  - PHP syntax error in one of the plugin files
  - Incorrect ZIP structure causing file path issues
  - PHP version incompatibility (requires PHP 7.4+)
  - Missing WordPress core functions or constants
- **Solution**:
  1. **Check WordPress debug log**: Enable `WP_DEBUG` in `wp-config.php`:
     ```php
     define('WP_DEBUG', true);
     define('WP_DEBUG_LOG', true);
     define('WP_DEBUG_DISPLAY', false);
     ```
     Then check `/wp-content/debug.log` for the specific error message.
  
  2. **Verify ZIP structure**: Ensure the ZIP contains all files in the correct structure (see "Creating a Proper Distribution ZIP" below)
  
  3. **Check PHP version**: Ensure the server is running PHP 7.4 or higher
  
  4. **Verify all files are included**: The following files MUST be in the ZIP:
     - `wp-link-auditor.php` (main plugin file)
     - `includes/class-activator.php`
     - `includes/class-deactivator.php`
     - `includes/class-wp-link-auditor.php`
     - `includes/class-loader.php`
     - `includes/class-i18n.php`
     - `includes/class-admin.php`
     - `includes/class-api.php`
     - `includes/class-link-checker.php`
     - `includes/class-seo-integration.php`
  
  5. **Try manual installation**: Use FTP to upload the plugin folder directly (see Alternative Installation Methods)
  
  6. **Check for plugin conflicts**: Temporarily deactivate all other plugins and try installing again

#### Server Configuration Fixes

Different hosting providers have different default limits. You may need to adjust these settings:

**Option 1: Via php.ini (if you have access)**
```ini
upload_max_filesize = 128M
post_max_size = 128M
memory_limit = 256M
max_execution_time = 300
max_input_time = 300
```

**Option 2: Via wp-config.php**
Add these lines to your `wp-config.php` file (before "That's all, stop editing!"):
```php
define('WP_MEMORY_LIMIT', '256M');
define('WP_MAX_MEMORY_LIMIT', '512M');
@ini_set('upload_max_filesize', '128M');
@ini_set('post_max_size', '128M');
@ini_set('max_execution_time', '300');
```

**Option 3: Via .htaccess (for Apache servers)**
Add these lines to your `.htaccess` file:
```apache
php_value upload_max_filesize 128M
php_value post_max_size 128M
php_value memory_limit 256M
php_value max_execution_time 300
php_value max_input_time 300
```

**Option 4: Contact Your Hosting Provider**
If you don't have access to server configuration files, contact your hosting provider and ask them to:
- Increase `upload_max_filesize` to at least 128M
- Increase `post_max_size` to at least 128M
- Increase `memory_limit` to at least 256M
- Increase `max_execution_time` to at least 300 seconds

#### Alternative Installation Methods

If dashboard upload continues to fail:

**Method 1: FTP/File Manager Upload**
1. Extract the plugin ZIP file on your computer
2. Connect to your site via FTP or use your hosting File Manager
3. Navigate to `/wp-content/plugins/`
4. Upload the entire `wp-link-auditor` folder
5. Activate the plugin from WordPress admin

**Method 2: Use "Upload Larger Plugins" Plugin**
Install the [Upload Larger Plugins](https://wordpress.org/plugins/upload-larger-plugins/) plugin, which uploads files in chunks to bypass size restrictions.

**Method 3: Reduce Plugin Size Before Upload**
If your plugin includes `node_modules` or build artifacts:
1. Remove `admin/node_modules/` folder (if present)
2. Remove `admin/build/` folder (you can rebuild after installation)
3. Re-create the ZIP file
4. Upload and then build the admin interface after installation

#### Why Different Sites Show Different Errors

Different hosting providers and server configurations have varying default limits:
- **Shared hosting**: Often has stricter limits (2-10MB uploads)
- **VPS/Dedicated servers**: Usually more flexible limits
- **Managed WordPress hosting**: May have optimized but still limited settings
- **Local development**: Typically has higher limits

The same plugin ZIP may work on one site but fail on another due to these server differences.

#### Creating a Proper Distribution ZIP

To minimize upload issues, create your distribution ZIP correctly:

**Correct ZIP Structure:**
```
wp-link-auditor.zip
??? wp-link-auditor/          ? Single folder with plugin name
    ??? wp-link-auditor.php
    ??? includes/
    ??? admin/
    ??? README.md
```

**Incorrect ZIP Structure (will cause errors):**
```
wp-link-auditor.zip
??? wp-link-auditor.php       ? Files at root (WRONG!)
??? includes/
??? admin/
```

**Files to EXCLUDE from distribution ZIP:**
- `admin/node_modules/` (can be rebuilt after installation)
- `admin/build/` (can be rebuilt after installation)
- `.git/` and `.gitignore`
- Development files (`.vscode/`, `.idea/`, etc.)
- `package-lock.json` (optional, but not needed for distribution)

**Recommended ZIP Creation Process:**
1. Copy the plugin folder to a temporary location
2. Remove `admin/node_modules/` if it exists
3. Remove `admin/build/` if it exists (users will build it)
4. Create a ZIP file containing only the `wp-link-auditor` folder
5. Test the ZIP by extracting it to verify structure

**Using Command Line (Linux/Mac):**
```bash
cd /path/to/parent/directory
zip -r wp-link-auditor.zip wp-link-auditor/ -x "*/node_modules/*" "*/build/*" "*/.git/*"
```

**Using Command Line (Windows PowerShell):**
```powershell
Compress-Archive -Path wp-link-auditor -DestinationPath wp-link-auditor.zip
```

#### Diagnostic Steps for Critical Errors

If you encounter a critical error during installation, follow these steps to identify the exact issue:

**Step 1: Enable WordPress Debug Mode**
Add these lines to your `wp-config.php` file (before "That's all, stop editing!"):
```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
@ini_set('display_errors', 0);
```

**Step 2: Check the Error Log**
After attempting to install the plugin, check the following locations for error messages:
- `/wp-content/debug.log` (WordPress debug log)
- Your hosting control panel's error log
- Your site admin email (WordPress sends error details there)

**Step 3: Common Error Messages and Fixes**

| Error Message | Likely Cause | Solution |
|--------------|--------------|----------|
| `Class 'WP_Link_Auditor_Activator' not found` | Missing `class-activator.php` file | Verify all files are in the ZIP |
| `Call to undefined function` | Missing WordPress core file | Update WordPress to 5.8+ |
| `Parse error: syntax error` | PHP version too old or syntax error | Update PHP to 7.4+ or check file syntax |
| `Fatal error: Allowed memory size` | PHP memory limit too low | Increase memory_limit (see Server Configuration) |
| `file_exists(): open_basedir restriction` | Server security restrictions | Contact hosting provider |

**Step 4: Verify File Integrity**
1. Extract the ZIP file locally
2. Verify all files listed in "Verification Checklist" are present
3. Check file sizes (empty files indicate corruption)
4. Re-create the ZIP if any files are missing or corrupted

#### Verification Checklist

Before reporting an issue, verify:
- [ ] ZIP file structure is correct (single `wp-link-auditor` folder inside)
- [ ] ZIP file size is reasonable (check if it includes unnecessary files)
- [ ] Server upload limits are sufficient (check via Media > Add New)
- [ ] No existing plugin folder conflicts
- [ ] File permissions are correct (755 for folders, 644 for files)
- [ ] PHP version meets requirements (7.4+)
- [ ] WordPress version meets requirements (5.8+)
- [ ] All required plugin files are present in the ZIP
- [ ] Debug log has been checked for specific error messages

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
??? wp-link-auditor.php              # Main plugin file
??? includes/                         # PHP classes
?   ??? class-wp-link-auditor.php    # Core plugin class
?   ??? class-admin.php               # Admin interface handler
?   ??? class-api.php                 # REST API endpoints
?   ??? class-link-checker.php       # Link status verification
?   ??? class-seo-integration.php    # SEO plugin integration
?   ??? class-activator.php          # Plugin activation
?   ??? class-deactivator.php        # Plugin deactivation
?   ??? class-i18n.php               # Internationalization
?   ??? class-loader.php             # Autoloader
??? admin/                            # React admin interface
?   ??? src/
?   ?   ??? components/              # React components
?   ?   ??? services/                # API service layer
?   ?   ??? utils/                   # Utility functions
?   ?   ??? types.ts                 # TypeScript definitions
?   ?   ??? index.tsx                # Entry point
?   ?   ??? index.css                # Styles
?   ??? build/                       # Built files (generated)
?   ??? package.json
?   ??? vite.config.ts
?   ??? tailwind.config.js
?   ??? tsconfig.json
??? README.md
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
