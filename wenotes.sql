--
-- Schema for the WEnotes extension
--
CREATE TABLE /*_*/wenotes (
  wen_id varchar(32) NOT NULL PRIMARY KEY,
  wen_tag varchar(64) DEFAULT NULL,
  wen_page varchar(255) DEFAULT NULL,
  wen_timestamp varchar(30) NOT NULL,
  wen_deleted tinyint DEFAULT 0,
  wen_deleted_by varchar(255) DEFAULT NULL,
  wen_deleted_at varchar(30) DEFAULT NULL,
  wen_doc mediumtext NOT NULL
) /*$wgDBTableOptions*/;

CREATE INDEX /*i*/wen_tag_time ON /*_*/wenotes (wen_tag, wen_timestamp);
CREATE INDEX /*i*/wen_page_time ON /*_*/wenotes (wen_page, wen_timestamp);
CREATE INDEX /*i*/wen_timestamp ON /*_*/wenotes (wen_timestamp);

CREATE TABLE /*_*/wenotes_avatars (
  wea_user_name varchar(255) NOT NULL PRIMARY KEY,
  wea_url varchar(255) NOT NULL
) /*$wgDBTableOptions*/;

CREATE TABLE /*_*/wenotes_tags (
  wet_id varchar(32) NOT NULL,
  wet_tag varchar(64) NOT NULL,
  PRIMARY KEY (wet_id, wet_tag)
) /*$wgDBTableOptions*/;

CREATE INDEX /*i*/wet_tag ON /*_*/wenotes_tags (wet_tag);
