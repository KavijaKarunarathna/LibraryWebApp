var mongoose = require("mongoose");

var CommentSchema = new mongoose.Schema({
	text: String,
	author: {
		id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		},
		name: String
	},
	date: String
})

module.exports = mongoose.model("Comment", CommentSchema);