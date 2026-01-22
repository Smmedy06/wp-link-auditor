<?php
/**
 * Helper methods for syncing focus keywords with SEO plugins.
 */
class WP_Link_Auditor_SEO_Integration {

	/**
	 * Ensure plugin functions are available.
	 */
	private static function ensure_plugin_functions() {
		if ( ! function_exists( 'is_plugin_active' ) ) {
			include_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
	}

	/**
	 * Determine if Yoast SEO is active.
	 */
	public static function is_yoast_active() {
		self::ensure_plugin_functions();
		return defined( 'WPSEO_FILE' ) || ( function_exists( 'is_plugin_active' ) && is_plugin_active( 'wordpress-seo/wp-seo.php' ) );
	}

	/**
	 * Determine if Rank Math SEO is active.
	 */
	public static function is_rank_math_active() {
		self::ensure_plugin_functions();
		// Check multiple ways Rank Math might be detected
		if ( defined( 'RANK_MATH_VERSION' ) ) {
			return true;
		}
		if ( defined( 'RANK_MATH_FILE' ) ) {
			return true;
		}
		if ( class_exists( 'RankMath' ) ) {
			return true;
		}
		if ( class_exists( 'RankMath\\RankMath' ) ) {
			return true;
		}
		if ( function_exists( 'is_plugin_active' ) ) {
			// Check both possible plugin paths
			if ( is_plugin_active( 'seo-by-rank-math/seo-by-rank-math.php' ) ) {
				return true;
			}
			// Fallback to old path in case of different installation
			if ( is_plugin_active( 'seo-by-rank-math/rank-math.php' ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Get an array describing which SEO plugins are active.
	 */
	public static function get_active_plugins_info() {
		return array(
			'yoast'     => self::is_yoast_active(),
			'rank_math' => self::is_rank_math_active(),
		);
	}

	/**
	 * Get the first available focus keyword for a post.
	 */
	public static function get_effective_focus_keyword( $post_id ) {
		$data = self::get_focus_keyword_snapshot( $post_id );
		if ( ! empty( $data['yoast'] ) ) {
			return $data['yoast'];
		}
		if ( ! empty( $data['rank_math'] ) ) {
			return $data['rank_math'];
		}
		return $data['auditor'];
	}

	/**
	 * Get focus keyword values stored for each integration.
	 */
	public static function get_focus_keyword_snapshot( $post_id ) {
		$rank_math_keyword = '';
		if ( self::is_rank_math_active() ) {
			// Rank Math stores focus keyword in rank_math_options (serialized array)
			$rank_math_options = get_post_meta( $post_id, 'rank_math_options', true );
			if ( is_array( $rank_math_options ) && isset( $rank_math_options['focus_keyword'] ) ) {
				$rank_math_keyword = $rank_math_options['focus_keyword'];
			}
			// Fallback to direct meta key (older versions or different setup)
			if ( empty( $rank_math_keyword ) ) {
				$rank_math_keyword = get_post_meta( $post_id, 'rank_math_focus_keyword', true );
			}
			// Another fallback for different meta key format
			if ( empty( $rank_math_keyword ) ) {
				$rank_math_keyword = get_post_meta( $post_id, '_rank_math_focus_keyword', true );
			}
		}
		
		return array(
			'yoast'     => self::is_yoast_active() ? get_post_meta( $post_id, '_yoast_wpseo_focuskw', true ) : '',
			'rank_math' => $rank_math_keyword,
			'auditor'   => get_post_meta( $post_id, '_wp_link_auditor_focus_keyphrase', true ),
		);
	}

	/**
	 * Update focus keyword meta for supported SEO plugins.
	 */
	public static function update_focus_keyword( $post_id, $keyword, $args = array() ) {
		$keyword  = sanitize_text_field( $keyword );
		$defaults = array(
			'sync_yoast'          => self::is_yoast_active(),
			'sync_rank_math'      => self::is_rank_math_active(),
			'overwrite_existing'  => true,
		);

		$args        = wp_parse_args( $args, $defaults );
		$changes     = array(
			'updated'        => false,
			'yoast_updated'  => false,
			'rank_updated'   => false,
		);

		update_post_meta( $post_id, '_wp_link_auditor_focus_keyphrase', $keyword );

		if ( $args['sync_yoast'] ) {
			$current = get_post_meta( $post_id, '_yoast_wpseo_focuskw', true );
			if ( $args['overwrite_existing'] || empty( $current ) ) {
				// Write via Yoast API if available for better compatibility
				if ( class_exists( 'WPSEO_Meta' ) && method_exists( 'WPSEO_Meta', 'set_value' ) ) {
					WPSEO_Meta::set_value( 'focuskw', $keyword, $post_id );
				}
				update_post_meta( $post_id, '_yoast_wpseo_focuskw', $keyword );
				$changes['yoast_updated'] = true;
			}
		}

		if ( $args['sync_rank_math'] ) {
			// Get current Rank Math options - preserve existing options to avoid overwriting other settings
			$rank_math_options = get_post_meta( $post_id, 'rank_math_options', true );
			if ( ! is_array( $rank_math_options ) ) {
				$rank_math_options = array();
			}
			
			$current = isset( $rank_math_options['focus_keyword'] ) ? $rank_math_options['focus_keyword'] : '';
			// Fallback check for direct meta key
			if ( empty( $current ) ) {
				$current = get_post_meta( $post_id, 'rank_math_focus_keyword', true );
			}
			if ( empty( $current ) ) {
				$current = get_post_meta( $post_id, '_rank_math_focus_keyword', true );
			}
			
			if ( $args['overwrite_existing'] || empty( $current ) ) {
				// Store the keyword temporarily to preserve it during Rank Math saves
				update_post_meta( $post_id, '_wp_link_auditor_rank_math_focus_keyword_temp', $keyword );
				
				// Update Rank Math options array (primary method) - merge to preserve other settings
				$rank_math_options['focus_keyword'] = $keyword;
				update_post_meta( $post_id, 'rank_math_options', $rank_math_options );
				
				// Also update direct meta keys for compatibility
				update_post_meta( $post_id, 'rank_math_focus_keyword', $keyword );
				update_post_meta( $post_id, '_rank_math_focus_keyword', $keyword );
				
				// Try Rank Math REST API if available (more reliable than Helper methods)
				if ( function_exists( 'rest_url' ) ) {
					$rest_url = rest_url( 'rankmath/v1/updateMeta' );
					// Note: REST API call would require proper authentication, so we use direct meta update
				}
				
				// Use Rank Math Helper API if available (check for correct method signature)
				if ( class_exists( 'RankMath\\Helper' ) ) {
					// Try update_meta method if it exists
					if ( method_exists( 'RankMath\\Helper', 'update_meta' ) ) {
						try {
							\RankMath\Helper::update_meta( $post_id, 'focus_keyword', $keyword );
						} catch ( Exception $e ) {
							// Method may not work as expected, fall back to direct meta
							if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
								error_log( 'WP Link Auditor: Rank Math Helper::update_meta failed: ' . $e->getMessage() );
							}
						}
					}
					// Try set_meta method (alternative Rank Math API)
					if ( method_exists( 'RankMath\\Helper', 'set_meta' ) ) {
						try {
							\RankMath\Helper::set_meta( $post_id, 'focus_keyword', $keyword );
						} catch ( Exception $e ) {
							if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
								error_log( 'WP Link Auditor: Rank Math Helper::set_meta failed: ' . $e->getMessage() );
							}
						}
					}
				}
				
				// Clear Rank Math cache if available
				if ( function_exists( 'rank_math' ) ) {
					$rank_math_instance = rank_math();
					if ( is_object( $rank_math_instance ) && method_exists( $rank_math_instance, 'invalidate_cache' ) ) {
						$rank_math_instance->invalidate_cache( $post_id );
					}
				}
				
				// Trigger Rank Math action hooks if available
				do_action( 'rank_math/save_post', $post_id );
				do_action( 'rank_math/after_update_post_meta', $post_id );
				
				if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
					error_log( 'WP Link Auditor: Updated Rank Math focus keyword for post ' . $post_id . ': ' . $keyword );
				}
				
				$changes['rank_updated'] = true;
			}
		}

		$changes['updated'] = $changes['yoast_updated'] || $changes['rank_updated'] || ! empty( $keyword );
		return $changes;
	}

	/**
	 * Determine whether a post is missing focus keywords for active integrations.
	 * Also checks if the plugin's own focus keyword is missing when no SEO plugins are active.
	 */
	public static function is_missing_focus_keyword( $post_id ) {
		$active = self::get_active_plugins_info();
		$snapshot = self::get_focus_keyword_snapshot( $post_id );

		$needs_yoast     = $active['yoast'] && empty( $snapshot['yoast'] );
		$needs_rank_math = $active['rank_math'] && empty( $snapshot['rank_math'] );
		$needs_auditor   = ! $active['yoast'] && ! $active['rank_math'] && empty( $snapshot['auditor'] );

		return $needs_yoast || $needs_rank_math || $needs_auditor;
	}

	/**
	 * Query posts that need focus keywords.
	 * Works with SEO plugins or independently using the plugin's own meta key.
	 */
	public static function get_posts_missing_focus_keywords( $args = array() ) {
		$active_plugins = self::get_active_plugins_info();
		// If no SEO plugins are active, query for posts missing the plugin's own focus keyword
		if ( ! $active_plugins['yoast'] && ! $active_plugins['rank_math'] ) {
			$defaults = array(
				'post_type'      => 'post',
				'post_status'    => 'publish',
				'posts_per_page' => -1,
				'fields'         => 'ids',
			);
			$base_args = wp_parse_args( $args, $defaults );
			$base_args['meta_query'] = array(
				'relation' => 'OR',
				array(
					'key'     => '_wp_link_auditor_focus_keyphrase',
					'compare' => 'NOT EXISTS',
				),
				array(
					'key'     => '_wp_link_auditor_focus_keyphrase',
					'value'   => '',
					'compare' => '=',
				),
			);
			return get_posts( $base_args );
		}

		$defaults = array(
			'post_type'      => 'post',
			'post_status'    => 'publish',
			'posts_per_page' => -1,
			'fields'         => 'ids',
		);

		$base_args = wp_parse_args( $args, $defaults );

		$post_ids = array();

		// Query for posts missing Yoast focus keywords
		if ( $active_plugins['yoast'] ) {
			$yoast_args = $base_args;
			$yoast_args['meta_query'] = array(
				'relation' => 'OR',
				array(
					'key'     => '_yoast_wpseo_focuskw',
					'compare' => 'NOT EXISTS',
				),
				array(
					'key'     => '_yoast_wpseo_focuskw',
					'value'   => '',
					'compare' => '=',
				),
			);
			$post_ids = array_merge( $post_ids, get_posts( $yoast_args ) );
		}

		// Query for posts missing Rank Math focus keywords
		if ( $active_plugins['rank_math'] ) {
			// Get all posts and manually filter for empty focus keywords
			// Rank Math can store focus keyword in multiple places: rank_math_options array, rank_math_focus_keyword, or _rank_math_focus_keyword
			$all_posts = get_posts( array(
				'post_type'      => $base_args['post_type'],
				'post_status'    => $base_args['post_status'],
				'posts_per_page' => $base_args['posts_per_page'],
				'fields'         => 'ids',
			) );
			
			// Filter posts that actually have empty focus keywords
			foreach ( $all_posts as $post_id ) {
				$has_focus_keyword = false;
				
				// Check rank_math_options array (primary method)
				$rank_math_options = get_post_meta( $post_id, 'rank_math_options', true );
				if ( is_array( $rank_math_options ) && ! empty( $rank_math_options['focus_keyword'] ) ) {
					$has_focus_keyword = true;
				}
				
				// Check direct meta keys (fallback methods)
				if ( ! $has_focus_keyword ) {
					$has_focus_keyword = ! empty( get_post_meta( $post_id, 'rank_math_focus_keyword', true ) );
				}
				if ( ! $has_focus_keyword ) {
					$has_focus_keyword = ! empty( get_post_meta( $post_id, '_rank_math_focus_keyword', true ) );
				}
				
				// If no focus keyword found, add to list
				if ( ! $has_focus_keyword ) {
					$post_ids[] = $post_id;
				}
			}
		}

		// Remove duplicates and ensure all IDs are integers
		$post_ids = array_unique( array_map( 'intval', $post_ids ) );

		return $post_ids;
	}

	/**
	 * Get structured data for posts missing focus keywords.
	 */
	public static function get_missing_focus_keyword_data( $args = array() ) {
		$post_ids = self::get_posts_missing_focus_keywords( $args );
		$data     = array();

		foreach ( $post_ids as $post_id ) {
			$post = get_post( $post_id );
			if ( ! $post ) {
				continue;
			}

			$data[] = array(
				'id'                => $post_id,
				'title'             => get_the_title( $post_id ),
				'url'               => get_permalink( $post_id ),
				'suggestedKeyword'  => sanitize_text_field( $post->post_title ),
				'currentKeyword'    => self::get_effective_focus_keyword( $post_id ),
			);
		}

		return $data;
	}

	/**
	 * Preserve Rank Math focus keyword during Rank Math's save process.
	 * This hook prevents Rank Math from overwriting the focus keyword we just set.
	 */
	public static function preserve_rank_math_focus_keyword( $post_id ) {
		if ( ! self::is_rank_math_active() ) {
			return;
		}

		// Check if we have a temporary stored keyword (set by our update method)
		$temp_keyword = get_post_meta( $post_id, '_wp_link_auditor_rank_math_focus_keyword_temp', true );
		if ( ! empty( $temp_keyword ) ) {
			// Re-apply the focus keyword to ensure it persists
			$rank_math_options = get_post_meta( $post_id, 'rank_math_options', true );
			if ( ! is_array( $rank_math_options ) ) {
				$rank_math_options = array();
			}
			$rank_math_options['focus_keyword'] = $temp_keyword;
			update_post_meta( $post_id, 'rank_math_options', $rank_math_options );
			update_post_meta( $post_id, 'rank_math_focus_keyword', $temp_keyword );
			update_post_meta( $post_id, '_rank_math_focus_keyword', $temp_keyword );
			
			if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
				error_log( 'WP Link Auditor: Preserved Rank Math focus keyword for post ' . $post_id );
			}
		}
	}

	/**
	 * Final safeguard: Re-apply focus keyword on shutdown if needed.
	 * This ensures the keyword persists even if Rank Math processes saves late.
	 */
	public static function safeguard_rank_math_focus_keyword() {
		if ( ! self::is_rank_math_active() ) {
			return;
		}

		// Get posts that have temporary keywords stored
		global $wpdb;
		$temp_meta = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT post_id, meta_value FROM {$wpdb->postmeta} WHERE meta_key = %s",
				'_wp_link_auditor_rank_math_focus_keyword_temp'
			)
		);

		foreach ( $temp_meta as $meta ) {
			$post_id = (int) $meta->post_id;
			$keyword = $meta->meta_value;
			
			// Verify the keyword is still in Rank Math options
			$rank_math_options = get_post_meta( $post_id, 'rank_math_options', true );
			$current_keyword = isset( $rank_math_options['focus_keyword'] ) ? $rank_math_options['focus_keyword'] : '';
			
			// If keyword is missing, re-apply it
			if ( $current_keyword !== $keyword ) {
				if ( ! is_array( $rank_math_options ) ) {
					$rank_math_options = array();
				}
				$rank_math_options['focus_keyword'] = $keyword;
				update_post_meta( $post_id, 'rank_math_options', $rank_math_options );
				update_post_meta( $post_id, 'rank_math_focus_keyword', $keyword );
				update_post_meta( $post_id, '_rank_math_focus_keyword', $keyword );
				
				if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
					error_log( 'WP Link Auditor: Safeguard re-applied Rank Math focus keyword for post ' . $post_id );
				}
			}
			
			// Clean up temporary meta after a short delay (removed on next request)
			delete_post_meta( $post_id, '_wp_link_auditor_rank_math_focus_keyword_temp' );
		}
	}
}


