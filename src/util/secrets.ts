import logger from "./logger";
import dotenv from "dotenv";
import fs from "fs";

if (fs.existsSync(".env")) {
    logger.debug("Using .env file to supply config environment variables");
    dotenv.config({ path: ".env" });
} else {
    logger.debug("Using .env.example file to supply config environment variables");
    dotenv.config({ path: ".env.example" });  // you can delete this after you create your own .env file!
}
// export const ENVIRONMENT = process.env.NODE_ENV;
// const prod = ENVIRONMENT === "production"; // Anything else is treated as 'dev'

// Don't need this variable anymore now that the stuff at the bottom is commented out.
// const prod = false;

export const SESSION_SECRET = process.env["SESSION_SECRET"];

/* Environment is always dev */
// export const MONGODB_URI = prod ? process.env["MONGODB_URI"] : process.env["MONGODB_URI_LOCAL"];
export const MONGODB_URI = process.env["MONGODB_URI"];

if (!SESSION_SECRET) {
    logger.error("No client secret. Set SESSION_SECRET environment variable.");
    process.exit(1);
}

/* Note: there is no local MongoDB ever. Only remote. */
if (!MONGODB_URI) {
    logger.error("No mongo connection string. Set MONGODB_URI environment variable.");
    process.exit(1);
}

// Commenting this shit out:
/*
if (!MONGODB_URI) {
    if (prod) {
        logger.error("No mongo connection string. Set MONGODB_URI environment variable.");
        logger.error("prod variable should always be false. Exiting with exit code 2.");
        process.exit(2);
    } else {
        logger.error("No mongo connection string. Set MONGODB_URI_LOCAL environment variable.");
        process.exit(1);
    }
}
*/