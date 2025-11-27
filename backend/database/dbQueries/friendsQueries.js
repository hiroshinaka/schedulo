let searchFriendsForUser = async (pool, userId, q, limit = 10) => {
  if (!q || !q.trim()) return [];
  const like = `%${q}%`;
  const [rows] = await pool.query(
    `SELECT u.user_id AS id, u.first_name, u.last_name, u.email, u.image_url
     FROM ` + "`user`" + ` u
     JOIN friend f ON ((f.friend_1 = ? AND f.friend_2 = u.user_id) OR (f.friend_2 = ? AND f.friend_1 = u.user_id))
     WHERE (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)
     LIMIT ?`,
    [userId, userId, like, like, like, limit]
  );
  return rows;
};

let searchUsers = async (pool, q, limit = 10, excludeUserId = null) => {
  if (!q || !q.trim()) return [];
  const like = `%${q}%`;
  const params = [like, like, like, limit];
  let sql = `SELECT user_id AS id, first_name, last_name, email, image_url FROM ` + "`user`" + ` WHERE (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?) `;
  if (excludeUserId) {
    sql += ` AND user_id != ? `;
    params.splice(3, 0, excludeUserId);
  }
  sql += ` LIMIT ?`;
  const [rows] = await pool.query(sql, params);
  return rows;
};

let getFriends = async (pool, userId) => {
  const [rows] = await pool.query(
    `SELECT u.user_id AS id, u.first_name, u.last_name, u.email, u.image_url
     FROM ` + "`user`" + ` u
     JOIN friend f ON ((f.friend_1 = ? AND f.friend_2 = u.user_id) OR (f.friend_2 = ? AND f.friend_1 = u.user_id))`,
    [userId, userId]
  );
  return rows;
};

let getPendingRequests = async (pool, userId) => {
  const [rows] = await pool.query(
    `SELECT fr.request_id, fr.sender_id, fr.receiver_id, frs.status_name as status, fr.sent_at,
            u.first_name, u.last_name, u.email, u.image_url
     FROM friend_request fr
     JOIN ` + "`user`" + ` u ON fr.sender_id = u.user_id
     JOIN friend_request_status frs ON fr.status_id = frs.status_id
     WHERE fr.receiver_id = ? AND frs.status_name = 'pending'
     ORDER BY fr.sent_at DESC`,
    [userId]
  );
  return rows;
};

let getSentRequests = async (pool, userId) => {
  const [rows] = await pool.query(
    `SELECT fr.request_id, fr.sender_id, fr.receiver_id, frs.status_name as status, fr.sent_at,
            u.first_name, u.last_name, u.email, u.image_url
     FROM friend_request fr
     JOIN ` + "`user`" + ` u ON fr.receiver_id = u.user_id
     JOIN friend_request_status frs ON fr.status_id = frs.status_id
     WHERE fr.sender_id = ? AND frs.status_name = 'pending'
     ORDER BY fr.sent_at DESC`,
    [userId]
  );
  return rows;
};

let createFriendRequest = async (pool, senderId, receiverId) => {
  const [result] = await pool.query(
    `INSERT INTO friend_request (sender_id, receiver_id, status_id) VALUES (?, ?, 1)`,
    [senderId, receiverId]
  );
  return result.insertId;
};

let acceptFriendRequest = async (pool, requestId, userId) => {
  const [requestRows] = await pool.query(
    `SELECT sender_id, receiver_id FROM friend_request WHERE request_id = ? AND receiver_id = ? AND status_id = 1`,
    [requestId, userId]
  );
  
  if (!requestRows.length) {
    return { ok: false, message: 'Request not found or already processed' };
  }
  
  const { sender_id, receiver_id } = requestRows[0];
  
  await pool.query(
    `UPDATE friend_request SET status_id = 2, responded_at = NOW() WHERE request_id = ?`,
    [requestId]
  );
  
  await pool.query(
    `INSERT INTO friend (friend_1, friend_2) VALUES (?, ?)`,
    [sender_id, receiver_id]
  );
  
  return { ok: true };
};

let rejectFriendRequest = async (pool, requestId, userId) => {
  const [result] = await pool.query(
    `DELETE FROM friend_request 
     WHERE request_id = ? AND receiver_id = ? AND status_id = 1`,
    [requestId, userId]
  );
  
  return result.affectedRows > 0 ? { ok: true } : { ok: false, message: 'Request not found' };
};

let cancelFriendRequest = async (pool, requestId, userId) => {
  const [result] = await pool.query(
    `UPDATE friend_request SET status_id = 4, responded_at = NOW() 
     WHERE request_id = ? AND sender_id = ? AND status_id = 1`,
    [requestId, userId]
  );
  
  return result.affectedRows > 0 ? { ok: true } : { ok: false, message: 'Request not found' };
};

let removeFriend = async (pool, userId, friendId) => {
  await pool.query(
    `DELETE FROM friend_request 
     WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
     AND status_id = 2`,
    [userId, friendId, friendId, userId]
  );
  
  const [result] = await pool.query(
    `DELETE FROM friend WHERE (friend_1 = ? AND friend_2 = ?) OR (friend_1 = ? AND friend_2 = ?)`,
    [userId, friendId, friendId, userId]
  );
  
  return result.affectedRows > 0 ? { ok: true } : { ok: false, message: 'Friend not found' };
};

let checkExistingRequest = async (pool, senderId, receiverId) => {
  const [rows] = await pool.query(
    `SELECT fr.request_id, frs.status_name as status FROM friend_request fr
     JOIN friend_request_status frs ON fr.status_id = frs.status_id
     WHERE ((fr.sender_id = ? AND fr.receiver_id = ?) OR (fr.sender_id = ? AND fr.receiver_id = ?))
     AND frs.status_name = 'pending'`,
    [senderId, receiverId, receiverId, senderId]
  );
  return rows[0] || null;
};

let checkFriendship = async (pool, userId1, userId2) => {
  const [rows] = await pool.query(
    `SELECT friend_id FROM friend 
     WHERE (friend_1 = ? AND friend_2 = ?) OR (friend_1 = ? AND friend_2 = ?)`,
    [userId1, userId2, userId2, userId1]
  );
  return rows.length > 0;
};

let getUnreadRequestCount = async (pool, userId) => {
  const [rows] = await pool.query(
    `SELECT COUNT(*) as count FROM friend_request 
     WHERE receiver_id = ? AND status_id = 1 AND read_at IS NULL`,
    [userId]
  );
  return rows[0].count;
};

let markRequestsAsRead = async (pool, userId) => {
  await pool.query(
    `UPDATE friend_request SET read_at = NOW() 
     WHERE receiver_id = ? AND status_id = 1 AND read_at IS NULL`,
    [userId]
  );
  return { ok: true };
};

module.exports = { 
  searchFriendsForUser, 
  searchUsers, 
  getFriends, 
  getPendingRequests, 
  getSentRequests, 
  createFriendRequest, 
  acceptFriendRequest, 
  rejectFriendRequest, 
  cancelFriendRequest, 
  removeFriend,
  checkExistingRequest,
  checkFriendship,
  getUnreadRequestCount,
  markRequestsAsRead
};
