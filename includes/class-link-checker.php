<?php
/**
 * Link checking functionality
 */
class WP_Link_Auditor_Link_Checker {

	/**
	 * Check if a URL is accessible
	 */
	public function check_url( $url ) {
		// Clean and normalize URL
		$url = trim( $url );
		
		// Only log in debug mode
		$debug_mode = defined( 'WP_DEBUG' ) && WP_DEBUG;
		if ( $debug_mode ) {
			error_log( 'WP Link Auditor: check_url called' );
		}
		
		// Validate URL
		if ( empty( $url ) || ! filter_var( $url, FILTER_VALIDATE_URL ) ) {
			if ( $debug_mode ) {
				error_log( 'WP Link Auditor: URL validation failed' );
			}
			return 'broken';
		}

		// Check if it's an internal link
		$site_url = home_url();
		$url_host = parse_url( $url, PHP_URL_HOST );
		$site_host = parse_url( $site_url, PHP_URL_HOST );
		
		if ( $debug_mode ) {
			error_log( 'WP Link Auditor: Checking internal link' );
		}

		if ( $url_host === $site_host ) {
			if ( $debug_mode ) {
				error_log( 'WP Link Auditor: Internal link detected, returning OK' );
			}
			return 'ok';
		}

		// Try multiple methods to check the URL
		$status = $this->check_url_with_wp_remote( $url );
		
		// If wp_remote failed, try alternative method
		if ( $status === 'broken' ) {
			$status = $this->check_url_with_stream_context( $url );
		}

		return $status;
	}

	/**
	 * Check URL using WordPress HTTP API
	 */
	private function check_url_with_wp_remote( $url ) {
		// Request arguments - try with SSL verify first
		$args_ssl = array(
			'timeout' => 10,
			'redirection' => 5,
			'sslverify' => true,
			'user-agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			'headers' => array(
				'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			),
			'httpversion' => '1.1',
		);

		// Try HEAD request first
		$response = wp_remote_head( $url, $args_ssl );

		// If HEAD fails, try GET
		if ( is_wp_error( $response ) ) {
			$response = wp_remote_get( $url, array_merge( $args_ssl, array(
				'limit_response_size' => 1024,
			) ) );
		}

		// If still fails with SSL verify, try without SSL verify
		if ( is_wp_error( $response ) ) {
			$args_no_ssl = array_merge( $args_ssl, array( 'sslverify' => false ) );
			$response = wp_remote_head( $url, $args_no_ssl );
			
			if ( is_wp_error( $response ) ) {
				$response = wp_remote_get( $url, array_merge( $args_no_ssl, array(
					'limit_response_size' => 1024,
				) ) );
			}
		}

		// Check response
		if ( is_wp_error( $response ) ) {
			// Only log error in debug mode
			if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
				error_log( 'WP Link Auditor Error: ' . $response->get_error_code() . ' - ' . $response->get_error_message() );
			}
			return 'broken';
		}

		$status_code = wp_remote_retrieve_response_code( $response );
		
		// If we got a valid status code
		if ( ! empty( $status_code ) ) {
			// 2xx and 3xx are OK
			if ( $status_code >= 200 && $status_code < 400 ) {
				return 'ok';
			}
			// 4xx and 5xx are broken
			return 'broken';
		}

		// If no status code but we got a response, check headers
		$headers = wp_remote_retrieve_headers( $response );
		if ( $headers ) {
			// If we got headers, the server responded - likely OK
			$body = wp_remote_retrieve_body( $response );
			if ( ! empty( $body ) || ! empty( $headers ) ) {
				return 'ok';
			}
		}

		return 'broken';
	}

	/**
	 * Check URL using stream context (fallback method)
	 */
	private function check_url_with_stream_context( $url ) {
		// Check if allow_url_fopen is enabled
		if ( ! ini_get( 'allow_url_fopen' ) ) {
			return 'broken';
		}

		$context = stream_context_create( array(
			'http' => array(
				'method' => 'HEAD',
				'timeout' => 10,
				'follow_location' => 1,
				'max_redirects' => 5,
				'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
				'ignore_errors' => true,
			),
			'ssl' => array(
				'verify_peer' => false,
				'verify_peer_name' => false,
			),
		) );

		// Try HEAD first
		$headers = @get_headers( $url, 1, $context );
		
		if ( $headers === false ) {
			// Try GET as fallback
			$context_get = stream_context_create( array(
				'http' => array(
					'method' => 'GET',
					'timeout' => 10,
					'follow_location' => 1,
					'max_redirects' => 5,
					'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
					'ignore_errors' => true,
				),
				'ssl' => array(
					'verify_peer' => false,
					'verify_peer_name' => false,
				),
			) );
			
			$headers = @get_headers( $url, 1, $context_get );
		}

		if ( $headers === false || empty( $headers ) ) {
			return 'broken';
		}

		// Get status code from headers
		$status_line = is_array( $headers ) ? $headers[0] : $headers;
		if ( preg_match( '/HTTP\/\d\.\d\s+(\d+)/', $status_line, $matches ) ) {
			$status_code = (int) $matches[1];
			if ( $status_code >= 200 && $status_code < 400 ) {
				return 'ok';
			}
		}

		// If we got headers but no status code, assume OK (server responded)
		if ( ! empty( $headers ) ) {
			return 'ok';
		}

		return 'broken';
	}

	/**
	 * Check multiple URLs
	 */
	public function check_urls( $urls ) {
		$results = array();
		foreach ( $urls as $url ) {
			$results[ $url ] = $this->check_url( $url );
		}
		return $results;
	}
}

