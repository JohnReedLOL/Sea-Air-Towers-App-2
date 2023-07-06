import mongoose from "mongoose";

export type ApartmentBookingsDocument = mongoose.Document & {
    apartmentNumber: number;

    // Only store if apartment is booked for a specific date. Otherwise, not booked.
    eveningBooked: Date;
};

const apartmentBookingsSchema = new mongoose.Schema({
    apartmentNumber: Number,
    eveningBooked: Date
}, { timestamps: true });

apartmentBookingsSchema.index({ apartmentNumber: 1, eveningBooked: 1}, { unique: true });

export const ApartmentBookings = mongoose.model<ApartmentBookingsDocument>("ApartmentBookings", apartmentBookingsSchema);
