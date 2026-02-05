import winston from "winston";

const options: winston.LoggerOptions = {
    transports: [
        new winston.transports.Console({
            // level: process.env.NODE_ENV === "production" ? "error" : "debug"
            // No more debug logging.
            // level: "debug"
            level: "error"
        }),
        new winston.transports.File({ filename: "debug.log", level: "debug" })
    ]
};

const logger = winston.createLogger(options);

// Always in prod now
// if (process.env.NODE_ENV !== "production") {
//     logger.debug("Logging initialized at debug level");
// }

export default logger;
