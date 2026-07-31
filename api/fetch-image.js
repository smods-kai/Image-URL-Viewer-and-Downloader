export default async function handler(req, res) {

    if (req.method !== "GET") {
        return res.status(405).send("Method Not Allowed");
    }

    const imageUrl = req.query.url;

    if (!imageUrl) {
        return res.status(400).send("Missing URL");
    }

    let parsed;

    try {
        parsed = new URL(imageUrl);
    } catch {
        return res.status(400).send("Invalid URL");
    }

    const allowedHosts = new Set([
        "cdn.carlights360.com",
        "images.carid.com",
        "cld.partsimg.com",
        "ecommerce-assets.ext.gm.com"
    ]);

    if (!allowedHosts.has(parsed.hostname)) {
        return res.status(403).send("Host not allowed");
    }

    try {

        const response = await fetch(imageUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        });

        if (!response.ok) {
            return res
                .status(response.status)
                .send("Failed to fetch image");
        }

        const contentType =
            response.headers.get("content-type") ||
            "image/jpeg";

        const arrayBuffer =
            await response.arrayBuffer();

        res.setHeader(
            "Content-Type",
            contentType
        );

        res.setHeader(
            "Cache-Control",
            "public, max-age=86400"
        );

        return res.status(200).send(Buffer.from(arrayBuffer));

    }
    catch (err) {

        console.error(err);

        return res
            .status(500)
            .send("Server Error");

    }

}