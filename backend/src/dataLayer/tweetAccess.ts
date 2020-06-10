import * as AWSXRay from 'aws-xray-sdk'
import { createLogger } from '../utils/logger'
import * as AWS from 'aws-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { TweetItem } from '../models/TweetItem'
import { UpdateTweet } from '../models/UpdateTweet'
import { CommentUpdate } from '../models/CommentUpdate'

const logger = createLogger('createTodo')

const XAWS = AWSXRay.captureAWS(AWS)

export class TweetAccess {

    constructor(
        private readonly docClient: DocumentClient = new XAWS.DynamoDB.DocumentClient(),
        private readonly  s3 = new XAWS.S3({ signatureVersion: 'v4'}),
        private readonly tweetTable = process.env.TWEET_TABLE,
        private readonly tweetTableIndex = process.env.TWEET_ID_INDEX,
        private readonly bucketName = process.env.IMAGES_S3_BUCKET,
        private readonly urlExpiration = process.env.SIGNED_URL_EXPIRATION

        ) {}


    async getUserTweets(userId: String): Promise<TweetItem[]> {
        const result =  await this.docClient.query({
            TableName: this.tweetTable,
            IndexName: this.tweetTableIndex,
            KeyConditionExpression: ' userId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId
            }
            }).promise()
        logger.info(`tweet results: ${result.Items}`)
    
        return result.Items as TweetItem[]
}      



async createUserTweet(newTweet: TweetItem): Promise<TweetItem> {
    console.log('Storing new item: ', newTweet )
    await this.docClient.put({
     TableName: this.tweetTable,
     Item: newTweet
   }).promise()
   logger.info('Attempting to create Tweet')
   return newTweet
}





async updateTweetLike(userId:string, tweetId: string, addLike: UpdateTweet) {

    var params = {
        TableName: this.tweetTable,
        Key:{
          "userId": userId,
          "tweetId": tweetId
        },
        UpdateExpression: "set like=:like",
        ExpressionAttributeValues:{
            ":like":addLike.like
        },
        ReturnValues:"UPDATED_NEW"
    };
    
      logger.info("Attempting a conditional update...")
      const updateItem = this.docClient.update(params).promise()
    
      return updateItem

}



async addTweetComments (userId:string, tweetId: string, comment: CommentUpdate) {

    var params = {
        TableName: this.tweetTable,
        Key:{
          "userId": userId,
          "tweetId": tweetId
        },
        UpdateExpression: "add comment =:comment",
        ExpressionAttributeValues:{
            ":comment": comment
        },
        ReturnValues:"UPDATED_NEW"
    };
    
      logger.info("Attempting a conditional update...")
      const updateItem = this.docClient.update(params).promise()
    
      return updateItem

}

async deleteUserTweet(userId:string, todoId: string) {
    var params = {
        TableName: this.tweetTable,
        Key:{
          "userId": userId,
          "todoId": todoId
        }
    };
    
      logger.info("Attempting a conditional delete...");
    
      const deleteItem = this.docClient.delete(params).promise()
    
      return deleteItem
}






async generateUserUploadUrl(userId:string, todoId: string, attachmentId: string) {

    const url= this.s3.getSignedUrl('putObject',{
            Bucket: this.bucketName,
            Key: attachmentId,
            Expires: this.urlExpiration
          })

    logger.info(`signed url:,${url}`);

    const imageUrl = `https://${this.bucketName}.s3.amazonaws.com/${attachmentId}`

    logger.info(`Attempting to Updating attachmentUrl: ${imageUrl} with attachmentID:${attachmentId} on todoId:${todoId} and userId::${userId} `)

    return url


    }




}
