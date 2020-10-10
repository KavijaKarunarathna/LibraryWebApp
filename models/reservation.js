var mongoose = require("mongoose");
var ReservationSchema = new mongoose.Schema({
	reservedBy : {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User"
	},
	bookReserved : {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Book"
	},
	Date: String,
});
module.exports = mongoose.model("Reservation", ReservationSchema);