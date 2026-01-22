<?php
/**
 * Fired during plugin activation
 */
class WP_Link_Auditor_Activator {

	/**
	 * Short Description. (use period)
	 *
	 * Long Description.
	 */
	public static function activate() {
		// Flush rewrite rules
		flush_rewrite_rules();
	}
}

