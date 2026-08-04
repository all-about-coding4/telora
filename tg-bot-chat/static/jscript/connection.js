async function hasInternet() {
    try {
        await fetch("https://www.google.com/favicon.ico", {
            mode: "no-cors",
            cache: "no-store"
        });

        return {
            connected: true,
            connection: "Online"
        };
    } catch {
        return {
            connected: false,
            connection: "Offline"
        };
    }
}

export default {
    hasInternet,
}

