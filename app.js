// ========================= NPM PACKAGES ======================================

var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var passport = require("passport");
var LocalStrategy = require("passport-local");
var expressSession = require("express-session");
var methodOverride = require("method-override");
var flash = require("connect-flash");
var app = express();


// =============================== DB-MODELS =====================================

var User = require("./models/users");
var Camp = require("./models/camps");
var Comment = require("./models/comments");
// var seedDb = require("./seeds");


// ================================= MONGO-DB CONNECTION ==============================

mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);
mongoose.connect("mongodb://localhost/yelp_camp_test");
// seedDb();


// ============================= PASSPORT REQUIREMENTS =================================
app.use(flash());
app.use(expressSession({
	secret: "Authentication",
	resave: false,
	saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req,res, next){
	res.locals.currentUser = req.user;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	next();
});


// ============================== PACKAGES REQUIREMENTS ===============================

app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
//source: https://traveltriangle.com/blog/camping-near-delhi/






// =================================== ROUTES =================================
// ============================================================================





//Landing page
app.get("/", function(req, res){
	res.render("landing");
});



// ==================================== CAMSITE ROUTES ============================

//All Campsites
app.get("/campSites", function(req, res){
	Camp.find({}, function(err, campDb){
		if(err){
			console.log("Something Went Wrong!")
			console.log(err);
		}else{
			res.render("camps/campSites", {campSites: campDb});
		}
	});
});

//Add Campsites
app.post("/campSites", isLoggedIn, function(req, res){
	var name = req.body.name;
	var image = req.body.image;
	var desc = req.body.description;
	var author = {
		id: req.user._id,
		username: req.user.username
	}
	var newCamp = {
		name: name, image: image, description:desc, author:author
	};
	Camp.create(newCamp, function(err, camp){
		if(err){
			console.log("Something Went Wrong!");
			console.log(err);
		}else{
			req.flash("success", "Camp Site Added");
			res.redirect("/campSites");
		}
	});
});

//Add Campsites form
app.get("/campSites/addCamp", isLoggedIn, function(req, res){
	
	res.render("camps/addCamp");
});

//Show a Campsite
app.get("/campSites/:id", function(req, res){
	Camp.findById(req.params.id).populate("comments").exec(function(err, found){
		if(err){
			console.log(err);
		}else{
			res.render("camps/show",{campSites: found});
		}
	});
	
});

//Edit a Campsite form
app.get("/campSites/:id/edit", checkCampOwner, function(req, res){
	Camp.findById(req.params.id, function(err, found){
		if(err){
			console.log(err);
			res.redirect("/campSites/" +req.params.id);
		}else{
			res.render("camps/editCamp", {campSite: found});
		}
	});
});

//Edit a Campsite
app.put("/books/:id", checkCampOwner, function(req, res){
	Camp.findByIdAndUpdate(req.params.id, req.body.camp, function(err, updatedCamp){
		if(err){
			console.log(err);
			res.render("/campSites/" +req.params.id+ "/edit");
		}else{
			req.flash("success", "Camp Site Updated");
			res.redirect("/campSites/" +req.params.id);
		}
	});
});

//Delete a Campsite
app.delete("/campSites/:id", checkCampOwner, function(req, res){
	Camp.findByIdAndRemove(req.params.id, function(err){
		if(err){
			console.log(err);
			res.render("/campSites/" +req.params.id);
		}else{
			req.flash("success", "Camp Site Deleted");
			res.redirect("/campSites");
		}
	});
});





//========================== COMMENT ROUTE =================================

//Add new comment form
app.get("/campSites/:id/comments/new", isLoggedIn, function(req,res){
	Camp.findById(req.params.id, function(err, campSites){
		if(err){
			console.log(err);
		}else{
			res.render("comments/addComment", {campSites: campSites});
		}
	});
});

//Add new comment
app.post("/campSites/:id/comments", isLoggedIn, function(req, res){
		Camp.findById(req.params.id, function(err, camps){
			if(err){
				console.log(err);
				res.redirect("/campSites");
			}else{
				Comment.create(req.body.comment, function(err, comment){
					if(err){
						console.log(err);
						res.redirect("/campSites");
					}else{
						comment.author.id = req.user._id;
						comment.author.username = req.user.username;
						comment.save();
						camps.comments.push(comment);
						camps.save();
						req.flash("success", "Comment Posted")
						res.redirect("/campSites/"+req.params.id);
					}
				});
			}
		});
});

//Edit a comment form
app.get("/campSites/:id/comments/:comment_id/edit", checkCommentOwner, function(req, res){
	Comment.findById(req.params.comment_id, function(err, comment){
		if(err){
			res.redirect("back");
		}else{
			res.render("comments/editComment",{campSites_id: req.params.id, comment:comment})
		}
	});
});

// Edit a comment
app.put("/campSites/:id/comments/:comment_id", checkCommentOwner, function(req, res){
	Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, updatedComment){
		if(err){
			console.log(err);
			res.redirect("back");
		}else{
			req.flash("success", "Comment Updated");
			res.redirect("/campSites/" +req.params.id);
		}
	});
});

//Delete a comment
app.delete("/campSites/:id/comments/:comment_id", checkCommentOwner, function(req,res){
	Comment.findByIdAndRemove(req.params.comment_id, function(err, comment){
		if(err){
			console.log(err);
			res.redirect("back");
		}else{
			req.flash("success", "Comment deleted");
			res.redirect("/campSites/"+req.params.id);
		}
	});
});





//=============================== AUTH ROUTE =================================

//Register form
app.get("/register", function(req, res){
	res.render("register");
});

//Register
app.post("/register", function(req, res){
	var newUser = new User({username: req.body.username, name: req.body.name});
	var password = req.body.password;
	User.register(newUser, password, function(err, user){
		if(err){
			console.log(err)
			req.flash("error", err.message);
			return res.redirect("register");
		}
		passport.authenticate("local")(req, res, function(){
			req.flash("success", "Welcome to YelpCamp "+ user.name)
			res.redirect("campSites");
		});
	});
});

//Login Form
app.get("/login", function(req, res){
	res.render("login");
});

//Login
app.post("/login", passport.authenticate("local", {
	successRedirect: "/campSites",
	failureRedirect: "/login"
}),function(req, res){
	
});

//Logout
app.get("/logout", function(req,res){
	req.logout();
	req.flash("success", "Logged Out")
	res.redirect("/campSites");
});






// ================================== AUTHENTICATION FUNCTIONS ===========================

//Check login
function isLoggedIn(req, res, next){
	if(req.isAuthenticated()){
		return next();
	}
	req.flash("error", "Please login first !")
	res.redirect("/login");
}

//Check Camp owner
function checkCampOwner(req, res, next){
	if(req.isAuthenticated()){
		Camp.findById(req.params.id, function(err, found){
			if(err){
				console.log(err);
				req.flash("error", err.message);
				res.redirect("back");
			}else{
				if(found.author.id.equals(req.user._id)){
				   // if(req.user.username === "aarya"){
					   next();
				}else{
					req.flash("error", "You do not have permission for this");
					res.redirect("back");
				}
			}
		});
	}else{
		req.flash("error", "Please login first");
		res.redirect("back");
	}
}

//Check comment owner
function checkCommentOwner(req, res, next){
	if(req.isAuthenticated()){
		Comment.findById(req.params.comment_id, function(err, found){
			if(err){
				console.log(err);
				req.flash("error", err.message);
				res.redirect("back");
			}else{
				if(found.author.id.equals(req.user._id)){
				   // if(req.user.username === "aarya"){
					   next();
				}else{
					req.flash("error", "You do not have permission for this");
					res.redirect("back");
				}
			}
		});
	}else{
		req.flash("error", "Please login first");
		res.redirect("back");
	}
}



// ================================= SERVER ROUTE =================================

app.listen(5000, function(){
	console.log("The server has been started");
});