let createUser = async(pool, first_name, last_name, email, hashedPassword) => {
    const [result] = await pool.query(
        `INSERT INTO user (first_name, last_name, email, hash_password)
        VALUES (?, ?, ?, ?);`,
        [first_name, last_name, email, hashedPassword]);
    const insertId = result.insertId;
    const [rows] = await pool.query(
        'SELECT user_id AS id, first_name, last_name, email FROM user WHERE user_id = ?',
        [insertId]
    );

    if (!rows.length) {
        throw new Error('Failed to retrieve created user');
    }

    return rows[0];
};
let getUserByEmail = async(pool, email) => {
    const [rows] = await pool.query(
        'SELECT user_id AS id, first_name, last_name, email, hash_password AS password FROM user WHERE email = ?',
        [email]
    );
    return rows[0];
};
module.exports = {createUser, getUserByEmail};