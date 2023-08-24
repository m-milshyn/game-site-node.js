const express = require('express');
const app = express();
const db = require("./database.js");
const bcrypt = require("bcrypt");
const session = require('express-session');


app.use(session({
    secret: 'randomly generated secret',
}));

app.set('view engine', 'ejs');

app.use('/bootstrap', express.static(`${__dirname}/node_modules/bootstrap/dist`));
app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist'));
app.use('/assets', express.static(__dirname + '/assets'));
app.use(express.urlencoded());

function setCurrentUser(req, res, next) {
    if (req.session.loggedIn) {
        let sql = "SELECT * FROM user WHERE id_user= ?";
        let params = [req.session.userId];
        db.get(sql, params, (err, row) => {
            if (row !== undefined) {
                res.locals.currentUser = row
                req.session.userFailed = row["failed_login"]
            }
            return next()
        });
    } else {
        return next()
    }
}

app.use(setCurrentUser)

function checkAuth(req, res, next) {
    if (req.session.loggedIn) {
        return next()
    } else {
        res.redirect('/login')
    }
}

function Error(err, res) {
    if (err) {
        res.status(400)
        res.send("database error:" + err.message)
        return;
    }
}

app.get('/', function (req, res) {
    req.session.Error = false
    res.render('index', { activePage: "home" })
});
app.get('/contact', function (req, res) {
    req.session.Error = false
    res.render('contact', { activePage: "contact" })
});
app.post('/contact', function (req, res) {
    res.render('contact_answer', { activePage: "contact", formData: req.body })
});
app.get('/mypost', function (req, res) {
    res.render('mypost', { activePage: "mypost", formData: req.body });
    req.session.loggedIn = true;
});
app.get('/new_post', (req, res) => {
    res.render('new_post', { activePage: "new_post" })
});
app.get('/comment', (req, res) => {
    res.render('comment', { activePage: "post" })
});
app.get('/login', function (req, res) {
    req.session.Error = false
    res.render('login', { activePage: "login", error: "" })
});
app.get('/logout', function (req, res) {
    req.session.userId = null
    req.session.loggedIn = false
    res.redirect("/login")
});
app.get('/signup', function (req, res) {
    req.session.Error = false
    res.render('signup', { activePage: "signup" })
});
app.get('/profile', checkAuth, function (req, res) {
    res.render('profile', { activePage: "profile" })
})

app.get('/posts', function (req, res) {
    let params = [req.session.userId]
    let sql = "SELECT * FROM posts WHERE id_user = ?"
    db.all(sql, params, (err, rows) => {
        Error(err, res);
        res.render('posts', { activePage: "posts", posts: rows })
    });
});

app.post('/new_post', function (req, res) {
    var data = [
        req.session.userId,
        req.body.title,
        req.body.author,
        req.body.category,
        req.body.body
    ]
    var sql = "INSERT INTO posts (id_user, title, author, category, body) VALUES (?,?,?,?,?)"
    db.run(sql, data, function (err, result) {
        Error(err, res);
        res.render('new_post_answer', { activePage: "new_post", formData: req.body })
    });
});

app.post('/posts/:id/edit', function (req, res) {
    var data = [
        req.body.title,
        req.body.author,
        req.body.body,
        req.body.category,
        req.params.id
    ]
    db.run(
        `UPDATE posts SET
 title = COALESCE(?,title),
 author = COALESCE(?,author),
 category = COALESCE(?,category),
 body = COALESCE(?,body)
 WHERE id_post = ?`,
        data,
        function (err, result) {
            Error(err, res);
            res.redirect('/posts')
        });
});

app.get('/posts/:id/edit', function (req, res) {
    let sql = "SELECT * FROM posts WHERE id_post = ?";
    let params = [req.params.id];
    db.get(sql, params, (err, row) => {
        Error(err, res);
        res.render('edit_post', { post: row, activePage: "posts" })
    });
});

app.get('/posts/:id/delete', function (req, res) {
    var sql = "DELETE FROM posts WHERE id_post = ?"
    var params = [req.params.id]
    db.get(sql, params, (err, row) => {
        Error(err, res);
        res.redirect('/posts')
    });
});

app.get('/posts/:id/show_post', function (req, res) {
    let sql = "SELECT * FROM posts WHERE id_post = ?"
    let params = [req.params.id]
    db.get(sql, params, (err, row) => {
        Error(err, res);
        let sql1 = "SELECT * FROM comment WHERE (id_post = ? AND comment_body IS NOT NULL)"
        db.all(sql1, params, (err, rows) => {
            Error(err, res);
            res.render('show_post', {
                activePage: 'posts',
                Post: row,
                comments: rows,
                ActiveUser: req.session.userId,
                error: req.session.Error
            })
        });
    });
})

app.post('/posts/:id/show_post/comment', function (req, res) {
    let postid = req.params.id
    if (req.session.loggedIn) {
        let data = [
            req.params.id,
            req.session.userId,
            req.body.comment_author,
            req.body.comment_body
        ]
        let sql = "INSERT INTO comment (id_post, user_id, comment_author, comment_body) VALUES (?,?,?,?)"
        db.run(sql, data, function (err, result) {
            Error(err, res)
            req.session.Error = false
            res.redirect("/posts/" + postid + "/show_post")
        });
    } else {
        req.session.Error = true
        res.redirect("/posts/" + postid + "/show_post")
    }
})

app.post('/login', function (req, res) {
    let sql = "SELECT * FROM user WHERE email = ?"
    let params = [req.body.email]
    let error = ""
    db.get(sql, params, (err, row) => {
        if (row.failed_login >= 3) {
            error = "Your account is blocked"
            res.render('login', { activePage: "login", error: error })
        } else {
            if (err) {
                error = err.message
            }
            if (row === undefined) {
                error = "Wrong email or password"
            }
            if (error !== "") {
                res.render('login', { activePage: "login", error: error })
                return
            }
            bcrypt.compare(req.body.password, row['password'], function (err, hashRes) {
                if (hashRes === false) {
                    if (req.session.userFailed < 3) {
                        req.session.userFailed = row['failed_login']
                        error = "Wrong email or password"
                        req.session.userFailed += 1
                    }
                    db.run(
                        `UPDATE user SET
                     failed_login = COALESCE(?,failed_login)
                     WHERE id_user = ?`,
                        [req.session.userFailed, row['id_user']],
                        function (err, result) {
                            Error(err, res);
                        });
                    res.render('login', { activePage: "login", error: error })
                    return
                }
                req.session.userId = row['id_user']
                req.session.userName = row['name']
                req.session.loggedIn = true
                db.run(
                    `UPDATE user SET
             failed_login = COALESCE(0,failed_login)
             WHERE id_user = ?`,
                    [req.session.userId],
                    function (err, result) {
                        Error(err, res);
                        res.redirect("/")
                    });
            });
        }
    })
});
app.post('/signup', function (req, res) {
    bcrypt.hash(req.body.password, 10, function (err, hash) {
        var data = [
            req.body.name,
            req.body.email,
            hash
        ]
        var sql = "INSERT INTO user (name, email, password, failed_login) VALUES (?,?,?,0)"
        db.run(sql, data, function (err, result) {
            Error(err, res);
            res.render('signup_answer', {
                activePage: "signup", formData:
                    req.body
            })
        });
    });
});

app.get('/browse', function (req, res) {
    let sql = "SELECT * FROM posts";
    db.all(sql, [], (err, rows) => {
        Error(err, res);
        res.render('browse', { activePage: "browse", posts: rows })
    });
});

app.post('/browse', function (req, res) {
    let sql = "SELECT * FROM posts WHERE UPPER(title) LIKE UPPER('%' || ? || '%') OR UPPER(category) LIKE UPPER('%' || ? || '%')"
    db.all(sql, [req.body.searchKeyword, req.body.searchKeyword], (err, rows) => {
        Error(err, res);
        res.render('browse', { activePage: "browse", posts: rows })
    });
})
app.listen(3000);
