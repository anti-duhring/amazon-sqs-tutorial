import { DeleteMessageCommand, ReceiveMessageCommand, SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import * as dotenv from 'dotenv';

dotenv.config()

export class SqsService {
    #client
    #queueUrl

    constructor(queue) {
        this.#client = new SQSClient({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_ACESS_KEY
            }
        })

        this.#queueUrl = queue
    }

    async sendMessage(message) {
        try {

            const sendMessageCommand = new SendMessageCommand({
                QueueUrl: this.#queueUrl,
                MessageBody: message.body,
                MessageAttributes: message.attributes,
                DelaySeconds: 0
            })

            const response = await this.#client.send(sendMessageCommand)
    
    
            return response
        } catch(err) {
            throw err
        }
    }

    async receiveMessages() {
        try {
            const receiveMessageCommand = new ReceiveMessageCommand({
                QueueUrl: this.#queueUrl,
                MaxNumberOfMessages: 10,
                WaitTimeSeconds: 20,
                MessageAttributeNames: ['All']
            })
            const response = await this.#client.send(receiveMessageCommand)
            const messages = response?.Messages?.length? response.Messages : []

            return messages
        } catch(err) { 
            throw err
        }
    }

    async deleteMessage(receiptHandle) {
        try {
            const deleteMessageCommand = new DeleteMessageCommand({
                QueueUrl: this.#queueUrl,
                ReceiptHandle: receiptHandle
            })
        
            await this.#client.send(deleteMessageCommand)
        } catch(err) {
            throw err
        }
    }

}