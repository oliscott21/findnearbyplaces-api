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

let db = {

    findPlace: (search_term, user_location, radius_filter, maximum_results_to_return, category_filter, sort) => {

      let sqlQuery;
      let bindItems = [search_term.toLowerCase() + '%', maximum_results_to_return];

      console.log("search_term: " + search_term);
      console.log("user_location: " + user_location);
      console.log("radius_filter: " + radius_filter);
      console.log("maximum_results_to_return: " + maximum_results_to_return);
      console.log("category_filter: " + category_filter);
      console.log("sort: " + sort);

      if (radius_filter, category_filter) {

      } else if (radius_filter) {


        bindItems.push(radius_filter);
      } else if (category_filter) {
        /*
        sqlQuery = `select q.*, qq.name as category, q2.* from findnearbyplaces.place q
        join findnearbyplaces.category qq on q.category_id = qq.id
        join findnearbyplaces.reviews q2 on q.id = q2.location_id
        where (lower(q.name) like $1 or lower(qq.name) like $1)
        limit $2;`;
        */
      } else {
        /*
          sqlQuery = `select q.*, qq.name as category, q2.* from findnearbyplaces.place q
          join findnearbyplaces.category qq on q.category_id = qq.id
          join findnearbyplaces.reviews q2 on q.id = q2.location_id
          where (lower(q.name) like $1 or lower(qq.name) like $1)
          limit $2;`;
          */
      }
      console.log(bindItems);
      /*
      sqlQuery = 'select * from findnearbyplaces.place';
      return pool.query(sqlQuery, "")
      .then(x => {
          let ret;

          console.log(x);

          return ret;
      });
      */

      //return pool.query()
      return {valid: false, message: "done"};
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
