let createUser = async(pool, first_name, last_name, email, hashedPassword) => {
    const [result] = await pool.query(
        `INSERT INTO users (first_name, last_name, email, password)
        VALUES (?, ?, ?, ?);`,
        [first_name, last_name, email, hashedPassword]);
    const insertId = result.insertId;
    const [rows] = await pool.query(
        'SELECT id, first_name, last_name, email FROM users WHERE id = ?',
        [insertId]
    );

    if (!rows.length) {
        throw new Error('Failed to retrieve created user');
    }

    return rows[0];
};
let getUserByEmail = async(pool, email) => {
    const [rows] = await pool.query(
        'SELECT id, first_name, last_name, email, password FROM users WHERE email = ?',
        [email]
    );
    return rows[0];
};
module.exports = {createUser, getUserByEmail};