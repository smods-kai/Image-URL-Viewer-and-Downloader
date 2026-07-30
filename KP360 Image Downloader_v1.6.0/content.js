(function () {
	const extensionVersion = "v1.5";
	const requestType = "KP360_DOWNLOAD_IMAGES_ZIP";
	const responseType = "KP360_DOWNLOAD_IMAGES_ZIP_RESPONSE";
	
	let rememberedUrls = [];

	const singleSuffixesEight = ["_master_v2.JPG", "_02_v2.JPG", "_03_v2.JPG", "_04_v2.JPG", "_05_v2.JPG", "_06_v2.JPG", "_07_v2.JPG", "_08_v2.JPG"];
	const setSuffixesEight = ["_master_SET_v2.JPG", "_02_SET_v2.JPG", "_03_SET_v2.JPG", "_04_SET_v2.JPG", "_05_SET_v2.JPG", "_06_SET_v2.JPG", "_07_SET_v2.JPG", "_08_SET_v2.JPG"];
	const singleSuffixesThree = ["_master_v2.JPG", "_02_v2.JPG", "_03_v2.JPG"];
	const setSuffixesThree = ["_master_SET_v2.JPG", "_02_SET_v2.JPG", "_03_SET_v2.JPG"];

	function isVisible(element) {
		if (!element) {
			return false;
		}

		const style = window.getComputedStyle(element);

		if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
			return false;
		}

		return true;
	}

	function getVisibleTabContent() {
		const tabs = Array.from(document.querySelectorAll(".tabcontent"));

		for (let i = 0; i < tabs.length; i++) {
			if (isVisible(tabs[i])) {
				return tabs[i];
			}
		}

		return document.body;
	}

	function cleanFilenamePart(value) {
		let cleaned = String(value || "").trim();

		cleaned = cleaned.replace(/[\\/:*?"<>|]/g, "_");
		cleaned = cleaned.replace(/\s+/g, " ");
		cleaned = cleaned.replace(/^\.+/, "");
		cleaned = cleaned.replace(/\.+$/, "");

		return cleaned;
	}

	function cleanBaseName(value) {
		let cleaned = cleanFilenamePart(value);

		cleaned = cleaned.replace(/\.jpg$/i, "");
		cleaned = cleaned.replace(/\.jpeg$/i, "");
		cleaned = cleaned.replace(/\.png$/i, "");
		cleaned = cleaned.replace(/\.webp$/i, "");

		if (cleaned === "") {
			cleaned = "image";
		}

		return cleaned;
	}

	function deriveBaseFromUrl(url) {
		try {
			const parsed = new URL(url);
			const pathname = parsed.pathname;
			const filename = pathname.substring(pathname.lastIndexOf("/") + 1);

			if (parsed.hostname === "ecommerce-assets.ext.gm.com") {
				return cleanBaseName(filename.replace(/_Primary\.jpg$/i, "").replace(/_Alternate\d+\.jpg$/i, ""));
			}

			if (filename) {
				return cleanBaseName(filename);
			}

			return "image";
		} catch (error) {
			return "image";
		}
	}

	function getDownloadPrefix(tabNumber) {
		const textarea = document.getElementById(`fileNameBase${tabNumber}`);

		if (!textarea) {
			return "";
		}

		const prefix = textarea.value.trim();

		if (prefix === "") {
			return "";
		}

		return cleanFilenamePart(prefix);
	}

	function getTypeValue(tabNumber) {
		const select = document.getElementById(`typeSelect${tabNumber}`);

		if (!select) {
			return "single";
		}

		return select.value;
	}

	function getSuffixArray(tabNumber) {
		const typeValue = getTypeValue(tabNumber);

		if (tabNumber === 3) {
			return typeValue === "set" ? setSuffixesThree : singleSuffixesThree;
		}

		return typeValue === "set" ? setSuffixesEight : singleSuffixesEight;
	}

	function getTabNumberFromContainer(container) {
		const tab = container.closest(".tabcontent");

		if (!tab || !tab.id) {
			return 0;
		}

		const match = tab.id.match(/Tab(\d+)/);

		if (!match) {
			return 0;
		}

		return Number(match[1]);
	}

	function shouldSkipImage(img) {
		if (!img || !img.src) {
			return true;
		}

		if (!/^https?:\/\//i.test(img.src)) {
			return true;
		}

		if (img.naturalWidth === 211 && img.naturalHeight === 211) {
			return true;
		}

		return false;
	}

	function forceJpgSuffix(suffix) {
		let cleaned = String(suffix || "").trim();

		if (cleaned === "") {
			return ".JPG";
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

	function buildFilename(prefix, base, suffix) {
		const cleanPrefix = cleanFilenamePart(prefix);
		const cleanBase = cleanBaseName(base);
		const cleanSuffix = forceJpgSuffix(suffix);

		return `${cleanPrefix}${cleanBase}${cleanSuffix}`;
	}

	function collectImagesFromLineContainers(root) {
		const images = [];
		const containers = Array.from(root.querySelectorAll(".line-container"));

		for (let i = 0; i < containers.length; i++) {
			const container = containers[i];
			const tabNumber = getTabNumberFromContainer(container);
			const downloadPrefix = getDownloadPrefix(tabNumber);
			const suffixArray = getSuffixArray(tabNumber);
			const imgs = Array.from(container.querySelectorAll("img"));

			for (let j = 0; j < imgs.length; j++) {
				const img = imgs[j];

				if (shouldSkipImage(img)) {
					continue;
				}

				const base = container.dataset.base ? container.dataset.base : deriveBaseFromUrl(img.src);
				const suffix = suffixArray[j % suffixArray.length] || ".JPG";
				const filename = buildFilename(downloadPrefix, base, suffix);

				images.push({
					url: img.src,
					filename: filename
				});
			}
		}

		return images;
	}

	function collectImagesFromAllImages(root) {
		const images = [];
		const imgs = Array.from(root.querySelectorAll("img"));
		const tab = root.closest && root.closest(".tabcontent") ? root.closest(".tabcontent") : root;
		let tabNumber = 0;

		if (tab && tab.id) {
			const match = tab.id.match(/Tab(\d+)/);
			if (match) {
				tabNumber = Number(match[1]);
			}
		}

		const downloadPrefix = getDownloadPrefix(tabNumber);

		for (let i = 0; i < imgs.length; i++) {
			const img = imgs[i];

			if (shouldSkipImage(img)) {
				continue;
			}

			const base = deriveBaseFromUrl(img.src);
			const filename = buildFilename(downloadPrefix, `${base}_${String(i + 1).padStart(2, "0")}`, ".JPG");

			images.push({
				url: img.src,
				filename: filename
			});
		}

		return images;
	}

	function collectImages() {
		const root = getVisibleTabContent();
		let images = collectImagesFromLineContainers(root);

		if (images.length === 0) {
			images = collectImagesFromAllImages(root);
		}

		return images;
	}

	function setStatus(message) {
		let status = document.getElementById("kp360-extension-status");

		if (!status) {
			return;
		}

		status.textContent = message;
	}

	function sendImagesToExtension(images) {
		return new Promise(function (resolve) {
			chrome.runtime.sendMessage({
				type: requestType,
				images: images
			}, function (response) {
				if (chrome.runtime.lastError) {
					resolve({
						ok: false,
						error: chrome.runtime.lastError.message,
						requested: images.length,
						added: 0,
						failed: images.length,
						errors: []
					});
					return;
				}

				resolve(response || {
					ok: false,
					error: "No response from extension background.",
					requested: images.length,
					added: 0,
					failed: images.length,
					errors: []
				});
			});
		});
	}

	async function downloadVisibleImagesAsZip() {
		let images = [];

	if (rememberedUrls.length > 0) {

    	images = rememberedUrls.map(function(url) {

        const filename = url.split('/').pop() || 'image.JPG';

        return {
            url: url,
            filename: filename
        };

    });

} 	else {

    images = collectImages();

}

		if (images.length === 0) {
			setStatus("No generated images found. Click Generate URLs & Images first.");
			alert("No generated images found. Click Generate URLs & Images first.");
			return;
		}

		console.log("KP360 Image Downloader v1.5 ZIP images:", images);
		setStatus(`Building ZIP with ${images.length} image(s)...`);

		const response = await sendImagesToExtension(images);

		if (!response || response.ok !== true) {
			const errorMessage = response && response.error ? response.error : "ZIP download request failed.";
			setStatus(errorMessage);
			console.error("KP360 ZIP download failed:", response);
			alert(errorMessage);
			return;
		}

		setStatus(`ZIP downloaded. Added: ${response.added}. Failed: ${response.failed || 0}`);

		if (response.failed > 0) {
			console.error("KP360 ZIP download errors:", response.errors);
		}
	}

	function injectButton() {
		if (document.getElementById("kp360-extension-panel")) {
			return;
		}

		const panel = document.createElement("div");
		panel.id = "kp360-extension-panel";
		panel.style.position = "fixed";
		panel.style.right = "18px";
		panel.style.bottom = "18px";
		panel.style.zIndex = "2147483647";
		panel.style.background = "#222";
		panel.style.color = "#fff";
		panel.style.border = "1px solid #555";
		panel.style.borderRadius = "10px";
		panel.style.padding = "10px";
		panel.style.fontFamily = "Arial, sans-serif";
		panel.style.fontSize = "12px";
		panel.style.boxShadow = "0 4px 14px rgba(0,0,0,0.35)";
		panel.style.maxWidth = "280px";

		const button = document.createElement("button");
		button.id = "kp360-extension-download-button";
		button.textContent = "KP360 Download ZIP v1.6.0";
		button.style.background = "#de9b14";
		button.style.color = "#fff";
		button.style.border = "none";
		button.style.borderRadius = "6px";
		button.style.padding = "8px 10px";
		button.style.cursor = "pointer";
		button.style.fontSize = "13px";
		button.style.fontWeight = "bold";
		button.style.width = "100%";

		const status = document.createElement("div");
		status.id = "kp360-extension-status";
		status.textContent = "Generate images, then click here.";
		status.style.marginTop = "6px";
		status.style.lineHeight = "1.35";

		button.addEventListener("click", downloadVisibleImagesAsZip);

		panel.appendChild(button);
		panel.appendChild(status);
		document.body.appendChild(panel);
	}

	window.addEventListener("message", function (event) {
		if (event.source !== window) {
			return;
		}

		const data = event.data;

		if (!data || data.type !== requestType || !Array.isArray(data.images)) {
			return;
		}

		const images = data.images.map(function (item) {
			return {
				url: String(item.url || ""),
				filename: String(item.filename || "")
			};
		}).filter(function (item) {
			return /^https?:\/\//i.test(item.url) && item.filename.trim() !== "";
		});

		if (images.length === 0) {
			window.postMessage({
				type: responseType,
				ok: false,
				error: "No valid image URLs received."
			}, "*");
			return;
		}

		chrome.runtime.sendMessage({
			type: requestType,
			images: images
		}, function (response) {
			if (chrome.runtime.lastError) {
				window.postMessage({
					type: responseType,
					ok: false,
					error: chrome.runtime.lastError.message
				}, "*");
				return;
			}

			window.postMessage({
				type: responseType,
				ok: response && response.ok === true,
				requested: response ? response.requested : 0,
				added: response ? response.added : 0,
				failed: response ? response.failed : 0,
				errors: response ? response.errors : []
			}, "*");
		});
	});

	window.addEventListener(
    "message",
    function(event){

        if(event.source !== window){
            return;
        }

        if(
            event.data &&
            event.data.type ===
            "KP360_URL_MEMORY"
        ){

            rememberedUrls =
            event.data.urls || [];

            setStatus(
                rememberedUrls.length +
                " URLs remembered"
            );

            console.log(
                "Remembered URLs:",
                rememberedUrls.length
            );
        }
    }
);

	injectButton();
})();
