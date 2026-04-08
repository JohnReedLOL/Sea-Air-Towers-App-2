/// <reference types="express" />

declare namespace Express {
    export interface Request {
        flash(type: string, message: any): any;
        flash(type: string): any[];
        flash(): Record<string, any[]>;
    }
}
