<?php
/**
 * The REST API-specific functionality of the plugin.
 */
class WP_Link_Auditor_API {

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
	 * Register REST API routes
	 */
	public function register_routes() {
		$namespace = $this->plugin_name . '/v1';

		// Get posts
		register_rest_route( $namespace, '/posts', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_posts' ),
			'permission_callback' => array( $this, 'check_permissions' ),
		) );

		// Get single post
		register_rest_route( $namespace, '/posts/(?P<id>\d+)', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_post' ),
			'permission_callback' => array( $this, 'check_permissions' ),
		) );

		// Update post content
		register_rest_route( $namespace, '/posts/(?P<id>\d+)', array(
			'methods' => 'POST',
			'callback' => array( $this, 'update_post' ),
			'permission_callback' => array( $this, 'check_permissions' ),
		) );

		// Check link status
		register_rest_route( $namespace, '/check-link', array(
			'methods' => 'POST',
			'callback' => array( $this, 'check_link' ),
			'permission_callback' => array( $this, 'check_permissions' ),
		) );

		// Focus keyword helpers
		register_rest_route( $namespace, '/seo/focus-keywords/missing', array(
			'methods' => 'GET',
			'callback' => array( $this, 'get_missing_focus_keywords' ),
			'permission_callback' => array( $this, 'check_permissions' ),
		) );

		register_rest_route( $namespace, '/seo/focus-keywords/bulk', array(
			'methods' => 'POST',
			'callback' => array( $this, 'bulk_update_focus_keywords' ),
			'permission_callback' => array( $this, 'check_permissions' ),
		) );
	}

	/**
	 * Check if user has permission
	 */
	public function check_permissions() {
		return current_user_can( 'edit_posts' );
	}

	/**
	 * Get posts
	 */
	public function get_posts( $request ) {
		$args = array(
			'post_type' => 'post',
			'post_status' => 'publish',
			'posts_per_page' => -1,
			'orderby' => 'date',
			'order' => 'DESC',
		);

		$posts = get_posts( $args );
		$formatted_posts = array();

		foreach ( $posts as $post ) {
			$formatted_posts[] = $this->format_post( $post );
		}

		return new WP_REST_Response( $formatted_posts, 200 );
	}

	/**
	 * Get single post
	 */
	public function get_post( $request ) {
		$post_id = (int) $request['id'];
		$post = get_post( $post_id );

		if ( ! $post || $post->post_status !== 'publish' ) {
			return new WP_Error( 'post_not_found', __( 'Post not found.', 'wp-link-auditor' ), array( 'status' => 404 ) );
		}

		return new WP_REST_Response( $this->format_post( $post ), 200 );
	}

	/**
	 * Update post
	 */
	public function update_post( $request ) {
		$post_id = (int) $request['id'];
		$post = get_post( $post_id );

		if ( ! $post || ! current_user_can( 'edit_post', $post_id ) ) {
			return new WP_Error( 'permission_denied', __( 'You do not have permission to edit this post.', 'wp-link-auditor' ), array( 'status' => 403 ) );
		}

		$body = $request->get_json_params();
		$content = isset( $body['content'] ) ? wp_kses_post( $body['content'] ) : $post->post_content;
		$focus_keyphrase_provided = array_key_exists( 'focusKeyphrase', $body );
		$focus_keyphrase = $focus_keyphrase_provided ? sanitize_text_field( $body['focusKeyphrase'] ) : null;

		// IMPORTANT: Update focus keyphrase BEFORE wp_update_post() to prevent Rank Math
		// from overwriting it during its save hooks. Rank Math processes post saves and
		// may reset meta if it's updated after wp_update_post().
		if ( $focus_keyphrase_provided ) {
			if ( $focus_keyphrase === '' ) {
				delete_post_meta( $post_id, '_wp_link_auditor_focus_keyphrase' );
				if ( WP_Link_Auditor_SEO_Integration::is_yoast_active() ) {
					delete_post_meta( $post_id, '_yoast_wpseo_focuskw' );
				}
				if ( WP_Link_Auditor_SEO_Integration::is_rank_math_active() ) {
					delete_post_meta( $post_id, '_rank_math_focus_keyword' );
				}
			} else {
				WP_Link_Auditor_SEO_Integration::update_focus_keyword(
					$post_id,
					$focus_keyphrase,
					array(
						'sync_yoast' => WP_Link_Auditor_SEO_Integration::is_yoast_active(),
						'sync_rank_math' => WP_Link_Auditor_SEO_Integration::is_rank_math_active(),
					)
				);
			}
		}

		// Update post content after meta is set
		$update_data = array(
			'ID' => $post_id,
			'post_content' => $content,
		);

		$result = wp_update_post( $update_data, true );

		if ( is_wp_error( $result ) ) {
			return new WP_Error( 'update_failed', $result->get_error_message(), array( 'status' => 500 ) );
		}

		// Re-apply focus keyword after post save as safeguard (Rank Math may have processed the save)
		if ( $focus_keyphrase_provided && $focus_keyphrase !== '' ) {
			WP_Link_Auditor_SEO_Integration::update_focus_keyword(
				$post_id,
				$focus_keyphrase,
				array(
					'sync_yoast' => WP_Link_Auditor_SEO_Integration::is_yoast_active(),
					'sync_rank_math' => WP_Link_Auditor_SEO_Integration::is_rank_math_active(),
				)
			);
		}

		$updated_post = get_post( $post_id );
		return new WP_REST_Response( $this->format_post( $updated_post ), 200 );
	}

	/**
	 * Check link status
	 */
	public function check_link( $request ) {
		$body = $request->get_json_params();
		$url = isset( $body['url'] ) ? trim( $body['url'] ) : '';

		// Only log in debug mode
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			error_log( 'WP Link Auditor: check_link called with URL: ' . $url );
		}

		if ( empty( $url ) ) {
			if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
				error_log( 'WP Link Auditor: Empty URL provided' );
			}
			return new WP_Error( 'invalid_url', __( 'Invalid URL provided.', 'wp-link-auditor' ), array( 'status' => 400 ) );
		}

		// Validate URL format before passing to checker
		if ( ! filter_var( $url, FILTER_VALIDATE_URL ) ) {
			if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
				error_log( 'WP Link Auditor: Invalid URL format' );
			}
			return new WP_Error( 'invalid_url', __( 'Invalid URL format.', 'wp-link-auditor' ), array( 'status' => 400 ) );
		}

		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			error_log( 'WP Link Auditor: Starting link check' );
		}
		$link_checker = new WP_Link_Auditor_Link_Checker();
		$status = $link_checker->check_url( $url );
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			error_log( 'WP Link Auditor: Link check result: ' . $status );
		}

		// Always include debugging info
		$response_data = array( 
			'status' => $status,
			'debug' => array(
				'url' => $url,
				'checked_at' => current_time( 'mysql' ),
				'site_url' => home_url(),
			),
		);

		return new WP_REST_Response( $response_data, 200 );
	}

	/**
	 * Format post for API response
	 */
	private function format_post( $post ) {
		$seo_snapshot = WP_Link_Auditor_SEO_Integration::get_focus_keyword_snapshot( $post->ID );
		$focus_keyphrase = WP_Link_Auditor_SEO_Integration::get_effective_focus_keyword( $post->ID );

		return array(
			'id' => $post->ID,
			'title' => $post->post_title,
			'content' => $post->post_content,
			'date' => get_the_date( 'c', $post->ID ),
			'lastModified' => $post->post_modified ? mysql2date( 'c', $post->post_modified, false ) : get_the_date( 'c', $post->ID ),
			'url' => get_permalink( $post->ID ),
			'hasFeaturedImage' => has_post_thumbnail( $post->ID ),
			'featuredImage' => get_the_post_thumbnail_url( $post->ID, 'full' ),
			'focusKeyphrase' => $focus_keyphrase ? $focus_keyphrase : null,
			'seoFocusKeywords' => array(
				'yoast' => ! empty( $seo_snapshot['yoast'] ) ? $seo_snapshot['yoast'] : null,
				'rankMath' => ! empty( $seo_snapshot['rank_math'] ) ? $seo_snapshot['rank_math'] : null,
			),
		);
	}

	/**
	 * Return posts without focus keywords for active SEO plugins.
	 */
	public function get_missing_focus_keywords( $request ) {
		$post_type_param = $request->get_param( 'post_type' );
		// Validate post_type - only allow registered post types
		$post_type = 'post';
		if ( ! empty( $post_type_param ) ) {
			$sanitized = sanitize_key( $post_type_param );
			if ( post_type_exists( $sanitized ) ) {
				$post_type = $sanitized;
			}
		}
		$active = WP_Link_Auditor_SEO_Integration::get_active_plugins_info();

		// Always return missing focus keywords, even if no SEO plugins are active
		$missing = WP_Link_Auditor_SEO_Integration::get_missing_focus_keyword_data( array(
			'post_type' => $post_type,
		) );

		return new WP_REST_Response( array(
			'seoPlugins' => $active,
			'missing' => $missing,
			'total' => count( $missing ),
		), 200 );
	}

	/**
	 * Bulk update focus keywords for posts.
	 */
	public function bulk_update_focus_keywords( $request ) {
		$body = $request->get_json_params();
		$entries = isset( $body['keywords'] ) ? (array) $body['keywords'] : array();
		$sync_yoast = isset( $body['syncYoast'] ) ? (bool) $body['syncYoast'] : WP_Link_Auditor_SEO_Integration::is_yoast_active();
		$sync_rank_math = isset( $body['syncRankMath'] ) ? (bool) $body['syncRankMath'] : WP_Link_Auditor_SEO_Integration::is_rank_math_active();
		$overwrite = array_key_exists( 'overwriteExisting', $body ) ? (bool) $body['overwriteExisting'] : true;

		// Allow saving focus keywords even if no SEO plugins are active
		// The plugin will always save to its own meta key

		if ( empty( $entries ) ) {
			return new WP_Error( 'no_keywords', __( 'No focus keywords were provided.', 'wp-link-auditor' ), array( 'status' => 400 ) );
		}

		$updated = array();
		$skipped = array();

		foreach ( $entries as $entry ) {
			$post_id = isset( $entry['postId'] ) ? (int) $entry['postId'] : 0;
			$keyword_raw = isset( $entry['focusKeyword'] ) ? $entry['focusKeyword'] : '';
			$keyword = sanitize_text_field( $keyword_raw );

			if ( ! $post_id || '' === $keyword ) {
				continue;
			}

			if ( ! current_user_can( 'edit_post', $post_id ) ) {
				$skipped[] = $post_id;
				continue;
			}

			// Always update the plugin's own meta key, and optionally sync with SEO plugins
			$result = WP_Link_Auditor_SEO_Integration::update_focus_keyword(
				$post_id,
				$keyword,
				array(
					'sync_yoast' => $sync_yoast && WP_Link_Auditor_SEO_Integration::is_yoast_active(),
					'sync_rank_math' => $sync_rank_math && WP_Link_Auditor_SEO_Integration::is_rank_math_active(),
					'overwrite_existing' => $overwrite,
				)
			);

			if ( $result['updated'] ) {
				$updated[] = $post_id;
			} else {
				$skipped[] = $post_id;
			}
		}

		$remaining = WP_Link_Auditor_SEO_Integration::get_missing_focus_keyword_data();

		return new WP_REST_Response( array(
			'updated' => $updated,
			'skipped' => $skipped,
			'remaining' => count( $remaining ),
			'missing' => $remaining,
		), 200 );
	}
}

