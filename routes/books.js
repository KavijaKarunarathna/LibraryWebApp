var Verification = require("../models/verification"),
	Reservations = require("../models/reservation"),
	Comments = require("../models/comment"),
	nodemailer = require("nodemailer"),
	Books = require("../models/book"),
	User = require("../models/user"),
	express = require("express"),
	router = express.Router(),
	ejs = require("ejs");

///////////////////////////////////////////////////////
var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'ducpdodiu', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

///////////////////////////////////////////////////////


router.get("/book/new",isAdmin, function(req,res){
	res.render("bookform");
});


router.post("/book/new",isAdmin, upload.single('image'), function(req,res){
	if (req.body.book.image == ""){
		cloudinary.uploader.upload(req.file.path,function(result) {
			Book.create(req.body.book, function(err, book){
				var currentDate = new Date;
				book.dateAdded = getDate();
				book.image = result.secure_url;
				book.save();
		});
		});
	} else {
		Book.create(req.body.book, function(err, book){
				var currentDate = new Date;
				book.dateAdded = getDate();
				book.save();
		});
	}
	req.flash("success", "Book added successfully!");
	res.redirect("/book/new")
});

router.get("/book/:id/delete",isAdmin, function(req,res){
	Book.findOneAndDelete({ _id: req.params.id }, function (err) {
  		if(err) console.log(err);
  		req.flash("success", "Book deleted successfully!")
  		res.back();
	});
});

router.post("/book/:id/lend",isAdmin, function(req,res){
	User.findOneAndUpdate({ID:req.body.lend_to_user},{
        returnNewDocument: true
    }, function(err, lendUser){
		if(err){
			console.log(err);
		}
		else {
			Books.findOneAndUpdate({_id:req.params.id},{
        returnNewDocument: true
    }, function(err, book){
			if (err){
				console.log(err);
			}
			else {
				lendUser.booksBorrowed.push([book.id, getDate(), false]);
				lendUser.save();
				book.quantity -= 1;
				book.inHand.push(lendUser);
				book.save();
				req.flash("success", "Book lent successfully!")
				res.back();
			}
			});
		}
	})
});

router.get("/user/:ID/book/:id/return",isAdmin, function(req,res){
	User.findOneAndUpdate({ID: req.params.ID},{
        returnNewDocument: true
    }, function(err, lendUser){
		if(err){
			console.log(err);
		}
		else {
			console.log(lendUser)
			Books.findOneAndUpdate({_id: req.params.id},{
        returnNewDocument: true
    }, function(err, book){
			if (err){
				console.log(err);
			}
			else {
				lendUser.booksBorrowed.forEach(function(bookFound, index){
					if(bookFound[0] == req.params.id){
						lendUser.booksBorrowed.splice(index, 1);
					}
				});
				lendUser.save();
				book.quantity += 1;
				book.inHand.splice(book.inHand.indexOf(lendUser.id), 1)
				book.save();
			}
			});
		}
	})
	req.flash("success", "Book returned successfully!")
	//dont res.back it wont work when searched.
	res.redirect("/users");
	// res.back();
});

//Book show route
router.get("/book/:id", function(req, res){
	Books.findById(req.params.id).populate("comments").exec(function(err, book){
		if (err){
			console.log(err);
		}
		else {
		res.render("book", {book:book});
		}
	});
});

//search route for books
router.post("/search-book", function(req, res){
	//regular expression to find a matching set of books. (input is case insensitive)
	Books.find({name: { $regex: '.*' + req.body.find + '.*',$options: 'i' } }, function(err, books){
		res.render("find", {books:books})
	})
});

//new comment route
router.post("/book/:id/comment",isLoggedIn, function(req, res){
	Books.findById(req.params.id, function(err, book){
		if(err){
			console.log(err);
		} else {
			Comments.create(req.body.comment, function(err, comment){
				if(err){
					console.log(err);
				}
				else {
					var currentDate = new Date();
					comment.author.id = req.user._id;
					comment.author.name = req.user.fullName;
					comment.date = getDate();
					comment.save();
					book.comments.push(comment);
					book.save();
					req.flash("success", "Comment added!")
					res.back();
				}
			});
		}
	});
});

router.get("/user/:user_id/book/:book_id/reserve", isLoggedIn, function(req,res){
	Reservations.countDocuments({ reservedBy: req.user.id }, function(err, count){
		if (count >= 1){
			req.flash("error", "You have already reserved a book!")
			res.back();
		}
		else {
			User.findById(req.params.user_id, function(err, user){
				Books.findById(req.params.book_id, function(err, book){
					Reservations.create({
						reservedBy: user,
						bookReserved: book,
						Date: getDate(),
					}, function(err, reservation){
						if (err){
							console.log(err);
						}
						else {
							book.quantity -= 1;
							req.flash("success", "Book successfully reserved!")
							book.save();
							res.back();
						}
					});
				});
			});
		}
	});
});

router.delete("/reservation/:id/",isAdmin, function(req, res){
	Reservations.findById(req.params.id, function (err, reservation){
		if (err) {
			console.log(err);
		} else {
			Books.findById(reservation.bookReserved, function(err, book){
				book.quantity += 1;
				book.save();
			});
			
			Reservations.findByIdAndRemove(req.params.id, function(err){
				if (err){
					console.log(err)
				} else {
					req.flash("success", "Reservation removed successfully!")
					res.back();
					console.log("Successfully deleted reservation!")
				}
			});
		}
	
	});
});

function refreshReservations() {
	Reservations.find({}, function(err, reservations){
		reservations.forEach(function(reservation){
			const initialDate = new Date(reservation.Date);
			const today = getDate();
			const diffTime = Math.abs(today - initialDate);
			const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
			console.log(diffDays)
			if (diffDays >= 3){
				Books.findById(reservation.bookReserved, function(err, book){
					book.quantity += 1;
					book.save();
				});
				Reservations.deleteOne({bookReserved: reservation.bookReserved, 
				reservedBy: reservation.reservedBy}, function(err){
					if (err){
						console.log(err)
					}
					else{
						console.log("Successfully deleted reservation!")
					}
				})
			}
		})
	})
}

function sendOverDueNotice() {
	User.find({}, function(err, users){
		users.forEach(function(user){
			user.booksBorrowed.forEach(function(book, index){
				if(book){
					const today = getDate();
					const initialDate = new Date(book[1]);
					const diffTime = Math.abs(today - initialDate);
					const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
					if (book[2] === false){
						if (diffDays >= 25){
							Books.findById(book[0], function(err, bookFound){
								let transporter = nodemailer.createTransport({
									service:"gmail",
									auth: {
										user: process.env.EMAIL,
										pass: process.env.EMAILPASS
									}
								})
								ejs.renderFile(__dirname + "/mail_templates/overdue.ejs",
								{ book: bookFound}, function(err, data){
									let mailOptions = {
										from: process.env.EMAIL,
										to: user.email,
										subject: "Book Overdue Notice",
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
							User.findOneAndUpdate({_id: user.id},{returnNewDocument: true}, function(err, userFound){
								console.log(userFound)
								borrowedBook = [...userFound.booksBorrowed[index]];
								console.log(borrowedBook)
								borrowedBook[2] = true;
								console.log(borrowedBook)
								// do not change this syntax because booksBorrowed[index] = .... won't work :)
								userFound.booksBorrowed.set(index, borrowedBook); 
								console.log(userFound.booksBorrowed[index])
								userFound.save();
							})
							});
						}
					}
				}
			});
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

function isLoggedIn(req, res, next){
	if(req.isAuthenticated()){
		return next();
	}
	req.flash("error", "Please Login First!");
	res.redirect("/login");
}


setInterval(refreshReservations, 3600000);
setInterval(sendOverDueNotice, 3600000 * 4);

function getDate(){
	const currentDate = new Date;
	return new Date(currentDate.getFullYear() + "/" + (parseInt(currentDate.getMonth()) + 1) + "/" + currentDate.getDate());
}

module.exports = router;