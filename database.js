var sqlite3 = require('sqlite3').verbose()

var DBSOURCE = "./db/db.sqlite"

var db = new sqlite3.Database(DBSOURCE, (err) => {
    db.run(`CREATE TABLE user (
id_user INTEGER PRIMARY KEY AUTOINCREMENT,
name text,
email text UNIQUE,
password text,
failed_login INTEGER,
CONSTRAINT email_unique UNIQUE (email)
 )`,
        (err) => {
            if (err) {
                console.log("Table users is already created")
            } else {
                console.log("Table users is created")
            }
        });
});
db.run(`CREATE TABLE posts (
            id_post INTEGER PRIMARY KEY AUTOINCREMENT,
            id_user INTEGER,
            title text,
            author text,
            category text,
            body text
          )`,
    (err) => {
        if (err) {
            console.log("Table posts id already created:" + err.message)
        } else {
            console.log("Table posts is created")
        }
    });
db.run(`CREATE TABLE comment (
            comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_post INTEGER,
            user_id INTEGER,
            comment_author text,
            comment_body text
          )`,
    (err) => {
        if (err) {
            console.log("Table comment id already created:" + err.message)
        } else {
            console.log("Table comment is created")
        }
    });
module.exports = db
