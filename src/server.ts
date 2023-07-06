import errorHandler from "errorhandler";
import app from "./app";


/**
 * Error Handler. Provides full stack
 */
// Note: I thought I wanted to always be in a dev environment, so I don't know why I commented this out in my original application, but in order to keep things the same for this re-write I am commenting this out here too.
/*
if (process.env.NODE_ENV === "development") {
    app.use(errorHandler());
}
*/

// Nah, I want the errorHandler:
app.use(errorHandler());

// I always want the environment to be "dev" (maybe I was supposed to use the word "development" instead of "dev", I'm not sure)
app.set("env", "dev");

/**
 * Start Express server.
 */
const server = app.listen(app.get("port"), () => {
    console.log(
        "  App is running at http://localhost:%d in %s mode",
        app.get("port"),
        app.get("env")
    );
    console.log("  Press CTRL-C to stop\n");
});

export default server;
