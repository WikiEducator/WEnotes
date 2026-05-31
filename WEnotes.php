<?php
# ex: tabstop=8 shiftwidth=8 noexpandtab
/**
 * @package MediaWiki
 * @subpackage WEnotes
 * @author Jim Tittsler <jim@OERfoundation.org>
 * @licence GPL2
 */

if( !defined( 'MEDIAWIKI' ) ) {
	die( "This file is an extension to the MediaWiki software and cannot be used standalone.\n" );
}

$wgExtensionCredits['parserhook'][] = array(
	'path'           => __FILE__,
	'name'           => 'WEnotes',
	'version'        => '0.9.0',
	'url'            => 'http://WikiEducator.org/Extension:WEnotes',
	'author'         => '[http://WikiEducator.org/User:JimTittsler Jim Tittsler]',
	'description'    => 'add API calls for posting, deleting, or querying a WEnotes microblog',
);

$wgAPIModules['wenotes'] = 'APIWEnotes';

$wgHooks['LoadExtensionSchemaUpdates'][] = 'fnWEnotesSchemaUpdates';
$wgHooks['ArticleSaveComplete'][] = 'fnWEnotesArticleSaveComplete';

function fnWEnotesSchemaUpdates( DatabaseUpdater $updater ) {
	$dbType = $updater->getDB()->getType();
	if ( $dbType === 'mysql' || $dbType === 'sqlite' ) {
		$updater->addExtensionTable( 'wenotes', __DIR__ . '/wenotes.sql' );
		$updater->addExtensionTable( 'wenotes_tags', __DIR__ . '/wenotes.sql' );
	}
	return true;
}

function fnWEnotesArticleSaveComplete( &$article, &$user, $text, $summary, $minoredit, $watchthis, $sectionanchor, &$flags, $revision, &$status, $baseRevId ) {
	$title = $article->getTitle();
	if ( $title->getNamespace() === NS_USER ) {
		// Ignore subpages (e.g. User:JimTittsler/WEnotes)
		if ( strpos( $title->getText(), '/' ) !== false ) {
			return true;
		}

		$userName = $title->getText();

		// Check if user has an entry in wenotes_avatars
		$dbr = wfGetDB( DB_SLAVE );
		$exists = $dbr->selectField(
			'wenotes_avatars',
			'1',
			array( 'wea_user_name' => $userName ),
			__METHOD__
		);

		if ( $exists ) {
			$wikitext = '';
			if ( is_object( $text ) && method_exists( $text, 'getNativeData' ) ) {
				$wikitext = $text->getNativeData();
			} elseif ( is_object( $text ) && method_exists( $text, 'getText' ) ) {
				$wikitext = $text->getText();
			} else {
				$wikitext = (string)$text;
			}

			// Extract avatar image name from wikitext
			$avatar = '';
			if ( preg_match( '/\{\{InfoBox\b.*?\|\s*image\s*=\s*([^|\n}]+)/is', $wikitext, $matches ) ) {
				$avatar = trim( $matches[1] );
				$avatar = preg_replace( '/^(File|Image):/i', '', $avatar );
			}

			// Update the database
			$dbw = wfGetDB( DB_MASTER );
			$dbw->update(
				'wenotes_avatars',
				array( 'wea_url' => $avatar ),
				array( 'wea_user_name' => $userName ),
				__METHOD__
			);
		}
	}
	return true;
}

class APIWEnotes extends ApiQueryBase {
	private function injectAvatars( &$rows ) {
		if ( empty( $rows ) ) {
			return;
		}
		$names = array();
		foreach ( $rows as $row ) {
			if ( isset( $row['doc']['from_user'] ) ) {
				$names[] = $row['doc']['from_user'];
			}
		}
		$names = array_values( array_unique( $names ) );
		if ( empty( $names ) ) {
			return;
		}

		$dbr = wfGetDB( DB_SLAVE );
		$res = $dbr->select(
			'wenotes_avatars',
			array( 'wea_user_name', 'wea_url' ),
			array( 'wea_user_name' => $names ),
			__METHOD__
		);
		$avatarsMap = array();
		foreach ( $res as $avatarRow ) {
			$avatarsMap[$avatarRow->wea_user_name] = $avatarRow->wea_url;
		}

		$resolvedMap = array();
		foreach ( $names as $name ) {
			$avatarVal = isset( $avatarsMap[$name] ) ? $avatarsMap[$name] : null;
			$url = '';
			if ( $avatarVal ) {
				if ( preg_match( '/^https?:\/\//i', $avatarVal ) ) {
					$url = $avatarVal;
				} else {
					$file = wfFindFile( $avatarVal );
					if ( $file ) {
						$thumb = $file->transform( array( 'width' => 48 ) );
						if ( $thumb ) {
							$url = $thumb->getUrl();
						}
					}
				}
			}
			$resolvedMap[$name] = $url;
		}

		foreach ( $rows as &$row ) {
			$fromUser = isset( $row['doc']['from_user'] ) ? $row['doc']['from_user'] : null;
			if ( $fromUser && isset( $resolvedMap[$fromUser] ) && $resolvedMap[$fromUser] !== '' ) {
				$row['doc']['profile_image_url'] = $resolvedMap[$fromUser];
			}
		}
	}

	private function injectFavoriteStatus( &$rows ) {
		global $wgUser;
		if ( empty( $rows ) || !$wgUser->isLoggedIn() ) {
			return;
		}
		$vids = array();
		foreach ( $rows as $row ) {
			$vids[] = $row['id'];
		}
		$dbr = wfGetDB( DB_SLAVE );
		$res = $dbr->select(
			'wevotes',
			array( 'wev_vid', 'wev_vote' ),
			array(
				'wev_user_name' => $wgUser->getName(),
				'wev_vid' => $vids
			),
			__METHOD__
		);
		$myVotes = array();
		foreach ( $res as $voteRow ) {
			$myVotes[$voteRow->wev_vid] = intval( $voteRow->wev_vote );
		}
		foreach ( $rows as &$row ) {
			$vid = $row['id'];
			if ( isset( $myVotes[$vid] ) && $myVotes[$vid] > 0 ) {
				$row['doc']['favorited'] = true;
			}
		}
	}

	// return an array of allowed tags
	private function getTags() {
		global $wgWEnotesTagsNS, $wgWEnotesTagsTitle, $wgWEnotesTags;
		$title = Title::makeTitle( $wgWEnotesTagsNS, $wgWEnotesTagsTitle );
		$wikiPage = new WikiPage( $title );
		$content = $wikiPage->getContent( Revision::RAW );
		if ( isset($wgWEnotesTagsNS ) && isset( $wgWEnotesTagsTitle ) && ( $content === null ) ) {
			error_log( "WEnotes getTags page ($wgWEnotesTagsNS:$wgWEnotesTagsTitle) is unavailable");
		}
		if ( $content !== null ) {
			$text = ContentHandler::getContentText( $content );
			$tags = explode( "\n", $text );
			$tags = array_map( 'trim', $tags );
			$tags = array_filter( $tags, function ( $e ) {
				return ( $e !== '' ) && !preg_match( '/\s*[#;]/', $e );
			} );
			return $tags;
		} elseif ( isset( $wgWEnotesTags ) && is_array( $wgWEnotesTags ) ) {
			return $wgWEnotesTags;
		}
		return array();
	}

	public function __construct( $query, $moduleName ) {
		parent :: __construct( $query, $moduleName, 'no' );
	}

	public function execute() {
		global $wgUser, $wgServer;
		global $wgWEnotesPostLimit;
		$params = $this->extractRequestParams();
		$mode = isset( $params['mode'] ) ? $params['mode'] : 'post';
		$id = isset( $params['id'] ) ? $params['id'] : null;

		// Determine mode if not explicitly set
		if ( $id ) {
			$mode = 'delete';
		} elseif ( isset( $params['ids'] ) || isset( $params['before'] ) || isset( $params['after'] ) || ( isset( $params['tag'] ) && !isset( $params['text'] ) ) ) {
			$mode = 'get';
		}

		if ( $mode === 'get' ) {
			$result = $this->getResult();

			// fetch by list of IDs
			if ( isset( $params['ids'] ) ) {
				$ids = explode( ',', $params['ids'] );
				$ids = array_map( 'trim', $ids );
				$ids = array_filter( $ids );
				if ( empty( $ids ) ) {
					$result->addValue( null, $this->getModuleName(), array(
						'total_rows' => 0,
						'offset' => 0,
						'rows' => array()
					) );
					return;
				}

				$dbr = wfGetDB( DB_SLAVE );
				$res = $dbr->select(
					'wenotes',
					array( 'wen_id', 'wen_doc' ),
					array( 'wen_id' => $ids, 'wen_deleted' => 0 ),
					__METHOD__
				);

				$docsMap = array();
				foreach ( $res as $row ) {
					$docsMap[$row->wen_id] = json_decode( $row->wen_doc, true );
				}

				$rows = array();
				foreach ( $ids as $requestedId ) {
					if ( isset( $docsMap[$requestedId] ) ) {
						$rows[] = array(
							'id' => $requestedId,
							'doc' => $docsMap[$requestedId]
						);
					}
				}

				$this->injectFavoriteStatus( $rows );
				$this->injectAvatars( $rows );

				$result->addValue( null, $this->getModuleName(), array(
					'total_rows' => count( $rows ),
					'offset' => 0,
					'rows' => $rows
				) );
				return;
			}

			// query by tag / page / range
			$conds = array();
			$tables = array( 'wenotes' );
			$join_conds = array();

			if ( isset( $params['tag'] ) && $params['tag'] !== '_' ) {
				$tables[] = 'wenotes_tags';
				$conds['wet_tag'] = strtolower( $params['tag'] );
				$join_conds['wenotes_tags'] = array( 'INNER JOIN', 'wen_id = wet_id' );
			}
			if ( isset( $params['page'] ) ) {
				$conds['wen_page'] = $params['page'];
			}

			$dbr = wfGetDB( DB_SLAVE );

			if ( isset( $params['after'] ) ) {
				$afterQuote = $dbr->addQuotes( $params['after'] );
				$conds[] = "( ( wen_deleted = 0 AND wen_timestamp > $afterQuote ) OR ( wen_deleted = 1 AND wen_deleted_at > $afterQuote ) )";
			} else {
				$conds['wen_deleted'] = 0;
				if ( isset( $params['before'] ) ) {
					$conds[] = 'wen_timestamp < ' . $dbr->addQuotes( $params['before'] );
				}
			}

			$limit = intval( $params['limit'] );
			$options = array(
				'ORDER BY' => 'wen_timestamp DESC',
				'LIMIT' => $limit
			);

			$res = $dbr->select(
				$tables,
				array( 'wen_id', 'wen_doc' ),
				$conds,
				__METHOD__,
				$options,
				$join_conds
			);

			$rows = array();
			foreach ( $res as $row ) {
				$rows[] = array(
					'id' => $row->wen_id,
					'doc' => json_decode( $row->wen_doc, true )
				);
			}

			$this->injectFavoriteStatus( $rows );
			$this->injectAvatars( $rows );

			$totalRows = count( $rows );
			if ( $totalRows >= $limit ) {
				// Signal to client that there might be more notes
				$totalRows = 999999;
			}

			$result->addValue( null, $this->getModuleName(), array(
				'total_rows' => $totalRows,
				'offset' => 0,
				'rows' => $rows
			) );
			return;
		}

		// Delete/edit mode
		if ( $mode === 'delete' || $id ) {
			$user = $wgUser->getId();
			if ( $user <= 0 ) {
				$this->dieUsage('must be logged in to delete a WEnote', 'notloggedin');
			}
			if ( !$wgUser->isAllowed('delete') ) {
				$this->dieUsage('user not allowed to delete', 'nodelete');
			}

			list($usec, $ts) = explode(' ', microtime());
			$timestamp = date('Y-m-d\TH:i:s.000\Z', $ts);

			$dbw = wfGetDB( DB_MASTER );
			$row = $dbw->selectRow(
				'wenotes',
				array( 'wen_doc' ),
				array( 'wen_id' => $id ),
				__METHOD__
			);

			if ( $row ) {
				$doc = json_decode( $row->wen_doc, true );
				$doc['we_d'] = true;
				$doc['we_d_by'] = $wgUser->getName();
				$doc['we_d_at'] = $timestamp;

				$dbw->update(
					'wenotes',
					array(
						'wen_deleted' => 1,
						'wen_deleted_by' => $wgUser->getName(),
						'wen_deleted_at' => $timestamp,
						'wen_doc' => json_encode( $doc )
					),
					array( 'wen_id' => $id ),
					__METHOD__
				);
			}
			$result = $this->getResult();
			$result->addValue( 'post', $this->getModuleName(), true );
			return;
		}

		// Post mode
		$user = $wgUser->getId();
		if ( $user <= 0 ) {
			$this->dieUsage('must be logged in to post a WEnote',
				'notloggedin');
		}
		if (!isset($params['tag'])) {
			$this->dieUsage('tag argument not supplied',
				'missingtag');
		}
		$tag = strtolower($params['tag']);
		if (!in_array($tag, $this->getTags())) {
			$this->dieUsage('unrecognized tag',
				'badtag');
		}
		if (!isset($params['text'])) {
			$this->dieUsage('text argument not supplied',
				'missingtext');
		}
		if (strlen($params['text']) > $wgWEnotesPostLimit) {
			$this->dieUsage('text posting too long',
				'toolong');
		}
		$inreplyto = '';
		if (isset($params['reply'])) {
			$inreplyto = preg_replace('/[^a-z0-9]/i',
				'', $params['reply']);
			if ($inreplyto <> $params['reply']) {
				$this->dieUsage('invalid reply id',
					'invalidreplyid');
			}
		}
		$inreplyroot = '';
		if (isset($params['root'])) {
			$inreplyroot = preg_replace('/[^a-z0-9]/i',
				'', $params['root']);
			if ($inreplyroot !== $params['root']) {
				$this->dieUsage('invalid reply id',
					'invalidreplyid');
			}
		}

		list($usec, $ts) = explode(' ', microtime());

		// retrieve user avatar url/filename from wenotes_avatars table
		$dbr = wfGetDB( DB_SLAVE );
		$avatarRow = $dbr->selectRow(
			'wenotes_avatars',
			array( 'wea_url' ),
			array( 'wea_user_name' => $wgUser->getName() ),
			__METHOD__
		);

		if ( $avatarRow ) {
			$imgurl = $avatarRow->wea_url;
		} else {
			// First post for this user. Perform a local scan of their user page for an avatar.
			$userName = $wgUser->getName();
			$title = Title::makeTitle( NS_USER, $userName );
			$wikiPage = new WikiPage( $title );
			$avatar = '';
			if ( $wikiPage->exists() ) {
				$content = $wikiPage->getContent( Revision::RAW );
				if ( $content !== null ) {
					$wikitext = '';
					if ( is_object( $content ) && method_exists( $content, 'getNativeData' ) ) {
						$wikitext = $content->getNativeData();
					} elseif ( is_object( $content ) && method_exists( $content, 'getText' ) ) {
						$wikitext = $content->getText();
					} else {
						$wikitext = (string)$content;
					}
					if ( preg_match( '/\{\{InfoBox\b.*?\|\s*image\s*=\s*([^|\n}]+)/is', $wikitext, $matches ) ) {
						$avatar = trim( $matches[1] );
						$avatar = preg_replace( '/^(File|Image):/i', '', $avatar );
					}
				}
			}
			// Cache the extracted avatar file name (or empty string if none found)
			$dbw = wfGetDB( DB_MASTER );
			$dbw->insert(
				'wenotes_avatars',
				array(
					'wea_user_name' => $userName,
					'wea_url' => $avatar
				),
				__METHOD__
			);
			$imgurl = $avatar;
		}

		// Resolve filename/URL to a valid web URL
		$resolvedImgUrl = '';
		if ( $imgurl ) {
			if ( preg_match( '/^https?:\/\//i', $imgurl ) ) {
				$resolvedImgUrl = $imgurl;
			} else {
				$file = wfFindFile( $imgurl );
				if ( $file ) {
					$thumb = $file->transform( array( 'width' => 48 ) );
					if ( $thumb ) {
						$resolvedImgUrl = $thumb->getUrl();
					}
				}
			}
		}

		// Extract all tags (primary tag + hashtags from text)
		$tags = array( strtolower( $params['tag'] ) );
		if ( preg_match_all( '/#([a-zA-Z0-9_]+)/', $params['text'], $matches ) ) {
			foreach ( $matches[1] as $match ) {
				$tags[] = strtolower( $match );
			}
		}
		$tags = array_values( array_unique( $tags ) );

		$data = array(
			'from_user' => $wgUser->getName(),
			'from_user_name' => $wgUser->getRealName(),
			'created_at' => date('r', $ts),
			'profile_image_url' => $resolvedImgUrl,
			'text' => $params['text'],
			'id' => $ts . substr("00000$usec", 0, 6),
			'profile_url' => $wgServer. '/User:' . $wgUser->getTitleKey(),
			'we_source' => 'wikieducator',
			'we_tags' => $tags,
			'we_timestamp' => date('Y-m-d\TH:i:s.000\Z', $ts)
		);
		$data['_id'] = $data['id'];

		// if email adr available, store gravatar hash
		$email = $wgUser->getEmail();
		if ($email <> '') {
			$data['gravatar'] = md5(strtolower(trim($email)));
		}
		if ($inreplyto) {
			$data['in_reply_to'] = $inreplyto;
		}
		if ($inreplyroot) {
			$data['in_reply_root'] = $inreplyroot;
		}

		// Insert into MariaDB wenotes table
		$dbw = wfGetDB( DB_MASTER );
		$dbw->insert(
			'wenotes',
			array(
				'wen_id' => $data['id'],
				'wen_tag' => strtolower($params['tag']),
				'wen_page' => isset($params['page']) ? $params['page'] : null,
				'wen_timestamp' => $data['we_timestamp'],
				'wen_deleted' => 0,
				'wen_doc' => json_encode( $data )
			),
			__METHOD__
		);

		// Insert all tags into wenotes_tags
		foreach ( $tags as $t ) {
			$dbw->insert(
				'wenotes_tags',
				array(
					'wet_id' => $data['id'],
					'wet_tag' => $t
				),
				__METHOD__
			);
		}

		$result = $this->getResult();
		$result->addValue('post', $this->getModuleName(), true);
		// pass through the language value
		if (isset($params['wenlang'])) {
			error_log('setting value for wenlang '.$params['wenlang']);
			$result->addValue('wenlang', $params['wenlang'], true);
		} else {
			error_log('no value for wenlang...');
		}
	}

	public function getAllowedParams() {
		return array (
			'tag' => null,
			'text' => null,
			'reply' => null,
			'root' => null,
			'id' => null,
			'mode' => array(
				ApiBase::PARAM_TYPE => array( 'post', 'delete', 'get' ),
				ApiBase::PARAM_DFLT => 'post',
			),
			'before' => null,
			'after' => null,
			'limit' => array(
				ApiBase::PARAM_TYPE => 'integer',
				ApiBase::PARAM_DFLT => 20,
			),
			'ids' => null,
			'page' => null,
			'wenlang' => null,
		);
	}

	public function getParamDescription() {
		return array (
			'tag' => 'tag to apply to posting or filter query by',
			'text' => 'text to be posted',
			'reply' => 'id of message this is a reply to',
			'root' => 'root of thread',
			'id' => 'id of existing item (only for delete/edit)',
			'mode' => 'API mode: post (write a note), delete (remove a note), or get (query notes)',
			'before' => 'only return notes before this timestamp',
			'after' => 'only return notes after this timestamp',
			'limit' => 'maximum number of notes to return',
			'ids' => 'comma-separated list of note IDs to fetch',
			'page' => 'page ID to filter query by',
		);
	}

	public function getDescription() {
		return 'allow posting, deleting, or querying a WEnote for users';
	}

	protected function getExamples() {
		return array (
			'api.php?action=wenotes&notag=wikieducator&notext=First%20post',
			'api.php?action=wenotes&nomode=get&notag=wikieducator&nolimit=5',
		);
	}

}
