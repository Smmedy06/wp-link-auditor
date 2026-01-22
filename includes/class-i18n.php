<?php
/**
 * Define the internationalization functionality
 */
class WP_Link_Auditor_i18n {

	/**
	 * Load the plugin text domain for translation.
	 */
	public function load_plugin_textdomain() {
		load_plugin_textdomain(
			'wp-link-auditor',
			false,
			dirname( WP_LINK_AUDITOR_PLUGIN_BASENAME ) . '/languages/'
		);
	}
}

