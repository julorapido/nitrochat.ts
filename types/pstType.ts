export type pst = {
    _id ?: string,
    id ?: string,
    userId : string,
    description : string,
    imageUrl : string | "",
    likes: number, retweets: number, reports : number,
    usersLiked : string[] | [], userRetweets : string[] | [],
    comments : Array<{
        _id : string
        postId: string,
        commenterId: string,
        text: string,
        likes: [string] | [],
        replyTo ?: string,
        timestamp: number
    }>,
    community : string | "Main_Community",
    hashtags : string[] | [],
    mentions : Array<{ _id: string,
        pseudo: string,
    }>,
    bookmarksCount : number | 0
    timestamps : number
};
