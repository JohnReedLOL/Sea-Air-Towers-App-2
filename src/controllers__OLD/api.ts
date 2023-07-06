"use strict";

import graph from "fbgraph";
import { Response, Request, NextFunction } from "express";
import { UserDocument__OLD } from "../models__OLD/User__OLD";


/**
 * List of API examples.
 * @route GET /api
 */
export const getApi = (req: Request, res: Response) => {
    res.render("api/index", {
        title: "API Examples"
    });
};

/* Getting rid of this because there is no Facebook sign in */

/**
 * Facebook API example.
 * @route GET /api/facebook
 */
/*
export const getFacebook = (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as UserDocument__OLD;
    const token = user.tokens.find((token: any) => token.kind === "facebook");
    graph.setAccessToken(token.accessToken);
    graph.get(`${user.facebook}?fields=id,name,email,first_name,last_name,gender,link,locale,timezone`, (err: Error, results: graph.FacebookUser) => {
        if (err) { return next(err); }
        res.render("api/facebook", {
            title: "Facebook API",
            profile: results
        });
    });
};
*/