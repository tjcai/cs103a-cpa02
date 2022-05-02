'use strict';
const mongoose = require( 'mongoose' );
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

var favoriteSchema = Schema( {
  userId: ObjectId,
  dramaId: ObjectId,
} );

module.exports = mongoose.model( 'Favorite', favoriteSchema );
