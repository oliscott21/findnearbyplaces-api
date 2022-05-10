const bcrypt = require("bcrypt");
const { Pool } = require("pg");
require("dotenv").config();

const connectionString =
  `postgres://${process.env.USER}:${process.env.PASSWORD}@${process.env.HOST}:${process.env.DATABASEPORT}/${process.env.DATABASE}`;

const conection = {
  connectionString: process.env.DATABASE_URL ? process.env.DATABASE_URL : connectionString,
  ssl: { rejectUnauthorized: false }
}

const pool = new Pool(conection);

function getDistance(latitude1, longitude1, latitude2, longitude2) {
    let y = latitude2 - latitude1;
    let x = longitude2 - longitude1;
    return Math.sqrt(x * x + y * y);
}

let db = {

    findPlace: (search_term, user_location, radius_filter, maximum_results_to_return, category_filter, sort) => {
      let sqlQuery;
      let bindItems = ['%' + search_term.toLowerCase() + '%', search_term.toLowerCase(),
          search_term.toLowerCase() + '%', '%' + search_term.toLowerCase(), maximum_results_to_return];

      if (category_filter) {
          sqlQuery = `select q.*, qq.name as category from findnearbyplaces.place q
               join findnearbyplaces.category qq on q.category_id = qq.id
               where (lower(q.name) like $1 or lower(qq.name) like $1
               and lower(qq.name) = $6)
               order by
               case
                  when lower(q.name) like $2 or lower(qq.name) like $2 then 1
                  when lower(q.name) like $3 or lower(qq.name) like $3 then 2
                  when lower(q.name) like $4 or lower(qq.name) like $4 then 4
                  else 3
               end,
               abs(length($1) - length(q.name)) asc
               limit $5`;
          bindItems.push(category_filter);
      } else {
          sqlQuery = `select q.*, qq.name as category from findnearbyplaces.place q
               join findnearbyplaces.category qq on q.category_id = qq.id
               where (lower(q.name) like $1 or lower(qq.name) like $1)
               order by
               case
                  when lower(q.name) like $2 or lower(qq.name) like $2 then 1
                  when lower(q.name) like $3 or lower(qq.name) like $3 then 2
                  when lower(q.name) like $4 or lower(qq.name) like $4 then 4
                  else 3
               end,
               abs(length($1) - length(q.name)) asc
               limit $5`;
      }

      return pool.query(sqlQuery, bindItems)
      .then(x => {
          let result = x.rows;
          let ret = [];

          if (radius_filter) {
              let split = user_location.split(",");
              let latitude = split[0];
              let longitude = split[1];

              for (let i = 0; i < result.length; i++) {
                  let place_latitude = result[i].latitude;
                  let place_longitude = result[i].longitude;

                  let dist = getDistance(latitude, longitude, place_latitude, place_longitude);
                  if (dist < radius_filter) {
                      ret.unshift(result[i]);
                  }
              }
          } else {
              ret = result;
          }
          return ret;
      });
    },

    sortDist: (arr, user_location) => {
        let dist = [];
        let temp = arr;

        let sp = user_location.split(",");
        let latitude = sp[0];
        let longitude = sp[1];

        for (let i = 0; i < arr.length; i++) {
            let place_latitude = arr[i].latitude;
            let place_longitude = arr[i].longitude;
            dist.push(getDistance(latitude, longitude, place_latitude, place_longitude));
        }

        temp.sort((a, b) => {
            return dist[temp.indexOf(a)] - dist[temp.indexOf(b)];
        });

        return temp;
    },

    getReviews: () => {
        return pool.query(`select * from findnearbyplaces.reviews q2`)
    },

    sortRate: (arr, reviews, ids) => {
        let temp = arr;
        let loc_ids = [];
        let ratings = [];

        for (let i = 0; i < reviews.length; i++) {
            if (ids.includes(reviews[i].location_id) && !loc_ids.includes(reviews[i].location_id)) {
                loc_ids.push(reviews[i].location_id);
            }
        }

        for (let i = 0; i < loc_ids.length; i++) {
            let num = 0;
            let total = 0;
            for (let j = 0; j < reviews.length; j++) {
                if (loc_ids[i] == reviews[j].location_id) {
                    num += reviews[j].rating;
                    total += 1;
                }
            }
            ratings.push(num/total);
        }

        temp.sort((a, b) => {
            return ratings[temp.indexOf(b)] - ratings[temp.indexOf(a)];
        });

        return temp;
    },

    addCustomer: (email, password) => {
        return pool.query(`insert into findnearbyplaces.customers (email, password) values ($1, $2)
            on conflict (email) do nothing;`, [email, password]);
    },

    login: (email, password) => {
        return pool.query(`select * from findnearbyplaces.customers q where q.email = $1`, [email])
        .then(x => {
            if (x.rows.length == 1) {
                let valid = password === x.rows[0].password;
                if (valid) {
                    return { valid: true, user: {id: x.rows[0].id, username: x.rows[0].email}};
                } else {
                    return { valid: false, message: "Credentials are not valid!"};
                }
            } else {
                return {valid: false, message: "Email not found!"}
            }
        });
    },

    addPlace: (name, user_id, category_id, latitude, longitude, description) => {
        return pool.query(`insert into findnearbyplaces.place (name, latitude, longitude, description, category_id, customer_id)
        values ($1, $2, $3, $4, $5, $6) returning id`, [name, latitude, longitude, description, category_id, user_id]);
    },

    checkPlace: (user_id, place_id) => {
        return pool.query(`select * from findnearbyplaces.place q
          where q.id = $1 and q.customer_id = $2`, [place_id, user_id]);
    },

    updatePlace: (place_id, user_id, name, category_id, latitude, longitude, description) => {
        return pool.query(`update findnearbyplaces.place set
          name = coalesce($3, name),
          category_id = coalesce($4, category_id),
          latitude = coalesce($5, latitude),
          longitude = coalesce($6, longitude),
          description = coalesce($7, description)
          where id = $1 and customer_id = $2;`, [place_id, user_id, name, category_id, latitude, longitude, description]);
    },

    addCategory: (name) => {
        return pool.query(`insert into findnearbyplaces.category (name) values ($1)
        on conflict (name) do nothing
        returning id;`, [name]);
    },

    getCategory: (name) => {
        return pool.query(`select c.name from findnearbyplaces.category c`);
    },

    addPhoto: (photo) => {
        return pool.query(`insert into findnearbyplaces.photos (file) values ($1)
        returning id;`, [photo])
    },

    photoPlace: (photo_id, place_id) => {
        return pool.query(`insert into findnearbyplaces.place_photo (location_id, photo_id)
        values ($1, $2)`, [place_id, photo_id]);
    },

    photoReview: (photo_id, review_id) => {
      return pool.query(`insert into findnearbyplaces.review_photo (review_id, photo_id)
      values ($1, $2)`, [review_id, photo_id]);
    },

    addReview: (place_id, user_id, comment, rating) => {
        return pool.query(`insert into findnearbyplaces.reviews (location_id, customer_id, text, rating)
        values ($1, $2, $3, $4) returning id;`, [place_id, user_id, comment, rating]);
    },

    checkReview: (review_id, user_id) => {
        return pool.query(`select * from findnearbyplaces.reviews q
          where q.id = $1 and q.customer_id = $2`, [review_id, user_id]);
    },

    updateReview: (review_id, user_id, comment, rating) => {
        return pool.query(`update findnearbyplaces.reviews set
          text = coalesce($3, text),
          rating = coalesce($4, rating)
          where id = $1 and customer_id = $2;`, [review_id, user_id, comment, rating]);
    },

    updatePhoto: (photo_id, photo) => {
        return pool.query(`update findnearbyplaces.photos set
          file = coalesce($2, file)
          where id = $1 returning id`, [photo_id, photo]);
    },

    deletePlace: (place_id) => {
        return pool.query(`delete from findnearbyplaces.place
          where id = $1`, [place_id]);
    },

    deleteReview: (review_id) => {
        return pool.query(`delete from findnearbyplaces.reviews
          where id = $1`, [review_id]);
    },

    deletePhoto: (photo_id) => {
        return pool.query(`delete from findnearbyplaces.photos
          where id = $1`, [photo_id]);
    }


}

module.exports = { db };
