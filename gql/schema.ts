var { buildSchema, GraphQLScalarType } = require('graphql');

const dateScalar = new GraphQLScalarType({
  name: 'Date',
  description: 'Date custom scalar type',
  serialize(value) {
    return value.getTime(); // Convert outgoing Date to integer for JSON
  },
  parseValue(value) {
    return new Date(value); // Convert incoming integer to Date
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.INT) {
      // Convert hard-coded AST string to integer and then to Date
      return new Date(parseInt(ast.value, 10));
    }
    // Invalid hard-coded value (not an integer)
    return null;
  },
});

// Construct a schema, using GraphQL schema language
var schema = buildSchema(`
  scalar Date


  type Query {
    allPosts: [Post]
    getEachOtherFollowings : [User]

    forumPosts: [MainForumPost]
    specificTrendPost(trend : ID): [MainForumPost]

    followingsPosts(id : ID): [MainForumPost]

    getUser(id: ID): User
    whoFollowsYou(id : ID): [User]

    getPostComments(id : ID): [ForumComment]
    specificPostComments(id : ID): [SpecificPostComments]

    userForumPosts(id : ID): [ForumPost]
    userAlternativePosts(id : ID): [ForumPost]

    forumTrends: [Trend]
    personalTrends(id : ID): [Trend]

    userFollows(id : ID): UserFollows

    explore(id : ID): ExploreType

    getUserBookmarks(id : ID): [ForumPost]

    getLiveChatUsers: [User]
  }
  
  type ExploreType {
      trends : [Trend]
      profiles : [User]
      pinnedPost : ForumPost
      mediaPosts : [ForumPost]
  }
  type User {
    id: ID
    retweets: [ID]
    followings : Int
    followings_Ids : [String]
    followers : Int
    followers_Ids: [String]
    pseudo: String
    imageUrl: String
    profileBanner: String
    nom :String
    verified: Boolean
    prenom: String 
    postsCount: Int
    createdAt: Date
    biography: String
    channelsCount: Int
    blockedUsers: [String]
    pinnedConversations:[String]
    notifMutedUsers:[String]
    bookmarks: [String]
    nitro: Int
    nitroBadge: Boolean
    mediumBadge: Boolean
    fadeValues : [String]
    profileFade: Boolean
    profileLink: String
  }

  type Post {
    _id: ID
    description: String
    retweets: Int
    userRetweets: [String]
    likes: Int
    usersLiked: [String]
    imageUrl : String
    comments: [Comment]
    community: String
    hashtags: [String]
    mentions: [User]
    createdAt: Date
  }

  type Comment{
      _id : ID
      postId: String,
      commenterId: String,
      text: String,
      timestamp: Date
      replyTo: String,
      likes: [String]
  }


  type ForumPost {
    post : Post
    user : User
  }

  type MainForumPost {
    post : Post
    user : User
    t_C : User
  }

  type SpecificPostComments {
    comments : [ForumComment]
  }
  
  type ForumComment {
    comment : Comment
    user :  User
  }

  type Trend {
    trendName: String,
    trendCount : Int
  }

  type UserFollows {
    followers: [User]
    followings : [User]
  }
`);

module.exports = schema;




//query getEachOtherFollowings($courseID: Int!) {
//  user(id: $courseID) {
//        title
//        author
//        description
//        followings
//        imageUrl
//    }
//}
