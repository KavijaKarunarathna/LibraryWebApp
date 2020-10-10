var express 	= require("express"),
	app 		= express(),
 	bodyParser  = require("body-parser"),
	mongoose  	= require("mongoose"),
	passport 	= require("passport"),
	LocalStrategy = require("passport-local"),
	User 		= require("./models/user"),
	methodOverride = require("method-override")
	back = require('express-back');
	flash = require('connect-flash');

////ROUTES////
var indexAuthRoutes = require("./routes/index");
	adminRoutes = require("./routes/admin");
	bookRoutes = require("./routes/books")

mongoose.connect(process.env.DATABASEURL, {useNewUrlParser: true, useCreateIndex: true});
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/public'));
app.use(methodOverride("_method"))
app.set("view engine", "ejs");

///////// PASSPORT CONFIG //////////
app.use(require("cookie-session")({
	secret: "This ain't no secret buddy",
	resave: false,
	saveUninitialized : false
}));

app.use(back());
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser())

app.use(function(req, res, next){
	res.locals.user = req.user;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	next();
});

app.use(adminRoutes);
app.use(indexAuthRoutes);
app.use(bookRoutes);



app.listen(process.env.PORT,process.env.IP, function() {
	console.log("Server has started");
});