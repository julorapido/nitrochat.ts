var process :NodeJS.Process;
import {ntf} from './ntfType';

type nitroUnlock = {
    longerMessages: boolean,postVideos: boolean,mediumBadge: boolean,gradientProfile: boolean,channelsThemes: boolean,animatedPfp: boolean,animatedBanner: boolean,animatedChannels: boolean,nitroBadge: boolean,
}

export type usr = {
    id : string, _id : string,
    email: string,
    password: string,
    imageUrl : string | process.env.DEFAULT_USR_PFP,
    profileBanner : string | process.env.DEFAULT_USR_BNR,
    nom : string, prenom : string,
    pseudo :string,
    retweets: string[] | [],
    biography : string | "Nitrochat user biography </>",
    followings : number, followers : number,
    verified: boolean, authentified : boolean,
    followers_Ids : string[] | [], followings_Ids : string[] | [],
    channelsCount : number | 0 , postsCount : number | 0,
    city : string | null, country : string | null, profileLink : string,
    reports : string[],
    bookmarks : string[],
    pinnedConversations : string[], blockedUsers : string[], notifMutedUsers : string[],
    nitroUnlocks : nitroUnlock,
    nitro : number, interactions : number,
    channelsCreated : string[],
    mediumBadge: boolean, nitroBadge : boolean, profileFade : boolean,
    fadeValues : string[] | ["", ""],
    notifications : ntf[] | [],
    timestamp : number,
};
