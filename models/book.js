var mongoose = require("mongoose");

var BookSchema = new mongoose.Schema({
	name: String,
	author: String,
	image: String,
	comments: 
	[
		{
		type: mongoose.Schema.Types.ObjectId,
		ref: "Comment"
	 	}
	],
	genre:String,
	quantity: Number,
	libId: String,
	inHand: [
		{
		type: mongoose.Schema.Types.ObjectId,
		ref: "User"
	 	}
	],
	dateAdded: String,
});
module.exports = mongoose.model("Book", BookSchema);