//dependacies
const express = require("express");
let { db } = require("./data_access/db");

const app = express();
const cors = require("cors");
const port = process.env.PORT || 4002;

//middlewares
app.use(express.json());
app.use(cors());

const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const fs = require('fs');

//methods
app.get("/", (request, response) => {
    response.status(200).json({done: true, message: "Fine!"});
});



// needs more work
app.get("/search/:search_term/:user_location/:radius_filter?/:maximum_results_to_return/:category_filter?/:sort?", (request, response) => {
    let search_term = request.params.search_term;
    let user_location = request.params.user_location;
    let radius_filter = request.params.radius_filter;
    let maximum_results_to_return = request.params.maximum_results_to_return;
    let category_filter = request.params.category_filter;
    let sort = request.params.sort;

    console.log(request.params);

    db.findPlace(search_term, user_location, radius_filter, maximum_results_to_return, category_filter, sort);
    response.status(200).json({done: true, result: "temp"})
/*
    .then(x => {
        response.status(200).json({done: true, result: "temp"})
    })
    .catch(e => {
        console.log(e);
        response.status(500).json({done: false, message: "Something went wrong."});
    });
*/
});

// done, need to update for authentication
app.post("/register", (request, response) => {
    let email = request.body.email;
    let password = request.body.password;

    db.addCustomer(email, password)
    .then(x => {
        if (x.rowCount > 0) {
            response.status(201).json({done: true, result: "Customer added successfully!"});
        } else {
            response.status(409).json({done: false, result: "Customer already exists!"});
        }
    })
    .catch(e => {
        console.log(e);
        response.status(500).json({done: false, message: "Something went wrong."});
    });
});

// done, need to update for authentication
app.post("/login", (request, response) => {
    let email = request.body.email;
    let password = request.body.password;

    db.login(email, password)
    .then(x => {
        if (x.rows.length != 1) {
            response.status(401).json({done: false, result: "No account with given email and password combination"});
        } else {
            let pass = x.rows[0].password;
            if (pass === password) {
              response.status(200).json({done: true, result: "Successfully logged in!"});
            } else {
                response.status(401).json({done: false, result: "Incorrect password!"});
            }
        }
    })
    .catch(e => {
        console.log(e);
        response.status(500).json({done: false, message: "Something went wrong."});
    });
});

// needs more work
app.post("/place", (request, response) => {
    let name = request.body.name;
    let category_id = request.body.category_id;
    let latitude = request.body.latitude;
    let longitude = request.body.longitude;
    let description = request.body.description;

    db.addPlace(name, category_id, latitude, longitude, description)
    .then(x => {
        console.log(x);
    })
    .catch(e => {
        console.log(e);
        response.status(500).json({done: false, message: "Something went wrong."});
    });
});

// done, need to update for authentication
app.post("/category", (request, response) => {
    let name = request.body.name;

    db.addCategory(name)
    .then(x => {
        if (x.rows.length > 0) {
            console.log(x.rows);
            response.status(201).json({done: true, id: x.rows[0].id, result: "Category added successfully!"});
        } else {
            response.status(409).json({done: false, id: -1, result: "Category already exists!"});
        }
    })
    .catch(e => {
        console.log(e);
        response.status(500).json({done: false, id: -1, message: "Something went wrong."});
    });
});

// done, need to update for authentication
app.post("/photo", upload.array("photo") , (request, response) => {
    let photo = request.files[0]
    let place_id = request.body.place_id;
    let review_id = request.body.review_id;

    let file = "./uploads/" + photo.filename;
    let contents = fs.readFileSync(file, {encoding: 'base64'});

    db.addPhoto(photo)
    .then(x => {
        let photo_id = x.rows[0].id;
        console.log(photo_id);

        if (place_id) {
            db.photoPlace(photo_id, place_id)
            .then(y => {
                console.log(y);
                response.status(201).json({done: true, id: photo_id, result: "Photo added successfully!"});
            })
            .catch(e => {
                console.log(e);
                response.status(500).json({done: false, id: -1, message: "Something went wrong."});
            });
        } else {
            db.photoReview(photo_id, review_id)
            .then(y => {
                console.log(y);
                response.status(201).json({done: true, id: photo_id, result: "Photo added successfully!"});
            })
            .catch(e => {
                console.log(e);
                response.status(500).json({done: false, id: -1, message: "Something went wrong."});
            });
        }
    })
    .catch(e => {
        console.log(e);
        response.status(500).json({done: false, id: -1, message: "Something went wrong."});
    });
});

app.post("/review", (request, response) => {
    
});


app.listen(port, () => {
    console.log("Listening to port 4002");
});
