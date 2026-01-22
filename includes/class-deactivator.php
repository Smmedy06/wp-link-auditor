<?php
/**
 * Fired during plugin deactivation
 */
class WP_Link_Auditor_Deactivator {

	/**
	 * Short Description. (use period)
	 *
	 * Long Description.
	 */
	public static function deactivate() {
		// Flush rewrite rules
		flush_rewrite_rules();
	}
}

