const mongoose =require("mongoose");

module.exports = function connectMongo() {
    mongoose
        .connect(process.env.MONGO_URL)
        .then(() => console.log("MongoDB Connected"))
        .catch((err) => console.log(err));
};