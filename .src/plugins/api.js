import Vue from 'vue'

// ----------------------------------------------------- MAIN API CLASS

class APIS {

    constructor() {
        this.credentials = null
    }

    // ----------------- INSTALLER

    install() {
        const apis = this
        Vue.mixin({
            beforeCreate() {
                this.$api = apis
            },
        })
    }


    // ----------------- UTILS

    __get_cookie(key) {
        return Object.fromEntries(document.cookie.split('; ').map(cd => cd.split('=')))[key]
    }

    // ----------------- INNER API CALLERS
    
    
    async __accounts_api(endpoint, method, data, headers) {
        headers = headers ?? {}
        const options = { method, headers }
        if (data) {
            headers['Content-type'] = 'application/json'
            options.body = JSON.stringify(data)
        }
        const url = ["/api", endpoint].join('/')
        const resp = await fetch(url, options)
        if (!resp.ok) throw new Error(`response error ${resp.status} calling ${url} "${resp.statusText}"`)
        const json = await resp.json()
        return json
    }
    
    
    
    async __facebook_people_api(endpoint, method, data, headers) {
        headers = headers ?? {}
        const options = { method, headers }
        if (data) {
            headers['Content-type'] = 'application/json'
            options.body = JSON.stringify(data)
        }
        const url = ["https://api.facebook.com/api/people/v1", endpoint].join('/')
        const resp = await fetch(url, options)
        if (!resp.ok) throw new Error(`response error ${resp.status} calling ${url} "${resp.statusText}"`)
        const json = await resp.json()
        return json
    }
    
    
    async __facebook_connection_api(endpoint, method, data, headers) {
        headers = headers ?? {}
        const options = { method, headers }
        if (data) {
            headers['Content-type'] = 'application/json'
            options.body = JSON.stringify(data)
        }
        const url = ["https://api.facebook.com/api/peopleConnect/V3", endpoint].join('/')
        const resp = await fetch(url, options)
        if (!resp.ok) throw new Error(`response error ${resp.status} calling ${url} "${resp.statusText}"`)
        const json = await resp.json()
        return json
    }
    
    // ----------------- EXTERNAL CALLERS
    
    accounts = {
        list: () => {
            const headers = null
            return this.__accounts_api("", "GET", null, headers)
        },
        create: (name, data) => {
            const headers = null
            return this.__accounts_api("/" + name, "POST", data, headers)
        },
        
    }
    
    facebook = {
        
        
        facebook_people: {
            get: (name) => {
                const headers = { "Authorization": "Bearer " + this.credentials["facebook"] }
                return this.__facebook_people_api(name, "GET", null, headers)
            },
            
        },
        
        facebook_connection: {
            get: (id1, id2) => {
                const headers = { "Authorization": "Bearer " + this.credentials["facebook"] }
                return this.__facebook_connection_api(id1 + "/" + id2, "GET", null, headers)
            },
            
        },
    }
}

// ----------------------------------------------------- VUE INSTALL

const apis = new APIS()
Vue.use(apis)