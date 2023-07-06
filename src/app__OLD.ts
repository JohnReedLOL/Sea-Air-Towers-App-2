// Note: I added "__OLD" to the end of everything to indicate that it is old stuff from the original https://github.com/microsoft/TypeScript-Node-Starter master branch

import express from "express";
import compression from "compression";  // compresses requests
import session from "express-session";
import bodyParser from "body-parser";
import lusca from "lusca";
import MongoStore from "connect-mongo";
import flash from "express-flash";
import path from "path";
import mongoose from "mongoose";
import passport from "passport";
import bluebird from "bluebird";
import { MONGODB_URI, SESSION_SECRET } from "./util/secrets";

// Controllers (route handlers)
import * as homeController__OLD from "./controllers__OLD/home";
import * as userController__OLD from "./controllers__OLD/user";
import * as apiController__OLD from "./controllers__OLD/api";
import * as contactController__OLD from "./controllers__OLD/contact";

// API keys and Passport configuration
import * as passportConfig__OLD from "./config__OLD/passport";

// Create Express server
const app__OLD = express();

// Sample MongoDB URI from MongoDB website:
// mongodb+srv://MongoUsername:<password>@seaairtowerscluster.gkntv.mongodb.net/?retryWrites=true&w=majority

// Connect to MongoDB
const mongoUrl = MONGODB_URI;
mongoose.Promise = bluebird;

mongoose.connect(mongoUrl, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true } ).then(
    () => { /** ready to use. The `mongoose.connect()` promise resolves to undefined. */ },
).catch(err => {
    console.log(`MongoDB connection error. Please make sure MongoDB is running. ${err}`);
    // process.exit();
});

// Express configuration
// app__OLD.set("port", process.env.PORT || 3000);

// Heroku requres port 8000
app__OLD.set("port", process.env.PORT || 8000);

app__OLD.set("views", path.join(__dirname, "../views__OLD"));
app__OLD.set("view engine", "pug");
app__OLD.use(compression());
app__OLD.use(bodyParser.json());
app__OLD.use(bodyParser.urlencoded({ extended: true }));
app__OLD.use(session({
    resave: true,
    saveUninitialized: true,
    secret: SESSION_SECRET,
    store: new MongoStore({
        mongoUrl,
        mongoOptions: {
            autoReconnect: true
        }
    })
}));
app__OLD.use(passport.initialize());
app__OLD.use(passport.session());
app__OLD.use(flash());
app__OLD.use(lusca.xframe("SAMEORIGIN"));
app__OLD.use(lusca.xssProtection(true));
app__OLD.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});
app__OLD.use((req, res, next) => {
    // After successful login, redirect back to the intended page
    if (!req.user &&
    req.path !== "/old/login" &&
    req.path !== "/old/signup" &&
    !req.path.match(/^\/auth/) &&
    !req.path.match(/\./)) {
        req.session.returnTo = req.path;
    } else if (req.user &&
    req.path == "/old/account") {
        req.session.returnTo = req.path;
    }
    next();
});

app__OLD.use(
    express.static(path.join(__dirname, "public"), { maxAge: 31557600000 })
);

/**
 * Primary app routes.
 * Edit: added "/old" to the beginning of all of them to show that they are all old routes held over from https://github.com/microsoft/TypeScript-Node-Starter master
 */
app__OLD.get("/old/", homeController__OLD.index);
app__OLD.get("/old/login", userController__OLD.getLogin);
app__OLD.post("/old/login", userController__OLD.postLogin);
app__OLD.get("/old/logout", userController__OLD.logout);
app__OLD.get("/old/forgot", userController__OLD.getForgot);
app__OLD.post("/old/forgot", userController__OLD.postForgot);
app__OLD.get("/old/reset/:token", userController__OLD.getReset);
app__OLD.post("/old/reset/:token", userController__OLD.postReset);
app__OLD.get("/old/signup", userController__OLD.getSignup);
app__OLD.post("/old/signup", userController__OLD.postSignup);
app__OLD.get("/old/contact", contactController__OLD.getContact);
app__OLD.post("/old/contact", contactController__OLD.postContact);
app__OLD.get("/old/account", passportConfig__OLD.isAuthenticated, userController__OLD.getAccount);
app__OLD.post("/old/account/profile", passportConfig__OLD.isAuthenticated, userController__OLD.postUpdateProfile);
app__OLD.post("/old/account/password", passportConfig__OLD.isAuthenticated, userController__OLD.postUpdatePassword);
app__OLD.post("/old/account/delete", passportConfig__OLD.isAuthenticated, userController__OLD.postDeleteAccount);
app__OLD.get("/old/account/unlink/:provider", passportConfig__OLD.isAuthenticated, userController__OLD.getOauthUnlink);

/**
 * API examples routes.
 */
app__OLD.get("/old/api", apiController__OLD.getApi);
// Commenting this out because no Facebook sign in.
// app__OLD.get("/old/api/facebook", passportConfig__OLD.isAuthenticated, passportConfig__OLD.isAuthorized, apiController__OLD.getFacebook);

// Commenting these out because no Facebook sign in.

/**
 * OAuth authentication routes. (Sign in)
 */
/*
app__OLD.get("/old/auth/facebook", passport.authenticate("facebook", { scope: ["email", "public_profile"] }));
app__OLD.get("/old/auth/facebook/callback", passport.authenticate("facebook", { failureRedirect: "/old/login" }), (req, res) => {
    res.redirect(req.session.returnTo || "/old/");
});
*/

export default app__OLD;
