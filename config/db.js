const mysql = require('mysql2');

// =====================================================
// Connection Pool
// -----------------------------------------------------
// A single connection (mysql.createConnection) can drop
// under concurrent requests (e.g. two patients booking
// at once) and the whole app stops working until it's
// manually reconnected. A pool hands out/reuses a fixed
// number of connections automatically, so it recovers
// from a single dropped connection on its own.
// =====================================================

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'smart_queue_management',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Quick check on startup that the DB is reachable.
// (Pools don't connect immediately like createConnection did,
// so we grab one connection just to confirm and release it.)

pool.getConnection((err, connection) => {

    if (err) {
        console.log('Database connection failed');
        console.log(err);
    } else {
        console.log('Database connected successfully!');
        connection.release();
    }

});

// pool.query(...) and pool.execute(...) work exactly like
// connection.query(...) did, so every existing model file
// (userModel.js etc.) keeps working with no changes needed.

module.exports = pool;
