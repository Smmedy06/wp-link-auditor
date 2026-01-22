<?php
/**
 * The admin-specific functionality of the plugin.
 */
class WP_Link_Auditor_Admin {

	/**
	 * The ID of this plugin.
	 */
	private $plugin_name;

	/**
	 * The version of this plugin.
	 */
	private $version;

	/**
	 * Initialize the class and set its properties.
	 */
	public function __construct( $plugin_name, $version ) {
		$this->plugin_name = $plugin_name;
		$this->version = $version;
	}

	/**
	 * Register the stylesheets for the admin area.
	 */
	public function enqueue_styles() {
		$screen = get_current_screen();
		if ( $screen && $screen->id === 'toplevel_page_wp-link-auditor' ) {
			// Add cache busting with file modification time
			$css_file = WP_LINK_AUDITOR_PLUGIN_DIR . 'admin/build/index.css';
			$css_version = file_exists( $css_file ) ? filemtime( $css_file ) : $this->version;
			
			wp_enqueue_style(
				$this->plugin_name,
				WP_LINK_AUDITOR_PLUGIN_URL . 'admin/build/index.css',
				array(),
				$css_version,
				'all'
			);
		}
	}

	/**
	 * Register the JavaScript for the admin area.
	 */
	public function enqueue_scripts( $hook ) {
		$screen = get_current_screen();
		if ( $screen && $screen->id === 'toplevel_page_wp-link-auditor' ) {
			// Add cache busting with file modification time
			$js_file = WP_LINK_AUDITOR_PLUGIN_DIR . 'admin/build/index.js';
			$js_version = file_exists( $js_file ) ? filemtime( $js_file ) : $this->version;
			
			wp_enqueue_script(
				$this->plugin_name . '-react',
				WP_LINK_AUDITOR_PLUGIN_URL . 'admin/build/index.js',
				array(),
				$js_version,
				true
			);

			// Localize script with WordPress data
			wp_localize_script(
				$this->plugin_name . '-react',
				'wpLinkAuditor',
				array(
					'apiUrl' => rest_url( 'wp-link-auditor/v1/' ),
					'nonce' => wp_create_nonce( 'wp_rest' ),
					'adminUrl' => admin_url(),
					'siteUrl' => home_url(),
					'seo' => WP_Link_Auditor_SEO_Integration::get_active_plugins_info(),
					'currentUser' => array(
						'id' => get_current_user_id(),
						'canEditPosts' => current_user_can( 'edit_posts' ),
					),
				)
			);
		}
	}

	/**
	 * Register the administration menu for this plugin into the WordPress Dashboard menu.
	 */
	public function add_admin_menu() {
		add_menu_page(
			__( 'Link Auditor', 'wp-link-auditor' ),
			__( 'Link Auditor', 'wp-link-auditor' ),
			'edit_posts',
			'wp-link-auditor',
			array( $this, 'display_admin_page' ),
			'dashicons-admin-links',
			30
		);
	}

	/**
	 * Render the admin page
	 */
	public function display_admin_page() {
		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_die( __( 'You do not have sufficient permissions to access this page.', 'wp-link-auditor' ) );
		}
		?>
		<div class="wrap">
			<div id="wp-link-auditor-root"></div>
		</div>
		<?php
	}
}

