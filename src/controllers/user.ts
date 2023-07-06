"use strict";

import async from "async";
import crypto from "crypto";
// Commenting this out because email sender is broken.
// import nodemailer from "nodemailer";
import passport from "passport";
import { ApartmentType, Landlord, LandlordDocument, AuthToken } from "../models/Landlord";
import { Apartment, ApartmentDocument } from "../models/Apartment";
import { ApartmentBookings, ApartmentBookingsDocument } from "../models/ApartmentBookings";
import { Request, Response, NextFunction } from "express";
import { IVerifyOptions } from "passport-local";
import { WriteError } from "mongodb";
import { body, check, validationResult } from "express-validator";
import "../config/passport";
import { CallbackError, NativeError } from "mongoose";

/**
 * Login page.
 * @route GET /login
 */
export const getLogin = (req: Request, res: Response): void => {
    if (req.user) {
        return res.redirect("/");
    }
    res.render("account/login", {
        title: "Login",
    });
};

/**
 * Sign in using email and password.
 * @route POST /login
 */
export const postLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await check("email", "Email is not valid").isEmail().run(req);
    await check("password", "Password cannot be blank").isLength({min: 1}).run(req);
    await body("email").normalizeEmail({ gmail_remove_dots: false }).run(req);

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        req.flash("errors", errors.array());
        return res.redirect("/login");
    }

    passport.authenticate("local", (err: Error, user: LandlordDocument, info: IVerifyOptions) => {
        if (err) { return next(err); }
        if (!user) {
            req.flash("errors", {msg: info.message});
            return res.redirect("/login");
        }
        req.logIn(user, (err) => {
            if (err) { return next(err); }
            req.flash("success", { msg: "Success! You are signed in." });
            res.redirect(req.session.returnTo || "/");
        });
    })(req, res, next);
};

/**
 * Log out.
 * @route GET /logout
 */
export const logout = (req: Request, res: Response): void => {
    req.logout();
    res.redirect("/");
};

/**
 * Signup page.
 * @route GET /signup
 */
export const getSignup = (req: Request, res: Response): void => {
    if (req.user) {
        return res.redirect("/");
    }
    res.render("account/signup", {
        title: "Create Account"
    });
};

/**
 * Create a new local account.
 * @route POST /signup
 */
export const postSignup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await check("email", "Email is not valid").isEmail().run(req);
    await check("password", "Password must be at least 4 characters long").isLength({ min: 4 }).run(req);
    await check("confirmPassword", "Passwords do not match").equals(req.body.password).run(req);
    await body("email").normalizeEmail({ gmail_remove_dots: false }).run(req);

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        req.flash("errors", errors.array());
        return res.redirect("/signup");
    }

    const user = new Landlord({
        email: req.body.email.toLowerCase(), // Make it lowercase in database.,
        password: req.body.password
    });

    Landlord.findOne({ email: req.body.email }, (err: NativeError, existingUser: LandlordDocument) => {
        if (err) { return next(err); }
        if (existingUser) {
            req.flash("errors", { msg: "Account with that email address already exists. If that email is yours, try signing in." });
            return res.redirect("/signup");
        }
        user.save((err) => {
            if (err) { return next(err); }
            req.logIn(user, (err) => {
                if (err) {
                    return next(err);
                }
                req.flash("success", { msg: "You should be signed in now, check the navigation bar at the top of this page for your email: " + req.body.email.toLowerCase() + " . If you are signed in, you can now list an apartment. If you aren't signed in, please click on \"Landlord's Login\" and sign in." });
                res.redirect("/");
            });
        });
    });
};

/**
 * Profile page.
 * @route GET /account
 */
export const getAccount = (req: Request, res: Response): void => {
    const user = req.user as LandlordDocument;
    let apartments: ApartmentType[] = user.apartments;
    if(typeof apartments != "undefined" && apartments != null) {
        // it's good
    } else {
        // Set it to empty array
        apartments = [];
    }
    const listings: number[]  = apartments.map( (apartment: ApartmentType) => apartment.apartmentNumber );
    res.render("account/profile", {
        title: "Landlord's Account Page",
        listings: listings
    });
};

// Commented this out so users can't update their profile.
/**
 * Update profile information.
 * @route POST /account/profile
 */
/*
export const postUpdateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await check("email", "Please enter a valid email address.").isEmail().run(req);
    await body("email").normalizeEmail({ gmail_remove_dots: false }).run(req);

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        req.flash("errors", errors.array());
        return res.redirect("/account");
    }

    const user = req.user as UserDocument;
    User.findById(user.id, (err: NativeError, user: UserDocument) => {
        if (err) { return next(err); }
        user.email = req.body.email || "";
        user.profile.name = req.body.name || "";
        user.profile.gender = req.body.gender || "";
        user.profile.location = req.body.location || "";
        user.profile.website = req.body.website || "";
        user.save((err: WriteError & CallbackError) => {
            if (err) {
                if (err.code === 11000) {
                    req.flash("errors", { msg: "The email address you have entered is already associated with an account." });
                    return res.redirect("/account");
                }
                return next(err);
            }
            req.flash("success", { msg: "Profile information has been updated." });
            res.redirect("/account");
        });
    });
};
*/

/**
 * Update current password.
 * @route POST /account/password
 */
export const postUpdatePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await check("password", "Password must be at least 4 characters long").isLength({ min: 4 }).run(req);
    await check("confirmPassword", "Passwords do not match").equals(req.body.password).run(req);

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        req.flash("errors", errors.array());
        return res.redirect("/account");
    }

    const user = req.user as LandlordDocument;
    Landlord.findById(user.id, (err: NativeError, user: LandlordDocument) => {
        if (err) { return next(err); }
        user.password = req.body.password;
        user.save((err: WriteError & CallbackError) => {
            if (err) { return next(err); }
            req.flash("success", { msg: "Password has been changed." });
            res.redirect("/account");
        });
    });
};

/**
 * Delete user account.
 * @route POST /account/delete
 */
export const postDeleteAccount = (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as LandlordDocument;
    // First delete the bookings under each apartment.
    Apartment.find({ landlordEmail: user.email }, (err, apartments: any) => {
        if (err) { return next(err); }
        // If there are apartments, delete the bookings under said apartments.
        if (! (!apartments || !Array.isArray(apartments) || apartments.length === 0) ) {
            apartments.forEach( (apartment) => {
                // I used to write the deleteMany like this but that started giving me an error so I re-wrote it.
                /*
                ApartmentBookings.deleteMany({ apartmentNumber: apartment.apartmentNumber}, (err) => {
                    if (err) { return next(err); }
                });
                */
               // Example of deleteMany taken from https://www.geeksforgeeks.org/mongoose-deletemany-function/
                ApartmentBookings.deleteMany({ apartmentNumber: apartment.apartmentNumber}).then( () => {
                    console.log("ApartmentBookings deleted if they exist."); // Success
                }).catch( (error) => {
                    console.log(error); // Failure
                    return next(error);
                });
            });
        }
    });
    // Then delete all the apartments under this landlord
    Apartment.deleteMany({ landlordEmail: user.email}).then( () => {
        console.log("Apartments deleted"); // Success
    }).catch( (error) => {
        console.log(error); // Failure
        return next(error);
    });
    // Then delete the landlord
    Landlord.deleteOne({ _id: user.id }).then( () => {
        console.log("Landlord deleted"); // Success
        req.logout();
        req.flash("success", { msg: "Your account has been deleted along with your apartments and their bookings." });
        res.redirect("/");
    }).catch( (error) => {
        console.log(error); // Failure
        return next(error);
    });
};

/**
 * Unlink OAuth provider.
 * @route GET /account/unlink/:provider
 */
export const getOauthUnlink = (req: Request, res: Response, next: NextFunction): void => {
    const provider = req.params.provider;
    const user = req.user as LandlordDocument;
    Landlord.findById(user.id, (err: NativeError, user: any) => {
        if (err) { return next(err); }
        user[provider] = undefined;
        user.tokens = user.tokens.filter((token: AuthToken) => token.kind !== provider);
        user.save((err: WriteError) => {
            if (err) { return next(err); }
            req.flash("info", { msg: `${provider} account has been unlinked.` });
            res.redirect("/account");
        });
    });
};

/**
 * Reset Password page.
 * @route GET /reset/:token
 */
export const getReset = (req: Request, res: Response, next: NextFunction): void => {
    if (req.isAuthenticated()) {
        return res.redirect("/");
    }
    Landlord
        .findOne({ passwordResetToken: req.params.token })
        .where("passwordResetExpires").gt(Date.now())
        .exec((err, user) => {
            if (err) { return next(err); }
            if (!user) {
                req.flash("errors", { msg: "Password reset token is invalid or has expired." });
                return res.redirect("/forgot");
            }
            res.render("account/reset", {
                title: "Password Reset"
            });
        });
};

/**
 * Process the reset password request.
 * @route POST /reset/:token
 */
export const postReset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await check("password", "Password must be at least 4 characters long.").isLength({ min: 4 }).run(req);
    await check("confirm", "Passwords must match.").equals(req.body.password).run(req);

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        req.flash("errors", errors.array());
        return res.redirect("back");
    }

    async.waterfall([
        function resetPassword(done: (err: any, user: LandlordDocument) => void) {
            Landlord
                .findOne({ passwordResetToken: req.params.token })
                .where("passwordResetExpires").gt(Date.now())
                .exec((err, user: any) => {
                    if (err) { return next(err); }
                    if (!user) {
                        req.flash("errors", { msg: "Password reset token is invalid or has expired." });
                        return res.redirect("back");
                    }
                    user.password = req.body.password;
                    user.passwordResetToken = undefined;
                    user.passwordResetExpires = undefined;
                    user.save((err: WriteError) => {
                        if (err) { return next(err); }
                        req.logIn(user, (err) => {
                            done(err, user);
                        });
                    });
                });
        },
        // Commenting this out because the email sender is broken
        /*
        function sendResetPasswordEmail(user: LandlordDocument, done: (err: Error) => void) {
            const transporter = nodemailer.createTransport({
                service: "SendGrid",
                auth: {
                    user: process.env.SENDGRID_USER,
                    pass: process.env.SENDGRID_PASSWORD
                }
            });
            const mailOptions = {
                to: user.email,
                from: "express-ts@starter.com",
                subject: "Your password has been changed",
                text: `Hello,\n\nThis is a confirmation that the password for your account ${user.email} has just been changed.\n`
            };
            transporter.sendMail(mailOptions, (err) => {
                req.flash("success", { msg: "Success! Your password has been changed." });
                done(err);
            });
        }
        */
        // I'm keeping the name sendResetPasswordEmail but it no longer sends the email because the email sender is broken. Now it just says a success message.
        function sendResetPasswordEmail(user: LandlordDocument, done: (err: Error) => void) {
            req.flash("success", { msg: "Success! Your password has been changed." });
            res.redirect("/");
        }
    ], (err) => {
        if (err) { return next(err); }
        res.redirect("/");
    });
};

/**
 * Forgot Password page.
 * @route GET /forgot
 */
export const getForgot = (req: Request, res: Response): void => {
    if (req.isAuthenticated()) {
        return res.redirect("/");
    }
    res.render("account/forgot", {
        title: "Forgot Password"
    });
};

/**
 * Create a random token, then the send user an email with a reset link.
 * 
 * Edit: This no longer sends email because the email sender stopped working, but the user can still change their password.
 * Now this request just redirects the user to a password change page, the same page they would have gone to if they clicked the link in the email that used to be sent when the email sender was working.
 * @route POST /forgot
 */
export const postForgot = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await check("email", "Please enter a valid email address.").isEmail().run(req);
    await body("email").normalizeEmail({ gmail_remove_dots: false }).run(req);

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        req.flash("errors", errors.array());
        return res.redirect("/forgot");
    }

    async.waterfall([
        function createRandomToken(done: (err: Error, token: string) => void) {
            crypto.randomBytes(16, (err, buf) => {
                const token = buf.toString("hex");
                done(err, token);
            });
        },
        function setRandomToken(token: AuthToken, done: (err: NativeError | WriteError, token?: AuthToken, user?: LandlordDocument) => void) {
            Landlord.findOne({ email: req.body.email }, (err: NativeError, user: any) => {
                if (err) { return done(err); }
                if (!user) {
                    req.flash("errors", { msg: "Account with that email address does not exist." });
                    return res.redirect("/forgot");
                }
                user.passwordResetToken = token;
                user.passwordResetExpires = Date.now() + 3600000; // 1 hour
                user.save((err: WriteError) => {
                    done(err, token, user);
                });
            });
        },
        // Commenting this out because the email sender is broken
        /*
        function sendForgotPasswordEmail(token: AuthToken, user: UserDocument, done: (err: Error) => void) {
            const transporter = nodemailer.createTransport({
                service: "SendGrid",
                auth: {
                    user: process.env.SENDGRID_USER,
                    pass: process.env.SENDGRID_PASSWORD
                }
            });
            const mailOptions = {
                to: user.email,
                from: "hackathon@starter.com",
                subject: "Reset your password on Hackathon Starter",
                text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n
          Please click on the following link, or paste this into your browser to complete the process:\n\n
          http://${req.headers.host}/reset/${token}\n\n
          If you did not request this, please ignore this email and your password will remain unchanged.\n`
            };
            transporter.sendMail(mailOptions, (err) => {
                req.flash("info", { msg: `An e-mail has been sent to ${user.email} with further instructions.` });
                done(err);
            });
        }
        */
        // I'm keeping the name sendForgetPasswordEmail but it no longer sends the email because the email sender is broken. Now it just reroutes to the password reset page.
        function sendForgotPasswordEmail(token: AuthToken, user: LandlordDocument, done: (err: Error) => void) {
            // Commenting this out because even though it was what was used before, it is insecure due to http instead of https.
            // return res.redirect(`http://${req.headers.host}/reset/${token}`);
            return res.redirect(`/reset/${token}`);
        }
    ], (err) => {
        if (err) { return next(err); }
        res.redirect("/forgot");
    });
};
