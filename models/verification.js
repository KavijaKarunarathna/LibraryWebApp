var mongoose = require("mongoose");
var passportLocalMongoose  = require("passport-local-mongoose");

var VerificationSchema = new mongoose.Schema({
	user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User" },
	token: String,
	Date: String,
});

module.exports = mongoose.model("Verification", VerificationSchema);