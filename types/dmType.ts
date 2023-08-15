export type msg_ms = {
    userId : string, 
    content: string,
    timestamp: number
};
export type msg_sn = {
    userId : string, 
    seen: boolean,
    unseenMessages: number
};
export type msg = {
    _id ?: string,
    usersIds : string | string[]  | [],
    messages : [msg_ms] | [],
    seenState : [msg_sn] | [userId : any, seen: false, unseenMessages : 0, userId : any, seen: false, unseenMessages : 0]
    length : number,
    timestamps: number
};
