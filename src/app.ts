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
import * as homeController from "./controllers/home";
import * as userController from "./controllers/user";
// No API so this is commented out.
// import * as apiController from "./controllers/api";
import * as contactController from "./controllers/contact";
import * as apartmentController from "./controllers/apartment";

// API keys and Passport configuration
import * as passportConfig from "./config/passport";

// Create Express server
const app = express();

// Connect to MongoDB
const mongoUrl = MONGODB_URI;
mongoose.Promise = bluebird;

/*
Note: When I did "npm start" from the terminal I got this:
(node:28998) DeprecationWarning: current Server Discovery and Monitoring engine is deprecated, and will be removed in a future version. To use the new Server Discover and Monitoring engine, pass option { useUnifiedTopology: true } to the MongoClient constructor.
(Use `node --trace-deprecation ...` to show where the warning was created)

Googling the error gave me this: https://stackoverflow.com/questions/57895175/server-discovery-and-monitoring-engine-is-deprecated

The weird thing is I have "useUnifiedTopology: true" below. I don't know what's wrong.
*/

mongoose.connect(mongoUrl, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true } ).then(
    () => { /** ready to use. The `mongoose.connect()` promise resolves to undefined. */ },
).catch(err => {
    console.log(`MongoDB connection error. Please make sure MongoDB is running. ${err}`);
    // process.exit();
});

// Express configuration
// app.set("port", process.env.PORT || 3000);
// Heroku requres port 8000
app.set("port", process.env.PORT || 8000);
app.locals.pretty = true; // Get rid of HTML compression. I want to see all the HTML pretty in the browser.
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "pug");
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
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
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(lusca.xframe("SAMEORIGIN"));
app.use(lusca.xssProtection(true));
app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});
app.use((req, res, next) => {
    // After successful login, redirect back to the intended page
    if (!req.user &&
    req.path !== "/login" &&
    req.path !== "/signup" &&
    !req.path.match(/^\/auth/) &&
    !req.path.match(/\./)) {
        req.session.returnTo = req.path;
    } else if (req.user &&
    req.path == "/account") {
        req.session.returnTo = req.path;
    }
    next();
});

app.use(
    express.static(path.join(__dirname, "public"), { maxAge: 31557600000 })
);

/**
 * Primary app routes.
 */
app.get("/", homeController.index);
app.get("/login", userController.getLogin);
app.post("/login", userController.postLogin);
app.get("/logout", userController.logout);
app.get("/forgot", userController.getForgot);
app.post("/forgot", userController.postForgot);
app.get("/reset/:token", userController.getReset);
app.post("/reset/:token", userController.postReset);
app.get("/signup", userController.getSignup);
app.post("/signup", userController.postSignup);
app.get("/contact", contactController.getContact);
// Commenting this out because the email sender is broken, so can't do this action.
// app.post("/contact", contactController.postContact);
app.get("/mobile-app-shortcut", contactController.getMobileAppShortcut);
app.get("/account", passportConfig.isAuthenticated, userController.getAccount);
app.post("/account/password", passportConfig.isAuthenticated, userController.postUpdatePassword);
app.post("/account/delete", passportConfig.isAuthenticated, userController.postDeleteAccount);
app.get("/account/unlink/:provider", passportConfig.isAuthenticated, userController.getOauthUnlink); // This can be deleted
app.get("/account/list-apartment", passportConfig.isAuthenticated, apartmentController.getCreateApartment);
app.post("/account/list-apartment", passportConfig.isAuthenticated, apartmentController.postCreateApartment);
// app.get("/rent-apartment-by-landlord", apartmentController.getRentApartmentByLandlord); // This is no longer used. Just do /search-for-apartments
app.get("/apartment/:apartmentNumber", apartmentController.getApartment);
app.get("/account/update-listing", passportConfig.isAuthenticated, apartmentController.chooseListingToUpdate);
app.get("/account/update-listing/:apartmentNumber", passportConfig.isAuthenticated, apartmentController.updateListing);
app.get("/account/update-availability/:apartmentNumber", passportConfig.isAuthenticated, apartmentController.updateApartmentAvailability);
app.post("/account/update-availability/:apartmentNumber", passportConfig.isAuthenticated, apartmentController.postUpdateApartmentAvailability);
app.post("/account/unupdate-availability/:apartmentNumber", passportConfig.isAuthenticated, apartmentController.postUnUpdateApartmentAvailability);
app.get("/account/edit-listing/:apartmentNumber", passportConfig.isAuthenticated, apartmentController.getUpdateApartmentListing);
app.post("/account/edit-listing/:apartmentNumber", passportConfig.isAuthenticated, apartmentController.postUpdateApartmentListing);
app.get("/search-for-apartments", apartmentController.searchForApartments);
app.post("/search-for-apartments", apartmentController.postSearchForApartments);


/**
 * Original primary app routes.
 */
/*
app.get("/", homeController.index);
app.get("/login", userController.getLogin);
app.post("/login", userController.postLogin);
app.get("/logout", userController.logout);
app.get("/forgot", userController.getForgot);
app.post("/forgot", userController.postForgot);
app.get("/reset/:token", userController.getReset);
app.post("/reset/:token", userController.postReset);
app.get("/signup", userController.getSignup);
app.post("/signup", userController.postSignup);
app.get("/contact", contactController.getContact);
// postContact was removed because the email sender stopped working and that POST was to send email.
// app.post("/contact", contactController.postContact);
app.get("/account", passportConfig.isAuthenticated, userController.getAccount);
// postUpdateProfile was removed because the user doesn't need to be able to update their profile.
// app.post("/account/profile", passportConfig.isAuthenticated, userController.postUpdateProfile);
app.post("/account/password", passportConfig.isAuthenticated, userController.postUpdatePassword);
app.post("/account/delete", passportConfig.isAuthenticated, userController.postDeleteAccount);
app.get("/account/unlink/:provider", passportConfig.isAuthenticated, userController.getOauthUnlink);
*/

/**
 * Original API examples routes.
 */
/*
app.get("/api", apiController.getApi);
app.get("/api/facebook", passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getFacebook);
*/

/**
 * Original OAuth authentication routes. (Sign in)
 */
/*
app.get("/auth/facebook", passport.authenticate("facebook", { scope: ["email", "public_profile"] }));
app.get("/auth/facebook/callback", passport.authenticate("facebook", { failureRedirect: "/login" }), (req, res) => {
    res.redirect(req.session.returnTo || "/");
});
*/

export default app;
