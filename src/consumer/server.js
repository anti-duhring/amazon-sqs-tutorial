import express from 'express'
import { config } from '../config.js'
import cron from 'node-cron'
import * as dotenv from 'dotenv';
import { SqsService } from '../service/sqs.service.js';

dotenv.config()

const app = express()
export const port = config.consumerPort

app.use(express.json())

cron.schedule('* * * * *', async() => {
    const sqsService = new SqsService(process.env.AWS_MAIN_QUEUE_URL)
    const messages = await sqsService.receiveMessages()
    
    for(let i = 0; i < messages.length; i++) {
        await new Promise(resolve =>
            setTimeout(() => {
                console.log(`Simulando processamento da mensagem ${messages[i].MessageId}...`)
                resolve()
            }, 5000)
        )

        await sqsService.deleteMessage(messages[i].ReceiptHandle)
        console.log(`Mensagem ${messages[i].MessageId} processada e removida da fila...`)
    } 
})

app.listen(port, () => {
    console.log(`Consumer app listening at http://localhost:${port}`)
})