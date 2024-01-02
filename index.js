/*
    Imports 
*/
import {joinRoom} from './trystero-ipfs.min.js'

/*
    Globals
*/
const btn_switcher = document.getElementById('board-switcher')
const btn_sync = document.getElementById('sync')
const btn_settings = document.getElementById('settings')
const btn_share = document.getElementById('share')
const btn_close = document.getElementById('close-ref')
var user_data = {}
var room = {}
var sendData, receiveData

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

/**
 * Main Application Function, called on document load
 */
function main () {
    console.log('Initializing Application')
    /* Check if this is the first time someone arrived */
    let beenHere = localStorage.getItem('einkauf')
    if(!beenHere) {
        console.log('A new user is here')
        setup()
        localStorage.setItem('einkauf', JSON.stringify({token:null}))
    } else {
        console.log('Welcome back!')
        let roomData = JSON.parse(beenHere)
        if(!roomData) {
            setup()
            return
        }
        loadData()
    }
}

/**
 * Create empty data model, send a welcome message.
 */
function setup () {
    console.log('Setting up for new User')
    user_data = {
        appId: 'einkauf-id125a',
        profile: '',
        lists: [],
        sync_queue: []
    }
    localStorage.setItem('user_data', JSON.stringify(user_data))
    alert('Welcome to Einkauf, the shared Shopping List Web App. Simply enter a new profile name, create a list and use the big red X to save and start using the app.')
}

/*
* Preferences Saving and Closing
*/
btn_close.addEventListener('click', closeSettings)

function closeSettings () {
    console.log('Closing Settings')
    let profName = document.querySelector('#profile-name')
    let profId = profName.value
    if (profId.length < 1) {
        alert('Please enter a profile name to start using.')
    }
    user_data.profile = profId
    let pref = document.querySelector('#preferences')
    pref.style.display = 'none'
    switchToMain()
}

/*
* New List Management
*/
const createList = document.querySelector('#create-list')

createList.addEventListener('click', addList)

function addList () {
    let name = prompt('Please give the new shopping list a name.')
    user_data.lists.push(
        {
            name: name,
            items: []
        }
    )
    updateLists()
}

/**
 * Update Preference List of Lists
 */
function updateLists () {
    let lists = document.querySelector('#manage-lists')
    /* Clear out all children */
    lists.innerHTML = ''
    /* Iterate over lists array and create an element */
    user_data.lists.forEach(el => {
        let list = document.createElement('div')
        list.setAttribute('id', el.name)
        list.setAttribute('class', 'list-el')
        list.innerText = el.name
        list.addEventListener('click', editList) 
        lists.appendChild(list)
    })
    /* Add Creation element */
    let create = document.createElement('div')
    create.setAttribute('id', 'create-list')
    create.setAttribute('class', 'list-el-last')
    create.innerText = '➕ Create a List'
    create.addEventListener('click', addList)
    lists.appendChild(create)
}

function editList () {

}

/*
* Existing User
*/

/**
 * Load Data from localStorage
 */
function loadData () {
    console.log('Loading Data for existing user')
    let string = localStorage.getItem('user_data')
    user_data = JSON.parse(string)
    let pref = document.querySelector('#preferences')
    pref.style.display = 'none'
    switchToMain()
}

/**
 * Change visibility and state, connect to Room, setup actions
 */
function switchToMain () {
    let menu = document.querySelector('#menu')
    let lists = document.querySelector('#list-container')
    menu.style.display = 'grid'
    lists.style.display = 'grid'
    if(user_data.profile == '') {
        let pref = document.querySelector('#preferences')
        menu.style.display = 'none'
        lists.style.display = 'none'
        pref.style.display = 'grid'
        setup()
        return
    }

    room = joinRoom({appId:user_data.appId}, user_data.profile)

    room.onPeerJoin((peerId) => {
        console.log(`${peerId} joined`)
    })

    room.onPeerLeave((peerId) => {
        console.log(`${peerId} left`)
    })

    var [sending, receive] = room.makeAction('data')
    sendData = sending
    receiveData = receive

    receiveData((data, peerId) => {
        console.log(`${peerId} send ${data}`)
    })
}


/* Application start */

document.addEventListener('DOMContentLoaded', main)
      