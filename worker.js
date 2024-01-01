/* 
Service Workers are a required component of PWAs. Without a worker that can cache files, control outgoing commands and optionally receive push notifications, PWAs are not able to be installed and used by a user.
*/
const version = '0.3'

const addResourcesToCache = async (resources) => {
    const cache = await caches.open(version);
    await cache.addAll(resources);
  };
  
  const putInCache = async (request, response) => {
    const cache = await caches.open(version);
    await cache.put(request, response);
  };

const cacheFirst = async ({ request }) => {
    // First try to get the resource from the cache
    const responseFromCache = await caches.match(request);
    if (responseFromCache) {
      return responseFromCache;
    }
  
    // Next try to get the resource from the network
    try {
      const responseFromNetwork = await fetch(request.clone());
      // response may be used only once
      // we need to save clone to put one copy in cache
      // and serve second one
      putInCache(request, responseFromNetwork.clone());
      return responseFromNetwork;
    } catch (error) {
      const fallbackResponse = await caches.match(fallbackUrl);
      if (fallbackResponse) {
        return fallbackResponse;
      }
      // when even the fallback response is not available,
      // there is nothing we can do, but we must always
      // return a Response object
      return new Response('Network error happened', {
        status: 408,
        headers: { 'Content-Type': 'text/plain' },
      })
    }
  }

self.addEventListener('activate', (event) => {
  });
  
  self.addEventListener('install', (event) => {
    event.waitUntil(
        /* add any other offline resources here */
      addResourcesToCache([
        './',
        './index.html',
        './index.css',
        './index.js'
      ])
    )
  })
  
  self.addEventListener('fetch', (event) => {
    event.respondWith(
      cacheFirst(
        {
            request: event.request
        }
      )
    )
  })