//dependacies
const express = require("express");
let { db } = require("./data_access/db");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 4002;
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const fs = require("fs");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

//middlewares
app.use(express.json());
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));

app.use((request, response, next) => {
    console.log(`request url: ${request.url}`);
    console.log(`request method: ${request.method}`);
    request.header("Access-Control-Allow-Origin", "*");
    request.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
})

passport.use(new LocalStrategy({ usernameField: "email"}, function verify(username, password, cb) {
    db.login(username, password)
    .then(x => {
        if (x.valid) {
            return cb(null, x.user);
        } else {
            return cb(null, false, {message: x.message})
        }
    })
    .catch(e => {
        console.log(e);
        return cb("Something went wrong");
    });
}));

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
        cb(null, { id: user.id, username: user.username });
    });
});

passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
        return cb(null, user);
    });
});

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    store: new SQLiteStore({ db: 'sessions.db', dir: './sessions' })
}));

app.use(passport.initialize());
app.use(passport.authenticate('session'));
app.use(passport.session());

// methods
app.get("/", (request, response) => {
    response.status(200).json({done: true, message: "Fine!"});
});

// done
app.get("/search", (request, response) => {
    let search_term = request.query.search_term;
    let user_location = request.query.user_location;
    let radius_filter = request.query.radius_filter;
    let maximum_results_to_return = request.query.maximum_results_to_return;
    let category_filter = request.query.category_filter;
    let sort = request.query.sort;

    db.findPlace(search_term, user_location, radius_filter, maximum_results_to_return, category_filter, sort)
    .then(x => {
        if (sort) {
            if (sort == 1) {
                response.status(200).json({done: true, result: db.sortDist(x, user_location), message: "Got all places that match filters"});
            } else {
                db.getReviews()
                .then(y => {
                    let ids = []
                    for (let i = 0; i < x.length; i++) {
                        ids.push(x[i].id);
                    }
                    response.status(200).json({done: true, result: db.sortRate(x, y.rows, ids), message: "Got all places that match filters"})
                })
            }
        } else {
            response.status(200).json({done: true, result: db.sortDist(x, user_location), message: "Got all places that match filters"});
        }
    })
    .catch(e => {
        console.log(e);
        response.status(500).json({done: false, message: "Something went wrong."});
    });
});

// done
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

// done
app.post("/login", passport.authenticate("local", {
    successRedirect: '/login/success',
    failureRedirect: '/login/failed'
}));

//done
app.get("/login/success", (request, response) => {
    response.status(200).json({done: true, result: "Successfully logged in!"});
});

//done
app.get("/login/failed", (request, response) => {
    response.status(401).json({done: false, result: "Credentials invalid!"});
});

app.post('/logout', function(request, response) {
    request.logout();
    response.json({done:true, message: "The customer signed out successfully!"});
});

// done
app.post("/place", (request, response) => {
    if (!request.isAuthenticated()) {
        response.status(401).json({done: false, message: "Please log in first!"});
    } else {
        let name = request.body.name;
        let category_id = request.body.category_id;
        let latitude = request.body.latitude;
        let longitude = request.body.longitude;
        let description = request.body.description;
        let user_id = request.user.id;

        db.addPlace(name, user_id, category_id, latitude, longitude, description)
        .then(x => {
            response.status(201).json({done: true, id: x.rows[0].id, result: "Place added successfully!"});
        })
        .catch(e => {
            console.log(e);
            response.status(500).json({done: false, message: "Something went wrong."});
        });
    }
});

// done
app.post("/category", (request, response) => {
    if (!request.isAuthenticated()) {
        response.status(401).json({done: false, message: "Please log in first!"});
    } else {
        let name = request.body.name;

        db.addCategory(name)
        .then(x => {
            if (x.rows.length > 0) {
                response.status(201).json({done: true, id: x.rows[0].id, result: "Category added successfully!"});
            } else {
                response.status(409).json({done: false, id: undefined, result: "Category already exists!"});
            }
        })
        .catch(e => {
            console.log(e);
            response.status(500).json({done: false, id: undefined, message: "Something went wrong."});
        });
    }
});

// done
app.post("/photo", upload.array("photo") , (request, response) => {
    if (!request.isAuthenticated()) {
        response.status(401).json({done: false, message: "Please log in first!"});
    } else {
        let photo = request.files[0]
        let place_id = request.body.place_id;
        let review_id = request.body.review_id;

        let file = "./uploads/" + photo.filename;
        let contents = fs.readFileSync(file, {encoding: 'base64'});

        db.addPhoto(photo)
        .then(x => {
            let photo_id = x.rows[0].id;
            if (place_id) {
                db.photoPlace(photo_id, place_id)
                .then(y => {
                    console.log(y);
                    response.status(201).json({done: true, id: photo_id, result: "Photo added successfully!"});
                })
                .catch(e => {
                    console.log(e);
                    response.status(500).json({done: false, id: undefined, message: "Something went wrong."});
                });
            } else {
                db.photoReview(photo_id, review_id)
                .then(y => {
                    console.log(y);
                    response.status(201).json({done: true, id: photo_id, result: "Photo added successfully!"});
                })
                .catch(e => {
                    console.log(e);
                    response.status(500).json({done: false, id: undefined, message: "Something went wrong."});
                });
            }
        })
        .catch(e => {
            console.log(e);
            response.status(500).json({done: false, id: undefined, message: "Something went wrong."});
        });
    }
});

// done
app.post("/review", (request, response) => {
    if (!request.isAuthenticated()) {
        response.status(401).json({done: false, message: "Please log in first!"});
    } else {
        let place_id = request.body.place_id;
        let comment = request.body.comment;
        let rating = request.body.rating;
        let user_id = request.user.id;

        db.addReview(place_id, user_id, comment, rating)
        .then(x => {
            response.status(201).json({done: true, id: x.rows[0].id, result: "Review added successfully!"});
        })
        .catch(e => {
            console.log(e);
            response.status(500).json({done: false, id: undefined, message: "Something went wrong."});
        });
    }
});

// done
app.put("/place", (request, response) => {
    if (!request.isAuthenticated()) {
        response.status(401).json({done: false, message: "Please log in first!"});
    } else {
        let place_id = request.body.place_id;
        let name = request.body.name;
        let category_id = request.body.category_id;
        let latitude = request.body.latitude;
        let longitude = request.body.longitude;
        let description = request.body.description;
        let user_id = request.user.id;

        db.checkPlace(user_id, place_id)
        .then(x => {
            if (x.rows.length > 0) {
                db.updatePlace(place_id, user_id, name, category_id, latitude, longitude, description)
                .then(x => {
                    response.status(201).json({done: true,result: "Place updated successfully!"});
                })
                .catch(e => {
                    console.log(e);
                    response.status(500).json({done: false, id: undefined, message: "Something went wrong."});
                });
            } else {
                response.status(404).json({done: false, id: undefined, result: "No location of given name created by customer!"});
            }
        })
        .catch(e => {
            console.log(e);
            response.status(500).json({done: false, id: undefined, message: "Something went wrong."});
        });
    }
})

// done
app.put("/review", (request, response) => {
    if (!request.isAuthenticated()) {
        response.status(401).json({done: false, message: "Please log in first!"});
    } else {
        let review_id = request.body.review_id;
        let comment = request.body.comment;
        let rating = request.body.rating;
        let user_id = request.user.id;

        db.checkReview(review_id, user_id)
        .then(x => {
            if (x.rows.length > 0) {
                db.updateReview(review_id, user_id, comment, rating)
                .then(x => {
                    console.log(x);
                    response.status(201).json({done: true,result: "Review updated successfully!"});
                })
                .catch(e => {
                    console.log(e);
                    response.status(500).json({done: false, id: undefined, message: "Something went wrong."});
                });
            } else {
                response.status(404).json({done: false, id: undefined, result: "Review for location from customer does not exist!"});
            }
        })
        .catch(e => {
            console.log(e);
            response.status(500).json({done: false, id: undefined, message: "Something went wrong."});
        });
    }
}),

// done
app.put("/photo",  upload.array("photo") , (request, response) => {
    if (!request.isAuthenticated()) {
        response.status(401).json({done: false, message: "Please log in first!"});
    } else {
        let photo_id = request.body.photo_id;
        let photo = request.files[0];

        db.updatePhoto(photo_id, photo)
        .then(x => {
            console.log(x);
            if (x.rows.length > 0) {
                response.status(201).json({done: true,result: "Photo updated successfully!"});

            } else {
                response.status(404).json({done: false,result: "Photo not found!"});
            }
        })
        .catch(e => {
            console.log(e);
            response.status(500).json({done: false, id: undefined, message: "Something went wrong."});
        });
    }
});

// done
app.delete("/place", (request, response) => {
    if (!request.isAuthenticated()) {
        response.status(401).json({done: false, message: "Please log in first!"});
    } else {
        let place_id = request.body.place_id
        let user_id = request.user.id;

        db.checkPlace(user_id, place_id)
        .then(x => {
            if (x.rows.length > 0) {
                db.deletePlace(place_id)
                .then(x => {
                    response.status(201).json({done: true,result: "Place deleted successfully!"});
                })
                .catch(e => {
                    console.log(e);
                    response.status(500).json({done: false, id: undefined, message: "Something went wrong."});
                });
            } else {
                response.status(404).json({done: false, id: undefined, result: "No location of given name created by customer!"});
            }
        })
        .catch(e => {
            console.log(e);
            response.status(500).json({done: false, id: undefined, message: "Something went wrong."});
        });
    }
});

// done
app.delete("/review", (request, response) => {
    if (!request.isAuthenticated()) {
        response.status(401).json({done: false, message: "Please log in first!"});
    } else {
        let review_id = request.body.review_id;
        let user_id = request.user.id;

        db.checkReview(review_id, user_id)
        .then(x => {
            if (x.rows.length > 0) {
                db.deleteReview(review_id)
                .then(x => {
                    response.status(201).json({done: true,result: "Review deleted successfully!"});
                })
                .catch(e => {
                    console.log(e);
                    response.status(500).json({done: false, id: undefined, message: "Something went wrong."});
                });
            } else {
                response.status(404).json({done: false, id: undefined, result: "Review for location from customer does not exist!"});
            }
        })
        .catch(e => {
            console.log(e);
            response.status(500).json({done: false, id: undefined, message: "Something went wrong."});
        });
    }
});

// done
app.delete("/photo", (request, response) => {
    if (!request.isAuthenticated()) {
        response.status(401).json({done: false, message: "Please log in first!"});
    } else {
        let photo_id = request.body.photo_id;

        db.deletePhoto(photo_id)
        .then(x => {
            console.log(x);
            if (x.rowCount > 0) {
                response.status(201).json({done: true,result: "Photo deleted successfully!"});
            } else {
                response.status(404).json({done: false, id: undefined, result: "Photo for location or Review does not exist!"});
           }
        })
        .catch(e => {
            console.log(e);
            response.status(500).json({done: false, id: undefined, message: "Something went wrong."});
        });
    }
  });

app.listen(port, () => {
    console.log("Listening to port " + port);
});
