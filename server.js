//load components


var express = require('express');
var app = express();
var mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');

const pug = require('pug');


app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


var connection = mysql.createPool({
	host: 'us-cdbr-iron-east-05.cleardb.net',
	user: 'bea598fafc9665',
	password: '424b9826',
	database: 'heroku_c8fc06d3895023b',
	multipleStatements: true
});

app.set('view engine', 'pug');
app.use(express.static(__dirname + '/'));

app.get('/', function(req, res) {
	res.redirect('home');
})

app.get('/login', function(req, res) {
	res.render('login');
});

app.post('/login', function(req, res) {
	var username = req.body.username;
	var password = req.body.password;

	if (username && password) {
		connection.query('SELECT * FROM user_table WHERE username = ? AND password = ?', [username, password], function(error, results, fields) {
			if (results.length > 0) {
				req.session.loggedin = true;
				req.session.username = username;
				res.redirect('/home');
			} else {
				res.send('Incorrect Username and/or Password!');
			}			
		});
	} else {
		res.send('Please enter Username and Password!');
	}
});

app.get('/logout', function(req, res) {
	req.session.loggedin = false;
	res.redirect('login');
});

app.get('/register', function(req, res) {
	res.render('registration');
});

app.post('/register', function(req, res) {
	var first = req.body.first_name;
	var last = req.body.last_name;
	var email = req.body.email;
	var username = req.body.username;
	var password = req.body.password;

	connection.query('INSERT INTO user_table (first_name, last_name, email, username, password) VALUES (?, ?, ?, ?, ?)', [first, last, email, username, password], function(error, results) {
		if (error) {
			res.redirect('registration');
		}
		else {
			var create_other = "INSERT INTO categories (category_id, user_id, name) VALUES (DEFAULT, '" + username + "', 'Other');"
			res.redirect('login');
		}
	})
});

app.get('/home', function(req, res) {
	if (req.session.loggedin) {
		var get_name = "SELECT first_name FROM user_table WHERE username = '" + req.session.username + "';";
		var get_items = "SELECT a.*, b.name FROM goals a, categories b WHERE b.category_id = a.category_id AND username = '" + req.session.username + "';";
		var get_cats = "SELECT * FROM categories WHERE user_id = '" + req.session.username + "';";
		var query = get_name + get_items + get_cats;

		connection.query(query, (err, result) => {
			res.render('home', {
				data: result[1],
				cats: result[2],
				name: result[0][0]
			})
		});
	} else {
		res.redirect('login');
	}
	

});

app.post('/home', function(req, res) {
	var completed = req.body.done;

	var remove_complete = "DELETE FROM goals WHERE ";
	var i;

	if (completed != undefined) {
		if (!Array.isArray(completed)) {
			completed = [completed];
		}

		for (i=0; i<completed.length; i++) {
			if (i>0) {
				var where = " OR goal_id = '" + completed[i] + "'";
			}
			else {
				var where = "goal_id = '" + completed[i] + "'";
			}
			remove_complete += where;
			remove_complete += " ";
		}
		remove_complete += ";";

		connection.query(remove_complete);
	}

	res.redirect('home');
});

app.get('/add_item', function(req, res) {
	if (req.session.loggedin) {
		var date = new Date();
		var month = (date.getMonth() + 1);
		var month_to_add = ('0' + month).slice(-2);
		var day_to_add = ('0' + date.getDate()).slice(-2);
		var current_date = date.getFullYear() + '-' + month_to_add + '-' + day_to_add;
		var get_categories = "SELECT * FROM categories WHERE user_id = '" + req.session.username + "';"
		connection.query(get_categories, (err, result) => {
			res.render('add_item', {
				categories: result,
				date: current_date
			})
		});
	} else {
		res.redirect('login');
	}
	
});

app.post('/add_item', function(req, res) {
	var category = req.body.category_select;
	var item_name = req.body.item_name;
	var due_date = req.body.due_date;
	var due = new Date(due_date);
	var due_formatted = due.getFullYear() + '-' + ('0' + (due.getMonth() + 1)).slice(-2) + '-' + (due.getDate() +1);
	var date = new Date();
	var month = (date.getMonth() + 1);
	var month_to_add = ('0' + month).slice(-2);
	var current_date = date.getFullYear() + '-' + month_to_add + '-' + date.getDate();
	var get_cat_id = "SELECT * FROM categories WHERE name = '" + category + "' AND user_id = '" + req.session.username + "';";
	connection.query(get_cat_id, (err, result) => {
		var insert = "INSERT INTO goals(goal_id, category_id, goal_details, goal_name, time_worked, completed, username, goal_date, due_date) VALUES (DEFAULT, '" + result[0].category_id + "', '', '" + item_name + "', 0, 0, '" + req.session.username + "', '" + current_date + "', '" + due_formatted + "');";
		connection.query(insert);
	})
	

	res.redirect('add_item');
});

app.get('/add_category', function(req, res) {
	if (req.session.loggedin) {
		res.render('add_category');
	} else {
		res.redirect('login');
	}
	
});

app.post('/add_category', function(req, res) {
	var category_name = req.body.category_name;
	var insert = "INSERT INTO categories (category_id, user_id, name) VALUES (DEFAULT, '" + req.session.username + "', '" + category_name + "');"
	connection.query(insert);
	res.redirect('add_category');
})

app.get('/categories', function(req, res) {
	if (req.session.loggedin) {
		var get_categories = "SELECT * FROM categories WHERE user_id = '" + req.session.username + "';";

		connection.query(get_categories, (err, result) => {
			res.render('categories', {
				data: result,
			})
		});
	} else {
		res.redirect('login');
	}
});

app.post('/categories', function(req, res) {
	var to_delete = req.body.delete;
	var delete_cats = "DELETE FROM categories WHERE ";
	var delete_items = "DELETE FROM goals WHERE ";
	var i;

	if (to_delete != undefined) {
		if (!Array.isArray(to_delete)) {
			to_delete = [to_delete];
		}

		for (i=0; i<to_delete.length; i++) {

			if (i>0) {
				var where = " OR category_id = '" + to_delete[i] + "'";
			}
			else {
				var where = "category_id = '" + to_delete[i] + "'";
			}
			delete_cats += where;
			delete_items += where;
			delete_cats += " ";
			delete_items += " ";
		}
		delete_cats += ";";
		delete_items += ";";

		connection.query(delete_cats + delete_items);

	}

	res.redirect('categories');
})


var port = process.env.PORT || 8080;
  app.listen(port, function() {
      console.log('Our app is running on http://localhost:' + port);
  });