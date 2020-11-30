console.log("Hello from service worker!")


const CACHE_NAME = "static-cache-v2";
const DATA_CACHE_NAME = "data-cache-v1";

const iconSizes = ["192", "512"];
// this loops over the iconSizes array and maps to iconFiles
// create the full icon path for each icon size 
const iconFiles = iconSizes.map(
    (size) => `icons/icon-${size}x${size}.png`
);
console.log('iconFiles: ', iconFiles);
const staticFilesToPreCache = [
    "/",
    "/db.js",
    "/manifest.webmanifest",
    "/index.html",
    "/styles.css",
    "/index.js"
].concat(iconFiles);
// add all the paths for iconFiles to the list to precache


// install
self.addEventListener("install", function (evt) {
    evt.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log("Your files were pre-cached successfully!");
            return cache.addAll(staticFilesToPreCache);
        })
    );
    // start right now and dont wait
    self.skipWaiting();
});

// activate event listener that is called when a url is visited
self.addEventListener("activate", function (evt) {
    // wait for all the promises
    evt.waitUntil(
        // get all the keys cache 
        caches.keys().then(keyList => {
            return Promise.all(
                // map iterates through all key elements (we have 2) in our app
                // remove all the ones that dont match what we need
                keyList.map(key => {
                    if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
                        console.log("Removing old cache data", key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    // terminate all other service workers and activate this one
    self.clients.claim();
});

// fetch event listener that is called from the front end
self.addEventListener("fetch", function (evt) {
    
    // cache requests to the API
    if (evt.request.url.includes("/api/transaction")) {
        console.log("inside fetch event listener");
        evt.respondWith(
            caches.open(DATA_CACHE_NAME).then(cache => {
                return fetch(evt.request)
                    .then(response => {
                        console.log('response: ', response);
                        // If the response was good, clone it and store it in the cache.
                        // response is a stream and is closed as soon as it is delivered
                        // clone allows you to have access to the response
                        if (response.status === 200) {
                            cache.put(evt.request, response.clone());
                        }

                        return response;
                    })
                    .catch(err => {
                        console.log('fetch err: ', err);
                        // Network request failed, try to get it from the cache.
                        return cache.match(evt.request);
                    });
            }).catch(err => console.log(err))
        );
    } else {
        // respond from static cache, request is not for /api/*
        evt.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(evt.request).then(response => {
                    return response || fetch(evt.request);
                });
            })
        );
    }
});
