const allowedHosts = new Set([
    "ecommerce-assets.ext.gm.com",
    "cld.partsimg.com",
    "images.carid.com",
    "cdn.carlights360.com"
]);

const crcTable = makeCrcTable();

function getTodayParts() {
	const today = new Date();
	const year = today.getFullYear();
	const month = String(today.getMonth() + 1).padStart(2, "0");
	const day = String(today.getDate()).padStart(2, "0");

	return {
		year: year,
		month: month,
		day: day,
		folder: `${year}-${month}-${day}`
	};
}

function getZipDownloadName() {
	const today = getTodayParts();
	return `KP360 Images/KP360-Images-${today.folder}.zip`;
}

function sanitizeZipEntryName(filename) {
	let cleaned = String(filename || "").trim();

	cleaned = cleaned.replace(/[\\:*?"<>|]/g, "_");
	cleaned = cleaned.replace(/^\/+/, "");
	cleaned = cleaned.replace(/\/+/g, "/");
	cleaned = cleaned.replace(/\s+/g, " ");
	cleaned = cleaned.replace(/^\.+/, "");
	cleaned = cleaned.replace(/\.+$/, "");

	if (cleaned === "") {
		cleaned = "image.JPG";
	}

	cleaned = cleaned.replace(/\.jpg$/i, ".JPG");
	cleaned = cleaned.replace(/\.jpeg$/i, ".JPG");
	cleaned = cleaned.replace(/\.png$/i, ".JPG");
	cleaned = cleaned.replace(/\.webp$/i, ".JPG");

	if (!/\.JPG$/i.test(cleaned)) {
		cleaned = `${cleaned}.JPG`;
	}

	return cleaned;
}

function isAllowedUrl(url) {
	try {
		const parsed = new URL(url);
		return parsed.protocol === "https:" && allowedHosts.has(parsed.hostname.toLowerCase());
	} catch (error) {
		return false;
	}
}

function makeCrcTable() {
	const table = new Uint32Array(256);

	for (let n = 0; n < 256; n++) {
		let c = n;

		for (let k = 0; k < 8; k++) {
			if (c & 1) {
				c = 0xedb88320 ^ (c >>> 1);
			} else {
				c = c >>> 1;
			}
		}

		table[n] = c >>> 0;
	}

	return table;
}

function crc32(data) {
	let crc = 0xffffffff;

	for (let i = 0; i < data.length; i++) {
		crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
	}

	return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
	let year = date.getFullYear();

	if (year < 1980) {
		year = 1980;
	}

	const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
	const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();

	return {
		time: dosTime,
		date: dosDate
	};
}

function uint16(value) {
	const output = new Uint8Array(2);
	const view = new DataView(output.buffer);
	view.setUint16(0, value, true);
	return output;
}

function uint32(value) {
	const output = new Uint8Array(4);
	const view = new DataView(output.buffer);
	view.setUint32(0, value >>> 0, true);
	return output;
}

function textBytes(text) {
	return new TextEncoder().encode(text);
}

function concatUint8Arrays(chunks) {
	let totalLength = 0;

	for (let i = 0; i < chunks.length; i++) {
		totalLength += chunks[i].length;
	}

	const output = new Uint8Array(totalLength);
	let offset = 0;

	for (let i = 0; i < chunks.length; i++) {
		output.set(chunks[i], offset);
		offset += chunks[i].length;
	}

	return output;
}

function createZip(files) {
	const chunks = [];
	const centralChunks = [];
	const now = new Date();
	const dt = dosDateTime(now);
	let offset = 0;

	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		const name = file.name;
		const nameBytes = textBytes(name);
		const data = file.data;
		const crc = crc32(data);
		const size = data.length;

		const localHeader = concatUint8Arrays([
			uint32(0x04034b50),
			uint16(20),
			uint16(0x0800),
			uint16(0),
			uint16(dt.time),
			uint16(dt.date),
			uint32(crc),
			uint32(size),
			uint32(size),
			uint16(nameBytes.length),
			uint16(0),
			nameBytes
		]);

		chunks.push(localHeader);
		chunks.push(data);

		const centralHeader = concatUint8Arrays([
			uint32(0x02014b50),
			uint16(20),
			uint16(20),
			uint16(0x0800),
			uint16(0),
			uint16(dt.time),
			uint16(dt.date),
			uint32(crc),
			uint32(size),
			uint32(size),
			uint16(nameBytes.length),
			uint16(0),
			uint16(0),
			uint16(0),
			uint16(0),
			uint32(0),
			uint32(offset),
			nameBytes
		]);

		centralChunks.push(centralHeader);

		offset += localHeader.length + data.length;
	}

	const centralStart = offset;
	let centralSize = 0;

	for (let i = 0; i < centralChunks.length; i++) {
		chunks.push(centralChunks[i]);
		centralSize += centralChunks[i].length;
	}

	const endOfCentralDirectory = concatUint8Arrays([
		uint32(0x06054b50),
		uint16(0),
		uint16(0),
		uint16(files.length),
		uint16(files.length),
		uint32(centralSize),
		uint32(centralStart),
		uint16(0)
	]);

	chunks.push(endOfCentralDirectory);

	return concatUint8Arrays(chunks);
}

function arrayBufferToBase64(buffer) {
	const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
	const chunkSize = 32768;
	let binary = "";

	for (let i = 0; i < bytes.length; i += chunkSize) {
		const chunk = bytes.subarray(i, i + chunkSize);
		binary += String.fromCharCode.apply(null, chunk);
	}

	return btoa(binary);
}

async function fetchImageBytes(url){

    const attempts = 2;

    for(let attempt = 1; attempt <= attempts; attempt++){

        let controller = null;
        let timeoutId = null;

        try{

            controller =
                new AbortController();

            timeoutId =
                setTimeout(function(){

                    controller.abort();

                },10000);

            const response =
                await fetch(url,{

                    method:"GET",

                    cache:"no-cache",

                    redirect:"follow",

                    signal:controller.signal

                });

            clearTimeout(timeoutId);

            if(!response.ok){

                throw new Error(
                    `HTTP ${response.status}`
                );

            }

            const buffer =
                await response.arrayBuffer();

            if(
                !buffer ||
                buffer.byteLength === 0
            ){

                throw new Error(
                    "Empty image."
                );

            }

            return new Uint8Array(buffer);

        }catch(error){

            clearTimeout(timeoutId);

            console.warn(
                "Fetch failed:",
                url,
                error
            );

            if(attempt >= attempts){

                return null;

            }

            await new Promise(resolve =>
                setTimeout(resolve,500)
            );

        }

    }

    return null;

}

function downloadZip(zipBytes) {
	return new Promise(function (resolve, reject) {
		const base64 = arrayBufferToBase64(zipBytes);
		const dataUrl = `data:application/zip;base64,${base64}`;

		chrome.downloads.download({
			url: dataUrl,
			filename: getZipDownloadName(),
			conflictAction: "uniquify",
			saveAs: false
		}, function (downloadId) {
			if (chrome.runtime.lastError) {
				reject(new Error(chrome.runtime.lastError.message));
				return;
			}

			resolve(downloadId);
		});
	});
}

function dedupeFilename(filename, usedNames) {
	let name = sanitizeZipEntryName(filename);

	if (!usedNames.has(name.toLowerCase())) {
		usedNames.add(name.toLowerCase());
		return name;
	}

	const dotIndex = name.lastIndexOf(".");
	const base = dotIndex === -1 ? name : name.substring(0, dotIndex);
	const ext = dotIndex === -1 ? ".JPG" : name.substring(dotIndex);
	let counter = 2;

	while (usedNames.has(`${base}_${counter}${ext}`.toLowerCase())) {
		counter++;
	}

	name = `${base}_${counter}${ext}`;
	usedNames.add(name.toLowerCase());
	return name;
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	if (!message || message.type !== "KP360_DOWNLOAD_IMAGES_ZIP") {
		return;
	}

	(async function () {
		const images = Array.isArray(message.images) ? message.images : [];
		const errors = [];
		const files = [];
		const usedNames = new Set();

		for (let i = 0; i < images.length; i++) {
			const item = images[i];
			const url = String(item.url || "");
			const filename = dedupeFilename(String(item.filename || `image_${i + 1}.JPG`), usedNames);

			if (!isAllowedUrl(url)) {
				errors.push({
					url: url,
					filename: filename,
					error: "URL host is not allowed."
				});
				continue;
			}

			try {
				const bytes =
 			   await fetchImageBytes(url);

				if(!bytes){

    			errors.push({
       			url:url,
       			filename:filename,
        		error:"Failed to fetch image"
    });

   			 continue;
}

				files.push({
    				name: filename,
    				data: bytes
});
			} catch (error) {

    				console.error(
        				"FETCH FAILED",
       					url,
       				 	error
   			 );

    			errors.push({
       				url: url,
        			filename: filename,
        			error: error.message
   			 });
		}
}
	
		if (files.length === 0) {
			sendResponse({
				ok: false,
				error: errors.length > 0 ? `No images were added to ZIP. First error: ${errors[0].error}` : "No images were added to ZIP.",
				requested: images.length,
				added: 0,
				failed: errors.length,
				errors: errors.slice(0, 20)
			});
			return;
		}

		try {
			const zipBytes = createZip(files);
			await downloadZip(zipBytes);

			sendResponse({
				ok: true,
				requested: images.length,
				added: files.length,
				failed: errors.length,
				errors: errors.slice(0, 20)
			});
		} catch (error) {
			sendResponse({
				ok: false,
				error: error.message,
				requested: images.length,
				added: files.length,
				failed: errors.length,
				errors: errors.slice(0, 20)
			});
		}
	})();

	return true;
});
