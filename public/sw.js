const networkFirst = async (event) => {
    event.respondWith(
        fetch(event.request)
            .then(async (networkResponse) => {
                const cache = await caches.open('v1');
                await cache.put(event.request, networkResponse.clone());
                return networkResponse;
            })
            .catch(async () => {
                const cacheResponse = await caches.match(event.request);
                return cacheResponse;
            }));
};

const networkOnly = async (event) => {
    const url = (new URL(event.request.url));
    console.log('force network fetch on', url.pathname);
    event.respondWith(
        fetch(event.request)
            .then(r => r)
            .catch(() => new Response('failed to fetch', { status: 400 })));
};


self.addEventListener('fetch', (event) => {
    const url = (new URL(event.request.url));
    console.log('fetch on', url.pathname);

    if (url.host != location.host)
        networkOnly(event);
    else
        networkFirst(event);
});
