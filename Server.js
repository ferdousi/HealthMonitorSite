var express = require("express");
var sqlite = require('sqlite3');
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var expressSession = require("express-session");
var app = express();
var router = express.Router();
var passport = require("passport");

var strategy = require("passport-local");
var path = __dirname + '/views/';

var database = new sqlite.Database('database.sqlite');

var userid;

app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(expressSession({
	secret: 'secret',
	resave: false,
	saveUninitialized: false


 }));
app.set('etag', false);

//Create database tables users, userinfo and bp

database.serialize(function() {
	database.run('PRAGMA foreign_keys = ON;');

	database.run(`
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
			username TEXT NOT NULL,
			password PASSWORD NOT NULL,
			UNIQUE (password)
		);
	`);

	database.run(`
		CREATE TABLE IF NOT EXISTS userinfo (
			id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
			user INTEGER REFERENCES users(id) NOT NULL,
			weight INTEGER,
			infodate TEXT
			
		);
	`);

	database.run(`
		CREATE TABLE IF NOT EXISTS bp (
			id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
			user INTEGER REFERENCES users(id) NOT NULL,
			systolic INTEGER,
			diastolic INTEGER,
			infodate TEXT
			
		);
	`);


	database.run('', function(objectError) {
		console.log('created tables');
	});
});

//Get the register and picture files
router.get("/register", function(req, res){
	res.sendFile(path + "register.html");
});

router.get("/forestbg", function(req, res){
	res.sendFile(path + "forestbg.jpg");

});

router.get("/rain-drops", function(req, res){
	res.sendFile(path + "rain-drops.jpg" )
});


router.post("/register", function(req, res){
	res.redirect("/thanks?" + "username="+req.body.username + "&password="+req.body.password);

});

router.get('/thanks', function(req, res) {
	
		database.run(`
			INSERT INTO users (
				username,
				password
			) VALUES (
				:username,
				:password
			);
		`, {
			':username': req.query.username,
			':password': req.query.password
		}, function(objectError) {
			if (objectError !== null) {
				functionError(String(objectError));

				return;
			}
			
			functionSuccess();
		});
	

	var functionError = function(strError) {
		res.status(200);

		res.set({
			'Content-Type': 'text/plain'
		});

		res.write(strError);

		res.end();
	};

	var functionSuccess = function() {
		res.redirect("/");
	};

	
});


app.use(passport.initialize());
app.use(passport.session()); 


//Define passport strategy
passport.use(new strategy.Strategy(
	function(username, password, done){

		
		database.all(`
			SELECT * FROM users
			WHERE users.username = :username and users.password = :password;
		`, {
			':username': username,
			':password': password
		}, function(objectError, objectRows) {
			if (objectError !== null) {
				done(null, null);

				return;
			}else if(objectRows.length === 0){
				done(null, null);

				return;

			}
			userid = objectRows[0].id;
			done(null, {id: objectRows[0].id, name: objectRows[0].username});
		});
	


	})

);

passport.serializeUser(function(user, done){

	done(null, user.id);

});

passport.deserializeUser(function(id, done){

	done(null, {id: id, name: id});

});


//Set cookie
router.use(function(req, res, next){
	
  var cookie = req.cookies.cookieName;
  if (cookie === undefined)
  {
    
    res.cookie('cookieName', userid, { maxAge: 86400, httpOnly: true });
    console.log('cookie created successfully');
  } 
 
	next();
});

//Get the login page
router.get("/", function(req, res){
	res.sendFile(path + "login.html");
});

//once logged out redirect to login page
router.get("/logout", function(req, res){
	userid=0;
	res.redirect("/");
});


router.get("/weighttrack?", function(req, res){

	res.sendFile(path + "weighttrack.html");
});

//Once the form in the page is submitted insert user data into userinfo
router.post("/weighttrack", function(req, res){
	
		database.run(`
			INSERT INTO userinfo (
				user,
				weight,
				infodate
			) VALUES (
				:user,
				:weight,
				:infodate
				
			);
		`, {
			':user': userid,
			':weight': req.body.weight,
			':infodate': req.body.date
			

		}, function(objectError) {
			if (objectError !== null) {
				functionError(String(objectError));
				console.log("Error");
				return;
			}
			
			functionSuccess();
		});

	

	var functionError = function(strError) {
		res.status(200);

		res.set({
			'Content-Type': 'text/plain'
		});

		res.write(strError);

		res.end();
	};

	//On success redirect to chart1 to refresh weighttrack

	var functionSuccess = function(){
		res.redirect("/chart1");
	}	

});

router.post("/bp", function(req, res){
	res.redirect("/bpdata?"+"&date="+req.body.date+"&sys="+req.body.systolic+"&dia="+req.body.diastolic);

});

//to avoid circular reference I added this chart1 file
router.get("/chart1", function(req,res){
	res.redirect("/weighttrack");
});
	
//Insert data into bp table
router.get("/bpdata", function(req, res){
	
		database.run(`
			INSERT INTO bp (
				user,
				systolic,
				diastolic,
				infodate
			) VALUES (
				:user,
				:systolic,
				:diastolic,
				:infodate
				
			);
		`, {
			':user': userid,
			':systolic': req.query.sys,
			':diastolic': req.query.dia,
			':infodate': req.query.date
			

		}, function(objectError) {
			if (objectError !== null) {
				functionError(String(objectError));
				console.log("Error");
				return;
			}
			
			functionSuccess();
		});
	

	var functionError = function(strError) {
		res.status(200);

		res.set({
			'Content-Type': 'text/plain'
		});

		res.write(strError);

		res.end();
	};

	

	var functionSuccess = function(){
		res.redirect("/bp")
	}

	
});

//Retrieves weight information of a user
router.get('/dashboard', function(req, res) {
	
		database.all(`
			SELECT weight, infodate FROM userinfo
			WHERE userinfo.user = :userid AND userinfo.weight != 'NULL';
		`, {

			':userid': userid

		},function(objectError, objectRows) {
			if (objectError !== null) {
				functionError(String(objectError));

				return;
			}

			functionSuccess(JSON.stringify(objectRows, null, 4));
		});
	

	var functionError = function(strError) {
		res.status(200);

		res.set({
			'Content-Type': 'text/plain'
		});

		res.write(strError);

		res.end();
	};

	var functionSuccess = function(strRows) {

		res.status(200);

		res.set({
			'Content-Type': 'application/json'
		});

		res.write(strRows);

		res.end();
		
	};

	
});

//Retrieves bp information of a user
router.get('/dashboard1', function(req, res) {
	
		database.all(`
			SELECT systolic, diastolic, infodate FROM bp
			WHERE bp.user = :userid AND bp.infodate != 'NULL';
		`,{
			':userid': userid

		}, function(objectError, objectRows) {
			if (objectError !== null) {
				functionError(String(objectError));

				return;
			}

			functionSuccess(JSON.stringify(objectRows, null, 4));
		});
	

	var functionError = function(strError) {
		res.status(200);

		res.set({
			'Content-Type': 'text/plain'
		});

		res.write(strError);

		res.end();
	};

	var functionSuccess = function(strRows) {

		res.status(200);

		res.set({
			'Content-Type': 'text/plain'
		});

		res.write(strRows);

		res.end();

	};

	
});

router.get("/bp", function(req, res){
	res.sendFile(path + "bp.html");
});

router.post("/index", function(req, res){
	
	
	res.redirect("/weighttrack");
});


router.get("/index", function(req, res){
	res.sendFile(path + "index.html");
});

router.post("/", passport.authenticate('local', { 
    failureRedirect : '/'}), function(req, res){

		res.redirect("/index?" + "username="+ req.body.username);
		
});



app.use("/", router);

app.listen(8080, function(){
	console.log("Live at Port 8080");
});

