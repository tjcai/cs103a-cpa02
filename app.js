/*
  app.js -- This creates an Express webserver with login/register/logout authentication
*/

// *********************************************************** //
//  Loading packages to support the server
// *********************************************************** //
// First we load in all of the packages we need for the server...
const createError = require("http-errors"); // to handle the server errors
const express = require("express");
const path = require("path");  // to refer to local paths
const cookieParser = require("cookie-parser"); // to handle cookies
const session = require("express-session"); // to handle sessions using cookies
const debug = require("debug")("personalapp:server"); 
const layouts = require("express-ejs-layouts");
const axios = require("axios")
var MongoDBStore = require('connect-mongodb-session')(session);


// *********************************************************** //
//  Loading models
// *********************************************************** //
const ToDoItem = require("./models/ToDoItem")
const Course = require('./models/Course')
const Schedule = require('./models/Schedule')
const Drama = require('./models/Drama')
// *********************************************************** //
//  Loading JSON datasets
// *********************************************************** //
const drama_list = require('./public/data/top_5000_mydramalist_purified.json')
// *********************************************************** //
//  Connecting to the database 
// *********************************************************** //

const mongoose = require( 'mongoose' );
const mongodb_URI = 'mongodb+srv://cluster0:ODFXoTWeUGq4BtYG@cluster0.ufrdt.mongodb.net/myFirstDatabase?retryWrites=true&w=majority'

mongoose.connect( mongodb_URI, { useNewUrlParser: true, useUnifiedTopology: true } );
// fix deprecation warnings
mongoose.set('useFindAndModify', false); 
mongoose.set('useCreateIndex', true);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {console.log("we are connected!!!")});


// *********************************************************** //
// Initializing the Express server 
// This code is run once when the app is started and it creates
// a server that respond to requests by sending responses
// *********************************************************** //
const app = express();

var store = new MongoDBStore({
  uri: mongodb_URI,
  collection: 'mySessions'
});

// Catch errors
store.on('error', function(error) {
  console.log(error);
});

app.use(require('express-session')({
  secret: 'This is a secret',
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  },
  store: store,
  // Boilerplate options, see:
  // * https://www.npmjs.com/package/express-session#resave
  // * https://www.npmjs.com/package/express-session#saveuninitialized
  resave: true,
  saveUninitialized: true
}));

// Here we specify that we will be using EJS as our view engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");



// this allows us to use page layout for the views 
// so we don't have to repeat the headers and footers on every page ...
// the layout is in views/layout.ejs
app.use(layouts);

// Here we process the requests so they are easy to handle
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Here we specify that static files will be in the public folder
app.use(express.static(path.join(__dirname, "public")));

// Here we enable session handling using cookies
app.use(
  session({
    secret: "zzzbbyanana789sdfa8f9ds8f90ds87f8d9s789fds", // this ought to be hidden in process.env.SECRET
    resave: false,
    saveUninitialized: false
  })
);

// *********************************************************** //
//  Defining the routes the Express server will respond to
// *********************************************************** //


// here is the code which handles all /login /signin /logout routes
const auth = require('./routes/auth');
const { deflateSync } = require("zlib");
app.use(auth)

// middleware to test is the user is logged in, and if not, send them to the login page
const isLoggedIn = (req,res,next) => {
  if (res.locals.loggedIn) {
    next()
  }
  else res.redirect('/login')
}

app.get('/', 
async (req, res, next) => {
  const region = await Drama.distinct('region_origin')
  const genres = await Drama.distinct('genres')
  res.locals.region = region
  res.locals.genres = genres
  res.render("home");
});

app.get('/about', (req, res, next) => {
  res.render('about');
});


app.post('/drama/byRegion', 
  async (req, res, next) => {
    const {region} = req.body;
    const dramas = await Drama.find({region_origin:region}).sort({popularity_rank:1, ratings:1, ranking:1})
    res.locals.drama = dramas.slice(0, 50)
    res.locals.region = region
    res.render('dramalist')
  })

app.get('/drama/byRegion/:dramaId',
  async (req, res, next) => {
    // const {popularity_rank} = req.params
    // const drama = await Drama.findOne({popularity_rank:popularity_rank})
    const {dramaId} = req.params
    const drama = await Drama.findOne({_id:dramaId})
    res.locals.drama = drama
    res.render('display')
  })

  app.post('/drama/byGenre', 
  async (req, res, next) => {
    const {genre} = req.body;
    const dramas = await Drama.find({genres:genre}).sort({popularity_rank:1, ratings:1, ranking:1})
    res.locals.drama = dramas.slice(0, 50)
    res.locals.genre = genre
    res.locals.region = null
    res.render('dramalist')
  })

app.get('/drama/byGenre/:dramaId',
  async (req, res, next) => {
    const {dramaId} = req.params
    const drama = await Drama.findOne({_id:dramaId})
    res.locals.drama = drama
    res.render('display')
  })

app.get('/drama/:dramaId',
  async (req, res, next) => {
    const {dramaId} = req.params
    const drama = await Drama.findOne({_id:dramaId})
    res.locals.drama = drama
    res.render('display')
  })

  // need to log in 
app.use(isLoggedIn)


app.get('/addFavorite/:dramaId',
  async (req, res, next) => {
    try{
      const dramaId = req.params.dramaId
      const userId = res.locals.user._id
      const lookup = await Favorite.find({dramaId, userId})
      if (lookup.length == 0){
        const drama = new Favorite({dramaId, userId})
        await drama.save()
      }
      res.redirect('/favorite/show')
    } catch(e){
      next(e)
    }
  })

app.get('/favorite/show',
  async (req, res, next) => {
    try{
      const userId = res.locals.user._id
      const dramaIds = 
      (await Favorite.find({userId})).sort(x => x.popularity_rank).map(x => x.dramaId)
      res.locals.favorites = await Drama.find({_id:{$in: dramaIds}})
      res.render('favorite')
    } catch(e){
      next(e)
    }
  })

app.get('/favorite/remove/:dramaId',
  async (req, res, next) => {
    try{
      await Favorite.remove(
        {userId: res.locals.user._id,
        dramaId: req.params.dramaId}
      )
      res.redirect('/favorite/show')
    } catch(e){
      next(e)
    }
  })


app.get('/upsertDB', 
  async (req, res, next) => {
    await Drama.deleteMany({})
    for (drama of drama_list){
      const {name, ranking, popularity_rank} = drama;
      await Drama.findOneAndUpdate({name, ranking, popularity_rank}, drama, {upsert:true})
    }
    const num = await Drama.find({}).countDocuments();
    res.send("data uploaded: " + num)
  })


// *********************************************************** //
//  Defining helper routes the Express server will respond to
//  finds distinct values of region_origin and genres
// *********************************************************** //

app.get('/dist_region',
  async (req, res, next) => {
    const vals = await Drama.distinct('region_origin')
    res.send(vals)
  })

app.get('/dist_genre',
  async (req, res, next) => {
    const vals = await Drama.distinct('genres')
    res.send(vals)
  })


// here we catch 404 errors and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// this processes any errors generated by the previous routes
// notice that the function has four parameters which is how Express indicates it is an error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  // render the error page
  res.status(err.status || 500);
  res.render("error");
});


// *********************************************************** //
//  Starting up the server!
// *********************************************************** //
//Here we set the port to use between 1024 and 65535  (2^16-1)
const port = process.env.PORT || "5000";
console.log('connecting on port '+ port)

app.set("port", port);

// and now we startup the server listening on that port
const http = require("http");
const { reset } = require("nodemon");
const Favorite = require("./models/Favorite");
const server = http.createServer(app);

server.listen(port);

function onListening() {
  var addr = server.address();
  var bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
  debug("Listening on " + bind);
}

function onError(error) {
  if (error.syscall !== "listen") {
    throw error;
  }

  var bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      process.exit(1);
      break;
    default:
      throw error;
  }
}

server.on("error", onError);

server.on("listening", onListening);

module.exports = app;
