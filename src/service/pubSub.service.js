class PubSubService {
    #events = {}

    constructor() {

    }

    static instance = new PubSubService()

    static getInstance() {
        return this.instance
    }

    subscribe(eventName, fn) {
        console.log(`PUBSUB: someone just subscribed to kwno about ${eventName}`)

        this.#events[eventName] = this.#events[eventName] || []
        this.#events[eventName].push(fn)
    }

    unsubscribe(eventName, fn) {
        console.log(`PUBSUB: someone just UNsubscribed from ${eventName}`)

        if(this.#events.hasOwnProperty(eventName)) {
            this.#events[eventName] = this.#events[eventName].filter(f => f != fn)
        }
    }

    publish(eventName, data) {
        console.log(`PUBSUB: Making a broadcast about ${eventName} with ${data}`)

        if(this.#events.hasOwnProperty(eventName)) {
            this.#events[eventName].forEach(f => {
                f(data)
            })
        }
    }
}

export default PubSubService