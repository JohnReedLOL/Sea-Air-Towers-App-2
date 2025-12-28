"use strict";

// I don't know if these all are necessary - I just copied them from user.ts
import async from "async";
import { Apartment, ApartmentDocument } from "../models/Apartment";
import { ApartmentBookings, ApartmentBookingsDocument } from "../models/ApartmentBookings";
import { Landlord, LandlordDocument } from "../models/Landlord";
import { Request, Response, NextFunction } from "express";
import { WriteError } from "mongodb";
import { check, sanitize, validationResult } from "express-validator";
import "../config/passport";
import { reduce } from "bluebird";

const addDaysToDate = (startDate: Date, days: number) => {
    const date = new Date(startDate.valueOf());
    date.setDate(date.getDate() + days);
    return date;
};

const getDates = (startDate: Date, stopDate: Date) => {
    const dateArray: Date[] = [];
    let currentDate = startDate;
    while (currentDate <= stopDate) {
        dateArray.push(new Date (currentDate));
        currentDate = addDaysToDate(currentDate, 1);
    }
    return dateArray;
};

// Make sure each date range looks like "MM/DD/YYYY - MM/DD/YYYY"
const validateDateRange = (dateRange: string) => {
    const splitDateRange = dateRange.split("-");

    // Make sure date range has exactly one "-"
    if(splitDateRange.length != 2) {
        return false;
    }

    const dateOneString = splitDateRange[0].trim();
    const dateTwoString = splitDateRange[1].trim();

    // Make sure each date looks like "MM/DD/YYYY"
    const validateDate = (dateString: string) => {
        const dateStringSplit: string[] = dateString.split("/");
        if(dateStringSplit.length != 3) {
            return false;
        } else {
            // Make sure these are all numbers. Sorry for the ugly casing
            if( isNaN(dateStringSplit[0] as unknown as number)
                || isNaN(dateStringSplit[1] as unknown as number)
                || isNaN(dateStringSplit[2] as unknown as number) ) {
                return false;
            }
            const month = parseInt(dateStringSplit[0], 10);
            const day = parseInt(dateStringSplit[1], 10);
            const year = parseInt(dateStringSplit[2], 10);
            if(! (month >= 1 && month <= 12) ) {
                return false;
            }
            if(! (day >= 1 && day <= 31) ) {
                return false;
            }
            if(! (year >= 1000) ) {
                return false;
            }
        }
        return true;
    };

    const dateOneValid: boolean = validateDate(dateOneString);
    const dateTwoValid: boolean = validateDate(dateTwoString);
    if(dateOneValid && dateTwoValid) {
        return true;
    } else {
        return false;
    }
};

// Make sure prices look like "$N" or "N" where N is a number.
const validatePrice = (price: string) => {
    const priceTrimmed = price.trim().replace(/,/g, ""); // Commas are stripped before validation and parsing.
    let priceNumber = priceTrimmed;
    // Remove the leading dollar sign.
    if(priceNumber.charAt(0) === "$") {
        priceNumber = priceNumber.substr(1);
    }
    // Make sure that the price is a number.
    if( isNaN(priceNumber as unknown as number) ) {
        return false;
    }
    return true;
};

const validateHttpOrHttps = (link: string) => {
    const lowercaseLink = link.trim().toLowerCase();
    if(lowercaseLink.startsWith("http") || lowercaseLink.startsWith("https") ) {
        return true;
    } else {
        return false;
    }
};

// Make sure the link contains a dot.
const validateLink = (link: string) => {
    const linkTrimmed = link.trim();
    if(! linkTrimmed.includes(".") ) {
        return false;
    }

    const urlSplit: string[] = linkTrimmed.split(".");
    // Make sure there is a character after the dot (ex .com, .net, etc)
    for(let i = 0; i < urlSplit.length; ++i) {
        const urlPortion = urlSplit[i];
        if(urlPortion.length < 1) {
            return false;
        }
    }

    return true;
};

/**
 * POST /search-for-apartments
 * This does the actual searching for apartments in the database
 */
export const postSearchForApartments = async (req: Request, res: Response, next: NextFunction) => {
    await check("numBedrooms", "Minimum number of bedrooms must be a number (without commas).").exists().isNumeric().run(req);
    await check("numBedroomsMax", "Maximum number of bedrooms must be a number (without commas).").exists().isNumeric().run(req);
    await check("numBathrooms", "Number of bathrooms must be a number (without commas).").exists().isNumeric().run(req);
    await check("dateRange", "Date range must be in format: MM/DD/YYYY - MM/DD/YYYY.").exists().custom( (dateRange: string) => {
        return validateDateRange(dateRange);
    }).run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash("errors", errors.array());
        return res.redirect("/search-for-apartments");
    }

    const numBedrooms = parseFloat(req.body.numBedrooms);
    const numBedroomsMax = parseFloat(req.body.numBedroomsMax);
    const numBathrooms = parseFloat(req.body.numBathrooms);
    const dateRange = req.body.dateRange;
    const splitDateRange = dateRange.split("-");
    const dateOneString = splitDateRange[0].trim();
    const dateTwoString = splitDateRange[1].trim();
    const firstDate = new Date(dateOneString);
    const secondDate = new Date(dateTwoString);

    if(firstDate.getTime() > secondDate.getTime()) {
        const errorBody = "Your first date (" + firstDate.toDateString() + ") is greater than your second date (" + secondDate.toDateString() + "). Hit the back button and try again.";
        return res.render("error", {
            errorBody: errorBody
        });
    }

    const bookedDates: Date[]  = getDates(firstDate, secondDate);
    const bookedDatesTimes = new Set();
    for(let i = 0; i < bookedDates.length; ++i) {
        const bookedDate: Date = bookedDates[i];
        bookedDatesTimes.add(bookedDate.getTime());
    }
    // We are no longer filtering by price in a given month
    // const monthPrice = req.body.monthPrice.split(" ");
    // const month = monthPrice[0].trim().toLowerCase();
    // let price = monthPrice[1].trim();
    // if(price.charAt(0) == "$") {
    //     price = price.substr(1);
    // }
    // const monthVariable = month + "Price";
    // Filter by numBathrooms, numBedrooms, and price for a given month now. Filter by dates booked later.
    Apartment.find({ numBathrooms: { $gte: numBathrooms }, numBedrooms: { $gte: numBedrooms }, numBedrooms: { $lte: numBedroomsMax }, 
        }, (err, myApartments) => {
        if (err) { return next(err); }
        // const apartmentNumbersSet = new Set(apartmentNumbers);
        // const myApartmentsSet = new Set(myApartmentNumbers);
        // Now we can filter by dates booked.
        const myApartmentNumbers = myApartments.map(a => a.apartmentNumber);
        ApartmentBookings.find({apartmentNumber: { $in: myApartmentNumbers }}, (err, bookings: any) => {
            if (err) { return next(err); }
            // Filter out all the apartments whose dates are booked from the apartmentNumbersSet.
            for(const booking of bookings) {
                const bookingDate: Date = booking.eveningBooked;
                if(bookedDatesTimes.has(bookingDate.getTime())) {
                    // apartmentNumbersSet.delete(booking.apartmentNumber);
                    myApartments = myApartments.filter(a => a.apartmentNumber != booking.apartmentNumber);
                }
            }
            // Sort the apartments in descending order
            const myNonBookedApartments: ApartmentDocument[] = myApartments.sort( (a, b) => {return b.apartmentNumber - a.apartmentNumber;} );
            return res.render("apartment/apartmentsThatMatchSearch", {
                title: "Apartments That Match Your Search",
                myApartments: myNonBookedApartments
            });
        });
    });
};

/**
 * GET /search-for-apartments
 * Page to let users search for apartments
 */
export const searchForApartments = (req: Request, res: Response) => {
    res.render("apartment/search", {
        title: "Search For Apartment"
    });
};

/**
 * POST /account/edit-listing/:apartmentNumber
 * Call to update listing for an apartment.
 */
// Updated to handle commas in prices (e.g., "$1,200" or "1,200")
export const postUpdateApartmentListing = async (req: Request, res: Response, next: NextFunction) => {
    const apartmentNumber = parseInt(req.params.apartmentNumber, 10);
    await check("numBedrooms", "Number of bedrooms must be a number (without commas).").exists().isNumeric().run(req);
    await check("numBathrooms", "Number of bathrooms must be a number (without commas).").exists().isNumeric().run(req);

    await check("photosFolder", "Photos link must be a valid link.").exists().custom( (url: string) => {
        return validateLink(url);
    }).run(req);
    await check("photosFolder", "Photos link must start with \"http\" or \"https\".").exists().custom( (url: string) => {
        return validateHttpOrHttps(url);
    }).run(req);

    await check("januaryPrice", "January's rent must be a number (e.g., 1200 or 1,200).").exists().custom( (price: string) => {
        return validatePrice(price);
    }).run(req);
    await check("februaryPrice", "February's rent must be a number (e.g., 1200 or 1,200).").exists().custom( (price: string) => {
        return validatePrice(price);
    }).run(req);
    await check("marchPrice", "March's rent must be a number (e.g., 1200 or 1,200).").exists().custom( (price: string) => {
        return validatePrice(price);
    }).run(req);
    await check("aprilPrice", "April's rent must be a number (e.g., 1200 or 1,200).").exists().custom( (price: string) => {
        return validatePrice(price);
    }).run(req);
    await check("mayPrice", "May's rent must be a number (e.g., 1200 or 1,200s).").exists().custom( (price: string) => {
        return validatePrice(price);
    }).run(req);
    await check("junePrice", "June's rent must be a number (e.g., 1200 or 1,200).").exists().custom( (price: string) => {
        return validatePrice(price);
    }).run(req);
    await check("julyPrice", "July's rent must be a number (e.g., 1200 or 1,200).").exists().custom( (price: string) => {
        return validatePrice(price);
    }).run(req);
    await check("augustPrice", "August's rent must be a number (e.g., 1200 or 1,200).").exists().custom( (price: string) => {
        return validatePrice(price);
    }).run(req);
    await check("septemberPrice", "September's rent must be a number (e.g., 1200 or 1,200s).").exists().custom( (price: string) => {
        return validatePrice(price);
    }).run(req);
    await check("octoberPrice", "October's rent must be a number (e.g., 1200 or 1,200).").exists().custom( (price: string) => {
        return validatePrice(price);
    }).run(req);
    await check("novemberPrice", "November's rent must be a number (e.g., 1200 or 1,200).").exists().custom( (price: string) => {
        return validatePrice(price);
    }).run(req);
    await check("decemberPrice", "December's rent must be a number (e.g., 1200 or 1,200).").exists().custom( (price: string) => {
        return validatePrice(price);
    }).run(req);
    if(req.body.forSalePrice == null || req.body.forSalePrice == undefined
       || req.body.forSalePrice == "") {
        req.body.forSalePrice = "0";
    }
    await check("forSalePrice", "For sale price must be a number (e.g., 1200 or 1,200).").exists().custom( (price: string) => {
        return validatePrice(price);
    }).run(req);

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        req.flash("errors", errors.array());
        return res.redirect("/account/edit-listing/" + apartmentNumber);
    }

    // The .replace(/[$,]/g, "") removes both dollar signs and commas before parsing to float.
    // This ensures consistent handling of input prices across all fields.

    const filter = { apartmentNumber: apartmentNumber };
    const user = req.user as LandlordDocument;
    const update = {
        landlordEmail: user.email.trim().toLowerCase(),
        numBedrooms: parseFloat(req.body.numBedrooms.trim()),
        numBathrooms: parseFloat(req.body.numBathrooms.trim()),
        photosFolder: req.body.photosFolder.trim(),
        januaryPrice: parseFloat(req.body.januaryPrice.trim().replace(/[$,]/g, "")), // ignore the dollar sign
        februaryPrice: parseFloat(req.body.februaryPrice.trim().replace(/[$,]/g, "")), 
        marchPrice: parseFloat(req.body.marchPrice.trim().replace(/[$,]/g, "")),      
        aprilPrice: parseFloat(req.body.aprilPrice.trim().replace(/[$,]/g, "")),
        mayPrice: parseFloat(req.body.mayPrice.trim().replace(/[$,]/g, "")),
        junePrice: parseFloat(req.body.junePrice.trim().replace(/[$,]/g, "")),
        julyPrice: parseFloat(req.body.julyPrice.trim().replace(/[$,]/g, "")),
        augustPrice: parseFloat(req.body.augustPrice.trim().replace(/[$,]/g, "")),
        septemberPrice: parseFloat(req.body.septemberPrice.trim().replace(/[$,]/g, "")),
        octoberPrice: parseFloat(req.body.octoberPrice.trim().replace(/[$,]/g, "")),
        novemberPrice: parseFloat(req.body.novemberPrice.trim().replace(/[$,]/g, "")),
        decemberPrice: parseFloat(req.body.decemberPrice.trim().replace(/[$,]/g, "")),
        additionalInformation: req.body.additionalInformation,
        forSalePrice: parseFloat(req.body.forSalePrice.trim().replace(/[$,]/g, ""))
    };

    // I'm starting to get an error here after moving this code to the new version so I'm commenting this out and re-writing it.
    /*
    Apartment.findOneAndUpdate(filter, update, (err, doc: any) => {
        if (err) { return next(err); }
        req.flash("success", { msg: "Success! Your listing has been updated." });
        res.redirect("/apartment/" + apartmentNumber);
    });
    */
   // Using findOneAndUpdate according to https://www.geeksforgeeks.org/mongoose-findoneandupdate-function/
   /*
   Apartment.findOneAndUpdate( filter, 
    update, null, (err, docs) => {
    if (err){
        console.log(err);
        return next(err);
    }
    else{
        console.log("Original Doc : ",docs);
        req.flash("success", { msg: "Success! Your listing has been updated." });
        res.redirect("/apartment/" + apartmentNumber);
    }
});
*/
    // Correcting deprecation warning according to https://stackoverflow.com/questions/52572852/deprecationwarning-collection-findandmodify-is-deprecated-use-findoneandupdate
    // await ModelName.findOneAndUpdate({matchQuery}, {$set: updateData}, {useFindAndModify: false});
    Apartment.findOneAndUpdate( filter, 
        update, {useFindAndModify: false}, (err, docs) => {
        if (err){
            console.log(err);
            return next(err);
        }
        else{
            console.log("Original Doc : ", docs);
            req.flash("success", { msg: "Success! Your listing has been updated." });
            res.redirect("/apartment/" + apartmentNumber);
        }
    });

};

/**
 * GET /account/edit-listing/:apartmentNumber
 * Page to update listing for an apartment.
 */
export const getUpdateApartmentListing = (req: Request, res: Response, next: NextFunction) => {
    const apartmentNumber = parseInt(req.params.apartmentNumber, 10);
    Apartment.findOne( {apartmentNumber: apartmentNumber}, (err: any, apartment: any) => {
        if (err) { return next(err); }
        res.render("apartment/update", {
            title: "Update Listing For Apartment #" + apartmentNumber,
            apartmentNumber: apartmentNumber,
            apartment: apartment
        });
    });  
};

/**
 * GET /account/update-availability/:apartmentNumber
 * Book dates for an apartment
 */
export const updateApartmentAvailability = (req: Request, res: Response, next: NextFunction) => {
    const apartmentNumber = parseInt(req.params.apartmentNumber, 10);
    res.render("apartment/availability", {
        title: "Book Dates For Apartment #" + apartmentNumber,
        apartmentNumber: apartmentNumber
    });
};

/**
 * POST /account/update-availability/:apartmentNumber
 * Book dates for an apartment
 */
export const postUpdateApartmentAvailability = async (req: Request, res: Response, next: NextFunction) => {

    await check("dateRange", "Date range must be in format: MM/DD/YYYY - MM/DD/YYYY.").exists()
    .custom( (dateRange: string) => {
        return validateDateRange(dateRange);
    }).run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash("errors", errors.array());
        return res.redirect("/account/update-availability/" + req.params.apartmentNumber);
    }

    const apartmentNumber = parseInt(req.params.apartmentNumber, 10);
    const dateRange = req.body.dateRange;

    const splitDateRange = dateRange.split("-");
    const dateOneString = splitDateRange[0].trim();
    const dateTwoString = splitDateRange[1].trim();
    const firstDate = new Date(dateOneString);
    const secondDate = new Date(dateTwoString);
    if(firstDate.getTime() > secondDate.getTime()) {
        const errorBody = "Your first date (" + firstDate.toDateString() + ") is greater than your second date (" + secondDate.toDateString() + "). Hit the back button and try again.";
        return res.render("error", {
            errorBody: errorBody
        });
    }

    const dates: Date[]  = getDates(firstDate, secondDate);
    const apartmentBookings = [];
    for(let i = 0; i < dates.length; ++i) {
        apartmentBookings.push({apartmentNumber : apartmentNumber, eveningBooked: dates[i]});
    } 
    ApartmentBookings.create(apartmentBookings, function (err: any, bookings: ApartmentBookingsDocument[]) {
        if (err) {
            if (err.code === 11000) { // If unique index already exists err = MongoError: E11000 duplicate
                req.flash("info", { msg: "You tried to book a day that was already booked. Your days were booked anyway." });
                return res.render("apartment/bookedDays", {
                    title: "The Following Evenings Have Been Booked:",
                    daysBooked: dates
                });
            } else {
                return next(err);
            }
        }
        const daysBooked: Date[] = bookings.map( (booking: ApartmentBookingsDocument) => booking.eveningBooked);
        return res.render("apartment/bookedDays", {
            title: "The Following Evenings Have Been Booked:",
            daysBooked: daysBooked
        });
    });
};

/**
 * POST /account/unupdate-availability/:apartmentNumber
 * Unbook dates for an apartment
 */
export const postUnUpdateApartmentAvailability = async (req: Request, res: Response, next: NextFunction) => {

    await check("dateRange2", "Date range must be in format: MM/DD/YYYY - MM/DD/YYYY.").exists()
    .custom( (dateRange: string) => {
        return validateDateRange(dateRange);
    }).run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash("errors", errors.array());
        return res.redirect("/account/update-availability/" + req.params.apartmentNumber);
    }

    const apartmentNumber = parseInt(req.params.apartmentNumber, 10);

    const dateRange = req.body.dateRange2;
    const splitDateRange = dateRange.split("-");
    const dateOneString = splitDateRange[0].trim();
    const dateTwoString = splitDateRange[1].trim();
    const firstDate = new Date(dateOneString);
    const secondDate = new Date(dateTwoString);
    if(firstDate.getTime() > secondDate.getTime()) {
        const errorBody = "Your first date (" + firstDate.toDateString() + ") is greater than your second date (" + secondDate.toDateString() + "). Hit the back button and try again.";
        return res.render("error", {
            errorBody: errorBody
        });
    }

    const dates: Date[]  = getDates(firstDate, secondDate);
    // Commenting this out and replacing it to make it so I'm doing all my deleteMany's the same way.
    /*
    ApartmentBookings.deleteMany({ apartmentNumber : apartmentNumber, eveningBooked: { $in: dates} }, null, (err: any) => {
        if (err) { return next(err); }
        return res.render("apartment/unbookedDays", {
            title: "The Following Evenings Have Been Unbooked:",
            bookings: dates
        });
    });
    */
    ApartmentBookings.deleteMany({ apartmentNumber : apartmentNumber, eveningBooked: { $in: dates} }).then( () => {
        return res.render("apartment/unbookedDays", {
            title: "The Following Evenings Have Been Unbooked:",
            bookings: dates
        });
    }).catch( (error) => {
        if (error) { return next(error); }
    });
};

/**
 * GET /account/update-listing
 * See your listings to chose one to update.
 */
export const chooseListingToUpdate = (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as LandlordDocument;
    const landlordEMail = user.email.toLowerCase();
    // select only the Apartment's apartmentNumber.
    Apartment.find({ landlordEmail: landlordEMail}, "apartmentNumber", null, (err, apartments: any) => {
        if (err) { return next(err); }
        res.render("apartment/pickApartmentToEdit", {
            title: "Pick An Apartment Number To Edit",
            apartments: apartments
        });
    });
};

/**
 * GET /account/update-listing/:apartmentNumber
 * Chose between updating the info for an apartment or updating its availability.
 */
export const updateListing = (req: Request, res: Response) => {
    const apartmentNumber = parseInt(req.params.apartmentNumber, 10);
    res.render("apartment/editListingOrAvailability", {
        title: "Update Listing Or Availability Of Apartment #" + apartmentNumber,
        apartmentNumber: apartmentNumber
    });
};

/**
 * GET /apartment/:apartmentNumber
 * Listing page for an apartment.
 */
export const getApartment = (req: Request, res: Response, next: NextFunction) => {
    const apartmentNumber = parseInt(req.params.apartmentNumber, 10);

    Apartment.findOne( {apartmentNumber: apartmentNumber}, (err: any, apartment: any) => {
        if (err) { return next(err); }
        res.render("apartment/getByNumber", {
            title: "Apartment Number " + apartmentNumber,
            apt: apartment
        });
    });
};

/**
 * GET /rent-apartment-by-landlord
 * Form to fill in the landlord. If landlord is filled, list the apartments.
 * Note: This is no longer used - just do /search-for-apartments
 */
/*export const getRentApartmentByLandlord = (req: Request, res: Response, next: NextFunction) => {
    let landlord = req.query.landlord; // email address of landlord
    if(landlord == undefined) {
        res.render("apartment/getByLandlord", {
            title: "Get Apartments By Landlord"
        });
    } else {
        landlord = landlord.toLowerCase();
        // select only the Apartment's apartmentNumber.
        Apartment.find({ landlordEmail: landlord}, "apartmentNumber", (err, apartments: any) => {
            if (err) { return next(err); }
            res.render("apartment/apartmentsWithLandlord", {
                title: "Get Apartments By Landlord",
                landlordsEmail: landlord,
                apartments: apartments

            });
        });
    }
};*/

/**
 * GET /account/list-apartment
 * Page for a landlord to list an apartment.
 */
export const getCreateApartment = (req: Request, res: Response) => {
    res.render("apartment/create", {
        title: "List Apartment",
        apartment: {
            apartmentNumber: 0,
            numBedrooms: 0,
            numBathrooms: 0,
            photosFolder: "https://tinyurl.com/ra9kxgs",
            additionalInformation: "",
            januaryPrice: 0, // These don't need to be sent in - the form can just be filled with empty string.
            februaryPrice: 0,
            marchPrice: 0,
            aprilPrice: 0,
            mayPrice: 0,
            junePrice: 0,
            julyPrice: 0,
            augustPrice: 0,
            septemberPrice: 0,
            octoberPrice: 0,
            novemberPrice: 0,
            decemberPrice: 0,
            forSalePrice: 0
        }
    });
};

/**
 * POST /account/list-apartment
 * Create landlord's apartment.
 */
export const postCreateApartment = async (req: Request, res: Response, next: NextFunction) => {
    await check("apartmentNumber", "Apartment number must be a number (without commas).").exists().isNumeric().run(req);
    await check("numBedrooms", "Number of bedrooms must be a number (without commas).").exists().isNumeric().run(req);
    await check("numBathrooms", "Number of bathrooms must be a number (without commas).").exists().isNumeric().run(req);

    await check("photosFolder", "Photos link must be a valid link.").exists().custom( (url: string) => {
        return validateLink(url);
    }).run(req);
    await check("photosFolder", "Photos link must start with \"http\" or \"https\".").exists().custom( (url: string) => {
        return validateHttpOrHttps(url);
    }).run(req);

    await check("januaryPrice", "January's rent must be a number (e.g., 1200, 1,200, or $1200).").exists().custom( (price: string) => {
        return validatePrice(price);
    }).run(req);
    await check("februaryPrice", "February's rent must be a number (e.g., 1200, 1,200, or $1200).").exists().custom( (price: string) => {
        return validatePrice(price);
    }).run(req);
    await check("marchPrice", "March's rent must be a number (e.g., 1200, 1,200, or $1200).").exists().custom( (price: string) => {
        return validatePrice(price);
    }).run(req);
    await check("aprilPrice", "April's rent must be a number (e.g., 1200, 1,200, or $1200).").exists().custom( (price: string) => {
        return validatePrice(price);
    }).run(req);
    await check("mayPrice", "May's rent must be a number (e.g., 1200, 1,200, or $1200).").exists().custom( (price: string) => {
        return validatePrice(price);
    }).run(req);
    await check("junePrice", "June's rent must be a number (e.g., 1200, 1,200, or $1200).").exists().custom( (price: string) => {
        return validatePrice(price);
    }).run(req);
    await check("julyPrice", "July's rent must be a number (e.g., 1200, 1,200, or $1200).").exists().custom( (price: string) => {
        return validatePrice(price);
    }).run(req);
    await check("augustPrice", "August's rent must be a number (e.g., 1200, 1,200, or $1200).").exists().custom( (price: string) => {
        return validatePrice(price);
    }).run(req);
    await check("septemberPrice", "September's rent must be a number (e.g., 1200, 1,200, or $1200).").exists().custom( (price: string) => {
        return validatePrice(price);
    }).run(req);
    await check("octoberPrice", "October's rent must be a number (e.g., 1200, 1,200, or $1200).").exists().custom( (price: string) => {
        return validatePrice(price);
    }).run(req);
    await check("novemberPrice", "November's rent must be a number (e.g., 1200, 1,200, or $1200).").exists().custom( (price: string) => {
        return validatePrice(price);
    }).run(req);
    await check("decemberPrice", "December's rent must be a number (e.g., 1200, 1,200, or $1200).").exists().custom( (price: string) => {
        return validatePrice(price);
    }).run(req);
    await check("forSalePrice", "For sale price must be a number (e.g., 1200, 1,200, or $1200).").exists().custom( (price: string) => {
        return validatePrice(price);
    }).run(req);

    const errors = validationResult(req); // user local variable has .apartments: CoreMongoseArray(0)

    if (!errors.isEmpty()) { // apartment-number, april-price, etc stored in req.body
        req.flash("errors", errors.array());
        return res.redirect("/account/list-apartment");
    } // body.additional-information: "AdditionInfoRow1 111\r\nAdditionInfoRow2 222"

    // The .replace(/[$,]/g, "") removes both dollar signs and commas before parsing to float.
    const user = req.user as LandlordDocument;

    const apartment = new Apartment({
        apartmentNumber: parseInt(req.body.apartmentNumber, 10),
        landlordEmail: user.email.trim().toLowerCase(),
        numBedrooms: parseFloat(req.body.numBedrooms.trim()),
        numBathrooms: parseFloat(req.body.numBathrooms.trim()),
        photosFolder: req.body.photosFolder.trim(), // Link to photos of your apartment on Google Drive
        januaryPrice: parseFloat(req.body.januaryPrice.trim().replace(/[$,]/g, "")), // These don't need to be sent in - the form can just be filled with empty string.
        februaryPrice: parseFloat(req.body.februaryPrice.trim().replace(/[$,]/g, "")),
        marchPrice: parseFloat(req.body.marchPrice.trim().replace(/[$,]/g, "")),
        aprilPrice: parseFloat(req.body.aprilPrice.trim().replace(/[$,]/g, "")),
        mayPrice: parseFloat(req.body.mayPrice.trim().replace(/[$,]/g, "")),
        junePrice: parseFloat(req.body.junePrice.trim().replace(/[$,]/g, "")),
        julyPrice: parseFloat(req.body.julyPrice.trim().replace(/[$,]/g, "")),
        augustPrice: parseFloat(req.body.augustPrice.trim().replace(/[$,]/g, "")),
        septemberPrice: parseFloat(req.body.septemberPrice.trim().replace(/[$,]/g, "")),
        octoberPrice: parseFloat(req.body.octoberPrice.trim().replace(/[$,]/g, "")),
        novemberPrice: parseFloat(req.body.novemberPrice.trim().replace(/[$,]/g, "")),
        decemberPrice: parseFloat(req.body.decemberPrice.trim().replace(/[$,]/g, "")),
        additionalInformation: req.body.additionalInformation,
        forSalePrice: parseFloat(req.body.forSalePrice.trim().replace(/[$,]/g, "")),
    });

    apartment.save((err: Error) => {
        if (err) {
            if (err.name.includes("11000") || err.message.includes("11000") || err.message.includes("duplicate") ) { // If apartment number already exists err = MongoError: E11000 duplicate key error collection: test.apartments index: apartmentNumber_1 dup key: { : 8 }
                req.flash("errors", { msg: "The apartment number you entered already exists. Try a different one or ask for that listing to be deleted." });
                return res.redirect("/account/list-apartment");
            }
            return next(err);
        }
        // In addition to saving the apartment to the database, you must also update the Landlord with the link to their apartment.
        const newlyListedAppartment = {apartmentNumber: apartment.apartmentNumber};
        // Note that I do not know if I have to look up user in the database and use that or if it's okay to just use req.user
        user.apartments.push(newlyListedAppartment);
        
        /*
        user.save((err: Error) => {
            req.flash("info", { msg: "Facebook account has been linked." });
            done(err, user);
        });
        */
        
        user.save((err: Error) => {
            if (err) { return next(err); }
        });
        // Done updating Landlord
        req.flash("success", { msg: "Apartment " + apartment.apartmentNumber + " has been listed. Try pulling up this apartment or updating its availability." });
        res.redirect("/");
    });
};

/**
 * GET /login
 * Login page.
 */ /*
export const getCreateApartment = (req: Request, res: Response) => {
    if (req.user) {
        return res.redirect("/");
    }
    res.render("account/login", {
        title: "Login"
    });
};*/

/**
 * POST /login
 * Sign in using email and password.
 */ /*
export const postCreateApartment = async (req: Request, res: Response, next: NextFunction) => {
    await check("email", "Email is not valid").isEmail().run(req);
    await check("password", "Password cannot be blank").isLength({min: 1}).run(req);
    // eslint-disable-next-line @typescript-eslint/camelcase
    await sanitize("email").normalizeEmail({ gmail_remove_dots: false }).run(req);

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
            req.flash("success", { msg: "Success! You are logged in." });
            res.redirect(req.session.returnTo || "/");
        });
    })(req, res, next);
}; */
