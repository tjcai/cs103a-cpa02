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








// // specify that the server should render the views/index.ejs page for the root path
// // and the index.ejs code will be wrapped in the views/layouts.ejs code which provides
// // the headers and footers for all webpages generated by this app
// app.get("/", (req, res, next) => {
//   res.render("index");
// });

// app.get("/about", (req, res, next) => {
//   res.render("about");
// });

// app.get("/demo/:subject",
//  async (req,res,next) => {
//   try{
//     const theCourses = await Course.find({subject:req.params.subject})
//     res.json(theCourses)
//   } catch (e){
//     next(e);
//   }
// })

// app.get("/demo",
//  async (req,res,next) => {
//   try{
//     const theCourses = 
//         await Course.find(
//           {subject:'COSI',
//           independent_study:true,
//           enrolled:{$gt:100},
//         })
//     res.json(theCourses)
//   } catch (e){
//     next(e);
//   }
// })


// /*
//     ToDoList routes
// */
// app.get('/todo',
//   isLoggedIn,   // redirect to /login if user is not logged in
//   async (req,res,next) => {
//     try{
//       let userId = res.locals.user._id;  // get the user's id
//       let items = await ToDoItem.find({userId:userId}); // lookup the user's todo items
//       res.locals.items = items;  //make the items available in the view
//       res.render("toDo");  // render to the toDo page
//     } catch (e){
//       next(e);
//     }
//   }
//   )

//   app.post('/todo/add',
//   isLoggedIn,
//   async (req,res,next) => {
//     try{
//       const {title,description} = req.body; // get title and description from the body
//       const userId = res.locals.user._id; // get the user's id
//       const createdAt = new Date(); // get the current date/time
//       let data = {title, description, userId, createdAt,} // create the data object
//       let item = new ToDoItem(data) // create the database object (and test the types are correct)
//       await item.save() // save the todo item in the database
//       res.redirect('/todo')  // go back to the todo page
//     } catch (e){
//       next(e);
//     }
//   }
//   )

//   app.get("/todo/delete/:itemId",
//     isLoggedIn,
//     async (req,res,next) => {
//       try{
//         const itemId=req.params.itemId; // get the id of the item to delete
//         await ToDoItem.deleteOne({_id:itemId}) // remove that item from the database
//         res.redirect('/todo') // go back to the todo page
//       } catch (e){
//         next(e);
//       }
//     }
//   )

//   app.get("/todo/completed/:value/:itemId",
//   isLoggedIn,
//   async (req,res,next) => {
//     try{
//       const itemId=req.params.itemId; // get the id of the item to delete
//       const completed = req.params.value=='true';
//       await ToDoItem.findByIdAndUpdate(itemId,{completed}) // remove that item from the database
//       res.redirect('/todo') // go back to the todo page
//     } catch (e){
//       next(e);
//     }
//   }
// )

// /* ************************
//   Functions needed for the course finder routes
//    ************************ */

// function getNum(coursenum){
//   // separate out a coursenum 103A into 
//   // a num: 103 and a suffix: A
//   i=0;
//   while (i<coursenum.length && '0'<=coursenum[i] && coursenum[i]<='9'){
//     i=i+1;
//   }
//   return coursenum.slice(0,i);
// }


// function times2str(times){
//   // convert a course.times object into a list of strings
//   // e.g ["Lecture:Mon,Wed 10:00-10:50","Recitation: Thu 5:00-6:30"]
//   if (!times || times.length==0){
//     return ["not scheduled"]
//   } else {
//     return times.map(x => time2str(x))
//   }
  
// }
// function min2HourMin(m){
//   // converts minutes since midnight into a time string, e.g.
//   // 605 ==> "10:05"  as 10:00 is 60*10=600 minutes after midnight
//   const hour = Math.floor(m/60);
//   const min = m%60;
//   if (min<10){
//     return `${hour}:0${min}`;
//   }else{
//     return `${hour}:${min}`;
//   }
// }

// function time2str(time){
//   // creates a Times string for a lecture or recitation, e.g. 
//   //     "Recitation: Thu 5:00-6:30"
//   const start = time.start
//   const end = time.end
//   const days = time.days
//   const meetingType = time['type'] || "Lecture"
//   const location = time['building'] || ""

//   return `${meetingType}: ${days.join(",")}: ${min2HourMin(start)}-${min2HourMin(end)} ${location}`
// }



// /* ************************
//   Loading (or reloading) the data into a collection
//    ************************ */
// // this route loads in the courses into the Course collection
// // or updates the courses if it is not a new collection

// app.get('/upsertDB',
//   async (req,res,next) => {
//     await Course.deleteMany({})
    // for (course of courses){ 
//       const {subject,coursenum,section,term}=course;
//       const num = getNum(coursenum);
//       course.num=num
//       course.suffix = coursenum.slice(num.length)
//       await Course.findOneAndUpdate({subject,coursenum,section,term},course,{upsert:true})
//     }
//     const num = await Course.find({}).countDocuments();
//     res.send("data uploaded: "+num)
//   }
// )


// app.post('/courses/bySubject',
//   // show list of courses in a given subject
//   async (req,res,next) => {
//     const {subject} = req.body;
//     const courses = await Course.find({subject:subject,independent_study:false}).sort({term:1,num:1,section:1})
    
//     res.locals.courses = courses
//     res.locals.times2str = times2str
//     //res.json(courses)
//     res.render('courselist')
//   }
// )
// app.get('/courses/bySubject/:subject',
//   // show list of courses in a given subject
//   async (req,res,next) => {
//     const {subject} = req.params;
//     const courses = await Course.find({subject:subject,independent_study:false}).sort({term:1,num:1,section:1})
    
//     res.locals.courses = courses
//     res.locals.times2str = times2str
//     //res.json(courses)
//     res.render('courselist')
//   }
// )

// app.get('/courses/bySubject/:subject/:coursenum',
//   // show list of courses in a given subject 
//   async (req,res,next) => {
//     const {subject,coursenum} = req.params;
//     const courses = await Course.find({subject,coursenum,independent_study:false}).sort({term:1,num:1,section:1})
    
//     res.locals.courses = courses
//     res.locals.times2str = times2str
//     //res.json(courses)
//     res.render('courselist')
//   }
// )

// app.get('/courses/bySubject/:subject/:coursenum/:section',
//   // show list of courses in a given subject
//   async (req,res,next) => {
//     const {subject,coursenum,section} = req.params;
//     const courses = 
//       await Course.find({subject,coursenum,section,independent_study:false}).sort({term:1,num:1,section:1})
    
//     res.locals.courses = courses
//     res.locals.times2str = times2str
//     //res.json(courses)
//     res.render('courselist')
//   }
// )

// app.get('/courses/show/:courseId',
//   // show all info about a course given its courseid
//   async (req,res,next) => {
//     const {courseId} = req.params;
//     const course = await Course.findOne({_id:courseId})
//     res.locals.course = course
//     res.locals.times2str = times2str
//     //res.json(course)
//     res.render('course')
//   }
// )

// app.get('/courses/byInst/:email',
//   // show a list of all courses taught by a given faculty
//   async (req,res,next) => {
//     let email = req.params.email;
//     email = (email.indexOf('@')>0?email:email+"@brandeis.edu")
//     const courses = 
//        await Course
//          .find({instructor:email,enrolled:{$gt:0}})
//          .sort({term:1,enrolled:-1,coursenum:1})
//     //res.json(courses)
//     res.locals.courses = courses
//     res.locals.times2str = times2str
//     res.render('courselist')
//   } 
// )

// app.get('/courses/byName/:name',
//   async (req,res,next) => {
//     let name = req.params.name;
//     const courses = 
//        await Course
//          .find({name,enrolled:{$gt:0}})
//          .sort({term:1,enrolled:-1})
//     //res.json(courses)
//     res.locals.courses = courses
//     res.locals.times2str = times2str
//     res.render('courselist')
//   } 
// )

// app.post('/courses/byInst',
//   // show courses taught by a faculty send from a form
//   async (req,res,next) => {
//     try {
//           const email = req.body.email+"@brandeis.edu";
//           const courses = 
//             await Course
//                     .find({instructor:email,independent_study:false})
//                     .sort({term:1,num:1,section:1})
//           //res.json(courses)
//           res.locals.courses = courses
//           res.locals.times2str = times2str
//           res.render('courselist')
//     } catch(error){
//       next(error)
//     }
//   }
// )

// /*
//   aggregation example ...
//   here we create an aggregation pipeline using the
//   mongo compass aggregation tool
//   and then use it to find the total number of students
//   enrolled in each subject
// */
// const demo4stages =

//     [
//       // first we add a new field, email, which is the third element of the instructor value
//       { $addFields: {  email: { $arrayElemAt: [ '$instructor', 2]}}},

//       // then we filter out courses with <8 students
//       {$match: {  enrolled: {$gt:8}}},

//       // then we group by email and find average enrollment
//       {$group: {
//             _id: '$email',
//             courseCount: {  $avg: '$enrolled'}
//         }},

//       // then we sort by courseCount, decreasing
//       {$sort: { 'courseCount': -1}}
//     ]


// const pivotDemo = 
//       [
//         { // then we filter out courses with <8 students
//           $match: {
//             'enrolled': {
//               '$gte': 8
//             }
//           }
//         }, {// then we group by email and find various enrollment stats
//           $group: {
//             '_id': '$instructor', 
//             'courseCount': {
//               '$sum': 1
//             },
//             'avgClassSize': {
//               '$avg': '$enrolled'
//             },
//             'maxClassSize': {
//               '$max': '$enrolled'
//             },
//             'minClassSize': {
//               '$min': '$enrolled'
//             },
//             'totalEnrollment': {
//               '$sum': '$enrolled'
//             },
//             'classes':{
//               '$push': {s:'$subject',c:'$coursenum',z:'$section',t:'$term',e:'$enrolled',n:'$name'}
//             }
//           }
//         }, // then we filter for faculty with at least 300 students total
//             {$match: {
//               'totalEnrollment': {
//                 '$gte': 300
//               }
//             }
//           }, { // then we sort by courseCount, decreasing
//           $sort: {
//             'totalEnrollment': -1
//           }
//         }
//       ]

// const deptTeachingLoads = (dept) => 
//       [
//         { // then we filter out courses with <8 students
//           $match: {
//             'subject': dept,
//             'enrolled':{$gt:0},
//           }
//         }, {// then we group by email and find various enrollment stats
//           $group: {
//             '_id': '$instructor', 
//             'courseCount': {
//               '$sum': 1
//             },
//             'avgClassSize': {
//               '$avg': '$enrolled'
//             },
//             'maxClassSize': {
//               '$max': '$enrolled'
//             },
//             'minClassSize': {
//               '$min': '$enrolled'
//             },
//             'totalEnrollment': {
//               '$sum': '$enrolled'
//             },
//           }
//         }, { // then we sort by courseCount, decreasing
//           $sort: {
//             'totalEnrollment': -1
//           }
//         }
//       ]


// app.get('/demo4stages',
//   async (req,res,next) => {
//    try {
//     const enrollments = 
//       await Course.aggregate(
//         demo4stages
//       )
//     res.json(enrollments)
//    } catch(error) {
//      next(error)
//    }
//   })

//   app.get('/pivot/onInstructor',
//   async (req,res,next) => {
//    try {
//     const enrollments = 
//       await Course.aggregate(
//         pivotDemo
//       )
//     res.json(enrollments)
//    } catch(error) {
//      next(error)
//    }
//   })


//   app.get('/deptTeachingLoads/:subject',
//   async (req,res,next) => {
//    try {
//     const enrollments = 
//       await Course.aggregate(
//         deptTeachingLoads(req.params.subject)
//       )
//     res.locals.subject = req.params.subject
//     res.locals.enrollments = enrollments
//     res.render('enrollmentsBySubject')
//    } catch(error) {
//      next(error)
//    }
//   })




// app.get('/bigclasses/:size',
//   async (req,res,next) => {
//    try {
//     const size = parseInt(req.params.size)
//     const enrollments = 
//       await Course.aggregate(
//         [
//           {$match:{'enrolled':{$gt:size}}},
//           {$sort:{'enrolled':1}}
//         ]
//       )
//     res.json(enrollments)
//    } catch(error) {
//      next(error)
//    }
//   })


// app.use(isLoggedIn)

// app.get('/addCourse/:courseId',
//   // add a course to the user's schedule
//   async (req,res,next) => {
//     try {
//       const courseId = req.params.courseId
//       const userId = res.locals.user._id
//       // check to make sure it's not already loaded
//       const lookup = await Schedule.find({courseId,userId})
//       if (lookup.length==0){
//         const schedule = new Schedule({courseId,userId})
//         await schedule.save()
//       }
//       res.redirect('/schedule/show')
//     } catch(e){
//       next(e)
//     }
//   })

// app.get('/schedule/show',
//   // show the current user's schedule
//   async (req,res,next) => {
//     try{
//       const userId = res.locals.user._id;
//       const courseIds = 
//          (await Schedule.find({userId}))
//                         .sort(x => x.term)
//                         .map(x => x.courseId)
//       res.locals.courses = await Course.find({_id:{$in: courseIds}})
//       res.render('schedule')
//     } catch(e){
//       next(e)
//     }
//   }
// )

// app.get('/schedule/remove/:courseId',
//   // remove a course from the user's schedule
//   async (req,res,next) => {
//     try {
//       await Schedule.remove(
//                 {userId:res.locals.user._id,
//                  courseId:req.params.courseId})
//       res.redirect('/schedule/show')

//     } catch(e){
//       next(e)
//     }
//   }
// )


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
console.log('connecting on port '+port)

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
