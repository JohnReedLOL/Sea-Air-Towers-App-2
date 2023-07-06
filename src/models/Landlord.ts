// I copied this file from Users.ts and then changed "User" into "Landlord" here.
// Note in this app all the landlords are users who can post an apartment listing.

import bcrypt from "bcrypt-nodejs";
import crypto from "crypto";
import mongoose from "mongoose";

export type LandlordDocument = mongoose.Document & {
    email: string;
    password: string;
    passwordResetToken: string;
    passwordResetExpires: Date;

    // facebook: string; // Note: Removed Facebook sign in.
    tokens: AuthToken[];
    apartments: ApartmentType[];

    profile: {
        name: string;
        gender: string;
        location: string;
        website: string;
        picture: string;
    };

    comparePassword: comparePasswordFunction;
    gravatar: (size: number) => string;
};

type comparePasswordFunction = (candidatePassword: string, cb: (err: any, isMatch: any) => void) => void;

export interface AuthToken {
    accessToken: string;
    kind: string;
}

export interface ApartmentType {
    apartmentNumber: number;
}

const landlordSchema = new mongoose.Schema<LandlordDocument>(
    {
        email: { type: String, unique: true },
        password: String,
        passwordResetToken: String,
        passwordResetExpires: Date,
    
        // Note: Removed Facebook, Twitter, Google
        // facebook: String,
        // twitter: String,
        // google: String,
        tokens: Array,
        apartments: Array,
    
        profile: {
            name: String,
            gender: String,
            location: String,
            website: String,
            picture: String
        }
    },
    { timestamps: true },
);

/**
 * Password hash middleware.
 */
landlordSchema.pre("save", function save(next) {
    const landlord = this as LandlordDocument;
    if (!landlord.isModified("password")) { return next(); }
    bcrypt.genSalt(10, (err, salt) => {
        if (err) { return next(err); }
        bcrypt.hash(landlord.password, salt, undefined, (err: mongoose.Error, hash) => {
            if (err) { return next(err); }
            landlord.password = hash;
            next();
        });
    });
});

const comparePassword: comparePasswordFunction = function (candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, (err: mongoose.Error, isMatch: boolean) => {
        cb(err, isMatch);
    });
};

landlordSchema.methods.comparePassword = comparePassword;

/**
 * Helper method for getting landlord's (user's) gravatar.
 */
landlordSchema.methods.gravatar = function (size: number = 200) {
    if (!this.email) {
        return `https://gravatar.com/avatar/?s=${size}&d=retro`;
    }
    const md5 = crypto.createHash("md5").update(this.email).digest("hex");
    return `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
};

export const Landlord = mongoose.model<LandlordDocument>("Landlord", landlordSchema);
