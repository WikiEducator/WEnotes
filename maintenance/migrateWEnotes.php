<?php
/**
 * Migrate WEnotes from CouchDB to MariaDB.
 *
 * @file
 * @ingroup Maintenance
 */

$IP = getenv( 'MW_INSTALL_PATH' );
if ( $IP === false ) {
	$IP = __DIR__ . '/../../..';
}
require_once "$IP/maintenance/Maintenance.php";

class MigrateWEnotes extends Maintenance {
	public function __construct() {
		parent::__construct();
		$this->mDescription = "Migrate WEnotes and Avatars from CouchDB to MariaDB";
		$this->addOption( 'host', 'CouchDB host', false, true );
		$this->addOption( 'port', 'CouchDB port', false, true );
		$this->addOption( 'notes-db', 'CouchDB notes database name', false, true );
		$this->addOption( 'avatars-db', 'CouchDB avatars database name (e.g., weavatars)', false, true );
		$this->addOption( 'user', 'CouchDB user name', false, true );
		$this->addOption( 'password', 'CouchDB password', false, true );
	}

	public function execute() {
		global $wgWEnotesHost, $wgWEnotesPort, $wgWEnotesDB, $wgWEnotesAvatarsDB;
		global $wgWEnotesUser, $wgWEnotesPasswd;

		$host = $this->getOption( 'host', isset( $wgWEnotesHost ) ? $wgWEnotesHost : 'localhost' );
		$port = $this->getOption( 'port', isset( $wgWEnotesPort ) ? $wgWEnotesPort : 5984 );
		$dbNotes = $this->getOption( 'notes-db', isset( $wgWEnotesDB ) ? $wgWEnotesDB : 'mentions' );
		$dbAvatars = $this->getOption( 'avatars-db', isset( $wgWEnotesAvatarsDB ) ? $wgWEnotesAvatarsDB : null );
		$user = $this->getOption( 'user', isset( $wgWEnotesUser ) ? $wgWEnotesUser : '' );
		$pass = $this->getOption( 'password', isset( $wgWEnotesPasswd ) ? $wgWEnotesPasswd : '' );

		if ( !$host ) {
			$this->error( "CouchDB host is not configured. Make sure \$wgWEnotesHost, etc. are set in LocalSettings.php/CommonSettings.php, or pass them as options.", true );
		}

		$this->output( "Using CouchDB at $host:$port...\n" );

		// 1. Migrate Notes (WEnotes)
		$this->output( "Starting WEnotes migration from database '$dbNotes'...\n" );
		$this->migrateNotes( $host, $port, $dbNotes, $user, $pass );

		// 2. Migrate Avatars
		if ( $dbAvatars ) {
			$this->output( "Starting Avatars migration from database '$dbAvatars'...\n" );
			$this->migrateAvatars( $host, $port, $dbAvatars, $user, $pass );
		} else {
			$this->output( "Avatars database is not configured in MediaWiki settings ($wgWEnotesAvatarsDB). Skipping avatars migration.\n" );
			$this->output( "Tip: You can specify the avatars database name using the command-line option, e.g.:\n" );
			$this->output( "  php maintenance/migrateWEnotes.php --avatars-db=weavatars\n\n" );
		}

		$this->output( "All migrations completed!\n" );
	}

	private function migrateNotes( $host, $port, $dbName, $user, $pass ) {
		$url = "http://";
		if ( $user !== '' ) {
			$url .= rawurlencode( $user ) . ":" . rawurlencode( $pass ) . "@";
		}
		$url .= $host . ":" . $port . "/" . $dbName . "/_all_docs?include_docs=true";

		$response = $this->fetchFromCouch( $url );
		if ( !$response ) {
			$this->error( "Could not retrieve notes from CouchDB. URL: $url" );
			return;
		}

		$data = json_decode( $response, true );
		if ( !isset( $data['rows'] ) ) {
			$this->error( "Invalid notes response format from CouchDB." );
			return;
		}

		$rows = $data['rows'];
		$total = count( $rows );
		$this->output( "Found $total documents in CouchDB notes database. Starting migration...\n" );

		$dbw = wfGetDB( DB_MASTER );
		$inserted = 0;
		$updated = 0;
		$skipped = 0;

		foreach ( $rows as $row ) {
			if ( !isset( $row['doc'] ) ) {
				$skipped++;
				continue;
			}
			$doc = $row['doc'];
			$id = isset( $doc['_id'] ) ? $doc['_id'] : ( isset( $doc['id'] ) ? $doc['id'] : null );

			// Skip design documents
			if ( !$id || strpos( $id, '_design/' ) === 0 ) {
				$skipped++;
				continue;
			}

			// Extract tag
			$tags = array();
			if ( isset( $doc['we_tags'] ) && is_array( $doc['we_tags'] ) ) {
				foreach ( $doc['we_tags'] as $t ) {
					if ( is_string( $t ) && trim( $t ) !== '' ) {
						$tags[] = strtolower( trim( $t ) );
					}
				}
			}
			if ( isset( $doc['we_tag'] ) && is_string( $doc['we_tag'] ) && trim( $doc['we_tag'] ) !== '' ) {
				$tags[] = strtolower( trim( $doc['we_tag'] ) );
			}
			$tags = array_values( array_unique( $tags ) );

			// Keep primary/first tag for the legacy wen_tag column
			$tag = !empty( $tags ) ? $tags[0] : null;

			// Extract page
			$page = null;
			if ( isset( $doc['we_page'] ) ) {
				$page = $doc['we_page'];
			} elseif ( isset( $doc['page'] ) ) {
				$page = $doc['page'];
			}

			// Extract timestamp
			$timestamp = isset( $doc['we_timestamp'] ) ? $doc['we_timestamp'] : null;
			if ( !$timestamp ) {
				// Fallback to ISO format of created_at or current time
				if ( isset( $doc['created_at'] ) ) {
					$time = strtotime( $doc['created_at'] );
					if ( $time !== false ) {
						$timestamp = date( 'Y-m-d\TH:i:s.000\Z', $time );
					}
				}
			}
			if ( !$timestamp ) {
				$timestamp = date( 'Y-m-d\TH:i:s.000\Z' );
			}

			$deleted = ( isset( $doc['we_d'] ) && $doc['we_d'] ) ? 1 : 0;
			$deletedBy = isset( $doc['we_d_by'] ) ? $doc['we_d_by'] : null;
			$deletedAt = isset( $doc['we_d_at'] ) ? $doc['we_d_at'] : null;

			// Check if already exists in MariaDB
			$exists = $dbw->selectField(
				'wenotes',
				'1',
				array( 'wen_id' => $id ),
				__METHOD__
			);

			$fields = array(
				'wen_tag' => $tag,
				'wen_page' => $page,
				'wen_timestamp' => $timestamp,
				'wen_deleted' => $deleted,
				'wen_deleted_by' => $deletedBy,
				'wen_deleted_at' => $deletedAt,
				'wen_doc' => json_encode( $doc )
			);

			if ( $exists ) {
				$dbw->update(
					'wenotes',
					$fields,
					array( 'wen_id' => $id ),
					__METHOD__
				);
				$updated++;
			} else {
				$fields['wen_id'] = $id;
				$dbw->insert(
					'wenotes',
					$fields,
					__METHOD__
				);
				$inserted++;
			}

			// Clean up old tags and insert the migrated tags
			$dbw->delete(
				'wenotes_tags',
				array( 'wet_id' => $id ),
				__METHOD__
			);
			foreach ( $tags as $t ) {
				$dbw->insert(
					'wenotes_tags',
					array(
						'wet_id' => $id,
						'wet_tag' => $t
					),
					__METHOD__
				);
			}
		}

		$this->output( "Notes migration completed: Inserted $inserted, Updated $updated, Skipped $skipped\n" );
	}

	private function migrateAvatars( $host, $port, $dbName, $user, $pass ) {
		$url = "http://";
		if ( $user !== '' ) {
			$url .= rawurlencode( $user ) . ":" . rawurlencode( $pass ) . "@";
		}
		$url .= $host . ":" . $port . "/" . $dbName . "/_all_docs?include_docs=true";

		$response = $this->fetchFromCouch( $url );
		if ( !$response ) {
			$this->error( "Could not retrieve avatars from CouchDB. URL: $url" );
			return;
		}

		$data = json_decode( $response, true );
		if ( !isset( $data['rows'] ) ) {
			$this->error( "Invalid avatars response format from CouchDB." );
			return;
		}

		$rows = $data['rows'];
		$total = count( $rows );
		$this->output( "Found $total documents in CouchDB avatars database. Starting migration...\n" );

		$dbw = wfGetDB( DB_MASTER );
		$inserted = 0;
		$updated = 0;
		$skipped = 0;

		foreach ( $rows as $row ) {
			if ( !isset( $row['doc'] ) ) {
				$skipped++;
				continue;
			}
			$doc = $row['doc'];
			$userName = isset( $doc['_id'] ) ? $doc['_id'] : null;

			// Skip design documents or empty entries
			if ( !$userName || strpos( $userName, '_design/' ) === 0 || !isset( $doc['url'] ) ) {
				$skipped++;
				continue;
			}

			$avatarUrl = $doc['url'];

			// If it's a local wiki image URL, extract the plain filename
			if ( preg_match( '/\/images\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^\/]+)/i', $avatarUrl, $matches ) ) {
				$avatarUrl = rawurldecode( $matches[1] );
			}

			// Check if already exists in MariaDB
			$exists = $dbw->selectField(
				'wenotes_avatars',
				'1',
				array( 'wea_user_name' => $userName ),
				__METHOD__
			);

			if ( $exists ) {
				$dbw->update(
					'wenotes_avatars',
					array( 'wea_url' => $avatarUrl ),
					array( 'wea_user_name' => $userName ),
					__METHOD__
				);
				$updated++;
			} else {
				$dbw->insert(
					'wenotes_avatars',
					array(
						'wea_user_name' => $userName,
						'wea_url' => $avatarUrl
					),
					__METHOD__
				);
				$inserted++;
			}
		}

		$this->output( "Avatars migration completed: Inserted $inserted, Updated $updated, Skipped $skipped\n" );
	}

	private function fetchFromCouch( $url ) {
		$ch = curl_init();
		curl_setopt( $ch, CURLOPT_URL, $url );
		curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
		curl_setopt( $ch, CURLOPT_TIMEOUT, 30 );
		$response = curl_exec( $ch );
		$httpCode = curl_getinfo( $ch, CURLINFO_HTTP_CODE );
		curl_close( $ch );

		if ( $response === false || $httpCode !== 200 ) {
			return null;
		}
		return $response;
	}
}

$maintClass = 'MigrateWEnotes';
require_once RUN_MAINTENANCE_IF_MAIN;
