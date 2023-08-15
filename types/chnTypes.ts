export type chn = {
    _id ?: string,
    channelName : string,
    usersIds : string[] | [] | number | Array<{
        userId : string, 
        roles: string,
        timestamp: number
    }>,
    channelRoles : Array<{name: string | "member",
        _id?: string,
        canViewRooms: boolean,
        canVocal : boolean, 
        canEditRoles: boolean,
        canEdit: boolean,
        canEditPictures: boolean,
        canFacecam : boolean, 
        canTextualChat: boolean,
        canKick: boolean,
        canPin: boolean,
        canBan: boolean,
        canInvite: boolean,
        color: string | "#84a5bf",
        timestamp: number
    }>,
    channelPicture : string,
    channelBanner : string, 
    channelDescription : string,
    messages: Array<{
        userId :  string, 
        content: string,
        timestamp: number
    }>,
    length : number | 0,
    fade : boolean, private :boolean, generalChannel: boolean,
    fadeValues : string[] | ["", ""],
    bannedUsers : string[], pinnedMessages : string [],
    timestamps : number
};
