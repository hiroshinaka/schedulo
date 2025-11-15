CREATE TABLE user (
  user_id int NOT NULL AUTO_INCREMENT,
  first_name varchar(255) DEFAULT NULL,
  last_name varchar(255) DEFAULT NULL,
  email varchar(255) DEFAULT NULL,
  hash_password varchar(255) DEFAULT NULL,
  PRIMARY KEY (user_id)
);

CREATE TABLE friend (
  friend_id int NOT NULL AUTO_INCREMENT,
  friend_1 int NOT NULL,
  friend_2 int NOT NULL,
  PRIMARY KEY (friend_id),
  KEY friend_1 (friend_1),
  KEY friend_2 (friend_2),
  CONSTRAINT friend_ibfk_1 FOREIGN KEY (friend_1) REFERENCES user (user_id),
  CONSTRAINT friend_ibfk_2 FOREIGN KEY (friend_2) REFERENCES user (user_id)
);

CREATE TABLE friend_request (
  request_id INT NOT NULL AUTO_INCREMENT,
  sender_id INT NOT NULL,
  receiver_id INT NOT NULL,
  status ENUM('pending', 'accepted', 'rejected', 'cancelled') DEFAULT 'pending',
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  responded_at DATETIME DEFAULT NULL,
  PRIMARY KEY (request_id),
  CONSTRAINT fk_sender FOREIGN KEY (sender_id) REFERENCES user(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_receiver FOREIGN KEY (receiver_id) REFERENCES user(user_id) ON DELETE CASCADE,
  CONSTRAINT uq_request UNIQUE (sender_id, receiver_id)
);

CREATE TABLE event (
  event_id INT NOT NULL AUTO_INCREMENT,
  owner_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  location VARCHAR(255) DEFAULT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  colour VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
  is_all_day TINYINT(1) DEFAULT 0,
  deleted_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id),
  KEY idx_event_owner (owner_id),
  KEY idx_event_start_time (start_time),
  CONSTRAINT event_ibfk_owner FOREIGN KEY (owner_id)
    REFERENCES user (user_id)
    ON DELETE CASCADE
);


CREATE TABLE event_attendee (
  event_attendee_id INT NOT NULL AUTO_INCREMENT,
  event_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('owner', 'guest') DEFAULT 'guest',  -- owner vs invited user
  status ENUM('pending', 'going', 'maybe', 'declined') DEFAULT 'pending',
  invited_by  INT DEFAULT NULL,                  -- who sent the invite
  invited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  responded_at DATETIME DEFAULT NULL,
  PRIMARY KEY (event_attendee_id),
  UNIQUE KEY uq_event_user (event_id, user_id),  -- no duplicates
  KEY idx_event_attendee_event (event_id),
  KEY idx_event_attendee_user (user_id),
  CONSTRAINT event_attendee_ibfk_event
    FOREIGN KEY (event_id) REFERENCES event (event_id) ON DELETE CASCADE,
  CONSTRAINT event_attendee_ibfk_user
    FOREIGN KEY (user_id) REFERENCES user (user_id) ON DELETE CASCADE,
  CONSTRAINT event_attendee_ibfk_invited_by
    FOREIGN KEY (invited_by) REFERENCES user (user_id) ON DELETE SET NULL
);

