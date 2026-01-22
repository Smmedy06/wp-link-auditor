<?php
/**
 * The core plugin class.
 */
class WP_Link_Auditor {

	/**
	 * The loader that's responsible for maintaining and registering all hooks that power
	 * the plugin.
	 */
	protected $loader;

	/**
	 * The unique identifier of this plugin.
	 */
	protected $plugin_name;

	/**
	 * The current version of the plugin.
	 */
	protected $version;

	/**
	 * Define the core functionality of the plugin.
	 */
	public function __construct() {
		$this->version = WP_LINK_AUDITOR_VERSION;
		$this->plugin_name = 'wp-link-auditor';

		$this->load_dependencies();
		$this->set_locale();
		$this->define_admin_hooks();
		$this->define_api_hooks();
	}

	/**
	 * Load the required dependencies for this plugin.
	 */
	private function load_dependencies() {
		require_once WP_LINK_AUDITOR_PLUGIN_DIR . 'includes/class-loader.php';
		require_once WP_LINK_AUDITOR_PLUGIN_DIR . 'includes/class-i18n.php';
		require_once WP_LINK_AUDITOR_PLUGIN_DIR . 'includes/class-admin.php';
		require_once WP_LINK_AUDITOR_PLUGIN_DIR . 'includes/class-api.php';
		require_once WP_LINK_AUDITOR_PLUGIN_DIR . 'includes/class-link-checker.php';
		require_once WP_LINK_AUDITOR_PLUGIN_DIR . 'includes/class-seo-integration.php';

		$this->loader = new WP_Link_Auditor_Loader();
	}

	/**
	 * Define the locale for this plugin for internationalization.
	 */
	private function set_locale() {
		$plugin_i18n = new WP_Link_Auditor_i18n();
		$this->loader->add_action( 'plugins_loaded', $plugin_i18n, 'load_plugin_textdomain' );
	}

	/**
	 * Register all of the hooks related to the admin area functionality
	 * of the plugin.
	 */
	private function define_admin_hooks() {
		$plugin_admin = new WP_Link_Auditor_Admin( $this->get_plugin_name(), $this->get_version() );
		
		$this->loader->add_action( 'admin_menu', $plugin_admin, 'add_admin_menu' );
		$this->loader->add_action( 'admin_enqueue_scripts', $plugin_admin, 'enqueue_styles' );
		$this->loader->add_action( 'admin_enqueue_scripts', $plugin_admin, 'enqueue_scripts' );
	}

	/**
	 * Register all of the hooks related to the REST API functionality
	 * of the plugin.
	 */
	private function define_api_hooks() {
		$plugin_api = new WP_Link_Auditor_API( $this->get_plugin_name(), $this->get_version() );
		
		$this->loader->add_action( 'rest_api_init', $plugin_api, 'register_routes' );
		
		// Register Rank Math preservation hooks to ensure focus keywords persist
		$this->loader->add_action( 'save_post', 'WP_Link_Auditor_SEO_Integration', 'preserve_rank_math_focus_keyword', 20 );
		$this->loader->add_action( 'edit_post', 'WP_Link_Auditor_SEO_Integration', 'preserve_rank_math_focus_keyword', 20 );
		$this->loader->add_action( 'rank_math/save_post', 'WP_Link_Auditor_SEO_Integration', 'preserve_rank_math_focus_keyword', 20 );
		$this->loader->add_action( 'shutdown', 'WP_Link_Auditor_SEO_Integration', 'safeguard_rank_math_focus_keyword', 999 );
	}

	/**
	 * Run the loader to execute all of the hooks with WordPress.
	 */
	public function run() {
		$this->loader->run();
	}

	/**
	 * The name of the plugin used to uniquely identify it within the context of
	 * WordPress and to define internationalization functionality.
	 */
	public function get_plugin_name() {
		return $this->plugin_name;
	}

	/**
	 * The reference to the class that orchestrates the hooks with the plugin.
	 */
	public function get_loader() {
		return $this->loader;
	}

	/**
	 * Retrieve the version number of the plugin.
	 */
	public function get_version() {
		return $this->version;
	}
}

