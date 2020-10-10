var	Reservations = require("../models/reservation"),
	Book = require("../models/book"),
	User = require("../models/user"),
	back = require('express-back'),
	express = require("express"), 
	router = express.Router();

//////////////ADMIN////////////////
router.get("/dashboard",isAdmin, function(req, res){
	User.find({role:"staff"} , function(err, staff){
		User.find({role:"student"}, function(err,students){
			Book.find({}, function(err, books){
				var fiction = 0;
				var adventure = 0;
				var romance = 0;
				var fantasy = 0;
				var horror = 0;
				var other = 0;
				for (var i = 0; i < books.length; i++) {
					if(books[i].genre == "fiction") {
						fiction++;
					}
					if(books[i].genre == "adventure") {
						adventure++;
					}
					if(books[i].genre == "romance") {
						romance++;
					}
					if(books[i].genre == "fantasy") {
						fantasy++;
					}
					if(books[i].genre == "horror") {
						horror++;
					}
					if(books[i].genre == "other") {
						other++;
					}
				}
				var genreArray = [fiction, adventure, romance, fantasy, horror, other];
				Reservations.find({}).populate("reservedBy").populate("bookReserved").exec(function(err, reservations){
					if (err){
						console.log(err);
					}
					else{
						res.render("dashboard", {staffCount:staff.length, studentCount: students.length,
						bookCount: books.length, genreArray: genreArray, reservations:reservations});
					}
				})
			});
		});
	});

});

router.get("/register",isAdmin, function(req, res){
	res.render("register");
});

router.post("/register",isAdmin, function(req, res){
	generatedID = shortid.generate();
	var NewUser = new User({username: req.body.username, fullName: req.body.name,email:req.body.email, isAdmin: false,isActive:false,
	role: req.body.role, ID:generatedID, dateJoined:getDate()});
	User.register(new User (NewUser), req.body.password, function(err, user){
	if (err){
		console.log(err);
		return res.render("landing");
	}
	sendConfirmation(user);
	req.flash("success", "New user created!")
	res.back();
	});
});

router.get('/users', isAdmin, async function (req, res) {
    try {
        let users = await User.find({});
        let modifiedUsers = [];
        for (const user of users) {
            let booksBorrowed = [];
            if (user.booksBorrowed) {
                for (const book of user.booksBorrowed) {
                    let bookFound = await Book.findById(book[0]);
                    booksBorrowed.push(bookFound);
                }
            }
            user.booksBorrowed = booksBorrowed;
            modifiedUsers.push(user);
        }
        res.render('users', { users: modifiedUsers });
    } catch (e) {
        // log error and send error status
        console.log(e);
        res.sendStatus(500);
    }
});

router.post("/users/search",isAdmin, function(req,res){
	User.find({
		$or: [
			{fullName: { $regex: '.*' + req.body.search_term + '.*', $options: 'i' }},
			{ID: req.body.search_term},
		]}).populate("booksBorrowed").exec(function(err, users){
		res.render("users", {users:users});
	});
});


router.get("/books",isAdmin, function(req,res){
	Book.find({}).populate("inHand").exec(function(err, books){
		res.render("books", {books:books});
	});	
});

router.post("/books/search",isAdmin, function(req,res){
	Book.find({
		$or: [
			{name: { $regex: '.*' + req.body.search_term + '.*', $options: 'i' }},
			{libId: req.body.search_term},
		]}).populate("inHand").exec(function(err, books){
			console.log(books)
		res.render("books", {books:books});
	});
});

function isAdmin(req,res,next){
	if(!req.user){
		req.flash("error", "You do not have permission to perform this action!");
		res.redirect("/login");
		return;
	}
	if(req.user.isAdmin){
		return next();
	}	

}

function isLoggedIn(req, res, next){
	if(req.isAuthenticated()){
		return next();
	}
	req.flash("error", "Please Login First!");
	res.redirect("/login");
}

function getDate(){
	const currentDate = new Date;
	return new Date(currentDate.getFullYear() + "/" + (parseInt(currentDate.getMonth()) + 1) + "/" + currentDate.getDate());
}


module.exports = router;