/*
    Imports 
*/
import {joinRoom} from './trystero-torrent.min.js'

/*
    Globals
*/
const btn_switcher = document.getElementById('board-switcher')
const btn_sync = document.getElementById('sync')
const btn_settings = document.getElementById('settings')
const btn_share = document.getElementById('share')
const btn_close = document.getElementById('close-ref')

/**
 * User Data Object
 */
var user_data = {
    appId: 'einkauf-id125a',
    profile: '',
    username: Math.random().toString(36).substring(8),
    lists: new Map(),
    active_list: '',
    lastModified: Date.now(),
}

console.log('Initializing user_data object with', user_data)

/* TODO: Should an empty list exist? */

/**
 * User Data Interface
 * Middleware for updating local and remote data (queueing if offline)
 */
const userInterface = {
    /**
     * Function to save data to localStorage
     */
    saveData: function () {
        /* check profile-name value, check connection */
        if (user_data.profile.length > 0) {
            console.log('checking connection for profile', user_data.profile)
            connectionManager.checkConn()
        }
        /* convert item down to json and save it */
        let storageObj = Object.assign({}, user_data)
        console.log('user_data being saved', storageObj)
        storageObj.lists = Array.from(storageObj.lists)
        localStorage.setItem('user_data', JSON.stringify(storageObj))
    },
    /**
     * Function to load data from localStorage
     */
    loadData: function () {
        let storageObj = JSON.parse(localStorage.getItem('user_data'))
        console.log('user_data loaded', storageObj)
        storageObj.lists = new Map(storageObj.lists)
        user_data = storageObj
    },
    /**
     * Function to create a new List
     * @param {string} name 
     * @returns null if failed
     */
    createList: function (name) {
        /* If name is nothing, throw an alert and reject */
        if(name.length < 1) {
            alert('The name cannot be empty')
            return null
        }
        /* If name already exists, throw an alert and reject */
        if(user_data.lists.has(name)) {
            alert('The name is already used')
            return null
        }
        /* Create an empty list with the new name */
        user_data.lists.set(name, {
            name: name,
            lastModified: Date.now(),
            items: []
        })
        user_data.active_list = name
        /* Trigger update of the page */
        stateMachine.transitionTo('update')
    },
    addItem: function (item, listname) {
        if (!listname) {
            listname = user_data.active_list
        }
        let list = user_data.lists.get(listname)
        list.items.push({
            name: item,
            active: true,
            qty: 1
        })
    },
    /**
     * Function that checks if data received is newer and if so, modifies the current user data
     * @param {object} comparisonObject 
     */
    compareAndUpdate: function (comparisonObject) {
        if (comparisonObject.lastModified < user_data.lastModified) {
            console.log('ignoring changes, all older')
        }
    },
}

const connectionManager = {
    room: {},
    init: false,
    sendData: function () {},
    receiveData: function () {},
    peerList: new Map(),
    checkConn: function () {
        /* check if Connection has been initialized */
        if(!connectionManager.init) {
            connectionManager.initConn(user_data.profile)
        }
    },
    initConn: function (profileName) {
        connectionManager.init = true
        connectionManager.room = joinRoom({appId:user_data.appId}, profileName)

        var [sending, receive] = connectionManager.room.makeAction('data')
        connectionManager.sendData = sending
        connectionManager.receiveData = receive

        connectionManager.room.onPeerJoin(connectionManager.handlePeerJoin)

        connectionManager.room.onPeerLeave(connectionManager.handlePeerLeave)

        connectionManager.receiveData(connectionManager.handleReceiveData)
    },
    handlePeerJoin: function (peerId) {
        console.log(`${peerId} joined`, user_data)
        let payload = Object.assign({}, user_data)
        payload.lists = Array.from(payload.lists)
        connectionManager.sendData(JSON.stringify(payload), peerId)
    },
    handlePeerLeave: function (peerId) {
        console.log(`${peerId} left`)
    },
    handleReceiveData: function (data, peerId) {
        console.log(`${peerId} sent ${typeof data} ${data}`)
        let receivedData = JSON.parse(data)
        receivedData.lists = new Map(receivedData.lists)
        let parsedData = receivedData
        console.log(`${peerId} is known as ${parsedData.username}`)
        console.log(`we parsed parsedData:`, parsedData)
        userInterface.compareAndUpdate(parsedData)
    }
}

/**
* Service Worker Registration
*/
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

/**
 * Application Code 
 * */

/**
 * Create empty data model, send a welcome message.
 */
function setup () {
    console.log('Setting up for new User')
    userInterface.createList('Shopping')
    userInterface.addItem('Carrot', 'Shopping')
    userInterface.saveData()
    alert('Welcome to Einkauf, the shared Shopping List Web App. Simply enter a new profile name, create a list and use the big red X to save and start using the app.')
}

/*
* Settings Open and Loading
*/
btn_settings.addEventListener('click', openSettings)

function openSettings () {
    console.log('Open Settings')
    stateMachine.transitionTo('settings')
    stateMachine.transitionTo('update')
}

/*
* Settings Saving and Closing
*/
btn_close.addEventListener('click', closeSettings)

function closeSettings () {
    console.log('Closing Settings')
    let profName = document.querySelector('#profile-name')
    let username = document.querySelector('#username')
    let profId = profName.value
    if (profId.length < 1) {
        alert('Please enter a profile name to start using.')
        return null
    }
    user_data.username = username.value
    localStorage.setItem('einkauf', JSON.stringify({token: profId}))
    stateMachine.transitionTo('update')
    stateMachine.transitionTo('main')
}

/*
* Create List Button functions
*/
const createList = document.querySelector('#create-list')

createList.addEventListener('click', addList)

function addList () {
    let name = prompt('Please give the new shopping list a name.')
    userInterface.createList(name)
}

/*
* State Machine - View
* Define the 4 main states the app can be in
* Main View (List) / Settings / Sync / Share
* Define each transition
*/
const stateMachine = {
    currentState: 'settings',
    init: function () {
        stateMachine.currentState = 'loading'
        /* Initial state */
        stateMachine.states.set('loading', {
            name: 'loading',
            transitionTo: function (state) {
                if (state === 'main') {
                    stateMachine.currentState = 'main'
                    /* Hide Settings */
                    let pref = document.querySelector('#preferences')
                    pref.style.display = 'none'
                    /* Show Main */
                    let menu = document.querySelector('#menu')
                    let list_cont = document.querySelector('#list-container')
                    menu.style.display = 'grid'
                    list_cont.style.display = 'grid'
                } else if (state === 'settings') {
                    stateMachine.currentState = 'settings'
                    /* Set profile name */
                    let profName = document.querySelector('#profile-name')
                    profName.value = user_data.profile
                    let username = document.querySelector('#username')
                    username.value = user_data.username
                    /* Hide Main */
                    let menu = document.querySelector('#menu')
                    let lists = document.querySelector('#list-container')
                    menu.style.display = 'none'
                    lists.style.display = 'none'
                    /* Show Settings */
                    let pref = document.querySelector('#preferences')
                    pref.style.display = 'grid'
                    userInterface.saveData()
                } else {
                    console.log('Invalid State Transition')
                }
            }
        })
        /* Settings State Definition */
        stateMachine.states.set('settings', {
            name: 'settings',
            transitionTo: function (state) {
                if (state === 'main') {
                    stateMachine.currentState = 'main'
                    /* Hide Settings */
                    let pref = document.querySelector('#preferences')
                    pref.style.display = 'none'
                    /* Show Main */
                    let menu = document.querySelector('#menu')
                    let list_cont = document.querySelector('#list-container')
                    menu.style.display = 'grid'
                    list_cont.style.display = 'grid'
                    /* Save Data */
                    userInterface.saveData()
                } else if (state === 'update') {
                    let profName = document.querySelector('#profile-name')
                    if (user_data.profile.length < 1) {
                        user_data.profile = profName.value
                    }
                    let username = document.querySelector('#username')
                    if (user_data.username.length < 1) {
                        user_data.profile = profName.value
                    }
                    username.value = user_data.username
                    /* Set profile name */
                    profName.value = user_data.profile
                    let lists = document.querySelector('#manage-lists')
                    /* Clear out all children */
                    lists.innerHTML = ''
                    /* Iterate over lists array and create an element */
                    user_data.lists.forEach( (value, key) => {
                        console.log(value, key)
                        let list = document.createElement('div')
                        list.setAttribute('id', value.name)
                        list.setAttribute('class', 'list-el')
                        list.innerText = value.name
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
                    userInterface.saveData()
                } else if (state === 'settings') {
                    userInterface.saveData()
                    stateMachine.transitionTo('update')
                } else {
                    console.log('Invalid State Transition')
                }
            }
        })
        /* Main State Definition */
        stateMachine.states.set('main', {
            name: 'main',
            transitionTo: function (state) {
                if (state === 'settings') {
                    stateMachine.currentState = 'settings'
                    userInterface.saveData()
                    let pref = document.querySelector('#preferences')
                    pref.style.display = 'grid'
                    let menu = document.querySelector('#menu')
                    let lists = document.querySelector('#list-container')
                    menu.style.display = 'none'
                    lists.style.display = 'none'
                } else {
                    console.log('Invalid State Transition')
                }
            }
        })
    },
    states: new Map(),
    transitionTo: function (state) {
        /* if the current state is valid*/
        if(stateMachine.states.has(stateMachine.currentState)) {
            /* get the current state and call the transitionTo function */
            let stateObj = stateMachine.states.get(stateMachine.currentState)
            stateObj.transitionTo(state)
        }  
    }
}

/**
 * Function to handle clicking on List item inside settings.
 */
function editList (ev) {
    /* TODO: make lists editable */
    console.log(ev.target)
}

/**
 * Main Function, called on document load
 */
function main () {
    console.log('Initializing Application')
    stateMachine.init()
    /* Check if this is the first time someone arrived */
    let beenHere = localStorage.getItem('einkauf')
    if(!beenHere) {
        console.log('A new user is here')
        stateMachine.transitionTo('settings')
        setup()
        localStorage.setItem('einkauf', JSON.stringify({token:null}))
    } else {
        console.log('Welcome back!')
        stateMachine.transitionTo('main')
        let roomData = JSON.parse(beenHere)
        if(!roomData?.token) {
            stateMachine.transitionTo('settings')
            setup()
            return
        }
        userInterface.loadData()
    }
}

/* Application start */
document.addEventListener('DOMContentLoaded', main)

      