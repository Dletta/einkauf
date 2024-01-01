/*
    Imports 
*/


/*
    Globals
*/



/* Service Worker Registration */
const registerServiceWorker = async () => {
    if ("serviceWorker" in navigator) {
        try {
        const registration = await navigator.serviceWorker.register("/worker.js", {
            scope: "/",
        })
        if (registration.installing) {
            console.log("Service worker installing")
        } else if (registration.waiting) {
            console.log("Service worker installed")
        } else if (registration.active) {
            console.log("Service worker active")
        }
        } catch (error) {
        console.error(`Registration failed with ${error}`)
        }
    }
}
      
registerServiceWorker()

/* Application Code */


      