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
        return pool.query(`select * from findnearbyplaces.customers q where q.email = $1`, [email]);
    },

    addPlace: (name, category_id, latitude, longitude, description) => {
        console.log(name);
        console.log(category_id);
        console.log(latitude);
        console.log(longitude);
        console.log(description);

        return pool.query(`insert into findnearbyplaces.places`)
    },

    addCategory: (name) => {
        return pool.query(`insert into findnearbyplaces.category (name) values ($1)
        on conflict (name) do nothing
        returning id;`, [name])
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
}

module.exports = { db };
