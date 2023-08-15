import { Request, Response, NextFunction} from "express";
const RateLimiterLib = require('rate-limiter-flexible');

const MAX_REQUEST_LIMIT : number = 500; // 
const MAX_REQUEST_WINDOW = 30 * 60; // 
const TOO_MANY_REQUESTS_MESSAGE = 'Too many requests';

var IRateLimiterOptions : any;
const options  : {duration : number, points : number}  =  IRateLimiterOptions = {
  duration: MAX_REQUEST_WINDOW,
  points: MAX_REQUEST_LIMIT,
};

const rateLimit = new RateLimiterLib.RateLimiterMemory(options);

module.exports.rateLimiterMiddleware =  (req : Request, res : Response, next : NextFunction) => {
  rateLimit
    .consume(req.ip)
    .then(() => {
      next();
    })
    .catch((err :any) => {
      console.log('Rate Limited (500 try for 10min.)' + req.ip);
      res.status(429).json({ message: TOO_MANY_REQUESTS_MESSAGE });
    });
};
