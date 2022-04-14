//dependacies
const express = require("express");

const app = express();
const cors = require("cors");
const port = process.env.PORT || 4002;

//middlewares
app.use(express.json());
app.use(cors());

//methods
app.get("/", (request, response) => {
    response.status(200).json({done: true, message: "Fine!"});
});


app.listen(port, () => {
    console.log("Listening to port 4002");
});
