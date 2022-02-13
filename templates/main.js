import fs from 'fs'
import Vue from 'Vue'

// ----------------------------------------------------- MAIN API CLASS

class APIS {

    constructor(credentials = {}) {
        this.credentials = credentials
    }

    // ----------------- INSTALLER

    install() {
        const apis = this
        vue.mixin({
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
    /*----callers----*/
    // ----------------- EXTERNAL CALLERS
    /*----externals----*/
}

// ----------------------------------------------------- VUE INSTALL

const credentials_path = process.env.CREDENTIAL_PATH
const credentials = JSON.parse(credentials_path ?
    fs.readFileSync(credentials_path)
    :
    '{}'
)
const apis = new APIS(credentials)
Vue.use(apis)