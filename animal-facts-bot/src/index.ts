import { HandleRequest, HttpRequest, HttpResponse, Kv } from "@fermyon/spin-sdk"

const decoder = new TextDecoder();

type SlackCommand = {
    token?: string | null;
    team_id?: string | null;
    team_domain?: string | null;
    enterprise_id?: string | null;
    enterprise_name?: string | null;
    channel_id?: string | null;
    channel_name?: string | null;
    user_id?: string | null;
    user_name?: string | null;
    command?: string | null;
    text?: string | null;
    response_url?: string | null;
    trigger_id?: string | null;
    api_app_id?: string | null;
}

type AnimalFact = {
    id: number;
    name: string;
    species: string;
    family: string;
    habitat: string;
    place_of_founc: string;
    diet: string;
    description: string;
    weight_kg: number;
    height_cm: number;
    image: string;
}

export const handleRequest: HandleRequest = async function(request: HttpRequest): Promise<HttpResponse> {

    let queryParams = new URLSearchParams(decoder.decode(request.body));
    let command: SlackCommand = {
        text: queryParams.get("text"),
        user_name: queryParams.get("user_name")
    };
    console.log(`Got a query for ${command.text}`);

    if (command.text == null) {
        return {
            status: 200,
            headers: { "content-type": "text/plain" },
            body: "You're not Slack!!!"
        };
    };

    var description: string | null = CheckCache(command.text);
    if (!description) {
        description = await OutBoundCall(command.text);
        if (!description) {
            return {
                status: 401,
                headers: { "content-type": "text/plain" },
                body: "Animal not found"
            };
        };
    };

    return {
        status: 200,
        headers: { "content-type": "text/plain" },
        body: description
    };
};

const OutBoundCall = async function(query: string): Promise<string | null> {
    const animalFactResponse = await fetch(`https://freetestapi.com/api/v1/animals?search=${query}`);
    const animalFact = await animalFactResponse.json() as AnimalFact[];
    if (animalFact.length > 0) {
        StoreInCache(query, animalFact[0].description);
        return animalFact[0].description;
    } else {
        StoreInCache(query, "Aminal not found!");
        return null;
    }
};

const CheckCache = function(query: string): string | null {
    let store = Kv.openDefault();
    let cachedValue = decoder.decode(store.get(query) || new Uint8Array());
    if (cachedValue) {
        console.log("Cache hit!");
        return cachedValue
    } else {
        console.log("Cache miss");
        return null
    }
};

const StoreInCache = function(query: string, description: string | null) {
    let store = Kv.openDefault();
    store.setJson(query, description);
    console.log("Stored in cache");
};
