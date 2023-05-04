# Usando mensageria com Amazon SQS

## O que é um serviço de mensageria
O serviço de mensageria é uma forma de trocar informações entre diferentes partes de uma aplicação ou sistema de forma organizada e eficiente. Ele ajuda a separar as partes da aplicação e facilita a sua manutenção e desenvolvimento.

Imaginando uma aplicação de e-commerce em que o serviço de compra de produtos fica separado do serviço que processa o pagamento e efetivamente realiza a transação entre as contas bancárias, a forma mais segura e efetiva de realizar a comunicação entre eles é via mensageria.

Com mensageria, o serviço de compra de produtos vai enviar uma mensagem para uma fila com as informações de transação, enquanto o serviço de pagamento vai buscar as mensagens nesta fila e realizar as transações. Dessa forma é possível garantir que, mesmo que o serviço de compra de produtos caia, ou esteja passando por uma demanda gigantesca que possa comprometer o processamento de novas requisições, os pagamentos ainda assim serão processados de forma correta. Isso também garante que, mesmo havendo milhares de pagamentos na fila para serem processados, o usuário não precisará aguardar a transação ser realizada, já que uma vez enviado o pagamento para fila, é garantido que ele será consumido pelo serviço de processamento do pagamento, independemente do tempo que demore.

## Objetivo neste tutorial
Neste tutorial iremos criar um exemplo básico de um serviço de e-commerce (**producer**) que se comunica com um serviço de pagamento (**consumer**), e toda a comunicação será feita via mensageria.

## Setup
Como o objetivo é entender o funcionamento de um serviço de mensageria utilizando Amazon SQS, não iremos nos aprofundar tanto na criação dos serviços de e-commerce e pagamento. Em vez disso, vamos nos concentrar na comunicação entre os dois usando como base um projeto hospedado no repositório: https://github.com/anti-duhring/amazon-sqs-tutorial

Abra o terminal e digite:
```bash
git clone https://github.com/anti-duhring/amazon-sqs-tutorial.git
```

Após isso, instale as dependências da aplicação com o comando:
```bash
npm install
```

## Executando a aplicação
Iremos executar ambos os serviços: `producer` e `consumer`. 

Vá até o root da pasta local do repositório que você acabou de clonar e abra dois terminais.

Em um deles, digite o comando:
```bash
npm run start:producer
```

No outro, digite o comando:
```bash
npm run start:consumer
```

## Entendendo o funcionamento
A aplicação consiste em dois serviços: `producer` e `consumer`.
- `Producer`: Uma simulação de um **e-commerce**, que possui uma rota `/request-transfer`, cujo objetivo é enviar ao serviço de pagamento (**consumer**) uma requisição com o número da conta que fará o pagamento, o número da conta que receberá o pagamento e a quantia de dinheiro a ser transferido.
- `Consumer`: Um exemplo de um **serviço de pagamento** que recebe as informações por meio da rota `/process-transfer` e realiza a transação.

Por ora a comunicação entre os dois serviços está sendo feita de forma direta, ou seja, dentro da própria rota `/request-transfer` o **producer** recebe as informações do pagamento e já dispara uma requisição para a rota `/process-transfer` do **consumer**, que realiza a transação.

Agora, vamos adaptar o projeto para que o **producer** não precise mais se comunicar diretamente com o **consumer**. Em vez disso, o **producer** será responsável apenas por enviar os pedidos de transação para uma fila, e o **consumer** será responsável apenas por buscar esses pedidos constantemente e processá-los.

## Criando nossa fila principal
Vá até o serviço `Amazon SQS` no seu console da [**AWS**](https://aws.amazon.com/pt/free/).

![Pesquisando por SQS na barra de pesquisa do console da AWS](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/pi236kqow0g3h5yyo0bh.png)

Após acessar a página do `Amazon SQS`, clique no botão **"Create queue"** (criar fila).

![Clicando no botão "Create queue" na página do Amazon SQS da AWS](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/ydngdanl0u1ut9j1ci39.png)

Dentro da página de criação da fila você verá uma série de opções para configuração. Entre elas, destaco aqui o `type` (tipo) da fila:


![Escolhendo o tipo da fila dentro da página de criação da fila](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/r6c15naaoi4s83w74gfa.png)


 O tipo da fila, pode ser **standard**(comum) ou **FIFO** (First In First Out). Filas comuns não possuem ordem nas mensagens, enquanto as **FIFO** ordena a fila em forma de pilha, onde a primeira mensagem que foi criada será a primeira a ser encontrada ao buscar mensagens dessa fila.

Para os propósitos deste tutorial, vamos usar as seguintes configurações que já são atribuídas por padrão pelo próprio **SQS**:

![Configurações da fila do Amazon SQS](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/52ccfejm5nfaquzg58o1.png)

Clique no link `Info` ao lado da configuração para entender melhor o que cada propriedade representa.

Após ter criado a fila copie o URL gerado no final.

## Criando o _service_ de comunicação com o Amazon SQS
Para facilitar a comunicação da nossa aplicação com o `Amazon SQS`, vamos criar um **service** que terá três funções principais: enviar uma mensagem para a fila, recuperar mensagens da fila e deletar mensagens da fila.

Esse **service** será útil para desacoplar o _SQS_ da nossa aplicação, permitindo que ele seja facilmente adaptado para funcionar com outros serviços de fila também.

### Criando a classe _SqsService_
Vamos começar com uma classe com apenas dois atributos, ambos privados, `client` e `queueUrl`.

```javascript
export class SqsService {
    #client
    #queueUrl

    constructor() {
    }

}
```

A ideia é que `client` seja uma instância do [`SQSClient`](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sqs/classes/sqsclient.html) do pacote [`@aws-sdk/client-sqs`](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sqs/index.html), que serve pra estabelecer uma conexão com a nossa fila. Enquanto que `queueUrl` será o URL da fila copiado anteriormente, que deverá ser passado via _constructor_, assim vamos poder usar o _service_ para outras filas, se for preciso.

### Adicionando o client do SQS no _constructor_
Agora precisamos adicionar o `SQSClient` no _constructor_, e atribuí-lo como valor da propriedade `client`.

```javascript
import { SQSClient } from "@aws-sdk/client-sqs";
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

}
```

Perceba que, para estabelecer uma conexão, o `client` requere algumas informações, que são parte da interface [`SQSClientConfig`](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sqs/interfaces/sqsclientconfig.html): `region`, `accessKeyId` e `secretAccessKey`. Essas informações são referentes a sua conta da **AWS** e não devem ser compartilhadas, por isso iremos usar um arquivo **.env** pra criar variáveis de ambiente. 

Basta criar um arquivo `.env` no root do projeto com as seguintes variáveis:
```bash
AWS_REGION=REGIÃO (ex: us-east-1)
AWS_ACCESS_KEY_ID=ID DO USUÁRIO
AWS_ACESS_KEY=CHAVE DE ACESSO
AWS_MAIN_QUEUE_URL=URL DA SUA FILA
```

### Adicionando método para enviar mensagens para fila
Agora precisamos criar um método que irá enviar uma mensagem para a nossa fila usando o `client`.

O método terá como parâmetro um objeto com duas propriedades: `body` e `attributes`. O ``body`` será o texto que ficará no corpo da mensagem, enquanto ``attributes`` é um valor opcional que fornece mais informações sobre a mensagem.

Aqui está um exemplo do objeto, mas você pode entender melhor suas propriedades na [documentação oficial](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sqs/classes/sendmessagecommand.html) da AWS:
```javascript
{
    body: 'MENSAGEM QUE IRÁ NO CORPO',
    attributes: {
        'VALOR_OPCIONAL1': {
            DataType: 'String',
            StringValue: 'VALOR DO ATRIBUTO'
        }
    }
}
```

Nosso método de enviar mensagem será assim:
```javascript
import { SQSClient } from "@aws-sdk/client-sqs";
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

    async sendMessage({ body, attributes }) {
        try {

            const sendMessageCommand = new SendMessageCommand({
                QueueUrl: this.#queueUrl,
                MessageBody: body,
                MessageAttributes: attributes,
                DelaySeconds: 0
            })

            const response = await this.#client.send(sendMessageCommand)
    
    
            return response
        } catch(err) {
            throw err
        }
    }

}
```

Agora podemos enviar mensagens para a fila com o nosso _service_!

### Adicionando método para buscar mensagens na fila
Além de enviar mensagens, precisamos também de um método para buscar mensagens na fila e retornar uma _array_ delas:

```javascript
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
```

Entendendo as propriedades:
- `QueueUrl`: A URL da nossa fila.
- `MaxNumberOfMessages`: O número máximo de mensagens a serem retornadas. O Amazon SQS nunca retorna mais mensagens do que esse valor (no entanto, menos mensagens podem ser retornadas).
- `WaitTimeSeconds`: A duração (em segundos) pela qual a chamada aguarda a chegada de uma mensagem na fila antes de retornar.
- `MessageAttributeNames`: Atributos que serão recebidos.

Para saber mais sobre as propriedades consulte a documentação oficial sobre a interface [ReceiveMessageCommandInput](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sqs/interfaces/receivemessagecommandinput.html) da AWS.

### Adicionando método de deletar mensagem da fila
Após a mensagem ser recebida e a transação ser concluída pelo **consumer**, é importante excluir a mensagem para evitar processamento duplicado. 

Para isso, vamos criar um método em nosso _service_ que receberá um parâmetro chamado [``ReceiptHandle``](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sqs/interfaces/message-1.html), que é um identificador associado ao recebimento de uma mensagem. Um novo identificador de recebimento é gerado cada vez que uma mensagem é recebida. Ao excluir uma mensagem, é necessário fornecer o ``ReceiptHandle`` mais recente associado a ela para garantir que a mensagem correta seja excluída.

```javascript
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
```

Entendendo as propriedades:
- `QueueUrl`: link da nossa fila.
- `ReceiptHandle`: Identificador da nossa mensagem.

Para saber mais sobre as propriedades consulte a documentação oficial sobre a interface [DeleteMessageCommandInput](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sqs/interfaces/deletemessagecommandinput.html) da AWS.

## Usando o _service_ de comunicação com o Amazon SQS no _producer_
Agora que criamos o service de comunicação com o Amazon SQS, podemos finalmente modificar a nossa rota ``/request-transfer`` do **producer**. Em vez de disparar uma requisição diretamente para a rota ``/process-transfer`` do **consumer**, o **producer** enviará uma mensagem com as informações do pagamento para a nossa fila, para que o **consumer** possa recebê-la e consumi-la no momento adequado.

Nossa rota `/request-transfer` terá, agora, o seguinte conteúdo:

Primeiro criamos uma nova instância do `SqsService` e, após isso, chamamos o método `sendMessage()`, passando como **body** as informações da nossa transação. Como o **body** precisa ser uma _string_, o método ``JSON.stringify()`` é chamado para converter nosso objeto com as informações da transação em texto.
```javascript
app.post('/transfer', async(req, res) => {
    const { 
        fromAccount,
        toAccount,
        amount
    } = req.body;

    try {
        const sqsService = new SqsService(process.env.AWS_MAIN_QUEUE_URL)
        await sqsService.sendMessage({
            body: JSON.stringify({
                fromAccount,
                toAccount,
                amount
            })
        })
    
        res.status(200).json({ message: 'Sua transação será processada' })
    } catch(err) {
        console.log(err)
        res.status(500).json({ message: 'Erro interno' })
    }
})
```

## Consumindo as mensagens da fila no _consumer_
Agora que o **producer** envia as mensagens para a fila e não se conecta mais diretamente ao **consumer**, precisamos criar um **worker** que busque constantemente por transações em nossa fila e as processe. Para isso, usaremos uma biblioteca bem conhecida do Node.js para agendamento de tarefas, chamada [``node-cron``](https://www.npmjs.com/package/node-cron). Com ela, poderemos atribuir uma tarefa a ser executada repetidamente pelo **consumer**. Essa tarefa será buscar novos pedidos de transações na fila e, no nosso caso, para facilitar a visualização do que está acontecendo, vamos definir um intervalo de 1 minuto. Ou seja, o **consumer** buscará novas transações na fila e as processará a cada 1 minuto.

### Criando a task agendada com _node-cron_
Para criar uma task com `node-cron` que seja executada a cada 1min, basta substituirmos nossa rota `/process-transfer` por essa função:

```javascript
import cron from 'node-cron'

cron.schedule('* * * * *', () => {
    console.log('Running every minute')
})
```

Agora sempre que o nosso serviço **consumer** estiver sendo executado, uma _task_ será realizada automaticamente a cada 1min.

### Consumindo mensagens do Amazon SQS dentro da task
Agora que nossa task está sendo executada a cada 1min, precisamos fazer com que ela busque mensagens que estão na nossa fila, para isso, iremos criar uma nova instância do ``SqsService`` e chamar o método `receiveMessages()` que criamos anteriormente.

```javascript
cron.schedule('* * * * *', async() => {
    const sqsService = new SqsService(process.env.AWS_MAIN_QUEUE_URL)
    const messages = await sqsService.receiveMessages()
    console.log(messages)
})
```

O output será uma array de objetos [`Message`](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sqs/interfaces/message-1.html), que são as nossas mensagens:
![Exemplo de uma mensagem retornada pela nossa fila do Amazon SQS](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/b30jfyt570aud9xcftpq.png)

### Removendo mensagens da fila
Agora que o nosso **consumer** já recebe as mensagens da fila de forma autônoma, isto é, sem precisar ser "chamado" pelo **producer**, vamos implementar um protótipo que simula o processamento da transação de cada mensagem. Ao final do processamento, a mensagem será removida da fila. 

É importante destacar que toda mensagem **precisa** ser removida da fila após ser consumida, para evitar que ela seja processada duas vezes.

A função que iremos adicionar faz um loop por cada mensagem recebida e simula seu processamento com um _setTimeout_ dentro de uma _Promise_, demorando 5 segundos pra cada mensagem:
```javascript
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
    } 
})
```

Após o processamento precisamos remover a mensagem da fila. Pra isso iremos chamar o método `deleteMessage()` do nosso `SqsService`. Ele recebe como parâmetro o `ReceiptHandle` da mensagem.

```javascript
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
```

Pronto! Criamos um serviço de pagamentos que se comunica via mensageria com o `Amazon SQS`. Perceba que, agora, o serviço que pede que pagamentos sejam feitos e o serviço que de fato processa o pagamento são totalmente independentes um do outro, o que facilita a escalabilidade e manutenção.
