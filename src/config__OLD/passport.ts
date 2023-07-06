import passport from "passport";
import passportLocal from "passport-local";
// Commenting this out because there is no Facebook sign in.
// import passportFacebook from "passport-facebook";
import { find } from "lodash";

// import { User__OLD, UserType } from '../models__OLD/User__OLD';
import { User__OLD, UserDocument__OLD } from "../models__OLD/User__OLD";
import { Request, Response, NextFunction } from "express";
import { NativeError } from "mongoose";

const LocalStrategy = passportLocal.Strategy;
// Commenting this out because there is no Facebook sign in.
// const FacebookStrategy = passportFacebook.Strategy;

passport.serializeUser<any, any>((req, user, done) => {
    done(undefined, user);
});

passport.deserializeUser((id, done) => {
    User__OLD.findById(id, (err: NativeError, user: UserDocument__OLD) => done(err, user));
});


/**
 * Sign in using Email and Password.
 */
passport.use(new LocalStrategy({ usernameField: "email" }, (email, password, done) => {
    User__OLD.findOne({ email: email.toLowerCase() }, (err: NativeError, user: UserDocument__OLD) => {
        if (err) { return done(err); }
        if (!user) {
            return done(undefined, false, { message: `Email ${email} not found.` });
        }
        user.comparePassword(password, (err: Error, isMatch: boolean) => {
            if (err) { return done(err); }
            if (isMatch) {
                return done(undefined, user);
            }
            return done(undefined, false, { message: "Invalid email or password." });
        });
    });
}));


/**
 * OAuth Strategy Overview
 *
 * - User is already logged in.
 *   - Check if there is an existing account with a provider id.
 *     - If there is, return an error message. (Account merging not supported)
 *     - Else link new OAuth account with currently logged-in user.
 * - User is not logged in.
 *   - Check if it's a returning user.
 *     - If returning user, sign in and we are done.
 *     - Else check if there is an existing account with user's email.
 *       - If there is, return an error message.
 *       - Else create a new account.
 */

// Commenting this out because there is no Facebook sign in.

/**
 * Sign in with Facebook.
 */
/*
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_ID,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: "/old/auth/facebook/callback",
    profileFields: ["name", "email", "link", "locale", "timezone"],
    passReqToCallback: true
}, (req: any, accessToken, refreshToken, profile, done) => {
    if (req.user) {
        User__OLD.findOne({ facebook: profile.id }, (err: NativeError, existingUser: UserDocument__OLD) => {
            if (err) { return done(err); }
            if (existingUser) {
                req.flash("errors", { msg: "There is already a Facebook account that belongs to you. Sign in with that account or delete it, then link it with your current account." });
                done(err);
            } else {
                User__OLD.findById(req.user.id, (err: NativeError, user: UserDocument__OLD) => {
                    if (err) { return done(err); }
                    user.facebook = profile.id;
                    user.tokens.push({ kind: "facebook", accessToken });
                    user.profile.name = user.profile.name || `${profile.name.givenName} ${profile.name.familyName}`;
                    user.profile.gender = user.profile.gender || profile._json.gender;
                    user.profile.picture = user.profile.picture || `https://graph.facebook.com/${profile.id}/picture?type=large`;
                    user.save((err: Error) => {
                        req.flash("info", { msg: "Facebook account has been linked." });
                        done(err, user);
                    });
                });
            }
        });
    } else {
        User__OLD.findOne({ facebook: profile.id }, (err: NativeError, existingUser: UserDocument__OLD) => {
            if (err) { return done(err); }
            if (existingUser) {
                return done(undefined, existingUser);
            }
            User__OLD.findOne({ email: profile._json.email }, (err: NativeError, existingEmailUser: UserDocument__OLD) => {
                if (err) { return done(err); }
                if (existingEmailUser) {
                    req.flash("errors", { msg: "There is already an account using this email address. Sign in to that account and link it with Facebook manually from Account Settings." });
                    done(err);
                } else {
                    const user: any = new User__OLD();
                    user.email = profile._json.email;
                    user.facebook = profile.id;
                    user.tokens.push({ kind: "facebook", accessToken });
                    user.profile.name = `${profile.name.givenName} ${profile.name.familyName}`;
                    user.profile.gender = profile._json.gender;
                    user.profile.picture = `https://graph.facebook.com/${profile.id}/picture?type=large`;
                    user.profile.location = (profile._json.location) ? profile._json.location.name : "";
                    user.save((err: Error) => {
                        done(err, user);
                    });
                }
            });
        });
    }
}));
*/

/**
 * Login Required middleware.
 */
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/old/login");
};

/**
 * Authorization Required middleware.
 */
export const isAuthorized = (req: Request, res: Response, next: NextFunction) => {
    const provider = req.path.split("/").slice(-1)[0];

    const user = req.user as UserDocument__OLD;
    if (find(user.tokens, { kind: provider })) {
        next();
    } else {
        res.redirect(`/auth/${provider}`);
    }
};
