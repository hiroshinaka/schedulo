let searchFriendsForUser = async (pool, userId, q, limit = 10) => {
  if (!q || !q.trim()) return [];
  const like = `%${q}%`;
  const [rows] = await pool.query(
    `SELECT u.user_id AS id, u.first_name, u.last_name, u.email
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
  let sql = `SELECT user_id AS id, first_name, last_name, email FROM ` + "`user`" + ` WHERE (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?) `;
  if (excludeUserId) {
    sql += ` AND user_id != ? `;
    params.splice(3, 0, excludeUserId); // insert before limit
  }
  sql += ` LIMIT ?`;
  const [rows] = await pool.query(sql, params);
  return rows;
};

module.exports = { searchFriendsForUser, searchUsers };
