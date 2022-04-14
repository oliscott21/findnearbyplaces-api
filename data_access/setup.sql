create schema if not exists findnearbyplaces;

drop table if exists findnearbyplaces.place_photo;
drop table if exists findnearbyplaces.review_photo;
drop table if exists findnearbyplaces.reviews;
drop table if exists findnearbyplaces.place;
drop table if exists findnearbyplaces.category;
drop table if exists findnearbyplaces.customers;
drop table if exists findnearbyplaces.photos;


create table findnearbyplaces.category
(
	id smallserial primary key,
	name varchar(30) not null
);

create table findnearbyplaces.customers
(
	id serial primary key,
	email varchar(256) not null unique,
	password varchar(8) not null
);

create table findnearbyplaces.place
(
	id bigserial primary key,
	name varchar(256) not null,
	latitude float8 not null,
	longitude float8 not null,
	description varchar(256) not null,
	category_id int references findnearbyplaces.category(id),
	customer_id int references findnearbyplaces.customers(id)
);

create table findnearbyplaces.reviews
(
	id serial primary key,
	locations_id bigint references findnearbyplaces.place(id),
	customer_id int references findnearbyplaces.customers(id),
	text varchar(512) not null,
	rating smallint not null
);

create table findnearbyplaces.photos
(
	id serial primary key,
	file bytea not null
);

create table findnearbyplaces.place_photo
(
	locations_id bigint references findnearbyplaces.place(id),
	photo_id int references findnearbyplaces.photos(id)
);


create table findnearbyplaces.review_photo
(
	review_id int references findnearbyplaces.reviews(id),
	photo_id int references findnearbyplaces.photos(id)
);
