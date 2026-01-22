<?php
/**
 * Plugin Name: WP Link Auditor
 * Description: A powerful WordPress plugin to audit, analyze, and bulk update links across your WordPress site.
 * Version: 1.8.5
 * Author: Andrew Murray
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: wp-link-auditor
 * Domain Path: /languages
 * Requires at least: 5.8
 * Requires PHP: 7.4
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Currently plugin version.
 */
define( 'WP_LINK_AUDITOR_VERSION', '1.8.5' );
define( 'WP_LINK_AUDITOR_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'WP_LINK_AUDITOR_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'WP_LINK_AUDITOR_PLUGIN_BASENAME', plugin_basename( __FILE__ ) );

/**
 * The code that runs during plugin activation.
 */
function activate_wp_link_auditor() {
	require_once WP_LINK_AUDITOR_PLUGIN_DIR . 'includes/class-activator.php';
	WP_Link_Auditor_Activator::activate();
}

/**
 * The code that runs during plugin deactivation.
 */
function deactivate_wp_link_auditor() {
	require_once WP_LINK_AUDITOR_PLUGIN_DIR . 'includes/class-deactivator.php';
	WP_Link_Auditor_Deactivator::deactivate();
}

register_activation_hook( __FILE__, 'activate_wp_link_auditor' );
register_deactivation_hook( __FILE__, 'deactivate_wp_link_auditor' );

/**
 * The core plugin class that is used to define internationalization,
 * admin-specific hooks, and public-facing site hooks.
 */
require WP_LINK_AUDITOR_PLUGIN_DIR . 'includes/class-wp-link-auditor.php';

/**
 * Begins execution of the plugin.
 */
function run_wp_link_auditor() {
	$plugin = new WP_Link_Auditor();
	$plugin->run();
}
run_wp_link_auditor();

