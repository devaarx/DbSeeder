import PocketBase from "pocketbase";

export default function initPocketBase(url) {
    try {
        const pb = new PocketBase(url);
        return pb;
    }
    catch (error) {
        console.error("Error initializing PocketBase:", error);
        return null;
    }
}
