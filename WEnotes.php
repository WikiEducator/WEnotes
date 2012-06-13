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
	'name'           => 'WEnotes',
	'version'        => '0.1',
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
		global $wgWEnotesHost, $wgWEnotesPort, $wgWEnotesDB;
		global $wgWEnotesUser, $wgWEnotesPasswd, $wgWEnotesTags;
		$user = $wgUser->getId();
		$params = $this->extractRequestParams();

		if ( $user <= 0 ) {
			$this->dieUsage('must be logged in to post a WEnote',
				'notloggedin');
		}
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
		if (strlen($params['text']) > 200) {
			$this->dieUsage('text posting too long',
				'toolong');
		}

		$sag = new Sag($wgWEnotesHost, $wgWEnotesPort);
		$sag->setDatabase($wgWEnotesDB);
		$sag->login($wgWEnotesUser, $wgWEnotesPasswd);
		list($usec, $ts) = explode(' ', microtime());
		$data = array(
			'from_user' => $wgUser->getName(),
			'from_user_name' => $wgUser->getRealName(),
			'created_at' => date('r', $ts),
			'profile_image_url' => '',
			'text' => $params['text'],
			'id' => $ts . substr("00000$usec", 0, 6),
			'profile_url' => $wgServer. '/User:' . $wgUser->getTitleKey(),
			'we_source' => 'wikieducator',
			'we_tag' => $params['tag'],
			'we_timestamp' => date('Y-m-d\TH:i:s.000\Z', $ts)
		);
		$sag->post($data);

		$result = $this->getResult();
		$result->addValue('post', $this->getModuleName(), true);
	}

	public function getAllowedParams() {
		return array (
			'tag' => null,
			'text' => null
		);
	}

	public function getParamDescription() {
		return array (
			'tag' => 'tag to apply to posting',
			'text' => 'text to be posted',
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

