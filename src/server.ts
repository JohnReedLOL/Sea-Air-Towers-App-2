import errorHandler from "errorhandler";
import app__OLD from "./app";


/**
 * Error Handler. Provides full stack
 * Edit: commented "if (process.env.NODE_ENV === "development")" out to make it always in development.
 */
// if (process.env.NODE_ENV === "development") {
    app__OLD.use(errorHandler());
// }


/**
 * Start Express server.
 */
const server__OLD = app__OLD.listen(app__OLD.get("port"), () => {
    console.log(
        "  App is running at http://localhost:%d in %s mode",
        app__OLD.get("port"),
        app__OLD.get("env")
    );
    console.log("  Press CTRL-C to stop\n");
});

export default server__OLD;
