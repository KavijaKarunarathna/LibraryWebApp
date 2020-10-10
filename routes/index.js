var Verification = require("../models/verification"),
	cryprand = require('crypto-random-string'),
	nodemailer = require("nodemailer"),
	Books = require("../models/book"),
	User = require("../models/user"),
	passport = require("passport"),
	express = require("express"),
	shortid = require("shortid"),
	router = express.Router(),
	async = require("async"),
	path = require('path'),
	ejs = require("ejs");
	
////////HOMEPAGE///////////////
router.get("/", function(req, res){
	res.redirect("/home");
})

router.get("/home", function(req, res){
	res.render("landing");
});	

/////////////////////////////////


//Generating the collection of books to render on show page
router.get("/show", function(req, res){
	Books.find({genre:'fiction'}, function(err, fictionbooks){
		//shuffling the array
		var fiction = fictionbooks.sort(() => Math.random() - 0.5)
		Books.find({genre:'adventure'}, function(err, adventurebooks){
			var adventure = adventurebooks.sort(() => Math.random() - 0.5)
			Books.find({genre:'romance'}, function(err, romancebooks){
				var romance = romancebooks.sort(() => Math.random() - 0.5)
				Books.find({genre:'horror'}, function(err, horrorbooks){
					var horror = horrorbooks.sort(() => Math.random() - 0.5)
					res.render("show", {fiction: fiction.splice(1,10), adventure:adventure.splice(1,10), horror:horror.splice(1,10), romance: romance.splice(1,10)});
				});
			});
		});
	});
});


////////AUTHENTICATION ROUTES///////////
router.get("/login", function(req, res){
	res.render("login");
});

router.post("/login", passport.authenticate("local", {
	failureRedirect: "/login",
	failureFlash : true
}), function(req, res){
	if (req.user){
		if(req.user.isActive){
			res.redirect("/show")
		} else {
			req.logout();
			req.flash("error", "Please verify your account before logging in!")
			res.redirect("/login");
		}
	}
});

router.get("/logout", function(req, res){
	req.logout();
	req.flash("success", "You logged out!")
	res.back();
});

////////////////////////////////////////

//request registration route
router.get("/regreq", function(req,res){
	res.render("newuser");
});

router.post("/regreq", function(req, res){
	let transporter = nodemailer.createTransport({
		service:"gmail",
		auth: {
			user: process.env.EMAIL,
			pass: process.env.EMAILPASS
		}
	})

	ejs.renderFile(__dirname + "/mail_templates/user_request.ejs",
	{ userinfo: req.body.newuser }, function(err, data){
		let mailOptions = {
			from: process.env.EMAIL,
			to: process.env.EMAIL,
			subject: "New User Request",
			html: data 
		}

		transporter.sendMail(mailOptions, function(err, data){
			if(err){
				console.log(err)
			}
			else {
				console.log("Email sent successfully!")
				req.flash("success", "Request made successfully!")
				res.redirect("/show");
			}
		});
	});
})

router.get("/forgot", function(req, res){
	res.render("forgot");
});

router.post("/forgot", function(req, res){
	//finding a user that matches the given email
	User.findOne({email: req.body.email}, function(err, user){
		if(!user){
			req.flash("error", "Sorry we couldn't find a user with the given email address")
			res.redirect("/forgot")
		} else {
				//generating random string
				var token = cryprand({length:32});
				user.resetPasswordToken = token;
				//setting expire time to an hour
				user.resetPasswordExpires = Date.now() + 3600000;
				user.save();
				//sending an email
				let transporter = nodemailer.createTransport({
					service:"gmail",
					auth: {
						user: process.env.EMAIL,
						pass: process.env.EMAILPASS
					}
				});
				ejs.renderFile(__dirname + "/mail_templates/reset.ejs",
				{ token: token}, function(err, data){
					if(err){
						console.log(err)
					}
					let mailOptions = {
						from: process.env.EMAIL,
						to: user.email,
						subject: "Reset Password",
						html: data
					}
					transporter.sendMail(mailOptions, function(err, data){
						if(err){
							console.log(err)
							res.back();
						}
						else {
							console.log("Email sent successfully!")
							req.flash("success", "Email has been sent. Check your email!");
							res.redirect("/login");
						}
					});
				});
		}
	})
});

//verify route
router.get("/verifyuser/:token", function(req, res){
	Verification.findOne({token: req.params.token}).populate("user").exec(function(err,verification){
		if(err) {
			console.log(err);
		}
		else{
			//change active status
			User.findOneAndUpdate({_id: verification.user.id},{ returnNewDocument: true}, function(err, user){
				user.isActive = true;
				user.save();
			})
			Verification.deleteOne({token: req.params.token})
			res.render("verified");
		}
	})
});

router.get("/reset/:token", function(req, res){
	res.render("reset", {token : req.params.token});
})

router.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect("/reset/"+ req.params.token);
        }
        if(req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          })
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect("/reset/"+ req.params.token);
        }
      });
    }
  ], function(err) {
  	req.flash("success", "Password has been renewed!")
    res.redirect('/show');
  });
});
/////////////////////////////////////////////////////////////

router.delete("/user/:id",isAdmin, function(req, res){
	User.findByIdAndRemove(req.params.id, function(err){
		if (err){
			console.log(err)
		} else {
			req.flash("success", "User deleted successfully!")
			res.redirect("/users");
			console.log("Successfully deleted user!")
		}
	});
});

function isLoggedIn(req, res, next){
	if(req.isAuthenticated()){
		return next();
	}
	req.flash("error", "Please Login First!");
	res.redirect("/login")
}

function sendConfirmation(user){
	let transporter = nodemailer.createTransport({
		service:"gmail",
		auth: {
			user: process.env.EMAIL,
			pass: process.env.EMAILPASS
		}
	})
	var token = cryprand({length:32});
	var currentDate = new Date;
	Verification.create( {user:user, token:token, Date: getDate()} )
	ejs.renderFile(__dirname + "/mail_templates/confimation.ejs",
	{ token: token , username: user.username}, function(err, data){
		let mailOptions = {
			from: process.env.EMAIL,
			to: user.email,
			subject: "Confirmation Email",
			html: data
		}
		transporter.sendMail(mailOptions, function(err, data){
			if(err){
				console.log(err)
			}
			else {
				console.log("Email sent successfully!")
			}
		});

	});
}

function isAdmin(req,res,next){
	if(!req.user){
		res.redirect("/login")
		return;
	}
	if(req.user.isAdmin){
		return next();
	}
	req.flash("error", "You do not have permission to perform this action!");
	res.back();
}

function getDate(){
	const currentDate = new Date;
	return new Date(currentDate.getFullYear() + "/" + (parseInt(currentDate.getMonth()) + 1) + "/" + currentDate.getDate());
}


module.exports = router;