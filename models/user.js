var mongoose = require("mongoose");
var passportLocalMongoose  = require("passport-local-mongoose");

var UserSchema = new mongoose.Schema({
	fullName: String,
	username: {type:String, unique:true},
	password: String,
	isAdmin: Boolean,
	booksBorrowed: Array,
	role: String,
	ID: String,
	dateJoined: String,
	isActive: Boolean,
	email: {type:String, unique:true},
	resetPasswordToken: String,
	resetPasswordExpires: Date,
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);