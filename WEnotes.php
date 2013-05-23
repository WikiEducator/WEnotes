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

require_once('sag/src/Sag.php');

$wgExtensionCredits['parserhook'][] = array(
	'path'           => __FILE__,
	'name'           => 'WEnotes',
	'version'        => '0.5',
	'url'            => 'http://WikiEducator.org/Extension:WEnotes',
	'author'         => '[http://WikiEducator.org/User:JimTittsler Jim Tittsler]',
        'description'    => 'add API calls for posting to a WEnotes microblog',
);

$wgAPIModules['wenotes'] = 'APIWEnotes';

class APIWEnotes extends ApiQueryBase {
	public function __construct( $query, $moduleName ) {
		parent :: __construct( $query, $moduleName, 'no' );
	}

	public function execute() {
		global $wgUser, $wgServer;
		global $wgWEnotesHost, $wgWEnotesPort;
		global $wgWEnotesDB, $wgWEnotesAvatarsDB;
		global $wgWEnotesUser, $wgWEnotesPasswd, $wgWEnotesTags;
		global $wgWEnotesPostLimit;
		$id = NULL;
		$user = $wgUser->getId();
		$params = $this->extractRequestParams();

		if ( $user <= 0 ) {
			$this->dieUsage('must be logged in to post a WEnote',
				'notloggedin');
		}
		if (isset($params['id'])) {
			if ($wgUser->isAllowed('delete')) {
				$id = $params['id'];
			} else {
				$this->dieUsage('user not allowed to delete',
					'nodelete');
			}
		} else {
			if (!isset($params['tag'])) {
				$this->dieUsage('tag argument not supplied',
					'missingtag');
			}
			$tag = strtolower($params['tag']);
			if (!in_array($tag, $wgWEnotesTags)) {
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
		}

		list($usec, $ts) = explode(' ', microtime());
		$sag = new Sag($wgWEnotesHost, $wgWEnotesPort);
		if ($id) {
			$sag->setDatabase($wgWEnotesDB);
			$sag->login($wgWEnotesUser, $wgWEnotesPasswd);
			try {
				$m = $sag->get($id)->body;
				# mark deletion, and who/when
				$m->we_d = true;
				$m->we_d_by = $wgUser->getName();
				$m->we_d_at = date('Y-m-d\TH:i:s.000\Z', $ts);
				if (!$sag->put($m->_id, $m)->body->ok) {
					error_log("unable to edit $id");
				}
			}
			catch (SagCouchException $e) {
				error_log($e->getCode() . " unable to edit $id");
			}
		} else {
			$sag->setDatabase($wgWEnotesAvatarsDB);
			try {
				$userName = $wgUser->getName();
				$imgurl = $sag->get($userName)->body->url;
			} catch(Exception $e) {
				error_log('Error: ' . $e->getCode() .
					" unable to get avatar for $userName");
				$imgurl = '';
			}
			$sag->setDatabase($wgWEnotesDB);
			$sag->login($wgWEnotesUser, $wgWEnotesPasswd);
			$data = array(
				'from_user' => $wgUser->getName(),
				'from_user_name' => $wgUser->getRealName(),
				'created_at' => date('r', $ts),
				'profile_image_url' => $imgurl,
				'text' => $params['text'],
				'id' => $ts . substr("00000$usec", 0, 6),
				'profile_url' => $wgServer. '/User:' . $wgUser->getTitleKey(),
				'we_source' => 'wikieducator',
				'we_tags' => array($params['tag']),
				'we_timestamp' => date('Y-m-d\TH:i:s.000\Z', $ts)
			);
			$sag->post($data);

			$result = $this->getResult();
			$result->addValue('post', $this->getModuleName(), true);
		}
	}

	public function getAllowedParams() {
		return array (
			'tag' => null,
			'text' => null,
			'id' => null,
		);
	}

	public function getParamDescription() {
		return array (
			'tag' => 'tag to apply to posting',
			'text' => 'text to be posted',
			'id' => 'id of existing item (only for edit)',
		);
	}

	public function getDescription() {
		return 'allow posting a WEnote for logged in users';
	}

	protected function getExamples() {
		return array (
			'api.php?action=wenotes&notag=wikieducator&notext=First%20post',
		);
	}

	public function getVersion() {
		return __CLASS__ . ': 0';
	}
}

