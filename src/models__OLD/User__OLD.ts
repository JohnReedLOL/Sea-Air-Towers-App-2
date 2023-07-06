import bcrypt from "bcrypt-nodejs";
import crypto from "crypto";
import mongoose from "mongoose";

export type UserDocument__OLD = mongoose.Document & {
    email: string;
    password: string;
    passwordResetToken: string;
    passwordResetExpires: Date;

    // Commenting this out because there is no facebook sign in.
    // facebook: string;
    tokens: AuthToken[];

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

const userSchema__OLD = new mongoose.Schema<UserDocument__OLD>(
    {
        email: { type: String, unique: true },
        password: String,
        passwordResetToken: String,
        passwordResetExpires: Date,
    
        // Commenting this out because there is no facebook sign in.
        // facebook: String,
        twitter: String,
        google: String,
        tokens: Array,
    
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
userSchema__OLD.pre("save", function save(next) {
    const user = this as UserDocument__OLD;
    if (!user.isModified("password")) { return next(); }
    bcrypt.genSalt(10, (err, salt) => {
        if (err) { return next(err); }
        bcrypt.hash(user.password, salt, undefined, (err: mongoose.Error, hash) => {
            if (err) { return next(err); }
            user.password = hash;
            next();
        });
    });
});

const comparePassword: comparePasswordFunction = function (candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, (err: mongoose.Error, isMatch: boolean) => {
        cb(err, isMatch);
    });
};

userSchema__OLD.methods.comparePassword = comparePassword;

/**
 * Helper method for getting user's gravatar.
 */
userSchema__OLD.methods.gravatar = function (size: number = 200) {
    if (!this.email) {
        return `https://gravatar.com/avatar/?s=${size}&d=retro`;
    }
    const md5 = crypto.createHash("md5").update(this.email).digest("hex");
    return `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
};

// Note: In the MongoDB database this gets stored as "user__olds". Everything is lowercase and an "s" is added at the end.
export const User__OLD = mongoose.model<UserDocument__OLD>("User__OLD", userSchema__OLD);
