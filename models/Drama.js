'use strict';
const { MongoExpiredSessionError } = require('mongodb');
const mongoose = require( 'mongoose' );
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
const Mixed = Schema.Types.Mixed;

var dramaSchema = Schema( {
  name: String,
  synopsis: String,
  duration_in_minutes: Number,
  nb_episodes: Number,
  region_origin: String,
  ratings: Number,
  ranking: Number,
  popularity_rank: Number,
  nb_watchers: Number,
  nb_ratings: Number,
  nb_reviews: Number,
  streamed_on: Mixed,
  genres: Mixed,
  tags: Mixed,
  url: String,
  screenwriter: Mixed,
  director: Mixed,
  main_roles: Mixed,
  support_roles: Mixed,
  guest_roles: Mixed,
} );

module.exports = mongoose.model( 'Drama', dramaSchema );
